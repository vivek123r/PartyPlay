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

describe('Milestone 2 (R2) Advanced Metroidvania Mechanics & Charms Verification Suite', () => {
  const dt = 1 / 60;
  let tilemap: CavernTilemap;
  let physics: PlatformPhysics;

  beforeEach(() => {
    tilemap = new CavernTilemap();
    physics = new PlatformPhysics();
  });

  describe('1. Soul Spells System (Vengeful Spirit, Abyssal Shriek, Desolate Dive, Focus Heal)', () => {
    test('Vengeful Spirit (neutral + cast): Spends 33 Soul and fires horizontal soul wave (vx = ±420, 40 damage)', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.soul = 100;

      const spell = knight.castSpell('neutral');
      expect(spell).not.toBeNull();
      expect(knight.state.soul).toBe(67); // 100 - 33
      expect(spell?.type).toBe('vengeful_spirit');
      expect(spell?.vx).toBe(420);
      expect(spell?.damage).toBe(40);

      // Facing left test
      knight.state.facing = 'left';
      const spellLeft = knight.castVengefulSpirit();
      expect(spellLeft?.vx).toBe(-420);

      // Spell travels and damages enemy in path (mantis_crawler maxHp = 50)
      const enemy = new Enemy('mantis-spell', 'mantis_crawler', 150, 200);
      for (let i = 0; i < 10; i++) {
        spell?.update(dt, [enemy]);
      }
      expect(enemy.hp).toBe(10); // 50 - 40
    });

    test('Abyssal Shriek (up + cast): Spends 33 Soul and spawns upward void column (44x80px, 60 damage)', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      knight.state.soul = 100;

      const spell = knight.castSpell('up');
      expect(spell).not.toBeNull();
      expect(knight.state.soul).toBe(67);
      expect(spell?.type).toBe('abyssal_shriek');
      expect(spell?.width).toBe(44);
      expect(spell?.height).toBe(80);
      expect(spell?.damage).toBe(60);

      // Damages enemy positioned in upward column (boss maxHp = 600)
      const boss = new BossMossKnight(100, 150);
      spell?.update(dt, [boss]);
      expect(boss.hp).toBe(540); // 600 - 60
    });

    test('Desolate Dive (down + cast in air): Spends 33 Soul, rapid downward slam (vy = 600) + invulnerability + ground dive_shockwave (100x24px, 50 damage)', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100 });
      knight.state.isGrounded = false;
      knight.state.soul = 100;

      const spell = knight.castSpell('down');
      expect(spell).not.toBeNull();
      expect(knight.state.soul).toBe(67);
      expect(knight.isDiving).toBe(true);
      expect(knight.isInvulnerable).toBe(true);

      // Update physics until knight lands on solid ground floor (y=214)
      for (let i = 0; i < 20; i++) {
        physics.update(knight, tilemap.tiles, dt);
      }

      // Landing cancels dive and spawns dive_shockwave
      expect(knight.isDiving).toBe(false);
      expect(knight.state.isGrounded).toBe(true);

      const shockwave = knight.activeSpells.find((s) => s.type === 'dive_shockwave');
      expect(shockwave).toBeDefined();
      expect(shockwave?.width).toBe(100);
      expect(shockwave?.height).toBe(24);
      expect(shockwave?.damage).toBe(50);
    });

    test('Focus Heal (grounded channel): 0.8s channel spending 33 Soul for +1 HP without firing spell projectiles', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      knight.state.isGrounded = true;
      knight.state.hp = 3;
      knight.state.soul = 100;

      // Channel for 0.8s
      knight.startFocusHeal();
      for (let f = 0; f < 48; f++) {
        // 48 frames @ dt=1/60 = 0.8s
        knight.updateFocusHeal(dt);
      }

      expect(knight.state.hp).toBe(4);
      expect(knight.state.soul).toBe(67);

      // Verify no offensive projectiles were created
      const offensiveSpells = knight.activeSpells.filter((s) => s.type === 'vengeful_spirit' || s.type === 'abyssal_shriek');
      expect(offensiveSpells.length).toBe(0);
    });

    test('Spell cast fails when Soul < 33', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      knight.state.soul = 30; // Insufficient soul

      const spell = knight.castSpell('neutral');
      expect(spell).toBeNull();
      expect(knight.state.soul).toBe(30);

      const healed = knight.focusHeal();
      expect(healed).toBe(false);
      expect(knight.state.soul).toBe(30);
    });
  });

  describe('2. Advanced Movement, Pogo Bouncing & Crystal Super Dash', () => {
    test('Airborne Pogo Bounce on enemy resets ALL air mobility (canDoubleJump, canShadowDash, canCrystalDash, dashCooldownTimer = 0)', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 150, vy: 50 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;
      knight.canShadowDash = false;
      knight.canCrystalDash = false;
      knight.state.dashCooldownTimer = 1.0;

      const enemy = new Enemy('pogo-target', 'spore_bug', 100, 180);

      // Execute downward slash in air connecting with enemy
      knight.update(dt, { down: true, attackJustPressed: true }, tilemap.tiles, [enemy]);

      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY); // -350
      expect(knight.canDoubleJump).toBe(true);
      expect(knight.canShadowDash).toBe(true);
      expect(knight.canCrystalDash).toBe(true);
      expect(knight.state.dashCooldownTimer).toBe(0);
    });

    test('Airborne Pogo Bounce on hazard spikes resets ALL air mobility', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 220, vy: 50 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;
      knight.canShadowDash = false;
      knight.canCrystalDash = false;
      knight.state.dashCooldownTimer = 0.8;

      // Spike pit at x=300
      knight.update(dt, { down: true, attackJustPressed: true }, tilemap.tiles, []);

      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
      expect(knight.canDoubleJump).toBe(true);
      expect(knight.canShadowDash).toBe(true);
      expect(knight.canCrystalDash).toBe(true);
      expect(knight.state.dashCooldownTimer).toBe(0);
    });

    test('Crystal Super Dash: 0.8s stationary charge -> rocket boost horizontal flight (vx = ±600, vy = 0)', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.isGrounded = true;

      // Initiate charge
      knight.startChargingSuperDash();
      expect(knight.isChargingSuperDash).toBe(true);
      expect(knight.state.vx).toBe(0);
      expect(knight.state.vy).toBe(0);

      // Update charge for 0.8s (48 frames)
      for (let f = 0; f < 48; f++) {
        knight.update(dt, { superDashActive: true }, tilemap.tiles, []);
      }

      // Charge completes -> launches rocket flight
      expect(knight.isChargingSuperDash).toBe(false);
      expect(knight.isCrystalDashing).toBe(true);
      expect(knight.state.vx).toBe(600);
      expect(knight.state.vy).toBe(0);
    });

    test('Crystal Super Dash cancelled by Jump, Dash, Damage, or Solid Wall Collision', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.triggerCrystalDash();
      expect(knight.isCrystalDashing).toBe(true);

      // Jump cancels dash
      knight.update(dt, { jumpJustPressed: true }, tilemap.tiles, []);
      expect(knight.isCrystalDashing).toBe(false);

      // Dash into solid wall cancels dash
      const wallKnight = new Knight({ id: 2, mask: 'vessel', x: 920, y: 200, facing: 'right' });
      wallKnight.triggerCrystalDash();
      physics.update(wallKnight, tilemap.tiles, dt);
      expect(wallKnight.isCrystalDashing).toBe(false);

      // Taking damage cancels dash
      const damageKnight = new Knight({ id: 3, mask: 'vessel', x: 100, y: 200 });
      damageKnight.triggerCrystalDash();
      damageKnight.takeDamage(1);
      expect(damageKnight.isCrystalDashing).toBe(false);
    });

    test('Moss Wall Clinging & Sliding on moss surfaces', () => {
      const mossTiles: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 300, isSolid: true, type: 'moss' },
      ];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 16, y: 100, facing: 'left', vy: 100 });
      knight.state.isGrounded = false;

      // Update physics flush against moss wall
      physics.update(knight, mossTiles, dt);

      expect(knight.state.isWallSliding).toBe(true);
      expect(knight.isWallClinging).toBe(true);
      expect(knight.state.vy).toBeLessThanOrEqual(70);
    });
  });

  describe('3. Equippable Charm & Perk System', () => {
    test('Support equippedCharms array and hasCharm / equipCharm / unequipCharm methods', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      expect(knight.getCharms()).toEqual([]);

      knight.equipCharm('quick_slash');
      expect(knight.hasCharm('quick_slash')).toBe(true);

      knight.equipCharm('longnail');
      expect(knight.getCharms()).toContain('quick_slash');
      expect(knight.getCharms()).toContain('longnail');

      knight.unequipCharm('quick_slash');
      expect(knight.hasCharm('quick_slash')).toBe(false);
      expect(knight.hasCharm('longnail')).toBe(true);
    });

    test('Quick Slash: Reduces slash attack cooldown from 0.3s to 0.18s', () => {
      const normalKnight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 });
      const quickKnight = new Knight({ id: 2, mask: 'vessel', x: 100, y: 200, equippedCharms: ['quick_slash'] });

      normalKnight.update(dt, { attackJustPressed: true }, [], []);
      quickKnight.update(dt, { attackJustPressed: true }, [], []);

      expect(normalKnight.attackCooldown).toBeCloseTo(0.3, 2);
      expect(quickKnight.attackCooldown).toBeCloseTo(0.18, 2);
    });

    test('Longnail: Expands nail AABB hitboxes and visual arcs by 1.5x', () => {
      const normalKnight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      const longnailKnight = new Knight({ id: 2, mask: 'vessel', x: 100, y: 200, facing: 'right', equippedCharms: ['longnail'] });

      const enemyNormal = new Enemy('e-norm', 'spore_bug', 160, 200);
      const enemyLong = new Enemy('e-long', 'spore_bug', 160, 200);

      normalKnight.update(dt, { attackJustPressed: true }, [], [enemyNormal]);
      longnailKnight.update(dt, { attackJustPressed: true }, [], [enemyLong]);

      expect(enemyNormal.hp).toBe(enemyNormal.maxHp); // Normal misses!
      expect(enemyLong.hp).toBe(enemyLong.maxHp - COMBAT_STATS.NAIL_DAMAGE); // Longnail hits!
    });

    test('Spore Shroom: Spawns damaging SporeCloud (radius 40, area damage) when healing or taking damage', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, hp: 3, equippedCharms: ['spore_shroom'] });
      knight.state.soul = 100;

      // 1. Focus Heal spawns Spore Cloud
      knight.focusHeal();
      expect(knight.activeSporeClouds.length).toBeGreaterThan(0);
      const cloud1 = knight.activeSporeClouds[0];
      expect(cloud1.radius).toBe(40);

      // Spore cloud deals damage to enemy within 40px
      const enemy = new Enemy('spore-bug', 'spore_bug', 120, 200);
      cloud1.update(0.35, [enemy]); // Advance past tick interval 0.3s
      expect(enemy.hp).toBe(enemy.maxHp - 4);

      // 2. Taking damage spawns Spore Cloud
      knight.takeDamage(1);
      expect(knight.activeSporeClouds.length).toBeGreaterThan(1);
    });

    test('Lifeblood Heart: Grants +2 blue Lifeblood Masks that absorb damage before white Mask HP', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, equippedCharms: ['lifeblood_heart'] });
      expect(knight.getLifebloodHP()).toBe(2);
      expect(knight.state.hp).toBe(5);

      // Hit 1: 1 damage absorbed by blue Lifeblood Mask
      knight.takeDamage(1);
      expect(knight.getLifebloodHP()).toBe(1);
      expect(knight.state.hp).toBe(5); // White HP intact!

      // Reset i-frames
      knight.isInvulnerable = false;
      knight.invulnerabilityTimer = 0;

      // Hit 2: 1 damage absorbed by blue Lifeblood Mask
      knight.takeDamage(1);
      expect(knight.getLifebloodHP()).toBe(0);
      expect(knight.state.hp).toBe(5); // White HP intact!

      // Reset i-frames
      knight.isInvulnerable = false;
      knight.invulnerabilityTimer = 0;

      // Hit 3: 1 damage reduces regular white Mask HP
      knight.takeDamage(1);
      expect(knight.getLifebloodHP()).toBe(0);
      expect(knight.state.hp).toBe(4); // White HP reduced!
    });
  });

  describe('4. Side HUD Lifeblood Masks & Charm Badges Integration', () => {
    test('SideHUDManager renders blue Lifeblood Masks and equipped Charm badges', () => {
      const hud = new SideHUDManager();
      const knightState = new Knight({ id: 1, mask: 'vessel', x: 50, y: 200, equippedCharms: ['quick_slash', 'longnail', 'lifeblood_heart'] }).state;

      expect(() => hud.render([knightState])).not.toThrow();
      hud.destroy();
    });
  });
});
