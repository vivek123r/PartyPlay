import { Container, Sprite, Texture } from 'pixi.js';
import type { BossType, LootItem, ProjectileEntity, RoomTheme } from '../types';
import type { Hero } from '../entities/Hero';
import type { Enemy } from '../entities/Enemy';
import {
  DUNGEON_CLIPS,
  type DungeonAssetLibrary,
  type DungeonClipKey,
  type DungeonTextureKey,
} from './DungeonAssetLibrary';
import { SpriteAnimator } from './SpriteAnimator';

interface BossVisualSource {
  id: string;
  type: BossType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  phase: number;
  state: string;
}

interface HeroVisual {
  animator: SpriteAnimator;
  lastAttackTimer: number;
}

interface EnemyVisual {
  animator: SpriteAnimator;
  x: number;
  y: number;
}

interface ProjectileVisual {
  sprite: Sprite;
  animator?: SpriteAnimator;
}

interface TimedEffect {
  animator: SpriteAnimator;
  delay: number;
  elapsed: number;
  duration?: number;
  baseAlpha: number;
  fadeOut: boolean;
  vx: number;
  vy: number;
  rotationSpeed: number;
}

export interface DungeonEffectOptions {
  rotation?: number;
  tint?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  delay?: number;
  duration?: number;
  fadeOut?: boolean;
  vx?: number;
  vy?: number;
  rotationSpeed?: number;
}

const HERO_IDLE: Record<Hero['classType'], DungeonClipKey> = {
  knight: 'hero.knight.idle',
  wizard: 'hero.wizard.idle',
  rogue: 'hero.rogue.idle',
  barbarian: 'hero.barbarian.idle',
};

const HERO_RUN: Record<Hero['classType'], DungeonClipKey> = {
  knight: 'hero.knight.run',
  wizard: 'hero.wizard.run',
  rogue: 'hero.rogue.run',
  barbarian: 'hero.barbarian.run',
};

const ROOM_PROPS: Record<RoomTheme, Array<{ key: DungeonTextureKey; x: number; y: number; scale: number }>> = {
  chains: [
    { key: 'ruinsBlue2', x: 42, y: 86, scale: 0.52 },
    { key: 'ruinsBlue3', x: 446, y: 210, scale: 0.52 },
    { key: 'crystalBlue', x: 438, y: 62, scale: 0.4 },
    { key: 'crystalBlue', x: 102, y: 82, scale: 0.25 },
    { key: 'crystalViolet', x: 378, y: 186, scale: 0.22 },
  ],
  crypt: [
    { key: 'ruinsGray2', x: 44, y: 94, scale: 0.58 },
    { key: 'ruinsBlue3', x: 441, y: 211, scale: 0.54 },
    { key: 'crystalGreen', x: 51, y: 217, scale: 0.43 },
    { key: 'crystalGreen', x: 427, y: 55, scale: 0.34 },
    { key: 'crystalGreen', x: 108, y: 82, scale: 0.2 },
    { key: 'crystalBlue', x: 372, y: 193, scale: 0.2 },
  ],
  ember: [
    { key: 'ruinsBrown2', x: 43, y: 91, scale: 0.57 },
    { key: 'ruinsBrown3', x: 439, y: 210, scale: 0.56 },
    { key: 'crystalRed', x: 54, y: 216, scale: 0.45 },
    { key: 'crystalRed', x: 426, y: 58, scale: 0.36 },
    { key: 'crystalRed', x: 119, y: 86, scale: 0.24 },
    { key: 'crystalYellow', x: 361, y: 193, scale: 0.23 },
  ],
  court: [
    { key: 'ruinsGray3', x: 42, y: 95, scale: 0.56 },
    { key: 'ruinsBrown2', x: 440, y: 208, scale: 0.58 },
    { key: 'crystalViolet', x: 51, y: 216, scale: 0.42 },
    { key: 'crystalRed', x: 429, y: 58, scale: 0.36 },
    { key: 'crystalViolet', x: 101, y: 77, scale: 0.22 },
    { key: 'crystalRed', x: 379, y: 201, scale: 0.22 },
  ],
  throne: [
    { key: 'ruinsSand2', x: 42, y: 92, scale: 0.58 },
    { key: 'ruinsSand3', x: 442, y: 208, scale: 0.58 },
    { key: 'crystalYellow', x: 51, y: 216, scale: 0.42 },
    { key: 'crystalRed', x: 428, y: 57, scale: 0.38 },
    { key: 'crystalYellow', x: 102, y: 115, scale: 0.26 },
    { key: 'crystalYellow', x: 378, y: 115, scale: 0.26 },
  ],
};

