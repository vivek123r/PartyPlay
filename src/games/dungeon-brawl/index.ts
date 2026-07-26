import { Container, Graphics } from 'pixi.js';
import type { GameContext, GameModule, InternalGameState } from '@runtime/types';
import { ARENA_CONFIG, BLESSINGS, ROOMS } from './config';
import type { Blessing, BossType, DamageNumber, LootItem, Particle, RunPhase } from './types';
import { Hero } from './entities/Hero';
import { Enemy } from './entities/Enemy';
import { DungeonBoss } from './entities/DungeonBoss';
import { Projectile } from './entities/Projectile';
import { DungeonArena } from './systems/DungeonArena';
import { CombatEngine } from './systems/CombatEngine';
import { TargetingSystem } from './systems/TargetingSystem';
import { SynergySystem } from './systems/SynergySystem';
import { HUDManager } from './systems/HUDManager';
import { CharacterSelectScreen } from './screens/CharacterSelectScreen';
import { PixelFont } from '../turbo-rider/render/PixelFont';
import { DungeonAssetLibrary } from './visuals/DungeonAssetLibrary';
import { DungeonSceneView } from './visuals/DungeonSceneView';
import { DungeonHudArtView } from './visuals/DungeonHudArtView';
import { ClassCombatEffects } from './visuals/ClassCombatEffects';
import { DungeonAudio } from './systems/DungeonAudio';

export default class DungeonBrawlGame implements GameModule {
  public state: InternalGameState = 'Initializing';
  private ctx!: GameContext; private root!: Container; private world = new Container(); private arenaGraphics = new Graphics(); private worldGraphics = new Graphics(); private uiGraphics = new Graphics();
  private heroes: Hero[] = []; private enemies: Enemy[] = []; private boss: DungeonBoss | null = null; private projectiles: Projectile[] = []; private loot: LootItem[] = []; private particles: Particle[] = []; private damageNumbers: DamageNumber[] = [];
  private readonly arena = new DungeonArena(); private readonly combat = new CombatEngine(); private readonly targeting = new TargetingSystem(); private readonly synergy = new SynergySystem(); private readonly hud = new HUDManager(); private readonly assets = new DungeonAssetLibrary(); private scene!: DungeonSceneView; private classEffects!: ClassCombatEffects; private hudArt!: DungeonHudArtView; private charSelect!: CharacterSelectScreen; private sound!: DungeonAudio;
  private phase: RunPhase = 'select'; private roomIndex = 0; private waveIndex = 0; private phaseTimer = 0; private clock = 0; private frameDt = 0; private id = 0; private completedBlessingRooms = new Set<number>(); private startedBossRooms = new Set<number>(); private activeBlessings = new Set<Blessing['id']>(); private blessingChoices: Blessing[] = []; private blessingVotes = new Map<number, number>(); private dustTimers = new Map<number, number>(); private blessingTimer = 0; private resultSent = false; private useSpriteArt = false;

