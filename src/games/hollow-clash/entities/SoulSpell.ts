import { Graphics } from 'pixi.js';

export class SoulSpell {
  public id: string;
  public type: 'vengeful_spirit' | 'focus_heal';
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius = 14;
  public damage = 40;
  public lifetime = 2.0;

  constructor(id: string, type: 'vengeful_spirit' | 'focus_heal', x: number, y: number, facingRight: boolean) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = type === 'vengeful_spirit' ? (facingRight ? 360 : -360) : 0;
    this.vy = 0;
  }

  public update(dt: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;

    return this.lifetime > 0;
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    if (this.type === 'vengeful_spirit') {
      // Giant White/Cyan Soul Blast Projectile
      g.circle(x, y, this.radius).fill({ color: 0x00f0ff, alpha: 0.7 });
      g.circle(x, y, this.radius * 0.6).fill({ color: 0xffffff, alpha: 0.9 });
      g.ellipse(x - (this.vx > 0 ? 8 : -8), y, 10, 6).fill({ color: 0x00f0ff, alpha: 0.5 });
    } else {
      // Focus Heal Aura Ring
      g.circle(x, y, 20).stroke({ color: 0x00f0ff, width: 2, alpha: 0.8 });
      g.circle(x, y, 12).fill({ color: 0xffffff, alpha: 0.5 });
    }
  }
}
