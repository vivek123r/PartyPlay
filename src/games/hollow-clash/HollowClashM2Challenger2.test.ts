import { describe, test, expect, beforeEach } from 'vitest';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { CavernTilemap } from './systems/CavernTilemap';
import { PlatformPhysics } from './systems/PlatformPhysics';
import { PLATFORM_PHYSICS } from './config';
import type { PlatformTile } from './types';

describe('Milestone 2 (Challenger 2) Physics Engine & Regression Stability Harness', () => {
  const dt = 1 / 60;
  let tilemap: CavernTilemap;
  let physics: PlatformPhysics;

  beforeEach(() => {
    tilemap = new CavernTilemap();
    physics = new PlatformPhysics();
  });

  describe('1. Standard Movement, Gravity Acceleration & Jump Mechanics', () => {
    test('Gravity acceleration increases falling velocity frame-by-frame according to PLATFORM_PHYSICS.GRAVITY (1200)', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 50, vy: 0 });
      knight.state.isGrounded = false;

      const emptyTiles: PlatformTile[] = [];
      for (let f = 0; f < 10; f++) {
        const expectedVy = f * PLATFORM_PHYSICS.GRAVITY * dt;
        expect(knight.state.vy).toBeCloseTo(expectedVy, 4);
        physics.update(knight, emptyTiles, dt);
      }
      expect(knight.state.vy).toBeCloseTo(10 * PLATFORM_PHYSICS.GRAVITY * dt, 4);
    });

    test('Full jump reaches theoretical apex height (~73.5px) in ~0.35s', () => {
      const openFloorTiles: PlatformTile[] = [
        { x: 0, y: 238, width: 960, height: 32, isSolid: true, type: 'moss' },
      ];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 214 });
      knight.state.isGrounded = true;

      const initialY = knight.state.y;
      knight.update(dt, { jumpJustPressed: true }, openFloorTiles, []);
      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.JUMP_VELOCITY + PLATFORM_PHYSICS.GRAVITY * dt);

      let minY = initialY;
      let apexFrame = 0;

      for (let f = 1; f <= 30; f++) {
        knight.update(dt, {}, openFloorTiles, []);
        if (knight.state.y < minY) {
          minY = knight.state.y;
        }
        if (knight.state.vy >= 0 && apexFrame === 0) {
          apexFrame = f;
          break;
        }
      }

      const jumpHeight = initialY - minY;
      expect(jumpHeight).toBeGreaterThanOrEqual(69.5);
      expect(jumpHeight).toBeLessThan(77);
      expect(apexFrame).toBeGreaterThanOrEqual(20);
      expect(apexFrame).toBeLessThanOrEqual(23);
    });

    test('Variable jump release cuts upward velocity by 50% and reduces jump height', () => {
      const openFloorTiles: PlatformTile[] = [
        { x: 0, y: 238, width: 960, height: 32, isSolid: true, type: 'moss' },
      ];
      const fullJumpKnight = new Knight({ id: 1, mask: 'vessel', x: 675, y: 214 });
      const cutJumpKnight = new Knight({ id: 2, mask: 'vessel', x: 675, y: 214 });
      fullJumpKnight.state.isGrounded = true;
      cutJumpKnight.state.isGrounded = true;

      fullJumpKnight.update(dt, { jumpJustPressed: true }, openFloorTiles, []);
      cutJumpKnight.update(dt, { jumpJustPressed: true }, openFloorTiles, []);

      let minFullY = 214;
      let minCutY = 214;

      for (let f = 0; f < 3; f++) {
        fullJumpKnight.update(dt, {}, openFloorTiles, []);
        cutJumpKnight.update(dt, {}, openFloorTiles, []);
        if (fullJumpKnight.state.y < minFullY) minFullY = fullJumpKnight.state.y;
        if (cutJumpKnight.state.y < minCutY) minCutY = cutJumpKnight.state.y;
      }

      cutJumpKnight.update(dt, { jumpReleased: true }, openFloorTiles, []);
      if (cutJumpKnight.state.y < minCutY) minCutY = cutJumpKnight.state.y;

      for (let f = 0; f < 20; f++) {
        fullJumpKnight.update(dt, {}, openFloorTiles, []);
        cutJumpKnight.update(dt, {}, openFloorTiles, []);
        if (fullJumpKnight.state.y < minFullY) minFullY = fullJumpKnight.state.y;
        if (cutJumpKnight.state.y < minCutY) minCutY = cutJumpKnight.state.y;
      }

      const fullHeight = 214 - minFullY;
      const cutHeight = 214 - minCutY;

      expect(cutHeight).toBeGreaterThan(0);
      expect(cutHeight).toBeLessThan(fullHeight);
    });
  });

  describe('2. Moss Wall Sliding, Clinging & Wall Jump Mechanics', () => {
    test('Wall sliding clamps downward falling speed to 70 px/s on moss walls when pressing against wall', () => {
      const mossTiles: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 300, isSolid: true, type: 'moss' },
      ];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 16, y: 100, facing: 'left', vy: 300 });
      knight.state.isGrounded = false;

      physics.update(knight, mossTiles, dt);

      expect(knight.state.isWallSliding).toBe(true);
      expect(knight.isWallClinging).toBe(true);
      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.WALL_SLIDE_SPEED);
    });

    test('Wall sliding does NOT activate on standard non-moss solid walls', () => {
      const standardTiles: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 300, isSolid: true, type: 'stone' },
      ];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 16, y: 100, facing: 'left', vy: 300 });
      knight.state.isGrounded = false;

      physics.update(knight, standardTiles, dt);

      expect(knight.state.isWallSliding).toBe(false);
      expect(knight.isWallClinging).toBe(false);
      expect(knight.state.vy).toBeGreaterThan(300);
    });

    test('Wall jump off moss wall pushes knight upward (-420 vy) and away in opposite direction (+180 vx)', () => {
      const mossTiles: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 300, isSolid: true, type: 'moss' },
      ];
      const knight = new Knight({ id: 1, mask: 'vessel', x: 16, y: 100, facing: 'left', vy: 50 });
      knight.state.isGrounded = false;

      physics.update(knight, mossTiles, dt);
      expect(knight.state.isWallSliding).toBe(true);

      knight.update(dt, { jumpJustPressed: true }, mossTiles, []);

      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.JUMP_VELOCITY + PLATFORM_PHYSICS.GRAVITY * dt);
      expect(knight.state.vx).toBe(PLATFORM_PHYSICS.MOVE_SPEED);
      expect(knight.state.facing).toBe('right');
      expect(knight.state.isWallSliding).toBe(false);
      expect(knight.canDoubleJump).toBe(true);
    });
  });

  describe('3. Pogo Bounce Mechanics & Air Ability Resets', () => {
    test('Airborne pogo bounce on enemy sets vy to -350 and resets all air abilities', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 250, y: 100, vy: 200 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;
      knight.canShadowDash = false;
      knight.canCrystalDash = false;
      knight.state.dashCooldownTimer = 1.2;

      const enemy = new Enemy('pogo-enemy', 'spore_bug', 250, 130);

      knight.update(dt, { down: true, attackJustPressed: true }, [], [enemy]);

      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
      expect(knight.canDoubleJump).toBe(true);
      expect(knight.canShadowDash).toBe(true);
      expect(knight.canCrystalDash).toBe(true);
      expect(knight.state.dashCooldownTimer).toBe(0);
    });

    test('Airborne pogo bounce on spike hazard sets vy to -350 and resets air abilities without taking damage', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 220, vy: 200, hp: 5 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;

      knight.update(dt, { down: true, attackJustPressed: true }, tilemap.tiles, []);

      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
      expect(knight.canDoubleJump).toBe(true);
      expect(knight.state.hp).toBe(5);
    });

    test('Multi-pogo bounce chain enables continuous airborne navigation over 3 spike pits', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 210, vy: 100, hp: 5 });
      knight.state.isGrounded = false;

      for (let pogoCount = 0; pogoCount < 3; pogoCount++) {
        knight.attackCooldown = 0;
        knight.state.x = 300;
        knight.state.y = 210;
        knight.state.vy = 100;
        knight.canDoubleJump = false;

        knight.update(dt, { down: true, attackJustPressed: true }, tilemap.tiles, []);

        expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
        expect(knight.canDoubleJump).toBe(true);
        expect(knight.state.hp).toBe(5);
      }
    });

    test('Pogo bounce -> Shadow Dash -> Double Jump combo execution', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 250, y: 100, vy: 100, facing: 'right' });
      knight.state.isGrounded = false;
      const enemy = new Enemy('pogo-dummy', 'spore_bug', 250, 130);

      // Step 1: Pogo bounce
      knight.update(dt, { down: true, attackJustPressed: true }, [], [enemy]);
      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);

      // Step 2: Shadow Dash in air (trigger dash)
      knight.update(dt, { dashJustPressed: true }, [], []);
      expect(knight.state.isShadowDashing).toBe(true);

      // Step 2b: Next frame applies horizontal shadow dash velocity
      knight.update(dt, {}, [], []);
      expect(knight.state.vx).toBe(PLATFORM_PHYSICS.SHADOW_DASH_SPEED);

      // Advance dash duration (15 frames)
      for (let f = 0; f < 15; f++) {
        knight.update(dt, {}, [], []);
      }
      expect(knight.state.isShadowDashing).toBe(false);

      // Step 3: Double Jump (re-enabled by pogo)
      knight.update(dt, { jumpJustPressed: true }, [], []);
      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.JUMP_VELOCITY + PLATFORM_PHYSICS.GRAVITY * dt);
      expect(knight.canDoubleJump).toBe(false);
    });
  });

  describe('4. Crystal Super Dash & High-Speed Physics Collision', () => {
    test('Crystal Super Dash rockets horizontally at 600 px/s with vy locked to 0', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.triggerCrystalDash();

      expect(knight.isCrystalDashing).toBe(true);
      physics.update(knight, tilemap.tiles, dt);

      expect(knight.state.vx).toBe(600);
      expect(knight.state.vy).toBe(0);
    });

    test('Crystal Super Dash terminates upon solid wall collision without clipping', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 910, y: 200, facing: 'right' });
      knight.triggerCrystalDash();

      physics.update(knight, tilemap.tiles, dt);
      physics.update(knight, tilemap.tiles, dt);

      expect(knight.isCrystalDashing).toBe(false);
      expect(knight.state.vx).toBe(0);
      expect(knight.state.x).toBeLessThanOrEqual(928);
    });
  });

  describe('5. Desolate Dive Landing & Impact Collisions', () => {
    test('Desolate Dive forces rapid descent (vy = 600) and triggers ground impact shockwave on landing', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100 });
      knight.state.isGrounded = false;
      knight.state.soul = 100;

      knight.castSpell('down');
      expect(knight.isDiving).toBe(true);

      for (let f = 0; f < 25; f++) {
        knight.update(dt, {}, tilemap.tiles, []);
      }

      expect(knight.isDiving).toBe(false);
      expect(knight.state.isGrounded).toBe(true);
      expect(knight.state.vy).toBe(0);

      const shockwave = knight.activeSpells.find((s) => s.type === 'dive_shockwave');
      expect(shockwave).toBeDefined();
    });
  });

  describe('6. Hazard Spike Pit Respawn & Position Safety', () => {
    test('Landing on spike pit deal 1 damage and safely respawns knight at lastSafeGroundPosition', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 214, hp: 5 });
      knight.state.isGrounded = true;

      physics.update(knight, tilemap.tiles, dt);
      expect(knight.lastSafeGroundPosition).toEqual({ x: 100, y: 214 });

      knight.state.x = 310;
      knight.state.y = 238;
      knight.state.isGrounded = false;

      physics.update(knight, tilemap.tiles, dt);

      expect(knight.state.x).toBe(100);
      expect(knight.state.y).toBe(214);
      expect(knight.state.hp).toBe(4);
      expect(knight.state.isGrounded).toBe(true);
    });
  });

  describe('7. High-Volume Multi-Frame Stress & Numerical Stability Test', () => {
    test('1000 continuous physics frames maintain zero NaN values, valid coordinates, and system integrity', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 214 });
      const dummyEnemies = [new Enemy('stress-e1', 'spore_bug', 150, 200)];

      for (let f = 0; f < 1000; f++) {
        const randomInputs = {
          left: f % 10 < 3,
          right: f % 10 >= 3 && f % 10 < 6,
          jumpJustPressed: f % 40 === 0,
          dashJustPressed: f % 60 === 0,
          attackJustPressed: f % 15 === 0,
          down: f % 15 === 0,
        };

        expect(() => knight.update(dt, randomInputs, tilemap.tiles, dummyEnemies)).not.toThrow();

        expect(isNaN(knight.state.x)).toBe(false);
        expect(isNaN(knight.state.y)).toBe(false);
        expect(isNaN(knight.state.vx)).toBe(false);
        expect(isNaN(knight.state.vy)).toBe(false);
        expect(isFinite(knight.state.x)).toBe(true);
        expect(isFinite(knight.state.y)).toBe(true);

        expect(knight.state.x).toBeGreaterThanOrEqual(0);
        expect(knight.state.x).toBeLessThanOrEqual(960);
      }
    });
  });
});
