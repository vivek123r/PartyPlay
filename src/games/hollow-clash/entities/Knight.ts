import { Graphics, Container } from 'pixi.js';
import { PLATFORM_PHYSICS, COMBAT_STATS } from '../config';
import type { KnightState, KnightMaskType, PlatformTile, BossState } from '../types';
import { PlatformPhysics } from '../systems/PlatformPhysics';

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

  public lastSafeGroundPosition: { x: number; y: number };
  public shadowDashDuration = 0;

  public trailParticles: Particle[] = [];
  public slashArcs: SlashArc[] = [];

  private physics = new PlatformPhysics();

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
    this.lastSafeGroundPosition = { x: this.state.x, y: this.state.y };
    this.state.lastSafeGroundPosition = this.lastSafeGroundPosition;

    this.container = new Container();
    this.container.x = this.state.x;
    this.container.y = this.state.y;

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  public update(dt: number, input: any, platforms: PlatformTile[], enemies: any[]) {
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
    }

    // Jump Inputs
    if (input.jumpJustPressed) {
      if (this.state.isGrounded) {
        this.state.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
        this.state.isGrounded = false;
      } else if (this.state.isWallSliding) {
        // Wall Jump
        this.state.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
        this.state.vx = this.state.facing === 'left' ? PLATFORM_PHYSICS.MOVE_SPEED : -PLATFORM_PHYSICS.MOVE_SPEED;
        this.state.facing = this.state.facing === 'left' ? 'right' : 'left';
        this.state.isWallSliding = false;
        this.canDoubleJump = true;
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

    // Unified Physics Update
    this.physics.update(this, platforms, dt);

    if (this.state.isGrounded || this.state.isWallSliding) {
      this.canDoubleJump = true;
    }

    // Combat: Attack
    if (input.attackJustPressed && this.attackCooldown <= 0 && !this.state.isShadowDashing) {
      this.performAttack(input, enemies, platforms);
    }

    // Update Particles & Arcs
    this.updateParticles(dt);

    // Update Positions
    this.container.position.set(this.state.x, this.state.y);

    this.render();
  }

  private performAttack(input: any, enemies: any[], platforms: PlatformTile[] = []) {
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

    // 1. Directional AABB Hitbox ('forward', 'up', 'down')
    let hitbox = { x: 0, y: 0, width: 0, height: 0 };
    if (this.attackDirection === 'up') {
      hitbox = {
        x: this.state.x - 8,
        y: this.state.y - 28,
        width: 32,
        height: 28,
      };
    } else if (this.attackDirection === 'down') {
      hitbox = {
        x: this.state.x - 8,
        y: this.state.y + this.height,
        width: 32,
        height: 28,
      };
    } else {
      // forward
      hitbox = {
        x: this.state.facing === 'right' ? this.state.x + this.width : this.state.x - 28,
        y: this.state.y - 4,
        width: 28,
        height: 32,
      };
    }

    // 2. Check hit against targets (regular enemies and boss)
    let hitEnemy = false;
    const attackDirParam = this.attackDirection === 'down' ? 'down' : this.state.facing;

    if (enemies && enemies.length > 0) {
      for (const enemy of enemies) {
        if (!enemy || (enemy.hp !== undefined && enemy.hp <= 0)) continue;

        let tLeft = enemy.x - 12;
        let tRight = enemy.x + 12;
        let tTop = enemy.y - 20;
        let tBottom = enemy.y + 10;

        if (enemy.type === 'boss_moss_knight' || enemy.type === 'boss') {
          tLeft = enemy.x - 16;
          tRight = enemy.x + 16;
          tTop = enemy.y - 44;
          tBottom = enemy.y + 8;
        }

        const overlaps =
          hitbox.x < tRight &&
          hitbox.x + hitbox.width > tLeft &&
          hitbox.y < tBottom &&
          hitbox.y + hitbox.height > tTop;

        if (overlaps) {
          hitEnemy = true;
          if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(COMBAT_STATS.NAIL_DAMAGE, attackDirParam);
          }
          this.spawnHitParticles(enemy.x, enemy.y);
        }
      }
    }

    // 3. Spike Pit Pogo check if downward attack
    let hitSpikes = false;
    if (this.attackDirection === 'down' && platforms) {
      for (const tile of platforms) {
        if (tile.type === 'spikes') {
          const overlapsSpike =
            hitbox.x < tile.x + tile.width &&
            hitbox.x + hitbox.width > tile.x &&
            hitbox.y < tile.y + tile.height &&
            hitbox.y + hitbox.height > tile.y;

          if (overlapsSpike) {
            hitSpikes = true;
            this.spawnHitParticles(hitbox.x + hitbox.width / 2, tile.y);
            break;
          }
        }
      }
    }

    // 4. Airborne Pogo Bounce & Double Jump restore
    if (this.attackDirection === 'down' && (hitEnemy || hitSpikes)) {
      this.state.vy = PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY;
      this.canDoubleJump = true; // restores double jump!
    }

    // 5. Soul Gain & Nail Recoil
    if (hitEnemy) {
      this.addSoul(COMBAT_STATS.SOUL_PER_HIT);
      if (this.attackDirection === 'forward') {
        this.state.vx =
          this.state.facing === 'right'
            ? -PLATFORM_PHYSICS.NAIL_RECOIL_VELOCITY
            : PLATFORM_PHYSICS.NAIL_RECOIL_VELOCITY;
      }
    }
  }

  private spawnHitParticles(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      this.trailParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        life: 0.2,
        maxLife: 0.2,
        color: 0xffffff,
        alpha: 0.9,
        size: 3,
      });
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
      p.x += p.vx * dt;
      p.y += p.vy * dt;
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
