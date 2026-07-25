import { Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { GameContext, GameModule, InternalGameState } from '@runtime/types';
import { PixelFont } from '../turbo-rider/render/PixelFont';
import { LAVA_ESCAPE_CONFIG, LEVEL_THEMES } from './config';
import { Runner } from './entities/Runner';
import { generateLevel } from './systems/LevelGenerator';
import { pointsForPosition, rankMatchRecords } from './systems/Scoring';
import type {
  HazardData,
  LavaGamePhase,
  LavaLevel,
  LevelFinish,
  MatchRecord,
  PlatformData,
  Rect,
} from './types';

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface LavaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  gravity: number;
}

export default class LavaEscapeGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private root = new Container();
  private background = new Graphics();
  private backgroundPlate = new Sprite();
  private world = new Container();
  private worldGraphics = new Graphics();
  private hud = new Graphics();
  private runners: Runner[] = [];
  private records = new Map<number, MatchRecord>();
  private level!: LavaLevel;
  private phase: LavaGamePhase = 'intro';
  private stageIndex = 0;
  private phaseTimer = 0;
  private levelTime = 0;
  private totalTime = 0;
  private animationTime = 0;
  private musicTimer = 0;
  private lavaX: number = LAVA_ESCAPE_CONFIG.LAVA.START_X;
  private cameraX = 0;
  private shake = 0;
  private finishes: LevelFinish[] = [];
  private levelDead = new Set<number>();
  private resultsEmitted = false;
  private speedMultiplier = 1;
  private eventText = '';
  private eventTimer = 0;
  private impactCooldown = 0;
  private dangerAudioTimer = 0;
  private backgroundTextures = new Map<string, Texture>();
  private activeBackgroundAsset = '';
  private backgroundBaseX = 0;
  private particles: LavaParticle[] = [];
  private nearLavaPlayers = new Set<number>();

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.speedMultiplier = clamp(this.ctx.modifiers.speedMultiplier ?? 1, 0.5, 2);

    this.root.addChild(this.background);
    this.root.addChild(this.backgroundPlate);
    this.world.addChild(this.worldGraphics);
    this.root.addChild(this.world);
    this.root.addChild(this.hud);
    this.ctx.renderer.stage.addChild(this.root);

    this.runners = this.ctx.players.slice(0, 4).map((player, index) => {
      const runner = new Runner(player, index);
      this.world.addChild(runner.container);
      this.records.set(player.id, {
        playerId: player.id,
        score: 0,
        firstPlaces: 0,
        levelsSurvived: 0,
        cumulativeTime: 0,
        finishPosition: null,
        lastProgress: 0,
      });
      return runner;
    });

    const backgroundPaths = LEVEL_THEMES.flatMap((theme) =>
      'backgroundAsset' in theme ? [theme.backgroundAsset] : []
    );
    try {
      for (const assetPath of backgroundPaths) {
        this.backgroundTextures.set(assetPath, await Assets.load<Texture>(assetPath));
      }
    } catch {
      this.ctx.logger.info('Optional Lava Escape background art was unavailable; using procedural art.');
    }

    this.loadLevel(0);
    this.state = 'Ready';
    this.ctx.logger.info('Lava Escape initialized with five deterministic stages.');
  }

  public start(): void {
    this.state = 'Playing';
    this.ctx.audio.playTone(220, 'square', 0.12);
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;
    const safeDt = Math.min(dt, 1 / 20);
    this.animationTime += safeDt;
    this.totalTime += safeDt;
    this.eventTimer = Math.max(0, this.eventTimer - safeDt);
    this.impactCooldown = Math.max(0, this.impactCooldown - safeDt);
    this.updateParticles(safeDt);
    this.updatePresentationAudio(safeDt);

    if (this.phase === 'intro') {
      this.phaseTimer -= safeDt;
      if (this.phaseTimer <= 0) {
        this.phase = 'countdown';
        this.phaseTimer = LAVA_ESCAPE_CONFIG.COUNTDOWN_TIME;
      }
    } else if (this.phase === 'countdown') {
      const before = Math.ceil(this.phaseTimer);
      this.phaseTimer -= safeDt;
      const after = Math.ceil(this.phaseTimer);
      if (after !== before && after >= 1 && after <= 3) {
        this.ctx.audio.playTone(280 + (3 - after) * 70, 'square', 0.1);
      }
      if (this.phaseTimer <= 0) {
        this.phase = 'playing';
        this.phaseTimer = 0;
        this.ctx.audio.playTone(720, 'square', 0.18);
      }
    } else if (this.phase === 'playing') {
      this.updateRace(safeDt);
    } else if (this.phase === 'level-results') {
      this.phaseTimer -= safeDt;
      if (this.phaseTimer <= 0) this.loadLevel(this.stageIndex + 1);
    } else if (this.phase === 'level-retry') {
      this.phaseTimer -= safeDt;
      if (this.phaseTimer <= 0) this.retryCurrentLevel();
    } else if (this.phase === 'match-results') {
      this.phaseTimer -= safeDt;
      if (this.phaseTimer <= 0) this.emitResults();
    }

    this.updateCamera(safeDt);
    this.render();
  }

  private loadLevel(index: number): void {
    this.stageIndex = index;
    this.level = generateLevel(index, this.ctx.random);
    this.phase = 'intro';
    this.phaseTimer = LAVA_ESCAPE_CONFIG.INTRO_TIME;
    this.levelTime = 0;
    this.lavaX = LAVA_ESCAPE_CONFIG.LAVA.START_X;
    this.cameraX = 0;
    this.finishes = [];
    this.levelDead.clear();
    this.eventText = '';
    this.eventTimer = 0;
    this.dangerAudioTimer = 0;
    this.particles = [];
    this.nearLavaPlayers.clear();

    let spawnIndex = 0;
    this.runners.forEach((runner) => {
      const record = this.records.get(runner.id)!;
      record.finishPosition = null;
      record.lastProgress = 0;
      runner.resetForLevel(spawnIndex++);
      if (!runner.container.parent) this.world.addChild(runner.container);
    });
    this.ctx.audio.playTone(150 + index * 32, 'triangle', 0.3);
  }

  private updateRace(dt: number): void {
    this.levelTime += dt;
    this.updatePlatformsAndHazards(dt);

    const racers = this.runners.filter((r) => r.isAlive && !r.isSafe);
    const leaderX = racers.length ? Math.max(...racers.map((r) => r.x)) : this.lavaX;
    const catchup = leaderX - this.lavaX > LAVA_ESCAPE_CONFIG.LAVA.CATCHUP_DISTANCE
      ? LAVA_ESCAPE_CONFIG.LAVA.CATCHUP_BONUS
      : 0;
    this.lavaX += (this.level.lavaSpeed + catchup) * this.speedMultiplier * dt;

    // Never let a skilled leader outrun the lava so far that the chase
    // disappears from the match. This is a hard pressure boundary, not a
    // respawn or damage mechanic: the lava simply catches up to its cap.
    const furthestAllowedLavaX = leaderX - LAVA_ESCAPE_CONFIG.LAVA.MAX_DISTANCE_BEHIND;
    this.lavaX = Math.max(this.lavaX, furthestAllowedLavaX);

    for (const runner of this.runners) {
      if (!runner.isAlive || runner.isSafe) continue;
      const input = this.ctx.input.getPlayer(runner.id);
      if (input.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }

      const standing = this.level.platforms.find(
        (platform) => platform.id === runner.standingPlatformId && !platform.disabled
      );
      if (standing) {
        runner.x += standing.dx ?? 0;
        runner.y += standing.dy ?? 0;
      }

      runner.updateMovement(
        dt,
        input.isActive('moveLeft'),
        input.isActive('moveRight'),
        input.isJustPressed('action'),
        input.isJustReleased('action'),
        this.speedMultiplier
      );
      this.moveRunner(runner, dt);
      this.resolveWorldInteractions(runner);

      const record = this.records.get(runner.id)!;
      record.lastProgress = Math.max(record.lastProgress, runner.x);
    }

    this.resolvePlayerCollisions();
    this.updateCloseCallFeedback();
    this.evaluateRaceState();
  }

  private updatePlatformsAndHazards(dt: number): void {
    for (const platform of this.level.platforms) {
      const oldX = platform.x;
      const oldY = platform.y;
      if (platform.kind === 'moving-x') {
        platform.x = platform.originX + Math.sin(this.animationTime * (platform.speed ?? 1) + (platform.phase ?? 0)) * (platform.range ?? 20);
      } else if (platform.kind === 'moving-y') {
        platform.y = platform.originY - (Math.sin(this.animationTime * (platform.speed ?? 1) + (platform.phase ?? 0)) + 1) * 0.5 * (platform.range ?? 40);
      } else if (platform.kind === 'crumble' && platform.crumbleTimer !== undefined) {
        platform.crumbleTimer += dt;
        if (platform.crumbleTimer > 0.68) platform.disabled = true;
      }
      platform.dx = platform.x - oldX;
      platform.dy = platform.y - oldY;
    }

    for (const hazard of this.level.hazards) {
      if (hazard.kind === 'crusher') {
        const wave = (Math.sin(this.animationTime * (hazard.speed ?? 1.3) + (hazard.phase ?? 0)) + 1) * 0.5;
        hazard.y = hazard.originY + wave * (hazard.range ?? 80);
        hazard.active = wave > 0.18;
      } else if (hazard.kind === 'fire') {
        hazard.active = Math.sin(this.animationTime * (hazard.speed ?? 2) + (hazard.phase ?? 0)) > -0.15;
      } else if (hazard.kind === 'rock' && hazard.active) {
        hazard.vy = (hazard.vy ?? 0) + 520 * dt;
        hazard.y += (hazard.vy ?? 0) * dt;
        hazard.x += (hazard.vx ?? 0) * dt;
      }
    }

    for (const enemy of this.level.enemies) {
      enemy.x += enemy.speed * enemy.direction * dt;
      if (enemy.x > enemy.originX + enemy.range) enemy.direction = -1;
      if (enemy.x < enemy.originX - enemy.range) enemy.direction = 1;
    }
  }

  private moveRunner(runner: Runner, dt: number): void {
    const width = LAVA_ESCAPE_CONFIG.PLAYER.WIDTH;
    const height = LAVA_ESCAPE_CONFIG.PLAYER.HEIGHT;
    runner.touchingWallLeft = false;
    runner.touchingWallRight = false;

    runner.x += runner.vx * dt;
    for (const platform of this.solidPlatforms()) {
      if (!overlaps(runner.bounds, platform)) continue;
      const previousX = runner.x - runner.vx * dt;
      if (runner.vx > 0 && previousX + width / 2 <= platform.x + 3) {
        runner.x = platform.x - width / 2;
        runner.vx = 0;
        runner.touchingWallRight = true;
      } else if (runner.vx < 0 && previousX - width / 2 >= platform.x + platform.width - 3) {
        runner.x = platform.x + platform.width + width / 2;
        runner.vx = 0;
        runner.touchingWallLeft = true;
      }
    }

    runner.x = clamp(runner.x, width / 2, this.level.width - width / 2);
    const oldBottom = runner.y;
    const oldTop = runner.y - height;
    runner.y += runner.vy * dt;
    runner.isGrounded = false;
    runner.standingPlatformId = null;

    const horizontalInset = 2;
    for (const platform of this.solidPlatforms()) {
      const body = runner.bounds;
      const horizontalOverlap =
        body.x + horizontalInset < platform.x + platform.width &&
        body.x + body.width - horizontalInset > platform.x;
      if (!horizontalOverlap) continue;

      if (runner.vy >= 0 && oldBottom <= platform.y + 3 && runner.y >= platform.y) {
        const landingSpeed = runner.vy;
        runner.y = platform.y;
        runner.land(platform.id);
        if (landingSpeed > 85) {
          this.spawnLandingDust(runner.x, runner.y, platform.kind === 'metal' || platform.kind.startsWith('moving')
            ? 0xffc46b
            : 0xb6a7a1);
          if (platform.kind === 'metal' || platform.kind.startsWith('moving')) {
            this.spawnBurst(runner.x, runner.y - 2, 0xffd166, 3, 30);
            this.ctx.audio.playTone(260, 'square', 0.045, 'sfx', 0.035);
          }
        }
        if (platform.kind === 'crumble' && platform.crumbleTimer === undefined) {
          platform.crumbleTimer = 0;
        }
        break;
      }
      const platformBottom = platform.y + platform.height;
      if (runner.vy < 0 && oldTop >= platformBottom - 3 && runner.y - height <= platformBottom) {
        runner.y = platformBottom + height;
        runner.vy = 0;
        break;
      }
    }
  }

  private solidPlatforms(): PlatformData[] {
    return this.level.platforms.filter((platform) => !platform.disabled);
  }

  private resolveWorldInteractions(runner: Runner): void {
    if (runner.y > this.level.height + 45) {
      this.eliminateRunner(runner);
      return;
    }
    if (runner.x - LAVA_ESCAPE_CONFIG.PLAYER.WIDTH / 2 <= this.lavaX + 8) {
      this.eliminateRunner(runner);
      return;
    }

    for (const spring of this.level.springs) {
      if (overlaps(runner.bounds, spring) && runner.vy >= 0 && runner.y <= spring.y + 10) {
        runner.y = spring.y;
        runner.bounce(-315 * Math.sqrt(this.speedMultiplier));
        this.shake = Math.max(this.shake, 2);
        this.ctx.audio.playTone(480, 'square', 0.08);
        this.announce('BOUNCE BOOST');
      }
    }

    for (const wind of this.level.windZones) {
      if (overlaps(runner.bounds, wind)) runner.vx += wind.force / 60;
    }

    for (const trapSwitch of this.level.switches) {
      if (trapSwitch.triggered || !overlaps(runner.bounds, trapSwitch)) continue;
      trapSwitch.triggered = true;
      const target = this.level.hazards.find((hazard) => hazard.id === trapSwitch.targetHazardId);
      if (target) {
        target.active = true;
        target.triggered = true;
        target.vx = -24;
      }
      this.shake = Math.max(this.shake, 3);
      this.ctx.audio.playTone(120, 'sawtooth', 0.18);
      this.announce('TRAP TRIGGERED');
    }

    for (const hazard of this.level.hazards) {
      if (!this.isHazardTouchingRunner(hazard, runner)) continue;
      if (!runner.absorbHazard()) {
        this.eliminateRunner(runner);
        return;
      }
      this.ctx.audio.playTone(180, 'square', 0.15);
    }

    for (const enemy of this.level.enemies) {
      if (!overlaps(runner.bounds, enemy)) continue;
      if (runner.hazardGraceTimer <= 0) {
        runner.vx = enemy.direction * 150;
        runner.vy = -145;
        runner.hazardGraceTimer = 0.8;
        this.ctx.audio.playTone(145, 'square', 0.1);
        this.announce('WATCH YOUR STEP');
      }
    }

    if (runner.x >= this.level.safeX) this.finishRunner(runner);
  }

  private isHazardTouchingRunner(hazard: HazardData, runner: Runner): boolean {
    if (hazard.kind === 'rock') {
      if (!hazard.active) {
        if (Math.abs(runner.x - hazard.x) < 92) {
          hazard.active = true;
          hazard.triggered = true;
        }
        return false;
      }
      return overlaps(runner.bounds, hazard);
    }
    if (!hazard.active) return false;
    if (hazard.kind === 'rotor') {
      const angle = this.animationTime * (hazard.speed ?? 2) + (hazard.phase ?? 0);
      const radius = hazard.range ?? 32;
      for (const offset of [0, Math.PI]) {
        const x = hazard.x + hazard.width / 2 + Math.cos(angle + offset) * radius;
        const y = hazard.y + hazard.height / 2 + Math.sin(angle + offset) * radius;
        if (overlaps(runner.bounds, { x: x - 6, y: y - 6, width: 12, height: 12 })) return true;
      }
      return false;
    }
    return overlaps(runner.bounds, hazard);
  }

  private resolvePlayerCollisions(): void {
    const active = this.runners.filter((runner) => runner.isAlive && !runner.isSafe);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i]!;
        const b = active[j]!;
        if (!overlaps(a.bounds, b.bounds)) continue;

        const aAbove = a.y <= b.y - LAVA_ESCAPE_CONFIG.PLAYER.HEIGHT * 0.45 && a.vy > 40;
        const bAbove = b.y <= a.y - LAVA_ESCAPE_CONFIG.PLAYER.HEIGHT * 0.45 && b.vy > 40;
        if (aAbove) {
          a.bounce(-205);
          b.vx += a.vx * 0.12;
          a.showImpact();
          b.showImpact();
          this.announceInteraction('HEAD BOUNCE', 390);
        } else if (bAbove) {
          b.bounce(-205);
          a.vx += b.vx * 0.12;
          a.showImpact();
          b.showImpact();
          this.announceInteraction('HEAD BOUNCE', 390);
        } else {
          const direction = a.x <= b.x ? -1 : 1;
          const overlapX = Math.min(a.bounds.x + a.bounds.width - b.bounds.x, b.bounds.x + b.bounds.width - a.bounds.x);
          a.x += direction * overlapX * 0.5;
          b.x -= direction * overlapX * 0.5;
          const relative = clamp(Math.abs(a.vx - b.vx) * 0.35 + 24, 24, 72);
          a.vx = clamp(a.vx + direction * relative, -145, 145);
          b.vx = clamp(b.vx - direction * relative, -145, 145);
          a.showImpact();
          b.showImpact();
          this.announceInteraction('BUMP!', 210);
        }
      }
    }
  }

  private finishRunner(runner: Runner): void {
    const position = this.finishes.length + 1;
    const points = pointsForPosition(position);
    const record = this.records.get(runner.id)!;
    record.score += points;
    record.firstPlaces += position === 1 ? 1 : 0;
    record.levelsSurvived++;
    record.cumulativeTime += this.levelTime;
    record.finishPosition = position;
    this.finishes.push({ playerId: runner.id, position, points, time: this.levelTime });
    runner.markSafe();
    this.shake = Math.max(this.shake, 2);
    this.ctx.audio.playTone(660 + (4 - position) * 35, 'square', 0.24);
    this.spawnBurst(runner.x, runner.y - 12, runner.color, 12, 68);
    this.announce(`P${runner.id} SAFE`);
  }

  private eliminateRunner(runner: Runner): void {
    if (!runner.isAlive || runner.isSafe) return;
    runner.kill();
    const record = this.records.get(runner.id)!;
    // Death only removes the runner from the current level. They return when
    // the next level loads, but receive no points for this failed attempt.
    this.levelDead.add(runner.id);
    record.finishPosition = null;
    this.nearLavaPlayers.delete(runner.id);
    this.shake = Math.max(this.shake, 8);
    this.ctx.audio.playTone(92, 'sawtooth', 0.35);
    this.announce(`P${runner.id} OUT`);
    this.ctx.events.emit('player:eliminated', {
      playerId: runner.id,
      rank: this.runners.filter((candidate) => candidate.isAlive && !candidate.isSafe).length + 1,
      position: { x: runner.x, y: runner.y },
    });
  }

  private evaluateRaceState(): void {
    const survivors = this.runners.filter((runner) => runner.isAlive || runner.isSafe);

    if (survivors.length === 0) {
      this.beginLevelRetry();
      return;
    }

    // A lone survivor still has to reach the Safe Zone. Until then the
    // level remains active; if they die, the all-player retry below fires.
    if (survivors.every((runner) => runner.isSafe)) {
      this.finishLevelOrMatch();
    }
  }

  private finishLevelOrMatch(): void {
    if (this.stageIndex >= LEVEL_THEMES.length - 1) {
      this.beginMatchResults();
    } else {
      this.phase = 'level-results';
      this.phaseTimer = LAVA_ESCAPE_CONFIG.LEVEL_RESULT_TIME;
    }
  }

  private beginLevelRetry(): void {
    if (this.phase === 'level-retry') return;
    this.phase = 'level-retry';
    this.phaseTimer = 2.4;
    this.shake = Math.max(this.shake, 5);
    this.ctx.audio.playTone(140, 'sawtooth', 0.18);
    this.ctx.audio.playTone(220, 'triangle', 0.18);
    this.announce('LEVEL RETRY');
  }

  private retryCurrentLevel(): void {
    // Death is level-local, so a wipeout simply resets the whole roster on
    // this stage. Scores and completed-level totals remain untouched.
    this.loadLevel(this.stageIndex);
  }

  private beginMatchResults(): void {
    if (this.phase === 'match-results') return;
    this.phase = 'match-results';
    this.phaseTimer = LAVA_ESCAPE_CONFIG.MATCH_RESULT_TIME;
    this.ctx.audio.playTone(523, 'square', 0.16);
    this.ctx.audio.playTone(659, 'square', 0.24);
  }

  private emitResults(): void {
    if (this.resultsEmitted) return;
    this.resultsEmitted = true;
    this.state = 'Finished';
    const ranked = rankMatchRecords(this.records.values());
    this.ctx.events.emit('game:over', {
      winnerId: ranked[0]?.playerId ?? this.runners[0]?.id ?? 1,
      standings: rankMatchRecords(this.records.values()).map((record) => ({
        playerId: record.playerId,
        score: record.score,
      })),
    });
  }

  private updateCamera(dt: number): void {
    const active = this.runners.filter((runner) => runner.isAlive && !runner.isSafe);
    let target = this.cameraX;
    if (active.length) {
      const rear = Math.min(...active.map((runner) => runner.x));
      const front = Math.max(...active.map((runner) => runner.x));
      const packCenter = rear * 0.38 + front * 0.62;
      target = packCenter - LAVA_ESCAPE_CONFIG.WIDTH * 0.48;
      target = Math.max(target, front - (LAVA_ESCAPE_CONFIG.WIDTH - LAVA_ESCAPE_CONFIG.CAMERA.RIGHT_MARGIN));
    }
    target = Math.max(target, this.lavaX - LAVA_ESCAPE_CONFIG.CAMERA.LEFT_MARGIN);
    target = clamp(target, 0, Math.max(0, this.level.width - LAVA_ESCAPE_CONFIG.WIDTH));
    this.cameraX += (target - this.cameraX) * Math.min(1, dt * LAVA_ESCAPE_CONFIG.CAMERA.SMOOTHING);
    this.shake *= Math.pow(0.02, dt);
  }

  private updatePresentationAudio(dt: number): void {
    if (this.phase !== 'playing') return;
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      const motifs = [
        [110, 165, 220, 165],
        [98, 147, 196, 220],
        [123, 185, 247, 185],
        [92, 138, 207, 276],
        [82, 123, 164, 246],
      ];
      const motif = motifs[this.stageIndex]!;
      const note = motif[Math.floor(this.totalTime * 3.2) % motif.length]!;
      this.ctx.audio.playTone(note, 'square', 0.065, 'music', 0.035);
      this.musicTimer = 0.28;
    }

    const active = this.runners.filter((runner) => runner.isAlive && !runner.isSafe);
    const nearestRunner = active.length ? Math.min(...active.map((runner) => runner.x)) : this.lavaX;
    const lavaGap = nearestRunner - this.lavaX;
    if (lavaGap < 112) {
      this.dangerAudioTimer -= dt;
      if (this.dangerAudioTimer <= 0) {
        this.ctx.audio.playTone(120 + clamp(lavaGap, 0, 112) * 1.2, 'sawtooth', 0.07, 'sfx', 0.045);
        this.dangerAudioTimer = 0.34;
      }
    } else {
      this.dangerAudioTimer = 0;
    }
  }

  private updateCloseCallFeedback(): void {
    for (const runner of this.runners) {
      if (!runner.isAlive || runner.isSafe) {
        this.nearLavaPlayers.delete(runner.id);
        continue;
      }

      const gap = runner.x - this.lavaX;
      if (gap <= 34) {
        this.nearLavaPlayers.add(runner.id);
      } else if (this.nearLavaPlayers.delete(runner.id) && gap > 52) {
        this.spawnBurst(runner.x, runner.y - 10, 0xffd166, 7, 52);
        this.shake = Math.max(this.shake, 3);
        this.ctx.audio.playTone(760, 'triangle', 0.12, 'sfx', 0.07);
        this.announce('CLOSE CALL');
      }
    }
  }

  private spawnLandingDust(x: number, y: number, color: number): void {
    for (let i = 0; i < 5; i++) {
      const direction = i % 2 === 0 ? -1 : 1;
      this.particles.push({
        x: x + direction * (2 + Math.random() * 3),
        y: y - 2,
        vx: direction * (18 + Math.random() * 30),
        vy: -12 - Math.random() * 18,
        life: 0.22 + Math.random() * 0.1,
        maxLife: 0.32,
        size: 1 + Math.random() * 1.5,
        color,
        gravity: 40,
      });
    }
  }

  private spawnBurst(x: number, y: number, color: number, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const velocity = speed * (0.65 + Math.random() * 0.55);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 12,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
        size: 1 + Math.random() * 2,
        color,
        gravity: 72,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private drawParticles(g: Graphics): void {
    for (const particle of this.particles) {
      g.rect(
        Math.round(particle.x),
        Math.round(particle.y),
        Math.max(1, Math.round(particle.size)),
        Math.max(1, Math.round(particle.size)),
      ).fill({ color: particle.color, alpha: Math.max(0, particle.life / particle.maxLife) });
    }
  }

  private announce(text: string): void {
    this.eventText = text;
    this.eventTimer = 0.9;
  }

  private announceInteraction(text: string, frequency: number): void {
    if (this.impactCooldown > 0) return;
    this.impactCooldown = 0.28;
    this.shake = Math.max(this.shake, 2);
    this.ctx.audio.playTone(frequency, 'square', 0.08);
    this.announce(text);
  }

  private render(): void {
    this.renderBackground();
    this.renderWorld();
    this.renderHud();
    const jitterX = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
    const jitterY = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake * 0.55 : 0;
    this.world.position.set(Math.round(-this.cameraX + jitterX), Math.round(jitterY));
    this.runners.forEach((runner) => runner.render());
  }

  private renderBackground(): void {
    const g = this.background;
    const { palette } = this.level;
    g.clear();
    const assetPath = this.level.backgroundAsset;
    const texture = assetPath ? this.backgroundTextures.get(assetPath) : undefined;
    this.backgroundPlate.visible = Boolean(texture);
    if (texture) {
      if (this.activeBackgroundAsset !== assetPath) {
        this.activeBackgroundAsset = assetPath!;
        this.backgroundPlate.texture = texture;
        const scale = Math.max(
          (LAVA_ESCAPE_CONFIG.WIDTH + 48) / texture.width,
          LAVA_ESCAPE_CONFIG.HEIGHT / texture.height
        );
        this.backgroundPlate.width = texture.width * scale;
        this.backgroundPlate.height = texture.height * scale;
        this.backgroundBaseX = LAVA_ESCAPE_CONFIG.WIDTH - this.backgroundPlate.width;
      }
      const parallaxShift = (this.cameraX * 0.035) % 48;
      this.backgroundPlate.position.set(Math.round(this.backgroundBaseX + parallaxShift), 0);
      this.backgroundPlate.alpha = 0.72;
    }
    g.rect(0, 0, LAVA_ESCAPE_CONFIG.WIDTH, LAVA_ESCAPE_CONFIG.HEIGHT).fill({ color: palette.sky });

    const farOffset = -Math.floor(this.cameraX * 0.08) % 96;
    for (let x = farOffset - 96; x < LAVA_ESCAPE_CONFIG.WIDTH + 96; x += 96) {
      const peak = 45 + ((x / 96 + this.stageIndex) % 3) * 12;
      g.poly([x, 188, x + 48, peak, x + 96, 188]).fill({ color: palette.far, alpha: 0.8 });
    }
    const nearOffset = -Math.floor(this.cameraX * 0.18) % 128;
    for (let x = nearOffset - 128; x < LAVA_ESCAPE_CONFIG.WIDTH + 128; x += 128) {
      g.poly([x, 222, x + 34, 116, x + 72, 170, x + 128, 222]).fill({ color: palette.near, alpha: 0.75 });
    }

    for (let i = 0; i < 18; i++) {
      const px = (i * 73 + this.animationTime * (10 + i % 4) - this.cameraX * 0.05) % 520 - 20;
      const py = 210 - ((i * 31 + this.animationTime * (18 + i % 3)) % 170);
      g.rect(Math.round(px), Math.round(py), i % 3 === 0 ? 2 : 1, i % 4 === 0 ? 3 : 2)
        .fill({ color: i % 2 ? 0xff7b36 : 0xffd166, alpha: 0.45 });
    }

    if (this.stageIndex === 2) {
      const heat = 0.12 + Math.sin(this.animationTime * 2.4) * 0.04;
      g.rect(0, 186, LAVA_ESCAPE_CONFIG.WIDTH, 84).fill({ color: 0xff4b1f, alpha: heat });
      for (let x = 18; x < LAVA_ESCAPE_CONFIG.WIDTH; x += 62) {
        const rise = (this.animationTime * 18 + x * 3) % 44;
        g.rect(x, 174 - rise, 2, 14).fill({ color: 0xffa43a, alpha: 0.22 });
      }
    }
  }

  private renderWorld(): void {
    const g = this.worldGraphics;
    const { palette } = this.level;
    g.clear();

    for (const platform of this.level.platforms) {
      if (platform.disabled) continue;
      const wobble = platform.kind === 'crumble' && platform.crumbleTimer !== undefined
        ? Math.sin(this.animationTime * 45 + platform.x) * 1.5
        : 0;
      const color = platform.kind === 'metal' || platform.kind.startsWith('moving')
        ? palette.metal
        : palette.stone;
      g.rect(Math.round(platform.x + wobble), Math.round(platform.y), platform.width, platform.height)
        .fill({ color });
      g.rect(Math.round(platform.x + wobble), Math.round(platform.y), platform.width, 3)
        .fill({ color: palette.stoneLight });
      for (let tx = platform.x + 8; tx < platform.x + platform.width; tx += 16) {
        g.rect(Math.round(tx + wobble), Math.round(platform.y + 5), 2, Math.max(2, platform.height - 6))
          .fill({ color: 0x211b24, alpha: 0.35 });
      }

      // Small landing chevrons make the intended jump target readable without
      // adding a tutorial overlay or changing the shared-screen camera.
      if (platform.y < this.level.floorY - 18 && platform.width >= 40) {
        const pulse = 0.38 + Math.sin(this.animationTime * 4 + platform.x * 0.02) * 0.12;
        const markerX = platform.x + platform.width / 2;
        g.poly([markerX - 4, platform.y - 7, markerX, platform.y - 3, markerX + 4, platform.y - 7])
          .stroke({ color: palette.accent, width: 2, alpha: pulse });
      }
    }

    for (const spring of this.level.springs) {
      const pulse = 1 + Math.sin(this.animationTime * 8 + spring.x) * 2;
      g.rect(spring.x, spring.y + pulse, spring.width, spring.height - pulse)
        .fill({ color: 0x55efc4 });
      g.rect(spring.x + 3, spring.y + 2, spring.width - 6, 2).fill({ color: 0xffffff });
    }

    for (const wind of this.level.windZones) {
      for (let i = 0; i < 5; i++) {
        const wx = wind.x + ((i * 43 - this.animationTime * 52) % wind.width + wind.width) % wind.width;
        const wy = wind.y + 20 + i * 24;
        g.rect(wx, wy, 18, 2).fill({ color: 0xa8dadc, alpha: 0.42 });
      }
    }

    for (const trapSwitch of this.level.switches) {
      g.rect(trapSwitch.x, trapSwitch.y + (trapSwitch.triggered ? 3 : 0), trapSwitch.width, trapSwitch.height)
        .fill({ color: trapSwitch.triggered ? 0x666666 : 0xffd166 });
      if (!trapSwitch.triggered) {
        g.rect(trapSwitch.x + 4, trapSwitch.y - 3, trapSwitch.width - 8, 3)
          .fill({ color: 0xff6b35 });
      }
    }

    for (const hazard of this.level.hazards) this.drawHazard(g, hazard);

    for (const enemy of this.level.enemies) {
      const bounce = Math.sin(this.animationTime * 8 + enemy.x) * 2;
      g.rect(enemy.x, enemy.y + bounce, enemy.width, enemy.height).fill({ color: 0x6c5ce7 });
      g.rect(enemy.x + (enemy.direction > 0 ? 11 : 3), enemy.y + 4 + bounce, 3, 3)
        .fill({ color: 0xffffff });
      g.rect(enemy.x + 2, enemy.y + enemy.height - 2 + bounce, 5, 3).fill({ color: 0x211b24 });
      g.rect(enemy.x + 11, enemy.y + enemy.height - 2 + bounce, 5, 3).fill({ color: 0x211b24 });
    }

    this.drawSafeZone(g);
    this.drawLava(g);
    this.drawParticles(g);
  }

  private drawHazard(g: Graphics, hazard: HazardData): void {
    if (hazard.kind === 'spikes') {
      const count = Math.max(1, Math.floor(hazard.width / 7));
      for (let i = 0; i < count; i++) {
        const sx = hazard.x + i * (hazard.width / count);
        g.poly([sx, hazard.y + hazard.height, sx + hazard.width / count / 2, hazard.y, sx + hazard.width / count, hazard.y + hazard.height])
          .fill({ color: 0xe9ecef });
      }
    } else if (hazard.kind === 'rock') {
      if (!hazard.active && !hazard.triggered) {
        g.rect(hazard.x + 4, 4, hazard.width - 8, 3).fill({ color: 0xff6b35, alpha: 0.55 });
        g.rect(hazard.x + hazard.width / 2 - 1, 8, 2, Math.max(5, hazard.y - 10))
          .fill({ color: 0xff6b35, alpha: 0.2 });
        PixelFont.drawText(g, '!', hazard.x + hazard.width / 2 - 2, Math.max(12, hazard.y - 18), 0xffd166, 1);
      }
      g.poly([
        hazard.x + 3, hazard.y,
        hazard.x + hazard.width - 3, hazard.y + 2,
        hazard.x + hazard.width, hazard.y + hazard.height - 5,
        hazard.x + hazard.width - 5, hazard.y + hazard.height,
        hazard.x + 1, hazard.y + hazard.height - 3,
      ]).fill({ color: 0x66545a });
      g.rect(hazard.x + 5, hazard.y + 4, 5, 4).fill({ color: 0x96727a });
    } else if (hazard.kind === 'crusher') {
      const wave = (Math.sin(this.animationTime * (hazard.speed ?? 1.3) + (hazard.phase ?? 0)) + 1) * 0.5;
      if (wave > 0.66) {
        g.rect(hazard.x - 4, hazard.y + hazard.height + 9, hazard.width + 8, 3)
          .fill({ color: 0xff5a36, alpha: 0.45 + (wave - 0.66) });
      }
      g.rect(hazard.x, hazard.y, hazard.width, hazard.height).fill({ color: 0x75656b });
      g.rect(hazard.x + 4, hazard.y + 6, hazard.width - 8, hazard.height - 12)
        .fill({ color: 0x453b43 });
      g.poly([
        hazard.x, hazard.y + hazard.height,
        hazard.x + 7, hazard.y + hazard.height + 9,
        hazard.x + 14, hazard.y + hazard.height,
        hazard.x + 21, hazard.y + hazard.height + 9,
        hazard.x + hazard.width, hazard.y + hazard.height,
      ]).fill({ color: 0xd7c7c1 });
    } else if (hazard.kind === 'fire') {
      if (!hazard.active) {
        g.rect(hazard.x, hazard.y + hazard.height - 4, hazard.width, 4).fill({ color: 0x6c5551 });
        return;
      }
      const flicker = Math.sin(this.animationTime * 19 + hazard.x) * 3;
      g.poly([
        hazard.x, hazard.y + hazard.height,
        hazard.x + 4, hazard.y + 5 + flicker,
        hazard.x + 8, hazard.y + 11,
        hazard.x + 12, hazard.y + flicker,
        hazard.x + hazard.width, hazard.y + hazard.height,
      ]).fill({ color: 0xff5a1f });
      g.poly([
        hazard.x + 4, hazard.y + hazard.height,
        hazard.x + 8, hazard.y + 9 - flicker,
        hazard.x + 13, hazard.y + hazard.height,
      ]).fill({ color: 0xffd166 });
    } else if (hazard.kind === 'rotor') {
      const angle = this.animationTime * (hazard.speed ?? 2) + (hazard.phase ?? 0);
      const radius = hazard.range ?? 32;
      const cx = hazard.x + hazard.width / 2;
      const cy = hazard.y + hazard.height / 2;
      g.circle(cx, cy, radius + 8).stroke({ color: 0xff6b35, width: 1, alpha: 0.25 });
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx - Math.cos(angle) * radius;
      const y2 = cy - Math.sin(angle) * radius;
      g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0xb8b2b5, width: 4 });
      g.circle(cx, cy, 8).fill({ color: 0x51464d });
      g.circle(x1, y1, 7).fill({ color: 0xe9ecef });
      g.circle(x2, y2, 7).fill({ color: 0xe9ecef });
    }
  }

  private drawSafeZone(g: Graphics): void {
    const x = this.level.safeX;
    g.rect(x - 5, 74, 10, this.level.floorY - 74).fill({ color: 0x3b3547 });
    g.rect(x + 94, 74, 10, this.level.floorY - 74).fill({ color: 0x3b3547 });
    g.rect(x - 5, 70, 109, 12).fill({ color: this.level.palette.metal });
    g.rect(x + 5, 88, 88, this.level.floorY - 88).fill({ color: 0x183f38, alpha: 0.7 });
    g.rect(x + 8, 92, 82, 3).fill({ color: 0x55efc4 });
    PixelFont.drawText(g, 'SAFE', x + 30, 100, 0x55efc4, 2);

    const safeRunners = this.runners.filter((runner) => runner.isSafe);
    safeRunners.forEach((runner, index) => {
      const px = x + 18 + index * 20;
      g.rect(px, this.level.floorY - 18, 12, 18).fill({ color: runner.color });
      g.rect(px + 2, this.level.floorY - 22 - Math.abs(Math.sin(this.animationTime * 6 + index) * 3), 8, 5)
        .fill({ color: runner.color });
    });
  }

  private drawLava(g: Graphics): void {
    const x = this.lavaX;
    const main = 0xff3d00;
    const hot = 0xffd000;
    g.rect(x - 72, 0, 76, this.level.height).fill({ color: 0x8f1515 });
    const points: number[] = [x - 2, 0];
    for (let y = 0; y <= this.level.height; y += 12) {
      points.push(x + 7 + Math.sin(y * 0.11 + this.animationTime * 6) * 7, y);
    }
    points.push(x - 2, this.level.height);
    g.poly(points).fill({ color: main });
    for (let y = 8; y < this.level.height; y += 19) {
      const bubbleX = x - 12 + Math.sin(y + this.animationTime * 4) * 12;
      g.circle(bubbleX, y, 2 + (y % 3)).fill({ color: hot, alpha: 0.8 });
    }
  }

  private renderHud(): void {
    const g = this.hud;
    g.clear();
    g.rect(0, 0, LAVA_ESCAPE_CONFIG.WIDTH, 29).fill({ color: 0x0d0b12, alpha: 0.94 });
    PixelFont.drawText(g, `L${this.stageIndex + 1}/5`, 8, 7, this.level.palette.accent, 2);
    PixelFont.drawText(g, this.level.name, 48, 8, 0xc9bfce, 1);
    PixelFont.drawText(g, `${Math.floor(this.levelTime)}S`, 220, 8, 0xffffff, 1);

    this.runners.forEach((runner, index) => {
      const record = this.records.get(runner.id)!;
      const x = 286 + index * 47;
      const statusColor = this.levelDead.has(runner.id)
        ? 0x6c5b66
        : runner.isSafe
          ? 0x55efc4
          : runner.color;
      g.rect(x, 5, 8, 8).fill({ color: statusColor });
      PixelFont.drawText(g, `${record.score}`, x + 11, 6, statusColor, 1);
    });

    const active = this.runners.filter((runner) => runner.isAlive && !runner.isSafe);
    const leaderX = active.length ? Math.max(...active.map((runner) => runner.x)) : this.lavaX;
    const progress = clamp((leaderX - 58) / Math.max(1, this.level.safeX - 58), 0, 1);
    const lavaPressure = clamp((leaderX - this.lavaX) / LAVA_ESCAPE_CONFIG.LAVA.MAX_DISTANCE_BEHIND, 0, 1);
    g.rect(0, 29, LAVA_ESCAPE_CONFIG.WIDTH, 14).fill({ color: 0x17131f, alpha: 0.94 });
    PixelFont.drawText(g, 'RUN', 8, 32, 0xbcb3c5, 1);
    g.rect(34, 34, 84, 3).fill({ color: 0x352b3a });
    g.rect(34, 34, 84 * progress, 3).fill({ color: this.level.palette.accent });
    g.rect(123, 34, 54, 3).fill({ color: 0x352b3a });
    g.rect(123, 34, 54 * lavaPressure, 3).fill({ color: 0xff4b1f });
    PixelFont.drawText(g, 'LAVA', 182, 32, 0xff7b36, 1);
    PixelFont.drawText(g, 'SAFE', 232, 32, 0x55efc4, 1);

    for (const runner of this.runners) {
      if (!runner.isAlive || runner.isSafe) continue;
      const screenX = runner.x - this.cameraX;
      if (screenX < 26) {
        g.poly([6, 42, 18, 35, 18, 49]).fill({ color: runner.color });
        PixelFont.drawText(g, `P${runner.id}`, 21, 39, runner.color, 1);
      } else if (screenX > LAVA_ESCAPE_CONFIG.WIDTH - 18) {
        g.poly([474, 42, 462, 35, 462, 49]).fill({ color: runner.color });
      }
    }

    if (this.eventTimer > 0) {
      g.rect(154, 48, 172, 17).fill({ color: 0x0d0b12, alpha: 0.88 });
      g.rect(154, 48, 3, 17).fill({ color: this.level.palette.accent });
      this.centeredText(g, this.eventText, 53, 0xffffff, 1);
    }

    if (this.phase === 'intro') this.drawIntro(g);
    if (this.phase === 'countdown') this.drawCountdown(g);
    if (this.phase === 'level-results') this.drawLevelResults(g);
    if (this.phase === 'level-retry') this.drawLevelRetry(g);
    if (this.phase === 'match-results') this.drawMatchResults(g);
  }

  private panel(g: Graphics, x: number, y: number, width: number, height: number): void {
    g.rect(x, y, width, height).fill({ color: 0x0d0b12, alpha: 0.94 });
    g.rect(x, y, width, 3).fill({ color: this.level.palette.accent });
    g.rect(x, y + height - 3, width, 3).fill({ color: this.level.palette.accent });
  }

  private centeredText(g: Graphics, text: string, y: number, color: number, scale: number): void {
    const estimatedWidth = text.length * 4 * scale;
    PixelFont.drawText(g, text, Math.round((LAVA_ESCAPE_CONFIG.WIDTH - estimatedWidth) / 2), y, color, scale);
  }

  private drawIntro(g: Graphics): void {
    this.panel(g, 54, 82, 372, 100);
    this.centeredText(g, `LEVEL ${this.stageIndex + 1}`, 98, 0xffffff, 2);
    this.centeredText(g, this.level.name, 125, this.level.palette.accent, 2);
    this.centeredText(g, this.level.subtitle, 157, 0xbcb3c5, 1);
  }

  private drawCountdown(g: Graphics): void {
    const number = Math.ceil(this.phaseTimer);
    const label = number > 3 ? 'GET READY' : number > 0 ? String(number) : 'RUN!';
    const scale = label.length === 1 ? 7 : 3;
    this.centeredText(g, label, label.length === 1 ? 94 : 112, number === 1 ? 0xff5a36 : 0xffe066, scale);
    if (number > 0 && number <= 3) {
      this.centeredText(g, 'RUN RIGHT  JUMP EARLY  TAP OR HOLD', 166, 0xffffff, 1);
    }
  }

  private drawLevelResults(g: Graphics): void {
    this.panel(g, 86, 48, 308, 174);
    this.centeredText(g, `LEVEL ${this.stageIndex + 1} CLEAR`, 62, 0x55efc4, 2);
    let y = 94;
    const ranked = rankMatchRecords(this.records.values());
    for (const record of ranked) {
      const runner = this.runners.find((candidate) => candidate.id === record.playerId)!;
      const levelFinish = this.finishes.find((finish) => finish.playerId === record.playerId);
      const status = levelFinish
        ? `+${levelFinish.points}`
        : this.levelDead.has(record.playerId)
          ? 'DEAD'
          : 'SAFE';
      PixelFont.drawText(g, `P${record.playerId}`, 112, y, runner.color, 2);
      PixelFont.drawText(g, status, 190, y + 1, this.levelDead.has(record.playerId) ? 0xff5a5f : 0x55efc4, 1);
      PixelFont.drawText(g, `${record.score} PTS`, 286, y + 1, 0xffffff, 1);
      y += 25;
    }
    this.centeredText(g, `NEXT: ${LEVEL_THEMES[this.stageIndex + 1]!.name}`, 205, this.level.palette.accent, 1);
  }

  private drawLevelRetry(g: Graphics): void {
    this.panel(g, 76, 78, 328, 112);
    this.centeredText(g, 'EVERYONE DOWN', 96, 0xff5a36, 2);
    this.centeredText(g, `RETRY LEVEL ${this.stageIndex + 1}`, 128, 0xffe066, 2);
    this.centeredText(g, 'MATCH SCORE KEPT', 158, 0xbcb3c5, 1);
  }

  private drawMatchResults(g: Graphics): void {
    const ranked = rankMatchRecords(this.records.values());
    const winner = ranked[0];
    this.panel(g, 66, 44, 348, 182);
    this.centeredText(g, 'ESCAPE COMPLETE', 58, 0xffe066, 2);
    if (winner) {
      const runner = this.runners.find((candidate) => candidate.id === winner.playerId)!;
      this.centeredText(g, `P${winner.playerId} WINS`, 88, runner.color, 3);
    }
    let y = 130;
    rankMatchRecords(this.records.values()).forEach((record, index) => {
      const runner = this.runners.find((candidate) => candidate.id === record.playerId)!;
      PixelFont.drawText(g, `${index + 1}. P${record.playerId}`, 108, y, runner.color, 1);
      PixelFont.drawText(g, `${record.score} PTS`, 270, y, 0xffffff, 1);
      y += 20;
    });
  }

  public pause(): void {
    if (this.state === 'Playing') this.state = 'Paused';
  }

  public resume(): void {
    if (this.state === 'Paused') this.state = 'Playing';
  }

  public destroy(): void {
    this.state = 'Destroyed';
    this.runners.forEach((runner) => runner.destroy());
    this.runners = [];
    this.root.destroy({ children: true });
    this.records.clear();
  }
}
