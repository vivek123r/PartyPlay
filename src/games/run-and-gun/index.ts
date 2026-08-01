import { Container, Graphics, Text } from 'pixi.js';
import type { GameContext, GameModule, InternalGameState } from '@runtime/types';
import type {
  PlayerState,
  EnemyState,
  Projectile,
  Particle,
  PowerUp,
  PowerUpType,
  EnemyType,
  LevelData,
  Explosion,
} from './types';
import { LEVEL_1 } from './config/level1';
import { CHARACTERS } from './config/characters';
import {
  buildSky,
  drawSkyAnim,
  buildMountains,
  buildSkyline,
  buildTreeLine,
  drawClouds,
  drawFog,
  drawWeather,
  buildGround,
  buildGroundFeatures,
  buildPlatforms,
  buildEnvironment,
  drawEnvironmentAnim,
  biomeAt,
  drawPlayer,
  drawTetherEdge,
  drawSoldier,
  drawTurret,
  drawBoss,
  drawPlayerBullet,
  drawEnemyBullet,
  drawBossBullet,
  drawParticle,
  drawPowerUp,
  drawExplosion,
  drawShockRing,
  drawVignette,
} from './rendering';

// ── Constants ─────────────────────────────────────────────────

const GRAVITY = 600;
const PLAYER_SPEED = 120;
const JUMP_VELOCITY = -220;
const PLAYER_WIDTH = 16;
const PLAYER_HEIGHT = 24;
const BULLET_SPEED = 300;
const ENEMY_BULLET_SPEED = 150;
const MAX_LIVES = 3;
const PLAYER_MAX_HP = 3;
const INVINCIBLE_DURATION = 1.5;
const DEATH_RESPAWN_DELAY = 1.0;
const ENEMY_SPEED = 45;
const ENEMY_SHOOT_COOLDOWN_SOLDIER = 1.8;
const ENEMY_SHOOT_COOLDOWN_TURRET = 1.2;
const ENEMY_SHOOT_COOLDOWN_BOSS = 0.7;
const PARTICLE_MAX_LIFE = 0.5;
const EXPLOSION_DURATION = 0.42;

/** How far from the left edge the leading player is held while the screen scrolls. */
const CAMERA_LEAD_MARGIN = 264;
/** Players are kept this far inside the viewport so nobody can be left off-screen. */
const VIEW_EDGE_PAD = 4;

interface ParallaxLayer {
  container: Container;
  factor: number;
  shake: boolean;
}

export default class RunAndGunGame implements GameModule {
  private _state: InternalGameState = 'Initializing';
  private ctx!: GameContext;

  // Containers
  private skyContainer!: Container;
  private cloudContainer!: Container;
  private mtnFarContainer!: Container;
  private skylineContainer!: Container;
  private mtnMidContainer!: Container;
  private treeLineContainer!: Container;
  private mtnNearContainer!: Container;
  private fogContainer!: Container;
  private worldContainer!: Container;
  private envContainer!: Container;
  private envAnimContainer!: Container;
  private particleContainer!: Container;
  private entityContainer!: Container;
  private powerUpContainer!: Container;
  private projectileContainer!: Container;
  private fxContainer!: Container;
  private weatherContainer!: Container;
  private effectContainer!: Container;
  private hudContainer!: Container;

  private parallaxLayers: ParallaxLayer[] = [];

  // Graphics
  private skyGfx!: Graphics;
  private skyAnimGfx!: Graphics;
  private cloudGfx!: Graphics;
  private mtnFarGfx!: Graphics;
  private skylineGfx!: Graphics;
  private mtnMidGfx!: Graphics;
  private treeLineGfx!: Graphics;
  private mtnNearGfx!: Graphics;
  private fogGfx!: Graphics;
  private groundGfx!: Graphics;
  private platformGfx!: Graphics;
  private envGfx!: Graphics;
  private envAnimGfx!: Graphics;
  private entityGfx!: Graphics;
  private projectileGfx!: Graphics;
  private powerUpGfx!: Graphics;
  private particleGfx!: Graphics;
  private fxGfx!: Graphics;
  private weatherGfx!: Graphics;
  private hudGfx!: Graphics;
  private effectGfx!: Graphics;

  // HUD text
  private p1HealthText!: Text;
  private p2HealthText!: Text;
  private p1LivesText!: Text;
  private p2LivesText!: Text;
  private scoreText!: Text;
  private bossNameText!: Text;

  // Game state
  private level: LevelData = LEVEL_1;
  private players: PlayerState[] = [];
  private enemies: EnemyState[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];
  private explosions: Explosion[] = [];
  private cameraX = 0;
  private score = 0;
  private gameOver = false;
  private nextEnemyId = 1;
  private nextPowerUpId = 1;
  private playerCount = 1;
  private musicStarted = false;
  private time = 0;
  /** Which viewport edge each player is currently being held against, if any. */
  private pinnedEdge = new Map<number, 'left' | 'right' | null>();

  // Juiciness & Screen Shake
  private shakeTimer = 0;
  private shakeIntensity = 0;

  // Viewport cache
  private viewportW = 480;
  private viewportH = 270;

  get state(): InternalGameState {
    return this._state;
  }

  // ── Lifecycle ─────────────────────────────────────────────

  async init(context: GameContext): Promise<void> {
    this._state = 'Loading';
    this.ctx = context;
    const { viewport, stage } = this.ctx.renderer;
    this.viewportW = viewport.width;
    this.viewportH = viewport.height;

    // Parse modifiers
    const modifiers = this.ctx.modifiers as Record<string, any>;
    const diffMultipliers = (modifiers.difficulty || {}) as Record<string, number>;
    const enemyCountMul = diffMultipliers.enemyCountMultiplier || 1;
    const enemyHpMul = diffMultipliers.enemyHealthMultiplier || 1;
    const bossHpMul = diffMultipliers.bossHealthMultiplier || 1;

    this.buildSceneGraph(stage);
    this.bakeStaticScenery();

    // Spawn players
    this.playerCount = this.ctx.players.length;
    const charIds = (modifiers.characterIds || {}) as Record<number, string>;
    for (const playerCfg of this.ctx.players) {
      const spawn = this.level.playerSpawns[playerCfg.id - 1] || this.level.playerSpawns[0];
      const charId = charIds[playerCfg.id] || 'commando';
      this.players.push(this.createPlayer(playerCfg.id, playerCfg.color, charId, spawn.x, spawn.y));
    }

    // Spawn enemies with difficulty multipliers
    this.spawnLevelEnemies(enemyCountMul, enemyHpMul, bossHpMul);

    this._state = 'Ready';
  }

