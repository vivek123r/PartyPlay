import { Graphics } from 'pixi.js';
import type { BossState, EnemyUnit } from '../types';
import type { Knight } from './Knight';
import { CAVERN_CONFIG } from '../config';

export class BossMossKnight implements BossState {
  public type: EnemyUnit = 'boss_moss_knight';
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;

  public hp = 600;
  public maxHp = 600;
  public phase = 1;
  public isEnraged = false;

  public state: 'idle' | 'cleaving' | 'guarding' | 'spore_explosion' | 'vine_slam' = 'idle';
  public timer = 0;
  public facing: 'left' | 'right' = 'left';

  public isStunned = false;
  public stunTimer = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(dt: number, knights: Knight[]): { triggerVineShockwave?: boolean; shockwaveX?: number; shockwaveY?: number } {
    const result: { triggerVineShockwave?: boolean; shockwaveX?: number; shockwaveY?: number } = {};

    // Phase 2 check at 50% HP
    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.isEnraged = true;
    }

    const activeKnights = knights.filter((k) => k.state.hp > 0);
    if (activeKnights.length === 0) return result;

    const target = activeKnights[0];
    this.facing = target.state.x > this.x ? 'right' : 'left';

    this.timer += dt;

    if (this.state === 'idle') {
      if (this.timer >= 1.8) {
        this.timer = 0;
        if (this.phase === 1) {
          this.state = Math.random() > 0.5 ? 'cleaving' : 'guarding';
        } else {
          this.state = Math.random() > 0.5 ? 'spore_explosion' : 'vine_slam';
        }
      }
    } else if (this.state === 'cleaving') {
      if (this.timer >= 1.0) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'guarding') {
      if (this.timer >= 2.0) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'spore_explosion') {
      if (this.timer >= 1.2) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'vine_slam') {
      if (this.timer >= 1.0) {
        this.state = 'idle';
        this.timer = 0;
        result.triggerVineShockwave = true;
        result.shockwaveX = this.x;
        result.shockwaveY = CAVERN_CONFIG.height - 32;
      }
    }

    return result;
  }

  public takeDamage(amount: number): void {
    if (this.state === 'guarding') return; // Blocks frontal damage during guard stance!

    this.hp = Math.max(0, this.hp - amount);
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const faceDir = this.facing === 'right' ? 1 : -1;

    // Shadow
    g.ellipse(x, y + 4, 18, 6).fill({ color: 0x000000, alpha: 0.5 });

    // Mossy Cloak & Giant Armor Body
    const armorColor = this.phase === 1 ? 0x27ae60 : 0xe67e22;
    g.rect(x - 14, y - 32, 28, 32).fill({ color: armorColor });
    g.rect(x - 16, y - 30, 32, 8).fill({ color: 0x1e272e }); // Shoulder Guards

    // Horned Helmet
    g.rect(x - 10, y - 44, 20, 14).fill({ color: 0x2c3e50 });
    g.poly([x - 10, y - 44, x - 18, y - 56, x - 6, y - 44]).fill({ color: 0xf1c40f });
    g.poly([x + 10, y - 44, x + 18, y - 56, x + 6, y - 44]).fill({ color: 0xf1c40f });

    // Glowing Yellow Eyes
    g.circle(x - 4 * faceDir, y - 38, 2).fill({ color: 0xf1c40f });
    g.circle(x + 4 * faceDir, y - 38, 2).fill({ color: 0xf1c40f });

    // Shield Guard Stance Graphics
    if (this.state === 'guarding') {
      g.rect(x + 8 * faceDir, y - 32, 8, 28).fill({ color: 0x7f8c8d });
      g.rect(x + 6 * faceDir, y - 32, 12, 28).stroke({ color: 0x2ecc71, width: 2 });
    }

    // Greatsword Cleave Arc Graphics
    if (this.state === 'cleaving') {
      const sx = x + 24 * faceDir;
      g.circle(sx, y - 20, 22).fill({ color: 0x2ecc71, alpha: 0.6 });
      g.circle(sx, y - 20, 22).stroke({ color: 0xffffff, width: 2 });
    }

    // Spore Explosion Wave
    if (this.state === 'spore_explosion') {
      g.circle(x, y - 16, 40).fill({ color: 0x00f0ff, alpha: 0.5 });
      g.circle(x, y - 16, 40).stroke({ color: 0x1abc9c, width: 2 });
    }

    // 2-Phase Boss Health Bar (Top Screen)
    const barW = 200;
    const barX = CAVERN_CONFIG.width / 2 - barW / 2;
    const barY = 28;

    g.rect(barX - 2, barY - 2, barW + 4, 10).fill({ color: 0x0f0e17 });
    g.rect(barX, barY, (this.hp / this.maxHp) * barW, 6).fill({ color: this.phase === 1 ? 0x2ecc71 : 0xe74c3c });
  }
}
