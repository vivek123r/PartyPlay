import { Graphics } from 'pixi.js';

export class Loot {
  public id: string;
  public type: 'chest' | 'health_potion' | 'mana_gem' | 'speed_orb';
  public x: number;
  public y: number;
  public value: number;
  public lifetime = 12.0;

  constructor(id: string, type: 'chest' | 'health_potion' | 'mana_gem' | 'speed_orb', x: number, y: number) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;

    this.value = type === 'chest' ? 100 : type === 'health_potion' ? 40 : 25;
  }

  public update(dt: number): boolean {
    this.lifetime -= dt;
    return this.lifetime > 0;
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    if (this.type === 'chest') {
      g.rect(x - 6, y - 5, 12, 10).fill({ color: 0xd35400 });
      g.rect(x - 6, y - 5, 12, 3).fill({ color: 0xf1c40f });
      g.rect(x - 2, y - 1, 4, 3).fill({ color: 0xf39c12 });
    } else if (this.type === 'health_potion') {
      g.circle(x, y, 4).fill({ color: 0xe74c3c });
      g.rect(x - 1, y - 6, 2, 3).fill({ color: 0xecf0f1 });
    } else if (this.type === 'mana_gem') {
      g.poly([x, y - 5, x + 4, y, x, y + 5, x - 4, y]).fill({ color: 0x3498db });
    } else {
      // speed_orb
      g.circle(x, y, 4).fill({ color: 0x2ecc71 });
    }
  }
}
