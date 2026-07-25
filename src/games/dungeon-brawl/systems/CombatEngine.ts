import type { AttackEvent, DamageNumber, Particle } from '../types';
import type { Hero } from '../entities/Hero';
import type { Enemy } from '../entities/Enemy';
import type { BossMinotaur } from '../entities/BossMinotaur';

export interface CombatResult { damageNumbers: DamageNumber[]; particles: Particle[]; killed: Enemy[]; hit: boolean; }

export class CombatEngine {
  public hitStopTimer = 0;
  public cameraShake = 0;

  public update(dt: number): void { this.hitStopTimer = Math.max(0, this.hitStopTimer - dt); this.cameraShake = Math.max(0, this.cameraShake - dt); }

  public resolveAttack(hero: Hero, attack: AttackEvent, enemies: Enemy[], boss: BossMinotaur | null): CombatResult {
    const result: CombatResult = { damageNumbers: [], particles: [], killed: [], hit: false };
    const targets = [...enemies.filter(enemy => enemy.hp > 0), ...(boss && boss.hp > 0 ? [boss] : [])];
    const hitLimit = attack.comboStep === 2 ? 4 : 1;
    let hits = 0;
    for (const target of targets) {
      const dx = target.x - attack.x; const dy = target.y - attack.y; const distance = Math.hypot(dx, dy);
      const inPath = distance <= attack.range + (target instanceof Object && 'radius' in target ? Number(target.radius) : 10);
      const angle = Math.atan2(dy, dx); const angleDelta = Math.abs(Math.atan2(Math.sin(angle - attack.angle), Math.cos(angle - attack.angle)));
      const broadArc = hero.classType === 'wizard' || attack.comboStep === 2;
      if (!inPath || (!broadArc && angleDelta > 1.05)) continue;
      const damage = target === boss ? boss.takeDamage(attack.damage) : (target as Enemy).takeDamage(attack.damage, Math.cos(attack.angle) * 52, Math.sin(attack.angle) * 52);
      if (!damage) continue;
      result.hit = true; hits++;
      result.damageNumbers.push({ x: target.x, y: target.y - 19, value: damage, color: attack.comboStep === 2 ? 0xf2c14e : 0xffffff, lifetime: .7, vy: -20 });
      for (let i = 0; i < 5; i++) result.particles.push({ x: target.x, y: target.y - 5, vx: Math.cos(attack.angle + (i - 2) * .45) * (32 + i * 7), vy: Math.sin(attack.angle + (i - 2) * .45) * (32 + i * 7) - 10, life: .38, maxLife: .38, color: hero.config.primaryColor, size: 2 });
      hero.score += target === boss ? 12 : 10; hero.ultimate = Math.min(100, hero.ultimate + (attack.comboStep === 2 ? 9 : 5)); hero.mana = Math.min(hero.maxMana, hero.mana + (attack.comboStep === 2 ? 8 : 2));
      if (target !== boss && (target as Enemy).hp <= 0) result.killed.push(target as Enemy);
      if (hits >= hitLimit) break;
    }
    if (result.hit) { this.hitStopTimer = attack.comboStep === 2 ? .065 : .035; this.cameraShake = attack.comboStep === 2 ? .14 : .06; }
    return result;
  }
}
