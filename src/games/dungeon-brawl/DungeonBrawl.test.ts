import { describe, expect, it } from 'vitest';
import { HERO_CONFIGS, ROOMS } from './config';
import { Hero } from './entities/Hero';
import { Enemy } from './entities/Enemy';
import { TargetingSystem } from './systems/TargetingSystem';
import manifest from './manifest';

describe('Dungeon Brawl combat foundations', () => {
  it('keeps attacks focused on the nearest valid hostile instead of movement direction', () => {
    const hero = new Hero(1, 'knight', 100, 100);
    hero.lastMoveAngle = Math.PI;
    const near = new Enemy('near', 'skeleton', 125, 100);
    const far = new Enemy('far', 'skeleton', 145, 100);
    const result = new TargetingSystem().findNearest(hero, [far, near], null, 80);
    expect(result.id).toBe('near');
    expect(result.angle).toBeCloseTo(0);
  });

  it('retains the selected target until it leaves the aim-assist grace range', () => {
    const hero = new Hero(1, 'rogue', 100, 100);
    const retained = new Enemy('retained', 'goblin', 160, 100);
    const closer = new Enemy('closer', 'goblin', 125, 100);
    hero.targetId = retained.id;
    const targeting = new TargetingSystem();
    expect(targeting.findNearest(hero, [closer, retained], null, 60).id).toBe('retained');
    retained.x = 185;
    expect(targeting.findNearest(hero, [closer, retained], null, 60).id).toBe('closer');
  });

  it('emits one discrete attack event per attack press', () => {
    const hero = new Hero(1, 'barbarian', 100, 100);
    expect(hero.requestAttack('enemy', 0)).toBe(true);
    expect(hero.consumeAttack()?.targetId).toBe('enemy');
    expect(hero.consumeAttack()).toBeNull();
  });

  it('ships four distinct, playable class kits and a five-room run', () => {
    const names = Object.values(HERO_CONFIGS).map(config => config.specialSkillName);
    expect(new Set(names).size).toBe(4);
    expect(ROOMS.map(room => room.id)).toEqual(['chains', 'crypt', 'ember', 'court', 'throne']);
    expect(manifest.estimatedRoundTime).toBe('5-7 min');
  });
});
