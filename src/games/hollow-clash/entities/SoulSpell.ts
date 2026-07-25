import { Graphics } from 'pixi.js';
import type { SoulSpell as SoulSpellType } from '../types';

export class SoulSpell {
  public id: string;
  public type: SoulSpellType;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public width: number;
  public height: number;
  public radius: number;
  public damage: number;
  public lifetime: number;
  public maxLifetime: number;
  public tickTimer = 0;
  public tickInterval = 0.1;
  public hitEnemies = new Set<any>();

  constructor(
    id: string,
    type: SoulSpellType,
    x: number,
    y: number,
    facingRight: boolean = true,
    customDamage?: number
  ) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;

    switch (type) {
      case 'vengeful_spirit':
        this.vx = facingRight ? 420 : -420;
        this.vy = 0;
        this.radius = 14;
        this.width = 28;
        this.height = 28;
        this.damage = customDamage ?? 40;
        this.lifetime = 1.5;
        break;

      case 'abyssal_shriek':
        this.vx = 0;
        this.vy = 0;
        this.width = 44;
        this.height = 80;
        this.radius = 22;
        this.damage = customDamage ?? 60;
        this.lifetime = 0.4;
        break;

      case 'desolate_dive':
        this.vx = 0;
        this.vy = 600;
        this.width = 24;
        this.height = 32;
        this.radius = 16;
        this.damage = customDamage ?? 30;
        this.lifetime = 0.5;
        break;

      case 'dive_shockwave':
        this.vx = 0;
        this.vy = 0;
        this.width = 100;
        this.height = 24;
        this.radius = 50;
        this.damage = customDamage ?? 50;
        this.lifetime = 0.4;
        break;

      case 'spore_cloud':
        this.vx = 0;
        this.vy = 0;
        this.width = 80;
        this.height = 80;
        this.radius = 40;
        this.damage = customDamage ?? 4;
        this.lifetime = 2.5;
        this.tickInterval = 0.3;
        break;

      case 'focus_heal':
      default:
        this.vx = 0;
        this.vy = 0;
        this.radius = 20;
        this.width = 40;
        this.height = 40;
        this.damage = 0;
        this.lifetime = 0.8;
        break;
    }

