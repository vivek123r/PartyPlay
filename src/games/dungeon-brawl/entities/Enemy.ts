import { Graphics } from 'pixi.js';
import type { EnemyState, EnemyType } from '../types';
import type { Hero } from './Hero';
import { ARENA_CONFIG } from '../config';

const STATS: Record<EnemyType, { hp: number; speed: number; damage: number; color: number; radius: number }> = {
  skeleton: { hp: 54, speed: 77, damage: 13, color: 0xd7e0e8, radius: 10 }, goblin: { hp: 39, speed: 102, damage: 11, color: 0x7de38a, radius: 9 }, slime: { hp: 68, speed: 63, damage: 15, color: 0xa66bea, radius: 12 }, mini_slime: { hp: 25, speed: 94, damage: 8, color: 0x7f4bc0, radius: 7 }, imp: { hp: 44, speed: 88, damage: 16, color: 0xff884a, radius: 9 }, wraith: { hp: 48, speed: 112, damage: 18, color: 0x8c8dff, radius: 10 }, brute: { hp: 130, speed: 52, damage: 24, color: 0xb44d5a, radius: 15 },
};

export class Enemy implements EnemyState {
  public id: string; public type: EnemyType; public x: number; public y: number; public vx = 0; public vy = 0;
  public hp: number; public maxHp: number; public moveSpeed: number; public damage: number; public attackCooldown = 0;
  public isStunned = false; public stunTimer = 0; public isFrozen = false; public freezeTimer = 0; public isExposed = false; public exposedTimer = 0;
  public color: number; public radius: number; public telegraphTimer = 0; public blinkTimer = 0; public targetHeroId = 0; public anim = 0;

  constructor(id: string, type: EnemyType, x: number, y: number, healthMultiplier = 1) {
    const stat = STATS[type]; this.id = id; this.type = type; this.x = x; this.y = y; this.maxHp = Math.round(stat.hp * healthMultiplier); this.hp = this.maxHp; this.moveSpeed = stat.speed; this.damage = stat.damage; this.color = stat.color; this.radius = stat.radius;
  }

  public update(dt: number, heroes: Hero[], neighbors: Enemy[]): { shoot?: boolean; fireZone?: boolean; target?: Hero } {
    this.anim += dt; this.attackCooldown = Math.max(0, this.attackCooldown - dt); this.stunTimer = Math.max(0, this.stunTimer - dt); this.freezeTimer = Math.max(0, this.freezeTimer - dt); this.exposedTimer = Math.max(0, this.exposedTimer - dt); this.telegraphTimer = Math.max(0, this.telegraphTimer - dt); this.blinkTimer = Math.max(0, this.blinkTimer - dt);
    this.isStunned = this.stunTimer > 0; this.isFrozen = this.freezeTimer > 0; this.isExposed = this.exposedTimer > 0;
    if (this.isStunned || this.isFrozen) { this.vx *= 0.8; this.vy *= 0.8; return {}; }
    const active = heroes.filter((hero) => hero.isAlive);
    if (!active.length) return {};
    let target = active[0]; let best = Infinity;
    for (const hero of active) { const dist = (hero.x - this.x) ** 2 + (hero.y - this.y) ** 2 - (hero.barrierTimer > 0 ? 900 : 0); if (dist < best) { best = dist; target = hero; } }
    this.targetHeroId = target.id; const dist = Math.sqrt(Math.max(1, best)); const dx = (target.x - this.x) / dist; const dy = (target.y - this.y) / dist;
    let speed = this.moveSpeed;
    const result: { shoot?: boolean; fireZone?: boolean; target?: Hero } = { target };
    if (this.type === 'goblin' || this.type === 'imp') {
      const preferred = this.type === 'goblin' ? 124 : 96;
      if (dist < preferred - 18) { this.vx = -dx * speed; this.vy = -dy * speed; }
      else if (dist > preferred + 18) { this.vx = dx * speed; this.vy = dy * speed; }
      else { this.vx *= 0.65; this.vy *= 0.65; if (this.attackCooldown <= 0) { this.attackCooldown = this.type === 'goblin' ? 1.8 : 2.2; this.telegraphTimer = 0.48; result.shoot = this.type === 'goblin'; result.fireZone = this.type === 'imp'; } }
    } else if (this.type === 'wraith') {
      if (this.blinkTimer <= 0 && dist > 55) { this.x += dx * Math.min(38, dist - 42); this.y += dy * Math.min(38, dist - 42); this.blinkTimer = 2.6; this.telegraphTimer = 0.35; }
      this.vx = dx * speed; this.vy = dy * speed;
    } else if (this.type === 'brute') { speed *= this.attackCooldown <= 0 ? 1.2 : 0.75; this.vx = dx * speed; this.vy = dy * speed; if (dist < 28 && this.attackCooldown <= 0) { this.attackCooldown = 1.45; this.telegraphTimer = 0.42; } }
    else { this.vx = dx * speed; this.vy = dy * speed; }
    for (const neighbor of neighbors) { if (neighbor === this || neighbor.hp <= 0) continue; const nx = this.x - neighbor.x; const ny = this.y - neighbor.y; const nd = Math.hypot(nx, ny) || 1; const min = this.radius + neighbor.radius; if (nd < min) { this.vx += nx / nd * 45; this.vy += ny / nd * 45; } }
    this.x += this.vx * dt; this.y += this.vy * dt; const p = ARENA_CONFIG.boundsPadding + 4; this.x = Math.max(p, Math.min(ARENA_CONFIG.width - p, this.x)); this.y = Math.max(p + 8, Math.min(ARENA_CONFIG.height - p - 8, this.y));
    return result;
  }

