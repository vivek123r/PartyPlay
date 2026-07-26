import { Graphics } from 'pixi.js';
import type { DungeonObstacle, RoomTheme, TrapEntity } from '../types';
import { ARENA_CONFIG } from '../config';

interface ArenaPalette {
  floorA: number;
  floorB: number;
  wall: number;
  trim: number;
  glow: number;
  shadow: number;
}

const PALETTES: Record<RoomTheme, ArenaPalette> = {
  chains: { floorA: 0x17152a, floorB: 0x211c36, wall: 0x0b0918, trim: 0x6ff7ff, glow: 0x7558aa, shadow: 0x080611 },
  crypt: { floorA: 0x151e28, floorB: 0x202c36, wall: 0x091117, trim: 0x7de38a, glow: 0x4c8a76, shadow: 0x07100f },
  ember: { floorA: 0x281622, floorB: 0x38202c, wall: 0x130911, trim: 0xff884a, glow: 0xba4a4f, shadow: 0x100608 },
  court: { floorA: 0x281326, floorB: 0x351b31, wall: 0x120816, trim: 0xe05263, glow: 0x9a3c75, shadow: 0x0e0610 },
  throne: { floorA: 0x1f1428, floorB: 0x2d1b34, wall: 0x0d0712, trim: 0xf2c14e, glow: 0xc04b5e, shadow: 0x09040c },
};

const OBSTACLES: Record<RoomTheme, DungeonObstacle[]> = {
  chains: [
    { id: 'chains-pillar-nw', kind: 'pillar', x: 102, y: 84, w: 26, h: 26 },
    { id: 'chains-pillar-se', kind: 'pillar', x: 378, y: 188, w: 26, h: 26 },
    { id: 'chains-rubble-ne', kind: 'rubble', x: 366, y: 72, w: 34, h: 18 },
  ],
  crypt: [
    { id: 'crypt-tomb-nw', kind: 'tomb', x: 108, y: 83, w: 44, h: 20 },
    { id: 'crypt-tomb-ne', kind: 'tomb', x: 372, y: 83, w: 44, h: 20 },
    { id: 'crypt-tomb-sw', kind: 'tomb', x: 108, y: 194, w: 44, h: 20 },
    { id: 'crypt-tomb-se', kind: 'tomb', x: 372, y: 194, w: 44, h: 20 },
  ],
  ember: [
    { id: 'ember-pillar-nw', kind: 'pillar', x: 119, y: 87, w: 25, h: 25 },
    { id: 'ember-pillar-ne', kind: 'pillar', x: 361, y: 87, w: 25, h: 25 },
    { id: 'ember-pillar-sw', kind: 'pillar', x: 119, y: 194, w: 25, h: 25 },
    { id: 'ember-pillar-se', kind: 'pillar', x: 361, y: 194, w: 25, h: 25 },
  ],
  court: [
    { id: 'court-pillar-nw', kind: 'pillar', x: 101, y: 78, w: 25, h: 25 },
    { id: 'court-pillar-ne', kind: 'pillar', x: 379, y: 78, w: 25, h: 25 },
    { id: 'court-pillar-sw', kind: 'pillar', x: 101, y: 202, w: 25, h: 25 },
    { id: 'court-pillar-se', kind: 'pillar', x: 379, y: 202, w: 25, h: 25 },
    { id: 'court-altar', kind: 'altar', x: 240, y: 137, w: 48, h: 24 },
  ],
  throne: [
    { id: 'throne-pillar-left', kind: 'pillar', x: 102, y: 116, w: 29, h: 29 },
    { id: 'throne-pillar-right', kind: 'pillar', x: 378, y: 116, w: 29, h: 29 },
    { id: 'throne-rubble-left', kind: 'rubble', x: 105, y: 207, w: 38, h: 18 },
    { id: 'throne-rubble-right', kind: 'rubble', x: 375, y: 207, w: 38, h: 18 },
    { id: 'horned-throne', kind: 'throne', x: 240, y: 46, w: 54, h: 20 },
  ],
};