    this.maxLifetime = this.lifetime;
  }

  public update(dt: number, enemies: any[] = []): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
    this.tickTimer += dt;

    if (enemies && enemies.length > 0) {
      this.checkHitEnemies(enemies);
    }

    return this.lifetime > 0;
  }

  public checkHitEnemies(enemies: any[]): void {
    if (!enemies || enemies.length === 0 || this.damage <= 0) return;

    for (const enemy of enemies) {
      if (!enemy || (enemy.hp !== undefined && enemy.hp <= 0)) continue;

      let isHit = false;

      if (this.type === 'vengeful_spirit') {
        const ex = enemy.x ?? 0;
        const ey = enemy.y ?? 0;
        const distSq = (ex - this.x) ** 2 + (ey - this.y) ** 2;
        isHit = distSq <= (this.radius + 14) ** 2;
      } else if (this.type === 'abyssal_shriek' || this.type === 'dive_shockwave' || this.type === 'desolate_dive') {
        // AABB check
        const sLeft = this.x;
        const sRight = this.x + this.width;
        const sTop = this.y;
        const sBottom = this.y + this.height;

        let eLeft = enemy.x - 12;
        let eRight = enemy.x + 12;
        let eTop = enemy.y - 20;
        let eBottom = enemy.y + 10;

        if (enemy.type === 'boss_moss_knight' || enemy.type === 'boss') {
          eLeft = enemy.x - 16;
          eRight = enemy.x + 16;
          eTop = enemy.y - 44;
          eBottom = enemy.y + 8;
        }

        isHit = sLeft < eRight && sRight > eLeft && sTop < eBottom && sBottom > eTop;
      } else if (this.type === 'spore_cloud') {
        const ex = enemy.x ?? 0;
        const ey = enemy.y ?? 0;
        const distSq = (ex - this.x) ** 2 + (ey - this.y) ** 2;
        if (distSq <= this.radius ** 2 && this.tickTimer >= this.tickInterval) {
          isHit = true;
        }
      }

      if (isHit) {
        if (this.type === 'spore_cloud') {
          if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(this.damage);
          } else if (enemy.hp !== undefined) {
            enemy.hp = Math.max(0, enemy.hp - this.damage);
          }
        } else if (!this.hitEnemies.has(enemy)) {
          this.hitEnemies.add(enemy);
          if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(this.damage);
          } else if (enemy.hp !== undefined) {
            enemy.hp = Math.max(0, enemy.hp - this.damage);
          }
        }
      }
    }

    if (this.type === 'spore_cloud' && this.tickTimer >= this.tickInterval) {
      this.tickTimer = 0;
    }
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const alphaRatio = Math.max(0, Math.min(1, this.lifetime / this.maxLifetime));

    switch (this.type) {
      case 'vengeful_spirit':
        // Horizontal Cyan Soul Wave Projectile
        g.circle(x, y, this.radius).fill({ color: 0x00f0ff, alpha: 0.7 * alphaRatio });
        g.circle(x, y, this.radius * 0.6).fill({ color: 0xffffff, alpha: 0.9 * alphaRatio });
        g.ellipse(x - (this.vx > 0 ? 8 : -8), y, 12, 7).fill({ color: 0x00f0ff, alpha: 0.5 * alphaRatio });
        g.poly([x, y - 6, x + (this.vx > 0 ? 16 : -16), y, x, y + 6]).fill({ color: 0xffffff, alpha: 0.8 * alphaRatio });
        break;

      case 'abyssal_shriek':
        // Upward Void Column (44x80px) with dark violet / cyan howling souls
        g.rect(x, y, this.width, this.height).fill({ color: 0x4c1d95, alpha: 0.6 * alphaRatio });
        g.rect(x + 4, y + 4, this.width - 8, this.height - 8).fill({ color: 0x00f0ff, alpha: 0.7 * alphaRatio });
        g.rect(x + 10, y + 10, this.width - 20, this.height - 20).fill({ color: 0xffffff, alpha: 0.9 * alphaRatio });
        // Howling Soul Screams
        g.circle(x + 14, y + 20, 6).fill({ color: 0x0f172a, alpha: 0.8 });
        g.circle(x + 30, y + 50, 8).fill({ color: 0x0f172a, alpha: 0.8 });
        break;

      case 'desolate_dive':
        // Downward Slam Body Aura
        g.rect(x, y, this.width, this.height).fill({ color: 0x38bdf8, alpha: 0.8 * alphaRatio });
        g.rect(x + 4, y + 4, this.width - 8, this.height - 8).fill({ color: 0xffffff, alpha: 0.95 * alphaRatio });
        break;

      case 'dive_shockwave':
        // Ground Expanding Quake Wave (100x24px)
        g.rect(x, y, this.width, this.height).fill({ color: 0x0284c7, alpha: 0.7 * alphaRatio });
        g.rect(x + 10, y + 4, this.width - 20, this.height - 8).fill({ color: 0x38bdf8, alpha: 0.85 * alphaRatio });
        g.rect(x + 25, y + 8, this.width - 50, this.height - 16).fill({ color: 0xffffff, alpha: 0.95 * alphaRatio });
        break;

      case 'spore_cloud':
        // Green Fungal Spore Cloud
        g.circle(x, y, this.radius).fill({ color: 0x84cc16, alpha: 0.3 * alphaRatio });
        g.circle(x, y, this.radius * 0.6).fill({ color: 0xa3e635, alpha: 0.4 * alphaRatio });
        break;

      case 'focus_heal':
      default:
        // Channeled Focus Healing Aura Ring
        g.circle(x, y, 20).stroke({ color: 0x00f0ff, width: 2, alpha: 0.8 * alphaRatio });
        g.circle(x, y, 12).fill({ color: 0xffffff, alpha: 0.5 * alphaRatio });
        break;
    }
  }
}
