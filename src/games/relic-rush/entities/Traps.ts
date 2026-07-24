import { Container, Graphics } from 'pixi.js';

export type TrapType = 'rolling_boulder' | 'spiked_crusher' | 'dart_shooter' | 'flame_jet';

export class Trap {
  public type: TrapType;
  public laneIndex: number;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public vx = 0;
  public vy = 0;
  public isActive = true;
  public isShattered = false;
  public isWarning = false;
  public isFiring = false;

  public container: Container;
  public graphics: Graphics;
  private particleGraphics: Graphics;
  private animTimer = Math.random() * Math.PI * 2;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: number }> = [];

  constructor(type: TrapType, laneIndex: number, x: number, y: number, width = 20, height = 20) {
    this.type = type;
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.container = new Container();
    this.graphics = new Graphics();
    this.particleGraphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.addChild(this.particleGraphics);

    if (this.type === 'rolling_boulder') {
      this.vx = -180; // Fast rolling boulder!
    } else if (this.type === 'spiked_crusher') {
      this.vy = 160;
    }

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public update(dt: number, boundsWidth: number): void {
    this.animTimer += dt;
    this.updateParticles(dt);
    if (!this.isActive || this.isShattered) return;

    // Flame Jet Telegraph State Machine
    if (this.type === 'flame_jet') {
      const cycle = Math.floor(this.animTimer * 2) % 6;
      this.isWarning = cycle === 3 || cycle === 4;
      this.isFiring = cycle === 5 || cycle === 0;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < -40 || this.x > boundsWidth + 40 || this.y > 400) {
      this.isActive = false;
    }

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public shatter(): void {
    if (this.isShattered) return;
    this.isShattered = true;
    this.graphics.visible = false;

    // Spawn 16 stone debris particles
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const spd = 40 + Math.random() * 60;
      this.particles.push({
        x: this.width / 2,
        y: this.height / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.4,
        color: i % 2 === 0 ? 0xf4d160 : 0x7f8c8d,
      });
    }
  }

  private render(): void {
    this.graphics.clear();
    const w = this.width;
    const h = this.height;

    if (this.type === 'rolling_boulder') {
      // 20x20 Textured Stone Boulder with Cracks & Rotation
      this.graphics.rect(0, 0, w, h).fill({ color: 0x4a4a4a });
      this.graphics.rect(2, 2, w - 4, h - 4).fill({ color: 0x7f8c8d });
      this.graphics.rect(3, 3, 4, 4).fill({ color: 0xfffffe, alpha: 0.4 });

      // Stone Crack Lines
      const rot = Math.floor(this.animTimer * 12) % 4;
      if (rot === 0) {
        this.graphics.rect(4, 8, 8, 2).fill({ color: 0x2d3436 });
        this.graphics.rect(10, 10, 2, 6).fill({ color: 0x2d3436 });
      } else {
        this.graphics.rect(8, 4, 2, 8).fill({ color: 0x2d3436 });
        this.graphics.rect(10, 10, 6, 2).fill({ color: 0x2d3436 });
      }

      // Spikes
      this.graphics.rect(-2, 8, 3, 4).fill({ color: 0xd63031 });
      this.graphics.rect(w - 1, 8, 3, 4).fill({ color: 0xd63031 });
      this.graphics.rect(8, -2, 4, 3).fill({ color: 0xd63031 });
      this.graphics.rect(8, h - 1, 4, 3).fill({ color: 0xd63031 });
    } else if (this.type === 'spiked_crusher') {
      // Falling Spiked Crusher Block
      this.graphics.rect(0, 0, w, h).fill({ color: 0x2d3436 });
      this.graphics.rect(2, 2, w - 4, h - 4).fill({ color: 0x636e72 });
      this.graphics.rect(4, 4, w - 8, 2).fill({ color: 0xfffffe, alpha: 0.5 });
      for (let i = 0; i < w; i += 4) {
        this.graphics.rect(i, h, 2, 6).fill({ color: 0xbdc3c7 });
        this.graphics.rect(i, h, 1, 6).fill({ color: 0xfffffe });
      }
    } else if (this.type === 'flame_jet') {
      // Animated Flame Jet Emitter Block
      this.graphics.rect(0, 0, w, h).fill({ color: 0xd35400 });
      this.graphics.rect(2, 2, w - 4, h - 4).fill({ color: 0xe67e22 });
      this.graphics.rect(4, 4, w - 8, h - 8).fill({ color: 0xf4d160 });

      if (this.isWarning) {
        // Blinking Orange Warning Dots
        this.graphics.rect(6, -8, 4, 4).fill({ color: 0xe67e22 });
      } else if (this.isFiring) {
        // Full Flame Column Blast (24px height)
        const flameH = 22 + Math.sin(this.animTimer * 16) * 4;
        this.graphics.rect(2, -flameH, w - 4, flameH).fill({ color: 0xd63031 });
        this.graphics.rect(5, -flameH + 2, w - 10, flameH - 4).fill({ color: 0xf4d160 });
        this.graphics.rect(7, -flameH + 4, w - 14, flameH - 6).fill({ color: 0xfffffe });
      }
    } else {
      // Dart Shooter Block
      this.graphics.rect(0, 0, w, h).fill({ color: 0x3d2314 });
      this.graphics.rect(4, 6, w - 8, 4).fill({ color: 0x0f0e17 });
    }
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
