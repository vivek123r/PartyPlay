import { Graphics } from 'pixi.js';
import type { SynergyComboEffect } from '../types';

export class SynergySystem {
  public activeEffects: SynergyComboEffect[] = [];

  public triggerSynergy(name: string, x: number, y: number, color = 0x00f0ff): void {
    this.activeEffects.push({
      name,
      x,
      y,
      radius: 35,
      duration: 0.8,
      color,
    });
  }

  public update(dt: number): void {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const fx = this.activeEffects[i];
      fx.duration -= dt;
      fx.radius += 40 * dt;
      if (fx.duration <= 0) {
        this.activeEffects.splice(i, 1);
      }
    }
  }

  public render(g: Graphics): void {
    for (const fx of this.activeEffects) {
      g.circle(fx.x, fx.y, fx.radius).fill({ color: fx.color, alpha: fx.duration });
      g.circle(fx.x, fx.y, fx.radius * 0.7).stroke({ color: 0xfffffe, width: 2, alpha: fx.duration });
    }
  }
}
