import type { Adventurer } from '../entities/Adventurer';

export class PerLaneCameraSystem {
  public laneCameraX: number[] = [];

  public init(playerCount: number): void {
    this.laneCameraX = new Array(playerCount).fill(0);
  }

  public update(adventurers: Adventurer[], maxScroll: number): void {
    adventurers.forEach((adv, idx) => {
      if (idx >= this.laneCameraX.length || !adv.isAlive) return;

      // Desired camera position keeps player ~160px from left screen edge
      const targetX = adv.x - 160;
      const desiredX = Math.max(0, Math.min(maxScroll, targetX));

      // Smooth per-lane linear interpolation (lerp)
      this.laneCameraX[idx] += (desiredX - this.laneCameraX[idx]) * 0.15;
    });
  }
}
