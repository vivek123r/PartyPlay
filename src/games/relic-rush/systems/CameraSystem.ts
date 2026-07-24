import type { Adventurer } from '../entities/Adventurer';
import { RELIC_RUSH_CONFIG } from '../config';

export class CameraSystem {
  public cameraX = 0;

  public update(adventurers: Adventurer[], maxScroll: number): void {
    if (adventurers.length === 0) return;

    // Filter alive players
    const activePlayers = adventurers.filter((p) => p.isAlive);
    if (activePlayers.length === 0) return;

    // Track the leading player's X position
    const leaderX = Math.max(...activePlayers.map((p) => p.x));

    // Keep leader at ~160px from the left edge of the screen
    const targetX = leaderX - 160;

    // Clamp camera within map bounds (0 to maxScroll)
    const desiredX = Math.max(0, Math.min(maxScroll, targetX));

    // Smooth linear interpolation (lerp)
    this.cameraX += (desiredX - this.cameraX) * 0.15;
  }
}
