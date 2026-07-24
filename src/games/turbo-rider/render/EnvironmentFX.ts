import { Graphics, Container } from 'pixi.js';

interface FXParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
  size: number;
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
        color: 0xf4d160,
        size: 2,
      });
    }
  }

  public spawnNitroFlames(x: number, y: number, colorHex: number): void {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + 4,
        vx: (Math.random() - 0.5) * 20,
        vy: 40 + Math.random() * 40,
        life: 0.2,
        color: colorHex,
        size: 3,
      });
    }
  }

  public update(dt: number, speed: number, viewW: number, viewH: number): void {
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

    // 2. High-Speed Radial Speed Lines (> 160 km/h)
    if (speed > 160) {
      const numLines = Math.floor((speed - 160) / 10) + 4;
      for (let i = 0; i < numLines; i++) {
        const lx = Math.random() * viewW;
        const ly = Math.random() * viewH;
        const len = 15 + Math.random() * 30;
        this.graphics.rect(lx, ly, 1, len).fill({ color: 0xfffffe, alpha: 0.3 });
      }
    }

    // 3. Update & Render FX Particles
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life > 0) {
        this.graphics.rect(Math.round(p.x), Math.round(p.y), p.size, p.size).fill({ color: p.color });
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
