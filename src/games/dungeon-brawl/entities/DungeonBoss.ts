import { Graphics } from 'pixi.js';
import type { BossAction, BossCombatEvent, BossType } from '../types';
import type { Hero } from './Hero';
import { ARENA_CONFIG, BOSS_CONFIGS } from '../config';

type BossState = 'stalk' | 'stunned' | 'charge' | `telegraph-${BossAction}`;

const TELEGRAPH_TIME: Record<BossAction, number> = {
  blink: 0.46,
  shriek: 0.78,
  leap: 0.72,
  fire_burst: 0.78,
  charge: 0.72,
  sweep: 0.68,
  slam: 0.86,
  summon: 0.8,
};

export class DungeonBoss {
  public readonly id: string;
  public readonly type: BossType;
  public readonly name: string;
  public x: number;
  public y: number;
  public hp: number;
  public maxHp: number;
  public phase = 1;
  public state: BossState = 'stalk';
  public timer = 0;
  public attackCooldown = 1.1;
  public chargeAngle = 0;
  public isStunned = false;
  public stunTimer = 0;
  public isFrozen = false;
  public freezeTimer = 0;
  public radius: number;
  public invulnerable = false;
  public targetX = 240;
  public targetY = 135;

  private patternIndex = 0;
  private chargeHitCooldown = 0;
  private readonly difficulty: number;
  private readonly accentColor: number;
  private readonly primaryColor: number;

  public constructor(type: BossType, x: number, y: number, players: number, difficulty: number) {
    const config = BOSS_CONFIGS[type];
    this.id = `boss-${type}`;
    this.type = type;
    this.name = config.name;
    this.x = x;
    this.y = y;
    this.difficulty = difficulty;
    this.maxHp = Math.round((config.maxHp + Math.max(0, players - 2) * config.maxHp * 0.18) * difficulty);
    this.hp = this.maxHp;
    this.radius = config.radius;
    this.primaryColor = config.primaryColor;
    this.accentColor = config.accentColor;
  }

