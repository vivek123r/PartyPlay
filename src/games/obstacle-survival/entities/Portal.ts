import { Graphics, Container } from 'pixi.js';

export class Portal {
  public x: number;
  public y: number;
  public radius = 14; // 28x28 prominent pixel entity
  public isAlive = true;

  public container: Container;
  public graphics: Graphics;
  private animTimer = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.render();
    this.container.x = Math.round(this.x - this.radius);
    this.container.y = Math.round(this.y - this.radius);
  }

  private render(): void {
    this.graphics.clear();

    const size = this.radius * 2; // 28px
    const isStep = Math.floor(this.animTimer * 10) % 2 === 0;

    const outerColor = isStep ? 0xa55eea : 0x7160e8; // Deep Synth Purple
    const midColor = isStep ? 0x08d9d6 : 0x2af598;   // Cyan / Mint Ring
    const innerColor = isStep ? 0xfffffe : 0xffde7d; // White / Gold Swirl

    // 1. Outer Square Portal Frame (28x28)
    this.graphics.rect(0, 0, size, size).fill({ color: 0x0f0e17 });
    this.graphics.rect(2, 2, size - 4, size - 4).fill({ color: outerColor });

    // 2. Mid Rotating Energy Ring (20x20)
    this.graphics.rect(4, 4, size - 8, size - 8).fill({ color: midColor });

    // 3. Inner Pulsating Portal Core (12x12)
    this.graphics.rect(8, 8, size - 16, size - 16).fill({ color: innerColor });

    // 4. Center Black Hole Swirl (6x6)
    this.graphics.rect(11, 11, 6, 6).fill({ color: 0x0f0e17 });
    this.graphics.rect(13, 13, 2, 2).fill({ color: 0xfffffe });

    // Corner Star Sparkles
    const sparkColor = isStep ? 0xffde7d : 0x08d9d6;
    this.graphics.rect(-2, -2, 4, 4).fill({ color: sparkColor });
    this.graphics.rect(size - 2, -2, 4, 4).fill({ color: sparkColor });
    this.graphics.rect(-2, size - 2, 4, 4).fill({ color: sparkColor });
    this.graphics.rect(size - 2, size - 2, 4, 4).fill({ color: sparkColor });
  }

  public update(dt: number, scrollSpeed: number): void {
    this.y += scrollSpeed * dt;

    this.animTimer += dt;
    this.render();

    this.container.x = Math.round(this.x - this.radius);
    this.container.y = Math.round(this.y - this.radius);
  }

  public isOutOfBounds(screenHeight: number): boolean {
    return this.y > screenHeight + 50;
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