  public takeDamage(damage: number, knockX = 0, knockY = 0): number { const multiplier = this.isExposed ? 1.25 : 1; const dealt = Math.round(damage * multiplier); this.hp = Math.max(0, this.hp - dealt); this.vx += knockX; this.vy += knockY; return dealt; }

  public render(g: Graphics, clock: number, drawBody = true): void {
    const x = Math.round(this.x); const y = Math.round(this.y); const hop = this.type === 'slime' || this.type === 'mini_slime' ? Math.round(Math.abs(Math.sin(clock * 7 + x)) * 3) : 0;
    g.ellipse(x, y + 6, this.radius, Math.max(3, this.radius * 0.35)).fill({ color: 0x07030b, alpha: 0.5 });
    if (this.isFrozen) g.circle(x, y - 5, this.radius + 4).fill({ color: 0x6ff7ff, alpha: 0.24 });
    if (this.isExposed) g.circle(x, y - 6, this.radius + 3).stroke({ color: 0x7de38a, width: 2, alpha: 0.85 });
    if (drawBody && this.type === 'skeleton') { g.rect(x - 6, y - 10, 12, 15).fill({ color: this.color }); g.rect(x - 5, y - 18, 10, 8).fill({ color: 0xf2f4eb }); g.rect(x - 3, y - 15, 2, 2).fill({ color: 0x24142f }); g.rect(x + 1, y - 15, 2, 2).fill({ color: 0x24142f }); g.rect(x + 7, y - 9, 2, 14).fill({ color: 0xb9a77e }); }
    else if (drawBody && this.type === 'goblin') { g.rect(x - 5, y - 10, 10, 15).fill({ color: this.color }); g.rect(x - 7, y - 16, 14, 8).fill({ color: 0x5cae6a }); g.poly([x - 7, y - 15, x - 12, y - 20, x - 6, y - 19]).fill({ color: this.color }); g.poly([x + 7, y - 15, x + 12, y - 20, x + 6, y - 19]).fill({ color: this.color }); }
    else if (drawBody && (this.type === 'slime' || this.type === 'mini_slime')) { g.ellipse(x, y - 4 - hop, this.radius, this.radius * 0.72).fill({ color: this.color }); g.rect(x - Math.max(3, this.radius - 5), y - 7 - hop, 2, 2).fill({ color: 0xffffff }); g.rect(x + Math.max(1, this.radius - 7), y - 7 - hop, 2, 2).fill({ color: 0xffffff }); }
    else if (drawBody && this.type === 'imp') { g.rect(x - 5, y - 10, 10, 14).fill({ color: this.color }); g.poly([x - 7, y - 10, x - 13, y - 19, x - 4, y - 15]).fill({ color: 0x902d4b }); g.poly([x + 7, y - 10, x + 13, y - 19, x + 4, y - 15]).fill({ color: 0x902d4b }); g.circle(x, y - 14, 5).fill({ color: 0xffc077 }); }
    else if (drawBody && this.type === 'wraith') { g.poly([x - 9, y + 4, x + 9, y + 4, x + 5, y - 16, x, y - 22, x - 5, y - 16]).fill({ color: this.color, alpha: 0.86 }); g.rect(x - 4, y - 14, 2, 2).fill({ color: 0x6ff7ff }); g.rect(x + 2, y - 14, 2, 2).fill({ color: 0x6ff7ff }); }
    else if (drawBody) { g.rect(x - 10, y - 13, 20, 18).fill({ color: this.color }); g.rect(x - 8, y - 22, 16, 10).fill({ color: 0xd8b08b }); g.rect(x - 11, y - 17, 3, 22).fill({ color: 0x4f3240 }); g.rect(x + 10, y - 17, 3, 22).fill({ color: 0x4f3240 }); }
    if (this.telegraphTimer > 0) g.circle(x, y + 5, this.radius + 7).stroke({ color: 0xffd36b, width: 2, alpha: 0.85 });
    if (this.hp < this.maxHp) { const width = this.radius * 2; g.rect(x - width / 2, y - 28, width, 3).fill({ color: 0x1b1324 }); g.rect(x - width / 2, y - 28, width * this.hp / this.maxHp, 3).fill({ color: this.isExposed ? 0x7de38a : 0xe05263 }); }
  }
}