  /** Layer stack, back to front. Each parallax layer is offset by the camera every frame,
   * which keeps every backdrop moving at exactly its own rate — no per-pixel scroll maths. */
  private buildSceneGraph(stage: Container): void {
    this.skyContainer = new Container();
    this.cloudContainer = new Container();
    this.mtnFarContainer = new Container();
    this.skylineContainer = new Container();
    this.mtnMidContainer = new Container();
    this.treeLineContainer = new Container();
    this.mtnNearContainer = new Container();
    this.fogContainer = new Container();
    this.worldContainer = new Container();
    this.envContainer = new Container();
    this.envAnimContainer = new Container();
    this.particleContainer = new Container();
    this.entityContainer = new Container();
    this.powerUpContainer = new Container();
    this.projectileContainer = new Container();
    this.fxContainer = new Container();
    this.weatherContainer = new Container();
    this.effectContainer = new Container();
    this.hudContainer = new Container();

    this.parallaxLayers = [
      { container: this.skyContainer, factor: 0, shake: false },
      { container: this.cloudContainer, factor: 0.20, shake: false },
      { container: this.mtnFarContainer, factor: 0.25, shake: false },
      { container: this.skylineContainer, factor: 0.32, shake: false },
      { container: this.mtnMidContainer, factor: 0.40, shake: false },
      { container: this.mtnNearContainer, factor: 0.70, shake: false },
      // Tree line rides in front of the foothills, otherwise the hills swallow it
      { container: this.treeLineContainer, factor: 0.78, shake: false },
      { container: this.fogContainer, factor: 0.90, shake: true },
      { container: this.worldContainer, factor: 1, shake: true },
      { container: this.envContainer, factor: 1, shake: true },
      { container: this.envAnimContainer, factor: 1, shake: true },
      { container: this.particleContainer, factor: 1, shake: true },
      { container: this.entityContainer, factor: 1, shake: true },
      { container: this.powerUpContainer, factor: 1, shake: true },
      { container: this.projectileContainer, factor: 1, shake: true },
      { container: this.fxContainer, factor: 1, shake: true },
    ];

    for (const layer of this.parallaxLayers) stage.addChild(layer.container);
    // Screen-space layers sit on top; the HUD is last so nothing ever covers it.
    stage.addChild(this.weatherContainer);
    stage.addChild(this.effectContainer);
    stage.addChild(this.hudContainer);

    this.skyGfx = new Graphics();
    this.skyAnimGfx = new Graphics();
    this.cloudGfx = new Graphics();
    this.mtnFarGfx = new Graphics();
    this.skylineGfx = new Graphics();
    this.mtnMidGfx = new Graphics();
    this.treeLineGfx = new Graphics();
    this.mtnNearGfx = new Graphics();
    this.fogGfx = new Graphics();
    this.groundGfx = new Graphics();
    this.platformGfx = new Graphics();
    this.envGfx = new Graphics();
    this.envAnimGfx = new Graphics();
    this.entityGfx = new Graphics();
    this.powerUpGfx = new Graphics();
    this.projectileGfx = new Graphics();
    this.particleGfx = new Graphics();
    this.fxGfx = new Graphics();
    this.weatherGfx = new Graphics();
    this.hudGfx = new Graphics();
    this.effectGfx = new Graphics();

    this.skyContainer.addChild(this.skyGfx);
    this.skyContainer.addChild(this.skyAnimGfx);
    this.cloudContainer.addChild(this.cloudGfx);
    this.mtnFarContainer.addChild(this.mtnFarGfx);
    this.skylineContainer.addChild(this.skylineGfx);
    this.mtnMidContainer.addChild(this.mtnMidGfx);
    this.treeLineContainer.addChild(this.treeLineGfx);
    this.mtnNearContainer.addChild(this.mtnNearGfx);
    this.fogContainer.addChild(this.fogGfx);
    this.worldContainer.addChild(this.groundGfx);
    this.worldContainer.addChild(this.platformGfx);
    this.envContainer.addChild(this.envGfx);
    this.envAnimContainer.addChild(this.envAnimGfx);
    this.entityContainer.addChild(this.entityGfx);
    this.powerUpContainer.addChild(this.powerUpGfx);
    this.projectileContainer.addChild(this.projectileGfx);
    this.particleContainer.addChild(this.particleGfx);
    this.fxContainer.addChild(this.fxGfx);
    this.weatherContainer.addChild(this.weatherGfx);
    this.effectContainer.addChild(this.effectGfx);
    this.hudContainer.addChild(this.hudGfx);

    this.buildHudText();
  }

  private buildHudText(): void {
    const pixelFont = { fontFamily: 'Press Start 2P', fontSize: 6, fill: 0xffffff };

    this.p1HealthText = new Text({ text: '', style: { ...pixelFont } });
    this.p2HealthText = new Text({ text: '', style: { ...pixelFont } });
    this.p1LivesText = new Text({
      text: '',
      style: { fontFamily: 'Pixelify Sans', fontSize: 7, fill: 0xff4444 },
    });
    this.p2LivesText = new Text({
      text: '',
      style: { fontFamily: 'Pixelify Sans', fontSize: 7, fill: 0xff4444 },
    });
    this.scoreText = new Text({
      text: '',
      style: { fontFamily: 'Press Start 2P', fontSize: 5, fill: 0xffde7d },
    });
    this.bossNameText = new Text({
      text: '',
      style: { fontFamily: 'Press Start 2P', fontSize: 5, fill: 0xff8888 },
    });

    this.p1HealthText.position.set(8, 2);
    this.p1LivesText.position.set(8, 17);

    // Right-anchored so long labels never spill off the edge
    this.p2HealthText.anchor.set(1, 0);
    this.p2LivesText.anchor.set(1, 0);
    this.p2HealthText.position.set(this.viewportW - 8, 2);
    this.p2LivesText.position.set(this.viewportW - 8, 17);

    this.scoreText.anchor.set(0.5, 0);
    this.scoreText.position.set(this.viewportW / 2, 3);

    this.bossNameText.anchor.set(0.5, 0);
    this.bossNameText.position.set(this.viewportW / 2, this.viewportH - 16);

    this.hudContainer.addChild(this.p1HealthText);
    this.hudContainer.addChild(this.p2HealthText);
    this.hudContainer.addChild(this.p1LivesText);
    this.hudContainer.addChild(this.p2LivesText);
    this.hudContainer.addChild(this.scoreText);
    this.hudContainer.addChild(this.bossNameText);
  }

  /** Everything that never changes is drawn exactly once in world space. */
  private bakeStaticScenery(): void {
    buildSky(this.skyGfx, this.viewportW, this.viewportH);

    const horizonY = this.viewportH - 28;
    buildMountains(this.mtnFarGfx, 'far', horizonY);
    buildMountains(this.mtnMidGfx, 'mid', horizonY);
    buildMountains(this.mtnNearGfx, 'near', horizonY);

    const span = (factor: number) => this.level.width * factor + this.viewportW;
    buildSkyline(this.skylineGfx, span(0.32), this.viewportH - 34);
    buildTreeLine(this.treeLineGfx, span(0.78), this.level.groundY + 1);

    buildGround(this.groundGfx, this.level);
    buildGroundFeatures(this.groundGfx, this.level);
    buildPlatforms(this.platformGfx, this.level);
    buildEnvironment(this.envGfx, this.level);
  }

