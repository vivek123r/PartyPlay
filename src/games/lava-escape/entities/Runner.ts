import { Container, Graphics } from 'pixi.js';
import type { PlayerConfig } from '@runtime/types';
import { LAVA_ESCAPE_CONFIG } from '../config';
import type { Rect } from '../types';

export class Runner {
  public readonly id: number;
  public readonly name: string;
  public readonly color: number;
  public readonly container = new Container();

  public x = 62;
  public y: number = LAVA_ESCAPE_CONFIG.FLOOR_Y;
  public vx = 0;
  public vy = 0;
  public isAlive = true;
  public isSafe = false;
  public isGrounded = false;
  public touchingWallLeft = false;
  public touchingWallRight = false;
  public facing = 1;
  public standingPlatformId: string | null = null;
  public coyoteTimer = 0;
  public jumpBufferTimer = 0;
  public wallJumpLock = 0;
  public hazardGraceTimer = 0;

  private readonly graphics = new Graphics();
  private animationTime = 0;
  private squash = 0;
  private flashTimer = 0;

  constructor(config: PlayerConfig, spawnIndex: number) {
    this.id = config.id;
    this.name = config.name;
    this.color = parseInt(config.color.replace('#', ''), 16) || 0xffffff;
    this.x = 58 + spawnIndex * 20;
    this.container.addChild(this.graphics);
    this.render();
  }

  public get bounds(): Rect {
    const width = LAVA_ESCAPE_CONFIG.PLAYER.WIDTH;
    const height = LAVA_ESCAPE_CONFIG.PLAYER.HEIGHT;
    return { x: this.x - width / 2, y: this.y - height, width, height };
  }

  public resetForLevel(spawnIndex: number): void {
    this.x = 58 + spawnIndex * 20;
    this.y = LAVA_ESCAPE_CONFIG.FLOOR_Y;
    this.vx = 0;
    this.vy = 0;
    this.isAlive = true;
    this.isSafe = false;
    this.isGrounded = true;
    this.touchingWallLeft = false;
    this.touchingWallRight = false;
    this.standingPlatformId = 'start-floor';
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallJumpLock = 0;
    this.hazardGraceTimer = 0;
    this.container.visible = true;
    this.render();
  }

  public updateMovement(
    dt: number,
    moveLeft: boolean,
    moveRight: boolean,
    jumpPressed: boolean,
    jumpReleased: boolean,
    speedMultiplier: number
  ): void {
    this.tickTimers(dt);
    this.animationTime += dt;
    if (!this.isAlive || this.isSafe) {
      this.render();
      return;
    }

    const config = LAVA_ESCAPE_CONFIG.PLAYER;
    const direction = Number(moveRight) - Number(moveLeft);
    const maxSpeed = config.MAX_SPEED * speedMultiplier;
    const control = this.isGrounded ? 1 : config.AIR_CONTROL;

    if (direction !== 0 && this.wallJumpLock <= 0) {
      this.vx += direction * config.ACCELERATION * control * dt * speedMultiplier;
      this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
      this.facing = direction;
    } else if (this.isGrounded) {
      const friction = config.FRICTION * dt * speedMultiplier;
      if (Math.abs(this.vx) <= friction) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * friction;
    }

    if (jumpPressed) this.jumpBufferTimer = config.JUMP_BUFFER;

    const wallSliding =
      !this.isGrounded &&
      this.vy > 0 &&
      ((this.touchingWallLeft && moveLeft) || (this.touchingWallRight && moveRight));

    if (this.jumpBufferTimer > 0) {
      if (this.isGrounded || this.coyoteTimer > 0) {
        this.vy = config.JUMP_SPEED * Math.sqrt(speedMultiplier);
        this.isGrounded = false;
        this.standingPlatformId = null;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.squash = -0.3;
      } else if (wallSliding || this.touchingWallLeft || this.touchingWallRight) {
        const away = this.touchingWallLeft ? 1 : -1;
        this.vx = away * config.WALL_JUMP_X * speedMultiplier;
        this.vy = config.WALL_JUMP_Y * Math.sqrt(speedMultiplier);
        this.facing = away;
        this.wallJumpLock = 0.12;
        this.jumpBufferTimer = 0;
      }
    }

    // A quick tap still produces a useful jump. Holding the button gives
    // the full arc, but releasing only trims the apex instead of cancelling it.
    if (jumpReleased && this.vy < -90) this.vy *= 0.82;

    if (!this.isGrounded) {
      this.vy = Math.min(
        config.MAX_FALL_SPEED * speedMultiplier,
        this.vy + config.GRAVITY * dt * speedMultiplier
      );
      if (wallSliding) this.vy = Math.min(this.vy, config.WALL_SLIDE_SPEED);
    }

    if (this.isGrounded) this.coyoteTimer = config.COYOTE_TIME;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    this.render();
  }

