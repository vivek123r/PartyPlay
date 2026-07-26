import { Graphics } from 'pixi.js';
import type { AttackEvent, HeroClassConfig, HeroClassType } from '../types';
import { ARENA_CONFIG, HERO_CONFIGS } from '../config';

let attackSequence = 0;

export class Hero {
  public readonly id: number;
  public readonly classType: HeroClassType;
  public readonly config: HeroClassConfig;
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public facingAngle = 0;
  public lastMoveAngle = 0;
  public hp: number;
  public maxHp: number;
  public mana: number;
  public maxMana: number;
  public ultimate = 0;
  public isAttacking = false;
  public attackTimer = 0;
  public attackCooldown = 0;
  public comboStep = 0;
  public comboWindow = 0;
  public queuedAttack = false;
  public pendingAttack: AttackEvent | null = null;
  public specialCooldownTimer = 0;
  public specialTimer = 0;
  public specialName = '';
  public specialHasFired = false;
  public isInvulnerable = false;
  public invulnerableTimer = 0;
  public barrierTimer = 0;
  public rageTimer = 0;
  public downedTimer = 0;
  public reviveProgress = 0;
  public targetId: string | undefined;
  public kills = 0;
  public assists = 0;
  public revives = 0;
  public score = 0;

  constructor(id: number, classType: HeroClassType, x: number, y: number) {
    this.id = id;
    this.classType = classType;
    this.config = HERO_CONFIGS[classType];
    this.x = x;
    this.y = y;
    this.hp = this.maxHp = this.config.maxHp;
    this.mana = this.maxMana = this.config.maxMana;
  }

  public get isDowned(): boolean { return this.hp <= 0 && this.downedTimer > 0; }
  public get isAlive(): boolean { return this.hp > 0; }
  public get isCasting(): boolean { return this.specialTimer > 0; }

  public update(dt: number, moveUp: boolean, moveDown: boolean, moveLeft: boolean, moveRight: boolean): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.specialCooldownTimer = Math.max(0, this.specialCooldownTimer - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.specialTimer = Math.max(0, this.specialTimer - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.barrierTimer = Math.max(0, this.barrierTimer - dt);
    this.rageTimer = Math.max(0, this.rageTimer - dt);
    this.isInvulnerable = this.invulnerableTimer > 0;
    if (this.isDowned) { this.downedTimer -= dt; return; }
    if (!this.isAlive) return;

    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.comboWindow = 0.35;
        if (this.queuedAttack) { this.queuedAttack = false; this.startAttack(this.targetId, this.facingAngle); }
      }
    }

    let dx = 0; let dy = 0;
    if (moveUp) dy--; if (moveDown) dy++; if (moveLeft) dx--; if (moveRight) dx++;
    if (dx !== 0 || dy !== 0) {
      const mag = Math.hypot(dx, dy); dx /= mag; dy /= mag;
      this.lastMoveAngle = Math.atan2(dy, dx);
      if (!this.isAttacking && !this.isCasting) this.facingAngle = this.lastMoveAngle;
      const accel = this.config.moveSpeed * 11;
      this.vx += dx * accel * dt; this.vy += dy * accel * dt;
    } else { this.vx *= Math.pow(0.0008, dt); this.vy *= Math.pow(0.0008, dt); }
    const speed = this.config.moveSpeed * (this.rageTimer > 0 ? 1.14 : 1);
    const current = Math.hypot(this.vx, this.vy);
    if (current > speed) { this.vx = this.vx / current * speed; this.vy = this.vy / current * speed; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const p = ARENA_CONFIG.boundsPadding;
    this.x = Math.max(p, Math.min(ARENA_CONFIG.width - p, this.x));
    this.y = Math.max(p + 8, Math.min(ARENA_CONFIG.height - p - 8, this.y));
    this.mana = Math.min(this.maxMana, this.mana + (this.rageTimer > 0 ? 6 : 8) * dt);
  }

  public requestAttack(targetId: string | undefined, targetAngle: number): boolean {
    if (!this.isAlive || this.isCasting) return false;
    if (this.isAttacking) { this.queuedAttack = true; return true; }
    if (this.attackCooldown > 0) return false;
    this.startAttack(targetId, targetAngle);
    return true;
  }

  private startAttack(targetId: string | undefined, targetAngle: number): void {
    this.comboStep = this.comboWindow > 0 ? (this.comboStep + 1) % 3 : 0;
    this.facingAngle = targetAngle;
    this.targetId = targetId;
    this.isAttacking = true;
    this.attackTimer = this.rageTimer > 0 ? 0.18 : 0.27;
    this.attackCooldown = this.rageTimer > 0 ? 0.11 : 0.16;
    const finisher = this.comboStep === 2;
    const classMultiplier = this.classType === 'barbarian' ? 1.2 : this.classType === 'rogue' ? 0.9 : 1;
    this.pendingAttack = {
      id: ++attackSequence, heroId: this.id, comboStep: this.comboStep, x: this.x, y: this.y, angle: targetAngle,
      range: this.config.attackRange + (finisher ? 12 : 0), radius: finisher ? 18 : 13,
      damage: Math.round(this.config.attackPower * classMultiplier * (finisher ? 1.65 : 1)),
      element: this.classType === 'wizard' ? 'arcane' : this.classType === 'rogue' ? 'shadow' : 'physical', targetId,
    };
  }

  public consumeAttack(): AttackEvent | null { const event = this.pendingAttack; this.pendingAttack = null; return event; }

