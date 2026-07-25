import { Graphics } from 'pixi.js';
import type { Knight } from './Knight';
import { CAVERN_CONFIG } from '../config';

export interface AcidBlob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
}

export class AcidSpitter {
  public id: string;
  public type = 'acid_spitter' as const;
  public x: number;
  public y: number;
  public hp: number;
  public maxHp = 40;
  public damage = 1;
  public facing: 'left' | 'right' = 'left';

  public animTimer = Math.random() * 10;
  public shootTimer = 0;
  public shootInterval = 2.5; // shoot every 2.5s
  public blobs: AcidBlob[] = [];

  // Grotesque visual state
  private sacPulse = 0;

  constructor(id: string, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = this.maxHp;
    this.shootTimer = Math.random() * this.shootInterval; // stagger initial shot
  }

  public update(dt: number, knights: Knight[]): void {
    this.animTimer += dt;
    this.sacPulse = Math.sin(this.animTimer * 4) * 2;
    this.shootTimer += dt;

    const activeKnights = knights.filter((k) => k.state.hp > 0);
    if (activeKnights.length === 0) return;

    // Face nearest knight
    let nearest = activeKnights[0];
    let minDist = Infinity;
    for (const k of activeKnights) {
      const d = Math.abs(k.state.x - this.x);
      if (d < minDist) { minDist = d; nearest = k; }
    }
    this.facing = nearest.state.x > this.x ? 'right' : 'left';

    // Shoot acid blob arc at target every interval
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      this.fireAcidBlob(nearest.state.x, nearest.state.y);
    }

    // Update blobs (arc gravity)
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i];
      b.vy += 600 * dt; // gravity
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Hit players
      for (const k of activeKnights) {
        if (!k.isInvulnerable) {
          const dx = Math.abs(k.state.x - b.x);
          const dy = Math.abs(k.state.y - b.y);
          if (dx < b.radius + 8 && dy < b.radius + 8) {
            k.takeDamage(1);
            b.life = 0; // destroy blob on hit
          }
        }
      }

      if (b.life <= 0 || b.y > CAVERN_CONFIG.height) {
        this.blobs.splice(i, 1);
      }
    }
  }

  private fireAcidBlob(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.max(80, Math.sqrt(dx * dx + dy * dy));

    // Parabolic arc: solve for vx/vy to reach target in ~1s with gravity
    const flightTime = 1.0;
    const gravity = 600;
    const vx = dx / flightTime;
    const vy = dy / flightTime - 0.5 * gravity * flightTime;

    this.blobs.push({
      x: this.x + (this.facing === 'right' ? 10 : -10),
      y: this.y - 8,
      vx: Math.max(-400, Math.min(400, vx)),
      vy: Math.max(-500, Math.min(-80, vy)),
      life: 2.5,
      maxLife: 2.5,
      radius: 6,
    });
  }

  public takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const faceDir = this.facing === 'right' ? 1 : -1;
    const sac = this.sacPulse;

    // Draw acid blobs in flight
    for (const b of this.blobs) {
      const bx = Math.round(b.x);
      const by = Math.round(b.y);
      const alphaRatio = b.life / b.maxLife;
      // Dripping acid blob: layered circles with green/yellow glow
      g.circle(bx, by, b.radius).fill({ color: 0x4ade80, alpha: 0.85 * alphaRatio });
      g.circle(bx, by, b.radius * 0.55).fill({ color: 0xd9f99d, alpha: 0.95 * alphaRatio });
      // Drip trail
      g.ellipse(bx, by + b.radius + 2, 2, 3).fill({ color: 0x84cc16, alpha: 0.6 * alphaRatio });
    }

    // -- Grotesque Acid Spitter body --

    // Bloated pulsating belly sac (neon bile-green)
    g.ellipse(x, y - 5 + sac, 11, 9 + sac * 0.5).fill({ color: 0x166534 });
    g.ellipse(x, y - 4 + sac, 8, 7).fill({ color: 0x15803d });
    // Bio-sludge vein lines across belly
    g.poly([x - 5, y - 8, x - 3, y - 2, x, y - 6]).stroke({ color: 0x4ade80, width: 1 });
    g.poly([x + 3, y - 8, x + 5, y - 3]).stroke({ color: 0x4ade80, width: 1 });

    // Pustule acid blisters (swollen yellow-green)
    g.circle(x - 4, y - 7, 3).fill({ color: 0xbef264 });
    g.circle(x + 5, y - 5, 2.5).fill({ color: 0xa3e635 });

    // Bloated acid gland throat / spit nozzle
    g.ellipse(x + 8 * faceDir, y - 6, 5, 4).fill({ color: 0x15803d });
    g.ellipse(x + 11 * faceDir, y - 6, 3, 3).fill({ color: 0x4ade80 }); // Acid nozzle tip
    // Oozing drip from nozzle
    const dripY = y - 3 + Math.sin(this.animTimer * 8) * 1.5;
    g.ellipse(x + 11 * faceDir, dripY, 1.5, 2.5).fill({ color: 0xd9f99d, alpha: 0.8 });

    // Stubby vestigial legs (dark chitin)
    g.poly([x - 6, y, x - 10, y + 5, x - 4, y + 3]).fill({ color: 0x0f172a });
    g.poly([x + 6, y, x + 10, y + 5, x + 4, y + 3]).fill({ color: 0x0f172a });

    // Void eyes — sunken & glowing sickly yellow
    g.circle(x + 3 * faceDir, y - 9, 2.5).fill({ color: 0xfef08a });
    g.circle(x + 3 * faceDir, y - 9, 1).fill({ color: 0x0f172a }); // Slit pupil

    // Twitching antennae
    const antennaWiggle = Math.sin(this.animTimer * 12) * 2;
    g.poly([x + 2 * faceDir, y - 12, x + 6 * faceDir, y - 18 + antennaWiggle]).stroke({ color: 0x4ade80, width: 1 });
    g.poly([x + 4 * faceDir, y - 11, x + 9 * faceDir, y - 16 + antennaWiggle * 0.7]).stroke({ color: 0x4ade80, width: 1 });

    // Shooting flash when about to fire
    if (this.shootTimer > this.shootInterval - 0.3) {
      const flashAlpha = (this.shootTimer - (this.shootInterval - 0.3)) / 0.3;
      g.circle(x + 12 * faceDir, y - 6, 5 + flashAlpha * 3).fill({ color: 0xfde047, alpha: 0.7 * flashAlpha });
    }

    // HP bar
    if (this.hp < this.maxHp) {
      g.rect(x - 12, y - 18, 24, 3).fill({ color: 0x0f0e17 });
      g.rect(x - 12, y - 18, (this.hp / this.maxHp) * 24, 3).fill({ color: 0x84cc16 });
    }
  }
}
