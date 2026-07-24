import { Graphics } from 'pixi.js';
import type { PlatformTile } from '../types';
import { CAVERN_CONFIG } from '../config';

export class CavernTilemap {
  public tiles: PlatformTile[] = [];

  constructor() {
    this.buildLevelLayout();
  }

  private buildLevelLayout(): void {
    const w = CAVERN_CONFIG.width;
    const h = CAVERN_CONFIG.height;

    // 1. Bottom Main Floor Platforms with Spike Gap
    this.tiles.push(
      { x: 0, y: h - 32, width: 280, height: 32, isSolid: true, type: 'moss' },
      { x: 280, y: h - 16, width: 120, height: 16, isSolid: false, type: 'spikes' }, // Spike pit
      { x: 400, y: h - 32, width: 560, height: 32, isSolid: true, type: 'moss' }
    );

    // 2. Ceiling & Side Border Walls
    this.tiles.push(
      { x: 0, y: 0, width: w, height: 24, isSolid: true, type: 'stone' },
      { x: 0, y: 0, width: 16, height: h, isSolid: true, type: 'moss' }, // Mossy left wall for wall jump!
      { x: w - 16, y: 0, width: 16, height: h, isSolid: true, type: 'moss' }  // Mossy right wall for wall jump!
    );

    // 3. Multi-Tier Floating Stone & Moss Ledges (matching ref_sideview.jpg)
    this.tiles.push(
      { x: 60, y: 180, width: 110, height: 16, isSolid: true, type: 'moss' },
      { x: 210, y: 140, width: 140, height: 16, isSolid: true, type: 'stone' },
      { x: 380, y: 190, width: 100, height: 16, isSolid: true, type: 'moss' },
      { x: 510, y: 130, width: 160, height: 16, isSolid: true, type: 'stone' },
      { x: 700, y: 170, width: 120, height: 16, isSolid: true, type: 'moss' },
      { x: 840, y: 220, width: 90, height: 16, isSolid: true, type: 'stone' }
    );

    // 4. Ancient Totem Pillars
    this.tiles.push(
      { x: 180, y: h - 96, width: 24, height: 64, isSolid: true, type: 'stone' },
      { x: 640, y: h - 112, width: 28, height: 80, isSolid: true, type: 'stone' }
    );
  }

  public render(g: Graphics): void {
    for (const tile of this.tiles) {
      if (tile.type === 'spikes') {
        // Red Spike Pit
        g.rect(tile.x, tile.y, tile.width, tile.height).fill({ color: 0x2c3e50 });
        for (let sx = tile.x + 4; sx < tile.x + tile.width - 4; sx += 8) {
          g.poly([sx, tile.y + tile.height, sx + 4, tile.y + 2, sx + 8, tile.y + tile.height]).fill({ color: 0xe74c3c });
        }
      } else if (tile.type === 'moss') {
        // Stone Base with Green Moss Cap
        g.rect(tile.x, tile.y, tile.width, tile.height).fill({ color: 0x2f3542 });
        g.rect(tile.x, tile.y, tile.width, 4).fill({ color: 0x2ecc71 }); // Moss Cap
        g.rect(tile.x, tile.y, tile.width, tile.height).stroke({ color: 0x1e272e, width: 1 });
      } else {
        // Stone Brick Block
        g.rect(tile.x, tile.y, tile.width, tile.height).fill({ color: 0x353b48 });
        g.rect(tile.x, tile.y, tile.width, 3).fill({ color: 0x7f8c8d });
        g.rect(tile.x, tile.y, tile.width, tile.height).stroke({ color: 0x1e272e, width: 1 });
      }
    }
  }
}
