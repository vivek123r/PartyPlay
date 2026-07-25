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
      // Mutant Spore Husk
      // Pulsating spore sac (bio-green 0x15803d)
      const pulseRadius = 7 + Math.sin(this.animTimer * 6) * 1.5;
      g.ellipse(x, y - 4, pulseRadius, 5).fill({ color: 0x15803d });
      // Fungal spore spots
      g.circle(x - 3, y - 6, 2).fill({ color: 0x4c1d95 });
      g.circle(x + 2, y - 5, 2).fill({ color: 0xa855f7 });

      // Dripping bio-sludge droplets underneath
      const dropY = y + 1 + Math.sin(this.animTimer * 10) * 2;
      g.circle(x - 2, dropY, 1.5).fill({ color: 0x15803d });
      g.circle(x + 3, dropY + 1, 1).fill({ color: 0x4c1d95 });

      // Twitching mandibles (dark 0x0f172a)
      const mandibleY = Math.sin(this.animTimer * 14) * 2;
      g.poly([x + 4 * faceDir, y - 2, x + 9 * faceDir, y - 5 + mandibleY, x + 5 * faceDir, y]).fill({ color: 0x0f172a });

      // Asymmetrical void cyan eye
      g.circle(x + 4 * faceDir, y - 4, 2).fill({ color: 0x00f0ff });

      // Twitching insect wings
      const wingY = y - 8 + Math.sin(this.animTimer * 20) * 2;
      g.ellipse(x - 2, wingY, 6, 3).fill({ color: 0x475569, alpha: 0.6 });
    } else if (this.type === 'mantis_crawler') {
      // Jagged Thorn Crawler
      // Chitin exoskeleton body (dark forest 0x14532d)
      g.rect(x - 7, y - 12, 14, 12).fill({ color: 0x14532d });
      // Serrated chitin scythes (bio-green 0x15803d)
      g.poly([x + 6 * faceDir, y - 14, x + 14 * faceDir, y - 2, x + 10 * faceDir, y - 2, x + 5 * faceDir, y - 7]).fill({ color: 0x15803d });
      // Serrated thorns on scythe
      g.poly([x + 9 * faceDir, y - 10, x + 12 * faceDir, y - 6, x + 8 * faceDir, y - 6]).fill({ color: 0x4c1d95 });

      // Crimson multi-eyespots (0xd97706 / 0xff0055)
      g.circle(x + 3 * faceDir, y - 9, 2).fill({ color: 0xd97706 });
      g.circle(x + 5 * faceDir, y - 7, 1.5).fill({ color: 0xff0055 });
      g.circle(x + 1 * faceDir, y - 10, 1.5).fill({ color: 0xd97706 });

      // Twitching mandibles
      g.poly([x + 5 * faceDir, y - 4, x + 8 * faceDir, y - 2, x + 6 * faceDir, y]).fill({ color: 0x0f172a });
    } else {
      // Chitin Shield Abomination
      // Dark abyssal body (0x0f172a)
      g.rect(x - 7, y - 16, 14, 16).fill({ color: 0x0f172a });
      // Bone-ribbed shield (0x334155 / 0xf8fafc)
      g.poly([x + 4 * faceDir, y - 18, x + 11 * faceDir, y - 14, x + 11 * faceDir, y - 2, x + 4 * faceDir, y + 2]).fill({ color: 0x334155 });
      // Ribbed spine plates across shield
      g.poly([x + 5 * faceDir, y - 14, x + 9 * faceDir, y - 14]).stroke({ color: 0xf8fafc, width: 1 });
      g.poly([x + 5 * faceDir, y - 8, x + 9 * faceDir, y - 8]).stroke({ color: 0xf8fafc, width: 1 });
      g.poly([x + 5 * faceDir, y - 2, x + 9 * faceDir, y - 2]).stroke({ color: 0xf8fafc, width: 1 });

      // Bio-slime trail under body (0x15803d)
      g.ellipse(x, y + 1, 8, 2).fill({ color: 0x15803d, alpha: 0.7 });

      // Pulsating purple core eye (0x9333ea)
      g.circle(x - 2 * faceDir, y - 10, 2.5).fill({ color: 0x9333ea });
    }

    // Health Bar
    if (this.hp < this.maxHp) {
      g.rect(x - 10, y - 22, 20, 3).fill({ color: 0x0f0e17 });
      g.rect(x - 10, y - 22, (this.hp / this.maxHp) * 20, 3).fill({ color: 0xe74c3c });
    }
  }
}