interface RoomObject {
  x: number;
  y: number;
  region: [number, number, number, number];
  scale?: number;
  tint?: number;
}

const ROOM_OBJECTS: Record<RoomTheme, RoomObject[]> = {
  chains: [
    { x: 366, y: 75, region: [80, 48, 16, 16], scale: 1.35 },
    { x: 65, y: 221, region: [112, 112, 16, 16], scale: 1.2 },
    { x: 414, y: 222, region: [160, 16, 16, 16], scale: 1.1 },
  ],
  crypt: [
    { x: 108, y: 86, region: [192, 112, 32, 16], scale: 1.42 },
    { x: 372, y: 86, region: [192, 112, 32, 16], scale: 1.42 },
    { x: 108, y: 197, region: [144, 112, 16, 16], scale: 1.4 },
    { x: 372, y: 197, region: [144, 112, 16, 16], scale: 1.4 },
    { x: 238, y: 72, region: [144, 48, 16, 16], scale: 1.22 },
  ],
  ember: [
    { x: 78, y: 71, region: [112, 112, 16, 16], scale: 1.25, tint: 0xffb067 },
    { x: 402, y: 211, region: [112, 112, 16, 16], scale: 1.25, tint: 0xff8a56 },
    { x: 239, y: 61, region: [208, 48, 16, 16], scale: 1.1 },
  ],
  court: [
    { x: 240, y: 141, region: [160, 16, 16, 16], scale: 1.35, tint: 0xffd36b },
    { x: 74, y: 219, region: [48, 80, 16, 16], scale: 1.15 },
    { x: 406, y: 219, region: [144, 80, 16, 16], scale: 1.15 },
    { x: 239, y: 78, region: [240, 48, 16, 16], scale: 1.05 },
  ],
  throne: [
    { x: 240, y: 50, region: [80, 80, 16, 16], scale: 1.5, tint: 0xf2c14e },
    { x: 102, y: 209, region: [80, 48, 16, 16], scale: 1.35 },
    { x: 378, y: 209, region: [48, 48, 16, 16], scale: 1.35 },
    { x: 72, y: 58, region: [160, 16, 16, 16], scale: 1.05 },
    { x: 408, y: 58, region: [160, 16, 16, 16], scale: 1.05 },
  ],
};

export class DungeonSceneView {
  public readonly container = new Container();
  public readonly roomLayer = new Container();
  public readonly actorLayer = new Container();
  public readonly projectileLayer = new Container();
  public readonly effectLayer = new Container();

  private readonly library: DungeonAssetLibrary;
  private readonly heroes = new Map<number, HeroVisual>();
  private readonly enemies = new Map<string, EnemyVisual>();
  private readonly projectiles = new Map<string, ProjectileVisual>();
  private readonly loot = new Map<string, Sprite>();
  private readonly effects: TimedEffect[] = [];
  private ambient: SpriteAnimator[] = [];
  private boss: { type: BossType; animator: SpriteAnimator } | null = null;
  private clock = 0;
  private lootTextures: Partial<Record<LootItem['type'], Texture>> = {};

  public constructor(library: DungeonAssetLibrary) {
    this.library = library;
    this.actorLayer.sortableChildren = true;
    this.projectileLayer.sortableChildren = true;
    this.roomLayer.sortableChildren = true;
    this.container.addChild(this.roomLayer, this.actorLayer, this.projectileLayer, this.effectLayer);
  }

