import { Graphics, Container } from 'pixi.js';

interface FXParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  size0: number;
  ramp?: number[]; // optional colour-over-life sequence; overrides `color` when present
}

const NITRO_RAMP = [0xffffff, 0xfff176, 0xffa726, 0xff5722, 0x4a4a4a]; // white-hot -> yellow -> orange -> red -> smoke

function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

function colorAlongRamp(ramp: number[], t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const segCount = ramp.length - 1;
  const segF = clamped * segCount;
  const seg = Math.min(segCount - 1, Math.floor(segF));
  return mixColor(ramp[seg], ramp[seg + 1], segF - seg);
}

export class EnvironmentFX {
  public container: Container;
  private graphics: Graphics;
  private particles: FXParticle[] = [];
  public shakeIntensity = 0;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public triggerShake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  public spawnBrakeSparks(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const spd = 60 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.25,
        maxLife: 0.25,
        color: 0xf4d160,
        size: 2,
        size0: 2,
      });
    }
  }

  /** Cone-shaped flame plume from the two exhaust pipes, colour-ramped white -> smoke over its life. */
  public spawnNitroFlames(leftX: number, rightX: number, y: number, colorHex: number, count = 4): void {
    const ramp = [mixColor(0xffffff, colorHex, 0.2), ...NITRO_RAMP.slice(1)];
    for (let i = 0; i < count; i++) {
      const pipeX = i % 2 === 0 ? leftX : rightX;
      const spread = (Math.random() - 0.5) * 0.6; // cone half-angle, radians
      const spd = 55 + Math.random() * 55;
      this.particles.push({
        x: pipeX + (Math.random() - 0.5) * 2,
        y,
        vx: Math.sin(spread) * spd * 0.5,
        vy: Math.cos(spread) * spd + 15,
        life: 0.3,
        maxLife: 0.3,
        color: colorHex,
        size: 3,
        size0: 3,
        ramp,
      });
    }
  }

  /** Multi-colour confetti burst fired the moment a bike crosses the finish line. */
  public spawnFinishBurst(x: number, y: number): void {
    const colors = [0xf4d160, 0x00f0ff, 0x55efc4, 0xff4757, 0xa29bfe, 0xffffff];
    for (let i = 0; i < 28; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 90;
      const duration = 0.6 + Math.random() * 0.5;
      const size = 2 + Math.random() * 2;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 30,
        life: duration,
        maxLife: duration,
        color: colors[Math.floor(Math.random() * colors.length)],
        size,
        size0: size,
      });
    }
  }

  /** One-shot ignition bloom fired on the rising edge of nitro activation. */
  public spawnNitroIgnition(x: number, y: number, colorHex: number): void {
    const ramp = [0xffffff, colorHex];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * 100,
        vy: Math.sin(ang) * 100 * 0.4 - 20,
        life: 0.22,
        maxLife: 0.22,
        color: colorHex,
        size: 4,
        size0: 4,
        ramp,
      });
    }
  }

  public update(dt: number, speed: number, viewW: number, viewH: number, density = 1, isNitroActive = false): void {
    this.graphics.clear();

    // 1. Screen Shake Decay
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.3) {
      shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
      shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity *= 0.82;
    } else {
      this.shakeIntensity = 0;
    }
    this.container.position.set(shakeX, shakeY);

    // 2. Radial speed streaks — genuinely radiate outward from the vanishing point, rather
    // than scattering randomly, and intensify under nitro rather than only above 160 km/h.
    const vanishX = viewW / 2;
    const vanishY = viewH * 0.3;
    if (speed > 160 || isNitroActive) {
      const baseCount = isNitroActive ? 10 : Math.floor((speed - 160) / 10) + 4;
      const numLines = Math.max(0, Math.round(baseCount * density));
      const maxReach = Math.max(viewW, viewH) * 0.6;
      for (let i = 0; i < numLines; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 6 + Math.random() * maxReach;
        const len = 15 + Math.random() * 30;
        const cosA = Math.cos(ang);
        const sinA = Math.sin(ang);
        const x1 = vanishX + cosA * dist;
        const y1 = vanishY + sinA * dist;
        const x2 = vanishX + cosA * (dist + len);
        const y2 = vanishY + sinA * (dist + len);
        const color = isNitroActive ? 0xffa726 : 0xfffffe;
        this.graphics.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 1, color, alpha: isNitroActive ? 0.45 : 0.3 });
      }
    }

    // 3. Nitro vignette + warm tint
    if (isNitroActive) {
      this.graphics.rect(0, 0, viewW, viewH).fill({ color: 0xff6f00, alpha: 0.06 });
      const vig = Math.max(4, Math.round(viewH * 0.08));
      this.graphics.rect(0, 0, viewW, vig).fill({ color: 0x000000, alpha: 0.22 });
      this.graphics.rect(0, viewH - vig, viewW, vig).fill({ color: 0x000000, alpha: 0.22 });
      this.graphics.rect(0, 0, vig, viewH).fill({ color: 0x000000, alpha: 0.18 });
      this.graphics.rect(viewW - vig, 0, vig, viewH).fill({ color: 0x000000, alpha: 0.18 });
    }

    // 4. Update & Render FX Particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life > 0) {
        const t = 1 - p.life / p.maxLife;
        const color = p.ramp ? colorAlongRamp(p.ramp, t) : p.color;
        const size = Math.max(1, p.size0 * (1 - t * 0.6));
        const alpha = Math.max(0, 1 - t);
        this.graphics.rect(Math.round(p.x), Math.round(p.y), size, size).fill({ color, alpha });
        return true;
      }
      return false;
    });
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
