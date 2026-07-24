import { Container, Graphics } from 'pixi.js';

export type CollectibleType = 'relic_shard' | 'treasure_chest' | 'golden_idol';

export class Collectible {
  public type: CollectibleType;
  public laneIndex: number;
  public x: number;
  public y: number;
  public width = 12;
  public height = 12;
  public points = 50;
  public isCollected = false;

  public container: Container;
  public graphics: Graphics;
  private auraGraphics: Graphics;
  private animTimer = Math.random() * Math.PI * 2;

  constructor(type: CollectibleType, laneIndex: number, x: number, y: number) {
    this.type = type;
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;

    if (this.type === 'treasure_chest') {
      this.points = 200;
      this.width = 16;
      this.height = 14;
    } else if (this.type === 'golden_idol') {
      this.points = 350;
      this.width = 14;
      this.height = 18;
    } else {
      this.points = 50;
      this.width = 10;
      this.height = 10;
    }

    this.container = new Container();
    this.auraGraphics = new Graphics();
    this.graphics = new Graphics();
    this.container.addChild(this.auraGraphics);
    this.container.addChild(this.graphics);

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public update(dt: number): void {
    if (this.isCollected) return;

    this.animTimer += dt * 4;
    const floatY = Math.sin(this.animTimer) * 2.5;
    this.container.y = Math.round(this.y + floatY);

    this.render();
  }

  public collect(): number {
    if (this.isCollected) return 0;
    this.isCollected = true;
    this.container.visible = false;
    return this.points;
  }

  private render(): void {
    this.graphics.clear();
    this.auraGraphics.clear();
    const w = this.width;
    const h = this.height;

    if (this.type === 'relic_shard') {
      // 4-Frame Sparkling Diamond Gem
      const spark = Math.floor(this.animTimer * 2) % 4;
      const gemColor = spark === 0 ? 0xffde7d : spark === 2 ? 0x08d9d6 : 0xf4d160;

      // Outer Aura Glow
      this.auraGraphics.circle(w / 2, h / 2, 8).fill({ color: gemColor, alpha: 0.25 });

      // Gem Diamond Sprite
      this.graphics.rect(3, 0, 4, 10).fill({ color: gemColor });
      this.graphics.rect(1, 2, 8, 6).fill({ color: gemColor });
      this.graphics.rect(4, 1, 2, 2).fill({ color: 0xfffffe }); // Specular sparkle
    } else if (this.type === 'treasure_chest') {
      // Ornate Wood & Gold Vault Chest
      this.graphics.rect(0, 0, w, h).fill({ color: 0x3d2314 });
      this.graphics.rect(1, 1, w - 2, h - 2).fill({ color: 0x5c3d2e });
      // Gold Bands & Lock
      this.graphics.rect(0, 0, w, 2).fill({ color: 0xf4d160 });
      this.graphics.rect(0, h - 2, w, 2).fill({ color: 0xf4d160 });
      this.graphics.rect(6, 4, 4, 5).fill({ color: 0xffde7d });
      this.graphics.rect(7, 5, 2, 3).fill({ color: 0x0f0e17 });
    } else if (this.type === 'golden_idol') {
      // Secret Golden Aztec Idol with Permanent Radiant Aura
      this.auraGraphics.circle(w / 2, h / 2, 14).fill({ color: 0xf4d160, alpha: 0.3 });

      this.graphics.rect(0, 0, w, h).fill({ color: 0xf4d160 });
      this.graphics.rect(2, 2, w - 4, h - 4).fill({ color: 0xffde7d });
      this.graphics.rect(3, 4, 3, 3).fill({ color: 0x0f0e17 });
      this.graphics.rect(w - 6, 4, 3, 3).fill({ color: 0x0f0e17 });
      this.graphics.rect(4, 10, w - 8, 3).fill({ color: 0xd35400 });
      this.graphics.rect(1, 1, 3, 3).fill({ color: 0xfffffe });
    }
  }

  public destroy(): void {
    this.auraGraphics.destroy();
    this.graphics.destroy();
    this.container.destroy();
  }
}
