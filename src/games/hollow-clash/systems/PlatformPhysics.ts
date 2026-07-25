import type { KnightState, PlatformTile } from '../types';
import { PLATFORM_PHYSICS } from '../config';
import type { Knight } from '../entities/Knight';

export class PlatformPhysics {
  public knightWidth = 16;
  public knightHeight = 24;

  public update(knightInput: KnightState | Knight, tiles: PlatformTile[], dt: number): void {
    const knight = 'state' in knightInput ? (knightInput as Knight).state : (knightInput as KnightState);
    const knightObj = 'takeDamage' in knightInput ? (knightInput as Knight) : null;

    // Initialize lastSafeGroundPosition if missing
    if (!knight.lastSafeGroundPosition) {
      knight.lastSafeGroundPosition = { x: knight.x, y: knight.y };
    }
    if (knightObj && !knightObj.lastSafeGroundPosition) {
      knightObj.lastSafeGroundPosition = { x: knight.x, y: knight.y };
    }

    // Apply gravity (if not grounded, not wall sliding, and not shadow dashing)
    if (!knight.isGrounded && !knight.isWallSliding && !knight.isShadowDashing) {
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

    // Horizontal Movement & Collisions (Obeyed during normal movement & Shadow Dash)
    knight.x += dx;
    for (const tile of tiles) {
      if (!tile.isSolid) continue;

      if (this.checkHorizontalAABB(knight.x, knight.y, this.knightWidth, this.knightHeight, tile)) {
        if (dx > 0) {
          knight.x = tile.x - this.knightWidth;
          knight.vx = 0;
        } else if (dx < 0) {
          knight.x = tile.x + tile.width;
          knight.vx = 0;
        }
      }
    }

    // Vertical Movement & Collisions
    knight.y += dy;
    for (const tile of tiles) {
      if (!tile.isSolid) continue;

      if (dy >= 0) {
        if (this.checkVerticalLandingAABB(knight.x, knight.y, this.knightWidth, this.knightHeight, tile)) {
          knight.y = tile.y - this.knightHeight;
          knight.vy = 0;
          knight.isGrounded = true;

          if (tile.type !== 'spikes') {
            const pos = { x: knight.x, y: knight.y };
            knight.lastSafeGroundPosition = pos;
            if (knightObj) knightObj.lastSafeGroundPosition = pos;
          }

          if (tile.type === 'moss') {
            knight.vx *= 0.8;
          }
        }
      } else if (dy < 0) {
        if (this.checkVerticalCeilingAABB(knight.x, knight.y, this.knightWidth, this.knightHeight, tile)) {
          knight.y = tile.y + tile.height;
          knight.vy = 0;
        }
      }
    }

    // Update safe ground position if currently grounded on solid non-spike tile
    if (knight.isGrounded) {
      const pos = { x: knight.x, y: knight.y };
      knight.lastSafeGroundPosition = pos;
      if (knightObj) knightObj.lastSafeGroundPosition = pos;
    }

    // Moss Wall Sliding Check (triggers ONLY on moss tiles, maintains continuous slide flush against wall)
    if (!knight.isGrounded && knight.vy > 0 && !knight.isShadowDashing) {
      for (const tile of tiles) {
        if (!tile.isSolid || tile.type !== 'moss') continue;

        // Flush right: knight facing right pressing against left face of moss wall
        const isFlushRight =
          knight.facing === 'right' &&
          Math.abs(knight.x + this.knightWidth - tile.x) <= 1.0 &&
          knight.y < tile.y + tile.height &&
          knight.y + this.knightHeight > tile.y;

        // Flush left: knight facing left pressing against right face of moss wall
        const isFlushLeft =
          knight.facing === 'left' &&
          Math.abs(knight.x - (tile.x + tile.width)) <= 1.0 &&
          knight.y < tile.y + tile.height &&
          knight.y + this.knightHeight > tile.y;

        if (isFlushRight || isFlushLeft) {
          knight.isWallSliding = true;
          if (knight.vy > PLATFORM_PHYSICS.WALL_SLIDE_SPEED) {
            knight.vy = PLATFORM_PHYSICS.WALL_SLIDE_SPEED;
          }
          break;
        }
      }
    }

    // Spike Pit Hazard Collision & Safe Respawn
    for (const tile of tiles) {
      if (tile.type === 'spikes') {
        if (this.checkAABBOverlap(knight.x, knight.y, this.knightWidth, this.knightHeight, tile)) {
          if (knightObj) {
            knightObj.takeDamage(1);
          } else {
            knight.hp = Math.max(0, knight.hp - 1);
          }

          const safePos = knight.lastSafeGroundPosition || { x: knight.x, y: knight.y };
          knight.x = safePos.x;
          knight.y = safePos.y;
          knight.vx = 0;
          knight.vy = 0;
          knight.isGrounded = true;

          if (knightObj) {
            knightObj.lastSafeGroundPosition = { x: safePos.x, y: safePos.y };
            knightObj.container.position.set(safePos.x, safePos.y);
          }
          break;
        }
      }
    }
  }

  private checkAABBOverlap(kx: number, ky: number, kw: number, kh: number, tile: PlatformTile): boolean {
    const kLeft = kx;
    const kRight = kx + kw;
    const kTop = ky;
    const kBottom = ky + kh;

    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;

    return kRight > tLeft && kLeft < tRight && kBottom > tTop && kTop < tBottom;
  }

  private checkHorizontalAABB(kx: number, ky: number, kw: number, kh: number, tile: PlatformTile): boolean {
    const kLeft = kx;
    const kRight = kx + kw;
    const kTop = ky;
    const kBottom = ky + kh;

    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;

    return kRight > tLeft && kLeft < tRight && kBottom > tTop && kTop < tBottom;
  }

  private checkVerticalLandingAABB(kx: number, ky: number, kw: number, kh: number, tile: PlatformTile): boolean {
    const kLeft = kx;
    const kRight = kx + kw;
    const kTop = ky;
    const kBottom = ky + kh;

    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;

    return kBottom >= tTop && kTop < tTop && kRight > tLeft && kLeft < tRight;
  }

  private checkVerticalCeilingAABB(kx: number, ky: number, kw: number, kh: number, tile: PlatformTile): boolean {
    const kLeft = kx;
    const kRight = kx + kw;
    const kTop = ky;
    const kBottom = ky + kh;

    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;

    return kTop <= tBottom && kBottom > tBottom && kRight > tLeft && kLeft < tRight;
  }
}
