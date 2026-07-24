import { Graphics, Container } from 'pixi.js';
import { PLATFORM_PHYSICS, COMBAT_STATS } from '../config';
import type { KnightState, KnightMaskType, PlatformTile, BossState } from '../types';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  alpha: number;
  size: number;
}

export interface SlashArc {
  x: number;
  y: number;
  rotation: number;
  life: number;
  maxLife: number;
  scale: number;
}

export class Knight {
  public state: KnightState;
  public container: Container;
  public graphics: Graphics;
  public width = 16;
  public height = 24;

  public canDoubleJump = false;
  public attackCooldown = 0;
  public comboCounter = 0;
  public comboTimer = 0;

  public isInvulnerable = false;
  public invulnerabilityTimer = 0;

  public isAttacking = false;
  public attackDirection: 'up' | 'down' | 'forward' = 'forward';
  public attackTimer = 0;

  public shadowDashDuration = 0;

  public trailParticles: Particle[] = [];
  public slashArcs: SlashArc[] = [];

  constructor(initialState: Partial<KnightState>) {
    this.state = {
      id: 1,
      mask: 'vessel',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hp: COMBAT_STATS.MASK_HP,
      maxHp: COMBAT_STATS.MASK_HP,
      soul: 0,
      maxSoul: COMBAT_STATS.MAX_SOUL,
      isGrounded: false,
      isWallSliding: false,
      isShadowDashing: false,
      facing: 'right',
      dashCooldownTimer: 0,
      geoCount: 0,
      ...initialState,
    };

    this.container = new Container();
    this.container.x = this.state.x;
    this.container.y = this.state.y;

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, input: any, platforms: PlatformTile[], enemies: BossState[]) {
    // Cooldowns and Timers
    if (this.state.dashCooldownTimer > 0) this.state.dashCooldownTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCounter = 0;
    }
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.isAttacking = false;
    }
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
      if (this.invulnerabilityTimer <= 0) this.isInvulnerable = false;
    }

    // Shadow Dash
    if (this.state.isShadowDashing) {
      this.shadowDashDuration -= dt;
      this.state.vx = this.state.facing === 'right' ? PLATFORM_PHYSICS.SHADOW_DASH_SPEED : -PLATFORM_PHYSICS.SHADOW_DASH_SPEED;
      this.state.vy = 0; // Freeze vertical movement

      this.spawnGhostTrail();

      if (this.shadowDashDuration <= 0) {
        this.state.isShadowDashing = false;
        this.isInvulnerable = false;
        this.state.vx = 0;
      }
    } else {
      // Horizontal Movement
      if (input.left) {
        this.state.vx = -PLATFORM_PHYSICS.MOVE_SPEED;
        this.state.facing = 'left';
      } else if (input.right) {
        this.state.vx = PLATFORM_PHYSICS.MOVE_SPEED;
        this.state.facing = 'right';
      } else {
        this.state.vx = 0;
      }

      // Gravity
      this.state.vy += PLATFORM_PHYSICS.GRAVITY * dt;
    }

    // Physics and collisions
    this.state.isGrounded = false;
    this.state.isWallSliding = false;
    let touchingWallDir: 'left' | 'right' | null = null;
    let onMoss = false;

    // Collision detection against platforms
    for (const p of platforms) {
      const isIntersecting =
        this.state.x < p.x + p.width &&
        this.state.x + this.width > p.x &&
        this.state.y < p.y + p.height &&
        this.state.y + this.height > p.y;

      if (isIntersecting) {
        // Resolve Y (ground)
        if (this.state.vy > 0 && this.state.y + this.height - this.state.vy * dt <= p.y) {
          this.state.y = p.y - this.height;
          this.state.vy = 0;
          this.state.isGrounded = true;
          this.canDoubleJump = true;
        }

        // Resolve X (walls)
        if (!this.state.isGrounded) {
          if (this.state.vx > 0 && this.state.x + this.width - this.state.vx * dt <= p.x) {
            this.state.x = p.x - this.width;
            this.state.vx = 0;
            touchingWallDir = 'right';
            if (p.type === 'moss') onMoss = true;
          } else if (this.state.vx < 0 && this.state.x - this.state.vx * dt >= p.x + p.width) {
            this.state.x = p.x + p.width;
            this.state.vx = 0;
            touchingWallDir = 'left';
            if (p.type === 'moss') onMoss = true;
          }
        }
      }
    }

    // Wall Slide Logic
    if (touchingWallDir && this.state.vy > 0 && !this.state.isGrounded && onMoss) {
      this.state.isWallSliding = true;
      this.state.vy = Math.min(this.state.vy, PLATFORM_PHYSICS.WALL_SLIDE_SPEED);
    }

    // Jump Inputs
    if (input.jumpJustPressed) {
      if (this.state.isGrounded) {
        this.state.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
      } else if (this.state.isWallSliding && touchingWallDir) {
        // Wall Jump
        this.state.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
        this.state.vx = touchingWallDir === 'left' ? PLATFORM_PHYSICS.MOVE_SPEED : -PLATFORM_PHYSICS.MOVE_SPEED;
        this.state.facing = touchingWallDir === 'left' ? 'right' : 'left';
      } else if (this.canDoubleJump) {
        // Double Jump
        this.state.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
        this.canDoubleJump = false;
      }
    }

    // Variable Jump: release jump button early to stop ascending
    if (input.jumpReleased && this.state.vy < 0) {
      this.state.vy *= 0.5;
    }

    // Shadow Dash Input
    if (input.dashJustPressed && this.state.dashCooldownTimer <= 0) {
      this.state.isShadowDashing = true;
      this.shadowDashDuration = PLATFORM_PHYSICS.SHADOW_DASH_DURATION;
      this.state.dashCooldownTimer = PLATFORM_PHYSICS.SHADOW_DASH_COOLDOWN;
      this.isInvulnerable = true;
    }

    // Combat: Attack
    if (input.attackJustPressed && this.attackCooldown <= 0 && !this.state.isShadowDashing) {
      this.performAttack(input, enemies);
    }

    // Update Particles & Arcs
    this.updateParticles(dt);

    // Update Positions
    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;
    this.container.position.set(this.state.x, this.state.y);

    this.render();
  }

  private performAttack(input: any, enemies: BossState[]) {
    this.isAttacking = true;
    this.attackTimer = 0.2;
    this.attackCooldown = 0.3;

    if (input.up) {
      this.attackDirection = 'up';
    } else if (input.down && !this.state.isGrounded) {
      this.attackDirection = 'down';
    } else {
      this.attackDirection = 'forward';
      this.comboCounter = (this.comboCounter + 1) % 3;
      this.comboTimer = 1.0;
    }

    // Create slash visual arc
    this.slashArcs.push({
      x: this.width / 2,
      y: this.height / 2,
      rotation:
        this.attackDirection === 'up'
          ? -Math.PI / 2
          : this.attackDirection === 'down'
          ? Math.PI / 2
          : this.state.facing === 'right'
          ? 0
          : Math.PI,
      life: 0.15,
      maxLife: 0.15,
      scale: 1.0 + this.comboCounter * 0.2,
    });

    // Hitbox logic against enemies
    let hitEnemy = false;
    for (const enemy of enemies) {
      const dx = enemy.x - this.state.x;
      const dy = enemy.y - this.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 40) {
        hitEnemy = true;
      }
    }

    // Pogo bounce
    if (this.attackDirection === 'down' && hitEnemy) {
      this.state.vy = PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY;
      this.canDoubleJump = true; // reset double jump on successful pogo
    }

    if (hitEnemy) {
      this.addSoul(COMBAT_STATS.SOUL_PER_HIT);
      // Nail Recoil
      if (this.attackDirection === 'forward') {
        this.state.vx =
          this.state.facing === 'right'
            ? -PLATFORM_PHYSICS.NAIL_RECOIL_VELOCITY
            : PLATFORM_PHYSICS.NAIL_RECOIL_VELOCITY;
      }
    }
  }

  public addSoul(amount: number) {
    this.state.soul = Math.min(this.state.maxSoul, this.state.soul + amount);
  }

  public takeDamage(amount: number) {
    if (this.isInvulnerable) return;
    this.state.hp -= amount;
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 1.5;
  }

  private spawnGhostTrail() {
    this.trailParticles.push({
      x: this.state.x,
      y: this.state.y,
      vx: 0,
      vy: 0,
      life: 0.3,
      maxLife: 0.3,
      color: 0x00f0ff,
      alpha: 0.6,
      size: 16,
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= dt;
      if (p.life <= 0) this.trailParticles.splice(i, 1);
    }

    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.life -= dt;
      if (arc.life <= 0) this.slashArcs.splice(i, 1);
    }
  }

  public render() {
    this.graphics.clear();

    // Draw trail particles (Shadow dash ghosts)
    for (const p of this.trailParticles) {
      this.graphics.rect(p.x - this.state.x, p.y - this.state.y, p.size, p.size * 1.5).fill({ color: p.color, alpha: p.alpha * (p.life / p.maxLife) });
    }

    // Flicker if invulnerable
    if (this.invulnerabilityTimer > 0 && !this.state.isShadowDashing) {
      if (Math.floor(this.invulnerabilityTimer * 10) % 2 === 0) return;
    }

    const cx = this.width / 2;
    const cy = this.height / 2;
    const faceDir = this.state.facing === 'right' ? 1 : -1;

    // Dark Cloak
    this.graphics.roundRect(cx - 8, cy - 2, 16, 14, 4).fill({ color: 0x1a1a2e });

    // Glowing White Horns Mask
    const maskColor = 0xffffff;
    this.graphics.ellipse(cx, cy - 8, 8, 7).fill({ color: maskColor });

    // Horns
    if (this.state.mask === 'vessel') {
      this.graphics.poly([cx - 6, cy - 12, cx - 8, cy - 20, cx - 2, cy - 14]).fill({ color: maskColor });
      this.graphics.poly([cx + 6, cy - 12, cx + 8, cy - 20, cx + 2, cy - 14]).fill({ color: maskColor });
    }

    // Eye holes
    this.graphics.ellipse(cx - 3 * faceDir, cy - 7, 2, 3).fill({ color: 0x000000 });
    this.graphics.ellipse(cx + 3 * faceDir, cy - 7, 2, 3).fill({ color: 0x000000 });

    // Draw Glowing Nail Sword if Attacking
    if (this.isAttacking) {
      let nailEnd = { x: 0, y: 0 };
      if (this.attackDirection === 'up') {
        nailEnd = { x: cx, y: cy - 24 };
      } else if (this.attackDirection === 'down') {
        nailEnd = { x: cx, y: cy + 24 };
      } else {
        nailEnd = { x: cx + 24 * faceDir, y: cy };
      }

      this.graphics.poly([cx, cy, nailEnd.x, nailEnd.y]).stroke({ color: 0xd4e1f9, width: 2, alpha: 0.8 });
    }

    // Draw Slash Arcs
    for (const arc of this.slashArcs) {
      const arcScale = arc.scale * (1 - arc.life / arc.maxLife);
      const dx = Math.cos(arc.rotation) * 20 * arcScale;
      const dy = Math.sin(arc.rotation) * 20 * arcScale;

      this.graphics.poly([arc.x - dy, arc.y + dx, arc.x + dx * 2, arc.y + dy * 2, arc.x + dy, arc.y - dx]).stroke({ color: 0xffffff, width: 2, alpha: arc.life / arc.maxLife });
    }
  }
}
