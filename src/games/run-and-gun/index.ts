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
} from './types';
import { LEVEL_1 } from './config/level1';
import { CHARACTERS } from './config/characters';
import { drawSky, drawMountains, drawClouds, drawGround, drawPlatform, drawTree, drawCrate, drawBarrel, drawWarningSign, drawPlayer, drawSoldier, drawTurret, drawBoss, drawPlayerBullet, drawEnemyBullet, drawBossBullet, drawParticle, drawPowerUp, drawVignette } from './rendering';

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
const SCROLL_DEAD_ZONE = 160;
const PARTICLE_MAX_LIFE = 0.5;

export default class RunAndGunGame implements GameModule {
  private _state: InternalGameState = 'Initializing';
  private ctx!: GameContext;

  // Containers
  private bgContainer!: Container;
  private cloudContainer!: Container;
  private mountainContainer!: Container;
  private worldContainer!: Container;
  private envContainer!: Container;
  private entityContainer!: Container;
  private projectileContainer!: Container;
  private powerUpContainer!: Container;
  private particleContainer!: Container;
  private hudContainer!: Container;
  private effectContainer!: Container;

  // Graphics
  private skyGfx!: Graphics;
  private cloudGfx!: Graphics;
  private mountainGfx!: Graphics;
  private groundGfx!: Graphics;
  private worldGfx!: Graphics;
  private envGfx!: Graphics;
  private entityGfx!: Graphics;
  private projectileGfx!: Graphics;
  private powerUpGfx!: Graphics;
  private particleGfx!: Graphics;
  private hudGfx!: Graphics;
  private effectGfx!: Graphics;

  // HUD text
  private p1HealthText!: Text;
  private p2HealthText!: Text;
  private p1LivesText!: Text;
  private p2LivesText!: Text;
  private scoreText!: Text;

  // Game state
  private level: LevelData = LEVEL_1;
  private players: PlayerState[] = [];
  private enemies: EnemyState[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];
  private cameraX = 0;
  private score = 0;
  private gameOver = false;
  private nextEnemyId = 1;
  private nextPowerUpId = 1;
  private playerCount = 1;
  private musicStarted = false;

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

    // Create containers (ordered back-to-front)
    this.bgContainer = new Container();
    this.cloudContainer = new Container();
    this.mountainContainer = new Container();
    this.worldContainer = new Container();
    this.envContainer = new Container();
    this.particleContainer = new Container();
    this.entityContainer = new Container();
    this.powerUpContainer = new Container();
    this.projectileContainer = new Container();
    this.hudContainer = new Container();
    this.effectContainer = new Container();

    stage.addChild(this.bgContainer);
    stage.addChild(this.cloudContainer);
    stage.addChild(this.mountainContainer);
    stage.addChild(this.worldContainer);
    stage.addChild(this.envContainer);
    stage.addChild(this.particleContainer);
    stage.addChild(this.entityContainer);
    stage.addChild(this.powerUpContainer);
    stage.addChild(this.projectileContainer);
    stage.addChild(this.hudContainer);
    stage.addChild(this.effectContainer);

    this.skyGfx = new Graphics();
    this.cloudGfx = new Graphics();
    this.mountainGfx = new Graphics();
    this.groundGfx = new Graphics();
    this.worldGfx = new Graphics();
    this.envGfx = new Graphics();
    this.entityGfx = new Graphics();
    this.powerUpGfx = new Graphics();
    this.projectileGfx = new Graphics();
    this.particleGfx = new Graphics();
    this.hudGfx = new Graphics();
    this.effectGfx = new Graphics();

    this.bgContainer.addChild(this.skyGfx);
    this.cloudContainer.addChild(this.cloudGfx);
    this.mountainContainer.addChild(this.mountainGfx);
    this.worldContainer.addChild(this.groundGfx);
    this.worldContainer.addChild(this.worldGfx);
    this.envContainer.addChild(this.envGfx);
    this.entityContainer.addChild(this.entityGfx);
    this.powerUpContainer.addChild(this.powerUpGfx);
    this.projectileContainer.addChild(this.projectileGfx);
    this.particleContainer.addChild(this.particleGfx);
    this.hudContainer.addChild(this.hudGfx);
    this.effectContainer.addChild(this.effectGfx);