  public land(platformId: string): void {
    if (!this.isGrounded && this.vy > 100) this.squash = 0.32;
    this.vy = 0;
    this.isGrounded = true;
    this.standingPlatformId = platformId;
    this.coyoteTimer = LAVA_ESCAPE_CONFIG.PLAYER.COYOTE_TIME;
  }

  public bounce(strength = -286): void {
    this.vy = strength;
    this.isGrounded = false;
    this.standingPlatformId = null;
    this.squash = -0.35;
  }

  public absorbHazard(): boolean {
    return this.hazardGraceTimer > 0;
  }

  public showImpact(): void {
    this.flashTimer = Math.max(this.flashTimer, 0.18);
    this.squash = Math.max(this.squash, 0.12);
  }

  public markSafe(): void {
    this.isSafe = true;
    this.vx = 0;
    this.vy = 0;
    this.container.visible = false;
  }

  public kill(): void {
    this.isAlive = false;
    this.vx = 0;
    this.vy = 0;
    this.flashTimer = 0.8;
    this.render();
  }

  private tickTimers(dt: number): void {
    this.hazardGraceTimer = Math.max(0, this.hazardGraceTimer - dt);
    this.wallJumpLock = Math.max(0, this.wallJumpLock - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.squash *= Math.pow(0.015, dt);
  }

  public render(): void {
    const g = this.graphics;
    g.clear();
    const run = this.isGrounded ? Math.sin(this.animationTime * (8 + Math.abs(this.vx) * 0.05)) : 0;
    const stretchX = 1 + this.squash;
    const stretchY = 1 - this.squash * 0.7;
    const bodyColor = this.flashTimer > 0 && Math.floor(this.flashTimer * 20) % 2 === 0
      ? 0xffffff
      : this.color;

    if (!this.isAlive) {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const radius = 7 + (1 - this.flashTimer) * 8;
        g.rect(Math.cos(angle) * radius - 2, -10 + Math.sin(angle) * radius - 2, 4, 4)
          .fill({ color: i % 2 ? this.color : 0xffd166, alpha: Math.max(0.15, this.flashTimer) });
      }
      return;
    }

    g.rect(-5 * stretchX, -18 * stretchY, 10 * stretchX, 12 * stretchY)
      .fill({ color: bodyColor });
    g.rect(-6 * stretchX, -20 * stretchY, 12 * stretchX, 5 * stretchY)
      .fill({ color: 0x201827 });
    g.rect(this.facing > 0 ? 2 : -4, -16, 2, 2).fill({ color: 0xffffff });
    g.rect(this.facing > 0 ? 3 : -4, -15, 1, 1).fill({ color: 0x111111 });

    const legOffset = run * 3;
    g.rect(-5 + legOffset, -6, 4, 6).fill({ color: 0x25213a });
    g.rect(1 - legOffset, -6, 4, 6).fill({ color: 0x25213a });
    g.rect(-7 - legOffset * 0.35, -14, 3, 7).fill({ color: bodyColor });
    g.rect(4 + legOffset * 0.35, -14, 3, 7).fill({ color: bodyColor });

    this.container.position.set(Math.round(this.x), Math.round(this.y));
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
