import { Graphics } from 'pixi.js';
import type { EnemyUnit } from '../types';
import type { Knight } from './Knight';
import { CAVERN_CONFIG } from '../config';

export class Enemy {
  public id: string;
  public type: EnemyUnit;
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;

  public hp: number;
  public maxHp: number;
  public damage: number;
  public moveSpeed: number;
  public facing: 'left' | 'right' = 'left';

  public isShielding = false;
  public animTimer = Math.random() * 10;

  constructor(id: string, type: EnemyUnit, x: number, y: number) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;

    if (type === 'spore_bug') {
      this.maxHp = 30;
      this.damage = 1;
      this.moveSpeed = 110;
    } else if (type === 'mantis_crawler') {
      this.maxHp = 50;
      this.damage = 1;
      this.moveSpeed = 130;
    } else {
      // shielded_husk
      this.maxHp = 70;
      this.damage = 1;
      this.moveSpeed = 70;
      this.isShielding = true;
    }

    this.hp = this.maxHp;
  }

  public update(dt: number, knights: Knight[]): void {
    this.animTimer += dt;
    const activeKnights = knights.filter((k) => k.state.hp > 0);
    if (activeKnights.length === 0) return;

    let nearest = activeKnights[0];
    let minDist = Infinity;
    for (const k of activeKnights) {
      const d = Math.sqrt((k.state.x - this.x) ** 2 + (k.state.y - this.y) ** 2);
      if (d < minDist) {
        minDist = d;
        nearest = k;
      }
    }

    this.facing = nearest.state.x > this.x ? 'right' : 'left';
    const dirX = nearest.state.x > this.x ? 1 : -1;

    if (this.type === 'spore_bug') {
      // Sine Wave Flying AI
      this.vx = dirX * this.moveSpeed * 0.8;
      this.vy = Math.sin(this.animTimer * 5) * 60;
    } else if (this.type === 'mantis_crawler') {
      // Ground Lunge AI
      if (minDist < 100) {
        this.vx = dirX * this.moveSpeed * 1.5;
      } else {
        this.vx = dirX * this.moveSpeed * 0.6;
      }
    } else {
      // Shielded Husk Slow March
      this.vx = dirX * this.moveSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds clamp (x max = 940)
    this.x = Math.max(20, Math.min(Math.min(940, CAVERN_CONFIG.width - 20), this.x));
    this.y = Math.max(20, Math.min(CAVERN_CONFIG.height - 40, this.y));
  }

  public takeDamage(amount: number, attackDir?: 'left' | 'right' | 'down'): void {
    // Shielded Husk blocks frontal strikes! Must be pogoed from above or hit from behind!
    if (this.type === 'shielded_husk' && attackDir && attackDir !== 'down') {
      const isFrontal = (this.facing === 'left' && attackDir === 'right') || (this.facing === 'right' && attackDir === 'left');
      if (isFrontal) return; // Blocked!
    }

    this.hp = Math.max(0, this.hp - amount);
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const faceDir = this.facing === 'right' ? 1 : -1;

    if (this.type === 'spore_bug') {
      // Flying Bug
      g.ellipse(x, y, 7, 5).fill({ color: 0x1abc9c });
      g.circle(x + 4 * faceDir, y - 2, 2).fill({ color: 0x00f0ff });
      // Wings
      const wingY = y - 6 + Math.sin(this.animTimer * 20) * 3;
      g.ellipse(x, wingY, 6, 3).fill({ color: 0xffffff, alpha: 0.7 });
    } else if (this.type === 'mantis_crawler') {
      // Mantis
      g.rect(x - 6, y - 12, 12, 12).fill({ color: 0x27ae60 });
      g.poly([x + 6 * faceDir, y - 14, x + 12 * faceDir, y - 4, x + 6 * faceDir, y - 6]).fill({ color: 0x2ecc71 }); // Scythe
      g.circle(x + 3 * faceDir, y - 10, 2).fill({ color: 0xf1c40f });
    } else {
      // Shielded Husk
      g.rect(x - 7, y - 16, 14, 16).fill({ color: 0x34495e });
      g.rect(x + 5 * faceDir, y - 16, 6, 16).fill({ color: 0x7f8c8d }); // Heavy Shield
      g.circle(x - 2 * faceDir, y - 12, 2).fill({ color: 0xe74c3c });
    }

    // Health Bar
    if (this.hp < this.maxHp) {
      g.rect(x - 10, y - 22, 20, 3).fill({ color: 0x0f0e17 });
      g.rect(x - 10, y - 22, (this.hp / this.maxHp) * 20, 3).fill({ color: 0xe74c3c });
    }
  }
}