  public triggerSpecial(): boolean {
    if (!this.isAlive || this.specialCooldownTimer > 0 || this.mana < this.config.specialManaCost) return false;
    this.mana -= this.config.specialManaCost;
    this.specialCooldownTimer = this.config.specialCooldown * (this.classType === 'rogue' ? 0.9 : 1);
    this.specialTimer = this.classType === 'rogue' ? 0.38 : 0.5;
    this.specialName = this.config.specialSkillName;
    this.specialHasFired = false;
    if (this.classType === 'rogue') { this.isInvulnerable = true; this.invulnerableTimer = 0.48; }
    if (this.classType === 'knight') this.barrierTimer = 2.1;
    return true;
  }

  public triggerUltimate(): boolean {
    if (!this.isAlive || this.ultimate < 100 || this.isCasting) return false;
    this.ultimate = 0;
    this.specialTimer = this.classType === 'barbarian' ? 6 : 0.65;
    this.specialName = this.config.ultimateSkillName;
    this.specialHasFired = false;
    if (this.classType === 'barbarian') this.rageTimer = 6;
    if (this.classType === 'knight') { this.isInvulnerable = true; this.invulnerableTimer = 2.4; }
    return true;
  }

  public takeDamage(damage: number): number {
    if (!this.isAlive || this.isInvulnerable || this.barrierTimer > 0) return 0;
    const net = Math.max(1, Math.round(damage - this.config.armor * 0.42));
    this.hp = Math.max(0, this.hp - net);
    this.isInvulnerable = true; this.invulnerableTimer = 0.52;
    if (this.hp <= 0) { this.downedTimer = 11; this.reviveProgress = 0; }
    return net;
  }

  public revive(): void { this.hp = Math.ceil(this.maxHp * 0.35); this.downedTimer = 0; this.reviveProgress = 0; this.isInvulnerable = true; this.invulnerableTimer = 1.2; }

  public render(g: Graphics, clock: number, drawBody = true): void {
    const x = Math.round(this.x); const y = Math.round(this.y);
    const bob = this.isAlive ? Math.round(Math.sin(clock * 10 + this.id) * (Math.hypot(this.vx, this.vy) > 10 ? 1 : 0)) : 0;
    g.ellipse(x, y + 7, this.isDowned ? 10 : 8, 3).fill({ color: 0x05030a, alpha: 0.52 });
    if (this.isDowned) {
      if (drawBody) {
        g.rect(x - 8, y - 1, 16, 5).fill({ color: 0x4c3043 });
        g.rect(x - 4, y - 6, 8, 6).fill({ color: this.config.primaryColor });
      }
      g.rect(x - 7, y - 12, 14, 2).fill({ color: 0x1b1324 });
      g.rect(x - 7, y - 12, Math.max(0, 14 * this.downedTimer / 11), 2).fill({ color: 0xe05263 });
      return;
    }
    if (drawBody && this.barrierTimer > 0) g.circle(x, y - 4, 15).stroke({ color: 0x6ff7ff, width: 2, alpha: 0.7 });
    if (drawBody && this.rageTimer > 0) g.circle(x, y - 4, 14 + Math.sin(clock * 18) * 2).stroke({ color: 0xff884a, width: 2, alpha: 0.8 });
    if (drawBody) g.circle(x, y - 4, 11).stroke({ color: this.config.secondaryColor, width: 2, alpha: 0.95 });
    const body = this.config.primaryColor;
    if (drawBody && this.classType === 'knight') {
      g.rect(x - 6, y - 10 + bob, 12, 14).fill({ color: body }); g.rect(x - 5, y - 17 + bob, 10, 8).fill({ color: 0xc9d5df }); g.rect(x - 3, y - 14 + bob, 6, 2).fill({ color: 0x223044 }); g.rect(x - 10, y - 7 + bob, 4, 9).fill({ color: this.config.secondaryColor });
    } else if (drawBody && this.classType === 'wizard') {
      g.poly([x - 7, y + 4, x + 7, y + 4, x + 5, y - 10 + bob, x - 5, y - 10 + bob]).fill({ color: body }); g.poly([x - 7, y - 10 + bob, x, y - 22 + bob, x + 7, y - 10 + bob]).fill({ color: this.config.secondaryColor }); g.rect(x + 7, y - 13 + bob, 2, 17).fill({ color: 0xc59b5f }); g.circle(x + 8, y - 15 + bob, 3).fill({ color: 0x6ff7ff });
    } else if (drawBody && this.classType === 'rogue') {
      g.rect(x - 5, y - 10 + bob, 10, 14).fill({ color: body }); g.rect(x - 6, y - 17 + bob, 12, 7).fill({ color: 0x223044 }); g.rect(x - 3, y - 14 + bob, 6, 2).fill({ color: 0x7de38a }); g.rect(x - 10, y - 3 + bob, 5, 2).fill({ color: 0xeaf6ff }); g.rect(x + 5, y - 3 + bob, 5, 2).fill({ color: 0xeaf6ff });
    } else if (drawBody) {
      g.rect(x - 7, y - 10 + bob, 14, 14).fill({ color: body }); g.rect(x - 5, y - 18 + bob, 10, 8).fill({ color: 0xf0bb83 }); g.rect(x - 6, y - 21 + bob, 12, 4).fill({ color: this.config.secondaryColor }); g.rect(x + 8, y - 15 + bob, 3, 19).fill({ color: 0x6f5045 }); g.rect(x + 6, y - 20 + bob, 8, 7).fill({ color: 0xc9d5df });
    }
    if (drawBody && this.isAttacking) { const sx = x + Math.cos(this.facingAngle) * 17; const sy = y - 4 + Math.sin(this.facingAngle) * 17; g.circle(sx, sy, 10).stroke({ color: 0xf8f4e8, width: 3, alpha: 0.72 }); }
    if (this.isInvulnerable && Math.floor(clock * 18) % 2 === 0) g.rect(x - 10, y - 24, 20, 30).stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
  }
}
