import { Container, Graphics } from 'pixi.js';
import type { KnightState } from '../types';
import { COMBAT_STATS, CAVERN_CONFIG } from '../config';
import { PixelFont } from '../../turbo-rider/render/PixelFont';

export class SideHUDManager {
  public container = new Container();
  private graphics = new Graphics();
  private animTimer = 0;

  constructor() {
    this.container.addChild(this.graphics);
  }

  public update(dt: number): void {
    this.animTimer += dt;
  }

  public render(knights: KnightState[]): void {
    this.graphics.clear();
    if (!knights || knights.length === 0) return;

    const PLAYER_COLORS = [0x38bdf8, 0xf43f5e, 0x10b981, 0xf59e0b];

    for (let i = 0; i < knights.length; i++) {
      const knight = knights[i];
      const pId = knight.id || i + 1;
      const pColor = PLAYER_COLORS[(pId - 1) % PLAYER_COLORS.length];
      const startX = 8 + i * 115;
      const startY = 8;

      // Player Tag
      PixelFont.drawText(this.graphics, `P${pId}`, startX, startY, pColor, 1);

      // Mask HP Shells
      const currentHp = Math.max(0, knight.hp);
      for (let m = 0; m < knight.maxHp; m++) {
        const mx = startX + 16 + m * 11;
        if (m < currentHp) {
          this.graphics.roundRect(mx, startY, 9, 11, 2).fill({ color: 0xf8fafc });
        } else {
          this.graphics.roundRect(mx, startY, 9, 11, 2).fill({ color: 0x1e293b });
        }
      }

      // Geo Count
      PixelFont.drawText(this.graphics, `GEO:${knight.geoCount || 0}`, startX, startY + 16, 0xf59e0b, 1);
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
