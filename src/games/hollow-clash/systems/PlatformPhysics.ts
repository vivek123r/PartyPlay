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

    const isCrystalDash = knight.isCrystalDashing || knightObj?.isCrystalDashing;
    const isChargingDash = knight.isChargingSuperDash || knightObj?.isChargingSuperDash;
    const isDiving = knight.isDiving || knightObj?.isDiving;

    // Desolate Dive velocity lock
    if (isDiving) {
      knight.vy = PLATFORM_PHYSICS.DESOLATE_DIVE_SPEED; // 600
    }
    // Crystal Dash velocity lock
    else if (isCrystalDash) {
      knight.vy = 0;
      knight.vx = knight.facing === 'right' ? PLATFORM_PHYSICS.CRYSTAL_DASH_SPEED : -PLATFORM_PHYSICS.CRYSTAL_DASH_SPEED;
    }
    // Charging Super Dash velocity lock
    else if (isChargingDash) {
      knight.vx = 0;
      knight.vy = 0;
    }
    // Standard Gravity
    else if (!knight.isGrounded && !knight.isWallSliding && !knight.isShadowDashing) {
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
    if (!isChargingDash) {
      knight.isWallClinging = false;
      if (knightObj) knightObj.isWallClinging = false;
    }

    // Horizontal Movement & Collisions
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

        // Cancel Crystal Dash on solid wall hit
        if (isCrystalDash) {
          knight.isCrystalDashing = false;
          if (knightObj) {
            knightObj.isCrystalDashing = false;
            knightObj.state.isCrystalDashing = false;
          }
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

          // Desolate Dive Ground Impact
          if (isDiving) {
            knight.isDiving = false;
            if (knightObj) {
              knightObj.isDiving = false;
              knightObj.state.isDiving = false;
              knightObj.onDiveImpact();
            }
          }

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

    // Moss Wall Sliding & Clinging Check
    if (!knight.isGrounded && knight.vy > 0 && !knight.isShadowDashing && !isCrystalDash) {
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
          knight.isWallClinging = true;
          if (knightObj) knightObj.isWallClinging = true;

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
          knight.isDiving = false;
          knight.isCrystalDashing = false;
          if (knightObj) {
            knightObj.isDiving = false;
            knightObj.isCrystalDashing = false;
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
