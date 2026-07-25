import { Graphics } from 'pixi.js';
import type { PlatformTile } from '../types';
import { CAVERN_CONFIG } from '../config';

export class CavernTilemap {
  public tiles: PlatformTile[] = [];

  constructor() {
    this.buildLevelLayout();
  }

  private buildLevelLayout(): void {
    const w = CAVERN_CONFIG.width; // 960
    const h = CAVERN_CONFIG.height; // 270

    // ── 1. Main Floor Platforms with Spike Gaps ───────────────────────
    this.tiles.push(
      { x: 0,   y: h - 32, width: 260, height: 32, isSolid: true,  type: 'moss'   },
      { x: 260, y: h - 14, width: 100, height: 14, isSolid: false, type: 'spikes' }, // Spike pit 1
      { x: 360, y: h - 32, width: 200, height: 32, isSolid: true,  type: 'moss'   },
      { x: 560, y: h - 14, width: 70,  height: 14, isSolid: false, type: 'spikes' }, // Spike pit 2
      { x: 630, y: h - 32, width: 330, height: 32, isSolid: true,  type: 'moss'   },
    );

    // ── 2. Ceiling & Side Border Walls ────────────────────────────────
    this.tiles.push(
      { x: 0,   y: 0, width: w,  height: 24, isSolid: true, type: 'stone' }, // ceiling
      { x: 0,   y: 0, width: 16, height: h,  isSolid: true, type: 'moss'  }, // left wall
      { x: 944, y: 0, width: 16, height: h,  isSolid: true, type: 'moss'  }, // right wall
    );

    // ── 3. Multi-Tier Floating Ledges ─────────────────────────────────
    this.tiles.push(
      { x: 50,  y: 185, width: 120, height: 16, isSolid: true, type: 'moss'  },
      { x: 200, y: 145, width: 120, height: 16, isSolid: true, type: 'stone' },
      { x: 370, y: 192, width: 100, height: 16, isSolid: true, type: 'moss'  },
      { x: 510, y: 128, width: 150, height: 16, isSolid: true, type: 'stone' },
      { x: 690, y: 172, width: 120, height: 16, isSolid: true, type: 'moss'  },
      { x: 840, y: 215, width: 90,  height: 16, isSolid: true, type: 'stone' },
    );

    // ── 4. Ancient Totem Pillars ───────────────────────────────────────
    this.tiles.push(
      { x: 178, y: h - 100, width: 24, height: 68, isSolid: true, type: 'stone' },
      { x: 635, y: h - 116, width: 28, height: 84, isSolid: true, type: 'stone' },
    );

    // ── 5. Secret Upper Alcoves (reachable by wall-jump + double jump) ─
    // Left secret alcove — hidden high ledge above spike pit at x=260
    this.tiles.push(
      { x: 24,  y: 60,  width: 80, height: 16, isSolid: true, type: 'moss'  }, // far-left ceiling ledge
      { x: 140, y: 88,  width: 90, height: 16, isSolid: true, type: 'stone' }, // stepping stone up-left
    );

    // Right secret alcove — deep in boss arena
    this.tiles.push(
      { x: 875, y: 72,  width: 64, height: 16, isSolid: true, type: 'moss'  }, // top-right hidden alcove
      { x: 800, y: 100, width: 60, height: 16, isSolid: true, type: 'stone' }, // step-up to right alcove
    );

    // Central mid-air island — for pogo practice
    this.tiles.push(
      { x: 440, y: 100, width: 70, height: 16, isSolid: true, type: 'stone' },
    );
  }

  public render(g: Graphics): void {
    for (const tile of this.tiles) {
      const { x, y, width: w, height: h } = tile;

      if (tile.type === 'spikes') {
        // Dark recessed spike pit
        g.rect(x, y, w, h).fill({ color: 0x1a0a0a });
        for (let sx = x + 4; sx < x + w - 4; sx += 8) {
          // Base
          g.rect(sx, y + h - 4, 8, 4).fill({ color: 0x2c1010 });
          // Spike
          g.poly([sx + 1, y + h, sx + 4, y + 2, sx + 7, y + h]).fill({ color: 0xb91c1c });
          // Blood glint
          g.poly([sx + 3, y + 4, sx + 4, y + 2, sx + 5, y + 4]).fill({ color: 0xfca5a5, alpha: 0.6 });
        }
      } else if (tile.type === 'moss') {
        // Mossy stone platform — dark stone base, vivid moss cap
        g.rect(x, y, w, h).fill({ color: 0x1c2333 });
        // Stone texture lines
        for (let bx = x; bx < x + w; bx += 24) {
          g.rect(bx, y + 6, Math.min(24, x + w - bx), 1).fill({ color: 0x111827, alpha: 0.5 });
        }
        // Moss top cap — layered for depth
        g.rect(x, y, w, 5).fill({ color: 0x15803d });
        g.rect(x, y, w, 2).fill({ color: 0x4ade80 });
        // Dripping moss tendrils
        for (let tx = x + 8; tx < x + w - 4; tx += 14) {
          const dripLen = 4 + Math.floor(Math.abs(Math.sin(tx * 0.3)) * 6);
          g.rect(tx, y + 5, 2, dripLen).fill({ color: 0x166534, alpha: 0.7 });
        }
        // Outer border
        g.rect(x, y, w, h).stroke({ color: 0x0f172a, width: 1 });
      } else {
        // Stone brick — carved ancient cavern walls
        g.rect(x, y, w, h).fill({ color: 0x1e2433 });
        // Brick mortar lines (horizontal)
        g.rect(x, y + 5, w, 1).fill({ color: 0x111827, alpha: 0.7 });
        g.rect(x, y + 11, w, 1).fill({ color: 0x111827, alpha: 0.5 });
        // Brick mortar (vertical alternating)
        for (let bx = x + 12; bx < x + w; bx += 24) {
          g.rect(bx, y, 1, 6).fill({ color: 0x111827, alpha: 0.5 });
        }
        for (let bx = x; bx < x + w; bx += 24) {
          g.rect(bx, y + 6, 1, 6).fill({ color: 0x111827, alpha: 0.5 });
        }
        // Top highlight edge
        g.rect(x, y, w, 2).fill({ color: 0x475569, alpha: 0.4 });
        g.rect(x, y, w, h).stroke({ color: 0x0f172a, width: 1 });
      }
    }
  }
}
