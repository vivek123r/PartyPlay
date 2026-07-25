import { Graphics, Container } from 'pixi.js';
import { PLATFORM_PHYSICS, COMBAT_STATS } from '../config';
import type { KnightState, KnightMaskType, PlatformTile, CharmType } from '../types';
import { PlatformPhysics } from '../systems/PlatformPhysics';
import { SoulSpell } from './SoulSpell';
import { SporeCloud } from './SporeCloud';

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
  hasGravity?: boolean;
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
  public canShadowDash = true;
  public canCrystalDash = true;

  public attackCooldown = 0;
  public comboCounter = 0;
  public comboTimer = 0;

  public isInvulnerable = false;
  public invulnerabilityTimer = 0;

  public isAttacking = false;
  public attackDirection: 'up' | 'down' | 'forward' = 'forward';
  public attackTimer = 0;

  public isChargingSuperDash = false;
  public superDashChargeTimer = 0;
  public isCrystalDashing = false;
  public isDiving = false;
  public isWallClinging = false;

  public isFocusing = false;
  public focusTimer = 0;

  public lastSafeGroundPosition: { x: number; y: number };
  public shadowDashDuration = 0;

  public trailParticles: Particle[] = [];
  public slashArcs: SlashArc[] = [];
  public activeSpells: SoulSpell[] = [];
  public activeSporeClouds: SporeCloud[] = [];

  private physics = new PlatformPhysics();

  constructor(initialState: Partial<KnightState>) {
    const charms = initialState.equippedCharms ?? [];
    const initialLifeblood = initialState.lifebloodHp ?? (charms.includes('lifeblood_heart') ? COMBAT_STATS.LIFEBLOOD_EXTRA_MASKS : 0);

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
      isWallClinging: false,
      isShadowDashing: false,
      isCrystalDashing: false,
      isChargingSuperDash: false,
      isDiving: false,
      facing: 'right',
      dashCooldownTimer: 0,
      geoCount: 0,
      lifebloodHp: initialLifeblood,
      equippedCharms: charms,
      ...initialState,
    };

    if (!this.state.equippedCharms) {
      this.state.equippedCharms = charms;
    }
    if (this.state.lifebloodHp === undefined) {
      this.state.lifebloodHp = initialLifeblood;
    }

    this.lastSafeGroundPosition = { x: this.state.x, y: this.state.y };
    this.state.lastSafeGroundPosition = this.lastSafeGroundPosition;

    this.container = new Container();
    this.container.x = this.state.x;
    this.container.y = this.state.y;

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  // --- Contract Interface Methods ---
  public getSoul(): number {
    return this.state.soul;
  }

  public getMaxSoul(): number {
    return this.state.maxSoul;
  }

  public getCharms(): CharmType[] {
    return this.state.equippedCharms ?? [];
  }

  public getLifebloodHP(): number {
    return this.state.lifebloodHp ?? 0;
  }

  public hasCharm(charm: CharmType): boolean {
    return (this.state.equippedCharms ?? []).includes(charm);
  }

  public equipCharm(charm: CharmType): void {
    if (!this.state.equippedCharms) {
      this.state.equippedCharms = [];
    }
    if (!this.state.equippedCharms.includes(charm)) {
      this.state.equippedCharms.push(charm);
      if (charm === 'lifeblood_heart') {
        this.state.lifebloodHp = COMBAT_STATS.LIFEBLOOD_EXTRA_MASKS;
      }
    }
  }

  public unequipCharm(charm: CharmType): void {
    if (this.state.equippedCharms) {
      const idx = this.state.equippedCharms.indexOf(charm);
      if (idx !== -1) {
        this.state.equippedCharms.splice(idx, 1);
        if (charm === 'lifeblood_heart') {
          this.state.lifebloodHp = 0;
        }
      }
    }
  }

  public resetAirAbilities(): void {
    this.canDoubleJump = true;
    this.canShadowDash = true;
    this.canCrystalDash = true;
    this.state.dashCooldownTimer = 0;
  }

  public update(dt: number, input: any, platforms: PlatformTile[], enemies: any[]) {
    // Sync state flags
    this.state.isCrystalDashing = this.isCrystalDashing;
    this.state.isChargingSuperDash = this.isChargingSuperDash;
    this.state.isDiving = this.isDiving;
    this.state.isWallClinging = this.isWallClinging;

    // Timers & Cooldowns
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

    // 1. Crystal Dash Flight / Charge Update
    if (this.isChargingSuperDash) {
      this.superDashChargeTimer += dt;
      this.state.vx = 0;
      this.state.vy = 0;
      this.spawnCrystalChargeParticles();

      if (this.superDashChargeTimer >= PLATFORM_PHYSICS.CRYSTAL_DASH_CHARGE_TIME) {
        this.isChargingSuperDash = false;
        this.isCrystalDashing = true;
        this.state.isCrystalDashing = true;
      }
    } else if (this.isCrystalDashing) {
      this.state.vx = this.state.facing === 'right' ? PLATFORM_PHYSICS.CRYSTAL_DASH_SPEED : -PLATFORM_PHYSICS.CRYSTAL_DASH_SPEED;
      this.state.vy = 0;
      this.spawnCrystalDashParticles();

      // Cancel Crystal Dash on Jump/Dash press or damage
      if (input.jumpJustPressed || input.dashJustPressed) {
        this.cancelSuperDash();
      }
    }

    // 2. Desolate Dive Update
    if (this.isDiving) {
      this.state.vy = PLATFORM_PHYSICS.DESOLATE_DIVE_SPEED;
      this.isInvulnerable = true;
    }

    // 3. Shadow Dash Update
    if (this.state.isShadowDashing) {
      this.shadowDashDuration -= dt;
      this.state.vx = this.state.facing === 'right' ? PLATFORM_PHYSICS.SHADOW_DASH_SPEED : -PLATFORM_PHYSICS.SHADOW_DASH_SPEED;
      this.state.vy = 0;

      this.spawnGhostTrail();

      if (this.shadowDashDuration <= 0) {
        this.state.isShadowDashing = false;
        this.isInvulnerable = false;
        this.state.vx = 0;
      }
    } else if (!this.isCrystalDashing && !this.isChargingSuperDash) {
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

    // 4. Super Dash Charge Input Check (holding skill button while grounded or wall clinging)
    if (input.superDashActive || (input.skillActive && (this.state.isGrounded || this.isWallClinging) && !this.isCrystalDashing && !this.state.isShadowDashing)) {
      if (!this.isChargingSuperDash && !this.isCrystalDashing) {
        this.startChargingSuperDash();
      }
    } else if (this.isChargingSuperDash && !input.skillActive && !input.superDashActive) {
      // Released early before full charge
      this.cancelSuperDash();
    }

    // 5. Jump Inputs
    if (input.jumpJustPressed) {
      if (this.isCrystalDashing || this.isChargingSuperDash) {
        this.cancelSuperDash();
      } else if (this.state.isGrounded) {
        this.state.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
        this.state.isGrounded = false;
      } else if (this.state.isWallSliding || this.isWallClinging) {
        // Wall Jump
        this.state.vy = PLATFORM_PHYSICS.JUMP_VELOCITY;
        this.state.vx = this.state.facing === 'left' ? PLATFORM_PHYSICS.MOVE_SPEED : -PLATFORM_PHYSICS.MOVE_SPEED;
        this.state.facing = this.state.facing === 'left' ? 'right' : 'left';
        this.state.isWallSliding = false;
        this.isWallClinging = false;
        this.resetAirAbilities();
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

    // 6. Shadow Dash Input
    if (input.dashJustPressed && this.canShadowDash && this.state.dashCooldownTimer <= 0 && !this.isCrystalDashing) {
      this.state.isShadowDashing = true;
      this.shadowDashDuration = PLATFORM_PHYSICS.SHADOW_DASH_DURATION;
      this.state.dashCooldownTimer = PLATFORM_PHYSICS.SHADOW_DASH_COOLDOWN;
      this.isInvulnerable = true;
      this.canShadowDash = false;
    }

    // 7. Focus Heal Channeling Check (grounded hold)
    if (input.focusActive && this.state.isGrounded && !this.isAttacking && !this.isCrystalDashing) {
      this.updateFocusHeal(dt);
    } else {
      this.isFocusing = false;
      this.focusTimer = 0;
    }

    // 8. Directional Spell Cast Input (focusJustPressed or castJustPressed)
    if ((input.focusJustPressed || input.castJustPressed) && !this.isFocusing) {
      if (input.up) {
        this.castSpell('up');
      } else if (input.down && !this.state.isGrounded) {
        this.castSpell('down');
      } else if (!input.down || this.state.isGrounded) {
        this.castSpell('neutral');
      }
    }

    // 9. Unified Physics Update
    this.physics.update(this, platforms, dt);

    if (this.state.isGrounded || this.state.isWallSliding || this.isWallClinging) {
      this.resetAirAbilities();
    }

    // 10. Combat: Attack
    if (input.attackJustPressed && this.attackCooldown <= 0 && !this.state.isShadowDashing && !this.isCrystalDashing) {
      this.performAttack(input, enemies, platforms);
    }

    // 11. Update Active Spells & Spore Clouds
    for (let i = this.activeSpells.length - 1; i >= 0; i--) {
      if (!this.activeSpells[i].update(dt, enemies)) {
        this.activeSpells.splice(i, 1);
      }
    }
    for (let i = this.activeSporeClouds.length - 1; i >= 0; i--) {
      if (!this.activeSporeClouds[i].update(dt, enemies)) {
        this.activeSporeClouds.splice(i, 1);
      }
    }

    // Update Particles & Arcs
    this.updateParticles(dt);

    // Update Positions
    this.container.position.set(this.state.x, this.state.y);

    this.render();
  }

  // --- Spell Casting Implementation ---
  public castSpell(direction: 'neutral' | 'up' | 'down' = 'neutral'): SoulSpell | null {
    if (this.state.soul < COMBAT_STATS.SPELL_SOUL_COST) {
      return null;
    }

    this.state.soul -= COMBAT_STATS.SPELL_SOUL_COST;

    let spell: SoulSpell | null = null;
    const facingRight = this.state.facing === 'right';

    if (direction === 'up') {
      // Abyssal Shriek: Upward void column (44x80px)
      spell = new SoulSpell(
        `shriek-${Date.now()}`,
        'abyssal_shriek',
        this.state.x - 14,
        this.state.y - 80,
        facingRight,
        60
      );
    } else if (direction === 'down' && !this.state.isGrounded) {
      // Desolate Dive: Rapid downward slam (vy = 600) with i-frames
      this.isDiving = true;
      this.state.isDiving = true;
      this.state.vy = PLATFORM_PHYSICS.DESOLATE_DIVE_SPEED;
      this.isInvulnerable = true;
      this.invulnerabilityTimer = 1.0;

      spell = new SoulSpell(
        `dive-${Date.now()}`,
        'desolate_dive',
        this.state.x - 4,
        this.state.y,
        facingRight,
        30
      );
    } else {
      // Vengeful Spirit: Horizontal soul wave (vx = ±420, 40 dmg)
      spell = new SoulSpell(
        `spirit-${Date.now()}`,
        'vengeful_spirit',
        this.state.x,
        this.state.y - 4,
        facingRight,
        40
      );
    }

    if (spell) {
      this.activeSpells.push(spell);
    }

    return spell;
  }

  public castVengefulSpirit(): SoulSpell | null {
    return this.castSpell('neutral');
  }

  public castAbyssalShriek(): SoulSpell | null {
    return this.castSpell('up');
  }

  public castDesolateDive(): SoulSpell | null {
    return this.castSpell('down');
  }

  public focusHeal(): boolean {
    if (this.state.soul < COMBAT_STATS.SPELL_SOUL_COST) return false;

    this.state.soul -= COMBAT_STATS.SPELL_SOUL_COST;
    if (this.state.hp < this.state.maxHp) {
      this.state.hp += 1;
    }

    if (this.hasCharm('spore_shroom')) {
      this.spawnSporeCloud();
    }

    this.activeSpells.push(
      new SoulSpell(`heal-${Date.now()}`, 'focus_heal', this.state.x + 8, this.state.y + 12, true, 0)
    );

    return true;
  }

  public startFocusHeal(): void {
    this.isFocusing = true;
    this.focusTimer = 0;
  }

  public updateFocusHeal(dt: number): void {
    this.isFocusing = true;
    this.focusTimer += dt;

    if (this.focusTimer >= 0.8) {
      this.focusTimer = 0;
      this.focusHeal();
    }
  }

  public onDiveImpact(): void {
    // Spawns ground dive_shockwave (100x24px, 50 damage)
    const shockwave = new SoulSpell(
      `shockwave-${Date.now()}`,
      'dive_shockwave',
      this.state.x - 42,
      this.state.y + this.height - 24,
      this.state.facing === 'right',
      50
    );
    this.activeSpells.push(shockwave);

    this.spawnHitParticles(this.state.x + 8, this.state.y + 24);
  }

  // --- Crystal Super Dash Methods ---
  public startChargingSuperDash(): void {
    this.isChargingSuperDash = true;
    this.state.isChargingSuperDash = true;
    this.superDashChargeTimer = 0;
    this.state.vx = 0;
    this.state.vy = 0;
  }

  public triggerCrystalDash(): void {
    this.isChargingSuperDash = false;
    this.state.isChargingSuperDash = false;
    this.isCrystalDashing = true;
    this.state.isCrystalDashing = true;
  }

  public cancelSuperDash(): void {
    this.isChargingSuperDash = false;
    this.state.isChargingSuperDash = false;
    this.isCrystalDashing = false;
    this.state.isCrystalDashing = false;
    this.superDashChargeTimer = 0;
  }

  // --- Spore Cloud Spawn ---
  public spawnSporeCloud(): SporeCloud {
    const cloud = new SporeCloud(`spore-${Date.now()}`, this.state.x + 8, this.state.y + 12, this.state.id);
    this.activeSporeClouds.push(cloud);
    return cloud;
  }

  public performAttack(input: any, enemies: any[], platforms: PlatformTile[] = []) {
    this.isAttacking = true;

    // Quick Slash charm check
    const cooldownMult = this.hasCharm('quick_slash') ? COMBAT_STATS.QUICK_SLASH_COOLDOWN_MULT : 1.0;
    this.attackTimer = 0.2 * cooldownMult;
    this.attackCooldown = 0.3 * cooldownMult;

    if (input.up) {
      this.attackDirection = 'up';
    } else if (input.down && !this.state.isGrounded) {
      this.attackDirection = 'down';
    } else {
      this.attackDirection = 'forward';
      this.comboCounter = (this.comboCounter + 1) % 3;
      this.comboTimer = 1.0;
    }

    // Longnail charm scaling multiplier (1.5x)
    const sizeMult = this.hasCharm('longnail') ? COMBAT_STATS.LONGNAIL_HITBOX_MULT : 1.0;

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
      life: 0.15 * cooldownMult,
      maxLife: 0.15 * cooldownMult,
      scale: (1.0 + this.comboCounter * 0.2) * sizeMult,
    });

    // 1. Directional AABB Hitbox ('forward', 'up', 'down') with Longnail support
    let hitbox = { x: 0, y: 0, width: 0, height: 0 };
    if (this.attackDirection === 'up') {
      const w = 32 * sizeMult;
      const h = 28 * sizeMult;
      hitbox = {
        x: this.state.x + 8 - w / 2,
        y: this.state.y - h,
        width: w,
        height: h,
      };
    } else if (this.attackDirection === 'down') {
      const w = 32 * sizeMult;
      const h = 28 * sizeMult;
      hitbox = {
        x: this.state.x + 8 - w / 2,
        y: this.state.y + this.height,
        width: w,
        height: h,
      };
    } else {
      // forward
      const w = 28 * sizeMult;
      const h = 32 * sizeMult;
      hitbox = {
        x: this.state.facing === 'right' ? this.state.x + this.width : this.state.x - w,
        y: this.state.y + 12 - h / 2,
        width: w,
        height: h,
      };
    }

    // 2. Check hit against targets
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

    // 4. Airborne Pogo Bounce & Complete Air Mobility Reset
    if (this.attackDirection === 'down' && (hitEnemy || hitSpikes)) {
      this.state.vy = PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY;
      this.resetAirAbilities(); // Resets canDoubleJump, canShadowDash, canCrystalDash, dashCooldownTimer
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
    const sludgeColors = [0x15803d, 0x4c1d95, 0x0f172a];
    for (let i = 0; i < 8; i++) {
      const color = sludgeColors[Math.floor(Math.random() * sludgeColors.length)];
      this.trailParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 80 - 20,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        color,
        alpha: 0.9,
        size: 2 + Math.floor(Math.random() * 3),
        hasGravity: true,
      });
    }
  }

  private spawnCrystalChargeParticles(): void {
    const cx = this.state.x + this.width / 2;
    const cy = this.state.y + this.height / 2;
    for (let i = 0; i < 2; i++) {
      this.trailParticles.push({
        x: cx + (Math.random() - 0.5) * 20,
        y: cy + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        color: 0xec4899, // Pink/purple crystal aura
        alpha: 0.9,
        size: 3,
      });
    }
  }

  private spawnCrystalDashParticles(): void {
    this.trailParticles.push({
      x: this.state.x + (this.state.facing === 'right' ? 0 : this.width),
      y: this.state.y + 6 + Math.random() * 12,
      vx: this.state.facing === 'right' ? -150 : 150,
      vy: (Math.random() - 0.5) * 30,
      life: 0.25,
      maxLife: 0.25,
      color: 0xf43f5e,
      alpha: 0.8,
      size: 4,
    });
  }

  public addSoul(amount: number) {
    this.state.soul = Math.min(this.state.maxSoul, this.state.soul + amount);
  }

  public takeDamage(amount: number) {
    if (this.isInvulnerable) return;

    // Interrupt Crystal Dash charging / flight
    if (this.isChargingSuperDash || this.isCrystalDashing) {
      this.cancelSuperDash();
    }

    // Lifeblood Heart Absorption First
    let remainingDamage = amount;
    if (this.state.lifebloodHp && this.state.lifebloodHp > 0) {
      const absorbed = Math.min(this.state.lifebloodHp, remainingDamage);
      this.state.lifebloodHp -= absorbed;
      remainingDamage -= absorbed;
    }

    if (remainingDamage > 0) {
      this.state.hp = Math.max(0, this.state.hp - remainingDamage);
    }

    this.isInvulnerable = true;
    this.invulnerabilityTimer = 1.5;

    // Spore Shroom: spawn spore cloud on taking damage
    if (this.hasCharm('spore_shroom')) {
      this.spawnSporeCloud();
    }
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
      if (p.hasGravity) {
        p.vy += 180 * dt;
      }
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

    // Render active spells & spore clouds on world graphics space
    for (const spell of this.activeSpells) {
      spell.render(this.graphics);
    }
    for (const cloud of this.activeSporeClouds) {
      cloud.render(this.graphics);
    }

    // Draw trail particles (Shadow dash ghosts, crystal particles, hit droplets)
    for (const p of this.trailParticles) {
      this.graphics.rect(p.x - this.state.x, p.y - this.state.y, p.size, p.size * 1.5).fill({ color: p.color, alpha: p.alpha * (p.life / p.maxLife) });
    }

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Dead Knight: Render broken mask & ghost grave
    if (this.state.hp <= 0) {
      this.graphics.ellipse(cx, cy + 6, 7, 5).fill({ color: 0x334155 });
      this.graphics.ellipse(cx - 2, cy + 5, 2, 2).fill({ color: 0x0f172a });
      this.graphics.ellipse(cx + 2, cy + 5, 2, 2).fill({ color: 0x0f172a });
      this.graphics.poly([cx - 4, cy + 2, cx - 6, cy - 4, cx - 2, cy]).fill({ color: 0x64748b });
      return;
    }

    // Flicker if invulnerable
    if (this.invulnerabilityTimer > 0 && !this.state.isShadowDashing && !this.isCrystalDashing) {
      if (Math.floor(this.invulnerabilityTimer * 10) % 2 === 0) return;
    }

    const faceDir = this.state.facing === 'right' ? 1 : -1;

    // Render Crystal Dash charge / flight aura
    if (this.isChargingSuperDash) {
      const chargeRatio = Math.min(1, this.superDashChargeTimer / PLATFORM_PHYSICS.CRYSTAL_DASH_CHARGE_TIME);
      this.graphics.circle(cx, cy, 14 + chargeRatio * 6).fill({ color: 0xec4899, alpha: 0.4 * chargeRatio });
    } else if (this.isCrystalDashing) {
      this.graphics.ellipse(cx, cy, 18, 10).fill({ color: 0xf43f5e, alpha: 0.6 });
      this.graphics.poly([cx - 16 * faceDir, cy - 8, cx + 20 * faceDir, cy, cx - 16 * faceDir, cy + 8]).fill({ color: 0xffffff, alpha: 0.9 });
    }

    // Dark Tattered Cloak with ragged bottom fringe (0x0f172a)
    const cloakColor = 0x0f172a;
    this.graphics.poly([
      cx - 8, cy - 2,
      cx + 8, cy - 2,
      cx + 8, cy + 10,
      cx + 5, cy + 7,
      cx + 2, cy + 12,
      cx - 2, cy + 8,
      cx - 5, cy + 13,
      cx - 8, cy + 9,
    ]).fill({ color: cloakColor });

    // Asymmetrical Cracked Horned Mask (Bone White 0xf8fafc base)
    const maskColor = 0xf8fafc;
    this.graphics.ellipse(cx, cy - 8, 8, 7).fill({ color: maskColor });

    // Horns (Left horn longer/jagged, Right horn chipped/broken)
    if (this.state.mask === 'vessel') {
      // Left Horn (longer & jagged)
      this.graphics.poly([cx - 7, cy - 12, cx - 9, cy - 22, cx - 5, cy - 18, cx - 2, cy - 14]).fill({ color: maskColor });
      // Right Horn (chipped & broken tip)
      this.graphics.poly([cx + 5, cy - 12, cx + 7, cy - 17, cx + 2, cy - 14]).fill({ color: maskColor });
    }

    // Dark crack strokes across mask face (0x0f172a)
    this.graphics.poly([cx - 3, cy - 12, cx - 1, cy - 8, cx + 2, cy - 6]).stroke({ color: 0x0f172a, width: 1 });
    this.graphics.poly([cx + 1, cy - 10, cx + 4, cy - 7]).stroke({ color: 0x0f172a, width: 1 });

    // Dual-Layer Glowing Eyes (cyan 0x00f0ff / crimson 0xff0055 outer glow aura + bright core)
    const eyeGlowColor = (this.state.hp <= 1 || this.state.isShadowDashing || this.isCrystalDashing) ? 0xff0055 : 0x00f0ff;
    // Facing eye (front)
    this.graphics.ellipse(cx + 3 * faceDir, cy - 7, 3, 4).fill({ color: eyeGlowColor, alpha: 0.8 });
    this.graphics.ellipse(cx + 3 * faceDir, cy - 7, 1.5, 2.5).fill({ color: 0xffffff });

    // Secondary eye (back)
    this.graphics.ellipse(cx - 3 * faceDir, cy - 7, 2, 3).fill({ color: eyeGlowColor, alpha: 0.5 });
    this.graphics.ellipse(cx - 3 * faceDir, cy - 7, 1, 2).fill({ color: 0xffffff });

    // Draw Glowing Nail Sword if Attacking
    if (this.isAttacking) {
      const nailReach = 24 * (this.hasCharm('longnail') ? 1.5 : 1.0);
      let nailEnd = { x: 0, y: 0 };
      if (this.attackDirection === 'up') {
        nailEnd = { x: cx, y: cy - nailReach };
      } else if (this.attackDirection === 'down') {
        nailEnd = { x: cx, y: cy + nailReach };
      } else {
        nailEnd = { x: cx + nailReach * faceDir, y: cy };
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
