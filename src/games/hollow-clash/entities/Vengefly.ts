import { Graphics } from 'pixi.js';
import type { Knight } from './Knight';
import { CAVERN_CONFIG } from '../config';

type VengeflyState = 'idle_hover' | 'dive_wind_up' | 'diving' | 'recovering';

/**
 * VENGEFLY — Grotesque dive-bombing insectoid horror.
 * Hovers at ceiling level, winds up and screams downward in a dive attack,
 * then curves back up. Has a bloated grotesque body with cracked shell plating.
 */
export class Vengefly {
  public id: string;
  public type = 'vengefly' as const;
  public x: number;
  public y: number;
  public hp: number;
  public maxHp = 25;
  public damage = 1;
  public facing: 'left' | 'right' = 'right';

  public animTimer = Math.random() * 10;
  private state: VengeflyState = 'idle_hover';
  private stateTimer = 0;

  private baseY: number; // hover height
  private targetX = 0;
  private targetY = 0;
  private vx = 0;
  private vy = 0;

  private diveCooldown = 1.5 + Math.random() * 2;

  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.hp = this.maxHp;
  }

  public update(dt: number, knights: Knight[]): void {
    this.animTimer += dt;
    this.stateTimer += dt;

    const activeKnights = knights.filter((k) => k.state.hp > 0);

    // Find nearest knight
    let target = activeKnights[0];
    let minDist = Infinity;
    for (const k of activeKnights) {
      const d = Math.sqrt((k.state.x - this.x) ** 2 + (k.state.y - this.y) ** 2);
      if (d < minDist) { minDist = d; target = k; }
    }

    if (this.state === 'idle_hover') {
      // Hover slowly side-to-side, sinking a bit toward target
      this.x += Math.sin(this.animTimer * 1.5) * 18 * dt;
      this.y += (this.baseY - this.y) * 3 * dt; // return to hover height

      if (target) {
        this.facing = target.state.x > this.x ? 'right' : 'left';
      }

      // Wind up dive when timer expires
      if (this.stateTimer > this.diveCooldown && target && minDist < 200) {
        this.state = 'dive_wind_up';
        this.stateTimer = 0;
        this.targetX = target.state.x + 8;
        this.targetY = target.state.y;
      }

    } else if (this.state === 'dive_wind_up') {
      // Jitter in place, telegraphing the dive for 0.4s
      this.x += Math.sin(this.animTimer * 30) * 1.5;
      if (this.stateTimer > 0.4) {
        this.state = 'diving';
        this.stateTimer = 0;
        // Compute dive velocity toward target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const speed = 380;
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
      }

    } else if (this.state === 'diving') {
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Hit players during dive
      for (const k of activeKnights) {
        if (!k.isInvulnerable && Math.abs(k.state.x - this.x) < 14 && Math.abs(k.state.y - this.y) < 14) {
          k.takeDamage(1);
          this.state = 'recovering';
          this.stateTimer = 0;
          break;
        }
      }

      // Stop dive after 0.5s or hitting floor
      if (this.stateTimer > 0.5 || this.y > CAVERN_CONFIG.height - 40) {
        this.state = 'recovering';
        this.stateTimer = 0;
        this.vx = 0;
        this.vy = 0;
      }

    } else if (this.state === 'recovering') {
      // Float back up to hover height
      this.y += (this.baseY - this.y) * 4 * dt;
      this.x += (this.x > 480 ? -1 : 1) * 20 * dt; // drift back toward center

      if (Math.abs(this.y - this.baseY) < 4 && this.stateTimer > 0.8) {
        this.state = 'idle_hover';
        this.stateTimer = 0;
        this.diveCooldown = 1.8 + Math.random() * 1.5;
      }
    }

    // Bounds clamp
    this.x = Math.max(20, Math.min(CAVERN_CONFIG.width - 20, this.x));
    this.y = Math.max(8, Math.min(CAVERN_CONFIG.height - 20, this.y));
  }

  public takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const faceDir = this.facing === 'right' ? 1 : -1;

    // Wing animation (fast flutter when diving, slow hover otherwise)
    const wingSpeed = this.state === 'diving' ? 40 : (this.state === 'dive_wind_up' ? 60 : 14);
    const wingFlap = Math.sin(this.animTimer * wingSpeed) * 3;

    // Shadow beneath (only when low enough to cast one)
    if (this.y > 50) {
      g.ellipse(x, y + 10, 8, 2).fill({ color: 0x000000, alpha: 0.2 });
    }

    // Wings — translucent membrane with dark chitin veins
    const wingAlpha = this.state === 'diving' ? 0.5 : 0.75;
    // Left wing
    g.ellipse(x - 10, y - 2 + wingFlap, 10, 5).fill({ color: 0x475569, alpha: wingAlpha });
    g.poly([x - 4, y - 1, x - 18, y - 5 + wingFlap, x - 16, y + 1]).stroke({ color: 0x1e293b, width: 1 });
    // Right wing
    g.ellipse(x + 10, y - 2 - wingFlap, 10, 5).fill({ color: 0x475569, alpha: wingAlpha });
    g.poly([x + 4, y - 1, x + 18, y - 5 - wingFlap, x + 16, y + 1]).stroke({ color: 0x1e293b, width: 1 });

    // Bloated grotesque body — chitin-plated abdomen
    g.ellipse(x, y + 2, 7, 9).fill({ color: 0x14532d }); // dark forest body
    g.ellipse(x, y - 1, 6, 5).fill({ color: 0x15803d }); // thorax
    // Chitin plate segments
    g.poly([x - 5, y + 2, x + 5, y + 2, x + 4, y + 7, x - 4, y + 7]).fill({ color: 0x166534 });
    g.poly([x - 4, y + 6, x + 4, y + 6, x + 3, y + 10, x - 3, y + 10]).fill({ color: 0x14532d });

    // Bio-pustule warts on abdomen
    g.circle(x - 3, y + 4, 1.5).fill({ color: 0xa3e635 });
    g.circle(x + 4, y + 6, 1.5).fill({ color: 0x84cc16 });

    // Monstrous skull-face with wide fang mouth
    g.ellipse(x, y - 5, 6, 5).fill({ color: 0x0f172a }); // black head
    // Compound eyes — multi-faceted red orbs
    g.circle(x - 3 * faceDir, y - 6, 2.5).fill({ color: 0xdc2626 });
    g.circle(x - 3 * faceDir, y - 6, 1).fill({ color: 0xfca5a5 }); // specular
    g.circle(x + 2 * faceDir, y - 5, 1.5).fill({ color: 0x991b1b });

    // Jagged mandibles twitching
    const mandWiggle = Math.sin(this.animTimer * 16) * 1.5;
    g.poly([
      x + 3 * faceDir, y - 3,
      x + 7 * faceDir, y - 1 + mandWiggle,
      x + 5 * faceDir, y + 2,
    ]).fill({ color: 0x4ade80 }); // venomous green fangs
    g.poly([
      x + 2 * faceDir, y - 2,
      x + 6 * faceDir, y + 1 - mandWiggle,
      x + 4 * faceDir, y + 3,
    ]).fill({ color: 0x166534 });

    // Dive wind-up telegraph: pulsing red aura
    if (this.state === 'dive_wind_up') {
      const pulseAlpha = (Math.sin(this.animTimer * 20) * 0.5 + 0.5) * 0.7;
      g.circle(x, y, 12 + pulseAlpha * 4).fill({ color: 0xdc2626, alpha: 0.4 * pulseAlpha });
    }

    // HP bar
    if (this.hp < this.maxHp) {
      g.rect(x - 10, y - 18, 20, 2).fill({ color: 0x0f0e17 });
      g.rect(x - 10, y - 18, (this.hp / this.maxHp) * 20, 2).fill({ color: 0xef4444 });
    }
  }
}
