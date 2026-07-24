import { Graphics, Container } from 'pixi.js';
import { RELIC_RUSH_CONFIG } from '../config';

export type AdventurerState =
  | 'idle'
  | 'running'
  | 'jumping'
  | 'falling'
  | 'wall_sliding'
  | 'swimming';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
  size?: number;
}

export class Adventurer {
  public id: number;
  public color: string;
  public laneIndex: number;
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public width = 14;
  public height = 18;

  public hearts = 3;
  public maxHearts = 3;
  public isGrounded = false;
  public isTouchingWallLeft = false;
  public isTouchingWallRight = false;
  public isSwimming = false;
  public wasSwimming = false;
  public isAlive = true;
  public hasReachedExit = false;
  public fellInPit = false;

  // Juicy Platformer Movement Timers
  public coyoteTimer = 0;
  public jumpBufferTimer = 0;

  // Safe Checkpoint position tracking on solid ground
  public lastSafeX: number;
  public lastSafeY: number;

  public currentState: AdventurerState = 'idle';
  public facingDirection: 'left' | 'right' = 'right';

  public invincibilityTimer = 0;
  public trophies = 0;

  public container: Container;
  public graphics: Graphics;
  private particleGraphics: Graphics;
  private particles: Particle[] = [];

  private squashX = 1.0;
  private squashY = 1.0;
  private animFrame = 0;
  private animTimer = 0;

  constructor(id: number, color: string, laneIndex: number, startX: number, startY: number) {
    this.id = id;
    this.color = color;
    this.laneIndex = laneIndex;
    this.x = startX;
    this.y = startY;
    this.lastSafeX = startX;
    this.lastSafeY = startY;

    this.container = new Container();
    this.graphics = new Graphics();
    this.particleGraphics = new Graphics();

    this.container.addChild(this.graphics);
    this.container.addChild(this.particleGraphics);

    this.render();
    this.updateContainerPosition();
  }

  public takeDamage(amount = 1): void {
    if (this.invincibilityTimer > 0 || !this.isAlive) return;

    this.hearts = Math.max(0, this.hearts - amount);
    this.invincibilityTimer = 1.5;

    if (this.hearts <= 0) {
      this.isAlive = false;
      this.spawnDeathExplosion();
    }
  }

  public respawnAtSafeCheckpoint(): void {
    this.x = this.lastSafeX;
    this.y = this.lastSafeY;
    this.vx = 0;
    this.vy = 0;
    this.fellInPit = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.invincibilityTimer = 1.0;
    this.squashX = 1.0;
    this.squashY = 1.0;
    this.render();
    this.updateContainerPosition();
  }

  public respawn(startX: number, startY: number): void {
    this.x = startX;
    this.y = startY;
    this.lastSafeX = startX;
    this.lastSafeY = startY;
    this.vx = 0;
    this.vy = 0;
    this.hearts = this.maxHearts;
    this.isAlive = true;
    this.hasReachedExit = false;
    this.fellInPit = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.invincibilityTimer = 0;
    this.squashX = 1.0;
    this.squashY = 1.0;
    this.container.visible = true;
    this.render();
    this.updateContainerPosition();
  }

