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
import { publicAsset } from '@shared/assetUrl';
import { setPixelScale, BIKE_SCALE_REF_VIEW_H } from './render/RenderScale';
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

  /** The game's own render-space size, read once from `ctx.renderer.viewport` in `init()` —
   * never hardcoded 480x270 (see manifest.ts logicalWidth/logicalHeight). */
  private viewW = 480;
  private viewHFull = 270;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing TURBO RIDER 3D AAA Upgrade...');
    this.garage.setAudioService(context.audio);

    const { stage, viewport } = this.ctx.renderer;
    this.viewW = viewport.width;
    this.viewHFull = viewport.height;
    setPixelScale(this.viewW);

    this.gameContainer = new Container();
    stage.addChild(this.gameContainer);

    // Initialize Video Engine for the animated skybox video. The bike's nitro flame used to
    // draw from this same singleton's fire.mp4 texture — one shared Texture instance handed
    // to every viewport — which couldn't be tinted or scaled per bike and was the likely
    // cause of nitro visuals bleeding between players; it's now drawn procedurally instead
    // (see render/BikeSprite.ts), so the fire video is no longer loaded.
    VideoEngine.getInstance().initSkyboxVideo(publicAsset('/assets/videos/synthwave_arcade_showcase.mp4')).catch(() => {});

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

    const viewW = this.viewW;
    const viewH = Math.floor(this.viewHFull / count);

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
    const scale = viewH / BIKE_SCALE_REF_VIEW_H;
    const screenX = Math.round(viewW / 2);
    const margin = Math.round(viewH * 0.15);
    const screenY = viewH - margin + Math.round(bike.pitchAngle * 4 * scale);
    return { screenX, screenY, scale };
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    const count = this.bikes.length;
    const viewW = this.viewW;
    const viewH = Math.floor(this.viewHFull / count);

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

      this.garage.render(this.bikes, this.viewW, this.viewHFull);

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

      const horizonY = ProjectionEngine.horizonYFor(viewH, count);
      fx.update(dt, bike.speed, viewW, viewH, fxDensity, bike.isNitroActive, horizonY);

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

      // hudScale: an integer HUD-chrome multiplier, NOT the old binary `compact` flag. `compact`
      // was tuned for a 67px 4-player viewport that no longer exists at native resolution — the
      // smallest viewport now (4P, 135px) is exactly what 2P used to have. 2P (270px) runs the
      // full chrome at 2x; 3P/4P (180/135px) run it at 1x, i.e. today's *full* layout (never the
      // old compact one) at full pixel density.
      const hudScale = viewH >= 270 ? 2 : 1;

      if (!eliminated && bike.isDrafting) {
        const t = 'SLIPSTREAM';
        PixelFont.drawTextLarge(g, t, Math.round(viewW / 2 - PixelFont.measureLarge(t, hudScale) / 2), viewH - 36 * hudScale, 0x0984e3, hudScale);
      }

      if (bike.isCrashed) {
        const t = 'CRASH!';
        const boxW = 100 * hudScale;
        const boxH = 14 * hudScale;
        g.rect(viewW / 2 - boxW / 2, viewH / 2 - boxH / 2, boxW, boxH).fill({ color: 0xff0055, alpha: 0.85 });
        PixelFont.drawTextLarge(g, t, Math.round(viewW / 2 - PixelFont.measureLarge(t, hudScale) / 2), viewH / 2 - 3 * hudScale, 0xfffffe, hudScale);
      }

      if (this.overtakeFlashTimer[idx] > 0) {
        const t = this.overtakeFlashTimer[idx];
        const alpha = t > 0.3 ? 1 : t / 0.3;
        const text = this.overtakeFlashText[idx];
        const tw = PixelFont.measureLarge(text, hudScale);
        const cx = Math.round(viewW / 2 - tw / 2);
        const cy = Math.round(viewH / 2 - 26 * hudScale);
        g.rect(cx - 6 * hudScale, cy - 3 * hudScale, tw + 12 * hudScale, 11 * hudScale).fill({ color: 0x0f0e17, alpha: 0.75 * alpha });
        PixelFont.drawTextLarge(g, text, cx, cy, 0x55efc4, hudScale, alpha);
      }

      // === RACING DASHBOARD HUD ===
      const hud = 0x0f0e17;
      const ha = 0.75;
      const rank = rankMap.get(bike.id) ?? 1;
      const rankSuffix = rank === 1 ? 'ST' : rank === 2 ? 'ND' : rank === 3 ? 'RD' : 'TH';

      const topBarH = 10 * hudScale;
      const speedPanelH = 18 * hudScale;

      // Top bar: position | distance
      g.rect(0, 0, viewW, topBarH).fill({ color: hud, alpha: ha });

      // Health bar — reuses the old fixed player-color accent line's exact position/alpha so a
      // full-health bike looks identical to before; below 60% health it shrinks and shifts
      // toward red instead of staying a full-width static accent.
      const healthFrac = Math.max(0, Math.min(1, bike.health / 100));
      const healthColor = healthFrac > 0.6 ? hexColor : mixColor(0xff4757, hexColor, healthFrac / 0.6);
      g.rect(0, topBarH - hudScale, viewW, hudScale).fill({ color: 0x000000, alpha: 0.3 });
      g.rect(0, topBarH - hudScale, Math.max(hudScale, Math.round(viewW * healthFrac)), hudScale).fill({ color: healthColor, alpha: 0.6 });

      const posLabel = `P${bike.id} ${rank}${rankSuffix}`;
      PixelFont.drawTextLarge(g, posLabel, 3 * hudScale, 1 * hudScale, hexColor, hudScale);
      let rightEdgeUsed = 3 * hudScale + PixelFont.measureLarge(posLabel, hudScale);
      if (eliminated) {
        const t = 'ELIM';
        PixelFont.drawTextLarge(g, t, rightEdgeUsed + 6 * hudScale, 1 * hudScale, 0xff4757, hudScale);
        rightEdgeUsed += 6 * hudScale + PixelFont.measureLarge(t, hudScale);
      }
      const distRemaining = Math.max(0, Math.round(HandcraftedTrack.TOTAL_LENGTH_METERS - bike.z));
      const distText = `${distRemaining}M`;
      PixelFont.drawTextLarge(g, distText, viewW - 4 * hudScale - PixelFont.measureLarge(distText, hudScale), 1 * hudScale, 0xf4d160, hudScale);

      // Race progress mini-bar — one pip per player so rivals stay legible even off-screen
      const progressBarY = topBarH + 1 * hudScale;
      const progressBarH = 3 * hudScale;
      const progressMarginX = 4 * hudScale;
      const progressBarW = viewW - progressMarginX * 2;
      g.rect(progressMarginX, progressBarY, progressBarW, progressBarH).fill({ color: 0x1a1a24, alpha: 0.8 });
      this.bikes.forEach((other) => {
        const frac = Math.max(0, Math.min(1, other.z / HandcraftedTrack.TOTAL_LENGTH_METERS));
        const px = progressMarginX + frac * progressBarW;
        const otherColor = parseInt(other.playerColor.replace('#', ''), 16) || 0xff0055;
        const isSelf = other.id === bike.id;
        const pipSize = (isSelf ? 4 : 3) * hudScale;
        const py = progressBarY + progressBarH / 2 - pipSize / 2;
        if (isSelf) {
          g.rect(Math.round(px - pipSize / 2) - hudScale, Math.round(py) - hudScale, pipSize + 2 * hudScale, pipSize + 2 * hudScale).stroke({ width: hudScale, color: 0xfffffe, alpha: 0.9 });
        }
        g.rect(Math.round(px - pipSize / 2), Math.round(py), pipSize, pipSize).fill({ color: otherColor, alpha: other.eliminated ? 0.35 : 1 });
      });

      // Phase banner
      if (this.phaseFlashTimer[idx] > 0) {
        const pn = this.trackSegments[Math.floor(bike.z / ProjectionEngine.SEGMENT_LENGTH) % this.trackSegments.length]?.phaseName || '';
        const bw = Math.min(viewW * 0.45, PixelFont.measure(pn, hudScale) + 12 * hudScale);
        const bx = viewW / 2 - bw / 2;
        const bannerY = progressBarY + progressBarH + 2 * hudScale;
        const bannerH = 9 * hudScale;
        g.rect(bx, bannerY, bw, bannerH).fill({ color: hud, alpha: 0.85 });
        PixelFont.drawText(g, pn, bx + 4 * hudScale, bannerY + 2 * hudScale, 0x00f0ff, hudScale);
      }

      // Speed panel — bottom-left, 5x7 digits at hudScale so the readout stays the largest,
      // most legible number on screen (the pixel budget the higher resolution exists to spend).
      const spd = `${Math.round(bike.speed)}`;
      const spdW = PixelFont.measureLarge(spd, hudScale);
      const kmhW = PixelFont.measure('KM/H', hudScale);
      const panelLeft = 2 * hudScale;
      const digitX = panelLeft + 2 * hudScale;
      const kmhX = digitX + spdW + 2 * hudScale;
      // Panel background must reach past the KM/H label too, not just the digits — otherwise
      // the label draws unshaded over the scrolling scenery instead of on the dark backing.
      const panelW = kmhX + kmhW + 4 * hudScale - panelLeft;
      g.rect(panelLeft, viewH - speedPanelH, panelW, speedPanelH).fill({ color: hud, alpha: ha });
      g.rect(panelLeft, viewH - speedPanelH, panelW, hudScale).fill({ color: hexColor, alpha: 0.6 });
      PixelFont.drawTextLarge(g, spd, digitX, viewH - speedPanelH + 3 * hudScale, 0x00f0ff, hudScale);
      PixelFont.drawText(g, 'KM/H', kmhX, viewH - speedPanelH + speedPanelH / 2 + 1 * hudScale, 0x74b9ff, hudScale);

      // Lives — bevelled squares (dark border + inner highlight) inline next to speed
      const livesGap = 10 * hudScale;
      const livesY = viewH - speedPanelH + speedPanelH / 2 - 2.5 * hudScale;
      const lifeSize = 5 * hudScale;
      for (let l = 0; l < 3; l++) {
        const lx = kmhX + kmhW + livesGap + l * (lifeSize + 3 * hudScale);
        const filled = l < bike.lives;
        g.rect(lx, livesY, lifeSize, lifeSize).fill({ color: filled ? 0xff4757 : 0x353b48 });
        g.rect(lx + hudScale * 0.5, livesY + hudScale * 0.5, lifeSize - hudScale, hudScale * 0.5).fill({ color: 0xffffff, alpha: filled ? 0.35 : 0.12 });
      }

      // Nitro gauge — thin horizontal bar across the bottom, with a dark outline and 25/50/75%
      // segment ticks so a glance shows fill fraction, not just "some amount".
      const nitroW = viewW - 4 * hudScale;
      const nitroH = 4 * hudScale;
      const nitroY = viewH - nitroH - hudScale;
      g.rect(2 * hudScale, nitroY, nitroW, nitroH).fill({ color: 0x1a1a24 }).stroke({ width: hudScale, color: 0x000000, alpha: 0.5 });
      const nFrac = bike.nitroGauge / 100;
      if (nFrac > 0) {
        const lowGauge = nFrac < 0.2 && !bike.isNitroActive;
        const blinkOn = Math.floor(Date.now() / 150) % 2 === 0;
        const barColor = bike.isNitroActive ? 0xff0055 : (lowGauge && blinkOn ? 0xff4757 : 0x00f0ff);
        g.rect(2 * hudScale, nitroY, Math.max(hudScale, Math.round(nitroW * nFrac)), nitroH).fill({ color: barColor });
      }
      [0.25, 0.5, 0.75].forEach((f) => {
        g.rect(2 * hudScale + nitroW * f, nitroY, hudScale, nitroH).fill({ color: 0x000000, alpha: 0.4 });
      });
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
    const hudScale = viewH >= 270 ? 2 : 1;
    const fontScale = 1.5 * hudScale;
    this.viewportGraphics.forEach((g) => {
      g.clear();
      g.rect(0, 0, viewW, viewH).fill({ color: 0x0f0e17 });

      const pulse = Math.sin(this.countdownTimer * 8) * 0.3 + 0.7;
      const padX = 8 * hudScale;
      const padY = 6 * hudScale;
      if (this.countdownPhase > 0) {
        const txt = String(this.countdownPhase);
        const tw = PixelFont.measureLarge(txt, fontScale);
        const x = Math.round(viewW / 2 - tw / 2);
        const y = Math.round(viewH / 2 - (7 * fontScale) / 2);
        g.rect(x - padX, y - padY, tw + padX * 2, 7 * fontScale + padY * 2).fill({ color: 0xff0055, alpha: pulse });
        PixelFont.drawTextLarge(g, txt, x, y, 0xfffffe, fontScale);
      } else {
        const txt = 'GO!';
        const tw = PixelFont.measureLarge(txt, fontScale);
        const x = Math.round(viewW / 2 - tw / 2);
        const y = Math.round(viewH / 2 - (7 * fontScale) / 2);
        g.rect(x - padX, y - padY, tw + padX * 2, 7 * fontScale + padY * 2).fill({ color: 0x55efc4, alpha: pulse });
        PixelFont.drawTextLarge(g, txt, x, y, 0x0f0e17, fontScale);
      }
    });
  }

  private triggerMatchOver(): void {
    if (this.state !== 'Playing') return;

    this.state = 'Finished';
    this.ctx.audio.playArpeggio([523, 659, 784], 0.13, 'square');
    this.ctx.audio.stopAllEngineVoices(0.5);
    this.ctx.audio.stopMusic(1.0);

    this.results.show(this.bikes, this.viewW, this.viewHFull, () => {
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