const TRAPS: Record<RoomTheme, TrapEntity[]> = {
  chains: [
    { id: 'chains-spikes-west', type: 'spikes', x: 65, y: 154, w: 42, h: 18, isActive: false, timer: .2, damage: 13 },
    { id: 'chains-spikes-east', type: 'spikes', x: 415, y: 116, w: 42, h: 18, isActive: false, timer: 1.8, damage: 13 },
  ],
  crypt: [
    { id: 'crypt-spikes-left', type: 'spikes', x: 177, y: 81, w: 38, h: 17, isActive: false, timer: 0, damage: 16 },
    { id: 'crypt-spikes-right', type: 'spikes', x: 303, y: 191, w: 38, h: 17, isActive: false, timer: 1.6, damage: 16 },
    { id: 'crypt-poison', type: 'poison_pool', x: 240, y: 137, w: 48, h: 30, isActive: true, timer: 0, damage: 10 },
  ],
  ember: [
    { id: 'ember-vent-left', type: 'fire_vent', x: 191, y: 91, w: 36, h: 25, isActive: false, timer: .7, damage: 19 },
    { id: 'ember-vent-right', type: 'fire_vent', x: 289, y: 183, w: 36, h: 25, isActive: false, timer: 2.2, damage: 19 },
    { id: 'ember-lava-heart', type: 'fire_vent', x: 240, y: 137, w: 48, h: 30, isActive: false, timer: 1.35, damage: 22 },
    { id: 'ember-brazier', type: 'fire_brazier', x: 62, y: 210, w: 18, h: 18, isActive: true, timer: 0, damage: 12 },
  ],
  court: [
    { id: 'court-blood-west', type: 'blood_pool', x: 155, y: 137, w: 45, h: 27, isActive: true, timer: 0, damage: 11 },
    { id: 'court-blood-east', type: 'blood_pool', x: 325, y: 137, w: 45, h: 27, isActive: true, timer: 0, damage: 11 },
    { id: 'court-spikes', type: 'spikes', x: 240, y: 202, w: 50, h: 17, isActive: false, timer: 1.1, damage: 18 },
  ],
  throne: [
    { id: 'throne-rift-left', type: 'void_rift', x: 157, y: 145, w: 48, h: 30, isActive: false, timer: .5, damage: 20 },
    { id: 'throne-rift-right', type: 'void_rift', x: 323, y: 145, w: 48, h: 30, isActive: false, timer: 2.4, damage: 20 },
    { id: 'throne-vent', type: 'fire_vent', x: 240, y: 211, w: 42, h: 26, isActive: false, timer: 1.5, damage: 22 },
  ],
};

export class DungeonArena {
  public traps: TrapEntity[] = [];
  public obstacles: DungeonObstacle[] = [];
  public theme: RoomTheme = 'chains';
  public clock = 0;

  public setTheme(theme: RoomTheme): void {
    this.theme = theme;
    this.clock = 0;
    this.traps = TRAPS[theme].map((trap) => ({ ...trap }));
    this.obstacles = OBSTACLES[theme].map((obstacle) => ({ ...obstacle }));
  }

  public update(dt: number): void {
    this.clock += dt;
    for (const trap of this.traps) {
      if (trap.type === 'fire_brazier' || trap.type === 'poison_pool' || trap.type === 'blood_pool') continue;
      const period = trap.type === 'spikes' ? 3.4 : trap.type === 'void_rift' ? 4.2 : 3.8;
      trap.timer = (trap.timer + dt) % period;
      trap.isActive = trap.type === 'spikes' ? trap.timer > 2.55 : trap.type === 'void_rift' ? trap.timer > 2.15 : trap.timer > 2.75;
    }
  }

  public hurtAt(x: number, y: number): number {
    for (const trap of this.traps) {
      const inside = x >= trap.x - trap.w / 2 && x <= trap.x + trap.w / 2 && y >= trap.y - trap.h / 2 && y <= trap.y + trap.h / 2;
      if (inside && trap.isActive) return trap.damage;
    }
    return 0;
  }