  public setRoom(theme: RoomTheme): void {
    for (const animator of this.ambient) {
      this.roomLayer.removeChild(animator.sprite);
      animator.destroy();
    }
    this.ambient = [];
    this.roomLayer.removeChildren().forEach((child) => child.destroy());

    const torch = this.library.getRegion('dungeonTiles', 64, 32, 16, 16);
    if (torch) {
      for (const [x, y] of [[32, 54], [448, 54], [32, 142], [448, 142], [32, 222], [448, 222]]) {
        const sprite = new Sprite({ texture: torch, anchor: { x: 0.5, y: 0.8 }, roundPixels: true });
        sprite.position.set(x, y);
        sprite.scale.set(1.45);
        sprite.tint = theme === 'crypt' ? 0x8dffc2 : theme === 'ember' ? 0xff9b4d : theme === 'court' ? 0xff6b85 : theme === 'throne' ? 0xffd36b : 0x9edfff;
        sprite.zIndex = y;
        this.roomLayer.addChild(sprite);
      }
    }

    for (const prop of ROOM_PROPS[theme]) this.addRoomSprite(prop.key, prop.x, prop.y, prop.scale);
    for (const object of ROOM_OBJECTS[theme]) this.addAtlasSprite(object);

    {
      const positions = theme === 'throne'
        ? [[92, 68], [388, 68]]
        : theme === 'crypt'
          ? [[65, 65], [415, 214]]
          : theme === 'chains'
            ? [[61, 60], [419, 210]]
            : [[86, 198], [394, 72]];
      for (const [x, y] of positions) {
        const animator = new SpriteAnimator(this.library, theme === 'throne' || theme === 'ember' ? 'fx.fire-large' : 'fx.fire');
        animator.sprite.position.set(x, y);
        animator.sprite.zIndex = y;
        animator.sprite.tint = theme === 'crypt' ? 0x68ffbd : theme === 'chains' ? 0x77cfff : theme === 'court' ? 0xff5577 : 0xffffff;
        this.ambient.push(animator);
        this.roomLayer.addChild(animator.sprite);
      }
    }
  }

