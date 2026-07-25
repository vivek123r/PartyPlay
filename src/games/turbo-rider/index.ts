import { Container, Graphics, Texture } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { BikePhysics } from './core/BikePhysics';
import { HandcraftedTrack } from './core/HandcraftedTrack';
import { ProjectionEngine } from './render/ProjectionEngine';
import { TrafficManager } from './core/TrafficManager';
import { GarageScreen } from './screens/GarageScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { PowerUpManager } from './core/PowerUpManager';
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
  private powerUps = new PowerUpManager();
  private garage = new GarageScreen();
  private results = new ResultsScreen();
  private envFX: EnvironmentFX[] = [];

  private viewportContainers: Container[] = [];
  private viewportGraphics: Graphics[] = [];
  private viewportMasks: Graphics[] = [];

  private isGaragePhase = true;
  private countdownTimer = 0;
  private countdownPhase = -1; // -1 = not started, 3/2/1 = numbers, 0 = GO!
  private prevPhaseIndex: number[] = [];
  private phaseFlashTimer: number[] = [];
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

    this.prevPhaseIndex = new Array(count).fill(0);
    this.phaseFlashTimer = new Array(count).fill(0);

    this.trackSegments = HandcraftedTrack.generateTrack();
    const density = this.ctx.modifiers?.trafficDensity ?? 1.0;
    this.traffic.spawnTraffic(HandcraftedTrack.TOTAL_LENGTH_METERS, density);
    this.powerUps.spawnForTrack(HandcraftedTrack.TOTAL_LENGTH_METERS);

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
    this.gameContainer.addChild(this.results.container);
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
    scale: number,
    fireTexture?: Texture | null
  ): void {
    const leanRot = Math.max(-25, Math.min(25, bike.leanAngle * 25));
    const leanOffset = leanRot * 0.15 * scale;
    const s = (n: number) => n * scale;

    // Contact shadow, drawn first so the bike sits on top of it
    g.ellipse(bikeScreenX, bikeScreenY, s(7), s(2)).fill({ color: 0x000000, alpha: 0.35 });

    // 1. Rear race tire
    g.rect(bikeScreenX - s(5), bikeScreenY - s(8), s(10), s(8)).fill({ color: 0x1e272e });
    g.rect(bikeScreenX - s(3), bikeScreenY - s(7), s(6), s(6)).fill({ color: 0x2f3542 });
    g.rect(bikeScreenX - s(1), bikeScreenY - s(5), s(2), s(2)).fill({ color: 0xbdc3c7 });
    g.rect(bikeScreenX - s(3), bikeScreenY - s(8), s(1), s(8)).fill({ color: 0x0f0e17, alpha: 0.5 });
    g.rect(bikeScreenX + s(1), bikeScreenY - s(8), s(1), s(8)).fill({ color: 0x0f0e17, alpha: 0.5 });

    // 2. Dual chrome exhaust pipes
    g.rect(bikeScreenX - s(7) + leanOffset * 0.2, bikeScreenY - s(5), s(2), s(4)).fill({ color: 0xdcdde1 });
    g.rect(bikeScreenX + s(5) + leanOffset * 0.2, bikeScreenY - s(5), s(2), s(4)).fill({ color: 0xdcdde1 });

    if (bike.isNitroActive && fireTexture && fireTexture !== Texture.WHITE) {
      g.texture(fireTexture, 0xffffff, bikeScreenX - s(7) + leanOffset * 0.2, bikeScreenY - s(1), s(5), s(10));
      g.texture(fireTexture, 0xffffff, bikeScreenX + s(2) + leanOffset * 0.2, bikeScreenY - s(1), s(5), s(10));
    }

    // 3. Sculpted Tail Section
    g.rect(bikeScreenX - s(6) + leanOffset * 0.5, bikeScreenY - s(14), s(12), s(7)).fill({ color: hexColor });
    g.rect(bikeScreenX - s(4) + leanOffset * 0.6, bikeScreenY - s(17), s(8), s(4)).fill({ color: hexColor });

    // 4. Red LED Brake Light Unit
    g.rect(bikeScreenX - s(4) + leanOffset * 0.5, bikeScreenY - s(10), s(8), s(3)).fill({ color: 0xff4757 });

    // 5. Leaning Rider
    const suitColor = parseInt(bike.customization.suitColor.replace('#', ''), 16) || 0x2d3436;
    const helmetColor = parseInt(bike.customization.helmetColor.replace('#', ''), 16) || hexColor;

    g.rect(bikeScreenX - s(8) + leanOffset * 0.3, bikeScreenY - s(12), s(4), s(5)).fill({ color: 0x0f0e17 });
    g.rect(bikeScreenX + s(4) + leanOffset * 0.3, bikeScreenY - s(12), s(4), s(5)).fill({ color: 0x0f0e17 });

    g.rect(bikeScreenX - s(5) + leanOffset * 0.8, bikeScreenY - s(22), s(10), s(7)).fill({ color: suitColor });
    g.rect(bikeScreenX - s(6) + leanOffset * 0.8, bikeScreenY - s(22), s(2), s(2)).fill({ color: 0xbdc3c7 });
    g.rect(bikeScreenX + s(4) + leanOffset * 0.8, bikeScreenY - s(22), s(2), s(2)).fill({ color: 0xbdc3c7 });

    g.rect(bikeScreenX - s(3) + leanOffset, bikeScreenY - s(28), s(6), s(6)).fill({ color: helmetColor });
    g.rect(bikeScreenX - s(1) + leanOffset, bikeScreenY - s(22), s(2), s(1)).fill({ color: 0x0f0e17 });
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
        const toggleReady = input.isJustPressed('brake');

        this.garage.updateGarageInput(idx, bike, navLeft, navRight, actionSelect, toggleReady);
      });

      this.garage.render(this.bikes, 480, 270);

      if (this.garage.isAllReady(count)) {
        this.isGaragePhase = false;
        this.garage.container.visible = false;
        this.countdownPhase = 3;
        this.countdownTimer = 1.0;
        this.ctx.audio.playTone(880, 'square', 0.1);
      }
      return;
    }

    // 2. PRE-RACE COUNTDOWN PHASE
    if (this.countdownPhase >= 0) {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        if (this.countdownPhase > 0) {
          this.ctx.audio.playTone(880, 'square', 0.1);
          this.countdownPhase--;
          this.countdownTimer = 1.0;
        } else {
          this.ctx.audio.playTone(1320, 'square', 0.3);
          this.countdownPhase = -1;
          this.ctx.logger.info('GO! Race started!');
        }
      }
      this.renderCountdown(viewW, viewH);
      return;
    }

    // 3. MAIN 3D HIGHWAY RACING PHASE
    this.raceTimer += dt;
    const skyboxTexture = VideoEngine.getInstance().getSkyboxTexture();
    const fireTexture = VideoEngine.getInstance().getFireTexture();

    const standings = [...this.bikes]
      .filter((b) => !b.eliminated)
      .sort((a, b) => b.z - a.z);
    const rankMap = new Map<number, number>();
    standings.forEach((b, i) => rankMap.set(b.id, i + 1));

    this.bikes.forEach((bike, idx) => {
      const input = this.ctx.input.getPlayer(bike.id);
      if (input.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }

      const isBraking = input.isActive('brake');
      const moveLeft = input.isActive('moveLeft') && !isBraking;
      const moveRight = input.isActive('moveRight') && !isBraking;
      const accelerate = input.isActive('action');
      const triggerNitro = input.isActive('nitro');

      // Phase transition detection
      const segIdx = Math.floor(bike.z / ProjectionEngine.SEGMENT_LENGTH) % this.trackSegments.length;
      const currentCurve = this.trackSegments[segIdx]?.curve || 0;
      const phaseIdx = this.trackSegments[segIdx]?.phaseIndex ?? 0;
      if (phaseIdx !== this.prevPhaseIndex[idx]) {
        this.prevPhaseIndex[idx] = phaseIdx;
        this.phaseFlashTimer[idx] = 2.0;
        const phaseHz = [220, 330, 440, 550, 660][phaseIdx % 5];
        this.ctx.audio.playTone(phaseHz, 'sine', 0.3);
      }
      if (this.phaseFlashTimer[idx] > 0) {
        this.phaseFlashTimer[idx] -= dt;
      }

      // Vehicle proximity detection (near-miss / drafting)
      bike.isDrafting = false;
      bike.slipstreamBonus = 0;
      let nearMiss = false;
      const trackLen = HandcraftedTrack.TOTAL_LENGTH_METERS;
      for (const veh of this.traffic.vehicles) {
        let dz = Math.abs(bike.z - veh.z);
        if (dz > trackLen / 2) dz = trackLen - dz;
        const dx = Math.abs(bike.x - veh.laneX);
        if (dz < 15 && dx < 0.35) {
          if (dz < 6 && dx < 0.25) nearMiss = true;
          if (dz < 12 && dx < 0.3 && bike.z < veh.z - 2) {
            bike.isDrafting = true;
            bike.slipstreamBonus = 0.15;
          }
        }
      }

      bike.update(dt, moveLeft, moveRight, accelerate, isBraking, triggerNitro, currentCurve);

      // Thin out particle FX at 3-4 players — same number of viewports means the same
      // particle counts cost proportionally more fill work per frame.
      const fxDensity = count >= 3 ? 0.5 : 1;
      const fx = this.envFX[idx];
      if (isBraking && bike.speed > 50) {
        fx.spawnBrakeSparks(viewW / 2, viewH - 10, Math.max(2, Math.round(4 * fxDensity)));
      }
      if (bike.isNitroActive) {
        const hexColor = parseInt(bike.customization.underglowLed.replace('#', ''), 16) || 0x00f0ff;
        fx.spawnNitroFlames(viewW / 2, viewH - 20, hexColor, Math.max(2, Math.round(4 * fxDensity)));
      }

      fx.update(dt, bike.speed, viewW, viewH, fxDensity);

      const vContainer = this.viewportContainers[idx];
      if (bike.isCrashed) {
        this.envFX[idx].triggerShake(10);
        fx.spawnBrakeSparks(viewW / 2 + (Math.random() - 0.5) * 20, viewH - 20, Math.max(3, Math.round(8 * fxDensity)));
      } else {
        vContainer.position.set(0, idx * viewH);
      }
    });

    this.traffic.update(dt, this.bikes, HandcraftedTrack.TOTAL_LENGTH_METERS);
    this.powerUps.update(dt, this.bikes, HandcraftedTrack.TOTAL_LENGTH_METERS);

    // Render Split 3D Viewports
    this.bikes.forEach((bike, idx) => {
      const g = this.viewportGraphics[idx];
      g.clear();

      ProjectionEngine.renderViewportRoad(
        g, this.trackSegments, bike.z, bike.x,
        viewW, viewH, count, this.traffic.vehicles,
        this.powerUps.pickups, skyboxTexture, fireTexture
      );

      // Phase transition flash
      if (this.phaseFlashTimer[idx] > 0 && this.phaseFlashTimer[idx] < 1.5) {
        const alpha = Math.sin(this.phaseFlashTimer[idx] * 15) * 0.15;
        g.rect(0, 0, viewW, viewH).fill({ color: 0xffffff, alpha: Math.max(0, alpha) });
      }

      const hexColor = parseInt(bike.playerColor.replace('#', ''), 16) || 0xff0055;
      const eliminated = bike.eliminated;

      if (!eliminated) {
        // The camera already tracks the bike's lane offset (ProjectionEngine.cameraX),
        // so the player's own sprite always sits at the horizontal centre of its viewport.
        const bikeScale = viewH / 135;
        const bikeScreenX = Math.round(viewW / 2);
        const margin = Math.round(viewH * 0.15);
        const bikeScreenY = viewH - margin + Math.round(bike.pitchAngle * 4 * bikeScale);

        const isInvulnerable = bike.invulnerabilityTimer > 0;
        const isFlashing = isInvulnerable && Math.floor(bike.invulnerabilityTimer * 10) % 2 === 0;

        if (!isFlashing) {
          this.renderPixelSuperbikeRear(g, bike, bikeScreenX, bikeScreenY, hexColor, bikeScale, fireTexture);
        }

        if (bike.isDrafting) {
          PixelFont.drawText(g, 'SLIPSTREAM', viewW / 2 - 44, viewH - 36, 0x0984e3, 1);
        }
      }

      if (bike.isCrashed) {
        g.rect(viewW / 2 - 50, viewH / 2 - 8, 100, 14).fill({ color: 0xff0055, alpha: 0.85 });
        PixelFont.drawText(g, 'CRASH!', viewW / 2 - 24, viewH / 2 - 5, 0xfffffe, 1);
      }

      // === RACING DASHBOARD HUD ===
      const hud = 0x0f0e17;
      const ha = 0.75;
      const rank = rankMap.get(bike.id) ?? 1;
      const rankSuffix = rank === 1 ? 'ST' : rank === 2 ? 'ND' : rank === 3 ? 'RD' : 'TH';

      // Compact HUD at 3-4 players — a 67px viewport can't afford full-height bars
      const compact = count >= 3;
      const topBarH = compact ? 7 : 10;
      const speedFontScale = compact ? 1 : 2;
      const speedPanelH = compact ? 12 : 18;

      // Top bar: position | distance
      g.rect(0, 0, viewW, topBarH).fill({ color: hud, alpha: ha });
      g.rect(0, topBarH - 1, viewW, 1).fill({ color: hexColor, alpha: 0.5 });
      PixelFont.drawText(g, `P${bike.id} ${rank}${rankSuffix}`, 3, 1, hexColor, 1);
      if (eliminated) PixelFont.drawText(g, 'ELIM', 80, 1, 0xff4757, 1);
      const distRemaining = Math.max(0, Math.round(HandcraftedTrack.TOTAL_LENGTH_METERS - bike.z));
      PixelFont.drawText(g, `${distRemaining}M`, viewW - 44, 1, 0xf4d160, 1);

      // Phase banner
      if (this.phaseFlashTimer[idx] > 0) {
        const pn = this.trackSegments[Math.floor(bike.z / ProjectionEngine.SEGMENT_LENGTH) % this.trackSegments.length]?.phaseName || '';
        const bw = Math.min(200, pn.length * 6 + 12);
        const bx = viewW / 2 - bw / 2;
        const bannerY = topBarH + 1;
        g.rect(bx, bannerY, bw, 9).fill({ color: hud, alpha: 0.85 });
        PixelFont.drawText(g, pn, bx + 4, bannerY + 2, 0x00f0ff, 1);
      }

      // Compact speed panel — bottom-left
      const spd = `${Math.round(bike.speed)}`;
      const spdCharW = compact ? 6 : 10;
      const livesGap = compact ? 6 : 40;
      g.rect(2, viewH - speedPanelH, spd.length * spdCharW + 6, speedPanelH).fill({ color: hud, alpha: ha });
      g.rect(2, viewH - speedPanelH, spd.length * spdCharW + 6, 1).fill({ color: hexColor, alpha: 0.6 });
      PixelFont.drawText(g, spd, 4, viewH - speedPanelH + 3, 0x00f0ff, speedFontScale);
      if (!compact) PixelFont.drawText(g, 'KM/H', 4 + spd.length * spdCharW, viewH - 13, 0x74b9ff, 1);

      // Lives — inline next to speed
      const livesY = compact ? viewH - speedPanelH + 3 : viewH - 16;
      for (let l = 0; l < 3; l++) {
        const lx = 4 + spd.length * spdCharW + livesGap + l * (compact ? 6 : 8);
        if (l < bike.lives) {
          g.rect(lx, livesY, 5, 5).fill({ color: 0xff4757 });
        } else {
          g.rect(lx, livesY, 5, 5).fill({ color: 0x353b48 });
        }
      }

      // Nitro gauge — thin horizontal bar across bottom
      const nitroW = viewW - 4;
      const nitroY = viewH - 2;
      g.rect(2, nitroY, nitroW, 2).fill({ color: 0x1a1a24 });
      const nFrac = bike.nitroGauge / 100;
      if (nFrac > 0) {
        g.rect(2, nitroY, Math.max(1, Math.round(nitroW * nFrac)), 2).fill({ color: bike.isNitroActive ? 0xff0055 : 0x00f0ff });
      }
    });

    // Check for eliminated players — if all but one eliminated, that one wins
    const activeBikes = this.bikes.filter((b) => !b.eliminated);
    if (activeBikes.length <= 1 && this.bikes.length > 1) {
      const survivor = activeBikes[0] ?? this.bikes[0];
      survivor.z = Math.max(survivor.z, HandcraftedTrack.TOTAL_LENGTH_METERS);
    }

    const winner = this.bikes.find((b) => b.z >= HandcraftedTrack.TOTAL_LENGTH_METERS);
    if (winner) {
      this.triggerMatchOver();
    }
  }

  private renderCountdown(viewW: number, viewH: number): void {
    this.viewportGraphics.forEach((g) => {
      g.clear();
      g.rect(0, 0, viewW, viewH).fill({ color: 0x0f0e17 });

      const pulse = Math.sin(this.countdownTimer * 8) * 0.3 + 0.7;
      if (this.countdownPhase > 0) {
        const txt = String(this.countdownPhase);
        const x = viewW / 2 - 8;
        const y = viewH / 2 - 10;
        g.rect(x - 4, y, 16, 20).fill({ color: 0xff0055, alpha: pulse });
        PixelFont.drawText(g, txt, x, y + 4, 0xfffffe, 2);
      } else {
        const x = viewW / 2 - 20;
        const y = viewH / 2 - 10;
        g.rect(x - 4, y, 44, 20).fill({ color: 0x55efc4, alpha: pulse });
        PixelFont.drawText(g, 'GO!', x, y + 4, 0x0f0e17, 2);
      }
    });
  }

  private triggerMatchOver(): void {
    if (this.state !== 'Playing') return;

    this.state = 'Finished';
    this.ctx.audio.playTone(660, 'sine', 0.5);

    this.results.show(this.bikes, () => {
      const standings = [...this.bikes]
        .sort((a, b) => b.z - a.z)
        .map((b) => ({ playerId: b.id, score: Math.round(b.z) }));

      this.ctx.events.emit('game:over', {
        winnerId: standings[0]?.playerId ?? 1,
        isTeamLoss: false,
        standings,
      });
    });
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
    this.results?.destroy();
    this.gameContainer?.destroy();
  }
}
