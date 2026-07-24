import { Graphics } from 'pixi.js';
import type { Hero } from './Hero';
import { ARENA_CONFIG } from '../config';

export class BossMinotaur {
  public id = 'boss-minotaur';
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public hp = 500;
  public maxHp = 500;
  public phase = 1;

  public state: 'idle' | 'charging' | 'stunned' | 'slamming' = 'idle';
  public timer = 0;
  public chargeAngle = 0;

  public isStunned = false;
  public stunTimer = 0;
  public isFrozen = false;
  public freezeTimer = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(dt: number, heroes: Hero[]): { triggerLavaShockwave?: boolean; shockwaveX?: number; shockwaveY?: number } {
    const result: { triggerLavaShockwave?: boolean; shockwaveX?: number; shockwaveY?: number } = {};

    // Phase 2 Enrage check at 50% HP
    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) this.isStunned = false;
      return result;
    }

    const activeHeroes = heroes.filter((h) => h.hp > 0);
    if (activeHeroes.length === 0) return result;

    const targetHero = activeHeroes[0];
    const dx = targetHero.x - this.x;
    const dy = targetHero.y - this.y;

    if (this.state === 'idle') {
      this.timer += dt;
      if (this.timer >= 2.0) {
        this.timer = 0;
        if (this.phase === 1 || Math.random() > 0.5) {
          // Bull Charge
          this.state = 'charging';
          this.chargeAngle = Math.atan2(dy, dx);
        } else {
          // Earthshaker Slam
          this.state = 'slamming';
          this.timer = 0;
        }
      }
    } else if (this.state === 'charging') {
      const chargeSpeed = 260;
      this.vx = Math.cos(this.chargeAngle) * chargeSpeed;
      this.vy = Math.sin(this.chargeAngle) * chargeSpeed;

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Wall Impact Check
      const p = ARENA_CONFIG.boundsPadding + 12;
      if (this.x <= p || this.x >= ARENA_CONFIG.width - p || this.y <= p || this.y >= ARENA_CONFIG.height - p) {
        this.state = 'stunned';
        this.isStunned = true;
        this.stunTimer = 2.0;
        this.timer = 0;
      }
    } else if (this.state === 'stunned') {
      this.timer += dt;
      if (this.timer >= 2.0) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'slamming') {
      this.timer += dt;
      if (this.timer >= 1.0) {
        this.state = 'idle';
        this.timer = 0;
        result.triggerLavaShockwave = true;
        result.shockwaveX = this.x;
        result.shockwaveY = this.y;
      }
    }

    return result;
  }

  public takeDamage(dmg: number): void {
    this.hp = Math.max(0, this.hp - dmg);
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Shadow
    g.ellipse(x, y + 10, 16, 6).fill({ color: 0x000000, alpha: 0.5 });

    // Boss Body (Bronze / Blood Red in Phase 2)
    const color = this.phase === 1 ? 0x8e44ad : 0xc0392b;
    g.rect(x - 14, y - 22, 28, 28).fill({ color });

    // Horns
    g.poly([x - 14, y - 22, x - 22, y - 32, x - 10, y - 24]).fill({ color: 0xf1c40f });
    g.poly([x + 14, y - 22, x + 22, y - 32, x + 10, y - 24]).fill({ color: 0xf1c40f });

    // Glowing Red Eyes
    g.rect(x - 6, y - 18, 4, 4).fill({ color: 0xff0055 });
    g.rect(x + 2, y - 18, 4, 4).fill({ color: 0xff0055 });

    // Heavy War Hammer
    g.rect(x + 14, y - 16, 6, 24).fill({ color: 0x7f8c8d });
    g.rect(x + 10, y - 26, 14, 10).fill({ color: 0x2c3e50 });

    // Health Bar
    const barW = 60;
    g.rect(x - barW / 2, y - 38, barW, 5).fill({ color: 0x2c3e50 });
    g.rect(x - barW / 2, y - 38, (this.hp / this.maxHp) * barW, 5).fill({ color: 0xff0055 });
  }
}