  public isBlocked(x: number, y: number, radius = 2): boolean {
    return this.obstacles.some((obstacle) => (
      x + radius > obstacle.x - obstacle.w / 2
      && x - radius < obstacle.x + obstacle.w / 2
      && y + radius > obstacle.y - obstacle.h / 2
      && y - radius < obstacle.y + obstacle.h / 2
    ));
  }

  public resolveCircle(x: number, y: number, radius: number): { x: number; y: number; collided: boolean } {
    let resolvedX = x;
    let resolvedY = y;
    let collided = false;
    for (const obstacle of this.obstacles) {
      const left = obstacle.x - obstacle.w / 2;
      const right = obstacle.x + obstacle.w / 2;
      const top = obstacle.y - obstacle.h / 2;
      const bottom = obstacle.y + obstacle.h / 2;
      const closestX = Math.max(left, Math.min(right, resolvedX));
      const closestY = Math.max(top, Math.min(bottom, resolvedY));
      const dx = resolvedX - closestX;
      const dy = resolvedY - closestY;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;
      collided = true;
      if (distance > .001) {
        const push = radius - distance;
        resolvedX += dx / distance * push;
        resolvedY += dy / distance * push;
        continue;
      }
      const escape = [
        { distance: Math.abs(resolvedX - left), x: left - radius, y: resolvedY },
        { distance: Math.abs(right - resolvedX), x: right + radius, y: resolvedY },
        { distance: Math.abs(resolvedY - top), x: resolvedX, y: top - radius },
        { distance: Math.abs(bottom - resolvedY), x: resolvedX, y: bottom + radius },
      ].sort((a, b) => a.distance - b.distance)[0];
      resolvedX = escape.x;
      resolvedY = escape.y;
    }
    return { x: resolvedX, y: resolvedY, collided };
  }

  public render(g: Graphics): void {
    this.renderBase(g);
    this.renderHazards(g);
  }

  public renderBase(g: Graphics): void {
    const { width: w, height: h, boundsPadding: p } = ARENA_CONFIG;
    const palette = PALETTES[this.theme];
    g.rect(0, 0, w, h).fill({ color: palette.wall });
    g.rect(p, p, w - p * 2, h - p * 2).fill({ color: palette.floorA });
    for (let x = p; x < w - p; x += 16) {
      for (let y = p; y < h - p; y += 16) {
        const alt = (x / 16 + y / 16) % 2 === 0;
        g.rect(x + 1, y + 1, 14, 14).fill({ color: alt ? palette.floorB : palette.floorA });
        if ((x * 13 + y * 7) % 64 === 0) g.rect(x + 5, y + 8, 5, 1).fill({ color: palette.glow, alpha: .28 });
      }
    }
    this.renderFloorIdentity(g, palette);
    this.renderObstacles(g, palette);
    g.rect(p - 2, p - 2, w - p * 2 + 4, h - p * 2 + 4).stroke({ color: palette.trim, width: 2, alpha: .8 });
    for (const x of [33, 447]) {
      g.rect(x - 4, 38, 8, 190).fill({ color: palette.wall });
      g.rect(x - 6, 40, 12, 8).fill({ color: palette.floorB });
    }
    g.rect(0, 0, w, 14).fill({ color: 0x05030a, alpha: .38 });
    g.rect(0, h - 14, w, 14).fill({ color: 0x05030a, alpha: .38 });
  }