    // HUD text
    this.p1HealthText = new Text({
      text: '',
      style: { fontFamily: 'Press Start 2P', fontSize: 6, fill: 0xffffff },
    });
    this.p2HealthText = new Text({
      text: '',
      style: { fontFamily: 'Press Start 2P', fontSize: 6, fill: 0xffffff },
    });
    this.p1LivesText = new Text({
      text: '',
      style: { fontFamily: 'Pixelify Sans', fontSize: 7, fill: 0xffffff },
    });
    this.p2LivesText = new Text({
      text: '',
      style: { fontFamily: 'Pixelify Sans', fontSize: 7, fill: 0xffffff },
    });
    this.scoreText = new Text({
      text: '',
      style: { fontFamily: 'Press Start 2P', fontSize: 5, fill: 0xffde7d },
    });

    this.p1HealthText.x = 8;
    this.p1HealthText.y = 8;
    this.p2HealthText.x = this.viewportW - 8;
    this.p2HealthText.y = 8;
    this.p1LivesText.x = 8;
    this.p1LivesText.y = 18;
    this.p2LivesText.x = this.viewportW - 8;
    this.p2LivesText.y = 18;
    this.scoreText.x = this.viewportW / 2;
    this.scoreText.y = 8;
    this.scoreText.anchor.set(0.5, 0);

