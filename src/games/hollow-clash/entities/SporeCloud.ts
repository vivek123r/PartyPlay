import { Graphics } from 'pixi.js';
import { COMBAT_STATS } from '../config';

export class SporeCloud {
  public id: string;
  public x: number;
  public y: number;
  public radius = COMBAT_STATS.SPORE_SHROOM_RADIUS; // 40px
  public lifetime = 2.5; // 2.5s duration
  public maxLifetime = 2.5;
  public tickTimer = 0;
  public tickInterval = 0.3; // Deals damage every 0.3s
  public damagePerTick = 4;
  public ownerId?: number;

  constructor(id: string, x: number, y: number, ownerId?: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
  }

  public update(dt: number, enemies: any[] = []): boolean {
    this.lifetime -= dt;
    this.tickTimer += dt;

    if (this.tickTimer >= this.tickInterval) {
      this.tickTimer -= this.tickInterval;
      this.applyAreaDamage(enemies);
    }

    return this.lifetime > 0;
  }

  public applyAreaDamage(enemies: any[]): void {
    if (!enemies || enemies.length === 0) return;

    for (const enemy of enemies) {
      if (!enemy || (enemy.hp !== undefined && enemy.hp <= 0)) continue;

      const ex = enemy.x ?? 0;
      const ey = enemy.y ?? 0;
      const distSq = (ex - this.x) ** 2 + (ey - this.y) ** 2;

      if (distSq <= this.radius ** 2) {
        if (typeof enemy.takeDamage === 'function') {
          enemy.takeDamage(this.damagePerTick);
        } else if (enemy.hp !== undefined) {
          enemy.hp = Math.max(0, enemy.hp - this.damagePerTick);
        }
      }
    }
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const alphaRatio = Math.max(0, Math.min(1, this.lifetime / this.maxLifetime));

    // Outer bioluminescent green-yellow fungal cloud aura
    g.circle(x, y, this.radius).fill({ color: 0x84cc16, alpha: 0.25 * alphaRatio });
    g.circle(x, y, this.radius * 0.7).fill({ color: 0xa3e635, alpha: 0.35 * alphaRatio });
    g.circle(x, y, this.radius * 0.4).fill({ color: 0xd9f99d, alpha: 0.5 * alphaRatio });

    // Inner pulsing spore specks
    const time = Date.now() * 0.005;
    for (let i = 0; i < 5; i++) {
      const angle = i * ((Math.PI * 2) / 5) + time;
      const dist = 12 + Math.sin(time * 2 + i) * 10;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      g.circle(px, py, 2.5).fill({ color: 0xfacc15, alpha: 0.8 * alphaRatio });
    }
  }
}
