import { Container, Graphics } from 'pixi.js';

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type?: 'firefly' | 'rain' | 'leaf' | 'ember' | 'dust' | 'snow' | 'star';
}

export class EnvironmentParticles {
  public container: Container;
  private graphics: Graphics;
  private particles: AmbientParticle[] = [];

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public spawnGoldStarBurst(x: number, y: number, count = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const spd = 60 + Math.random() * 90;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 30, // Upward arc
        life: 1.5,
        maxLife: 1.5,
        color: i % 2 === 0 ? 0xffde7d : 0xfffffe,
        size: 3,
        type: 'star',
      });
    }
  }

  public initWorldTheme(worldId: string, width: number, height: number): void {
    this.particles = [];

    if (worldId === 'jungle') {
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -15 + Math.random() * 30,
          vy: 20 + Math.random() * 25,
          life: 3 + Math.random() * 3,
          maxLife: 6,
          color: 0x00b894,
          size: 3,
          type: 'leaf',
        });
      }
    } else if (worldId === 'ice_cave') {
      for (let i = 0; i < 25; i++) {
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -10 + Math.random() * 20,
          vy: 30 + Math.random() * 40,
          life: 2 + Math.random() * 3,
          maxLife: 5,
          color: 0x81ecec,
          size: 2,
          type: 'snow',
        });
      }
    } else if (worldId === 'volcano') {
      for (let i = 0; i < 25; i++) {
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -20 + Math.random() * 40,
          vy: -40 - Math.random() * 40,
          life: 2 + Math.random() * 2,
          maxLife: 4,
          color: Math.random() > 0.5 ? 0xff7675 : 0xf4d160,
          size: 2,
          type: 'ember',
        });
      }
    } else {
      for (let i = 0; i < 18; i++) {
        this.particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -15 + Math.random() * 30,
          vy: -15 + Math.random() * 30,
          life: 2 + Math.random() * 3,
          maxLife: 5,
          color: Math.random() > 0.5 ? 0x55efc4 : 0xffde7d,
          size: 2,
          type: 'firefly',
        });
      }
    }
  }

  public update(dt: number, width: number, height: number): void {
    this.graphics.clear();
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'star') {
        p.vy += 60 * dt; // Gravity curve for victory stars
      }

      p.life -= dt;

      if (p.type !== 'star') {
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        if (p.life <= 0) p.life = p.maxLife;
      }

      if (p.life > 0) {
        const alpha = Math.min(1.0, p.life / (p.maxLife * 0.3));
        this.graphics
          .rect(Math.round(p.x), Math.round(p.y), p.size, p.size)
          .fill({ color: p.color, alpha });
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
