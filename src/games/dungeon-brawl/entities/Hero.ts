import { Graphics } from 'pixi.js';
import type { HeroClassConfig, HeroClassType } from '../types';
import { HERO_CONFIGS, ARENA_CONFIG } from '../config';

export class Hero {
  public id: number;
  public classType: HeroClassType;
  public config: HeroClassConfig;

  public x = 0;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public facingAngle = 0; // In radians

  public hp: number;
  public maxHp: number;
  public mana: number;
  public maxMana: number;

  public isAttacking = false;
  public attackTimer = 0;
  public comboStep = 0;
  public attackCooldown = 0;

  public specialCooldownTimer = 0;
  public isInvulnerable = false;
  public invulnerableTimer = 0;

  public kills = 0;
  public score = 0;

  constructor(id: number, classType: HeroClassType, startX: number, startY: number) {
    this.id = id;
    this.classType = classType;
    this.config = HERO_CONFIGS[classType];

    this.x = startX;
    this.y = startY;

    this.hp = this.config.maxHp;
    this.maxHp = this.config.maxHp;
    this.mana = this.config.maxMana;
    this.maxMana = this.config.maxMana;
  }

  public update(dt: number, moveUp: boolean, moveDown: boolean, moveLeft: boolean, moveRight: boolean, attackPressed: boolean, skillPressed: boolean): void {
    // 1. Cooldown Timers
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.specialCooldownTimer > 0) this.specialCooldownTimer -= dt;
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) this.isInvulnerable = false;
    }

    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }

    // 2. 8-Directional Velocity Physics
    let inputX = 0;
    let inputY = 0;

    if (moveUp) inputY -= 1;
    if (moveDown) inputY += 1;
    if (moveLeft) inputX -= 1;
    if (moveRight) inputX += 1;

    if (inputX !== 0 && inputY !== 0) {
      inputX *= 0.7071;
      inputY *= 0.7071;
    }

    if (inputX !== 0 || inputY !== 0) {
      this.facingAngle = Math.atan2(inputY, inputX);
      const accel = this.config.moveSpeed * 8.0;
      this.vx += inputX * accel * dt;
      this.vy += inputY * accel * dt;
    } else {
      // Friction
      this.vx *= Math.pow(0.001, dt);
      this.vy *= Math.pow(0.001, dt);
    }

    // Speed Cap
    const maxSpeed = this.config.moveSpeed;
    const curSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (curSpeed > maxSpeed) {
      this.vx = (this.vx / curSpeed) * maxSpeed;
      this.vy = (this.vy / curSpeed) * maxSpeed;
    }

    // Position Update
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Arena Boundary Clamp
    const p = ARENA_CONFIG.boundsPadding;
    this.x = Math.max(p, Math.min(ARENA_CONFIG.width - p, this.x));
    this.y = Math.max(p, Math.min(ARENA_CONFIG.height - p, this.y));

    // Mana Regeneration
    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + 10 * dt);
    }
  }

  public triggerAttack(): boolean {
    if (this.attackCooldown > 0 || this.isAttacking) return false;

    this.isAttacking = true;
    this.attackTimer = 0.25;
    this.attackCooldown = 0.35;
    this.comboStep = (this.comboStep + 1) % 3;

    return true;
  }

  public triggerSpecial(): boolean {
    if (this.specialCooldownTimer > 0) return false;

    this.specialCooldownTimer = this.config.specialCooldown;
    if (this.classType === 'rogue') {
      this.isInvulnerable = true;
      this.invulnerableTimer = 1.2;
    }

    return true;
  }

  public takeDamage(dmg: number): void {
    if (this.isInvulnerable) return;

    const netDamage = Math.max(1, Math.round(dmg - this.config.armor * 0.4));
    this.hp = Math.max(0, this.hp - netDamage);

    this.isInvulnerable = true;
    this.invulnerableTimer = 0.5;
  }

  public render(g: Graphics): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const bodyColor = this.config.primaryColor;
    const capeColor = this.config.secondaryColor;

    // Shadow
    g.ellipse(x, y + 6, 8, 4).fill({ color: 0x000000, alpha: 0.4 });

    // Invulnerability Flashing
    if (this.isInvulnerable && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
      return;
    }

    // 1. Cape / Back Detail
    g.rect(x - 6, y - 6, 12, 10).fill({ color: capeColor });

    // 2. Class-Specific Body Pixel Renderers
    if (this.classType === 'knight') {
      // Steel Armor Body
      g.rect(x - 5, y - 8, 10, 12).fill({ color: bodyColor });
      g.rect(x - 4, y - 14, 8, 6).fill({ color: 0xbdc3c7 }); // Helmet
      g.rect(x - 2, y - 12, 4, 2).fill({ color: 0x2c3e50 }); // Visor
      g.rect(x - 7, y - 4, 3, 6).fill({ color: 0x7f8c8d });  // Shield

    } else if (this.classType === 'wizard') {
      // Arcane Robe
      g.rect(x - 5, y - 8, 10, 12).fill({ color: bodyColor });
      g.rect(x - 4, y - 14, 8, 6).fill({ color: 0xf1c40f }); // Hood
      g.rect(x + 4, y - 10, 2, 14).fill({ color: 0x7f8c8d }); // Staff
      g.circle(x + 5, y - 12, 3).fill({ color: 0x00f0ff }); // Gem Tip

    } else if (this.classType === 'rogue') {
      // Venom Leather
      g.rect(x - 4, y - 8, 8, 12).fill({ color: bodyColor });
      g.rect(x - 3, y - 13, 6, 5).fill({ color: 0x27ae60 }); // Cowl
      g.rect(x - 6, y - 4, 2, 4).fill({ color: 0xecf0f1 }); // Dagger L
      g.rect(x + 4, y - 4, 2, 4).fill({ color: 0xecf0f1 }); // Dagger R

    } else {
      // Barbarian
      g.rect(x - 6, y - 8, 12, 12).fill({ color: bodyColor });
      g.rect(x - 4, y - 14, 8, 6).fill({ color: 0xd35400 }); // Hair/Horns
      g.rect(x + 5, y - 10, 3, 12).fill({ color: 0x7f8c8d }); // Axe Handle
      g.rect(x + 4, y - 14, 6, 6).fill({ color: 0xbdc3c7 });  // Axe Blade
    }

    // Attack Arc Swing Animation
    if (this.isAttacking) {
      const arcDist = 14;
      const swingX = x + Math.cos(this.facingAngle) * arcDist;
      const swingY = y + Math.sin(this.facingAngle) * arcDist;

      g.circle(swingX, swingY, 8).fill({ color: 0xffffff, alpha: 0.6 });
      g.circle(swingX, swingY, 5).fill({ color: bodyColor, alpha: 0.9 });
    }
  }
}
