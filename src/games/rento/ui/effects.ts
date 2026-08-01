import { Container, Graphics } from 'pixi.js';
import { RENT0_THEME } from './theme';

interface Pulse { graphics: Graphics; x: number; y: number; age: number; duration: number; color: number; }
/** Small pooled procedural effects; update each frame from the game loop. */
export class RentoEffects extends Container {
  private pulses: Pulse[] = [];
  public pulse(x: number, y: number, color: number = RENT0_THEME.gold, duration = 0.55): void {
    const graphics = new Graphics(); this.addChild(graphics); this.pulses.push({ graphics, x, y, age: 0, duration, color });
  }
  public update(dt: number): void {
    this.pulses = this.pulses.filter((pulse) => {
      pulse.age += dt; const p = Math.min(1, pulse.age / pulse.duration); pulse.graphics.clear().circle(pulse.x, pulse.y, 8 + p * 30).stroke({ color: pulse.color, width: 2, alpha: 1 - p });
      if (p < 1) return true; pulse.graphics.destroy(); return false;
    });
  }
  public clear(): void { this.pulses.forEach((pulse) => pulse.graphics.destroy()); this.pulses = []; }
}
