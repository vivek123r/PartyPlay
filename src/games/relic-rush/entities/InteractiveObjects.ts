import { Container, Graphics } from 'pixi.js';

export class BreakableCrate {
  public laneIndex: number;
  public x: number;
  public y: number;
  public width = 16;
  public height = 16;
  public health = 1;
  public isDestroyed = false;

  public container: Container;
  public graphics: Graphics;
  private particleGraphics: Graphics;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: number }> = [];

  constructor(laneIndex: number, x: number, y: number) {
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.graphics = new Graphics();
    this.particleGraphics = new Graphics();

    this.container.addChild(this.graphics);
    this.container.addChild(this.particleGraphics);

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public update(dt: number): void {
    this.updateParticles(dt);
  }

  public breakCrate(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.graphics.visible = false;

    // Spawn 12 wood debris particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const spd = 30 + Math.random() * 50;
      this.particles.push({
        x: 8,
        y: 8,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.35,
        color: i % 2 === 0 ? 0x5c3d2e : 0x3d2314,
      });
    }
  }

  private render(): void {
    this.graphics.clear();
    const w = this.width;
    const h = this.height;

    // Wooden Crate Texture
    this.graphics.rect(0, 0, w, h).fill({ color: 0x3d2314 });
    this.graphics.rect(1, 1, w - 2, h - 2).fill({ color: 0x5c3d2e });
    // Cross Braces
    this.graphics.rect(2, 2, w - 4, 2).fill({ color: 0x3d2314 });
    this.graphics.rect(2, h - 4, w - 4, 2).fill({ color: 0x3d2314 });
    this.graphics.rect(2, 2, 2, h - 4).fill({ color: 0x3d2314 });
    this.graphics.rect(w - 4, 2, 2, h - 4).fill({ color: 0x3d2314 });
    this.graphics.rect(4, 4, 8, 8).fill({ color: 0x3d2314, alpha: 0.4 });
  }

  private updateParticles(dt: number): void {
    this.particleGraphics.clear();
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life > 0) {
        this.particleGraphics.rect(Math.round(p.x), Math.round(p.y), 3, 3).fill({ color: p.color });
        return true;
      }
      return false;
    });
  }

  public destroy(): void {
    this.particleGraphics.destroy();
    this.graphics.destroy();
    this.container.destroy();
  }
}

export class WaterZone {
  public laneIndex: number;
  public x: number;
  public y: number;
  public width: number;
  public height: number;

  public container: Container;
  public graphics: Graphics;
  private animTimer = Math.random() * Math.PI * 2;

  constructor(laneIndex: number, x: number, y: number, width = 64, height = 32) {
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public update(dt: number): void {
    this.animTimer += dt * 3;
    this.render();
  }

  private render(): void {
    this.graphics.clear();
    const w = this.width;
    const h = this.height;

    // Translucent Blue Water Surface & Body
    this.graphics.rect(0, 0, w, h).fill({ color: 0x0984e3, alpha: 0.65 });
    this.graphics.rect(0, 0, w, 2).fill({ color: 0x74b9ff });

    // Animated Surface Ripples
    const offset = Math.floor(this.animTimer * 4) % 16;
    for (let rx = offset; rx < w; rx += 16) {
      this.graphics.rect(rx, 1, 6, 1).fill({ color: 0xfffffe, alpha: 0.8 });
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
