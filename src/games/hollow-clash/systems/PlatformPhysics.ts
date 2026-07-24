import type { KnightState, PlatformTile } from '../types';
import { PLATFORM_PHYSICS } from '../config';

export class PlatformPhysics {
  public knightWidth = 16;
  public knightHeight = 24;

  public update(knight: KnightState, tiles: PlatformTile[], dt: number): void {
    if (knight.isShadowDashing) {
      knight.dashCooldownTimer = Math.max(0, knight.dashCooldownTimer - dt);
      knight.x += knight.vx * dt;
      return;
    }

    // Apply gravity
    if (!knight.isGrounded && !knight.isWallSliding) {
      knight.vy += PLATFORM_PHYSICS.GRAVITY * dt;
    }

    // Apply wall slide speed limit
    if (knight.isWallSliding && knight.vy > PLATFORM_PHYSICS.WALL_SLIDE_SPEED) {
      knight.vy = PLATFORM_PHYSICS.WALL_SLIDE_SPEED;
    }

    const dx = knight.vx * dt;
    const dy = knight.vy * dt;

    knight.isGrounded = false;
    knight.isWallSliding = false;

    // Horizontal Movement & Collisions
    knight.x += dx;
    for (const tile of tiles) {
      if (!tile.isSolid) continue;

      if (this.checkAABB(knight.x, knight.y, this.knightWidth, this.knightHeight, tile)) {
        if (dx > 0) {
          knight.x = tile.x - this.knightWidth / 2;
          knight.vx = 0;
          if (knight.vy > 0 && knight.facing === 'right') knight.isWallSliding = true;
        } else if (dx < 0) {
          knight.x = tile.x + tile.width + this.knightWidth / 2;
          knight.vx = 0;
          if (knight.vy > 0 && knight.facing === 'left') knight.isWallSliding = true;
        }
      }
    }

    // Vertical Movement & Collisions
    knight.y += dy;
    for (const tile of tiles) {
      if (!tile.isSolid) continue;

      if (this.checkAABB(knight.x, knight.y, this.knightWidth, this.knightHeight, tile)) {
        if (dy > 0) {
          knight.y = tile.y;
          knight.vy = 0;
          knight.isGrounded = true;

          if (tile.type === 'moss') {
            knight.vx *= 0.8;
          }
        } else if (dy < 0) {
          knight.y = tile.y + tile.height + this.knightHeight;
          knight.vy = 0;
        }
      }
    }
  }

  private checkAABB(kx: number, ky: number, kw: number, kh: number, tile: PlatformTile): boolean {
    const kLeft = kx - kw / 2;
    const kRight = kx + kw / 2;
    const kTop = ky - kh;
    const kBottom = ky;

    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;

    return kLeft < tRight && kRight > tLeft && kTop < tBottom && kBottom > tTop;
  }
}