  private renderFloorIdentity(g: Graphics, palette: ArenaPalette): void {
    if (this.theme === 'chains') {
      for (let x = 150; x <= 330; x += 30) {
        g.ellipse(x, 135 + Math.sin(x) * 8, 8, 4).stroke({ color: 0x71849b, width: 2, alpha: .35 });
        g.ellipse(x + 14, 135 + Math.sin(x + 1) * 8, 8, 4).stroke({ color: 0x71849b, width: 2, alpha: .35 });
      }
    } else if (this.theme === 'crypt') {
      for (const [x, y] of [[240, 62], [240, 211], [64, 135], [416, 135]]) {
        g.circle(x, y, 11).stroke({ color: palette.glow, width: 1, alpha: .35 });
        g.moveTo(x, y - 8).lineTo(x, y + 8).moveTo(x - 6, y).lineTo(x + 6, y).stroke({ color: palette.trim, width: 1, alpha: .28 });
      }
    } else if (this.theme === 'ember') {
      for (const points of [
        [24, 126, 86, 121, 145, 138, 203, 128, 240, 137],
        [456, 143, 404, 150, 349, 134, 294, 145, 240, 137],
      ]) g.poly(points).stroke({ color: 0xff633e, width: 4, alpha: .24 });
      g.circle(240, 137, 31).stroke({ color: 0xff884a, width: 3, alpha: .18 });
    } else if (this.theme === 'court') {
      g.rect(207, 24, 66, 222).fill({ color: 0x5b172d, alpha: .28 });
      g.rect(213, 24, 54, 222).stroke({ color: 0xc04b5e, width: 1, alpha: .3 });
      for (const y of [55, 218]) g.poly([230, y, 240, y - 8, 250, y, 240, y + 8]).stroke({ color: 0xe05263, width: 2, alpha: .38 });
    } else {
      g.rect(208, 24, 64, 222).fill({ color: 0x4a2739, alpha: .36 });
      for (let y = 72; y < 230; y += 38) g.poly([224, y, 240, y - 10, 256, y, 240, y + 10]).stroke({ color: 0xf2c14e, width: 2, alpha: .3 });
      g.arc(240, 55, 76, 0, Math.PI).stroke({ color: 0xf2c14e, width: 2, alpha: .22 });
    }
  }

  private renderObstacles(g: Graphics, palette: ArenaPalette): void {
    for (const obstacle of this.obstacles) {
      const x = obstacle.x - obstacle.w / 2;
      const y = obstacle.y - obstacle.h / 2;
      g.ellipse(obstacle.x, obstacle.y + obstacle.h / 2 + 4, obstacle.w * .62, 6).fill({ color: palette.shadow, alpha: .7 });
      if (obstacle.kind === 'pillar') {
        g.rect(x + 2, y + 4, obstacle.w - 4, obstacle.h - 2).fill({ color: palette.wall });
        g.rect(x, y, obstacle.w, 8).fill({ color: palette.floorB }).stroke({ color: palette.trim, width: 1, alpha: .5 });
        g.rect(x + 5, y + 8, obstacle.w - 10, obstacle.h - 10).fill({ color: palette.floorB });
        g.rect(x + 8, y + 10, 3, obstacle.h - 13).fill({ color: palette.glow, alpha: .26 });
      } else if (obstacle.kind === 'tomb') {
        g.roundRect(x, y, obstacle.w, obstacle.h, 4).fill({ color: 0x29343b }).stroke({ color: palette.trim, width: 1, alpha: .42 });
        g.lineTo(obstacle.x, y + 4).moveTo(obstacle.x, y + obstacle.h - 4).stroke({ color: palette.glow, width: 2, alpha: .42 });
        g.lineTo(obstacle.x - 6, obstacle.y).moveTo(obstacle.x + 6, obstacle.y).stroke({ color: palette.glow, width: 2, alpha: .42 });
      } else if (obstacle.kind === 'altar') {
        g.roundRect(x, y, obstacle.w, obstacle.h, 3).fill({ color: 0x421526 }).stroke({ color: 0xe05263, width: 2, alpha: .72 });
        g.circle(obstacle.x, obstacle.y, 7).fill({ color: 0x7d1f38, alpha: .72 }).stroke({ color: 0xf2c14e, width: 1 });
      } else if (obstacle.kind === 'throne') {
        g.rect(x, y, obstacle.w, obstacle.h).fill({ color: 0x392039 }).stroke({ color: 0xf2c14e, width: 2, alpha: .65 });
        g.poly([x + 5, y, x + 12, y - 12, x + 20, y, obstacle.x, y - 16, x + obstacle.w - 20, y, x + obstacle.w - 12, y - 12, x + obstacle.w - 5, y]).fill({ color: 0x6a3048 }).stroke({ color: 0xf2c14e, width: 1 });
      } else {
        g.poly([x, y + obstacle.h, x + 5, y + 4, x + 15, y, x + 22, y + 8, x + obstacle.w, y + 5, x + obstacle.w - 2, y + obstacle.h]).fill({ color: palette.floorB }).stroke({ color: palette.trim, width: 1, alpha: .32 });
      }
    }
  }

