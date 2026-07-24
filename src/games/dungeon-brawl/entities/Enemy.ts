import { Graphics } from 'pixi.js';
import type { EnemyState, EnemyType } from '../types';
import type { Hero } from './Hero';
import { ARENA_CONFIG } from '../config';

export class Enemy implements EnemyState {
  public id: string;
  public type: EnemyType;
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public hp: number;
  public maxHp: number;
  public moveSpeed: number;
  public damage: number;
  public attackCooldown = 0;
  public isStunned = false;
  public stunTimer = 0;
  public isFrozen = false;
  public freezeTimer = 0;
  public color: number;

  constructor(id: string, type: EnemyType, startX: number, startY: number) {
    this.id = id;
    this.type = type;
    this.x = startX;
    this.y = startY;

    if (type === 'skeleton') {
      this.maxHp = 50;
      this.moveSpeed = 100;
      this.damage = 15;
      this.color = 0xbdc3c7;
    } else if (type === 'goblin') {
      this.maxHp = 35;
      this.moveSpeed = 130;
      this.damage = 12;
      this.color = 0x2ecc71;
    } else if (type === 'slime') {
      this.maxHp = 60;
      this.moveSpeed = 85;
      this.damage = 18;
      this.color = 0x9b59b6;
    } else {
      // mini_slime
      this.maxHp = 25;
      this.moveSpeed = 110;
      this.damage = 10;
      this.color = 0x8e44ad;
    }

    this.hp = this.maxHp;
  }

  public update(dt: number, heroes: Hero[]): { shootArrow?: boolean; targetX?: number; targetY?: number } {
    const result: { shootArrow?: boolean; targetX?: number; targetY?: number } = {};

    // 1. Status Effects
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.isStunned = false;
      return result;
    }
    if (this.freezeTimer > 0) {
      this.freezeTimer -= dt;
      if (this.freezeTimer <= 0) this.isFrozen = false;
      return result;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Find Nearest Active Hero
    const activeHeroes = heroes.filter((h) => h.hp > 0);
    if (activeHeroes.length === 0) return result;

    let nearestHero = activeHeroes[0];
    let minDistSq = Infinity;
    for (const h of activeHeroes) {
      const distSq = (h.x - this.x) ** 2 + (h.y - this.y) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearestHero = h;
      }
    }

    const dist = Math.sqrt(minDistSq);
    const dirX = (nearestHero.x - this.x) / (dist || 1);
    const dirY = (nearestHero.y - this.y) / (dist || 1);

    // AI Behavior Trees
    if (this.type === 'goblin') {
      // Goblin Archer Kiting AI: Maintains 120px distance and fires arrows
      if (dist < 100) {
        // Retreat
        this.vx = -dirX * this.moveSpeed;
        this.vy = -dirY * this.moveSpeed;
      } else if (dist > 160) {
        // Approach
        this.vx = dirX * this.moveSpeed;
        this.vy = dirY * this.moveSpeed;
      } else {
        this.vx = 0;
        this.vy = 0;
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 2.2;
          result.shootArrow = true;
          result.targetX = nearestHero.x;
          result.targetY = nearestHero.y;
        }
      }
    } else {
      // Melee AI (Skeleton & Slimes)
      this.vx = dirX * this.moveSpeed;
      this.vy = dirY * this.moveSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Arena Bounds Clamp
    const p = ARENA_CONFIG.boundsPadding;
    this.x = Math.max(p, Math.min(ARENA_CONFIG.width - p, this.x));
    this.y = Math.max(p, Math.min(ARENA_CONFIG.height - p, this.y));

    return result;
  }

  public takeDamage(dmg: number, knockX = 0, knockY = 0): void {
    this.hp = Math.max(0, this.hp - dmg);
    this.x += knockX * 0.15;
    this.y += knockY * 0.15;
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Shadow
    g.ellipse(x, y + 5, 7, 3).fill({ color: 0x000000, alpha: 0.35 });

    if (this.isFrozen) {
      g.circle(x, y - 4, 10).fill({ color: 0x00f0ff, alpha: 0.7 });
    }

    if (this.type === 'skeleton') {
      g.rect(x - 4, y - 10, 8, 12).fill({ color: this.color });
      g.rect(x - 3, y - 14, 6, 5).fill({ color: 0xecf0f1 });
      g.rect(x - 2, y - 12, 1, 1).fill({ color: 0x000000 });
      g.rect(x + 1, y - 12, 1, 1).fill({ color: 0x000000 });
      g.rect(x + 4, y - 6, 2, 8).fill({ color: 0x7f8c8d }); // Sword

    } else if (this.type === 'goblin') {
      g.rect(x - 4, y - 8, 8, 10).fill({ color: this.color });
      g.rect(x - 3, y - 12, 6, 5).fill({ color: 0x27ae60 });
      g.rect(x - 6, y - 10, 2, 2).fill({ color: 0x27ae60 }); // Ears
      g.rect(x + 4, y - 10, 2, 2).fill({ color: 0x27ae60 });

    } else if (this.type === 'slime') {
      const bounce = Math.abs(Math.sin(Date.now() * 0.008)) * 3;
      g.ellipse(x, y - 5 - bounce, 9, 7).fill({ color: this.color });
      g.circle(x - 3, y - 7 - bounce, 2).fill({ color: 0xffffff });
      g.circle(x + 3, y - 7 - bounce, 2).fill({ color: 0xffffff });

    } else {
      // mini_slime
      g.ellipse(x, y - 3, 5, 4).fill({ color: this.color });
    }

    // Health Bar
    if (this.hp < this.maxHp) {
      const barW = 14;
      g.rect(x - barW / 2, y - 18, barW, 3).fill({ color: 0x2c3e50 });
      g.rect(x - barW / 2, y - 18, (this.hp / this.maxHp) * barW, 3).fill({ color: 0xe74c3c });
    }
  }
}