  public update(dt: number, heroes: Hero[]): BossCombatEvent[] {
    const events: BossCombatEvent[] = [];
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.stunTimer = Math.max(0, this.stunTimer - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.chargeHitCooldown = Math.max(0, this.chargeHitCooldown - dt);
    this.isStunned = this.stunTimer > 0;
    this.isFrozen = this.freezeTimer > 0;
    this.phase = this.hp <= this.maxHp * 0.3 ? 3 : this.hp <= this.maxHp * 0.62 ? 2 : 1;
    const living = heroes.filter((hero) => hero.isAlive);
    if (!living.length) return events;
    const target = living.reduce((best, hero) => (
      Math.hypot(hero.x - this.x, hero.y - this.y) < Math.hypot(best.x - this.x, best.y - this.y) ? hero : best
    ), living[0]);

    if (this.isStunned || this.isFrozen) {
      this.state = 'stunned';
      return events;
    }
    if (this.state === 'stunned') {
      this.state = 'stalk';
      this.timer = 0;
    }
    if (this.state === 'charge') {
      const speed = (this.type === 'blood_champion' ? 278 : 252) * (this.phase === 3 ? 1.18 : 1);
      this.x += Math.cos(this.chargeAngle) * speed * dt;
      this.y += Math.sin(this.chargeAngle) * speed * dt;
      if (this.chargeHitCooldown <= 0) {
        events.push({ type: 'charge-hit', x: this.x, y: this.y, radius: this.radius + 8, damage: Math.round(23 * this.difficulty) });
        this.chargeHitCooldown = 0.22;
      }
      const p = ARENA_CONFIG.boundsPadding + this.radius;
      if (this.x <= p || this.x >= ARENA_CONFIG.width - p || this.y <= p + 8 || this.y >= ARENA_CONFIG.height - p - 8) {
        this.x = Math.max(p, Math.min(ARENA_CONFIG.width - p, this.x));
        this.y = Math.max(p + 8, Math.min(ARENA_CONFIG.height - p - 8, this.y));
        this.state = 'stunned';
        this.stunTimer = this.type === 'blood_champion' ? 1.05 : 0.72;
        this.attackCooldown = 0.9;
      }
      return events;
    }
    if (this.state.startsWith('telegraph-')) {
      this.timer += dt;
      const action = this.state.slice('telegraph-'.length) as BossAction;
      if (this.timer >= TELEGRAPH_TIME[action]) events.push(...this.execute(action, target));
      return events;
    }

    const distance = Math.hypot(target.x - this.x, target.y - this.y);
    const moveSpeed = this.type === 'crypt_warden' ? 54 : this.type === 'ember_fiend' ? 44 : 38;
    if (distance > 78) {
      this.x += (target.x - this.x) / Math.max(1, distance) * moveSpeed * dt;
      this.y += (target.y - this.y) / Math.max(1, distance) * moveSpeed * dt;
    }
    if (this.attackCooldown <= 0) {
      const action = this.nextAction();
      this.targetX = target.x;
      this.targetY = target.y;
      this.chargeAngle = Math.atan2(target.y - this.y, target.x - this.x);
      this.state = `telegraph-${action}`;
      this.timer = 0;
    }
    return events;
  }

  public takeDamage(damage: number): number {
    if (this.invulnerable || this.hp <= 0) return 0;
    const dealt = Math.max(1, Math.round(damage));
    this.hp = Math.max(0, this.hp - dealt);
    return dealt;
  }

  public renderTelegraph(g: Graphics, clock: number): void {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    g.ellipse(x, y + 14, this.radius + 5, 7).fill({ color: 0x05030a, alpha: 0.58 });
    if (this.state.startsWith('telegraph-')) {
      const action = this.state.slice('telegraph-'.length) as BossAction;
      const progress = Math.min(1, this.timer / TELEGRAPH_TIME[action]);
      const warning = this.phase === 3 ? 0xff526b : this.accentColor;
      if (action === 'charge') {
        const length = 220;
        const ex = x + Math.cos(this.chargeAngle) * length;
        const ey = y + Math.sin(this.chargeAngle) * length;
        g.moveTo(x, y).lineTo(ex, ey).stroke({ color: warning, width: 8, alpha: 0.12 + progress * 0.2 });
        g.moveTo(x, y).lineTo(ex, ey).stroke({ color: warning, width: 2, alpha: 0.55 + progress * 0.4 });
      } else if (action === 'leap') {
        g.circle(this.targetX, this.targetY, 34 - progress * 4).stroke({ color: warning, width: 3, alpha: 0.8 });
        g.circle(this.targetX, this.targetY, 7 + progress * 12).fill({ color: warning, alpha: 0.16 });
      } else {
        const radius = action === 'shriek' ? 72 : action === 'sweep' ? 54 : action === 'slam' ? 68 : 46;
        g.circle(x, y, radius).stroke({ color: warning, width: 2 + progress * 2, alpha: 0.45 + progress * 0.45 });
      }
    }
    if (this.isStunned) {
      for (let i = 0; i < 3; i++) {
        const angle = clock * 5 + i * Math.PI * 2 / 3;
        g.circle(x + Math.cos(angle) * 18, y - 36 + Math.sin(angle) * 5, 2).fill({ color: 0xf2c14e });
      }
    }
    if (this.phase === 3) g.circle(x, y - 8, this.radius + 8 + Math.sin(clock * 14) * 2).stroke({ color: this.primaryColor, width: 2, alpha: 0.5 });
  }

  private nextAction(): BossAction {
    const patterns: Record<BossType, BossAction[]> = {
      crypt_warden: this.phase >= 2 ? ['blink', 'shriek', 'summon'] : ['blink', 'shriek'],
      ember_fiend: this.phase >= 2 ? ['leap', 'fire_burst', 'leap'] : ['leap', 'fire_burst'],
      blood_champion: this.phase >= 2 ? ['charge', 'sweep', 'charge'] : ['charge', 'sweep'],
      horned_king: this.phase === 3
        ? ['charge', 'slam', 'fire_burst', 'summon']
        : this.phase === 2 ? ['charge', 'slam', 'summon'] : ['charge', 'slam'],
    };
    const pattern = patterns[this.type];
    const action = pattern[this.patternIndex % pattern.length];
    this.patternIndex++;
    return action;
  }

  private execute(action: BossAction, target: Hero): BossCombatEvent[] {
    const events: BossCombatEvent[] = [];
    this.state = 'stalk';
    this.timer = 0;
    this.attackCooldown = Math.max(0.7, 1.55 - this.phase * 0.16);
    if (action === 'blink') {
      const offset = this.patternIndex % 2 === 0 ? -52 : 52;
      this.x = Math.max(44, Math.min(436, target.x + offset));
      this.y = Math.max(50, Math.min(220, target.y - 26));
      events.push({ type: 'teleport', x: this.x, y: this.y });
    } else if (action === 'shriek') {
      events.push({ type: 'shockwave', x: this.x, y: this.y, angle: this.chargeAngle, radius: 74, damage: Math.round(20 * this.difficulty) });
    } else if (action === 'leap') {
      this.x = Math.max(42, Math.min(438, this.targetX));
      this.y = Math.max(50, Math.min(218, this.targetY));
      events.push(
        { type: 'shockwave', x: this.x, y: this.y, radius: 38, damage: Math.round(24 * this.difficulty) },
        { type: 'hazard', x: this.x, y: this.y, radius: 31, damage: Math.round(16 * this.difficulty) },
      );
    } else if (action === 'fire_burst') {
      events.push({ type: 'projectile', x: this.x, y: this.y, count: this.phase === 3 ? 10 : 7, damage: Math.round(17 * this.difficulty) });
    } else if (action === 'charge') {
      this.state = 'charge';
      this.chargeHitCooldown = 0;
    } else if (action === 'sweep') {
      events.push({ type: 'shockwave', x: this.x, y: this.y, radius: 58, damage: Math.round(25 * this.difficulty) });
    } else if (action === 'slam') {
      events.push({ type: 'shockwave', x: this.x, y: this.y, radius: 72, damage: Math.round(28 * this.difficulty) });
    } else if (action === 'summon') {
      const enemyType = this.type === 'crypt_warden' ? 'skeleton' : this.type === 'horned_king' ? 'imp' : 'wraith';
      events.push({ type: 'summon', x: this.x, y: this.y, count: this.phase === 3 ? 3 : 2, enemyType });
    }
    return events;
  }
}
