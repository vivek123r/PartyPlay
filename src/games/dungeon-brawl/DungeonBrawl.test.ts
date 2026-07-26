import { describe, expect, it, vi } from 'vitest';
import { BOSS_CONFIGS, HERO_CONFIGS, ROOMS } from './config';
import { Hero } from './entities/Hero';
import { Enemy } from './entities/Enemy';
import { DungeonBoss } from './entities/DungeonBoss';
import { TargetingSystem } from './systems/TargetingSystem';
import { DungeonArena } from './systems/DungeonArena';
import { DungeonAudio } from './systems/DungeonAudio';
import { ClassCombatEffects, CLASS_EFFECT_SIGNATURES } from './visuals/ClassCombatEffects';
import { DUNGEON_CLIPS, DUNGEON_TEXTURES } from './visuals/DungeonAssetLibrary';
import type { DungeonSceneView } from './visuals/DungeonSceneView';
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

  it('gives every class a distinct basic, impact, skill, and ultimate effect signature', () => {
    const stages = ['basic', 'impact', 'special', 'ultimate'] as const;
    for (const stage of stages) {
      const clips = Object.values(CLASS_EFFECT_SIGNATURES).map(recipe => recipe[stage]);
      expect(new Set(clips).size).toBe(4);
    }
    for (const recipe of Object.values(CLASS_EFFECT_SIGNATURES)) {
      expect(new Set(Object.values(recipe)).size).toBe(4);
    }
  });

  it('uses semantic, layout-aware filenames for every curated runtime asset', () => {
    const urls = [
      ...Object.values(DUNGEON_CLIPS).map(descriptor => descriptor.url),
      ...Object.values(DUNGEON_TEXTURES),
    ];
    for (const url of urls) {
      const filename = url.split('/').at(-1) ?? '';
      expect(filename).toContain('--');
      expect(filename).toMatch(/(?:sheet-\d+x\d+x\d+|static-\d+x\d+|\d+x\d+)\.png$/);
    }
  });

  it('dispatches the correct class-specific effects for basic, skill, and ultimate actions', () => {
    const calls: string[] = [];
    const scene = {
      playEffect: (clip: string) => { calls.push(clip); },
    } as unknown as DungeonSceneView;
    const effects = new ClassCombatEffects(scene);
    const classes = ['knight', 'wizard', 'rogue', 'barbarian'] as const;

    for (const [index, classType] of classes.entries()) {
      const hero = new Hero(index + 1, classType, 100, 100);
      hero.requestAttack('target', 0);
      effects.playBasic(hero, hero.consumeAttack()!);
      effects.playSpecial(hero, 0, { x: 80, y: 100 });
      effects.playUltimate(hero, 140, 100);

      const recipe = CLASS_EFFECT_SIGNATURES[classType];
      expect(calls).toContain(recipe.basic);
      expect(calls).toContain(recipe.special);
      expect(calls).toContain(recipe.ultimate);
      calls.length = 0;
    }
  });

  it('gives each room solid tactical cover and pushes actors out of it', () => {
    const arena = new DungeonArena();
    for (const room of ROOMS) {
      arena.setTheme(room.theme);
      expect(arena.obstacles.length).toBeGreaterThanOrEqual(3);
      expect(arena.traps.length).toBeGreaterThanOrEqual(2);
      const obstacle = arena.obstacles[0];
      const resolved = arena.resolveCircle(obstacle.x, obstacle.y, 10);
      expect(resolved.collided).toBe(true);
      expect(arena.isBlocked(resolved.x, resolved.y, 9)).toBe(false);
    }
  });

  it('preloads attack samples and layers an audible transient over normal attacks', () => {
    const output = {
      playTone: vi.fn(),
      playSample: vi.fn(),
      preloadSamples: vi.fn(),
    };
    const sound = new DungeonAudio(output);
    sound.playAttack('knight', -.12);
    expect(output.preloadSamples).toHaveBeenCalledOnce();
    expect(output.playSample).toHaveBeenCalledWith(
      '/assets/dungeon-brawl/audio/knight-sword-swing.wav',
      .82,
      -.12,
    );
    expect(output.playTone).toHaveBeenCalledOnce();
  });
});
