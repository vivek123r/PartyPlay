import { Graphics, Container } from 'pixi.js';

export class Projectile {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius = 4;
  public isAlive = true;

  public container: Container;
  public graphics: Graphics;
  private animTimer = 0;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;

    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  private render(): void {
    this.graphics.clear();

    // 4x4 Glowing Red/Yellow Orb with Spinning Crosshair
    const size = 8;
    this.graphics.rect(0, 0, size, size).fill({ color: 0xff2e63 });
    this.graphics.rect(1, 1, size - 2, size - 2).fill({ color: 0xffde7d });
    this.graphics.rect(2, 2, size - 4, size - 4).fill({ color: 0xfffffe });

    // Particle Trail behind movement direction
    const trailX = this.vx > 0 ? -3 : size + 1;
    this.graphics.rect(trailX, 3, 2, 2).fill({ color: 0xff2e63 });
  }

  public update(dt: number, scrollSpeed: number): void {
    this.x += this.vx * dt;
    this.y += (this.vy + scrollSpeed) * dt;

    this.animTimer += dt;
    if (this.animTimer > 0.1) {
      this.animTimer = 0;
      this.render();
    }

    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public isOutOfBounds(screenWidth: number, screenHeight: number): boolean {
    return this.x < -20 || this.x > screenWidth + 20 || this.y > screenHeight + 50;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
