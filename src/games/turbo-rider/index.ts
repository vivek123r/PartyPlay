import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { BikePhysics } from './core/BikePhysics';
import { HandcraftedTrack } from './core/HandcraftedTrack';
import { ProjectionEngine } from './render/ProjectionEngine';
import { TrafficManager } from './core/TrafficManager';
import { resolveBikeCollisions, type BumpEvent } from './core/BikeCollisions';
import { GarageScreen } from './screens/GarageScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { PowerUpManager } from './core/PowerUpManager';
import { EnvironmentFX } from './render/EnvironmentFX';
import { PixelFont } from './render/PixelFont';
import { VideoEngine } from './render/VideoEngine';
import type { SelfBikeDraw } from './render/ProjectionEngine';
import type { TrackSegment, OpponentSprite } from './types';

function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

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

  // Audio edge-detection / retrigger state, one slot per bike (index-aligned with this.bikes)
  private prevCrashed: boolean[] = [];
  private prevEliminated: boolean[] = [];
  private prevFinished: boolean[] = [];
  private prevNitroActive: boolean[] = [];
  private nearMissCooldown: number[] = [];
  private nitroDepletedCooldown: number[] = [];
  private skidCooldown: number[] = [];
  private offRoadCooldown: number[] = [];
  private prevRank: number[] = [];
  private rankEventCooldown: number[] = [];
  private overtakeFlashTimer: number[] = [];
  private overtakeFlashText: string[] = [];
  private bumpCooldowns = new Map<string, number>();
  private cameraBackState: number[] = [];
  private cameraDepthState: number[] = [];

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing TURBO RIDER 3D AAA Upgrade...');
    this.garage.setAudioService(context.audio);

    const { stage } = this.ctx.renderer;
    this.gameContainer = new Container();
    stage.addChild(this.gameContainer);

    // Initialize Video Engine for the animated skybox video. The bike's nitro flame used to
    // draw from this same singleton's fire.mp4 texture — one shared Texture instance handed
    // to every viewport — which couldn't be tinted or scaled per bike and was the likely
    // cause of nitro visuals bleeding between players; it's now drawn procedurally instead
    // (see render/BikeSprite.ts), so the fire video is no longer loaded.
    VideoEngine.getInstance().initSkyboxVideo('/assets/videos/synthwave_arcade_showcase.mp4').catch(() => {});

    const count = Math.min(4, Math.max(2, this.ctx.players.length));
    this.bikes = this.ctx.players.slice(0, count).map((p, idx) => {
      const bike = new BikePhysics(p.id, p.color);
      bike.x = idx === 0 ? -0.4 : idx === 1 ? 0.4 : idx === 2 ? -0.2 : 0.2;
      return bike;
    });

    this.prevPhaseIndex = new Array(count).fill(0);
    this.phaseFlashTimer = new Array(count).fill(0);
    this.prevCrashed = new Array(count).fill(false);
    this.prevEliminated = new Array(count).fill(false);
    this.prevFinished = new Array(count).fill(false);
    this.prevNitroActive = new Array(count).fill(false);
    this.cameraBackState = new Array(count).fill(ProjectionEngine.CAMERA_BACK);
    this.cameraDepthState = new Array(count).fill(ProjectionEngine.CAMERA_DEPTH);
    this.nearMissCooldown = new Array(count).fill(0);
    this.nitroDepletedCooldown = new Array(count).fill(0);
    this.skidCooldown = new Array(count).fill(0);
    this.offRoadCooldown = new Array(count).fill(0);
    this.prevRank = this.bikes.map((_, i) => i + 1);
    this.rankEventCooldown = new Array(count).fill(0);
    this.overtakeFlashTimer = new Array(count).fill(0);
    this.overtakeFlashText = new Array(count).fill('');

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

  /** Spreads simultaneous per-player sounds across the stereo field so two players triggering
   * the same event (e.g. nitro) at once don't sum into what sounds like a single event. */
  private panForIdx(idx: number, count: number): number {
    if (count <= 1) return 0;
    return (idx / (count - 1)) * 1.4 - 0.7;
  }

  /** The local player's own bike is always drawn at the horizontal centre of its viewport
   * (the camera already tracks lane offset) — shared by the FX exhaust points and the render loop. */
  private bikeScreenPose(bike: BikePhysics, viewW: number, viewH: number): { screenX: number; screenY: number; scale: number } {
    const scale = viewH / 135;
    const screenX = Math.round(viewW / 2);
    const margin = Math.round(viewH * 0.15);
    const screenY = viewH - margin + Math.round(bike.pitchAngle * 4 * scale);
    return { screenX, screenY, scale };
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
        this.bikes.forEach((bike, i) => this.ctx.audio.startEngineVoice(bike.id, this.panForIdx(i, count)));
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
          this.ctx.audio.startMusic(count >= 3 ? 0.6 : 1);
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
      // Drafting also works behind another human player, same thresholds as traffic
      for (const other of this.bikes) {
        if (other === bike || other.eliminated || other.isCrashed) continue;
        let dz = Math.abs(bike.z - other.z);
        if (dz > trackLen / 2) dz = trackLen - dz;
        const dx = Math.abs(bike.x - other.x);
        if (dz < 15 && dx < 0.35) {
          if (dz < 6 && dx < 0.25) nearMiss = true;
          if (dz < 12 && dx < 0.3 && bike.z < other.z - 2) {
            bike.isDrafting = true;
            bike.slipstreamBonus = 0.15;
          }
        }
      }

      bike.update(dt, moveLeft, moveRight, accelerate, isBraking, triggerNitro, currentCurve);

      // --- Audio edge-detection & continuous voices ---
      if (bike.isCrashed && !this.prevCrashed[idx]) {
        this.ctx.audio.playTone(110 + (bike.id - 1) * 12, 'sawtooth', 0.3);
        this.ctx.audio.playNoiseBurst({ duration: 0.25, filterType: 'lowpass', filterFreq: 900, gain: 0.4 });
      }
      if (bike.eliminated && !this.prevEliminated[idx]) {
        this.ctx.audio.playSweep({ type: 'sawtooth', startFreq: 220, endFreq: 60, duration: 0.4, gain: 0.35 });
        this.ctx.audio.stopEngineVoice(bike.id, 0.6);
      }
      this.prevCrashed[idx] = bike.isCrashed;
      this.prevEliminated[idx] = bike.eliminated;

      const hasFinished = bike.z >= HandcraftedTrack.TOTAL_LENGTH_METERS;
      if (hasFinished && !this.prevFinished[idx]) {
        const finishPose = this.bikeScreenPose(bike, viewW, viewH);
        this.envFX[idx].spawnFinishBurst(finishPose.screenX, finishPose.screenY - 10 * finishPose.scale);
        this.ctx.audio.playArpeggio([523, 659, 784, 1047], 0.11, 'square');
      }
      this.prevFinished[idx] = hasFinished;

      const nitroPan = this.panForIdx(idx, count);
      if (bike.isNitroActive && !this.prevNitroActive[idx]) {
        // Per-player pitch offset + pan — two players igniting nitro in the same frame used to
        // play the identical sweep twice with zero separation, which summed into what sounded
        // like a single event.
        const idOffset = (bike.id - 1) * 60;
        this.ctx.audio.playSweep({ type: 'sawtooth', startFreq: 200 + idOffset, endFreq: 900 + idOffset, duration: 0.35, pan: nitroPan });
        const ignitePose = this.bikeScreenPose(bike, viewW, viewH);
        const igniteColor = parseInt(bike.customization.underglowLed.replace('#', ''), 16) || 0x00f0ff;
        this.envFX[idx].spawnNitroIgnition(ignitePose.screenX, ignitePose.screenY - 8 * ignitePose.scale, igniteColor);
      } else if (!bike.isNitroActive && this.prevNitroActive[idx] && bike.nitroGauge <= 0.01 && this.nitroDepletedCooldown[idx] <= 0) {
        // Two short soft beeps ("low fuel" chime) instead of a single harsh sawtooth buzz, with
        // a cooldown so a gauge hovering near zero can't machine-gun the sound while held.
        this.ctx.audio.playTone(300, 'sine', 0.06, 'sfx', 0.2, nitroPan);
        setTimeout(() => this.ctx.audio.playTone(240, 'sine', 0.06, 'sfx', 0.2, nitroPan), 90);
        this.nitroDepletedCooldown[idx] = 1.0;
      }
      this.nitroDepletedCooldown[idx] = Math.max(0, this.nitroDepletedCooldown[idx] - dt);
      this.prevNitroActive[idx] = bike.isNitroActive;

      this.nearMissCooldown[idx] = Math.max(0, this.nearMissCooldown[idx] - dt);
      if (nearMiss && this.nearMissCooldown[idx] <= 0) {
        bike.registerComboEvent();
        this.ctx.audio.playTone(1046 + (bike.id - 1) * 12 + bike.comboCount * 30, 'sine', 0.05);
        this.nearMissCooldown[idx] = 0.3;
      }

      this.skidCooldown[idx] = Math.max(0, this.skidCooldown[idx] - dt);
      if (isBraking && bike.speed > 50 && this.skidCooldown[idx] <= 0) {
        this.ctx.audio.playNoiseBurst({ duration: 0.2, filterType: 'bandpass', filterFreq: 2500, gain: 0.15 });
        this.skidCooldown[idx] = 0.15;
      }

      this.offRoadCooldown[idx] = Math.max(0, this.offRoadCooldown[idx] - dt);
      if (bike.isOffRoad && !bike.isCrashed && this.offRoadCooldown[idx] <= 0) {
        this.ctx.audio.playNoiseBurst({ duration: 0.18, filterType: 'lowpass', filterFreq: 500, gain: 0.12 });
        this.offRoadCooldown[idx] = 0.2;
      }

      this.rankEventCooldown[idx] = Math.max(0, this.rankEventCooldown[idx] - dt);
      const rankNow = rankMap.get(bike.id) ?? this.prevRank[idx];
      if (!bike.eliminated && rankNow < this.prevRank[idx] && this.rankEventCooldown[idx] <= 0) {
        bike.registerComboEvent();
        this.ctx.audio.playTone(700 + (bike.id - 1) * 40 + bike.comboCount * 30, 'triangle', 0.1);
        this.rankEventCooldown[idx] = 1.0;
        this.overtakeFlashTimer[idx] = 1.2;
        const suffix = rankNow === 1 ? 'ST' : rankNow === 2 ? 'ND' : rankNow === 3 ? 'RD' : 'TH';
        this.overtakeFlashText[idx] = `OVERTAKE! ${rankNow}${suffix}`;
      }
      this.prevRank[idx] = rankNow;
      if (this.overtakeFlashTimer[idx] > 0) this.overtakeFlashTimer[idx] -= dt;

      // Dynamic camera — nitro pulls the camera back slightly, smoothed so it never jitters
      const targetCameraBack = bike.isNitroActive ? 11 : ProjectionEngine.CAMERA_BACK;
      this.cameraBackState[idx] += (targetCameraBack - this.cameraBackState[idx]) * Math.min(1, 4 * dt);
      const targetCameraDepth = bike.isNitroActive ? 2.75 : ProjectionEngine.CAMERA_DEPTH;
      this.cameraDepthState[idx] += (targetCameraDepth - this.cameraDepthState[idx]) * Math.min(1, 4 * dt);

      const speedNorm = Math.min(1, bike.speed / 260);
      let engineFreq = 55 + speedNorm * 150 + (bike.id - 1) * 12;
      let engineFilter = 800 + speedNorm * 3500;
      if (bike.isNitroActive) {
        engineFreq += 40;
        engineFilter += 2000;
      }
      let engineGain = (0.05 + speedNorm * 0.15) * (0.32 / Math.sqrt(count));
      if (bike.eliminated) engineGain *= 0.15;
      if (bike.isCrashed) engineGain *= 0.3;
      this.ctx.audio.updateEngineVoice(bike.id, {
        freq: engineFreq,
        gain: engineGain,
        detune: bike.isNitroActive ? 14 : 6,
        filterFreq: engineFilter,
      });

      // Thin out particle FX at 3-4 players — same number of viewports means the same
      // particle counts cost proportionally more fill work per frame.
      const fxDensity = count >= 3 ? 0.5 : 1;
      const fx = this.envFX[idx];
      if (isBraking && bike.speed > 50) {
        fx.spawnBrakeSparks(viewW / 2, viewH - 10, Math.max(2, Math.round(4 * fxDensity)));
      }
      if (bike.isNitroActive) {
        const hexColor = parseInt(bike.customization.underglowLed.replace('#', ''), 16) || 0x00f0ff;
        const pose = this.bikeScreenPose(bike, viewW, viewH);
        const s = (n: number) => n * pose.scale;
        const leanRotFx = Math.max(-25, Math.min(25, bike.leanAngle * 25));
        const leanOffsetFx = leanRotFx * 0.15 * pose.scale;
        const exhaustLX = pose.screenX - s(6) + leanOffsetFx * 0.2;
        const exhaustRX = pose.screenX + s(6) + leanOffsetFx * 0.2;
        const exhaustY = pose.screenY - s(3);
        fx.spawnNitroFlames(exhaustLX, exhaustRX, exhaustY, hexColor, Math.max(2, Math.round(4 * fxDensity)));
      }

      fx.update(dt, bike.speed, viewW, viewH, fxDensity, bike.isNitroActive);

      const vContainer = this.viewportContainers[idx];
      if (bike.isCrashed) {
        this.envFX[idx].triggerShake(10);
        fx.spawnBrakeSparks(viewW / 2 + (Math.random() - 0.5) * 20, viewH - 20, Math.max(3, Math.round(8 * fxDensity)));
      } else {
        vContainer.position.set(0, idx * viewH);
      }
    });

    const bumpEvents = resolveBikeCollisions(this.bikes, HandcraftedTrack.TOTAL_LENGTH_METERS, dt, this.bumpCooldowns);
    bumpEvents.forEach((ev) => this.handleBumpFeedback(ev, viewW, viewH));

    this.traffic.update(dt, this.bikes, HandcraftedTrack.TOTAL_LENGTH_METERS);
    this.powerUps.update(dt, this.bikes, HandcraftedTrack.TOTAL_LENGTH_METERS, (bike, type) => {
      const idOffset = (bike.id - 1) * 40;
      let bannerText = '';
      if (type === 'boost') {
        this.ctx.audio.playSweep({ type: 'triangle', startFreq: 550 + idOffset, endFreq: 1100 + idOffset, duration: 0.18 });
        bannerText = 'BOOST!';
      } else if (type === 'shield') {
        this.ctx.audio.playTone(659 + idOffset, 'square', 0.15);
        setTimeout(() => this.ctx.audio.playTone(880 + idOffset, 'square', 0.15), 60);
        bannerText = 'SHIELD UP';
      } else if (type === 'nitroFull') {
        this.ctx.audio.playSweep({ type: 'sawtooth', startFreq: 300 + idOffset, endFreq: 700 + idOffset, duration: 0.2 });
        bannerText = 'NITRO FULL';
      } else if (type === 'extraLife') {
        this.ctx.audio.playArpeggio([523 + idOffset, 659 + idOffset, 880 + idOffset], 0.1, 'square');
        bannerText = '+1 LIFE';
      } else {
        this.ctx.audio.playTone(880 + idOffset, 'triangle', 0.08);
        bannerText = '+COIN';
      }

      // Floating notification — reuses the same fade-timer/text slot the overtake banner
      // already uses (same mechanism, not a new system); a pickup and an overtake are rare
      // enough events that sharing one banner-per-viewport slot is fine.
      const idx = this.bikes.indexOf(bike);
      if (idx >= 0) {
        this.overtakeFlashTimer[idx] = 1.2;
        this.overtakeFlashText[idx] = bannerText;
      }
    });

    // Render-facing snapshot of every bike, for the opponent-rendering loop in ProjectionEngine
    const opponentSprites: OpponentSprite[] = this.bikes.map((b) => ({
      id: b.id,
      laneX: b.x,
      z: b.z,
      leanAngle: b.leanAngle,
      colorHex: parseInt(b.playerColor.replace('#', ''), 16) || 0xff0055,
      suitColorHex: parseInt(b.customization.suitColor.replace('#', ''), 16) || 0x2d3436,
      helmetColorHex: parseInt(b.customization.helmetColor.replace('#', ''), 16) || 0xff0055,
      isNitroActive: b.isNitroActive,
      isCrashed: b.isCrashed,
      eliminated: b.eliminated,
      isInvulnerable: b.invulnerabilityTimer > 0,
      label: `P${b.id}`,
    }));

    // Render Split 3D Viewports
    this.bikes.forEach((bike, idx) => {
      const g = this.viewportGraphics[idx];
      g.clear();

      const hexColor = parseInt(bike.playerColor.replace('#', ''), 16) || 0xff0055;
      const eliminated = bike.eliminated;

      // The camera already tracks the bike's lane offset (ProjectionEngine.cameraX),
      // so the player's own sprite always sits at the horizontal centre of its viewport.
      const { screenX: bikeScreenX, screenY: bikeScreenY, scale: bikeScale } = this.bikeScreenPose(bike, viewW, viewH);

      const isInvulnerable = bike.invulnerabilityTimer > 0;
      const isFlashing = isInvulnerable && Math.floor(bike.invulnerabilityTimer * 10) % 2 === 0;

      const selfBike: SelfBikeDraw | undefined = (!eliminated && !isFlashing)
        ? {
          id: bike.id,
          screenX: bikeScreenX,
          screenY: bikeScreenY,
          scale: bikeScale,
          leanAngle: bike.leanAngle,
          isNitroActive: bike.isNitroActive,
          colors: {
            hull: hexColor,
            suit: parseInt(bike.customization.suitColor.replace('#', ''), 16) || 0x2d3436,
            helmet: parseInt(bike.customization.helmetColor.replace('#', ''), 16) || hexColor,
          },
        }
        : undefined;

      ProjectionEngine.renderViewportRoad(
        g, this.trackSegments, bike.z, bike.x,
        viewW, viewH, count, this.traffic.vehicles,
        this.powerUps.pickups, skyboxTexture,
        opponentSprites, bike.id, selfBike, this.cameraBackState[idx], this.cameraDepthState[idx]
      );

      // Phase transition flash
      if (this.phaseFlashTimer[idx] > 0 && this.phaseFlashTimer[idx] < 1.5) {
        const alpha = Math.sin(this.phaseFlashTimer[idx] * 15) * 0.15;
        g.rect(0, 0, viewW, viewH).fill({ color: 0xffffff, alpha: Math.max(0, alpha) });
      }

      if (!eliminated && bike.isDrafting) {
        PixelFont.drawText(g, 'SLIPSTREAM', viewW / 2 - 44, viewH - 36, 0x0984e3, 1);
      }

      if (bike.isCrashed) {
        g.rect(viewW / 2 - 50, viewH / 2 - 8, 100, 14).fill({ color: 0xff0055, alpha: 0.85 });
        PixelFont.drawText(g, 'CRASH!', viewW / 2 - 24, viewH / 2 - 5, 0xfffffe, 1);
      }

      if (this.overtakeFlashTimer[idx] > 0) {
        const t = this.overtakeFlashTimer[idx];
        const alpha = t > 0.3 ? 1 : t / 0.3;
        const text = this.overtakeFlashText[idx];
        const tw = text.length * 4;
        const cx = Math.round(viewW / 2 - tw / 2);
        const cy = Math.round(viewH / 2 - 26);
        g.rect(cx - 6, cy - 3, tw + 12, 11).fill({ color: 0x0f0e17, alpha: 0.75 * alpha });
        PixelFont.drawText(g, text, cx, cy, 0x55efc4, 1, alpha);
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

      // Health bar — reuses the old fixed player-color accent line's exact position/alpha so a
      // full-health bike looks identical to before; below 60% health it shrinks and shifts
      // toward red instead of staying a full-width static accent.
      const healthFrac = Math.max(0, Math.min(1, bike.health / 100));
      const healthColor = healthFrac > 0.6 ? hexColor : mixColor(0xff4757, hexColor, healthFrac / 0.6);
      g.rect(0, topBarH - 1, viewW, 1).fill({ color: 0x000000, alpha: 0.3 });
      g.rect(0, topBarH - 1, Math.max(1, Math.round(viewW * healthFrac)), 1).fill({ color: healthColor, alpha: 0.6 });
      PixelFont.drawText(g, `P${bike.id} ${rank}${rankSuffix}`, 3, 1, hexColor, 1);
      if (eliminated) PixelFont.drawText(g, 'ELIM', 80, 1, 0xff4757, 1);
      const distRemaining = Math.max(0, Math.round(HandcraftedTrack.TOTAL_LENGTH_METERS - bike.z));
      PixelFont.drawText(g, `${distRemaining}M`, viewW - 44, 1, 0xf4d160, 1);

      // Race progress mini-bar — one pip per player so rivals stay legible even off-screen
      const progressBarY = topBarH + 1;
      const progressBarH = 3;
      const progressMarginX = 4;
      const progressBarW = viewW - progressMarginX * 2;
      g.rect(progressMarginX, progressBarY, progressBarW, progressBarH).fill({ color: 0x1a1a24, alpha: 0.8 });
      this.bikes.forEach((other) => {
        const frac = Math.max(0, Math.min(1, other.z / HandcraftedTrack.TOTAL_LENGTH_METERS));
        const px = progressMarginX + frac * progressBarW;
        const otherColor = parseInt(other.playerColor.replace('#', ''), 16) || 0xff0055;
        const isSelf = other.id === bike.id;
        const pipSize = isSelf ? 4 : 3;
        const py = progressBarY + progressBarH / 2 - pipSize / 2;
        if (isSelf) {
          g.rect(Math.round(px - pipSize / 2) - 1, Math.round(py) - 1, pipSize + 2, pipSize + 2).stroke({ width: 1, color: 0xfffffe, alpha: 0.9 });
        }
        g.rect(Math.round(px - pipSize / 2), Math.round(py), pipSize, pipSize).fill({ color: otherColor, alpha: other.eliminated ? 0.35 : 1 });
      });

      // Phase banner
      if (this.phaseFlashTimer[idx] > 0) {
        const pn = this.trackSegments[Math.floor(bike.z / ProjectionEngine.SEGMENT_LENGTH) % this.trackSegments.length]?.phaseName || '';
        const bw = Math.min(200, pn.length * 6 + 12);
        const bx = viewW / 2 - bw / 2;
        const bannerY = progressBarY + progressBarH + 2;
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
        const lowGauge = nFrac < 0.2 && !bike.isNitroActive;
        const blinkOn = Math.floor(Date.now() / 150) % 2 === 0;
        const barColor = bike.isNitroActive ? 0xff0055 : (lowGauge && blinkOn ? 0xff4757 : 0x00f0ff);
        g.rect(2, nitroY, Math.max(1, Math.round(nitroW * nFrac)), 2).fill({ color: barColor });
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

  private handleBumpFeedback(ev: BumpEvent, viewW: number, viewH: number): void {
    const fxA = this.envFX[ev.idxA];
    const fxB = this.envFX[ev.idxB];
    fxA?.triggerShake(4);
    fxB?.triggerShake(4);
    fxA?.spawnBrakeSparks(viewW / 2, viewH - 20, 3);
    fxB?.spawnBrakeSparks(viewW / 2, viewH - 20, 3);
    if (ev.kind === 'rear') {
      this.ctx.audio.playTone(150, 'square', 0.08);
    } else {
      this.ctx.audio.playTone(320, 'sawtooth', 0.06);
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
    this.ctx.audio.playArpeggio([523, 659, 784], 0.13, 'square');
    this.ctx.audio.stopAllEngineVoices(0.5);
    this.ctx.audio.stopMusic(1.0);

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
    this.ctx.audio.stopAllLoops();
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