  start(): void {
    if (this._state !== 'Ready') return;
    this._state = 'Playing';
    if (!this.musicStarted) {
      this.ctx.audio.startMusic(0.7);
      this.musicStarted = true;
    }
  }

  update(dt: number): void {
    if (this._state !== 'Playing') return;

    this.time += dt;

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
      }
    }

    this.updateInput(dt);
    this.updatePlayers(dt);
    this.updateEnemies(dt);
    this.updatePowerUps(dt);
    this.updateProjectiles(dt);
    this.updateExplosions(dt);
    this.updateCamera();
    this.constrainPlayersToView(dt);
    this.updateParticles(dt);
    this.checkWinLose();
    this.render();
  }

  pause(): void {
    if (this._state !== 'Playing') return;
    this._state = 'Paused';
  }

  resume(): void {
    if (this._state !== 'Paused') return;
    this._state = 'Playing';
  }

  destroy(): void {
    this.ctx.audio.stopAllLoops();
    this.musicStarted = false;
    this.players = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.explosions = [];
    this._state = 'Destroyed';
  }

  // ── Player ────────────────────────────────────────────────

  private createPlayer(playerId: number, color: string, characterId: string, x: number, y: number): PlayerState {
    const charDef = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
    return {
      playerId,
      color,
      characterId,
      x,
      y,
      vx: 0,
      vy: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      health: PLAYER_MAX_HP,
      maxHealth: PLAYER_MAX_HP,
      lives: MAX_LIVES,
      isOnGround: false,
      isShooting: false,
      shootCooldown: 0,
      facingRight: true,
      aimDirection: 'straight',
      isCrouching: false,
      weaponType: charDef.weaponType,
      powerUpTimer: 0,
      isDead: false,
      deathTimer: 0,
      invincibleTimer: 0,
      animFrame: 0,
      animTimer: 0,
      score: 0,
    };
  }

  private updateInput(_dt: number): void {
    for (const player of this.players) {
      if (player.isDead) {
        player.vx = 0;
        player.isShooting = false;
        continue;
      }

      const input = this.ctx.input.getPlayer(player.playerId);
      const charDef = CHARACTERS.find((c) => c.id === player.characterId) || CHARACTERS[0];

      let moveX = 0;
      let moveY = 0;
      if (input.isActive('moveLeft')) moveX -= 1;
      if (input.isActive('moveRight')) moveX += 1;
      if (input.isActive('moveUp')) moveY -= 1;
      if (input.isActive('moveDown')) moveY += 1;

      if (moveX > 0) player.facingRight = true;
      else if (moveX < 0) player.facingRight = false;

      // Crouching logic (down pressed on ground while stationary horizontally)
      const crouching = moveY > 0 && player.isOnGround && moveX === 0;
      player.isCrouching = crouching;
      player.height = crouching ? 16 : PLAYER_HEIGHT;

      // 8-Way Aiming calculation
      if (moveY < 0 && moveX !== 0) {
        player.aimDirection = 'diagonal_up';
      } else if (moveY < 0) {
        player.aimDirection = 'up';
      } else if (moveY > 0 && !player.isOnGround && moveX !== 0) {
        player.aimDirection = 'diagonal_down';
      } else if (moveY > 0 && !player.isOnGround) {
        player.aimDirection = 'down';
      } else if (moveY > 0 && moveX !== 0) {
        player.aimDirection = 'diagonal_down';
      } else {
        player.aimDirection = 'straight';
      }

      // Horizontal movement
      if (crouching) {
        player.vx = 0;
      } else {
        player.vx = moveX * PLAYER_SPEED * charDef.moveSpeedMultiplier;
      }

      // Jump
      if (input.isJustPressed('jump') && player.isOnGround && !crouching) {
        player.vy = JUMP_VELOCITY;
        player.isOnGround = false;
        this.spawnDustPuff(player.x + player.width / 2, player.y + player.height);
        this.ctx.audio.playTone(300, 'sine', 0.06, 'sfx', 0.08);
      }

      // Shooting trigger
      let fireRate = charDef.fireRate;
      if (player.activePowerUp === 'machinegun') fireRate *= 0.5;

      if (input.isActive('shoot') && player.shootCooldown <= 0) {
        player.isShooting = true;
        player.shootCooldown = fireRate;
        this.firePlayerWeapon(player, charDef);
      } else if (!input.isActive('shoot')) {
        player.isShooting = false;
      }
    }
  }

  private updatePlayers(dt: number): void {
    for (const player of this.players) {
      if (player.isDead) {
        player.deathTimer -= dt;
        if (player.deathTimer <= 0 && player.lives > 0) {
          this.respawnPlayer(player);
        }
        continue;
      }

      // Timers
      player.shootCooldown = Math.max(0, player.shootCooldown - dt);
      player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);

      if (player.powerUpTimer > 0) {
        player.powerUpTimer -= dt;
        if (player.powerUpTimer <= 0) {
          player.activePowerUp = undefined;
        }
      }

      // Animation
      if (Math.abs(player.vx) > 10) {
        player.animTimer += dt;
        if (player.animTimer > 0.12) {
          player.animTimer = 0;
          player.animFrame = (player.animFrame + 1) % 2;
        }
      } else {
        player.animFrame = 0;
        player.animTimer = 0;
      }

      // Gravity
      player.vy += GRAVITY * dt;
      if (player.vy > 500) player.vy = 500;

      // Move
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Clamp to level
      player.x = Math.max(0, Math.min(this.level.width - player.width, player.x));

      // Ground/platform collision
      this.resolvePlayerCollision(player);

      // Fall out of the world = death
      if (player.y > this.level.height + 60) {
        this.killPlayer(player);
      }
    }
  }

  private resolvePlayerCollision(player: PlayerState): void {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    // Check ground
    if (py + ph > this.level.groundY && player.vy >= 0) {
      player.y = this.level.groundY - ph;
      player.vy = 0;
      player.isOnGround = true;
      return;
    }

    player.isOnGround = false;

    // Check platforms
    for (const plat of this.level.platforms) {
      if (
        px + pw > plat.x &&
        px < plat.x + plat.width &&
        py + ph > plat.y &&
        py + ph <= plat.y + plat.height + 10 &&
        player.vy >= 0
      ) {
        player.y = plat.y - ph;
        player.vy = 0;
        player.isOnGround = true;
        break;
      }
    }
  }

  private killPlayer(player: PlayerState): void {
    if (player.isDead) return;
    player.health = 0;
    player.lives--;
    player.isDead = true;
    player.deathTimer = DEATH_RESPAWN_DELAY;
    player.vy = -80;
    player.vx = 0;

    // Death particles
    for (let i = 0; i < 12; i++) {
      this.spawnParticle(
        player.x + player.width / 2,
        player.y + player.height / 2,
        parseColor(player.color)
      );
    }

    this.ctx.audio.playSweep({
      type: 'sawtooth',
      startFreq: 300,
      endFreq: 50,
      duration: 0.5,
      gain: 0.2,
    });
  }

  /** Co-op respawn: drop back in beside a living team-mate rather than at the level start,
   * so a death never strands one player behind the scroll. */
  private respawnPlayer(player: PlayerState): void {
    const mate = this.players.find((p) => p.playerId !== player.playerId && !p.isDead);

    let x: number;
    let y: number;
    if (mate) {
      x = mate.x + (mate.facingRight ? -26 : 26);
      y = mate.y - 52;
    } else {
      x = this.cameraX + this.viewportW * 0.3;
      y = this.level.groundY - PLAYER_HEIGHT - 70;
    }

    // Always land inside the current view and inside the level
    const minX = Math.max(0, this.cameraX + 12);
    const maxX = Math.min(this.level.width - PLAYER_WIDTH, this.cameraX + this.viewportW - PLAYER_WIDTH - 12);
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(-24, Math.min(y, this.level.groundY - PLAYER_HEIGHT));

    player.health = PLAYER_MAX_HP;
    player.isDead = false;
    player.deathTimer = 0;
    player.invincibleTimer = INVINCIBLE_DURATION;
    player.isCrouching = false;
    player.height = PLAYER_HEIGHT;
    player.isOnGround = false;
    player.x = x;
    player.y = y;
    player.vx = 0;
    player.vy = 40;

    this.spawnDustPuff(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT);
    this.ctx.audio.playArpeggio([400, 600, 800], 0.06, 'square', 0.12);
  }

  private damagePlayer(player: PlayerState, damage: number): void {
    if (player.isDead || player.invincibleTimer > 0) return;
    player.health -= damage;
    player.invincibleTimer = INVINCIBLE_DURATION;

    this.ctx.audio.playSweep({
      type: 'sawtooth',
      startFreq: 400,
      endFreq: 100,
      duration: 0.2,
      gain: 0.15,
    });

    // Knockback
    player.vy = -80;
    player.vx = player.facingRight ? -60 : 60;
    player.isOnGround = false;

    // Hit particles
    for (let i = 0; i < 5; i++) {
      this.spawnParticle(
        player.x + player.width / 2,
        player.y + player.height / 2,
        0xff4444
      );
    }

    if (player.health <= 0) {
      this.killPlayer(player);
    }
  }

  // ── Enemies ───────────────────────────────────────────────

  private spawnLevelEnemies(countMul: number, hpMul: number, bossHpMul: number): void {
    for (const spawn of this.level.enemySpawns) {
      let count = 1;
      if (spawn.type === 'soldier') {
        count = Math.max(1, Math.round(countMul));
      }
      for (let i = 0; i < count; i++) {
        const offsetX = i > 0 ? 40 * i : 0;
        this.enemies.push(this.createEnemy(spawn, offsetX, hpMul, bossHpMul));
      }
    }
  }

  private createEnemy(spawn: { type: EnemyType; x: number; y: number; patrolLeft?: number; patrolRight?: number }, offsetX: number, hpMul: number, bossHpMul: number): EnemyState {
    const id = this.nextEnemyId++;
    let width = 12;
    let height = 24;
    let maxHp = 1;
    let cooldown = ENEMY_SHOOT_COOLDOWN_SOLDIER;

    if (spawn.type === 'turret') {
      width = 12;
      height = 18;
      maxHp = 2;
      cooldown = ENEMY_SHOOT_COOLDOWN_TURRET;
    } else if (spawn.type === 'boss') {
      width = 24;
      height = 36;
      maxHp = 15 * bossHpMul;
      cooldown = ENEMY_SHOOT_COOLDOWN_BOSS;
    }

    maxHp = Math.round(maxHp * (spawn.type === 'boss' ? 1 : hpMul));

    return {
      id,
      type: spawn.type,
      x: spawn.x + offsetX,
      y: spawn.y,
      vx: 0,
      vy: 0,
      width,
      height,
      health: maxHp,
      maxHealth: maxHp,
      isOnGround: false,
      facingRight: false,
      shootTimer: Math.random() * cooldown,
      shootCooldown: cooldown,
      patrolLeft: spawn.patrolLeft,
      patrolRight: spawn.patrolRight,
      isDead: false,
      deathTimer: 0,
      behaviorTimer: 0,
    };
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.isDead) {
        enemy.deathTimer -= dt;
        continue;
      }

      enemy.shootTimer -= dt;
      enemy.behaviorTimer += dt;

      if (enemy.type === 'soldier') {
        this.updateSoldierAI(enemy, dt);
      } else if (enemy.type === 'turret') {
        this.updateTurretAI(enemy);
      } else if (enemy.type === 'boss') {
        this.updateBossAI(enemy);
      }

      // Gravity and ground
      if (enemy.type !== 'turret') {
        enemy.vy += GRAVITY * dt;
        if (enemy.vy > 500) enemy.vy = 500;
        enemy.y += enemy.vy * dt;

        if (enemy.y + enemy.height > this.level.groundY) {
          enemy.y = this.level.groundY - enemy.height;
          enemy.vy = 0;
          enemy.isOnGround = true;
        }
      }
    }

    // Clean up dead enemies
    this.enemies = this.enemies.filter((e) => !(e.isDead && e.deathTimer <= -1.5));
  }

  private updateSoldierAI(enemy: EnemyState, dt: number): void {
    if (!enemy.isOnGround) return;

    // Patrol
    if (enemy.patrolLeft !== undefined && enemy.patrolRight !== undefined) {
      if (enemy.x <= enemy.patrolLeft) {
        enemy.facingRight = true;
      } else if (enemy.x >= enemy.patrolRight - enemy.width) {
        enemy.facingRight = false;
      }
      enemy.vx = enemy.facingRight ? ENEMY_SPEED : -ENEMY_SPEED;
      enemy.x += enemy.vx * dt;
    }

    // Shoot at nearest alive player
    this.tryShootAtPlayer(enemy);
  }

  private updateTurretAI(enemy: EnemyState): void {
    // Track the nearest player even between shots so the barrel reads as aimed
    const nearest = this.findNearestAlivePlayer(enemy.x, enemy.y);
    if (nearest) enemy.facingRight = nearest.x > enemy.x;
    this.tryShootAtPlayer(enemy);
  }

  private updateBossAI(enemy: EnemyState): void {
    if (!enemy.isOnGround) return;

    // Oscillate gently around the arena centre
    const baseX = 2200;
    const amp = 40;
    enemy.x = baseX + Math.sin(enemy.behaviorTimer * 1.5) * amp;

    // Face nearest player
    const nearest = this.findNearestAlivePlayer(enemy.x, enemy.y);
    if (nearest) {
      enemy.facingRight = nearest.x > enemy.x;
    }

    // Boss shoots in bursts
    if (enemy.shootTimer <= 0) {
      enemy.shootTimer = enemy.shootCooldown;
      this.spawnBossAttack(enemy);
    }
  }

  private tryShootAtPlayer(enemy: EnemyState): void {
    if (enemy.shootTimer > 0) return;

    const nearest = this.findNearestAlivePlayer(enemy.x, enemy.y);
    if (!nearest) return;

    // Only shoot if player is within ~400px
    const dx = nearest.x - enemy.x;
    if (Math.abs(dx) > 400) return;

    enemy.shootTimer = enemy.shootCooldown;
    enemy.facingRight = dx > 0;

    const angle = Math.atan2(
      (nearest.y + nearest.height / 2) - (enemy.y + enemy.height / 2),
      dx
    );

    this.spawnEnemyBullet(
      enemy.x + enemy.width / 2,
      enemy.y + enemy.height / 2 - 4,
      Math.cos(angle) * ENEMY_BULLET_SPEED,
      Math.sin(angle) * ENEMY_BULLET_SPEED,
      enemy.type === 'boss' ? 2 : 1,
      enemy.type === 'boss'
    );

    if (enemy.type === 'boss') {
      this.ctx.audio.playNoiseBurst({ duration: 0.12, gain: 0.12 });
    } else {
      this.ctx.audio.playTone(440, 'square', 0.06, 'sfx', 0.06);
    }
  }

  private spawnBossAttack(boss: EnemyState): void {
    this.ctx.audio.playNoiseBurst({ duration: 0.12, gain: 0.12 });

    const spawnX = boss.x + boss.width / 2;
    const spawnY = boss.y + boss.height / 2 - 4;

    // Fan the spread toward whoever it is facing instead of always firing left
    const target = this.findNearestAlivePlayer(boss.x, boss.y);
    const baseAngle = target
      ? Math.atan2((target.y + target.height / 2) - spawnY, (target.x + target.width / 2) - spawnX)
      : (boss.facingRight ? 0 : Math.PI);

    for (const offset of [-0.3, -0.15, 0, 0.15, 0.3]) {
      const a = baseAngle + offset;
      this.spawnEnemyBullet(
        spawnX,
        spawnY,
        Math.cos(a) * ENEMY_BULLET_SPEED * 1.2,
        Math.sin(a) * ENEMY_BULLET_SPEED * 1.2,
        1,
        true
      );
    }
  }

  private findNearestAlivePlayer(ex: number, ey: number): PlayerState | null {
    let nearest: PlayerState | null = null;
    let minDist = Infinity;
    for (const p of this.players) {
      if (p.isDead) continue;
      const dx = p.x + p.width / 2 - ex;
      const dy = p.y + p.height / 2 - ey;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    return nearest;
  }

  private damageEnemy(enemy: EnemyState, damage: number, fromPlayer: PlayerState): void {
    if (enemy.isDead) return;
    enemy.health -= damage;

    // Hit particles
    for (let i = 0; i < 4; i++) {
      this.spawnParticle(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        0xffaa44
      );
    }

    if (enemy.health <= 0) {
      this.killEnemy(enemy, fromPlayer);
    } else {
      if (enemy.type === 'boss') {
        this.ctx.audio.playNoiseBurst({ duration: 0.1, gain: 0.15 });
      } else {
        this.ctx.audio.playTone(220, 'sawtooth', 0.08, 'sfx', 0.1);
      }
    }
  }

  private killEnemy(enemy: EnemyState, fromPlayer: PlayerState): void {
    enemy.isDead = true;
    enemy.deathTimer = 0;
    enemy.vx = 0;
    enemy.vy = -30;

    // Score
    const points = enemy.type === 'boss' ? 5000 : enemy.type === 'turret' ? 300 : 100;
    fromPlayer.score += points;
    this.score += points;

    // Death particles
    const count = enemy.type === 'boss' ? 20 : 10;
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        enemy.type === 'boss' ? 0xff4444 : 0xff8844
      );
    }

    if (enemy.type === 'boss') {
      this.spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 30);
      this.triggerScreenShake(5, 0.4);
      this.ctx.audio.playArpeggio([200, 300, 400, 600], 0.1, 'square', 0.15);
      this.ctx.audio.playNoiseBurst({ duration: 0.3, filterFreq: 300, filterFreqEnd: 50, gain: 0.2 });
    } else {
      // Chance to drop a powerup on non-boss kill
      if (Math.random() < 0.35) {
        this.spawnPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      }
      this.ctx.audio.playNoiseBurst({ duration: 0.2, filterFreq: 800, filterFreqEnd: 200, gain: 0.12 });
    }
  }

  // ── Weapons & Shooting Logic ───────────────────────────────────────────

  private firePlayerWeapon(player: PlayerState, charDef: typeof CHARACTERS[0]): void {
    const aim = player.aimDirection || 'straight';
    const facingRight = player.facingRight;
    const speed = BULLET_SPEED * charDef.bulletSpeedMultiplier;
    const isCrouch = player.isCrouching && player.isOnGround;
    const yShift = isCrouch ? 6 : 0;

    let vx = facingRight ? speed : -speed;
    let vy = 0;
    let spawnX = player.x + (facingRight ? player.width + 2 : -8);
    let spawnY = player.y + yShift + 6;

    if (aim === 'up') {
      vx = 0;
      vy = -speed;
      spawnX = player.x + (facingRight ? 10 : 2);
      spawnY = player.y + yShift - 8;
    } else if (aim === 'down') {
      vx = 0;
      vy = speed;
      spawnX = player.x + (facingRight ? 10 : 2);
      spawnY = player.y + yShift + 22;
    } else if (aim === 'diagonal_up') {
      vx = (facingRight ? 1 : -1) * speed * 0.707;
      vy = -speed * 0.707;
      spawnX = player.x + (facingRight ? 16 : -4);
      spawnY = player.y + yShift - 4;
    } else if (aim === 'diagonal_down') {
      vx = (facingRight ? 1 : -1) * speed * 0.707;
      vy = speed * 0.707;
      spawnX = player.x + (facingRight ? 16 : -4);
      spawnY = player.y + yShift + 16;
    }

    // Eject brass casing
    this.spawnShellCasing(player.x + (facingRight ? 4 : 12), player.y + yShift + 6, facingRight);

    const activePup = player.activePowerUp;
    const wtype = activePup ? (activePup === 'spread' ? 'spread_shotgun' : activePup === 'laser' ? 'plasma_beam' : player.weaponType) : player.weaponType;

    if (wtype === 'spread_shotgun' || activePup === 'spread') {
      // 5-pellet cone spread
      const angles = [-0.25, -0.12, 0, 0.12, 0.25];
      const baseAngle = Math.atan2(vy, vx);
      for (const a of angles) {
        const finalAngle = baseAngle + a;
        this.projectiles.push({
          x: spawnX,
          y: spawnY,
          vx: Math.cos(finalAngle) * speed,
          vy: Math.sin(finalAngle) * speed,
          width: 3,
          height: 3,
          damage: 1 * charDef.damageMultiplier,
          fromPlayer: true,
          playerId: player.playerId,
          weaponType: 'spread_shotgun',
          alive: true,
        });
      }
      this.ctx.audio.playTone(650, 'square', 0.07, 'sfx', 0.08);
    } else if (wtype === 'heavy_cannon') {
      // Heavy high-damage slug with recoil screen shake
      this.projectiles.push({
        x: spawnX,
        y: spawnY - 2,
        vx,
        vy,
        width: 8,
        height: 4,
        damage: 2.5 * charDef.damageMultiplier,
        fromPlayer: true,
        playerId: player.playerId,
        weaponType: 'heavy_cannon',
        alive: true,
      });
      this.triggerScreenShake(2.5, 0.15);
      this.ctx.audio.playNoiseBurst({ duration: 0.1, filterFreq: 400, filterFreqEnd: 100, gain: 0.15 });
    } else if (wtype === 'grenade_launcher') {
      // Explosive arcing grenade shell
      this.projectiles.push({
        x: spawnX,
        y: spawnY - 2,
        vx: vx * 0.85,
        vy: vy === 0 ? -90 : vy * 0.85,
        width: 5,
        height: 5,
        damage: 2.0 * charDef.damageMultiplier,
        fromPlayer: true,
        playerId: player.playerId,
        weaponType: 'grenade_launcher',
        isExplosive: true,
        explosionRadius: 32,
        gravityEffect: 350,
        alive: true,
      });
      this.ctx.audio.playSweep({ type: 'sawtooth', startFreq: 300, endFreq: 120, duration: 0.15, gain: 0.12 });
    } else if (wtype === 'plasma_beam') {
      // Fast piercing energy beam
      this.projectiles.push({
        x: spawnX,
        y: spawnY,
        vx: vx * 1.3,
        vy: vy * 1.3,
        width: 10,
        height: 3,
        damage: 1.5 * charDef.damageMultiplier,
        fromPlayer: true,
        playerId: player.playerId,
        weaponType: 'plasma_beam',
        isPiercing: true,
        alive: true,
      });
      this.ctx.audio.playTone(1100, 'sine', 0.06, 'sfx', 0.08);
    } else if (wtype === 'dual_smg') {
      // Dual offset rapid fire
      this.projectiles.push({
        x: spawnX,
        y: spawnY - 1,
        vx,
        vy,
        width: 4,
        height: 2,
        damage: 0.8 * charDef.damageMultiplier,
        fromPlayer: true,
        playerId: player.playerId,
        weaponType: 'dual_smg',
        alive: true,
      });
      this.ctx.audio.playTone(950, 'square', 0.04, 'sfx', 0.05);
    } else {
      // Standard Assault Rifle burst
      this.projectiles.push({
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        width: 6,
        height: 2,
        damage: 1.0 * charDef.damageMultiplier,
        fromPlayer: true,
        playerId: player.playerId,
        weaponType: 'burst_rifle',
        alive: true,
      });
      this.ctx.audio.playTone(880, 'square', 0.05, 'sfx', 0.06);
    }
  }

  private spawnEnemyBullet(x: number, y: number, vx: number, vy: number, damage: number, isBoss = false): void {
    this.projectiles.push({
      x,
      y,
      vx,
      vy,
      width: isBoss ? 6 : 4,
      height: isBoss ? 6 : 4,
      damage,
      fromPlayer: false,
      fromBoss: isBoss,
      alive: true,
    });
  }

  private triggerScreenShake(intensity: number, duration = 0.2): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private updateProjectiles(dt: number): void {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;

      // Apply projectile gravity if defined (e.g. Grenade launcher)
      if (proj.gravityEffect) {
        proj.vy += proj.gravityEffect * dt;
      }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      // Off-screen check
      if (
        proj.x < this.cameraX - 60 ||
        proj.x > this.cameraX + this.viewportW + 60 ||
        proj.y < -60 ||
        proj.y > this.viewportH + 60
      ) {
        proj.alive = false;
        continue;
      }

      // Collision check
      if (proj.fromPlayer) {
        const shooter = this.players.find((p) => p.playerId === proj.playerId);
        // Player bullet vs enemies
        for (const enemy of this.enemies) {
          if (enemy.isDead) continue;
          if (this.rectsOverlap(proj, enemy)) {
            if (!proj.isPiercing) {
              proj.alive = false;
            }

            if (proj.isExplosive) {
              this.createExplosionAt(proj.x, proj.y, proj.explosionRadius || 28, proj.damage, shooter);
            } else if (shooter) {
              this.damageEnemy(enemy, proj.damage, shooter);
            }
            break;
          }
        }
      } else {
        // Enemy bullet vs players
        for (const player of this.players) {
          if (player.isDead || player.invincibleTimer > 0) continue;
          if (this.rectsOverlap(proj, player)) {
            proj.alive = false;
            this.damagePlayer(player, proj.damage);
            break;
          }
        }
      }

      // Ground or Platform collision
      if (proj.y + proj.height > this.level.groundY) {
        proj.alive = false;
        if (proj.isExplosive) {
          this.createExplosionAt(
            proj.x,
            this.level.groundY - 2,
            proj.explosionRadius || 28,
            proj.damage,
            this.players.find((p) => p.playerId === proj.playerId),
          );
        }
      }
      for (const plat of this.level.platforms) {
        if (this.rectOverlapsRect(proj.x, proj.y, proj.width, proj.height, plat.x, plat.y, plat.width, plat.height)) {
          proj.alive = false;
          if (proj.isExplosive) {
            this.createExplosionAt(
              proj.x,
              proj.y,
              proj.explosionRadius || 28,
              proj.damage,
              this.players.find((p) => p.playerId === proj.playerId),
            );
          }
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private createExplosionAt(x: number, y: number, radius: number, damage: number, source?: PlayerState): void {
    this.triggerScreenShake(4, 0.25);
    this.spawnExplosion(x, y, radius);

    // Visual particles
    for (let i = 0; i < 15; i++) {
      this.spawnParticle(x, y, 0xffaa22);
    }
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() * 12 - 6),
        y: y + (Math.random() * 12 - 6),
        vx: Math.random() * 20 - 10,
        vy: -12 - Math.random() * 18,
        life: 0.7,
        maxLife: 0.7,
        color: 0x555566,
        type: 'smoke',
        alive: true,
      });
    }

    // Area damage to nearby enemies, credited to whoever fired
    const credit = source || this.players.find((p) => !p.isDead) || this.players[0];
    if (credit) {
      for (const enemy of this.enemies) {
        if (enemy.isDead) continue;
        const dx = enemy.x + enemy.width / 2 - x;
        const dy = enemy.y + enemy.height / 2 - y;
        if (dx * dx + dy * dy <= radius * radius) {
          this.damageEnemy(enemy, damage, credit);
        }
      }
    }
    this.ctx.audio.playNoiseBurst({ duration: 0.25, filterFreq: 500, filterFreqEnd: 80, gain: 0.2 });
  }

  private spawnExplosion(x: number, y: number, radius: number): void {
    this.explosions.push({
      x,
      y,
      radius,
      timer: EXPLOSION_DURATION,
      maxTime: EXPLOSION_DURATION,
      seed: Math.random() * Math.PI * 2,
    });
  }

  private updateExplosions(dt: number): void {
    if (this.explosions.length === 0) return;
    for (const ex of this.explosions) ex.timer -= dt;
    this.explosions = this.explosions.filter((ex) => ex.timer > 0);
  }

  // ── Power-Ups & Particle Helpers ─────────────────────────────────────────

  private spawnPowerUp(x: number, y: number): void {
    const types: PowerUpType[] = ['spread', 'laser', 'machinegun', 'shield'];
    const ptype = types[Math.floor(Math.random() * types.length)];
    this.powerUps.push({
      id: this.nextPowerUpId++,
      type: ptype,
      x,
      y,
      vy: 20,
      alive: true,
    });
  }

  private updatePowerUps(dt: number): void {
    for (const pup of this.powerUps) {
      if (!pup.alive) continue;
      pup.y += pup.vy * dt;

      // Rest on a platform if one is directly underneath, otherwise on the ground
      if (pup.vy > 0) {
        for (const plat of this.level.platforms) {
          if (
            pup.x + 12 > plat.x && pup.x < plat.x + plat.width &&
            pup.y + 12 > plat.y && pup.y + 12 <= plat.y + plat.height + 6
          ) {
            pup.y = plat.y - 12;
            pup.vy = 0;
            break;
          }
        }
      }
      if (pup.y + 12 > this.level.groundY) {
        pup.y = this.level.groundY - 12;
        pup.vy = 0;
      }

      // Check collision with players
      for (const p of this.players) {
        if (p.isDead) continue;
        if (this.rectOverlapsRect(p.x, p.y, p.width, p.height, pup.x, pup.y, 12, 12)) {
          pup.alive = false;
          if (pup.type === 'shield') {
            p.health = Math.min(p.maxHealth, p.health + 1);
          } else {
            p.activePowerUp = pup.type;
            p.powerUpTimer = 12.0;
          }
          this.ctx.audio.playArpeggio([500, 700, 900], 0.08, 'square', 0.15);
          break;
        }
      }
    }
    this.powerUps = this.powerUps.filter((p) => p.alive);
  }

  private spawnShellCasing(x: number, y: number, facingRight: boolean): void {
    const angle = facingRight ? -Math.PI * 0.75 : -Math.PI * 0.25;
    const speed = 40 + Math.random() * 30;
    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6,
      maxLife: 0.6,
      color: 0xffdd44,
      type: 'shell',
      alive: true,
    });
  }

  private spawnDustPuff(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y - 2,
        vx: (Math.random() * 40 - 20),
        vy: -10 - Math.random() * 15,
        life: 0.35,
        maxLife: 0.35,
        color: 0xa7a9be,
        type: 'dust',
        alive: true,
      });
    }
  }

  // ── Camera ────────────────────────────────────────────────

  /** The screen follows whichever player is furthest ahead, and only ever moves forward.
   * Either player can therefore push the level on alone. */
  private updateCamera(): void {
    const alivePlayers = this.players.filter((p) => !p.isDead);
    if (alivePlayers.length > 0) {
      let lead = -Infinity;
      for (const p of alivePlayers) lead = Math.max(lead, p.x + p.width / 2);
      const target = lead - CAMERA_LEAD_MARGIN;
      if (target > this.cameraX) this.cameraX = target;
    }

    this.cameraX = Math.max(0, Math.min(this.level.width - this.viewportW, this.cameraX));
  }

  /** Nobody is ever allowed off-screen: a player who lags behind is carried along by the
   * left edge instead of vanishing (which used to leave both players outside the view). */
  private constrainPlayersToView(dt: number): void {
    const left = this.cameraX + VIEW_EDGE_PAD;

    for (const player of this.players) {
      if (player.isDead) {
        this.pinnedEdge.set(player.playerId, null);
        continue;
      }
      const right = this.cameraX + this.viewportW - player.width - VIEW_EDGE_PAD;
      let edge: 'left' | 'right' | null = null;

      if (player.x < left) {
        player.x = left;
        if (player.vx < 0) player.vx = 0;
        edge = 'left';
      } else if (player.x > right) {
        player.x = right;
        if (player.vx > 0) player.vx = 0;
        edge = 'right';
      }

      // Keep the walk cycle running while the edge carries them, so a dragged
      // player does not slide along with frozen legs.
      if (edge && player.isOnGround) {
        player.animTimer += dt;
        if (player.animTimer > 0.12) {
          player.animTimer = 0;
          player.animFrame = (player.animFrame + 1) % 2;
        }
      }

      this.pinnedEdge.set(player.playerId, edge);
    }
  }

  // ── Particles ─────────────────────────────────────────────

  private spawnParticle(x: number, y: number, color: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: PARTICLE_MAX_LIFE,
      maxLife: PARTICLE_MAX_LIFE,
      color,
      alive: true,
    });
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.type === 'smoke' ? -20 : 100) * dt;
      if (p.life <= 0) p.alive = false;
    }
    this.particles = this.particles.filter((p) => p.alive);
  }

  // ── Win/Lose ──────────────────────────────────────────────

  private checkWinLose(): void {
    if (this.gameOver) return;

    // All players dead and out of lives?
    const allDead = this.players.every((p) => p.isDead && p.lives <= 0);
    if (allDead) {
      this.gameOver = true;
      this.ctx.audio.stopAllLoops();
      this.ctx.events.emit('game:over', {
        winnerId: 0,
        isTeamLoss: true,
        standings: this.players.map((p) => ({
          playerId: p.playerId,
          score: p.score,
        })),
      });
      return;
    }

    // Boss killed?
    const bossDead = this.enemies.every(
      (e) => e.type !== 'boss' || (e.isDead && e.deathTimer <= -0.5)
    );
    if (bossDead) {
      this.gameOver = true;
      this.ctx.audio.stopAllLoops();
      const survivor = this.players.find((p) => !p.isDead) || this.players[0];
      this.ctx.events.emit('game:over', {
        winnerId: survivor.playerId,
        isTeamVictory: true,
        standings: this.players.map((p) => ({
          playerId: p.playerId,
          score: p.score + 5000,
        })),
      });
    }
  }

  // ── Collision helpers ─────────────────────────────────────

  private rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  private rectOverlapsRect(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // ── Render ────────────────────────────────────────────────

  private render(): void {
    const cx = this.cameraX;
    const time = this.time;

    // ── Screen Shake ──
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity);
      shakeY = Math.round((Math.random() - 0.5) * 2 * this.shakeIntensity);
    }

    // ── Parallax: one offset per layer replaces all per-pixel scroll maths ──
    for (const layer of this.parallaxLayers) {
      layer.container.x = -Math.round(cx * layer.factor) + (layer.shake ? shakeX : 0);
      layer.container.y = layer.shake ? shakeY : 0;
    }

    // ── Animated backdrop bits (everything else is baked) ──
    drawSkyAnim(this.skyAnimGfx, this.viewportW, this.viewportH, time);
    drawClouds(this.cloudGfx, this.level.width * 0.2 + this.viewportW, time);
    drawFog(this.fogGfx, this.level.width * 0.9 + this.viewportW, this.level.groundY, time);
    drawEnvironmentAnim(this.envAnimGfx, this.level, time);

    const biome = biomeAt(this.level, cx + this.viewportW / 2);
    const emberMix = biome === 'arena' ? 0.65 : biome === 'base' ? 0.25 : biome === 'trench' ? 0.15 : 0.05;
    drawWeather(this.weatherGfx, cx, this.viewportW, this.viewportH, time, emberMix);

    // ── Power-Ups
    this.powerUpGfx.clear();
    for (const pup of this.powerUps) {
      drawPowerUp(this.powerUpGfx, pup, time);
    }

    // ── Enemies
    this.entityGfx.clear();
    for (const enemy of this.enemies) {
      if (enemy.x + enemy.width < cx - 40 || enemy.x > cx + this.viewportW + 40) continue;
      if (enemy.type === 'soldier') {
        drawSoldier(this.entityGfx, enemy);
      } else if (enemy.type === 'turret') {
        drawTurret(this.entityGfx, enemy);
      } else if (enemy.type === 'boss') {
        drawBoss(this.entityGfx, enemy);
      }
    }

    // ── Projectiles
    this.projectileGfx.clear();
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      if (proj.fromPlayer) {
        drawPlayerBullet(this.projectileGfx, proj);
      } else if (proj.fromBoss) {
        drawBossBullet(this.projectileGfx, proj);
      } else {
        drawEnemyBullet(this.projectileGfx, proj);
      }
    }

    // ── Particles
    this.particleGfx.clear();
    for (const p of this.particles) {
      drawParticle(this.particleGfx, p);
    }

    // ── Explosions
    this.fxGfx.clear();
    for (const ex of this.explosions) {
      drawExplosion(this.fxGfx, ex);
      drawShockRing(this.fxGfx, ex);
    }

    // ── Players (drawn over enemies on the same graphics)
    for (const player of this.players) {
      drawPlayer(this.entityGfx, player);
    }

    // ── HUD
    this.hudGfx.clear();
    this.renderHUD(time);

    // ── Screen effects (vignette sits under the HUD so it can never cover it)
    const intensity = biome === 'arena' ? 0.45 : biome === 'base' ? 0.3 : 0.18;
    drawVignette(this.effectGfx, this.viewportW, this.viewportH, intensity);
  }

  private renderHUD(time: number): void {
    this.renderPlayerHud(this.players[0], 8, false);
    if (this.playerCount >= 2) {
      this.renderPlayerHud(this.players[1], this.viewportW - 72, true);
    }

    // Edge markers for a partner currently being dragged by the scroll
    if (this.players.length > 1) {
      for (const player of this.players) {
        const edge = this.pinnedEdge.get(player.playerId);
        if (!edge || player.isDead) continue;
        drawTetherEdge(
          this.hudGfx,
          edge,
          player.y,
          player.height,
          this.viewportW,
          parseColor(player.color),
          time,
        );
      }
    }

    this.renderBossHud();

    this.scoreText.text = `${this.score}`;
  }

  private renderPlayerHud(player: PlayerState | undefined, barX: number, rightSide: boolean): void {
    if (!player) return;

    const nameText = rightSide ? this.p2HealthText : this.p1HealthText;
    const livesText = rightSide ? this.p2LivesText : this.p1LivesText;
    const color = parseColor(player.color);
    const barY = 11;
    const barW = 64;

    // Frame first, fill inside it — the old order painted the border over the bar
    this.hudGfx.rect(barX - 1, barY - 1, barW + 2, 7); this.hudGfx.fill(0x0f0e17);
    this.hudGfx.rect(barX, barY, barW, 5); this.hudGfx.fill(0x333344);

    const pct = Math.max(0, player.health / PLAYER_MAX_HP);
    const fillW = Math.round(barW * pct);
    if (fillW > 0) {
      const fx = rightSide ? barX + barW - fillW : barX;
      this.hudGfx.rect(fx, barY, fillW, 5); this.hudGfx.fill(color);
      this.hudGfx.rect(fx, barY, fillW, 1); this.hudGfx.fill(0xffffff);
    }

    // Segment ticks so the three hit points are readable at a glance
    for (let i = 1; i < PLAYER_MAX_HP; i++) {
      this.hudGfx.rect(barX + Math.round((barW / PLAYER_MAX_HP) * i), barY, 1, 5);
      this.hudGfx.fill(0x0f0e17);
    }

    const charDef = CHARACTERS.find((c) => c.id === player.characterId) || CHARACTERS[0];
    nameText.text = `P${player.playerId} ${charDef.name}`;
    nameText.style.fill = color;

    const pup = player.activePowerUp;
    livesText.text = `${'♥'.repeat(Math.max(0, player.lives))}${pup ? `  ${pup.toUpperCase()} ${Math.ceil(player.powerUpTimer)}s` : ''}`;
    livesText.style.fill = pup ? 0xffde7d : 0xff4444;
  }

  private renderBossHud(): void {
    const boss = this.enemies.find((e) => e.type === 'boss' && !e.isDead);
    const onScreen = boss
      && boss.x + boss.width > this.cameraX - 20
      && boss.x < this.cameraX + this.viewportW + 20;

    if (!boss || !onScreen) {
      this.bossNameText.text = '';
      return;
    }

    const barW = 180;
    const barX = Math.round((this.viewportW - barW) / 2);
    const barY = this.viewportH - 9;

    this.hudGfx.rect(barX - 1, barY - 1, barW + 2, 6); this.hudGfx.fill(0x0f0e17);
    this.hudGfx.rect(barX, barY, barW, 4); this.hudGfx.fill(0x331a1a);

    const pct = Math.max(0, boss.health / boss.maxHealth);
    const fillW = Math.round(barW * pct);
    if (fillW > 0) {
      this.hudGfx.rect(barX, barY, fillW, 4); this.hudGfx.fill(0xcc2222);
      this.hudGfx.rect(barX, barY, fillW, 1); this.hudGfx.fill(0xff7766);
    }

    this.bossNameText.text = 'GENERAL VULCAN';
  }
}

function parseColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
