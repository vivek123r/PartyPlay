import { Container } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import type { FarmState } from './types';
import { TextureGenerator } from './utils/TextureGenerator';
import { AudioSynthesizer } from './utils/AudioSynthesizer';
import { StorageManager } from './utils/StorageManager';
import { Grid } from './entities/Grid';
import { PlayerAvatar } from './entities/PlayerAvatar';
import { FarmingSystem } from './systems/FarmingSystem';
import { WeatherSystem } from './systems/WeatherSystem';
import { AutomationSystem } from './systems/AutomationSystem';
import { ProcessingSystem } from './systems/ProcessingSystem';
import { LivestockSystem } from './systems/LivestockSystem';
import { FarmHUDManager } from './systems/FarmHUDManager';

import { DAY_DURATION_SECONDS } from './config';

export default class MythicFarmGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private rootContainer!: Container;
  private gameStageContainer!: Container;
  private hudContainer!: Container;

  private textureGenerator!: TextureGenerator;
  private audioSynthesizer: AudioSynthesizer | null = null;
  private farmState!: FarmState;

  private grid!: Grid;
  private playerAvatar!: PlayerAvatar;
  private farmingSystem!: FarmingSystem;
  private weatherSystem!: WeatherSystem;
  private automationSystem!: AutomationSystem;
  private processingSystem!: ProcessingSystem;
  private livestockSystem!: LivestockSystem;
  private hudManager!: FarmHUDManager;

  private isPaused: boolean = false;
  private gameTimeAccumulator: number = 0;

  public async init(context: GameContext): Promise<void> {
    if (this.rootContainer) {
      if (typeof this.ctx?.renderer?.stage?.removeChild === 'function') {
        this.ctx.renderer.stage.removeChild(this.rootContainer);
      }
      this.rootContainer.destroy({ children: true });
      this.rootContainer = null as any;
    }

    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing MYTHIC FARM: SINGLE-PLAYER FARMVILLE & MAGIC ORCHARD...');

    const { stage } = this.ctx.renderer;

    // 1. Initialize Root Containers
    this.rootContainer = new Container();
    this.gameStageContainer = new Container();
    this.hudContainer = new Container();

    this.rootContainer.addChild(this.gameStageContainer);
    this.rootContainer.addChild(this.hudContainer);
    stage.addChild(this.rootContainer);

    // 2. Initialize Utilities
    this.textureGenerator = new TextureGenerator();
    this.textureGenerator.generateAll();

    if (this.ctx.audio) {
      this.audioSynthesizer = new AudioSynthesizer(this.ctx.audio);
    }

    // 3. Load Saved State or Create Default State
    await this.loadOrCreateFarmState();

    if ((this.state as string) === 'Destroyed') {
      if (stage && this.rootContainer) {
        if (typeof stage.removeChild === 'function') {
          stage.removeChild(this.rootContainer);
        }
        this.rootContainer.destroy({ children: true });
        this.rootContainer = null as any;
      }
      return;
    }

    // 4. Initialize Grid & Game Systems
    this.grid = new Grid();
    this.grid.init(this.farmState, this.textureGenerator);
    this.gameStageContainer.addChild(this.grid);

    this.playerAvatar = new PlayerAvatar();
    this.playerAvatar.initPosition(3, 3, this.grid);
    this.gameStageContainer.addChild(this.playerAvatar);

    this.farmingSystem = new FarmingSystem(
      this.farmState,
      this.grid,
      this.audioSynthesizer,
      this.textureGenerator
    );

    this.weatherSystem = new WeatherSystem({
      audioSynthesizer: this.audioSynthesizer,
    });
    const weatherOverlay = this.weatherSystem.getOverlay();
    if (weatherOverlay) {
      this.gameStageContainer.addChild(weatherOverlay);
    }

    this.automationSystem = new AutomationSystem(
      this.farmState,
      this.grid,
      this.audioSynthesizer
    );

    this.processingSystem = new ProcessingSystem(
      this.farmState,
      this.grid,
      this.audioSynthesizer
    );

    this.livestockSystem = new LivestockSystem(
      this.farmState,
      this.audioSynthesizer
    );

    this.hudManager = new FarmHUDManager(this.farmState);
    this.hudContainer.addChild(this.hudManager.container);

    // 5. Setup Grid Pointer Event Listeners (Mouse Click Tool Usage)
    this.grid.eventMode = 'static';
    this.grid.cursor = 'pointer';
    this.grid.on('pointerdown', (e) => {
      const localPos = e.getLocalPosition(this.grid);
      const tilePos = this.grid.worldToTile(localPos.x, localPos.y);
      this.handleTileClick(tilePos.tileX, tilePos.tileY);
    });

    this.state = 'Ready';
    this.ctx.logger.info('Mythic Farm initialized successfully.');
  }

  public start(): void {
    if (this.state !== 'Ready') return;
    this.state = 'Playing';
    this.isPaused = false;

    if (this.audioSynthesizer) {
      this.audioSynthesizer.startAmbientBGM();
    }

    this.hudManager.addNotification('WELCOME TO MYTHIC FARM!', 0x00f0ff);
    this.ctx.logger.info('Mythic Farm started.');
  }

  public advanceDay(): void {
    if (!this.farmingSystem) return;
    this.farmingSystem.advanceDay(this.weatherSystem);
    if (this.automationSystem) {
      this.automationSystem.processDailyAutomation();
    }
    if (this.livestockSystem) {
      this.livestockSystem.processDailyLivestock();
    }

    this.hudManager.addNotification(`DAY ${this.farmState.currentDay} ARRIVED!`, 0xfacc15);
  }

  public update(dt: number): void {
    if (this.state !== 'Playing' || this.isPaused) return;
    if (!Number.isFinite(dt) || dt <= 0) return;

    // Day Clock Advancement
    this.gameTimeAccumulator += dt;
    while (this.gameTimeAccumulator >= DAY_DURATION_SECONDS) {
      this.gameTimeAccumulator -= DAY_DURATION_SECONDS;
      this.advanceDay();
    }

    // Input Handling for Single-Player Player 1
    const p1Id = this.ctx.players?.[0]?.id ?? 1;
    const input = typeof this.ctx.input?.getPlayer === 'function' ? this.ctx.input.getPlayer(p1Id) : null;

    if (input) {
      // Single-Player Hotbar Slot Hotkeys (1-6)
      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        if (input.isJustPressed(`num${slotIdx + 1}` as any) || (input as any).isJustPressed?.(`${slotIdx + 1}`)) {
          this.farmState.selectedHotbarIndex = slotIdx;
          this.ctx.audio?.playTone(600 + slotIdx * 50, 'sine', 0.1);
        }
      }

      // Action Key (Space / Action) -> Tool Usage in Front of Player Avatar
      const isUseToolPressed = input.isJustPressed('action');
      if (isUseToolPressed) {
        const targetTile = this.playerAvatar.getTargetTileInFront();
        this.handleTileClick(targetTile.tileX, targetTile.tileY);
        this.playerAvatar.triggerToolSwing();
      }

      // Update Avatar Position & Input
      const inputObj = {
        left: input.isActive('moveLeft'),
        right: input.isActive('moveRight'),
        up: input.isActive('moveUp'),
        down: input.isActive('moveDown'),
      };
      this.playerAvatar.update(dt, inputObj, this.grid);
    }

    // Update Sub-systems
    this.farmingSystem.update(dt);
    this.weatherSystem.update(dt);
    this.processingSystem.update(dt);
    this.hudManager.update(dt);

    // Render HUD UI
    this.hudManager.render();
  }

  private handleTileClick(tileX: number, tileY: number): void {
    if (this.state !== 'Playing' || this.isPaused) return;

    const tile = this.grid.getTile(tileX, tileY);
    if (!tile) return;

    const currentSlot = this.hudManager.defaultHotbar[this.farmState.selectedHotbarIndex || 0];
    if (!currentSlot) return;

    // 1. Tool Usage (Hoe, Water Can)
    if (currentSlot.type === 'tool') {
      if (currentSlot.targetId === 'hoe') {
        if (this.farmingSystem.tillSoil(tileX, tileY)) {
          this.hudManager.addNotification('TILLED SOIL', 0x86efac);
        }
      } else if (currentSlot.targetId === 'watering_can') {
        if (this.farmingSystem.waterSoil(tileX, tileY)) {
          this.hudManager.addNotification('WATERED SOIL', 0x38bdf8);
        }
      }
    }
    // 2. Seed Planting
    else if (currentSlot.type === 'seed') {
      if (this.farmingSystem.plantCrop(tileX, tileY, currentSlot.targetId)) {
        this.hudManager.addNotification(`PLANTED ${currentSlot.label}`, 0xa78bfa);
      }
    }

    // 3. Harvest Crop if Ready
    if (tile.crop && tile.crop.stage === 3 && !tile.crop.withered) {
      const speciesId = tile.crop.speciesId;
      const harvested = this.farmingSystem.harvestCrop(tileX, tileY);
      if (harvested) {
        this.hudManager.addNotification(`HARVESTED ${speciesId.toUpperCase()}!`, 0xfacc15);
      }
    }
  }

  public pause(): void {
    if (this.state !== 'Playing') return;
    this.isPaused = true;
    this.state = 'Paused';

    if (this.audioSynthesizer) {
      this.audioSynthesizer.stopAmbientBGM();
    }

    this.ctx.logger.info('Mythic Farm paused.');
  }

  public resume(): void {
    if (this.state !== 'Paused') return;
    this.isPaused = false;
    this.state = 'Playing';

    if (this.audioSynthesizer) {
      this.audioSynthesizer.startAmbientBGM();
    }

    this.ctx.logger.info('Mythic Farm resumed.');
  }

  public destroy(): void {
    if (this.state === 'Destroyed') return;

    if (this.ctx?.logger) {
      this.ctx.logger.info('Destroying Mythic Farm...');
    }

    try {
      this.saveFarmState();
    } catch (err) {
      // Ignore storage errors during destroy
    }

    if (this.audioSynthesizer) {
      this.audioSynthesizer.destroy();
      this.audioSynthesizer = null;
    }

    if (this.textureGenerator) {
      this.textureGenerator.clear();
    }

    if (this.hudManager) {
      this.hudManager.destroy();
    }

    if (this.rootContainer) {
      if (typeof this.ctx?.renderer?.stage?.removeChild === 'function') {
        this.ctx.renderer.stage.removeChild(this.rootContainer);
      }
      this.rootContainer.destroy({ children: true });
      this.rootContainer = null as any;
    }

    this.state = 'Destroyed';
  }

  private async loadOrCreateFarmState(): Promise<void> {
    const saved = StorageManager.loadFarmState(this.ctx.storage);
    if (saved) {
      this.farmState = saved;
    } else {
      const initialCoins = (this.ctx.modifiers?.initialCoins as number) || 500;
      this.farmState = StorageManager.createInitialFarmState(initialCoins);
    }
  }

  private saveFarmState(): void {
    if (this.farmState && this.ctx?.storage) {
      StorageManager.saveFarmState(this.ctx.storage, this.farmState);
    }
  }

  // ==========================================
  // Public Accessors for Test Harnesses & Systems
  // ==========================================
  public getFarmState(): FarmState {
    return this.farmState;
  }

  public getGrid(): Grid {
    return this.grid;
  }

  public getFarmingSystem(): FarmingSystem {
    return this.farmingSystem;
  }

  public getWeatherSystem(): WeatherSystem {
    return this.weatherSystem;
  }

  public getAudioSynthesizer(): AudioSynthesizer | null {
    return this.audioSynthesizer;
  }

  public getTextureGenerator(): TextureGenerator {
    return this.textureGenerator;
  }
}