  public renderHazards(g: Graphics): void {
    for (const trap of this.traps) {
      if (trap.type === 'spikes') {
        g.rect(trap.x - trap.w / 2, trap.y - trap.h / 2, trap.w, trap.h).fill({ color: 0x241d2d });
        g.rect(trap.x - trap.w / 2, trap.y - trap.h / 2, trap.w, trap.h).stroke({ color: trap.isActive ? 0xff526b : 0x5f4a6d, width: 1 });
        if (trap.isActive) for (let spike = trap.x - trap.w / 2 + 2; spike < trap.x + trap.w / 2 - 2; spike += 8) g.poly([spike, trap.y + trap.h / 2 - 2, spike + 3, trap.y - trap.h / 2 + 2, spike + 6, trap.y + trap.h / 2 - 2]).fill({ color: 0xe7e9ef });
      } else if (trap.type === 'fire_brazier') {
        const flicker = Math.sin(this.clock * 14) * 2;
        g.rect(trap.x - 6, trap.y - 3, 12, 8).fill({ color: 0x4c3541 });
        g.circle(trap.x, trap.y - 5, 5 + flicker).fill({ color: 0xff884a, alpha: .85 });
        g.circle(trap.x, trap.y - 7, 2 + flicker * .3).fill({ color: 0xffe08a });
      } else if (trap.type === 'poison_pool' || trap.type === 'blood_pool') {
        const poison = trap.type === 'poison_pool';
        const color = poison ? 0x58d68d : 0xa62445;
        g.ellipse(trap.x, trap.y, trap.w / 2, trap.h / 2).fill({ color, alpha: .34 });
        g.ellipse(trap.x, trap.y, trap.w / 2 - 3, trap.h / 2 - 3).stroke({ color, width: 2, alpha: .56 });
        for (let bubble = 0; bubble < 3; bubble++) {
          const angle = this.clock * (1.2 + bubble * .3) + bubble * 2.1;
          g.circle(trap.x + Math.cos(angle) * trap.w * .28, trap.y + Math.sin(angle) * trap.h * .25, 1.5 + bubble * .4).fill({ color: poison ? 0xb1ffc8 : 0xe05263, alpha: .72 });
        }
      } else if (trap.type === 'void_rift') {
        const pulse = 1 + Math.sin(this.clock * 5) * .1;
        g.ellipse(trap.x, trap.y, trap.w / 2 * pulse, trap.h / 2 * pulse).fill({ color: 0x13081e, alpha: .86 });
        g.ellipse(trap.x, trap.y, trap.w / 2, trap.h / 2).stroke({ color: trap.isActive ? 0xb779f5 : 0x604272, width: trap.isActive ? 3 : 1, alpha: .82 });
        g.poly([trap.x - 13, trap.y, trap.x - 5, trap.y - 7, trap.x + 2, trap.y + 5, trap.x + 13, trap.y - 3]).stroke({ color: 0x6ff7ff, width: 1, alpha: trap.isActive ? .72 : .28 });
      } else {
        const active = trap.isActive;
        g.ellipse(trap.x, trap.y, trap.w / 2, trap.h / 2).fill({ color: active ? 0xff526b : 0x392032, alpha: active ? .72 : .45 });
        g.ellipse(trap.x, trap.y, trap.w / 2, trap.h / 2).stroke({ color: active ? 0xffd36b : 0x7b4c63, width: 2 });
        if (active) g.circle(trap.x, trap.y - 6, 9 + Math.sin(this.clock * 18) * 2).fill({ color: 0xff884a, alpha: .8 });
      }
    }
  }
}
