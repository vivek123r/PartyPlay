import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import { Hero } from './entities/Hero';
import { Enemy } from './entities/Enemy';
import { BossMinotaur } from './entities/BossMinotaur';
import { Projectile } from './entities/Projectile';
import { Loot } from './entities/Loot';
import { DungeonArena } from './systems/DungeonArena';
import { CombatEngine } from './systems/CombatEngine';
import { SynergySystem } from './systems/SynergySystem';
import { HUDManager } from './systems/HUDManager';
import { CharacterSelectScreen } from './screens/CharacterSelectScreen';
import { ARENA_CONFIG } from './config';

export default class DungeonBrawlGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private gameContainer!: Container;
  private graphics!: Graphics;

  private heroes: Hero[] = [];
  private enemies: Enemy[] = [];
  private boss: BossMinotaur | null = null;
  private projectiles: Projectile[] = [];
  private loots: Loot[] = [];

  private arena = new DungeonArena();
  private combat = new CombatEngine();
  private synergy = new SynergySystem();
  private hud = new HUDManager();
  private charSelect = new CharacterSelectScreen();

  private isSelectPhase = true;
  private waveNum = 1;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing DUNGEON BRAWL: PHANTOM CLASH...');

    const { stage } = this.ctx.renderer;
    this.gameContainer = new Container();
    this.graphics = new Graphics();

    this.gameContainer.addChild(this.graphics);
    this.gameContainer.addChild(this.charSelect.container);
    stage.addChild(this.gameContainer);

    this.state = 'Ready';
  }

  public start(): void {
    this.state = 'Playing';
    this.ctx.logger.info('DUNGEON BRAWL Started!');
  }

  private startBattlePhase(): void {
    this.isSelectPhase = false;
    this.charSelect.container.visible = false;

    const count = Math.min(4, Math.max(2, this.ctx.players.length));
    const startPositions = [
      { x: 120, y: 120 },
      { x: 360, y: 120 },
      { x: 120, y: 200 },
      { x: 360, y: 200 },
    ];

    this.heroes = this.ctx.players.slice(0, count).map((p, idx) => {
      const classType = this.charSelect.selections[idx + 1]?.classType || 'knight';
      const pos = startPositions[idx];
      return new Hero(p.id, classType, pos.x, pos.y);
    });

    this.spawnWave(1);
  }

  private spawnWave(wave: number): void {
    this.waveNum = wave;
    this.enemies = [];

    if (wave === 5) {
      // Wave 5: Minotaur Boss Fight!
      this.boss = new BossMinotaur(ARENA_CONFIG.width / 2, 80);
    } else {
      const count = wave * 4 + this.heroes.length * 2;
      for (let i = 0; i < count; i++) {
        const type = i % 3 === 0 ? 'skeleton' : i % 3 === 1 ? 'goblin' : 'slime';
        const rx = 50 + Math.random() * (ARENA_CONFIG.width - 100);
        const ry = 40 + Math.random() * (ARENA_CONFIG.height - 120);
        this.enemies.push(new Enemy(`enemy-${wave}-${i}`, type, rx, ry));
      }
    }
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;

    const count = this.ctx.players.length;

    // 1. CHARACTER SELECT PHASE
    if (this.isSelectPhase) {
      this.ctx.players.slice(0, count).forEach((p, idx) => {
        const input = this.ctx.input.getPlayer(p.id);
        const navLeft = input.isJustPressed('moveLeft');
        const navRight = input.isJustPressed('moveRight');
        const toggleReady = input.isJustPressed('action');

        this.charSelect.updateInput(idx + 1, navLeft, navRight, toggleReady);
      });

      this.charSelect.render(count);

      if (this.charSelect.isAllReady(count)) {
        this.startBattlePhase();
        this.ctx.audio.playTone(520, 'square', 0.4);
      }
      return;
    }

    // 2. MAIN BATTLE PHASE
    this.combat.update(dt);
    if (this.combat.hitStopTimer > 0) return; // Freeze frame hit-stop

    this.arena.update(dt);
    this.synergy.update(dt);

    // Update Heroes
    this.heroes.forEach((hero) => {
      if (hero.hp <= 0) return;

      const input = this.ctx.input.getPlayer(hero.id);
      if (input.isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
      }

      const moveUp = input.isActive('moveUp');
      const moveDown = input.isActive('moveDown');
      const moveLeft = input.isActive('moveLeft');
      const moveRight = input.isActive('moveRight');
      const attackPressed = input.isJustPressed('action');
      const skillPressed = input.isJustPressed('skill');

      hero.update(dt, moveUp, moveDown, moveLeft, moveRight, attackPressed, skillPressed);

      if (attackPressed) {
        if (hero.triggerAttack()) {
          this.ctx.audio.playTone(320, 'sawtooth', 0.1);
        }
      }

      if (skillPressed) {
        if (hero.triggerSpecial()) {
          this.ctx.audio.playTone(440, 'sine', 0.25);
          if (hero.classType === 'wizard') {
            // Wizard Frost Nova
            this.enemies.forEach((e) => {
              const dist = Math.sqrt((e.x - hero.x) ** 2 + (e.y - hero.y) ** 2);
              if (dist <= 80) {
                e.isFrozen = true;
                e.freezeTimer = 2.5;
              }
            });
            this.synergy.triggerSynergy('Frost Nova', hero.x, hero.y, 0x00f0ff);
            const vx = Math.cos(hero.facingAngle) * 220;
            const vy = Math.sin(hero.facingAngle) * 220;
            this.projectiles.push(new Projectile(`proj-${Date.now()}`, hero.id, hero.x, hero.y, vx, vy, hero.config.attackPower * 1.2, 'fireball'));
          } else if (hero.classType === 'rogue') {
            const vx = Math.cos(hero.facingAngle) * 220;
            const vy = Math.sin(hero.facingAngle) * 220;
            this.projectiles.push(new Projectile(`proj-${Date.now()}`, hero.id, hero.x, hero.y, vx, vy, hero.config.attackPower * 1.2, 'dagger'));
          }
        }
      }
    });

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) {
        // Spawn Loot on death
        if (Math.random() > 0.5) {
          const type = Math.random() > 0.5 ? 'health_potion' : 'mana_gem';
          this.loots.push(new Loot(`loot-${Date.now()}`, type, enemy.x, enemy.y));
        }

        // Splitting Slime mechanic
        if (enemy.type === 'slime') {
          this.enemies.push(new Enemy(`mini-1-${Date.now()}`, 'mini_slime', enemy.x - 8, enemy.y));
          this.enemies.push(new Enemy(`mini-2-${Date.now()}`, 'mini_slime', enemy.x + 8, enemy.y));
        }

        this.enemies.splice(i, 1);
        continue;
      }

      const res = enemy.update(dt, this.heroes);
      if (res.shootArrow && res.targetX !== undefined && res.targetY !== undefined) {
        const dx = res.targetX - enemy.x;
        const dy = res.targetY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        this.projectiles.push(new Projectile(`arrow-${Date.now()}`, 0, enemy.x, enemy.y, (dx / dist) * 160, (dy / dist) * 160, enemy.damage, 'arrow'));
      }
    }

    // Update Boss Minotaur
    if (this.boss) {
      if (this.boss.hp <= 0) {
        this.boss = null;
        this.triggerMatchOver();
        return;
      }
      const bRes = this.boss.update(dt, this.heroes);
      if (bRes.triggerLavaShockwave && bRes.shockwaveX && bRes.shockwaveY) {
        this.synergy.triggerSynergy('Earthshaker Slam!', bRes.shockwaveX, bRes.shockwaveY, 0xe74c3c);
        this.projectiles.push(new Projectile(`lava-${Date.now()}`, 0, bRes.shockwaveX, bRes.shockwaveY, 0, 0, 30, 'lava_wave'));
      }
    }

    // Update Projectiles & Loot
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i].update(dt)) this.projectiles.splice(i, 1);
    }
    for (let i = this.loots.length - 1; i >= 0; i--) {
      const loot = this.loots[i];
      if (!loot.update(dt)) {
        this.loots.splice(i, 1);
        continue;
      }
      // Pickup check
      for (const hero of this.heroes) {
        if (hero.hp <= 0) continue;
        const distSq = (hero.x - loot.x) ** 2 + (hero.y - loot.y) ** 2;
        if (distSq <= 14 ** 2) {
          if (loot.type === 'health_potion') hero.hp = Math.min(hero.maxHp, hero.hp + loot.value);
          if (loot.type === 'mana_gem') hero.mana = Math.min(hero.maxMana, hero.mana + loot.value);
          this.ctx.audio.playTone(600, 'sine', 0.15);
          this.loots.splice(i, 1);
          break;
        }
      }
    }

    // Process Combat Engine Collision Checks
    this.combat.processCombat(this.heroes, this.enemies, this.boss, this.projectiles, this.synergy);

    // Wave Advancement Check
    if (this.enemies.length === 0 && !this.boss) {
      if (this.waveNum < 5) {
        this.spawnWave(this.waveNum + 1);
        this.ctx.audio.playTone(550, 'square', 0.3);
      } else {
        this.triggerMatchOver();
      }
    }

    // Render Scene
    this.graphics.clear();
    this.arena.render(this.graphics);
    this.loots.forEach((l) => l.render(this.graphics));
    this.projectiles.forEach((p) => p.render(this.graphics));
    this.enemies.forEach((e) => e.render(this.graphics));
    if (this.boss) this.boss.render(this.graphics);
    this.heroes.forEach((h) => h.render(this.graphics));
    this.synergy.render(this.graphics);
    this.hud.renderHUD(this.graphics, this.heroes, this.waveNum, this.enemies.length + (this.boss ? 1 : 0));
  }

  private triggerMatchOver(): void {
    if (this.state !== 'Playing') return;

    this.state = 'Finished';
    this.ctx.audio.playTone(660, 'sine', 0.5);

    const standings = [...this.heroes]
      .sort((a, b) => b.score - a.score)
      .map((h) => ({ playerId: h.id, score: h.score }));

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
    this.charSelect?.destroy();
    this.graphics?.destroy();
    this.gameContainer?.destroy();
  }
}
