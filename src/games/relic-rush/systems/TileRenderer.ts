import { Graphics } from 'pixi.js';

export type TileType =
  | 'empty'
  | 'floor'
  | 'brick'
  | 'bg_wall'
  | 'water'
  | 'lava'
  | 'torch'
  | 'door'
  | 'exit_flag'
  | 'spikes'
  | 'vine'
  | 'chain'
  | 'pillar';

export class TileRenderer {
  public static drawTile(
    g: Graphics,
    type: TileType,
    x: number,
    y: number,
    tileSize = 16,
    animFrame = 0,
    wallColor = 0xf4d160,
    bgColor = 0x1f170f
  ): void {
    if (type === 'empty') return;

    const px = Math.round(x);
    const py = Math.round(y);
    const ts = tileSize;

    switch (type) {
      case 'floor':
      case 'brick': {
        // Detailed 16x16 Stone Brick Block with Mortar Lines & Highlights
        g.rect(px, py, ts, ts).fill({ color: wallColor });
        g.rect(px, py, ts, 1).fill({ color: 0xfffffe, alpha: 0.5 });
        g.rect(px, py, 1, ts).fill({ color: 0xfffffe, alpha: 0.5 });
        g.rect(px, py + ts - 1, ts, 1).fill({ color: 0x0f0e17, alpha: 0.6 });
        g.rect(px + ts - 1, py, 1, ts).fill({ color: 0x0f0e17, alpha: 0.6 });

        g.rect(px, py + 8, ts, 1).fill({ color: 0x0f0e17, alpha: 0.4 });
        g.rect(px + 8, py, 1, 8).fill({ color: 0x0f0e17, alpha: 0.4 });
        g.rect(px + 4, py + 8, 1, 8).fill({ color: 0x0f0e17, alpha: 0.4 });

        if (type === 'floor') {
          g.rect(px, py, ts, 2).fill({ color: 0x00b894, alpha: 0.8 });
          g.rect(px + 2, py + 2, 3, 1).fill({ color: 0x55efc4 });
          g.rect(px + 10, py + 2, 4, 1).fill({ color: 0x55efc4 });
        }
        break;
      }

      case 'pillar': {
        // 16x28 Carved Ancient Stone Pillar Column
        g.rect(px, py, ts, 28).fill({ color: wallColor });
        // Top & Bottom Capital Trim Rims
        g.rect(px - 1, py, ts + 2, 3).fill({ color: 0xfffffe, alpha: 0.6 });
        g.rect(px - 1, py + 25, ts + 2, 3).fill({ color: 0x0f0e17, alpha: 0.7 });
        // Fluted Vertical Column Shaft Lines
        g.rect(px + 3, py + 3, 2, 22).fill({ color: 0x0f0e17, alpha: 0.35 });
        g.rect(px + 7, py + 3, 2, 22).fill({ color: 0xfffffe, alpha: 0.4 });
        g.rect(px + 11, py + 3, 2, 22).fill({ color: 0x0f0e17, alpha: 0.35 });
        break;
      }

      case 'bg_wall': {
        g.rect(px, py, ts, ts).fill({ color: bgColor });
        g.rect(px, py, ts, 1).fill({ color: 0x0f0e17, alpha: 0.8 });
        g.rect(px, py + 8, ts, 1).fill({ color: 0x0f0e17, alpha: 0.5 });
        g.rect(px + 8, py, 1, ts).fill({ color: 0x0f0e17, alpha: 0.5 });
        break;
      }

      case 'water': {
        const frameOffset = (animFrame % 4) * 2;
        g.rect(px, py, ts, ts).fill({ color: 0x0984e3, alpha: 0.85 });
        g.rect(px, py, ts, 3).fill({ color: 0x74b9ff });
        g.rect(px + frameOffset, py + 1, 4, 1).fill({ color: 0xfffffe });
        g.rect(px + ((frameOffset + 8) % 16), py + 6, 5, 1).fill({ color: 0x74b9ff });
        break;
      }

      case 'lava': {
        const lavaOffset = ((animFrame + 1) % 4) * 2;
        g.rect(px, py, ts, ts).fill({ color: 0xd63031 });
        g.rect(px, py, ts, 3).fill({ color: 0xff7675 });
        g.rect(px + lavaOffset, py + 1, 4, 1).fill({ color: 0xfffffe });
        g.rect(px + 2, py + 8, 3, 2).fill({ color: 0xf4d160 });
        break;
      }

      case 'torch': {
        g.rect(px + 6, py + 6, 4, 10).fill({ color: 0x5c3d2e });
        g.rect(px + 5, py + 4, 6, 2).fill({ color: 0x2d3436 });

        const glowAlpha = 0.15 + Math.sin(animFrame * 0.8) * 0.05;
        g.circle(px + 8, py + 2, 8).fill({ color: 0xf4d160, alpha: glowAlpha });

        const flameOffset = (animFrame % 3) - 1;
        g.rect(px + 6 + flameOffset, py - 2, 4, 6).fill({ color: 0xe67e22 });
        g.rect(px + 7 + flameOffset, py - 4, 2, 4).fill({ color: 0xf4d160 });
        g.rect(px + 7, py - 3, 1, 2).fill({ color: 0xfffffe });
        break;
      }

      case 'door': {
        g.rect(px, py, ts, ts).fill({ color: 0x3d2314 });
        g.rect(px, py, ts, 2).fill({ color: 0x2d3436 });
        g.rect(px + 2, py + 2, ts - 4, ts - 2).fill({ color: 0x5c3d2e });
        g.rect(px + 7, py + 7, 2, 3).fill({ color: 0xf4d160 });
        break;
      }

      case 'exit_flag': {
        g.rect(px + 2, py, 2, ts).fill({ color: 0x7f8c8d });
        g.rect(px + 4, py + 1, 10, 7).fill({ color: 0xff2e63 });
        g.rect(px + 4, py + 2, 8, 5).fill({ color: 0xff7675 });
        g.rect(px + 2, py - 2, 2, 2).fill({ color: 0xf4d160 });
        break;
      }

      case 'spikes': {
        g.rect(px, py + 12, ts, 4).fill({ color: 0x2d3436 });
        for (let i = 0; i < ts; i += 4) {
          g.rect(px + i + 1, py + 4, 2, 8).fill({ color: 0xbdc3c7 });
          g.rect(px + i + 1, py + 4, 1, 8).fill({ color: 0xfffffe });
        }
        break;
      }

      case 'vine': {
        g.rect(px + 6, py, 4, ts).fill({ color: 0x00b894 });
        g.rect(px + 4, py + 4, 3, 3).fill({ color: 0x55efc4 });
        g.rect(px + 9, py + 10, 3, 3).fill({ color: 0x55efc4 });
        break;
      }

      case 'chain': {
        for (let i = 0; i < ts; i += 4) {
          g.rect(px + 7, py + i, 2, 3).fill({ color: 0x7f8c8d });
          g.rect(px + 8, py + i + 1, 1, 1).fill({ color: 0xfffffe });
        }
        break;
      }
    }
  }
}
