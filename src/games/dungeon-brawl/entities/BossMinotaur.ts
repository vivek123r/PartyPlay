import { Graphics } from 'pixi.js';
import type { Hero } from './Hero';
import { ARENA_CONFIG } from '../config';

export class BossMinotaur {
  public id = 'boss-minotaur'; public x: number; public y: number; public hp: number; public maxHp: number; public phase = 1; public state: 'stalk' | 'telegraph-charge' | 'charge' | 'telegraph-slam' | 'stunned' = 'stalk'; public timer = 0; public attackCooldown = 1.2; public chargeAngle = 0; public isStunned = false; public stunTimer = 0; public isFrozen = false; public freezeTimer = 0; public radius = 24; public invulnerable = false; private attackIndex = 0;
  constructor(x: number, y: number, players: number, difficulty: number) { this.x = x; this.y = y; this.maxHp = Math.round((620 + players * 120) * difficulty); this.hp = this.maxHp; }
  public update(dt: number, heroes: Hero[]): { shockwave?: boolean; summon?: boolean; chargeHit?: boolean } {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt); this.timer += dt; this.stunTimer = Math.max(0, this.stunTimer - dt); this.isStunned = this.stunTimer > 0; this.phase = this.hp <= this.maxHp * .25 ? 3 : this.hp <= this.maxHp * .6 ? 2 : 1;
    const living = heroes.filter(hero => hero.isAlive); if (!living.length) return {};
    const target = living.reduce((best, hero) => Math.hypot(hero.x - this.x, hero.y - this.y) < Math.hypot(best.x - this.x, best.y - this.y) ? hero : best, living[0]);
    if (this.state === 'stunned') { if (!this.isStunned) { this.state = 'stalk'; this.timer = 0; } return {}; }
    if (this.state === 'telegraph-charge') { if (this.timer > .68) { this.state = 'charge'; this.timer = 0; } return {}; }
    if (this.state === 'telegraph-slam') { if (this.timer > .82) { this.state = 'stalk'; this.timer = 0; this.attackCooldown = 1.1; return { shockwave: true, summon: this.phase >= 2 }; } return {}; }
    if (this.state === 'charge') { const speed = this.phase === 3 ? 315 : 268; this.x += Math.cos(this.chargeAngle) * speed * dt; this.y += Math.sin(this.chargeAngle) * speed * dt; const p = ARENA_CONFIG.boundsPadding + this.radius; if (this.x <= p || this.x >= ARENA_CONFIG.width - p || this.y <= p || this.y >= ARENA_CONFIG.height - p) { this.x = Math.max(p, Math.min(ARENA_CONFIG.width - p, this.x)); this.y = Math.max(p, Math.min(ARENA_CONFIG.height - p, this.y)); this.state = 'stunned'; this.stunTimer = 1.8; this.isStunned = true; return {}; } return { chargeHit: true }; }
    const dist = Math.hypot(target.x - this.x, target.y - this.y); if (dist > 76) { this.x += (target.x - this.x) / dist * 42 * dt; this.y += (target.y - this.y) / dist * 42 * dt; }
    if (this.attackCooldown <= 0) { this.timer = 0; this.attackIndex++; if (this.phase > 1 && this.attackIndex % 2 === 0) this.state = 'telegraph-slam'; else { this.state = 'telegraph-charge'; this.chargeAngle = Math.atan2(target.y - this.y, target.x - this.x); } }
    return {};
  }
  public takeDamage(damage: number): number { if (this.invulnerable) return 0; this.hp = Math.max(0, this.hp - damage); return damage; }
  public render(g: Graphics, clock: number): void { const x = Math.round(this.x); const y = Math.round(this.y); const enraged = this.phase === 3; g.ellipse(x, y + 15, 26, 8).fill({ color: 0x08030a, alpha: .6 }); if (this.state.startsWith('telegraph')) g.circle(x, y, this.state === 'telegraph-slam' ? 62 : 34).stroke({ color: 0xff884a, width: 2, alpha: .8 }); g.rect(x - 19, y - 29, 38, 38).fill({ color: enraged ? 0xb3384c : 0x783d72 }); g.rect(x - 15, y - 43, 30, 17).fill({ color: 0x6b3d39 }); g.poly([x - 13, y - 40, x - 30, y - 53, x - 22, y - 33]).fill({ color: 0xf2c14e }); g.poly([x + 13, y - 40, x + 30, y - 53, x + 22, y - 33]).fill({ color: 0xf2c14e }); g.rect(x - 9, y - 38, 5, 4).fill({ color: 0xff526b }); g.rect(x + 4, y - 38, 5, 4).fill({ color: 0xff526b }); g.rect(x + 20, y - 25, 5, 34).fill({ color: 0x795444 }); g.rect(x + 14, y - 35, 17, 12).fill({ color: 0x4a2d42 }); if (this.isStunned) g.circle(x, y - 49, 3 + Math.sin(clock * 16)).fill({ color: 0xf2c14e }); }
}
