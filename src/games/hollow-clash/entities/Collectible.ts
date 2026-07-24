import { Graphics } from 'pixi.js';

export class Collectible {
  public id: string;
  public type: 'geo_coin' | 'soul_orb' | 'mask_shard';
  public x: number;
  public y: number;
  public value: number;
  public lifetime = 12.0;

  constructor(id: string, type: 'geo_coin' | 'soul_orb' | 'mask_shard', x: number, y: number) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;

    this.value = type === 'geo_coin' ? 5 : type === 'soul_orb' ? 15 : 1;
  }

  public update(dt: number): boolean {
    this.lifetime -= dt;
    return this.lifetime > 0;
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    if (this.type === 'geo_coin') {
      // Spinning Gold Geo Coin
      g.circle(x, y, 4).fill({ color: 0xf1c40f });
      g.circle(x, y, 2).fill({ color: 0xf39c12 });
    } else if (this.type === 'soul_orb') {
      // Floating Cyan Soul Orb
      g.circle(x, y, 5).fill({ color: 0x00f0ff, alpha: 0.8 });
      g.circle(x, y, 2).fill({ color: 0xffffff });
    } else {
      // White Mask Shard
      g.poly([x, y - 5, x + 4, y, x, y + 5, x - 4, y]).fill({ color: 0xffffff });
    }
  }
}