  public update(
    dt: number,
    heroes: Hero[],
    enemies: Enemy[],
    boss: BossVisualSource | null,
    projectiles: ProjectileEntity[],
    loot: LootItem[],
  ): void {
    this.clock += dt;
    this.syncHeroes(dt, heroes);
    this.syncEnemies(dt, enemies);
    this.syncBoss(dt, boss);
    this.syncProjectiles(dt, projectiles);
    this.syncLoot(loot);
    this.ambient.forEach((animator) => animator.update(dt));
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.elapsed += dt;
      if (effect.elapsed < effect.delay) continue;
      effect.animator.sprite.visible = true;
      effect.animator.update(dt);
      effect.animator.sprite.x += effect.vx * dt;
      effect.animator.sprite.y += effect.vy * dt;
      effect.animator.sprite.rotation += effect.rotationSpeed * dt;
      const activeTime = effect.elapsed - effect.delay;
      if (effect.fadeOut && effect.duration) {
        effect.animator.sprite.alpha = effect.baseAlpha * Math.max(0, 1 - activeTime / effect.duration);
      }
      if (effect.animator.completed || (effect.duration !== undefined && activeTime >= effect.duration)) {
        effect.animator.destroy();
        this.effects.splice(i, 1);
      }
    }
  }

  public playEffect(
    clip: Extract<DungeonClipKey, `fx.${string}`>,
    x: number,
    y: number,
    options: DungeonEffectOptions = {},
  ): void {
    const animator = new SpriteAnimator(this.library, clip);
    if (animator.sprite.texture === Texture.EMPTY) { animator.destroy(); return; }
    animator.sprite.position.set(Math.round(x), Math.round(y));
    animator.sprite.rotation = options.rotation ?? 0;
    animator.sprite.tint = options.tint ?? 0xffffff;
    animator.sprite.alpha = options.alpha ?? 1;
    animator.sprite.scale.set(
      animator.sprite.scale.x * (options.scale ?? 1) * (options.scaleX ?? 1),
      animator.sprite.scale.y * (options.scale ?? 1) * (options.scaleY ?? 1),
    );
    const delay = options.delay ?? 0;
    animator.sprite.visible = delay <= 0;
    this.effects.push({
      animator,
      delay,
      elapsed: 0,
      duration: options.duration,
      baseAlpha: options.alpha ?? 1,
      fadeOut: options.fadeOut ?? false,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      rotationSpeed: options.rotationSpeed ?? 0,
    });
    this.effectLayer.addChild(animator.sprite);
  }

  public destroy(): void {
    this.container.destroy({ children: true });
    this.heroes.clear();
    this.enemies.clear();
    this.projectiles.clear();
    this.loot.clear();
    this.effects.length = 0;
    this.ambient = [];
    this.boss = null;
  }

  private syncHeroes(dt: number, heroes: Hero[]): void {
    const present = new Set(heroes.map((hero) => hero.id));
    this.heroes.forEach((view, id) => {
      if (present.has(id)) return;
      view.animator.destroy();
      this.heroes.delete(id);
    });
    for (const hero of heroes) {
      let view = this.heroes.get(hero.id);
      if (!view) {
        const animator = new SpriteAnimator(this.library, HERO_IDLE[hero.classType]);
        view = { animator, lastAttackTimer: 0 };
        this.heroes.set(hero.id, view);
        this.actorLayer.addChild(animator.sprite);
      }
      const moving = Math.hypot(hero.vx, hero.vy) > 12;
      const targetClip = this.heroClip(hero, moving);
      const restartedAttack = hero.isAttacking && hero.attackTimer > view.lastAttackTimer + 0.03;
      view.animator.setClip(targetClip, restartedAttack);
      view.lastAttackTimer = hero.attackTimer;
      view.animator.setFacing(Math.cos(hero.facingAngle) < -0.08 ? -1 : 1);
      view.animator.update(dt);
      const sprite = view.animator.sprite;
      sprite.position.set(Math.round(hero.x), Math.round(hero.y + 4));
      sprite.zIndex = Math.round(hero.y);
      sprite.rotation = hero.isDowned ? -1.1 : 0;
      sprite.alpha = hero.isDowned ? 0.55 : hero.isInvulnerable && Math.floor(this.clock * 18) % 2 === 0 ? 0.45 : 1;
      sprite.tint = hero.isDowned ? 0x6c6573 : 0xffffff;
    }
  }

  private syncEnemies(dt: number, enemies: Enemy[]): void {
    const present = new Set(enemies.map((enemy) => enemy.id));
    this.enemies.forEach((view, id) => {
      if (present.has(id)) return;
      this.playEffect('fx.enemy-death', view.x, view.y - 5);
      view.animator.destroy();
      this.enemies.delete(id);
    });
    for (const enemy of enemies) {
      let view = this.enemies.get(enemy.id);
      if (!view) {
        const animator = new SpriteAnimator(this.library, this.enemyClip(enemy, false));
        view = { animator, x: enemy.x, y: enemy.y };
        this.enemies.set(enemy.id, view);
        this.actorLayer.addChild(animator.sprite);
      }
      const moving = Math.hypot(enemy.vx, enemy.vy) > 8;
      view.animator.setClip(this.enemyClip(enemy, moving));
      view.animator.setFacing(enemy.vx < -1 ? -1 : 1);
      view.animator.update(dt);
      const sprite = view.animator.sprite;
      sprite.position.set(Math.round(enemy.x), Math.round(enemy.y + 4));
      sprite.zIndex = Math.round(enemy.y);
      sprite.tint = enemy.isFrozen ? 0x8deaff : enemy.isExposed ? 0xa7ffbf : 0xffffff;
      sprite.alpha = enemy.type === 'wraith' ? 0.88 : 1;
      view.x = enemy.x;
      view.y = enemy.y;
    }
  }

  private syncBoss(dt: number, boss: BossVisualSource | null): void {
    if (!boss) {
      if (this.boss) {
        const sprite = this.boss.animator.sprite;
        this.playEffect('fx.explosion', sprite.x, sprite.y - 18, { scale: 1.35 });
        this.boss.animator.destroy();
        this.boss = null;
      }
      return;
    }
    if (!this.boss || this.boss.type !== boss.type) {
      this.boss?.animator.destroy();
      const clip = `boss.${boss.type}.idle` as DungeonClipKey;
      const animator = new SpriteAnimator(this.library, clip);
      this.boss = { type: boss.type, animator };
      this.actorLayer.addChild(animator.sprite);
    }
    const animator = this.boss.animator;
    animator.setFacing(boss.state.includes('charge') ? -1 : 1);
    animator.update(dt);
    const sprite = animator.sprite;
    sprite.position.set(Math.round(boss.x), Math.round(boss.y + 6));
    sprite.zIndex = Math.round(boss.y);
    sprite.tint = boss.phase >= 3 ? 0xffb6ba : 0xffffff;
    if (boss.state.startsWith('telegraph')) {
      const pulse = 1 + Math.sin(this.clock * 22) * 0.045;
      sprite.scale.set(sprite.scale.x * pulse, sprite.scale.y / pulse);
    }
  }

  private syncProjectiles(dt: number, projectiles: ProjectileEntity[]): void {
    const present = new Set(projectiles.map((projectile) => projectile.id));
    this.projectiles.forEach((view, id) => {
      if (present.has(id)) return;
      if (view.animator) view.animator.destroy();
      else view.sprite.destroy();
      this.projectiles.delete(id);
    });
    for (const projectile of projectiles) {
      let view = this.projectiles.get(projectile.id);
      if (!view) {
        if (projectile.element === 'arrow' || projectile.element === 'shadow_blade') {
          const texture = this.library.getTexture('arrow') ?? Texture.EMPTY;
          const sprite = new Sprite({ texture, anchor: 0.5, roundPixels: true });
          sprite.scale.set(projectile.element === 'arrow' ? 0.42 : 0.34);
          sprite.tint = projectile.element === 'arrow' ? 0xf2c14e : 0x7de38a;
          view = { sprite };
        } else {
          const clip: DungeonClipKey = projectile.element === 'lava_wave'
            ? 'fx.fire-large'
            : projectile.element === 'arcane_bolt'
              ? 'fx.magic-bolt'
              : 'fx.fire-ball';
          const animator = new SpriteAnimator(this.library, clip);
          animator.sprite.tint = projectile.element === 'arcane_bolt' ? 0x6ff7ff : projectile.element === 'fire_orb' ? 0xff884a : 0xf2c14e;
          if (projectile.element === 'meteor') animator.sprite.scale.set(animator.sprite.scale.x * 1.45, animator.sprite.scale.y * 1.45);
          view = { sprite: animator.sprite, animator };
        }
        this.projectiles.set(projectile.id, view);
        this.projectileLayer.addChild(view.sprite);
      }
      view.animator?.update(dt);
      view.sprite.position.set(Math.round(projectile.x), Math.round(projectile.y));
      view.sprite.rotation = Math.atan2(projectile.vy, projectile.vx);
      view.sprite.zIndex = Math.round(projectile.y);
      view.sprite.alpha = projectile.element === 'lava_wave' ? 0.72 : 1;
    }
  }

  private syncLoot(items: LootItem[]): void {
    const present = new Set(items.map((item) => item.id));
    this.loot.forEach((sprite, id) => {
      if (present.has(id)) return;
      sprite.destroy();
      this.loot.delete(id);
    });
    for (const item of items) {
      let sprite = this.loot.get(item.id);
      if (!sprite) {
        const texture = this.getLootTexture(item.type);
        sprite = new Sprite({ texture: texture ?? Texture.EMPTY, anchor: 0.5, roundPixels: true });
        sprite.scale.set(1.15);
        this.loot.set(item.id, sprite);
        this.actorLayer.addChild(sprite);
      }
      sprite.position.set(Math.round(item.x), Math.round(item.y - 4 + Math.sin(this.clock * 5 + item.x) * 2));
      sprite.zIndex = Math.round(item.y - 1);
    }
  }

  private heroClip(hero: Hero, moving: boolean): DungeonClipKey {
    if (hero.isCasting) {
      if (hero.classType === 'knight') return 'hero.knight.attack-right';
      if (hero.classType === 'wizard') return 'hero.wizard.cast';
      if (hero.classType === 'rogue') return 'hero.rogue.attack';
      return 'hero.barbarian.attack-2';
    }
    if (hero.isAttacking) {
      if (hero.classType === 'knight') return this.knightAttackClip(hero.facingAngle);
      if (hero.classType === 'wizard') return 'hero.wizard.cast';
      if (hero.classType === 'rogue') return 'hero.rogue.attack';
      return hero.comboStep === 2 ? 'hero.barbarian.attack-2' : 'hero.barbarian.attack-1';
    }
    return moving ? HERO_RUN[hero.classType] : HERO_IDLE[hero.classType];
  }

  private knightAttackClip(angle: number): DungeonClipKey {
    const vertical = Math.sin(angle);
    const horizontal = Math.abs(Math.cos(angle));
    if (vertical > 0.72) return 'hero.knight.attack-down';
    if (vertical < -0.72) return 'hero.knight.attack-up';
    if (vertical > 0.24 && horizontal > 0.35) return 'hero.knight.attack-downright';
    if (vertical < -0.24 && horizontal > 0.35) return 'hero.knight.attack-upright';
    return 'hero.knight.attack-right';
  }

  private enemyClip(enemy: Enemy, moving: boolean): DungeonClipKey {
    const base = `enemy.${enemy.type}`;
    const attackKey = `${base}.attack` as DungeonClipKey;
    if (enemy.telegraphTimer > 0 && attackKey in DUNGEON_CLIPS) return attackKey;
    const runKey = `${base}.run` as DungeonClipKey;
    if (moving && runKey in DUNGEON_CLIPS) return runKey;
    return `${base}.idle` as DungeonClipKey;
  }

  private addRoomSprite(key: DungeonTextureKey, x: number, y: number, scale: number): void {
    const texture = this.library.getTexture(key);
    if (!texture) return;
    const sprite = new Sprite({ texture, anchor: { x: 0.5, y: 0.82 }, roundPixels: true });
    sprite.position.set(x, y);
    sprite.scale.set(scale);
    sprite.alpha = 0.88;
    sprite.zIndex = y;
    this.roomLayer.addChild(sprite);
  }

  private addAtlasSprite(object: RoomObject): void {
    const [x, y, width, height] = object.region;
    const texture = this.library.getRegion('dungeonObjects', x, y, width, height);
    if (!texture) return;
    const sprite = new Sprite({ texture, anchor: { x: 0.5, y: 0.78 }, roundPixels: true });
    sprite.position.set(object.x, object.y);
    sprite.scale.set(object.scale ?? 1);
    sprite.tint = object.tint ?? 0xffffff;
    sprite.zIndex = object.y + 1;
    this.roomLayer.addChild(sprite);
  }

  private getLootTexture(type: LootItem['type']): Texture | undefined {
    const cached = this.lootTextures[type];
    if (cached) return cached;
    const coordinates: Record<LootItem['type'], [number, number]> = {
      health_potion: [272, 32],
      mana_gem: [224, 64],
      soul_orb: [400, 288],
    };
    const [x, y] = coordinates[type];
    const texture = this.library.getRegion('icons', x, y, 16, 16);
    if (texture) this.lootTextures[type] = texture;
    return texture;
  }
}
