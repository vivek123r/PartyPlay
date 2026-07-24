import { Container, Graphics, Texture } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { BikePhysics } from './core/BikePhysics';
import { HandcraftedTrack } from './core/HandcraftedTrack';
import { ProjectionEngine } from './render/ProjectionEngine';
import { TrafficManager } from './core/TrafficManager';
import { GarageScreen } from './screens/GarageScreen';
import { EnvironmentFX } from './render/EnvironmentFX';
import { PixelFont } from './render/PixelFont';
import { VideoEngine } from './render/VideoEngine';
import type { TrackSegment } from './types';

export default class TurboRiderGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private gameContainer!: Container;

  private bikes: BikePhysics[] = [];
  private trackSegments: TrackSegment[] = [];
  private traffic = new TrafficManager();
  private garage = new GarageScreen();
  private envFX: EnvironmentFX[] = [];

  private viewportContainers: Container[] = [];
  private viewportGraphics: Graphics[] = [];
  private viewportMasks: Graphics[] = [];

  private isGaragePhase = true;
  private raceTimer = 0;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing TURBO RIDER 3D AAA Upgrade...');

    const { stage } = this.ctx.renderer;
    this.gameContainer = new Container();
    stage.addChild(this.gameContainer);

    // Initialize Video Engine with user-provided fire.mp4 and animated skybox video
    VideoEngine.getInstance().initFireVideo('/assets/videos/fire.mp4').catch(() => {});
    VideoEngine.getInstance().initSkyboxVideo('/assets/videos/synthwave_arcade_showcase.mp4').catch(() => {});

    const count = Math.min(4, Math.max(2, this.ctx.players.length));
    this.bikes = this.ctx.players.slice(0, count).map((p, idx) => {
      const bike = new BikePhysics(p.id, p.color);
      bike.x = idx === 0 ? -0.4 : idx === 1 ? 0.4 : idx === 2 ? -0.2 : 0.2;
      return bike;
    });

    this.trackSegments = HandcraftedTrack.generateTrack();
    this.traffic.spawnTraffic(HandcraftedTrack.TOTAL_LENGTH_METERS);

    const viewW = 480;
    const viewH = Math.floor(270 / count);

    for (let i = 0; i < count; i++) {
      const vContainer = new Container();
      const vG = new Graphics();
      const fx = new EnvironmentFX();

      vContainer.addChild(vG);
      vContainer.addChild(fx.container);

      vContainer.position.set(0, i * viewH);

      const mask = new Graphics();
      mask.rect(0, i * viewH, viewW, viewH).fill({ color: 0xffffff });
      vContainer.mask = mask;

      this.gameContainer.addChild(vContainer);
      this.gameContainer.addChild(mask);

      this.viewportContainers.push(vContainer);
      this.viewportGraphics.push(vG);
      this.viewportMasks.push(mask);
      this.envFX.push(fx);
    }

    this.gameContainer.addChild(this.garage.container);
    this.state = 'Ready';
  }

  public start(): void {
    this.state = 'Playing';
    this.ctx.logger.info('TURBO RIDER 3D Race Started!');
  }

  private renderPixelSuperbikeRear(
    g: Graphics,
    bike: BikePhysics,
    bikeScreenX: number,
    bikeScreenY: number,
    hexColor: number,
    fireTexture?: Texture | null
  ): void {
    const leanRot = Math.max(-25, Math.min(25, bike.leanAngle * 25));
    const leanOffset = leanRot * 0.15;

    // 1. Thick 16x12px rear race tire with tread grooves & silver alloy hub
    g.rect(bikeScreenX - 8, bikeScreenY - 12, 16, 12).fill({ color: 0x1e272e });
    g.rect(bikeScreenX - 5, bikeScreenY - 10, 10, 8).fill({ color: 0x2f3542 });
    g.rect(bikeScreenX - 2, bikeScreenY - 8, 4, 4).fill({ color: 0xbdc3c7 });
    g.rect(bikeScreenX - 4, bikeScreenY - 12, 2, 12).fill({ color: 0x0f0e17, alpha: 0.5 });
    g.rect(bikeScreenX + 2, bikeScreenY - 12, 2, 12).fill({ color: 0x0f0e17, alpha: 0.5 });

    // 2. Dual chrome exhaust pipes emitting live fire.mp4 video flames!
    g.rect(bikeScreenX - 12 + leanOffset * 0.2, bikeScreenY - 8, 4, 6).fill({ color: 0xdcdde1 });
    g.rect(bikeScreenX + 8 + leanOffset * 0.2, bikeScreenY - 8, 4, 6).fill({ color: 0xdcdde1 });

    if (bike.isNitroActive && fireTexture && fireTexture !== Texture.WHITE) {
      g.texture(fireTexture, 0xffffff, bikeScreenX - 16 + leanOffset * 0.2, bikeScreenY - 2, 12, 16);
      g.texture(fireTexture, 0xffffff, bikeScreenX + 4 + leanOffset * 0.2, bikeScreenY - 2, 12, 16);
    }

    // 3. Sculpted Tail Section
    g.rect(bikeScreenX - 10 + leanOffset * 0.5, bikeScreenY - 20, 20, 10).fill({ color: hexColor });
    g.rect(bikeScreenX - 7 + leanOffset * 0.6, bikeScreenY - 24, 14, 6).fill({ color: hexColor });

    // 4. Red LED Brake Light Unit
    g.rect(bikeScreenX - 6 + leanOffset * 0.5, bikeScreenY - 14, 12, 4).fill({ color: 0xff4757 });

    // 5. Leaning Rider (Back, shoulder pads, helmet, boots)
    const suitColor = parseInt(bike.customization.suitColor.replace('#', ''), 16) || 0x2d3436;
    const helmetColor = parseInt(bike.customization.helmetColor.replace('#', ''), 16) || hexColor;

    g.rect(bikeScreenX - 12 + leanOffset * 0.3, bikeScreenY - 18, 6, 8).fill({ color: 0x0f0e17 });
    g.rect(bikeScreenX + 6 + leanOffset * 0.3, bikeScreenY - 18, 6, 8).fill({ color: 0x0f0e17 });

    g.rect(bikeScreenX - 8 + leanOffset * 0.8, bikeScreenY - 32, 16, 10).fill({ color: suitColor });
    g.rect(bikeScreenX - 10 + leanOffset * 0.8, bikeScreenY - 32, 4, 4).fill({ color: 0xbdc3c7 });
    g.rect(bikeScreenX + 6 + leanOffset * 0.8, bikeScreenY - 32, 4, 4).fill({ color: 0xbdc3c7 });

    g.rect(bikeScreenX - 5 + leanOffset, bikeScreenY - 40, 10, 10).fill({ color: helmetColor });
    g.rect(bikeScreenX - 2 + leanOffset, bikeScreenY - 32, 4, 2).fill({ color: 0x0f0e17 });
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    const count = this.bikes.length;
    const viewW = 480;
    const viewH = Math.floor(270 / count);

    // 1. GARAGE PHASE
    if (this.isGaragePhase) {
      this.bikes.forEach((bike, idx) => {
        const input = this.ctx.input.getPlayer(bike.id);
        const navLeft = input.isJustPressed('moveLeft');
        const navRight = input.isJustPressed('moveRight');
        const actionSelect = input.isJustPressed('action');
        const toggleReady = input.isJustPressed('pause');

        this.garage.updateGarageInput(idx, bike, navLeft, navRight, actionSelect, toggleReady);
      });

      this.garage.render(this.bikes, 480, 270);

      if (this.garage.isAllReady(count)) {
        this.isGaragePhase = false;
        this.garage.container.visible = false;
        this.ctx.audio.playTone(520, 'square', 0.4);
      }
      return;
    }

    // 2. MAIN 3D HIGHWAY RACING PHASE
    this.raceTimer += dt;
    const skyboxTexture = VideoEngine.getInstance().getSkyboxTexture();
    const fireTexture = VideoEngine.getInstance().getFireTexture();

    this.bikes.forEach((bike, idx) => {
      const input = this.ctx.input.getPlayer(bike.id);
      if (input.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }

      const isBraking = input.isActive('moveLeft') && input.isActive('moveRight');
      const moveLeft = input.isActive('moveLeft') && !isBraking;
      const moveRight = input.isActive('moveRight') && !isBraking;
      let accelerate = input.isActive('action');
      const triggerNitro = input.isActive('action');

      if (!accelerate && !isBraking && bike.speed < 120 && !bike.isCrashed) {
        bike.speed = Math.min(120, bike.speed + 80 * dt);
      }

      const segIdx = Math.floor(bike.z / ProjectionEngine.SEGMENT_LENGTH) % this.trackSegments.length;
      const currentCurve = this.trackSegments[segIdx]?.curve || 0;

      bike.update(dt, moveLeft, moveRight, accelerate, isBraking, triggerNitro, currentCurve);

      const fx = this.envFX[idx];
      if (isBraking && bike.speed > 50) {
        fx.spawnBrakeSparks(viewW / 2, viewH - 10, 4);
      }
      if (bike.isNitroActive) {
        const hexColor = parseInt(bike.customization.underglowLed.replace('#', ''), 16) || 0x00f0ff;
        fx.spawnNitroFlames(viewW / 2, viewH - 20, hexColor);
      }

      fx.update(dt, bike.speed, viewW, viewH);

      const vContainer = this.viewportContainers[idx];
      if (bike.isCrashed) {
        vContainer.position.set(
          (Math.random() - 0.5) * 10,
          idx * viewH + (Math.random() - 0.5) * 10
        );
        fx.spawnBrakeSparks(viewW / 2 + (Math.random() - 0.5) * 20, viewH - 20, 8);
      } else {
        vContainer.position.set(0, idx * viewH);
      }
    });

    this.traffic.update(dt, this.bikes, HandcraftedTrack.TOTAL_LENGTH_METERS);

    // Render Split 3D Viewports with Live Video Textures & User Fire Video!
    this.bikes.forEach((bike, idx) => {
      const g = this.viewportGraphics[idx];
      g.clear();

      ProjectionEngine.renderViewportRoad(
        g,
        this.trackSegments,
        bike.z,
        bike.x,
        viewW,
        viewH,
        this.traffic.vehicles,
        skyboxTexture,
        fireTexture
      );

      const bikeScreenX = Math.round(viewW / 2 + bike.x * 70);
      const bikeScreenY = viewH - 20 + Math.round(bike.pitchAngle * 4);
      const hexColor = parseInt(bike.playerColor.replace('#', ''), 16) || 0xff0055;

      const isInvulnerable = bike.invulnerabilityTimer > 0;
      const isFlashing = isInvulnerable && Math.floor(bike.invulnerabilityTimer * 10) % 2 === 0;

      if (!isFlashing) {
        this.renderPixelSuperbikeRear(g, bike, bikeScreenX, bikeScreenY, hexColor, fireTexture);
      }

      if (bike.isCrashed) {
        g.rect(viewW / 2 - 50, 22, 100, 14).fill({ color: 0xff0055, alpha: 0.85 });
        PixelFont.drawText(g, 'CRASH!', viewW / 2 - 24, 26, 0xfffffe, 1);
      }

      const topY = 4;
      g.rect(4, topY, 110, 10).fill({ color: 0x0f0e17, alpha: 0.85 });
      PixelFont.drawText(g, `${Math.round(bike.speed)}KM/H`, 6, topY + 2, 0x00f0ff, 1);

      g.rect(120, topY, 80, 10).fill({ color: 0x0f0e17, alpha: 0.85 });
      g.rect(120, topY, Math.min(80, (bike.nitroGauge / 100) * 80), 10).fill({ color: 0xff0055 });
      PixelFont.drawText(g, 'NITRO', 124, topY + 2, 0xfffffe, 1);

      const distRemaining = Math.max(0, Math.round(HandcraftedTrack.TOTAL_LENGTH_METERS - bike.z));
      g.rect(viewW - 65, topY, 60, 10).fill({ color: 0x0f0e17, alpha: 0.85 });
      PixelFont.drawText(g, `${distRemaining}M`, viewW - 60, topY + 2, 0xf4d160, 1);
    });

    const winner = this.bikes.find((b) => b.z >= HandcraftedTrack.TOTAL_LENGTH_METERS);
    if (winner) {
      this.triggerMatchOver();
    }
  }

  private triggerMatchOver(): void {
    if (this.state !== 'Playing') return;

    this.state = 'Finished';
    this.ctx.audio.playTone(660, 'sine', 0.5);

    const standings = [...this.bikes]
      .sort((a, b) => b.z - a.z)
      .map((b) => ({ playerId: b.id, score: Math.round(b.z) }));

    setTimeout(() => {
      this.ctx.events.emit('game:over', {
        winnerId: standings[0]?.playerId ?? 1,
        isTeamLoss: false,
        standings,
      });
    }, 50);
  }

  public pause(): void { this.state = 'Paused'; }
  public resume(): void { this.state = 'Playing'; }
  public destroy(): void {
    this.state = 'Destroyed';
    VideoEngine.getInstance().destroy();
    this.envFX.forEach((fx) => fx.destroy());
    this.viewportGraphics.forEach((g) => g.destroy());
    this.viewportContainers.forEach((c) => c.destroy({ children: false }));
    this.viewportMasks.forEach((m) => m.destroy());
    this.garage?.destroy();
    this.gameContainer?.destroy();
  }
}
