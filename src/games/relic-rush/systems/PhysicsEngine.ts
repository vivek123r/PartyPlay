import { Adventurer } from '../entities/Adventurer';

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isOneWay?: boolean;
  laneIndex?: number;
}

export class PhysicsEngine {
  public static checkAABB(
    r1: { x: number; y: number; width: number; height: number },
    r2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  public updateAdventurerPhysics(
    adventurer: Adventurer,
    dt: number,
    platforms: RectBounds[],
    chamberMinY: number,
    chamberMaxY: number,
    chamberWidth: number
  ): void {
    if (!adventurer.isAlive || adventurer.fellInPit) return;

    // Filter platforms belonging to this player's lane
    const lanePlatforms = platforms.filter(
      (p) => p.laneIndex === undefined || p.laneIndex === adventurer.laneIndex
    );

    // Reset wall & ground flags before collision step
    adventurer.isTouchingWallLeft = false;
    adventurer.isTouchingWallRight = false;

    // 1. Horizontal Movement & Collision Step
    adventurer.x += adventurer.vx * dt;

    // Clamp horizontal chamber bounds
    const halfW = adventurer.width / 2;
    if (adventurer.x - halfW < 0) {
      adventurer.x = halfW;
      adventurer.vx = 0;
      adventurer.isTouchingWallLeft = true;
    } else if (adventurer.x + halfW > chamberWidth) {
      adventurer.x = chamberWidth - halfW;
      adventurer.vx = 0;
      adventurer.isTouchingWallRight = true;
    }

    // Platform Horizontal Collisions
    const pBoundsX = {
      x: adventurer.x - halfW,
      y: adventurer.y - adventurer.height,
      width: adventurer.width,
      height: adventurer.height - 2,
    };

    for (const plat of lanePlatforms) {
      if (plat.isOneWay) continue;
      if (PhysicsEngine.checkAABB(pBoundsX, plat)) {
        if (adventurer.vx > 0) {
          adventurer.x = plat.x - halfW;
          adventurer.vx = 0;
          adventurer.isTouchingWallRight = true;
        } else if (adventurer.vx < 0) {
          adventurer.x = plat.x + plat.width + halfW;
          adventurer.vx = 0;
          adventurer.isTouchingWallLeft = true;
        }
      }
    }

    // 2. Vertical Movement & Collision Step
    adventurer.y += adventurer.vy * dt;

    const pBoundsY = {
      x: adventurer.x - halfW + 1,
      y: adventurer.y - adventurer.height,
      width: adventurer.width - 2,
      height: adventurer.height,
    };

    let landed = false;
    const oldY = adventurer.y - adventurer.vy * dt;

    for (const plat of lanePlatforms) {
      if (PhysicsEngine.checkAABB(pBoundsY, plat)) {
        // Tightened platform top landing check (oldY <= plat.y + 2)
        if (adventurer.vy >= 0 && oldY <= plat.y + 2) {
          adventurer.y = plat.y;
          adventurer.landOnGround();
          landed = true;
          break;
        } else if (!plat.isOneWay && adventurer.vy < 0) {
          // Hitting ceiling
          adventurer.y = plat.y + plat.height + adventurer.height;
          adventurer.vy = 0;
        }
      }
    }

    // Detect Pit Fall Gap (falling below chamberMaxY)
    if (!landed && adventurer.y >= chamberMaxY + 12) {
      adventurer.fellInPit = true;
    }

    if (!landed && adventurer.isGrounded) {
      adventurer.isGrounded = false;
    }
  }
}
