import { Container, Graphics, Text } from 'pixi.js';
import type { GameContext, GameModule, InternalGameState } from '@runtime/types';
import type {
  PlayerState,
  EnemyState,
  Projectile,
  Particle,
  EnemyType,
  LevelData,
} from './types';
import { LEVEL_1 } from './config/level1';
import {
  drawSky,
  drawMountains,
  drawGround,
  drawPlatform,
  drawPlayer,
  drawSoldier,
  drawTurret,
  drawBoss,
  drawPlayerBullet,
  drawEnemyBullet,
  drawBossBullet,
  drawParticle,
} from './rendering';

// ── Constants ─────────────────────────────────────────────────

const GRAVITY = 600;
const PLAYER_SPEED = 120;
const JUMP_VELOCITY = -220;
const PLAYER_WIDTH = 16;
const PLAYER_HEIGHT = 24;
const BULLET_SPEED = 300;
const ENEMY_BULLET_SPEED = 150;
const SHOOT_COOLDOWN = 0.25;
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
  private mountainContainer!: Container;
  private worldContainer!: Container;
  private entityContainer!: Container;
  private projectileContainer!: Container;
  private particleContainer!: Container;
  private hudContainer!: Container;

  // Graphics
  private skyGfx!: Graphics;
  private mountainGfx!: Graphics;
  private groundGfx!: Graphics;
  private worldGfx!: Graphics;
  private entityGfx!: Graphics;
  private projectileGfx!: Graphics;
  private particleGfx!: Graphics;
  private hudGfx!: Graphics;

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
  private cameraX = 0;
  private score = 0;
  private gameOver = false;
  private nextEnemyId = 1;
  private playerCount = 1;
  private musicStarted = false;

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
    this.mountainContainer = new Container();
    this.worldContainer = new Container();
    this.particleContainer = new Container();
    this.entityContainer = new Container();
    this.projectileContainer = new Container();
    this.hudContainer = new Container();

    stage.addChild(this.bgContainer);
    stage.addChild(this.mountainContainer);
    stage.addChild(this.worldContainer);
    stage.addChild(this.particleContainer);
    stage.addChild(this.entityContainer);
    stage.addChild(this.projectileContainer);
    stage.addChild(this.hudContainer);

    this.skyGfx = new Graphics();
    this.mountainGfx = new Graphics();
    this.groundGfx = new Graphics();
    this.worldGfx = new Graphics();
    this.entityGfx = new Graphics();
    this.projectileGfx = new Graphics();
    this.particleGfx = new Graphics();
    this.hudGfx = new Graphics();

    this.bgContainer.addChild(this.skyGfx);
    this.mountainContainer.addChild(this.mountainGfx);
    this.worldContainer.addChild(this.groundGfx);
    this.worldContainer.addChild(this.worldGfx);
    this.entityContainer.addChild(this.entityGfx);
    this.projectileContainer.addChild(this.projectileGfx);
    this.particleContainer.addChild(this.particleGfx);
    this.hudContainer.addChild(this.hudGfx);

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

    this.updateInput(dt);
    this.updatePlayers(dt);
    this.updateEnemies(dt);
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

  private createPlayer(playerId: number, color: string, characterId: string, x: number, y: number): PlayerState {
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

      // Movement
      let moveX = 0;
      if (input.isActive('moveLeft')) moveX -= 1;
      if (input.isActive('moveRight')) moveX += 1;
      player.vx = moveX * PLAYER_SPEED;
      if (moveX > 0) player.facingRight = true;
      else if (moveX < 0) player.facingRight = false;

      // Jump
      if (input.isJustPressed('jump') && player.isOnGround) {
        player.vy = JUMP_VELOCITY;
        player.isOnGround = false;
        this.ctx.audio.playTone(300, 'sine', 0.06, 'sfx', 0.08);
      }

      // Shoot
      if (input.isActive('shoot') && player.shootCooldown <= 0) {
        player.isShooting = true;
        player.shootCooldown = SHOOT_COOLDOWN;
        this.spawnPlayerBullet(player);
        this.ctx.audio.playTone(880, 'square', 0.05, 'sfx', 0.06);
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
      this.ctx.audio.playArpeggio([200, 300, 400, 600], 0.1, 'square', 0.15);
      this.ctx.audio.playNoiseBurst({ duration: 0.3, filterFreq: 300, filterFreqEnd: 50, gain: 0.2 });
    } else {
      this.ctx.audio.playNoiseBurst({ duration: 0.2, filterFreq: 800, filterFreqEnd: 200, gain: 0.12 });
    }
  }

  // ── Projectiles ───────────────────────────────────────────

  private spawnPlayerBullet(player: PlayerState): void {
    const dir = player.facingRight ? 1 : -1;
    const px = player.facingRight ? player.x + player.width : player.x - 6;
    const py = player.y + 7;
    this.projectiles.push({
      x: px,
      y: py,
      vx: dir * BULLET_SPEED,
      vy: 0,
      width: 6,
      height: 2,
      damage: 1,
      fromPlayer: true,
      playerId: player.playerId,
      alive: true,
    });
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

  private updateProjectiles(_dt: number): void {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.x += proj.vx * 0.016;
      proj.y += proj.vy * 0.016;

      // Off-screen check
      if (
        proj.x < this.cameraX - 50 ||
        proj.x > this.cameraX + this.viewportW + 50 ||
        proj.y < -50 ||
        proj.y > this.viewportH + 50
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
            proj.alive = false;
            const shooter = this.players.find((p) => p.playerId === proj.playerId);
            if (shooter) this.damageEnemy(enemy, proj.damage, shooter);
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

      // Hit ground
      if (proj.y + proj.height > this.level.groundY) {
        proj.alive = false;
      }
      // Hit platforms
      for (const plat of this.level.platforms) {
        if (this.rectOverlapsRect(proj.x, proj.y, proj.width, proj.height, plat.x, plat.y, plat.width, plat.height)) {
          proj.alive = false;
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.alive);
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

    // Background
    drawSky(this.skyGfx, this.viewportW, this.viewportH, this.level.skyColor);
    drawMountains(this.mountainGfx, cx, this.viewportW, this.viewportH, this.level.mountainColor);
    drawGround(this.groundGfx, cx, this.level.groundY, this.viewportW, this.viewportH, this.level.groundColor);

    // Platforms
    this.worldGfx.clear();
    for (const plat of this.level.platforms) {
      drawPlatform(this.worldGfx, plat, cx, this.viewportW);
    }

    // Enemies
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

    // Projectiles
    this.projectileGfx.clear();
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      if (proj.fromPlayer) {
        if (proj.width === 6 && proj.height === 2) {
          drawPlayerBullet(this.projectileGfx, proj, cx);
        }
      } else {
        if (proj.width === 4) {
          drawEnemyBullet(this.projectileGfx, proj, cx);
        } else {
          drawBossBullet(this.projectileGfx, proj, cx);
        }
      }
    }

    // Particles
    this.particleGfx.clear();
    for (const p of this.particles) {
      drawParticle(this.particleGfx, p, cx);
    }

    // Players
    for (const player of this.players) {
      drawPlayer(this.entityGfx, player, cx);
    }

    // HUD
    this.hudGfx.clear();
    this.renderHUD();
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

      this.p1HealthText.text = `P1`;
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