    this.hudContainer.addChild(this.p1HealthText);
    this.hudContainer.addChild(this.p2HealthText);
    this.hudContainer.addChild(this.p1LivesText);
    this.hudContainer.addChild(this.p2LivesText);
    this.hudContainer.addChild(this.scoreText);

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
    this.updateCamera();
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
    this._state = 'Destroyed';
  }

  // ── Player ────────────────────────────────────────────────

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

      // Fall off screen = death
      if (player.y > this.viewportH + 60) {
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

  private respawnPlayer(player: PlayerState): void {
    player.health = PLAYER_MAX_HP;
    player.isDead = false;
    player.deathTimer = 0;
    player.invincibleTimer = INVINCIBLE_DURATION;
    const spawn = this.level.playerSpawns[player.playerId - 1] || this.level.playerSpawns[0];
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
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
        this.updateTurretAI(enemy, dt);
      } else if (enemy.type === 'boss') {
        this.updateBossAI(enemy, dt);
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

      // Off-screen removal (non-boss)
      if (enemy.type !== 'boss' && (enemy.x + enemy.width < this.cameraX - 100 || enemy.x > this.cameraX + this.viewportW + 100)) {
        continue;
      }
    }

    // Clean up dead enemies
    this.enemies = this.enemies.filter((e) => {
      if (e.isDead && e.deathTimer <= -1.5) return false;
      return true;
    });
  }

  private updateSoldierAI(enemy: EnemyState, _dt: number): void {
    if (!enemy.isOnGround) return;

    // Patrol
    if (enemy.patrolLeft !== undefined && enemy.patrolRight !== undefined) {
      if (enemy.x <= enemy.patrolLeft) {
        enemy.facingRight = true;
      } else if (enemy.x >= enemy.patrolRight - enemy.width) {
        enemy.facingRight = false;
      }
      enemy.vx = enemy.facingRight ? ENEMY_SPEED : -ENEMY_SPEED;
      enemy.x += enemy.vx * 0.016;
    }

    // Shoot at nearest alive player
    this.tryShootAtPlayer(enemy);
  }

  private updateTurretAI(enemy: EnemyState, _dt: number): void {
    this.tryShootAtPlayer(enemy);
  }

  private updateBossAI(enemy: EnemyState, _dt: number): void {
    if (!enemy.isOnGround) return;

    // Oscillate gently
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
      enemy.type === 'boss' ? 2 : 1
    );

    if (enemy.type === 'boss') {
      this.ctx.audio.playNoiseBurst({ duration: 0.12, gain: 0.12 });
    } else {
      this.ctx.audio.playTone(440, 'square', 0.06, 'sfx', 0.06);
    }
  }

  private spawnBossAttack(boss: EnemyState): void {
    this.ctx.audio.playNoiseBurst({ duration: 0.12, gain: 0.12 });

    // Spread shot
    const spawnX = boss.x + boss.width / 2;
    const spawnY = boss.y + boss.height / 2 - 4;
    const angles = [-0.3, -0.15, 0, 0.15, 0.3];

    for (const a of angles) {
      this.spawnEnemyBullet(
        spawnX,
        spawnY,
        Math.cos(Math.PI + a) * ENEMY_BULLET_SPEED * 1.2,
        Math.sin(Math.PI + a) * ENEMY_BULLET_SPEED * 1.2,
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
      this.triggerScreenShake(5, 0.4);
      this.ctx.audio.playArpeggio([200, 300, 400, 600], 0.1, 'square', 0.15);
      this.ctx.audio.playNoiseBurst({ duration: 0.3, filterFreq: 300, filterFreqEnd: 50, gain: 0.2 });
    } else {
      // 30% chance to drop a powerup on non-boss kill
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
      alive: true,
    });
  }

  private triggerScreenShake(intensity: number, duration = 0.2): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
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
        // Player bullet vs enemies
        for (const enemy of this.enemies) {
          if (enemy.isDead) continue;
          if (this.rectsOverlap(proj, enemy)) {
            if (!proj.isPiercing) {
              proj.alive = false;
            }

            if (proj.isExplosive) {
              this.createExplosionAt(proj.x, proj.y, proj.explosionRadius || 28, proj.damage);
            } else {
              const shooter = this.players.find((p) => p.playerId === proj.playerId);
              if (shooter) this.damageEnemy(enemy, proj.damage, shooter);
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
          this.createExplosionAt(proj.x, proj.y, proj.explosionRadius || 28, proj.damage);
        }
      }
      for (const plat of this.level.platforms) {
        if (this.rectOverlapsRect(proj.x, proj.y, proj.width, proj.height, plat.x, plat.y, plat.width, plat.height)) {
          proj.alive = false;
          if (proj.isExplosive) {
            this.createExplosionAt(proj.x, proj.y, proj.explosionRadius || 28, proj.damage);
          }
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private createExplosionAt(x: number, y: number, radius: number, damage: number): void {
    this.triggerScreenShake(4, 0.25);
    // Visual particles
    for (let i = 0; i < 15; i++) {
      this.spawnParticle(x, y, 0xffaa22);
    }
    // Area damage to nearby enemies
    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const dx = enemy.x + enemy.width / 2 - x;
      const dy = enemy.y + enemy.height / 2 - y;
      if (dx * dx + dy * dy <= radius * radius) {
        const p1 = this.players[0];
        if (p1) this.damageEnemy(enemy, damage, p1);
      }
    }
    this.ctx.audio.playNoiseBurst({ duration: 0.25, filterFreq: 500, filterFreqEnd: 80, gain: 0.2 });
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

      // Stop on ground
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

  private updateCamera(): void {
    const alivePlayers = this.players.filter((p) => !p.isDead);
    if (alivePlayers.length === 0) return;

    if (alivePlayers.length === 1) {
      const p = alivePlayers[0];
      if (p.x > this.cameraX + SCROLL_DEAD_ZONE) {
        this.cameraX = p.x - SCROLL_DEAD_ZONE;
      }
    } else {
      // 2-player: center between players
      const minX = Math.min(...alivePlayers.map((p) => p.x));
      const maxX = Math.max(...alivePlayers.map((p) => p.x + p.width));
      const centerX = (minX + maxX) / 2;
      this.cameraX = centerX - this.viewportW / 2;
    }

    this.cameraX = Math.max(0, Math.min(this.level.width - this.viewportW, this.cameraX));
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
      p.vy += 100 * dt; // particle gravity
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
      const winnerId = this.players[0].playerId;
      this.ctx.events.emit('game:over', {
        winnerId,
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
    const time = performance.now() / 1000;

    // ── Screen Shake Application ──
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    }

    this.worldContainer.x = shakeX; this.worldContainer.y = shakeY;
    this.envContainer.x = shakeX; this.envContainer.y = shakeY;
    this.entityContainer.x = shakeX; this.entityContainer.y = shakeY;
    this.powerUpContainer.x = shakeX; this.powerUpContainer.y = shakeY;
    this.projectileContainer.x = shakeX; this.projectileContainer.y = shakeY;
    this.particleContainer.x = shakeX; this.particleContainer.y = shakeY;

    // ── Background
    drawSky(this.skyGfx, this.viewportW, this.viewportH);
    drawClouds(this.cloudGfx, cx, this.viewportW, time);
    drawMountains(this.mountainGfx, cx, this.viewportW, this.viewportH);
    drawGround(this.groundGfx, cx, this.level.groundY, this.viewportW, this.viewportH);

    // ── Environment objects
    this.envGfx.clear();
    const env = this.level.environment;
    for (const tree of env.trees) {
      drawTree(this.envGfx, tree.x, tree.groundY, cx, this.viewportW);
    }
    for (const crate of env.crates) {
      drawCrate(this.envGfx, crate.x, crate.y, cx, this.viewportW);
    }
    for (const barrel of env.barrels) {
      drawBarrel(this.envGfx, barrel.x, barrel.y, cx, this.viewportW);
    }
    for (const sign of env.signs) {
      drawWarningSign(this.envGfx, sign.x, sign.y, cx, this.viewportW);
    }

    // ── Platforms
    this.worldGfx.clear();
    for (const plat of this.level.platforms) {
      drawPlatform(this.worldGfx, plat, cx, this.viewportW);
    }

    // ── Power-Ups
    this.powerUpGfx.clear();
    for (const pup of this.powerUps) {
      drawPowerUp(this.powerUpGfx, pup, cx);
    }

    // ── Enemies
    this.entityGfx.clear();
    for (const enemy of this.enemies) {
      if (enemy.x + enemy.width < cx - 40 || enemy.x > cx + this.viewportW + 40) continue;
      if (enemy.type === 'soldier') {
        drawSoldier(this.entityGfx, enemy, cx);
      } else if (enemy.type === 'turret') {
        drawTurret(this.entityGfx, enemy, cx);
      } else if (enemy.type === 'boss') {
        drawBoss(this.entityGfx, enemy, cx);
      }
    }

    // ── Projectiles
    this.projectileGfx.clear();
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      if (proj.fromPlayer) {
        drawPlayerBullet(this.projectileGfx, proj, cx);
      } else if (proj.width === 6) {
        drawBossBullet(this.projectileGfx, proj, cx);
      } else {
        drawEnemyBullet(this.projectileGfx, proj, cx);
      }
    }

    // ── Particles
    this.particleGfx.clear();
    for (const p of this.particles) {
      drawParticle(this.particleGfx, p, cx);
    }

    // ── Players
    for (const player of this.players) {
      drawPlayer(this.entityGfx, player, cx);
    }

    // ── HUD
    this.hudGfx.clear();
    this.renderHUD();

    // ── Screen effects (vignette)
    this.effectGfx.clear();
    const intensity = this.cameraX > 1800 ? 0.3 : 0.1;
    drawVignette(this.effectGfx, this.viewportW, this.viewportH, intensity);
  }

  private renderHUD(): void {
    // Player 1 HUD
    const p1 = this.players[0];
    if (p1) {
      // Health bar background
      this.hudGfx.rect(8, 8, 64, 5);
      this.hudGfx.fill(0x333333);

      // Health bar fill
      const p1HealthPct = Math.max(0, p1.health / PLAYER_MAX_HP);
      this.hudGfx.rect(8, 8, Math.round(64 * p1HealthPct), 5);
      this.hudGfx.fill(parseColor(p1.color));

      // Health bar border
      this.hudGfx.rect(8, 8, 64, 1); this.hudGfx.fill(0xffffff);
      this.hudGfx.rect(8, 12, 64, 1); this.hudGfx.fill(0xffffff);

      const charDef = CHARACTERS.find((c) => c.id === p1.characterId) || CHARACTERS[0];
      const activePup = p1.activePowerUp ? ` [${p1.activePowerUp.toUpperCase()}]` : ``;
      this.p1HealthText.text = `P1 ${charDef.name.toUpperCase()}${activePup}`;
      this.p1HealthText.style.fill = parseColor(p1.color);
      this.p1HealthText.x = 8;
      this.p1HealthText.y = 2;

      // Lives
      this.p1LivesText.text = '♥'.repeat(p1.lives);
      this.p1LivesText.style.fill = 0xff4444;
      this.p1LivesText.x = 8;
      this.p1LivesText.y = 16;
    }

    // Player 2 HUD
    if (this.playerCount >= 2) {
      const p2 = this.players[1];
      if (p2) {
        const barX = this.viewportW - 72;

        this.hudGfx.rect(barX, 8, 64, 5);
        this.hudGfx.fill(0x333333);

        const p2HealthPct = Math.max(0, p2.health / PLAYER_MAX_HP);
        const fillW = Math.round(64 * p2HealthPct);
        this.hudGfx.rect(barX + 64 - fillW, 8, fillW, 5);
        this.hudGfx.fill(parseColor(p2.color));

        this.hudGfx.rect(barX, 8, 64, 1); this.hudGfx.fill(0xffffff);
        this.hudGfx.rect(barX, 12, 64, 1); this.hudGfx.fill(0xffffff);

        this.p2HealthText.text = `P2`;
        this.p2HealthText.style.fill = parseColor(p2.color);
        this.p2HealthText.x = barX;
        this.p2HealthText.y = 2;

        this.p2LivesText.text = '♥'.repeat(p2.lives);
        this.p2LivesText.style.fill = 0xff4444;
        this.p2LivesText.x = barX;
        this.p2LivesText.y = 16;
      }
    }

    // Score
    this.scoreText.text = `${this.score}`;
  }
}

function parseColor(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
