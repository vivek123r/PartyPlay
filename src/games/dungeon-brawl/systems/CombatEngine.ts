import type { Hero } from '../entities/Hero';
import type { Enemy } from '../entities/Enemy';
import type { BossMinotaur } from '../entities/BossMinotaur';
import type { Projectile } from '../entities/Projectile';
import type { SynergySystem } from './SynergySystem';

export class CombatEngine {
  public hitStopTimer = 0;

  public processCombat(
    heroes: Hero[],
    enemies: Enemy[],
    boss: BossMinotaur | null,
    projectiles: Projectile[],
    synergy: SynergySystem
  ): void {
    if (this.hitStopTimer > 0) return;

    // 1. Hero Melee & Special Skill Attacks vs Enemies
    for (const hero of heroes) {
      if (hero.hp <= 0) continue;

      if (hero.isAttacking) {
        const attackRange = 28;
        const attackX = hero.x + Math.cos(hero.facingAngle) * 16;
        const attackY = hero.y + Math.sin(hero.facingAngle) * 16;

        // Check against Regular Enemies
        for (const enemy of enemies) {
          if (enemy.hp <= 0) continue;

          const distSq = (enemy.x - attackX) ** 2 + (enemy.y - attackY) ** 2;
          if (distSq <= attackRange ** 2) {
            const knockX = Math.cos(hero.facingAngle) * 40;
            const knockY = Math.sin(hero.facingAngle) * 40;

            enemy.takeDamage(hero.config.attackPower, knockX, knockY);
            hero.score += 25;
            this.hitStopTimer = 0.08; // 80ms freeze-frame hit-stop

            // Check Freeze Synergy Combo
            if (enemy.isFrozen && hero.classType === 'barbarian') {
              synergy.triggerSynergy('Shatter Blast!', enemy.x, enemy.y, 0x00f0ff);
              enemy.takeDamage(80, knockX * 2, knockY * 2);
            }
          }
        }

        // Check against Boss Minotaur
        if (boss && boss.hp > 0) {
          const distSq = (boss.x - attackX) ** 2 + (boss.y - attackY) ** 2;
          if (distSq <= (attackRange + 12) ** 2) {
            boss.takeDamage(hero.config.attackPower);
            hero.score += 50;
            this.hitStopTimer = 0.08;
          }
        }
      }
    }

    // 2. Projectile Collisions vs Enemies
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];

      // Player Projectiles hitting Enemies
      if (proj.ownerId > 0) {
        for (const enemy of enemies) {
          if (enemy.hp <= 0) continue;
          const distSq = (enemy.x - proj.x) ** 2 + (enemy.y - proj.y) ** 2;
          if (distSq <= (enemy.type === 'slime' ? 14 : 10) ** 2) {
            enemy.takeDamage(proj.damage);
            projectiles.splice(i, 1);
            break;
          }
        }
      } else {
        // Enemy Projectiles (Goblin Arrows / Lava Waves) hitting Heroes
        for (const hero of heroes) {
          if (hero.hp <= 0) continue;
          const distSq = (hero.x - proj.x) ** 2 + (hero.y - proj.y) ** 2;
          if (distSq <= 12 ** 2) {
            hero.takeDamage(proj.damage);
            projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // 3. Enemy Contact Damage vs Heroes
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.isStunned || enemy.isFrozen) continue;

      for (const hero of heroes) {
        if (hero.hp <= 0) continue;
        const distSq = (hero.x - enemy.x) ** 2 + (hero.y - enemy.y) ** 2;
        if (distSq <= 12 ** 2) {
          hero.takeDamage(enemy.damage);
        }
      }
    }

    // 4. Boss Contact Damage vs Heroes
    if (boss && boss.hp > 0 && !boss.isStunned) {
      for (const hero of heroes) {
        if (hero.hp <= 0) continue;
        const distSq = (hero.x - boss.x) ** 2 + (hero.y - boss.y) ** 2;
        if (distSq <= 24 ** 2) {
          hero.takeDamage(25);
        }
      }
    }
  }

  public update(dt: number): void {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
    }
  }
}
