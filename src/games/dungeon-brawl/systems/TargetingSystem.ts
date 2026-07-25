import type { Hero } from '../entities/Hero';
import type { Enemy } from '../entities/Enemy';
import type { BossMinotaur } from '../entities/BossMinotaur';

export type Hostile = Enemy | BossMinotaur;

export interface TargetResult { id?: string; x: number; y: number; angle: number; distance: number; }

export class TargetingSystem {
  public findNearest(hero: Hero, enemies: Enemy[], boss: BossMinotaur | null, range: number): TargetResult {
    const candidates: Hostile[] = [...enemies.filter(enemy => enemy.hp > 0), ...(boss && boss.hp > 0 ? [boss] : [])];
    const retained = candidates.find(target => target.id === hero.targetId);
    const accepted = retained && Math.hypot(retained.x - hero.x, retained.y - hero.y) <= range * 1.25 ? retained : undefined;
    const target = accepted ?? candidates.reduce<Hostile | undefined>((best, candidate) => {
      const distance = Math.hypot(candidate.x - hero.x, candidate.y - hero.y);
      if (distance > range || (best && distance >= Math.hypot(best.x - hero.x, best.y - hero.y))) return best;
      return candidate;
    }, undefined);
    if (!target) return { x: hero.x + Math.cos(hero.lastMoveAngle) * range, y: hero.y + Math.sin(hero.lastMoveAngle) * range, angle: hero.lastMoveAngle, distance: Infinity };
    return { id: target.id, x: target.x, y: target.y, angle: Math.atan2(target.y - hero.y, target.x - hero.x), distance: Math.hypot(target.x - hero.x, target.y - hero.y) };
  }

  public findCluster(hero: Hero, enemies: Enemy[], boss: BossMinotaur | null, range: number): TargetResult {
    const candidates: Hostile[] = [...enemies.filter(enemy => enemy.hp > 0), ...(boss && boss.hp > 0 ? [boss] : [])];
    const nearby = candidates.filter(target => Math.hypot(target.x - hero.x, target.y - hero.y) <= range);
    const target = nearby.reduce<Hostile | undefined>((best, candidate) => {
      const crowd = nearby.filter(other => Math.hypot(other.x - candidate.x, other.y - candidate.y) <= 48).length;
      const bestCrowd = best ? nearby.filter(other => Math.hypot(other.x - best.x, other.y - best.y) <= 48).length : -1;
      if (!best || crowd > bestCrowd || (crowd === bestCrowd && Math.hypot(candidate.x - hero.x, candidate.y - hero.y) < Math.hypot(best.x - hero.x, best.y - hero.y))) return candidate;
      return best;
    }, undefined);
    if (!target) return this.findNearest(hero, enemies, boss, range);
    return { id: target.id, x: target.x, y: target.y, angle: Math.atan2(target.y - hero.y, target.x - hero.x), distance: Math.hypot(target.x - hero.x, target.y - hero.y) };
  }
}