  public spawnBubbles(): void {
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * this.width,
        y: -this.height / 2 + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 12,
        vy: -20 - Math.random() * 25, // Rising bubbles
        life: 0.5 + Math.random() * 0.4,
        color: 0x74b9ff,
        size: 2,
      });
    }
  }

  public spawnSurfaceRipple(): void {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      this.particles.push({
        x: Math.cos(angle) * 8,
        y: -this.height / 2,
        vx: Math.cos(angle) * 25,
        vy: -5 - Math.random() * 10,
        life: 0.4,
        color: 0x55efc4,
        size: 2,
      });
    }
  }

  public update(
    dt: number,
    moveLeft: boolean,
    moveRight: boolean,
    jumpPressed: boolean,
    actionPressed: boolean,
    boundsWidth: number
  ): void {
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt;
      if (this.invincibilityTimer <= 0) this.invincibilityTimer = 0;
    }

    this.updateParticles(dt);
    if (!this.isAlive) return;

    const P = RELIC_RUSH_CONFIG.PLAYER;

    // 1. Horizontal Motion & Acceleration
    if (moveLeft) {
      this.vx = Math.max(-P.BASE_SPEED, this.vx - P.ACCEL * dt);
      this.facingDirection = 'left';
    } else if (moveRight) {
      this.vx = Math.min(P.BASE_SPEED, this.vx + P.ACCEL * dt);
      this.facingDirection = 'right';
    } else {
      if (this.vx > 0) {
        this.vx = Math.max(0, this.vx - P.FRICTION * dt);
      } else if (this.vx < 0) {
        this.vx = Math.min(0, this.vx + P.FRICTION * dt);
      }
      if (Math.abs(this.vx) < 15) {
        this.vx = 0;
      }
    }

    // 2. Wall Slide Physics
    const isWallSliding =
      !this.isGrounded &&
      !this.isSwimming &&
      ((this.isTouchingWallLeft && moveLeft) || (this.isTouchingWallRight && moveRight)) &&
      this.vy > 0;

    // 3. Gravity & Submerged Swimming Physics
    if (this.isSwimming) {
      // Floaty buoyancy & capped submerged fall speed (60 px/s)
      this.vy = Math.min(60, this.vy + P.GRAVITY * 0.25 * dt);
    } else if (isWallSliding) {
      this.vy = Math.min(P.WALL_SLIDE_SPEED, this.vy + P.GRAVITY * 0.2 * dt);
    } else if (!this.isGrounded) {
      this.vy = Math.min(P.MAX_FALL_SPEED, this.vy + P.GRAVITY * dt);
    }

    // 4. Jump & Upward Swimming Stroke
    if (this.isSwimming) {
      if (jumpPressed) {
        this.vy = -180; // Upward swim stroke
        this.spawnBubbles();
        this.jumpBufferTimer = 0;
      }
    } else {
      if (jumpPressed) {
        this.jumpBufferTimer = 0.12;
      } else if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer -= dt;
      }

      if (this.isGrounded) {
        this.coyoteTimer = 0.12;
      } else if (this.coyoteTimer > 0) {
        this.coyoteTimer -= dt;
      }

      if (this.jumpBufferTimer > 0) {
        if (this.coyoteTimer > 0) {
          this.vy = P.JUMP_SPEED;
          this.isGrounded = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
          this.spawnDustBurst(6);
        } else if (isWallSliding) {
          this.vy = P.WALL_JUMP_VY;
          this.vx = this.isTouchingWallLeft ? P.WALL_JUMP_VX : -P.WALL_JUMP_VX;
          this.facingDirection = this.isTouchingWallLeft ? 'right' : 'left';
          this.jumpBufferTimer = 0;
          this.spawnDustBurst(8);
        }
      }
    }

    // 5. Update Animation State cleanly
    const prevSwimming = this.wasSwimming;
    this.wasSwimming = this.isSwimming;

    if (this.isSwimming) {
      this.currentState = 'swimming';
      if (!prevSwimming) {
        this.spawnSurfaceRipple();
      }
    } else if (isWallSliding) {
      this.currentState = 'wall_sliding';
    } else if (!this.isGrounded) {
      this.currentState = this.vy < 0 ? 'jumping' : 'falling';
    } else if (Math.abs(this.vx) > 15) {
      this.currentState = 'running';
    } else {
      this.currentState = 'idle';
      this.squashX = 1.0;
      this.squashY = 1.0;
      this.animTimer = 0;
      this.animFrame = 0;
    }

    // 6. Animate Footsteps & Swimming Breaststroke
    if (this.currentState === 'running' || this.currentState === 'swimming') {
      this.animTimer += dt;
      if (this.animTimer >= 0.08) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
        if (this.currentState === 'swimming' && Math.random() > 0.4) {
          this.spawnBubbles();
        }
      }
    }

    this.render();
    this.updateContainerPosition();
  }

  private render(): void {
    this.graphics.clear();

    const isBlink = this.invincibilityTimer > 0 && Math.floor(this.invincibilityTimer * 16) % 2 === 0;
    if (isBlink) return;

    const hexColor = parseInt(this.color.replace('#', ''), 16) || 0xffffff;
    const w = this.width;
    const h = this.height;

    const isLeft = this.facingDirection === 'left';
    const dirScale = isLeft ? -1 : 1;
    this.graphics.scale.set(dirScale, 1.0);

    // Prone Horizontal Body Tilt when swimming
    if (this.currentState === 'swimming') {
      this.graphics.rotation = isLeft ? 0.28 : -0.28;
    } else {
      this.graphics.rotation = 0;
    }

    // 1. Adventurer Hat / Helmet
    this.graphics.rect(-w / 2 - 2, -h, w + 4, 3).fill({ color: hexColor });
    this.graphics.rect(-w / 2 - 1, -h - 4, w + 2, 4).fill({ color: hexColor });
    this.graphics.rect(-w / 2 - 1, -h - 1, w + 2, 1).fill({ color: 0x3d2314 });

    // 2. Face & Eyes
    this.graphics.rect(-w / 2 + 1, -h + 3, w - 2, 6).fill({ color: 0xffeaa7 });
    this.graphics.rect(1, -h + 4, 3, 3).fill({ color: 0xfffffe });
    this.graphics.rect(2, -h + 5, 1, 1).fill({ color: 0x0f0e17 });

    // 3. Vest Outfit & Belt
    this.graphics.rect(-w / 2, -h + 9, w, 5).fill({ color: hexColor });
    this.graphics.rect(-w / 2, -h + 14, w, 2).fill({ color: 0x3d2314 });
    this.graphics.rect(0, -h + 14, 2, 2).fill({ color: 0xf4d160 });

    this.graphics.rect(-w / 2 - 2, -h + 9, 2, 4).fill({ color: 0x5c3d2e });

    // 4. Legs, Boots, & Animated Swimming Breaststroke Arms
    const legY = -h + 15;
    let legOffset1 = 0;
    let legOffset2 = 0;

    if (this.currentState === 'running') {
      const step = this.animFrame % 4;
      legOffset1 = step === 0 ? 2 : step === 2 ? -2 : 0;
      legOffset2 = -legOffset1;
    } else if (this.currentState === 'swimming') {
      // Animated Arm Breaststroke Cycles kicking through water!
      const step = this.animFrame % 4;
      const armExtend = step === 0 ? 4 : step === 2 ? 0 : 2;
      this.graphics.rect(armExtend, -h + 10, 4, 2).fill({ color: 0xffeaa7 });
    }

    // Boots (3x3px crisp pixel boots)
    this.graphics.rect(-w / 2 + 1 + legOffset1, legY, 3, 3).fill({ color: 0x2d3436 });
    this.graphics.rect(w / 2 - 4 + legOffset2, legY, 3, 3).fill({ color: 0x2d3436 });
  }

  public landOnGround(): void {
    if (!this.isGrounded) {
      this.isGrounded = true;
      this.vy = 0;
      this.squashX = 1.0;
      this.squashY = 1.0;
      this.coyoteTimer = 0.12;
      this.spawnDustBurst(6);

      // Track last safe standing position on solid ground
      this.lastSafeX = this.x;
      this.lastSafeY = this.y;
    }
  }

  public spawnDustBurst(count = 6): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * this.width,
        y: 0,
        vx: (Math.random() - 0.5) * 50,
        vy: -15 - Math.random() * 20,
        life: 0.2,
        color: 0xdfe6e9,
        size: 2,
      });
    }
  }

  private spawnDeathExplosion(): void {
    const hexColor = parseInt(this.color.replace('#', ''), 16) || 0xffffff;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const spd = 40 + Math.random() * 50;
      this.particles.push({
        x: 0,
        y: -10,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.4,
        color: i % 2 === 0 ? hexColor : 0xd63031,
        size: 2,
      });
    }
  }

  private updateParticles(dt: number): void {
    this.particleGraphics.clear();
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life > 0) {
        const s = p.size || 2;
        this.particleGraphics.rect(Math.round(p.x), Math.round(p.y), s, s).fill({ color: p.color });
        return true;
      }
      return false;
    });
  }

  public updateContainerPosition(): void {
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public destroy(): void {
    this.particleGraphics.destroy();
    this.graphics.destroy();
    this.container.destroy();
  }
}
