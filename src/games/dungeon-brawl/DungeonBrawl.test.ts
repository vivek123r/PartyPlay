import { describe, expect, it } from 'vitest';
import { BOSS_CONFIGS, HERO_CONFIGS, ROOMS } from './config';
import { Hero } from './entities/Hero';
import { Enemy } from './entities/Enemy';
import { DungeonBoss } from './entities/DungeonBoss';
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
    expect(ROOMS.map(room => room.miniBoss).filter(Boolean)).toEqual(['crypt_warden', 'ember_fiend', 'blood_champion', 'horned_king']);
    expect(manifest.estimatedRoundTime).toBe('7-9 min');
  });

  it('telegraphs every boss attack before emitting damage events', () => {
    const hero = new Hero(1, 'knight', 240, 160);
    const boss = new DungeonBoss('blood_champion', 240, 80, 2, 1);
    boss.attackCooldown = 0;
    expect(boss.update(0.01, [hero])).toEqual([]);
    expect(boss.state).toBe('telegraph-charge');
    expect(boss.update(0.3, [hero])).toEqual([]);
  });

  it('scales boss health with party size and difficulty', () => {
    const base = new DungeonBoss('crypt_warden', 240, 80, 2, 1);
    const scaled = new DungeonBoss('crypt_warden', 240, 80, 4, 1.5);
    expect(base.maxHp).toBe(BOSS_CONFIGS.crypt_warden.maxHp);
    expect(scaled.maxHp).toBeGreaterThan(base.maxHp * 1.5);
  });
});
