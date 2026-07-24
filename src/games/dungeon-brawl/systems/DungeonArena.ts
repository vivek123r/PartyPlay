import { Graphics } from 'pixi.js';
import type { TrapEntity } from '../types';
import { ARENA_CONFIG } from '../config';

export class DungeonArena {
  public traps: TrapEntity[] = [];
  private animTimer = 0;

  constructor() {
    this.initTraps();
  }

  private initTraps(): void {
    // 4 Corner Spike Pits
    this.traps.push(
      { id: 'spike-1', type: 'spikes', x: 60, y: 50, w: 24, h: 24, isActive: false, timer: 0, damage: 15 },
      { id: 'spike-2', type: 'spikes', x: ARENA_CONFIG.width - 84, y: 50, w: 24, h: 24, isActive: false, timer: 1.0, damage: 15 },
      { id: 'spike-3', type: 'spikes', x: 60, y: ARENA_CONFIG.height - 74, w: 24, h: 24, isActive: false, timer: 2.0, damage: 15 },
      { id: 'spike-4', type: 'spikes', x: ARENA_CONFIG.width - 84, y: ARENA_CONFIG.height - 74, w: 24, h: 24, isActive: false, timer: 3.0, damage: 15 }
    );

    // 2 Center Fire Braziers
    this.traps.push(
      { id: 'brazier-1', type: 'fire_brazier', x: ARENA_CONFIG.width / 2 - 50, y: ARENA_CONFIG.height / 2, w: 16, h: 16, isActive: true, timer: 0, damage: 20 },
      { id: 'brazier-2', type: 'fire_brazier', x: ARENA_CONFIG.width / 2 + 50, y: ARENA_CONFIG.height / 2, w: 16, h: 16, isActive: true, timer: 0, damage: 20 }
    );
  }

  public update(dt: number): void {
    this.animTimer += dt;

    // Update Trap Timers
    for (const trap of this.traps) {
      if (trap.type === 'spikes') {
        trap.timer += dt;
        if (trap.timer >= 4.0) trap.timer = 0;
        // Spikes pop up between 3.0s and 4.0s
        trap.isActive = trap.timer > 3.0;
      }
    }
  }

  public render(g: Graphics): void {
    const w = ARENA_CONFIG.width;
    const h = ARENA_CONFIG.height;
    const p = ARENA_CONFIG.boundsPadding;

    // 1. Dark Dungeon Background
    g.rect(0, 0, w, h).fill({ color: 0x0f0e17 });

    // 2. Stone Floor Grid
    for (let x = p; x < w - p; x += 16) {
      for (let y = p; y < h - p; y += 16) {
        const alt = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
        g.rect(x, y, 16, 16).fill({ color: alt ? 0x1e272e : 0x2f3542 });
      }
    }

    // 3. Border Walls & Columns
    g.rect(0, 0, w, p).fill({ color: 0x111116 });
    g.rect(0, h - p, w, p).fill({ color: 0x111116 });
    g.rect(0, 0, p, h).fill({ color: 0x111116 });
    g.rect(w - p, 0, p, h).fill({ color: 0x111116 });

    // Wall Trim Outline
    g.rect(p, p, w - p * 2, h - p * 2).stroke({ color: 0x00f0ff, width: 1.5, alpha: 0.7 });

    // 4. Render Interactive Traps
    for (const trap of this.traps) {
      if (trap.type === 'spikes') {
        // Spike Trap Base
        g.rect(trap.x, trap.y, trap.w, trap.h).fill({ color: 0x353b48 });

        if (trap.isActive) {
          // Sharp Metal Spikes
          g.rect(trap.x + 3, trap.y + 3, trap.w - 6, trap.h - 6).fill({ color: 0xe74c3c });
          for (let s = trap.x + 4; s < trap.x + trap.w - 4; s += 6) {
            g.poly([s, trap.y + trap.h, s + 3, trap.y + 2, s + 6, trap.y + trap.h]).fill({ color: 0xecf0f1 });
          }
        }
      } else if (trap.type === 'fire_brazier') {
        // Brazier Iron Stand
        g.rect(trap.x - 6, trap.y - 6, 12, 12).fill({ color: 0x2d3436 });
        g.rect(trap.x - 4, trap.y - 4, 8, 8).fill({ color: 0x636e72 });

        // Flickering Fire Flame Core
        const flicker = Math.sin(this.animTimer * 12 + trap.x) * 2;
        g.circle(trap.x, trap.y, 5 + flicker).fill({ color: 0xe67e22 });
        g.circle(trap.x, trap.y - 2, 3 + flicker * 0.5).fill({ color: 0xf1c40f });
      }
    }
  }
}