  public async init(context: GameContext): Promise<void> { this.ctx = context; this.sound = new DungeonAudio(context.audio); await this.assets.preload(); this.scene = new DungeonSceneView(this.assets); this.classEffects = new ClassCombatEffects(this.scene); this.hudArt = new DungeonHudArtView(this.assets); this.charSelect = new CharacterSelectScreen(this.assets); this.useSpriteArt = this.assets.getClipFrames('hero.knight.idle').length > 0 && this.assets.getClipFrames('enemy.skeleton.idle').length > 0; this.root = new Container(); this.world.addChild(this.arenaGraphics, this.scene.container, this.worldGraphics); this.root.addChild(this.world); this.root.addChild(this.hudArt.container); this.root.addChild(this.uiGraphics); this.root.addChild(this.charSelect.container); this.ctx.renderer.stage.addChild(this.root); this.state = 'Ready'; }
  public start(): void { this.state = 'Playing'; }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;
    this.clock += dt; this.frameDt = dt;
    if (this.phase === 'select') { this.updateSelection(dt); return; }
    if (this.phase === 'blessing') { this.updateBlessing(dt); this.render(); return; }
    if (this.phase === 'victory' || this.phase === 'defeat') { this.phaseTimer -= dt; this.render(); if (this.phaseTimer <= 0) this.finish(this.phase === 'victory'); return; }
    this.arena.update(dt); this.synergy.update(dt); this.combat.update(dt);
    if (this.phase === 'room-intro') { this.phaseTimer -= dt; if (this.phaseTimer <= 0) this.beginEncounter(); this.render(); return; }
    if (this.combat.hitStopTimer > 0) { this.updateEffects(dt); this.render(); return; }
    this.updateHeroes(dt); this.updateEnemies(dt); this.updateBoss(dt); this.updateProjectiles(dt); this.updateHazardsAndRevives(dt); this.updateLoot(dt); this.cleanupDeadEnemies(); this.updateEffects(dt);
    if (this.heroes.every(hero => !hero.isAlive)) { this.phase = 'defeat'; this.phaseTimer = 2.2; this.sound.play('defeat', .7); }
    else if (!this.enemies.length && !this.boss) this.advanceEncounter();
    this.render();
  }

  private updateSelection(dt: number): void { const count = Math.min(4, Math.max(2, this.ctx.players.length)); this.ctx.players.slice(0, count).forEach((player, index) => { const input = this.ctx.input.getPlayer(player.id); this.charSelect.updateInput(index + 1, input.isJustPressed('moveLeft'), input.isJustPressed('moveRight'), input.isJustPressed('action')); }); this.charSelect.render(count, dt); if (this.charSelect.isAllReady(count)) this.startRun(count); }
  private startRun(count: number): void { this.charSelect.container.visible = false; const positions = [{ x: 160, y: 160 }, { x: 320, y: 160 }, { x: 160, y: 205 }, { x: 320, y: 205 }]; this.heroes = this.ctx.players.slice(0, count).map((player, index) => new Hero(player.id, this.charSelect.selections[index + 1].classType, positions[index].x, positions[index].y)); this.roomIndex = 0; this.enterRoom(); this.sound.play('start', .55); }
  private enterRoom(): void { const room = ROOMS[this.roomIndex]; this.enemies = []; this.projectiles = []; this.loot = []; this.boss = null; this.waveIndex = 0; this.arena.setTheme(room.theme); this.scene.setRoom(room.theme); this.phase = 'room-intro'; this.phaseTimer = 1.7; }
  private beginEncounter(): void { const room = ROOMS[this.roomIndex]; if (!room.waves.length && room.miniBoss) { this.startedBossRooms.add(this.roomIndex); this.spawnBoss(room.miniBoss); } else this.spawnWave(room.waves[this.waveIndex]); this.phase = 'combat'; }
  private spawnBoss(type: BossType): void { this.boss = new DungeonBoss(type, ARENA_CONFIG.width / 2, 78, this.heroes.length, this.ctx.modifiers.bossDifficulty ?? 1); this.scene.playEffect('fx.enemy-death', this.boss.x, this.boss.y, { tint: this.boss.type === 'ember_fiend' ? 0xff884a : 0xb779f5, scale: 1.35 }); this.sound.play('bossIntro', .7); }
  private spawnWave(base: Enemy['type'][]): void { const extra = Math.max(0, this.heroes.length - 2); const list = [...base, ...Array.from({ length: extra }, (_, index) => base[index % base.length])]; list.forEach((type, index) => { const angle = (Math.PI * 2 * index) / list.length + this.ctx.random() * .32; const radius = 96 + this.ctx.random() * 65; const x = Math.max(45, Math.min(435, 240 + Math.cos(angle) * radius)); const y = Math.max(54, Math.min(215, 135 + Math.sin(angle) * radius)); const health = (this.ctx.modifiers.enemyHealthMultiplier ?? 1) * (1 + this.roomIndex * .13); this.enemies.push(new Enemy(`enemy-${this.id++}`, type, x, y, health)); }); this.sound.play('wave', .35); }

  private updateHeroes(dt: number): void { for (const hero of this.heroes) { const input = this.ctx.input.getPlayer(hero.id); if (input.isJustPressed('pause')) { this.ctx.events.emit('game:pause', undefined); return; } hero.update(dt, input.isActive('moveUp'), input.isActive('moveDown'), input.isActive('moveLeft'), input.isActive('moveRight')); const resolved = this.arena.resolveCircle(hero.x, hero.y, 10); hero.x = resolved.x; hero.y = resolved.y; if (resolved.collided) { hero.vx *= .18; hero.vy *= .18; } const dustTimer = Math.max(0, (this.dustTimers.get(hero.id) ?? 0) - dt); if (hero.isAlive && Math.hypot(hero.vx, hero.vy) > 82 && dustTimer <= 0) { this.scene.playEffect('fx.dust', hero.x, hero.y + 5, { tint: 0xb9a6a0, alpha: .72, scale: .55 }); this.dustTimers.set(hero.id, .22); } else this.dustTimers.set(hero.id, dustTimer); if (!hero.isAlive) continue; const attackPressed = input.isJustPressed('action'); const skillPressed = input.isJustPressed('skill'); const ultimate = (attackPressed && input.isActive('skill')) || (skillPressed && input.isActive('action'));
      if (ultimate && hero.triggerUltimate()) { this.castUltimate(hero); this.sound.playUltimate(hero.classType, hero.id % 2 ? -.18 : .18); continue; }
      if (attackPressed) { const target = this.targeting.findNearest(hero, this.enemies, this.boss, hero.config.attackRange + 28); if (hero.requestAttack(target.id, target.angle)) this.sound.playAttack(hero.classType, hero.id % 2 ? -.12 : .12); }
      if (skillPressed && hero.triggerSpecial()) { if (this.activeBlessings.has('chrono')) hero.specialCooldownTimer *= .8; this.castSpecial(hero); this.sound.playSkill(hero.classType, hero.id % 2 ? -.18 : .18); }
      const attack = hero.consumeAttack(); if (attack) this.applyAttack(hero, attack);
    } }
  private applyAttack(hero: Hero, attack: import('./types').AttackEvent): void {
    this.classEffects.playBasic(hero, attack);
    if (hero.classType === 'rogue' || hero.classType === 'wizard') {
      const speed = hero.classType === 'rogue' ? 286 : 235;
      const element = hero.classType === 'rogue' ? 'arrow' : 'arcane_bolt';
      this.projectiles.push(new Projectile(
        `${element}-${this.id++}`,
        hero.id,
        hero.x + Math.cos(attack.angle) * 8,
        hero.y - 7 + Math.sin(attack.angle) * 8,
        Math.cos(attack.angle) * speed,
        Math.sin(attack.angle) * speed,
        attack.damage,
        element,
        {
          homing: hero.classType === 'wizard',
          targetId: attack.targetId,
          pierce: hero.classType === 'rogue' && attack.comboStep === 2 ? 1 : 0,
          comboStep: attack.comboStep,
        },
      ));
      return;
    }
    const result = this.combat.resolveAttack(hero, attack, this.enemies, this.boss);
    this.damageNumbers.push(...result.damageNumbers);
    this.particles.push(...result.particles);
    result.damageNumbers.forEach(number => {
      this.classEffects.playImpact(hero.classType, attack.comboStep, number.x, number.y, attack.angle);
    });
    if (result.hit && attack.comboStep === 2) {
      this.synergy.triggerSynergy('FINISHER', attack.x + Math.cos(attack.angle) * 22, attack.y + Math.sin(attack.angle) * 22, hero.config.secondaryColor);
      if (this.activeBlessings.has('storm')) {
        const target = this.targeting.findNearest(hero, this.enemies.filter(enemy => enemy.id !== attack.targetId), this.boss, 95);
        const chained = this.enemies.find(enemy => enemy.id === target.id);
        if (chained) {
          const value = chained.takeDamage(Math.round(attack.damage * .55));
          this.damageNumbers.push({ x: chained.x, y: chained.y - 22, value, color: 0x6ff7ff, lifetime: .7, vy: -22 });
          this.synergy.triggerSynergy('STORM', chained.x, chained.y, 0x6ff7ff);
          this.scene.playEffect('fx.electro-shock', chained.x, chained.y - 8, { scale: 0.55 });
        }
      }
    }
  }
  private castSpecial(hero: Hero): void {
    const nearest = this.targeting.findNearest(hero, this.enemies, this.boss, hero.classType === 'wizard' ? 150 : 92);
    const origin = { x: hero.x, y: hero.y };
    if (hero.classType === 'knight') {
      this.synergy.triggerSynergy('SHIELD WALL', hero.x, hero.y, 0x6ff7ff);
      this.enemies.forEach(enemy => {
        if (Math.hypot(enemy.x - hero.x, enemy.y - hero.y) < 86) {
          enemy.targetHeroId = hero.id;
          enemy.stunTimer = .35;
        }
      });
    } else if (hero.classType === 'wizard') {
      this.enemies.forEach(enemy => {
        if (Math.hypot(enemy.x - hero.x, enemy.y - hero.y) < 82) {
          enemy.isFrozen = true;
          enemy.freezeTimer = 2.3;
        }
      });
      if (this.boss && Math.hypot(this.boss.x - hero.x, this.boss.y - hero.y) < 94) {
        this.boss.freezeTimer = Math.max(this.boss.freezeTimer, 1.15);
      }
      if (nearest.id) {
        const speed = 230;
        this.projectiles.push(new Projectile(
          `bolt-${this.id++}`,
          hero.id,
          hero.x,
          hero.y - 8,
          Math.cos(nearest.angle) * speed,
          Math.sin(nearest.angle) * speed,
          32,
          'arcane_bolt',
          { homing: true, targetId: nearest.id },
        ));
      }
      this.synergy.triggerSynergy('FROST NOVA', hero.x, hero.y, 0x6ff7ff);
    } else if (hero.classType === 'rogue') {
      if (nearest.id) {
        hero.x = Math.max(28, Math.min(452, nearest.x - Math.cos(nearest.angle) * 17));
        hero.y = Math.max(34, Math.min(232, nearest.y - Math.sin(nearest.angle) * 17));
        const enemy = this.enemies.find(item => item.id === nearest.id);
        if (enemy) {
          const damage = enemy.takeDamage(44);
          enemy.isExposed = true;
          enemy.exposedTimer = 4;
          this.damageNumbers.push({ x: enemy.x, y: enemy.y - 22, value: damage, color: 0x7de38a, lifetime: .7, vy: -25 });
          this.classEffects.playImpact('rogue', 2, enemy.x, enemy.y, nearest.angle);
        } else if (this.boss?.id === nearest.id) {
          const damage = this.boss.takeDamage(38);
          this.damageNumbers.push({ x: this.boss.x, y: this.boss.y - 28, value: damage, color: 0x7de38a, lifetime: .7, vy: -25 });
          this.classEffects.playImpact('rogue', 2, this.boss.x, this.boss.y, nearest.angle);
        }
      }
      this.synergy.triggerSynergy('SHADOW DASH', hero.x, hero.y, 0x7de38a);
    } else {
      this.enemies.forEach(enemy => {
        const distance = Math.hypot(enemy.x - hero.x, enemy.y - hero.y);
        if (distance < 76) {
          enemy.takeDamage(38, (enemy.x - hero.x) / Math.max(1, distance) * 110, (enemy.y - hero.y) / Math.max(1, distance) * 110);
          enemy.stunTimer = 1.05;
        }
      });
      if (this.boss && Math.hypot(this.boss.x - hero.x, this.boss.y - hero.y) < 82) {
        this.boss.takeDamage(32);
        this.boss.stunTimer = Math.max(this.boss.stunTimer, .65);
      }
      this.synergy.triggerSynergy('GROUND SLAM', hero.x, hero.y, 0xff884a);
    }
    this.classEffects.playSpecial(hero, nearest.angle, origin);
    if (this.activeBlessings.has('ember')) {
      this.projectiles.push(new Projectile(`ember-${this.id++}`, hero.id, hero.x, hero.y, 0, 0, 14, 'lava_wave', { splashRadius: 38 }));
    }
  }

  private castUltimate(hero: Hero): void {
    const cluster = this.targeting.findCluster(hero, this.enemies, this.boss, 180);
    if (hero.classType === 'knight') {
      this.enemies.forEach(enemy => {
        if (Math.hypot(enemy.x - hero.x, enemy.y - hero.y) < 86) enemy.takeDamage(82);
      });
      if (this.boss && Math.hypot(this.boss.x - hero.x, this.boss.y - hero.y) < 96) this.boss.takeDamage(74);
      this.synergy.triggerSynergy('WHIRLING BLADE', hero.x, hero.y, 0xf2c14e);
    } else if (hero.classType === 'wizard') {
      for (let index = 0; index < 5; index++) {
        const angle = index * 1.256;
        this.projectiles.push(new Projectile(
          `meteor-${this.id++}`,
          hero.id,
          cluster.x + Math.cos(angle) * (index % 2 ? 18 : 4),
          cluster.y + Math.sin(angle) * (index % 2 ? 18 : 4),
          0,
          0,
          62,
          'meteor',
          { splashRadius: 48 },
        ));
      }
      this.synergy.triggerSynergy('METEOR STORM', cluster.x, cluster.y, 0xf2c14e);
    } else if (hero.classType === 'rogue') {
      for (let index = 0; index < 8; index++) {
        const angle = index * Math.PI / 4;
        this.projectiles.push(new Projectile(
          `rain-${this.id++}`,
          hero.id,
          cluster.x + Math.cos(angle) * 72,
          cluster.y + Math.sin(angle) * 72,
          -Math.cos(angle) * 150,
          -Math.sin(angle) * 150,
          35,
          'shadow_blade',
          { splashRadius: 18 },
        ));
      }
      this.synergy.triggerSynergy('CROSSBOW RAIN', cluster.x, cluster.y, 0x7de38a);
    } else {
      this.synergy.triggerSynergy('BERSERKER RAGE', hero.x, hero.y, 0xff526b);
    }
    this.classEffects.playUltimate(hero, cluster.x, cluster.y);
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      const result = enemy.update(dt, this.heroes, this.enemies);
      const collisionX = enemy.x;
      const collisionY = enemy.y;
      let resolved = this.arena.resolveCircle(enemy.x, enemy.y, enemy.radius);
      enemy.x = resolved.x;
      enemy.y = resolved.y;
      if (resolved.collided && result.target) {
        const hitVerticalFace = Math.abs(resolved.x - collisionX) > Math.abs(resolved.y - collisionY);
        if (hitVerticalFace) {
          enemy.vx = 0;
          enemy.y += Math.sign(result.target.y - enemy.y || 1) * enemy.moveSpeed * dt * .72;
        } else {
          enemy.vy = 0;
          enemy.x += Math.sign(result.target.x - enemy.x || 1) * enemy.moveSpeed * dt * .72;
        }
        resolved = this.arena.resolveCircle(enemy.x, enemy.y, enemy.radius);
        enemy.x = resolved.x;
        enemy.y = resolved.y;
      }
      if (result.shoot && result.target) {
        const angle = Math.atan2(result.target.y - enemy.y, result.target.x - enemy.x);
        this.projectiles.push(new Projectile(`arrow-${this.id++}`, 0, enemy.x, enemy.y - 7, Math.cos(angle) * 176, Math.sin(angle) * 176, enemy.damage, 'arrow'));
      }
      if (result.fireZone && result.target) this.projectiles.push(new Projectile(`fire-${this.id++}`, 0, result.target.x, result.target.y, 0, 0, enemy.damage, 'fire_orb', { splashRadius: 30 }));
      for (const hero of this.heroes) {
        if (!hero.isAlive || Math.hypot(hero.x - enemy.x, hero.y - enemy.y) >= enemy.radius + 10 || enemy.attackCooldown > 0) continue;
        const dealt = hero.takeDamage(enemy.damage);
        enemy.attackCooldown = .78;
        if (dealt) this.damageNumbers.push({ x: hero.x, y: hero.y - 23, value: dealt, color: 0xff526b, lifetime: .7, vy: -22 });
      }
    }
  }
  private updateBoss(dt: number): void {
    if (!this.boss) return;
    const events = this.boss.update(dt, this.heroes);
    const bossResolved = this.arena.resolveCircle(this.boss.x, this.boss.y, this.boss.radius);
    this.boss.x = bossResolved.x;
    this.boss.y = bossResolved.y;
    for (const event of events) {
      if (event.type === 'charge-hit' || event.type === 'shockwave') {
        for (const hero of this.heroes) {
          if (!hero.isAlive || Math.hypot(hero.x - event.x, hero.y - event.y) > (event.radius ?? 36)) continue;
          const dealt = hero.takeDamage(event.damage ?? 20);
          if (dealt) this.damageNumbers.push({ x: hero.x, y: hero.y - 24, value: dealt, color: 0xff526b, lifetime: .7, vy: -22 });
        }
        if (event.type === 'shockwave') {
          this.synergy.triggerSynergy('BOSS IMPACT', event.x, event.y, 0xff526b);
          this.scene.playEffect('fx.explosion', event.x, event.y - 4, { tint: this.boss.type === 'crypt_warden' ? 0x8c8dff : 0xff884a, scale: Math.max(0.65, (event.radius ?? 50) / 70) });
        }
      } else if (event.type === 'projectile') {
        this.sound.play('bossAttack', .42);
        const count = event.count ?? 7;
        for (let index = 0; index < count; index++) {
          const angle = index * Math.PI * 2 / count;
          this.projectiles.push(new Projectile(`boss-fire-${this.id++}`, 0, event.x, event.y - 8, Math.cos(angle) * 132, Math.sin(angle) * 132, event.damage ?? 17, 'fire_orb'));
        }
      } else if (event.type === 'hazard') {
        this.projectiles.push(new Projectile(`boss-hazard-${this.id++}`, 0, event.x, event.y, 0, 0, event.damage ?? 16, 'lava_wave', { splashRadius: event.radius ?? 31 }));
      } else if (event.type === 'summon') {
        this.sound.play('bossSummon', .55);
        const count = event.count ?? 2;
        for (let index = 0; index < count; index++) {
          const angle = index * Math.PI * 2 / count;
          this.enemies.push(new Enemy(`summon-${this.id++}`, event.enemyType ?? 'imp', event.x + Math.cos(angle) * 38, event.y + Math.sin(angle) * 28, 1 + this.roomIndex * .12));
        }
        this.scene.playEffect('fx.enemy-death', event.x, event.y, { tint: 0xb779f5, scale: 1.25 });
      } else if (event.type === 'teleport') {
        this.sound.play('bossTeleport', .5);
        this.scene.playEffect('fx.electro-shock', event.x, event.y - 8, { tint: 0x8c8dff, scale: 0.75 });
      }
    }
    if (this.boss.hp <= 0) {
      this.boss = null;
      this.sound.play('bossDefeated', .78);
    }
  }
  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile.update(dt, this.enemies)) { this.projectiles.splice(i, 1); continue; }
      if (Math.hypot(projectile.vx, projectile.vy) > 1 && this.arena.isBlocked(projectile.x, projectile.y, projectile.radius)) {
        this.scene.playEffect('fx.magic-spark', projectile.x, projectile.y, { tint: projectile.color, scale: .55 });
        this.projectiles.splice(i, 1);
        continue;
      }
      let hit = false;
      let remove = false;
      const owner = this.heroes.find((hero) => hero.id === projectile.ownerId);
      if (projectile.ownerId > 0) {
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0 || projectile.hitTargetIds.has(enemy.id) || Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) >= enemy.radius + projectile.radius) continue;
          const dealt = enemy.takeDamage(projectile.damage);
          projectile.hitTargetIds.add(enemy.id);
          this.damageNumbers.push({ x: enemy.x, y: enemy.y - 18, value: dealt, color: projectile.color, lifetime: .7, vy: -20 });
          if (owner) {
            owner.score += 10;
            owner.ultimate = Math.min(100, owner.ultimate + (projectile.comboStep === 2 ? 9 : 5));
            owner.mana = Math.min(owner.maxMana, owner.mana + (projectile.comboStep === 2 ? 7 : 2));
          }
          if (owner) this.classEffects.playImpact(owner.classType, projectile.comboStep ?? 0, enemy.x, enemy.y, Math.atan2(projectile.vy, projectile.vx));
          hit = true;
          if ((projectile.pierce ?? 0) > 0) projectile.pierce = (projectile.pierce ?? 0) - 1;
          else remove = true;
          break;
        }
        if (!hit && this.boss && Math.hypot(this.boss.x - projectile.x, this.boss.y - projectile.y) < this.boss.radius + projectile.radius) {
          const dealt = this.boss.takeDamage(projectile.damage);
          if (dealt && owner) {
            owner.score += 12;
            owner.ultimate = Math.min(100, owner.ultimate + 5);
            this.damageNumbers.push({ x: this.boss.x, y: this.boss.y - 28, value: dealt, color: projectile.color, lifetime: .7, vy: -22 });
            this.classEffects.playImpact(owner.classType, projectile.comboStep ?? 0, this.boss.x, this.boss.y, Math.atan2(projectile.vy, projectile.vx));
          }
          hit = dealt > 0;
          remove = hit;
        }
      } else {
        for (const hero of this.heroes) {
          if (!hero.isAlive || Math.hypot(hero.x - projectile.x, hero.y - projectile.y) >= 12 + projectile.radius) continue;
          const dealt = hero.takeDamage(projectile.damage);
          if (dealt) this.damageNumbers.push({ x: hero.x, y: hero.y - 22, value: dealt, color: 0xff526b, lifetime: .7, vy: -20 });
          hit = dealt > 0;
          remove = hit;
          break;
        }
      }
      const stationarySplash = Boolean(projectile.splashRadius && Math.hypot(projectile.vx, projectile.vy) < 1);
      if ((hit || stationarySplash) && projectile.splashRadius) {
        if (projectile.ownerId > 0) {
          this.enemies.forEach((enemy) => {
            if (!projectile.hitTargetIds.has(enemy.id) && Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) < projectile.splashRadius!) enemy.takeDamage(projectile.damage);
          });
          if (this.boss && Math.hypot(this.boss.x - projectile.x, this.boss.y - projectile.y) < projectile.splashRadius) this.boss.takeDamage(projectile.damage);
        } else {
          this.heroes.forEach((hero) => {
            if (hero.isAlive && Math.hypot(hero.x - projectile.x, hero.y - projectile.y) < projectile.splashRadius!) hero.takeDamage(projectile.damage);
          });
        }
        this.synergy.triggerSynergy('IMPACT', projectile.x, projectile.y, projectile.color);
        if (projectile.element === 'meteor') {
          this.scene.playEffect('fx.ground-impact', projectile.x, projectile.y + 2, { scale: Math.max(0.55, projectile.splashRadius / 62) });
        } else if (projectile.element === 'shadow_blade') {
          this.scene.playEffect('fx.shadow-cross', projectile.x, projectile.y - 4, {
            tint: 0xa1ffc0,
            scale: Math.max(0.72, projectile.splashRadius / 23),
          });
        } else if (projectile.element === 'lava_wave') {
          this.scene.playEffect('fx.rage-explosion', projectile.x, projectile.y - 3, {
            scale: Math.max(0.48, projectile.splashRadius / 70),
          });
        } else {
          this.scene.playEffect('fx.explosion', projectile.x, projectile.y, { tint: projectile.color, scale: Math.max(0.4, projectile.splashRadius / 68) });
        }
        remove = true;
      }
      if (remove) this.projectiles.splice(i, 1);
    }
  }
  private updateHazardsAndRevives(dt: number): void { for (const hero of this.heroes) { if (hero.isAlive) { const hurt = this.arena.hurtAt(hero.x, hero.y); if (hurt) hero.takeDamage(hurt); } else if (hero.isDowned) { const helper = this.heroes.find(other => other.isAlive && Math.hypot(other.x - hero.x, other.y - hero.y) < 38); if (helper) { hero.reviveProgress += dt; if (hero.reviveProgress >= 2) { hero.revive(); helper.revives++; helper.score += 75; helper.ultimate = Math.min(100, helper.ultimate + 25); if (this.activeBlessings.has('iron')) { hero.isInvulnerable = true; hero.invulnerableTimer = 3; } this.synergy.triggerSynergy('REVIVED', hero.x, hero.y, 0x7de38a); } } else hero.reviveProgress = Math.max(0, hero.reviveProgress - dt * .6); } } }
  private updateLoot(dt: number): void { for (let i = this.loot.length - 1; i >= 0; i--) { const item = this.loot[i]; item.lifetime -= dt; if (item.lifetime <= 0) { this.loot.splice(i, 1); continue; } const hero = this.heroes.find(candidate => candidate.isAlive && Math.hypot(candidate.x - item.x, candidate.y - item.y) < 14); if (!hero) continue; if (item.type === 'health_potion') this.heroes.forEach(member => member.hp = Math.min(member.maxHp, member.hp + item.value)); else if (item.type === 'mana_gem') hero.mana = Math.min(hero.maxMana, hero.mana + item.value); else hero.ultimate = Math.min(100, hero.ultimate + item.value); this.loot.splice(i, 1); this.sound.play('pickup', .55); } }
  private cleanupDeadEnemies(): void { for (let i = this.enemies.length - 1; i >= 0; i--) { const enemy = this.enemies[i]; if (enemy.hp > 0) continue; const killer = this.heroes.reduce((best, hero) => hero.targetId === enemy.id ? hero : best, this.heroes[0]); killer.kills++; killer.score += enemy.type === 'brute' ? 80 : 30; killer.ultimate = Math.min(100, killer.ultimate + 9); if (enemy.type === 'slime') { this.enemies.push(new Enemy(`mini-${this.id++}`, 'mini_slime', enemy.x - 7, enemy.y, 1 + this.roomIndex * .1), new Enemy(`mini-${this.id++}`, 'mini_slime', enemy.x + 7, enemy.y, 1 + this.roomIndex * .1)); } const dropChance = this.activeBlessings.has('fortune') ? .58 : .35; if (this.ctx.random() < dropChance) { const roll = this.ctx.random(); this.loot.push({ id: `loot-${this.id++}`, type: roll < .38 ? 'health_potion' : roll < .75 ? 'mana_gem' : 'soul_orb', x: enemy.x, y: enemy.y, value: roll < .38 ? 12 : roll < .75 ? 22 : 14, lifetime: 10 }); } if (this.activeBlessings.has('blood')) this.heroes.forEach(hero => hero.hp = Math.min(hero.maxHp, hero.hp + 4)); this.particles.push(...Array.from({ length: 10 }, (_, index) => ({ x: enemy.x, y: enemy.y, vx: Math.cos(index * .63) * (32 + index * 3), vy: Math.sin(index * .63) * (32 + index * 3), life: .5, maxLife: .5, color: enemy.color, size: 2 }))); this.enemies.splice(i, 1); } }
  private updateEffects(dt: number): void { for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 35 * dt; p.life -= dt; if (p.life <= 0) this.particles.splice(i, 1); } for (let i = this.damageNumbers.length - 1; i >= 0; i--) { const n = this.damageNumbers[i]; n.y += n.vy * dt; n.lifetime -= dt; if (n.lifetime <= 0) this.damageNumbers.splice(i, 1); } }
  private advanceEncounter(): void {
    const room = ROOMS[this.roomIndex];
    if (this.waveIndex + 1 < room.waves.length) {
      this.waveIndex++;
      this.spawnWave(room.waves[this.waveIndex]);
      return;
    }
    if (room.miniBoss && !this.startedBossRooms.has(this.roomIndex)) {
      this.startedBossRooms.add(this.roomIndex);
      this.spawnBoss(room.miniBoss);
      return;
    }
    if (room.id === 'throne') {
      this.phase = 'victory';
      this.phaseTimer = 2.5;
      this.sound.play('bossDefeated', .78);
      return;
    }
    if (room.hasBlessingAfter && !this.completedBlessingRooms.has(this.roomIndex)) {
      this.completedBlessingRooms.add(this.roomIndex);
      this.beginBlessing();
      return;
    }
    this.roomIndex++;
    this.enterRoom();
  }
  private beginBlessing(): void { const pool = [...BLESSINGS]; const choices: Blessing[] = []; while (choices.length < 3) choices.push(pool.splice(Math.floor(this.ctx.random() * pool.length), 1)[0]); this.blessingChoices = choices; this.blessingVotes.clear(); this.blessingTimer = 8; this.phase = 'blessing'; }
  private updateBlessing(dt: number): void { this.blessingTimer -= dt; for (const hero of this.heroes) { const input = this.ctx.input.getPlayer(hero.id); const current = this.blessingVotes.get(hero.id) ?? 0; if (input.isJustPressed('moveLeft')) this.blessingVotes.set(hero.id, (current + 2) % 3); if (input.isJustPressed('moveRight')) this.blessingVotes.set(hero.id, (current + 1) % 3); if (input.isJustPressed('action')) this.blessingVotes.set(hero.id, this.blessingVotes.get(hero.id) ?? 0); } if (this.blessingVotes.size === this.heroes.length || this.blessingTimer <= 0) { const counts = [0, 0, 0]; this.blessingVotes.forEach(vote => counts[vote]++); const highest = Math.max(...counts); const tied = counts.map((count, index) => count === highest ? index : -1).filter(index => index >= 0); const selected = tied[Math.floor(this.ctx.random() * tied.length)]; this.activeBlessings.add(this.blessingChoices[selected].id); this.roomIndex++; this.enterRoom(); this.sound.play('blessing', .65); } }
  private render(): void {
    this.scene.update(this.frameDt, this.heroes, this.enemies, this.boss, this.projectiles, this.loot);
    this.arenaGraphics.clear();
    this.arena.renderBase(this.arenaGraphics);
    this.worldGraphics.clear();
    this.arena.renderHazards(this.worldGraphics);
    for (const item of this.loot) {
      const color = item.type === 'health_potion' ? 0xff526b : item.type === 'mana_gem' ? 0x6ff7ff : 0xf2c14e;
      if (!this.useSpriteArt) this.worldGraphics.circle(Math.round(item.x), Math.round(item.y), 5).fill({ color });
      this.worldGraphics.circle(Math.round(item.x), Math.round(item.y), 8).stroke({ color, width: 1, alpha: .42 });
    }
    if (!this.useSpriteArt) this.projectiles.forEach((projectile) => projectile.render(this.worldGraphics));
    this.enemies.forEach((enemy) => enemy.render(this.worldGraphics, this.clock, !this.useSpriteArt));
    this.boss?.renderTelegraph(this.worldGraphics, this.clock);
    this.heroes.forEach((hero) => hero.render(this.worldGraphics, this.clock, !this.useSpriteArt));
    this.synergy.render(this.worldGraphics);
    this.particles.forEach((particle) => this.worldGraphics.rect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size).fill({ color: particle.color, alpha: particle.life / particle.maxLife }));
    this.damageNumbers.forEach((number) => PixelFont.drawText(this.worldGraphics, `${number.value}`, Math.round(number.x), Math.round(number.y), number.color, 1, Math.max(0, number.lifetime / .7)));
    const shake = this.combat.cameraShake > 0 ? Math.ceil(Math.sin(this.clock * 170) * 2) : 0;
    this.world.x = shake;
    this.world.y = -shake;

    this.uiGraphics.clear();
    const room = ROOMS[this.roomIndex];
    this.hudArt.update(this.heroes, this.phase, Boolean(this.boss));
    this.hud.render(
      this.uiGraphics,
      this.heroes,
      room?.title ?? 'DUNGEON',
      this.enemies.length + (this.boss ? 1 : 0),
      this.phase,
      this.boss ? { name: this.boss.name, hp: this.boss.hp, maxHp: this.boss.maxHp, phase: this.boss.phase } : undefined,
      this.phase === 'blessing' ? { choices: this.blessingChoices, votes: this.blessingVotes, time: this.blessingTimer } : undefined,
    );
    if (this.phase === 'victory' || this.phase === 'defeat') {
      this.uiGraphics.rect(0, 0, 480, 270).fill({ color: 0x08040e, alpha: .76 });
      PixelFont.drawText(this.uiGraphics, this.phase === 'victory' ? 'THE HORNED KING FALLS' : 'THE DUNGEON CLAIMS YOU', 126, 110, this.phase === 'victory' ? 0xf2c14e : 0xff526b, 2);
      PixelFont.drawText(this.uiGraphics, this.phase === 'victory' ? 'TEAM VICTORY' : 'TEAM WIPED', 187, 143, 0xeaf6ff, 1);
    }
  }
  private finish(victory: boolean): void { if (this.resultSent) return; this.resultSent = true; this.state = 'Finished'; const standings = [...this.heroes].sort((a, b) => b.score - a.score).map(hero => ({ playerId: hero.id, score: hero.score })); this.ctx.events.emit('game:over', { winnerId: victory ? (standings[0]?.playerId ?? 1) : 0, isTeamLoss: !victory, isTeamVictory: victory, standings }); }
  public pause(): void { this.state = 'Paused'; }
  public resume(): void { this.state = 'Playing'; }
  public destroy(): void {
    this.state = 'Destroyed';
    this.root.removeChild(this.charSelect.container, this.hudArt.container, this.uiGraphics);
    this.world.removeChild(this.scene.container, this.arenaGraphics, this.worldGraphics);
    this.charSelect.destroy();
    this.scene.destroy();
    this.hudArt.destroy();
    this.arenaGraphics.destroy();
    this.worldGraphics.destroy();
    this.uiGraphics.destroy();
    this.root.destroy({ children: true });
    this.assets.destroy();
  }
}
