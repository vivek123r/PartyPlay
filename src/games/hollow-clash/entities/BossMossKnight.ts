import { Graphics } from 'pixi.js';
import type { BossState, EnemyUnit } from '../types';
import type { Knight } from './Knight';
import { CAVERN_CONFIG } from '../config';

export interface ShockwaveData {
  x: number;
  y: number;
  dir: number;
}

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

  public state: 'idle' | 'cleaving' | 'guarding' | 'spore_explosion' | 'vine_slam' | 'leap' = 'idle';
  public timer = 0;
  public facing: 'left' | 'right' = 'left';

  public isStunned = false;
  public stunTimer = 0;

  public hitFlashTimer = 0;
  public auraParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number }[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(dt: number, knights: Knight[]): { triggerVineShockwave?: boolean; shockwaves?: ShockwaveData[] } {
    const result: { triggerVineShockwave?: boolean; shockwaves?: ShockwaveData[] } = {};

    // Hit flash timer
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // Phase 2 transition check at 50% HP threshold
    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.isEnraged = true;
    }

    const activeKnights = knights.filter((k) => k.state.hp > 0);
    if (activeKnights.length > 0) {
      const target = activeKnights[0];
      if (this.state === 'idle') {
        this.facing = target.state.x > this.x ? 'right' : 'left';
      }
    }

    this.timer += dt;
    const idleDuration = this.phase === 1 ? 1.8 : 0.9; // Accelerated attack timers in Phase 2!

    if (this.state === 'idle') {
      if (this.timer >= idleDuration) {
        this.timer = 0;
        const rand = Math.random();
        if (this.phase === 1) {
          // Phase 1 attacks: Melee slash, leap strike, vine shockwave spell, guarding
          if (rand < 0.35) this.state = 'cleaving';
          else if (rand < 0.65) this.state = 'leap';
          else if (rand < 0.85) this.state = 'vine_slam';
          else this.state = 'guarding';
        } else {
          // Phase 2 (Enraged): Melee slash, leap strike, double vine shockwave, spore explosion
          if (rand < 0.35) this.state = 'cleaving';
          else if (rand < 0.65) this.state = 'leap';
          else if (rand < 0.85) this.state = 'vine_slam';
          else this.state = 'spore_explosion';
        }
      }
    } else if (this.state === 'cleaving') {
      if (this.timer >= 0.8) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'leap') {
      // Perform leap motion
      if (this.timer <= 0.1) {
        this.vy = -220;
        this.vx = this.facing === 'right' ? 140 : -140;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 600 * dt; // Gravity

      // Floor ground collision
      const groundY = CAVERN_CONFIG.height - 32;
      if (this.y >= groundY) {
        this.y = groundY;
        this.vy = 0;
        this.vx = 0;
      }

      if (this.timer >= 1.0) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'guarding') {
      if (this.timer >= 1.5) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'spore_explosion') {
      if (this.timer >= 1.0) {
        this.state = 'idle';
        this.timer = 0;
      }
    } else if (this.state === 'vine_slam') {
      if (this.timer >= 0.9) {
        this.state = 'idle';
        this.timer = 0;
        result.triggerVineShockwave = true;
        const groundY = CAVERN_CONFIG.height - 32;
        if (this.phase === 1) {
          result.shockwaves = [
            { x: this.x, y: groundY, dir: this.facing === 'right' ? 1 : -1 }
          ];
        } else {
          // Double shockwave in Phase 2!
          result.shockwaves = [
            { x: this.x, y: groundY, dir: 1 },
            { x: this.x, y: groundY, dir: -1 }
          ];
        }
      }
    }

    // Bounds clamp (x max = 940)
    this.x = Math.max(20, Math.min(940, this.x));

    // Check boss attack hitboxes dealing 1 Mask damage to active players
    for (const knight of activeKnights) {
      if (knight.isInvulnerable) continue;

      let hit = false;
      const faceDir = this.facing === 'right' ? 1 : -1;

      // Contact damage with boss body
      const dx = Math.abs(knight.state.x - this.x);
      const dy = Math.abs(knight.state.y - this.y);
      if (dx < 24 && dy < 32) {
        hit = true;
      }

      // Cleave Attack Hitbox
      if (this.state === 'cleaving' && this.timer > 0.2 && this.timer < 0.6) {
        const cleaveX = this.x + 24 * faceDir;
        if (Math.abs(knight.state.x - cleaveX) < 30 && Math.abs(knight.state.y - (this.y - 16)) < 30) {
          hit = true;
        }
      }

      // Leap Slam Hitbox
      if (this.state === 'leap' && this.timer > 0.4 && this.timer < 0.8) {
        if (Math.abs(knight.state.x - this.x) < 36 && Math.abs(knight.state.y - this.y) < 30) {
          hit = true;
        }
      }

      // Spore Explosion Hitbox
      if (this.state === 'spore_explosion' && this.timer > 0.3 && this.timer < 0.8) {
        if (Math.sqrt((knight.state.x - this.x) ** 2 + (knight.state.y - (this.y - 16)) ** 2) < 45) {
          hit = true;
        }
      }

      if (hit) {
        knight.takeDamage(1);
      }
    }

    // Update Enraged Visual Particles
    if (this.isEnraged) {
      if (Math.random() < 0.4) {
        this.auraParticles.push({
          x: this.x + (Math.random() - 0.5) * 30,
          y: this.y - Math.random() * 40,
          vx: (Math.random() - 0.5) * 20,
          vy: -30 - Math.random() * 30,
          life: 0.5,
          maxLife: 0.5,
          color: 0xe67e22,
        });
      }
    }

    for (let i = this.auraParticles.length - 1; i >= 0; i--) {
      const p = this.auraParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.auraParticles.splice(i, 1);
    }

    return result;
  }

  public takeDamage(amount: number): void {
    if (this.state === 'guarding') return; // Blocks frontal damage during guard stance!

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.15;

    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.isEnraged = true;
    }
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const faceDir = this.facing === 'right' ? 1 : -1;

    // Enraged Aura Particles
    for (const p of this.auraParticles) {
      g.circle(p.x, p.y, 3).fill({ color: p.color, alpha: p.life / p.maxLife });
    }

    // Shadow
    g.ellipse(x, y + 4, 18, 6).fill({ color: 0x000000, alpha: 0.5 });

    // Hit Flash
    if (this.hitFlashTimer > 0) {
      g.rect(x - 16, y - 48, 32, 48).fill({ color: 0xffffff });
      return;
    }

    // Mossy Cloak & Giant Armor Body
    const armorColor = this.phase === 1 ? 0x27ae60 : 0xe67e22;
    g.rect(x - 14, y - 32, 28, 32).fill({ color: armorColor });
    g.rect(x - 16, y - 30, 32, 8).fill({ color: 0x1e272e }); // Shoulder Guards

    // Horned Helmet
    g.rect(x - 10, y - 44, 20, 14).fill({ color: 0x2c3e50 });
    g.poly([x - 10, y - 44, x - 18, y - 56, x - 6, y - 44]).fill({ color: 0xf1c40f });
    g.poly([x + 10, y - 44, x + 18, y - 56, x + 6, y - 44]).fill({ color: 0xf1c40f });

    // Glowing Eyes (Yellow in P1, Crimson Red in P2 Enraged)
    const eyeColor = this.phase === 1 ? 0xf1c40f : 0xff0000;
    g.circle(x - 4 * faceDir, y - 38, 2).fill({ color: eyeColor });
    g.circle(x + 4 * faceDir, y - 38, 2).fill({ color: eyeColor });

    // Shield Guard Stance Graphics
    if (this.state === 'guarding') {
      g.rect(x + 8 * faceDir, y - 32, 8, 28).fill({ color: 0x7f8c8d });
      g.rect(x + 6 * faceDir, y - 32, 12, 28).stroke({ color: 0x2ecc71, width: 2 });
    }

    // Greatsword Cleave Arc Graphics
    if (this.state === 'cleaving') {
      const sx = x + 24 * faceDir;
      g.circle(sx, y - 20, 22).fill({ color: this.phase === 1 ? 0x2ecc71 : 0xe67e22, alpha: 0.6 });
      g.circle(sx, y - 20, 22).stroke({ color: 0xffffff, width: 2 });
    }

    // Leap Slam Graphics
    if (this.state === 'leap') {
      g.ellipse(x, y, 20, 8).fill({ color: 0xe67e22, alpha: 0.7 });
    }

    // Spore Explosion Wave
    if (this.state === 'spore_explosion') {
      g.circle(x, y - 16, 40).fill({ color: 0xe74c3c, alpha: 0.5 });
      g.circle(x, y - 16, 40).stroke({ color: 0xff4757, width: 2 });
    }
  }
}
