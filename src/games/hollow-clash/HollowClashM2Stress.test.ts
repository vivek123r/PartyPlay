import { describe, test, expect, beforeEach } from 'vitest';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { BossMossKnight } from './entities/BossMossKnight';
import { SoulSpell } from './entities/SoulSpell';
import { SporeCloud } from './entities/SporeCloud';
import { CavernTilemap } from './systems/CavernTilemap';
import { PlatformPhysics } from './systems/PlatformPhysics';
import { SideHUDManager } from './systems/SideHUDManager';
import { PLATFORM_PHYSICS, COMBAT_STATS } from './config';
import type { PlatformTile, CharmType } from './types';

describe('Milestone 2 Stress Test Suite — M2 Mechanics & Spells Boundary Conditions', () => {
  const dt = 1 / 60;
  let tilemap: CavernTilemap;
  let physics: PlatformPhysics;

  beforeEach(() => {
    tilemap = new CavernTilemap();
    physics = new PlatformPhysics();
  });

  describe('Boundary Condition 1: 0 Soul & Sub-33 Soul Spell Attempts', () => {
    test('Attempting Vengeful Spirit with 0 Soul returns null and leaves Soul at 0', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.soul = 0;

      const spell = knight.castSpell('neutral');
      expect(spell).toBeNull();
      expect(knight.state.soul).toBe(0);
      expect(knight.activeSpells.length).toBe(0);
    });

    test('Attempting Abyssal Shriek with 0 Soul returns null and leaves Soul at 0', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.soul = 0;

      const spell = knight.castSpell('up');
      expect(spell).toBeNull();
      expect(knight.state.soul).toBe(0);
      expect(knight.activeSpells.length).toBe(0);
    });

    test('Attempting Desolate Dive in air with 0 Soul returns null, maintains state flags, and leaves Soul at 0', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.isGrounded = false;
      knight.state.soul = 0;

      const spell = knight.castSpell('down');
      expect(spell).toBeNull();
      expect(knight.state.soul).toBe(0);
      expect(knight.isDiving).toBe(false);
      expect(knight.state.isDiving).toBe(false);
      expect(knight.isInvulnerable).toBe(false);
      expect(knight.activeSpells.length).toBe(0);
    });

    test('Attempting Focus Heal with 0 Soul returns false and leaves HP and Soul unchanged', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      knight.state.soul = 0;
      knight.state.hp = 3;

      const healed = knight.focusHeal();
      expect(healed).toBe(false);
      expect(knight.state.hp).toBe(3);
      expect(knight.state.soul).toBe(0);
    });

    test('Sub-33 Soul boundary check (Soul = 32): All 4 spell attempts fail cleanly', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      knight.state.soul = 32;
      knight.state.hp = 3;
      knight.state.isGrounded = false;

      expect(knight.castSpell('neutral')).toBeNull();
      expect(knight.castSpell('up')).toBeNull();
      expect(knight.castSpell('down')).toBeNull();
      expect(knight.focusHeal()).toBe(false);

      expect(knight.state.soul).toBe(32);
      expect(knight.state.hp).toBe(3);
    });
  });

  describe('Boundary Condition 2: Exact 33 Soul Spell Execution & Multi-Cast Drain', () => {
    test('Vengeful Spirit cast with exactly 33 Soul succeeds and leaves exactly 0 Soul', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.soul = 33;

      const spell = knight.castSpell('neutral');
      expect(spell).not.toBeNull();
      expect(knight.state.soul).toBe(0);
      expect(spell?.type).toBe('vengeful_spirit');
    });

    test('Abyssal Shriek cast with exactly 33 Soul succeeds and leaves exactly 0 Soul', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.soul = 33;

      const spell = knight.castSpell('up');
      expect(spell).not.toBeNull();
      expect(knight.state.soul).toBe(0);
      expect(spell?.type).toBe('abyssal_shriek');
    });

    test('Desolate Dive cast with exactly 33 Soul succeeds and leaves exactly 0 Soul', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100 });
      knight.state.isGrounded = false;
      knight.state.soul = 33;

      const spell = knight.castSpell('down');
      expect(spell).not.toBeNull();
      expect(knight.state.soul).toBe(0);
      expect(knight.isDiving).toBe(true);
    });

    test('Focus Heal completed with exactly 33 Soul restores 1 HP and leaves exactly 0 Soul', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      knight.state.soul = 33;
      knight.state.hp = 3;

      const success = knight.focusHeal();
      expect(success).toBe(true);
      expect(knight.state.hp).toBe(4);
      expect(knight.state.soul).toBe(0);
    });

    test('100 Max Soul Drain: Exactly 3 spells can be cast, leaving 1 Soul; 4th spell fails', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      knight.state.soul = 100;

      const s1 = knight.castVengefulSpirit();
      expect(s1).not.toBeNull();
      expect(knight.state.soul).toBe(67);

      const s2 = knight.castAbyssalShriek();
      expect(s2).not.toBeNull();
      expect(knight.state.soul).toBe(34);

      const s3 = knight.castVengefulSpirit();
      expect(s3).not.toBeNull();
      expect(knight.state.soul).toBe(1);

      const s4 = knight.castVengefulSpirit();
      expect(s4).toBeNull();
      expect(knight.state.soul).toBe(1);
    });
  });

  describe('Boundary Condition 3: Rapid Focus Heal Interrupted by Damage', () => {
    test('Channeling Focus Heal on grounded surface accumulates timer until 0.8s completion', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 214 });
      knight.state.isGrounded = true;
      knight.state.hp = 3;
      knight.state.soul = 100;

      for (let f = 0; f < 24; f++) {
        knight.update(dt, { focusActive: true }, tilemap.tiles, []);
      }
      expect(knight.isFocusing).toBe(true);
      expect(knight.focusTimer).toBeGreaterThan(0.35);

      for (let f = 0; f < 24; f++) {
        knight.update(dt, { focusActive: true }, tilemap.tiles, []);
      }
      expect(knight.state.hp).toBe(4);
      expect(knight.state.soul).toBe(67);
    });

    test('Releasing focus input early interrupts channeling and resets focus timer', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 214 });
      knight.state.isGrounded = true;
      knight.state.hp = 3;
      knight.state.soul = 100;

      for (let f = 0; f < 20; f++) {
        knight.update(dt, { focusActive: true }, tilemap.tiles, []);
      }
      expect(knight.isFocusing).toBe(true);

      knight.update(dt, { focusActive: false }, tilemap.tiles, []);
      expect(knight.isFocusing).toBe(false);
      expect(knight.focusTimer).toBe(0);
      expect(knight.state.soul).toBe(100);
      expect(knight.state.hp).toBe(3);
    });
  });

  describe('Boundary Condition 4: Infinite Pogo Bounce Loops on Enemies & Spikes', () => {
    test('100 consecutive pogo bounces on Boss enemy reset double jump, shadow dash, crystal dash, and dash cooldown every time', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 250, y: 120 });
      const boss = new BossMossKnight(250, 160);

      for (let bounce = 1; bounce <= 100; bounce++) {
        boss.hp = 600;
        knight.attackCooldown = 0;
        knight.state.isShadowDashing = false;
        knight.isCrystalDashing = false;
        knight.state.isCrystalDashing = false;
        knight.state.x = 250;
        knight.state.y = 120;
        knight.state.vy = 50;
        knight.state.isGrounded = false;
        knight.canDoubleJump = false;
        knight.canShadowDash = false;
        knight.canCrystalDash = false;
        knight.state.dashCooldownTimer = 1.5;

        (knight as any).performAttack({ down: true }, [boss], []);

        expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
        expect(knight.canDoubleJump).toBe(true);
        expect(knight.canShadowDash).toBe(true);
        expect(knight.canCrystalDash).toBe(true);
        expect(knight.state.dashCooldownTimer).toBe(0);
      }
    });

    test('100 consecutive pogo bounces on spike pit hazard reset air abilities without taking damage', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 220 });
      const spikeTiles: PlatformTile[] = [
        { x: 280, y: 240, width: 80, height: 16, isSolid: false, type: 'spikes' },
      ];

      const initialHp = knight.state.hp;

      for (let bounce = 1; bounce <= 100; bounce++) {
        knight.attackCooldown = 0;
        knight.state.isShadowDashing = false;
        knight.isCrystalDashing = false;
        knight.state.isCrystalDashing = false;
        knight.state.x = 300;
        knight.state.y = 215;
        knight.state.vy = 50;
        knight.state.isGrounded = false;
        knight.canDoubleJump = false;
        knight.canShadowDash = false;
        knight.canCrystalDash = false;
        knight.state.dashCooldownTimer = 1.0;

        (knight as any).performAttack({ down: true }, [], spikeTiles);

        expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
        expect(knight.canDoubleJump).toBe(true);
        expect(knight.canShadowDash).toBe(true);
        expect(knight.canCrystalDash).toBe(true);
        expect(knight.state.dashCooldownTimer).toBe(0);
        expect(knight.state.hp).toBe(initialHp);
      }
    });
  });

  describe('Boundary Condition 5: Crystal Dash in Open Caverns vs Solid Walls', () => {
    test('Open Cavern: Crystal Dash rockets continuously across 3000px without velocity degradation or altitude drop', () => {
      const emptyTiles: PlatformTile[] = [];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.triggerCrystalDash();

      for (let f = 0; f < 300; f++) {
        physics.update(knight, emptyTiles, dt);
        expect(knight.isCrystalDashing).toBe(true);
        expect(knight.state.vx).toBe(600);
        expect(knight.state.vy).toBe(0);
        expect(knight.state.y).toBe(200);
      }

      expect(knight.state.x).toBe(100 + 600 * 5);
    });

    test('Solid Wall Collision (rightward): Crystal Dash terminates immediately upon wall impact without phase-through', () => {
      const wallTiles: PlatformTile[] = [
        { x: 500, y: 100, width: 32, height: 300, isSolid: true, type: 'stone' },
      ];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 400, y: 200, facing: 'right' });
      knight.triggerCrystalDash();

      for (let f = 0; f < 30; f++) {
        physics.update(knight, wallTiles, dt);
      }

      expect(knight.isCrystalDashing).toBe(false);
      expect(knight.state.isCrystalDashing).toBe(false);
      expect(knight.state.vx).toBe(0);
      expect(knight.state.x).toBe(500 - knight.width);
    });

    test('Solid Wall Collision (leftward): Crystal Dash terminates immediately upon left wall impact', () => {
      const wallTiles: PlatformTile[] = [
        { x: 100, y: 100, width: 32, height: 300, isSolid: true, type: 'stone' },
      ];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 200, y: 200, facing: 'left' });
      knight.triggerCrystalDash();

      for (let f = 0; f < 30; f++) {
        physics.update(knight, wallTiles, dt);
      }

      expect(knight.isCrystalDashing).toBe(false);
      expect(knight.state.vx).toBe(0);
      expect(knight.state.x).toBe(100 + 32);
    });
  });

  describe('Boundary Condition 6: Multi-Charm Interactions & Dynamic Equipping', () => {
    test('All 4 charms equipped simultaneously apply all respective combat & survival buffs', () => {
      const knight = new Knight({
        id: 1,
        mask: 'vessel',
        x: 100,
        y: 200,
        equippedCharms: ['quick_slash', 'longnail', 'spore_shroom', 'lifeblood_heart'],
      });

      expect(knight.getLifebloodHP()).toBe(2);

      knight.update(dt, { attackJustPressed: true }, [], []);
      expect(knight.attackCooldown).toBeCloseTo(0.18, 2);

      const distantEnemy = new Enemy('dist-enemy', 'spore_bug', 160, 200);
      const longnailKnight = new Knight({
        id: 2,
        mask: 'vessel',
        x: 100,
        y: 200,
        facing: 'right',
        equippedCharms: ['quick_slash', 'longnail', 'spore_shroom', 'lifeblood_heart'],
      });
      longnailKnight.update(dt, { attackJustPressed: true }, [], [distantEnemy]);
      expect(distantEnemy.hp).toBe(distantEnemy.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      longnailKnight.takeDamage(1);
      expect(longnailKnight.activeSporeClouds.length).toBeGreaterThan(0);
    });

    test('Dynamic charm swapping mid-game updates stats cleanly without corruption', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });

      expect(knight.getCharms()).toEqual([]);
      expect(knight.getLifebloodHP()).toBe(0);

      knight.equipCharm('lifeblood_heart');
      expect(knight.getLifebloodHP()).toBe(2);

      knight.equipCharm('quick_slash');
      expect(knight.hasCharm('quick_slash')).toBe(true);

      knight.unequipCharm('lifeblood_heart');
      expect(knight.getLifebloodHP()).toBe(0);
      expect(knight.getCharms()).toEqual(['quick_slash']);

      for (let i = 0; i < 50; i++) {
        knight.equipCharm('longnail');
        knight.equipCharm('spore_shroom');
        knight.unequipCharm('longnail');
        knight.unequipCharm('spore_shroom');
      }

      expect(knight.getCharms()).toEqual(['quick_slash']);
    });
  });
});
