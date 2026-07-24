import { Graphics } from 'pixi.js';
import type { ProjectileEntity } from '../types';

export class Projectile implements ProjectileEntity {
  public id: string;
  public ownerId: number;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public damage: number;
  public element: 'fireball' | 'arrow' | 'dagger' | 'lava_wave';
  public lifetime: number;
  public color: number;

  constructor(id: string, ownerId: number, x: number, y: number, vx: number, vy: number, damage: number, element: 'fireball' | 'arrow' | 'dagger' | 'lava_wave') {
    this.id = id;
    this.ownerId = ownerId;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.element = element;

    if (element === 'fireball') {
      this.radius = 6;
      this.lifetime = 2.0;
      this.color = 0xe67e22;
    } else if (element === 'arrow') {
      this.radius = 3;
      this.lifetime = 1.8;
      this.color = 0xf1c40f;
    } else if (element === 'dagger') {
      this.radius = 4;
      this.lifetime = 1.5;
      this.color = 0x2ecc71;
    } else {
      // lava_wave
      this.radius = 16;
      this.lifetime = 3.0;
      this.color = 0xe74c3c;
    }
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

    if (this.element === 'fireball') {
      g.circle(x, y, this.radius).fill({ color: this.color });
      g.circle(x, y, this.radius * 0.5).fill({ color: 0xfffffe });
    } else if (this.element === 'arrow') {
      g.rect(x - 4, y - 1, 8, 2).fill({ color: this.color });
    } else if (this.element === 'dagger') {
      g.rect(x - 3, y - 2, 6, 4).fill({ color: this.color });
    } else {
      // lava_wave
      g.circle(x, y, this.radius).fill({ color: 0xe74c3c, alpha: 0.6 });
      g.circle(x, y, this.radius * 0.6).fill({ color: 0xf39c12, alpha: 0.8 });
    }
  }
}
