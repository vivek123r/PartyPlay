import { Application, TextureSource } from 'pixi.js';
import type { GameModule, GameContext, GameModifiers, PlayerConfig } from './types';
import type { GameRegistryEntry } from './GameRegistry';
import { PixiRendererContext } from './RendererContext';
import { GameLoop } from './GameLoop';
import { InputService } from '@services/input/InputService';
import { KeyboardDevice } from '@services/input/KeyboardDevice';
import { audioService } from '@services/audio/audioServiceInstance';
import { StorageService } from '@services/storage/StorageService';
import { EventService } from '@services/events/EventService';
import { AssetService } from '@services/asset/AssetService';
import { LoggerService } from '@services/logger/LoggerService';
import { createPRNG } from '@shared/utils/random';

TextureSource.defaultOptions.scaleMode = 'nearest';

export class GameRunner {
  private pixiApp: Application | null = null;
  private currentGame: GameModule | null = null;
  private currentGameId: string | null = null;
  private gameLoop: GameLoop | null = null;
  private launchId = 0;
  private resizeListener: (() => void) | null = null;

  public readonly inputService = new InputService();
  public readonly audioService = audioService;
  public readonly storageService = new StorageService();
  public readonly eventService = new EventService();
  public readonly assetService = new AssetService();
  public readonly loggerService = new LoggerService('[Runtime]');

  constructor() {
    // Register default keyboard device
    this.inputService.registerDevice(new KeyboardDevice());
  }

  public async launchGame(
    entry: GameRegistryEntry,
    players: PlayerConfig[],
    modifiers: GameModifiers,
    container: HTMLDivElement
  ): Promise<void> {
    await this.stopGame();
    const currentLaunchId = ++this.launchId;

    this.currentGameId = entry.manifest.id;
    this.loggerService.info(`Launching game "${entry.manifest.title}" (${entry.manifest.id})...`);

    try {
      // Clear container child elements to avoid duplicate canvas elements
      container.innerHTML = '';

      // 1. Create canvas element with pixelated styles
      const canvas = document.createElement('canvas');
      canvas.style.imageRendering = 'pixelated';
      // For fallback
      canvas.style.cssText += 'image-rendering: crisp-edges;';
      canvas.style.display = 'block';
      canvas.style.margin = 'auto';
      container.appendChild(canvas);

      // 2. Initialize PixiJS Application
      const app = new Application();
      await app.init({
        canvas,
        width: PixiRendererContext.VIRTUAL_WIDTH,
        height: PixiRendererContext.VIRTUAL_HEIGHT,
        resolution: 1,
        autoDensity: false,
        antialias: false,
        roundPixels: true,
        background: 0x0f0e17,
      });

      // Check if cancelled during async init
      if (currentLaunchId !== this.launchId) {
        app.destroy(true, { children: true });
        return;
      }

      this.pixiApp = app;

      // 3. Wrap renderer
      const rendererContext = new PixiRendererContext(
        this.pixiApp,
        entry.manifest.logicalWidth ?? 480,
        entry.manifest.logicalHeight ?? 270
      );

      // Setup resizing
      rendererContext.resize();
      this.resizeListener = () => {
        if (this.pixiApp) {
          rendererContext.resize();
        }
      };
      window.addEventListener('resize', this.resizeListener);

      // 4. Setup PRNG
      const seed = modifiers.seed ?? Math.floor(Math.random() * 1000000);
      const prng = createPRNG(seed);

      // 5. Configure input bindings
      this.inputService.clearBindings();
      entry.manifest.defaultControls.forEach((binding) => {
        if (players.some((p) => p.id === binding.playerId)) {
          this.inputService.bindPlayer(binding);
        }
      });

      // 6. Construct GameContext (Pure Dependency Injection)
      const context: GameContext = {
        renderer: rendererContext,
        input: this.inputService,
        audio: this.audioService,
        storage: this.storageService.namespace(`games:${entry.manifest.id}`),
        events: this.eventService,
        random: prng,
        asset: this.assetService,
        logger: new LoggerService(`[Game:${entry.manifest.id}]`),
        modifiers,
        players,
      };

      // 7. Dynamically load & instantiate game
      const { default: GameClass } = await entry.load();
      if (currentLaunchId !== this.launchId) return;

      this.currentGame = new GameClass();

      // 8. Initialize game
      await this.currentGame.init(context);
      if (currentLaunchId !== this.launchId) return;

      // 9. Start Game Loop with Error Boundary Catch Handler
      this.gameLoop = new GameLoop(this.pixiApp.ticker, this.inputService);
      this.currentGame.start();
      this.gameLoop.start(this.currentGame, (err) => this.handleCrash(err));

      this.eventService.emit('game:started', { gameId: entry.manifest.id, seed });
    } catch (err) {
      if (currentLaunchId === this.launchId) {
        await this.handleCrash(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  private async handleCrash(error: Error): Promise<void> {
    this.loggerService.error(`Runtime caught game crash: ${error.message}`, error);
    const crashedId = this.currentGameId ?? 'unknown';

    // Safely teardown
    await this.stopGame();

    // Emit crash event so Platform UI displays Crash Overlay
    this.eventService.emit('game:crash', { error, gameId: crashedId });
  }

  public async stopGame(): Promise<void> {
    this.launchId++; // Invalidate active launch attempts

    this.audioService.stopAllLoops();

    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }

    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }

    if (this.currentGame) {
      try {
        this.currentGame.destroy();
      } catch (err) {
        this.loggerService.warn('Error during game destroy:', err);
      }
      this.currentGame = null;
    }

    if (this.currentGameId) {
      this.eventService.emit('game:destroyed', { gameId: this.currentGameId });
      this.currentGameId = null;
    }

    this.inputService.clearBindings();
    this.assetService.clear();

    if (this.pixiApp) {
      try {
        this.pixiApp.destroy(true, { children: true, texture: true });
      } catch (err) {
        this.loggerService.warn('Error destroying Pixi app:', err);
      }
      this.pixiApp = null;
    }
  }

  public pause(): void {
    if (this.currentGame?.state === 'Paused') return;
    this.gameLoop?.pause();
    this.currentGame?.pause();
    void this.audioService.suspendContext();
    this.eventService.emit('game:pause', undefined);
  }

  public resume(): void {
    this.currentGame?.resume();
    this.gameLoop?.resume();
    void this.audioService.resumeContext();
    this.eventService.emit('game:resume', undefined);
  }
}
