import { Graphics } from 'pixi.js';

export class Collectible {
  public id: string;
  public type: 'geo_coin' | 'soul_orb' | 'mask_shard';
  public x: number;
  public y: number;
  public value: number;
  public lifetime = 14.0;

  private bobTimer: number;
  private baseY: number;

  constructor(id: string, type: 'geo_coin' | 'soul_orb' | 'mask_shard', x: number, y: number) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.bobTimer = Math.random() * Math.PI * 2; // stagger bob phase

    // value: geo=5, soul=15, mask_shard=1 (hp increase)
    this.value = type === 'geo_coin' ? 5 : type === 'soul_orb' ? 15 : 1;
  }

  public update(dt: number): boolean {
    this.lifetime -= dt;
    this.bobTimer += dt * 3.2;
    this.y = this.baseY + Math.sin(this.bobTimer) * 3;
    return this.lifetime > 0;
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const fadeAlpha = this.lifetime < 3 ? this.lifetime / 3 : 1;

    if (this.type === 'geo_coin') {
      // Spinning golden geo coin with shadow
      g.ellipse(x, y + 5, 4, 1.5).fill({ color: 0x000000, alpha: 0.3 * fadeAlpha });
      g.circle(x, y, 5).fill({ color: 0xf59e0b, alpha: fadeAlpha });
      g.circle(x, y, 3).fill({ color: 0xfde68a, alpha: fadeAlpha });
      // GEO rune notch
      g.poly([x - 1, y - 2, x + 1, y - 2, x, y + 2]).fill({ color: 0xf59e0b, alpha: fadeAlpha });
    } else if (this.type === 'soul_orb') {
      // Pulsing cyan soul orb with glow ring
      g.ellipse(x, y + 6, 5, 2).fill({ color: 0x000000, alpha: 0.25 * fadeAlpha });
      g.circle(x, y, 7).fill({ color: 0x00f0ff, alpha: 0.35 * fadeAlpha });
      g.circle(x, y, 5).fill({ color: 0x38bdf8, alpha: 0.8 * fadeAlpha });
      g.circle(x, y, 2.5).fill({ color: 0xffffff, alpha: fadeAlpha });
      // Tiny orbiting soul sparks
      const t = this.bobTimer;
      g.circle(x + Math.cos(t * 2) * 6, y + Math.sin(t * 2) * 6, 1).fill({ color: 0x00f0ff, alpha: 0.8 * fadeAlpha });
    } else {
      // Mask Shard — glowing white fragment with inner cyan core
      g.ellipse(x, y + 5, 5, 2).fill({ color: 0x000000, alpha: 0.25 * fadeAlpha });
      // Outer glow aura
      g.circle(x, y, 9).fill({ color: 0xffffff, alpha: 0.15 * fadeAlpha });
      // Diamond shard shape
      g.poly([x, y - 7, x + 5, y, x, y + 7, x - 5, y]).fill({ color: 0xf8fafc, alpha: fadeAlpha });
      // Inner cyan shard core
      g.poly([x, y - 4, x + 3, y, x, y + 4, x - 3, y]).fill({ color: 0x00f0ff, alpha: 0.9 * fadeAlpha });
      // Bright centre
      g.circle(x, y, 1.5).fill({ color: 0xffffff, alpha: fadeAlpha });
    }
  }
}
