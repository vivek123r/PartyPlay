import { Graphics } from 'pixi.js';
import type { KnightMaskType, KnightState } from '../types';
import { PLATFORM_PHYSICS, COMBAT_STATS } from '../config';

export class Knight implements KnightState {
  public id: number;
  public mask: KnightMaskType;

  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;

  public hp = COMBAT_STATS.MASK_HP;
  public maxHp = COMBAT_STATS.MASK_HP;
  public soul = 0;
  public maxSoul = COMBAT_STATS.MAX_SOUL;

  public isGrounded = false;
  public isWallSliding = false;
  public isShadowDashing = false;
  public facing: 'left' | 'right' = 'right';

  public canDoubleJump = true;
  public dashTimer = 0;
  public dashCooldownTimer = 0;

  public isSlashing = false;
  public slashDir: 'forward' | 'up' | 'down' = 'forward';
  public slashTimer = 0;

  public isInvulnerable = false;
  public invulnerableTimer = 0;

  public geoCount = 0;
  private shadowTrail: { x: number; y: number; alpha: number }[] = [];

  constructor(id: number, mask: KnightMaskType, x: number, y: number) {
    this.id = id;
    this.mask = mask;
    this.x = x;
    this.y = y;
  }

  public update(
    dt: number,
    moveLeft: boolean,
    moveRight: boolean,
    jumpPressed: boolean,
    downActive: boolean,
    upActive: boolean,
    slashPressed: boolean,
    dashPressed: boolean
  ): void {
    // 1. Timers
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) this.isInvulnerable = false;
    }

    if (this.isSlashing) {
      this.slashTimer -= dt;
      if (this.slashTimer <= 0) this.isSlashing = false;
    }

    // Shadow Trail Fading
    for (let i = this.shadowTrail.length - 1; i >= 0; i--) {
      this.shadowTrail[i].alpha -= 3.0 * dt;
      if (this.shadowTrail[i].alpha <= 0) this.shadowTrail.splice(i, 1);
    }

    // 2. Shadow Dash State
    if (this.isShadowDashing) {
      this.dashTimer -= dt;
      this.shadowTrail.push({ x: this.x, y: this.y, alpha: 0.6 });
      if (this.dashTimer <= 0) {
        this.isShadowDashing = false;
        this.vx = (this.facing === 'right' ? 1 : -1) * PLATFORM_PHYSICS.MOVE_SPEED;
      }
      return;
    }

    // Reset Double Jump when grounded or wall sliding
    if (this.isGrounded || this.isWallSliding) {
      this.canDoubleJump = true;
    }

    // Horizontal Movement Input
    if (moveLeft) {
      this.vx = -PLATFORM_PHYSICS.MOVE_SPEED;
      this.facing = 'left';
    } else if (moveRight) {
      this.vx = PLATFORM_PHYSICS.MOVE_SPEED;
      this.facing = 'right';
    } else {
      this.vx = 0;
    }

    // Jump / Double Jump / Wall Jump Input
    if (jumpPressed) {
      if (this.isGrounded) {
        this.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
        this.isGrounded = false;
      } else if (this.isWallSliding) {
        this.vy = PLATFORM_PHYSICS.JUMP_VELOCITY * 0.9;
        this.vx = (this.facing === 'right' ? -1 : 1) * PLATFORM_PHYSICS.MOVE_SPEED * 1.2;
        this.facing = this.facing === 'right' ? 'left' : 'right';
        this.isWallSliding = false;
      } else if (this.canDoubleJump) {
        this.vy = PLATFORM_PHYSICS.JUMP_VELOCITY * 0.85;
        this.canDoubleJump = false;
      }
    }

    // Shadow Dash Trigger
    if (dashPressed && this.dashCooldownTimer <= 0) {
      this.isShadowDashing = true;
      this.dashTimer = PLATFORM_PHYSICS.SHADOW_DASH_DURATION;
      this.dashCooldownTimer = PLATFORM_PHYSICS.SHADOW_DASH_COOLDOWN;
      this.vx = (this.facing === 'right' ? 1 : -1) * PLATFORM_PHYSICS.SHADOW_DASH_SPEED;
      this.vy = 0;
      this.isInvulnerable = true;
      this.invulnerableTimer = 0.3;
    }

    // Nail Slash Trigger
    if (slashPressed && !this.isSlashing) {
      this.isSlashing = true;
      this.slashTimer = 0.2;

      if (downActive && !this.isGrounded) {
        this.slashDir = 'down';
      } else if (upActive) {
        this.slashDir = 'up';
      } else {
        this.slashDir = 'forward';
        // Recoil
        this.vx += (this.facing === 'right' ? -1 : 1) * PLATFORM_PHYSICS.NAIL_RECOIL_VELOCITY;
      }
    }
  }

  public triggerPogoBounce(): void {
    if (this.slashDir === 'down') {
      this.vy = PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY;
      this.canDoubleJump = true;
    }
  }

  public takeDamage(): void {
    if (this.isInvulnerable || this.isShadowDashing) return;

    this.hp = Math.max(0, this.hp - 1);
    this.isInvulnerable = true;
    this.invulnerableTimer = 1.0;
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Render Shadow Trails
    for (const st of this.shadowTrail) {
      g.rect(st.x - 6, st.y - 18, 12, 18).fill({ color: 0x00f0ff, alpha: st.alpha * 0.4 });
    }

    // Flashing when invulnerable
    if (this.isInvulnerable && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
      return;
    }

    // 1. Flowing Dark Cloak
    g.poly([x - 7, y, x + 7, y, x, y - 18]).fill({ color: 0x2c3e50 });

    // 2. Glowing White Horn Mask
    const maskColor = 0xf5f6fa;
    g.ellipse(x, y - 16, 6, 8).fill({ color: maskColor });

    // Horns based on Mask Type
    if (this.mask === 'hornet') {
      g.poly([x - 4, y - 22, x - 9, y - 30, x - 2, y - 24]).fill({ color: maskColor });
      g.poly([x + 4, y - 22, x + 9, y - 30, x + 2, y - 24]).fill({ color: maskColor });
    } else {
      // Vessel Horns
      g.poly([x - 3, y - 22, x - 6, y - 29, x - 1, y - 23]).fill({ color: maskColor });
      g.poly([x + 3, y - 22, x + 6, y - 29, x + 1, y - 23]).fill({ color: maskColor });
    }

    // Black Eyes
    g.circle(x - 2, y - 16, 2).fill({ color: 0x000000 });
    g.circle(x + 2, y - 16, 2).fill({ color: 0x000000 });

    // 3. Nail Slash Blade Arc Animation
    if (this.isSlashing) {
      g.stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
      if (this.slashDir === 'forward') {
        const sx = this.facing === 'right' ? x + 10 : x - 10;
        g.circle(sx, y - 12, 14).fill({ color: 0x00f0ff, alpha: 0.5 });
      } else if (this.slashDir === 'down') {
        g.circle(x, y + 8, 14).fill({ color: 0x00f0ff, alpha: 0.5 });
      } else if (this.slashDir === 'up') {
        g.circle(x, y - 28, 14).fill({ color: 0x00f0ff, alpha: 0.5 });
      }
    }
  }
}
