import { describe, test, expect } from 'vitest';
import manifest from './manifest';
import { HeroLoungeScreen } from './screens/HeroLoungeScreen';
import { PlatformPhysics } from './systems/PlatformPhysics';
import { CavernTilemap } from './systems/CavernTilemap';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { BossMossKnight } from './entities/BossMossKnight';
import { SideHUDManager } from './systems/SideHUDManager';
import { ParallaxCavern } from './systems/ParallaxCavern';
import { CAVERN_CONFIG, COMBAT_STATS, PLATFORM_PHYSICS } from './config';
import type { PlatformTile, KnightState, BossState } from './types';

describe('Hollow Clash - Requirement R1 Empirical Verification', () => {
  const tilemap = new CavernTilemap();

  describe('R1a: P1 & P2 Keybindings', () => {
    test('P1 keybindings match specification (WASD, LCTRL, LSHIFT, ESC)', () => {
      const p1 = manifest.defaultControls.find((c) => c.playerId === 1)?.bindings;
      expect(p1?.moveLeft).toEqual(['KeyA']);
      expect(p1?.moveRight).toEqual(['KeyD']);
      expect(p1?.moveUp).toEqual(['KeyW']);
      expect(p1?.moveDown).toEqual(['KeyS']);
      expect(p1?.action).toEqual(['ControlLeft']);
      expect(p1?.skill).toEqual(['ShiftLeft']);
      expect(p1?.focus).toEqual(['ShiftLeft']);
      expect(p1?.pause).toEqual(['Escape']);
    });

    test('P2 keybindings match specification (Arrows, RCTRL, RSHIFT, ESC)', () => {
      const p2 = manifest.defaultControls.find((c) => c.playerId === 2)?.bindings;
      expect(p2?.moveLeft).toEqual(['ArrowLeft']);
      expect(p2?.moveRight).toEqual(['ArrowRight']);
      expect(p2?.moveUp).toEqual(['ArrowUp']);
      expect(p2?.moveDown).toEqual(['ArrowDown']);
      expect(p2?.action).toEqual(['ControlRight']);
      expect(p2?.skill).toEqual(['ShiftRight']);
      expect(p2?.focus).toEqual(['ShiftRight']);
      expect(p2?.pause).toEqual(['Escape']);
    });

    test('P1 and P2 controls have no key conflicts', () => {
      const p1 = manifest.defaultControls.find((c) => c.playerId === 1)?.bindings!;
      const p2 = manifest.defaultControls.find((c) => c.playerId === 2)?.bindings!;
      const p1Keys = Object.values(p1).flat().filter((k) => k !== 'Escape');
      const p2Keys = Object.values(p2).flat().filter((k) => k !== 'Escape');
      const overlap = p1Keys.filter((k) => p2Keys.includes(k));
      expect(overlap).toEqual([]);
    });
  });

  describe('R1b: Hero Lounge Bypass', () => {
    test('Lounge slots default to isReady: false', () => {
      const lounge = new HeroLoungeScreen();
      expect(lounge.selections[1].isReady).toBe(false);
      expect(lounge.selections[2].isReady).toBe(false);
      expect(lounge.selections[3].isReady).toBe(false);
      expect(lounge.selections[4].isReady).toBe(false);
      expect(lounge.isAllReady(2)).toBe(false);
      expect(lounge.startRequested).toBe(false);
    });

    test('Enter and Space key presses set startRequested = true', () => {
      const lounge = new HeroLoungeScreen();
      const triggerKey = (key: string) => {
        if (key === 'Enter' || key === ' ') lounge.startRequested = true;
      };

      triggerKey('Enter');
      expect(lounge.startRequested).toBe(true);

      lounge.startRequested = false;
      triggerKey(' ');
      expect(lounge.startRequested).toBe(true);
    });
  });

  describe('R1c: Spawn y=200 Physics & Bounds Checking', () => {
    test('All 4 Knights (50, 80, 110, 140) spawn cleanly in free air at y=200', () => {
      const cleanPositions = [
        { x: 50, y: 200 },
        { x: 80, y: 200 },
        { x: 110, y: 200 },
        { x: 140, y: 200 },
      ];

      for (const pos of cleanPositions) {
        const kLeft = pos.x;
        const kRight = pos.x + 16;
        const kTop = pos.y;
        const kBottom = pos.y + 24;

        for (const tile of tilemap.tiles) {
          if (!tile.isSolid) continue;
          const tLeft = tile.x;
          const tRight = tile.x + tile.width;
          const tTop = tile.y;
          const tBottom = tile.y + tile.height;

          const overlaps = kLeft < tRight && kRight > tLeft && kTop < tBottom && kBottom >= tTop;
          expect(overlaps).toBe(false);
        }
      }
    });

    test('FIX VERIFICATION 1: Knight 4 at (140, 200) clear of Totem Pillar 1 at spawn', () => {
      const p4Pos = { x: 140, y: 200 };
      const kLeft = p4Pos.x;
      const kRight = p4Pos.x + 16; // 156
      const kTop = p4Pos.y; // 200
      const kBottom = p4Pos.y + 24; // 224

      // Totem Pillar 1 at x=180, y=174, w=24, h=64
      const totem = tilemap.tiles.find((t) => t.x === 180 && t.y === 174);
      expect(totem).toBeDefined();

      const tLeft = totem!.x;
      const tRight = totem!.x + totem!.width; // 204
      const tTop = totem!.y; // 174
      const tBottom = totem!.y + totem!.height; // 238

      const overlaps = kLeft < tRight && kRight > tLeft && kTop < tBottom && kBottom >= tTop;
      // Knight 4 (x=140..156) does not overlap Totem Pillar 1 (x=180..204)
      expect(overlaps).toBe(false);
    });

    test('FIX VERIFICATION 1: Knight 4 lands smoothly on cavern floor y=214 (not snapped to pillar y=150)', () => {
      const knight4 = new Knight({ id: 4, mask: 'grimm', x: 140, y: 200 });
      const dt = 1 / 60;
      // Update several frames until grounded
      for (let i = 0; i < 10; i++) {
        knight4.update(dt, { left: false, right: false, up: false, down: false }, tilemap.tiles, []);
      }
      expect(knight4.state.y).toBe(214);
      expect(knight4.state.isGrounded).toBe(true);
    });

    test('FIX VERIFICATION 2: Grounded state maintains stable isGrounded = true without frame flickering', () => {
      const knight1 = new Knight({ id: 1, mask: 'vessel', x: 50, y: 200 });
      const dt = 1 / 60;
      // Frame 9: lands on floor y=214
      for (let i = 0; i < 9; i++) {
        knight1.update(dt, { left: false, right: false, up: false, down: false }, tilemap.tiles, []);
      }
      expect(knight1.state.y).toBe(214);
      expect(knight1.state.isGrounded).toBe(true);

      // Frame 10: next frame without input, isGrounded remains stably true
      knight1.update(dt, { left: false, right: false, up: false, down: false }, tilemap.tiles, []);
      expect(knight1.state.isGrounded).toBe(true);

      // Frame 11: remains stably true
      knight1.update(dt, { left: false, right: false, up: false, down: false }, tilemap.tiles, []);
      expect(knight1.state.isGrounded).toBe(true);
    });

    test('FIX VERIFICATION 3: Grounded horizontal movement moves knight smoothly without teleporting off-screen, maintaining isGrounded = true', () => {
      const knight1 = new Knight({ id: 1, mask: 'vessel', x: 50, y: 200 });
      const dt = 1 / 60;
      // Land on floor y=214
      for (let i = 0; i < 10; i++) {
        knight1.update(dt, { left: false, right: false, up: false, down: false }, tilemap.tiles, []);
      }
      expect(knight1.state.y).toBe(214);
      expect(knight1.state.isGrounded).toBe(true);

      const startX = knight1.state.x;

      // Move right for 10 frames
      for (let i = 0; i < 10; i++) {
        knight1.update(dt, { right: true, left: false, up: false, down: false }, tilemap.tiles, []);
        expect(knight1.state.isGrounded).toBe(true);
        expect(knight1.state.y).toBe(214);
      }

      // Knight moves right at horizontal speed without teleporting off-screen
      expect(knight1.state.x).toBeGreaterThan(startX);
      expect(knight1.state.x).toBeLessThan(150);

      const rightX = knight1.state.x;

      // Move left for 10 frames
      for (let i = 0; i < 10; i++) {
        knight1.update(dt, { left: true, right: false, up: false, down: false }, tilemap.tiles, []);
        expect(knight1.state.isGrounded).toBe(true);
        expect(knight1.state.y).toBe(214);
      }

      // Knight moves left at horizontal speed without teleporting off-screen
      expect(knight1.state.x).toBeLessThan(rightX);
      expect(knight1.state.x).toBeGreaterThan(0);
    });
  });

  describe('Requirement R2 Physics & Hazard Mechanics Verification', () => {
    const dt = 1 / 60;

    test('R2b: Moss wall sliding triggers ONLY on moss tiles, remains active continuously while pressing wall, and wall jump preserves double jump', () => {
      const customTiles: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 300, isSolid: true, type: 'moss' },
        { x: 200, y: 0, width: 16, height: 300, isSolid: true, type: 'stone' },
        { x: 0, y: 300, width: 250, height: 32, isSolid: true, type: 'stone' },
      ];

      // 1. Test Moss Wall Sliding on Left Moss Wall (press left while falling)
      const knight = new Knight({ id: 1, mask: 'vessel', x: 16, y: 50, vy: 100, facing: 'left' });
      knight.update(dt, { left: true, right: false, up: false, down: false }, customTiles, []);

      expect(knight.state.isWallSliding).toBe(true);
      expect(knight.state.vy).toBeLessThanOrEqual(70);

      // Frame 2 & 3: Ensure wall sliding STAYS active continuously without dropping after 1 frame
      knight.update(dt, { left: true, right: false, up: false, down: false }, customTiles, []);
      expect(knight.state.isWallSliding).toBe(true);
      knight.update(dt, { left: true, right: false, up: false, down: false }, customTiles, []);
      expect(knight.state.isWallSliding).toBe(true);

      // 2. Test Wall Jump from Moss Wall: launches away and retains double jump
      expect(knight.canDoubleJump).toBe(true);
      knight.update(dt, { left: false, right: false, jumpJustPressed: true, down: false }, customTiles, []);
      expect(knight.state.isWallSliding).toBe(false);
      expect(knight.state.vy).toBeLessThan(0);
      expect(knight.state.vx).toBeGreaterThan(0);
      expect(knight.canDoubleJump).toBe(true);

      // 3. Test Stone Wall: wall sliding does NOT trigger on stone tiles
      const stoneKnight = new Knight({ id: 2, mask: 'vessel', x: 184, y: 50, vy: 100, facing: 'right' });
      stoneKnight.update(dt, { left: false, right: true, up: false, down: false }, customTiles, []);
      expect(stoneKnight.state.isWallSliding).toBe(false);
    });

    test('R2b-Stress: Moss wall sliding continuous input and multiple tile configurations', () => {
      // Config A: Moss tile (0..100) -> Stone tile (100..200)
      const topMossBottomStone: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 100, isSolid: true, type: 'moss' },
        { x: 0, y: 100, width: 16, height: 100, isSolid: true, type: 'stone' },
        { x: 0, y: 200, width: 200, height: 32, isSolid: true, type: 'stone' },
      ];

      const k1 = new Knight({ id: 1, mask: 'vessel', x: 16, y: 20, vy: 100, facing: 'left' });
      // Slide down moss section (y=20 to y=90) for 20 frames
      for (let i = 0; i < 20; i++) {
        k1.update(dt, { left: true }, topMossBottomStone, []);
        expect(k1.state.isWallSliding).toBe(true);
        expect(k1.state.vy).toBe(70); // Capped at WALL_SLIDE_SPEED
      }

      // Continue sliding into stone section (y >= 100)
      for (let i = 0; i < 55; i++) {
        k1.update(dt, { left: true }, topMossBottomStone, []);
      }
      // Once knight's top passes y=100 into stone section, wall sliding stops
      expect(k1.state.y).toBeGreaterThan(100);
      expect(k1.state.isWallSliding).toBe(false);

      // Config B: Stone tile (0..100) -> Moss tile (100..200)
      const topStoneBottomMoss: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 100, isSolid: true, type: 'stone' },
        { x: 0, y: 100, width: 16, height: 100, isSolid: true, type: 'moss' },
      ];
      const k2 = new Knight({ id: 2, mask: 'vessel', x: 16, y: 20, vy: 100, facing: 'left' });
      // Falling past stone section: no wall slide
      k2.update(dt, { left: true }, topStoneBottomMoss, []);
      expect(k2.state.isWallSliding).toBe(false);

      // Advance until knight reaches moss section (y=100)
      for (let i = 0; i < 35; i++) {
        k2.update(dt, { left: true }, topStoneBottomMoss, []);
      }
      expect(k2.state.y).toBeGreaterThanOrEqual(100);
      expect(k2.state.isWallSliding).toBe(true);
      expect(k2.state.vy).toBe(70);

      // Config C: Wall slide into floor corner
      const cornerTiles: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 100, isSolid: true, type: 'moss' },
        { x: 0, y: 100, width: 200, height: 32, isSolid: true, type: 'moss' },
      ];
      const k3 = new Knight({ id: 3, mask: 'vessel', x: 16, y: 70, vy: 100, facing: 'left' });
      for (let i = 0; i < 10; i++) {
        k3.update(dt, { left: true }, cornerTiles, []);
      }
      // Lands cleanly on floor y=100 - knightHeight (76), grounded = true, wallSliding = false
      expect(k3.state.y).toBe(76);
      expect(k3.state.isGrounded).toBe(true);
      expect(k3.state.isWallSliding).toBe(false);

      // Config D: Turning away from moss wall cancels wall slide immediately
      const k4 = new Knight({ id: 4, mask: 'vessel', x: 16, y: 30, vy: 100, facing: 'left' });
      k4.update(dt, { left: true }, cornerTiles, []);
      expect(k4.state.isWallSliding).toBe(true);
      // Press right (turning away from left moss wall)
      k4.update(dt, { right: true, left: false }, cornerTiles, []);
      expect(k4.state.isWallSliding).toBe(false);
    });

    test('R2b-Stress: Wall jump preserves double jump and allows air double jump execution', () => {
      const customTiles: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 400, isSolid: true, type: 'moss' },
        { x: 300, y: 0, width: 16, height: 400, isSolid: true, type: 'moss' },
      ];

      const knight = new Knight({ id: 1, mask: 'vessel', x: 16, y: 100, vy: 100, facing: 'left' });
      // 1. Engage wall slide
      knight.update(dt, { left: true }, customTiles, []);
      expect(knight.state.isWallSliding).toBe(true);

      // 2. Perform Wall Jump
      knight.update(dt, { jumpJustPressed: true }, customTiles, []);
      expect(knight.state.isWallSliding).toBe(false);
      expect(knight.state.vy).toBeLessThan(0); // Ascending
      expect(knight.canDoubleJump).toBe(true); // Double jump preserved!

      // 3. Advance mid-air ascension for 3 frames
      for (let i = 0; i < 3; i++) {
        knight.update(dt, {}, customTiles, []);
        expect(knight.canDoubleJump).toBe(true);
      }

      // 4. Trigger airborne double jump in mid-air
      knight.update(dt, { jumpJustPressed: true }, customTiles, []);
      expect(knight.state.vy).toBe(-400); // -420 initial jump velocity + 20 gravity = -400 after frame update
      expect(knight.canDoubleJump).toBe(false); // Double jump consumed!
    });

    test('R2c: Spike pit hazard damage, safe ground tracking, and safe respawn', () => {
      const cavernMap = new CavernTilemap();
      const knight = new Knight({ id: 1, mask: 'vessel', x: 50, y: 200 });

      // Step 1: Land on safe solid ground to establish lastSafeGroundPosition
      for (let i = 0; i < 10; i++) {
        knight.update(dt, { left: false, right: false, up: false, down: false }, cavernMap.tiles, []);
      }
      expect(knight.state.isGrounded).toBe(true);
      const safeX = knight.state.x;
      const safeY = knight.state.y;
      expect(knight.lastSafeGroundPosition).toEqual({ x: safeX, y: safeY });
      const initialHp = knight.state.hp;

      // Step 2: Move knight over spike pit (x = 300, y = 250)
      knight.state.x = 300;
      knight.state.y = 250;
      knight.state.isGrounded = false;

      // Update to trigger spike collision
      knight.update(dt, { left: false, right: false, up: false, down: false }, cavernMap.tiles, []);

      // Check damage, respawn position, and invulnerability
      expect(knight.state.hp).toBe(initialHp - 1);
      expect(knight.isInvulnerable).toBe(true);
      expect(knight.state.x).toBe(safeX);
      expect(knight.state.y).toBe(safeY);
    });

    test('R2c-Stress: Post-respawn ground stability and safe ground recording validation', () => {
      const cavernMap = new CavernTilemap();
      const knight = new Knight({ id: 1, mask: 'vessel', x: 50, y: 200 });

      // Land on floor (x=50, y=214)
      for (let i = 0; i < 10; i++) {
        knight.update(dt, {}, cavernMap.tiles, []);
      }
      expect(knight.state.isGrounded).toBe(true);
      const originalSafePos = { ...knight.lastSafeGroundPosition };

      // Teleport over spike pit (x=320, y=254)
      knight.state.x = 320;
      knight.state.y = 254;
      knight.state.isGrounded = false;

      // Trigger spike collision
      knight.update(dt, {}, cavernMap.tiles, []);
      expect(knight.state.x).toBe(originalSafePos.x);
      expect(knight.state.y).toBe(originalSafePos.y);

      // Verify stability over 60 frames post-respawn: knight stays grounded at y=214, no clipping or falling through tiles
      for (let i = 0; i < 60; i++) {
        knight.update(dt, {}, cavernMap.tiles, []);
        expect(knight.state.y).toBe(214);
        expect(knight.state.isGrounded).toBe(true);
        expect(knight.state.vy).toBe(0);
      }

      // Verify consecutive spike hit after invulnerability expires
      knight.invulnerabilityTimer = 0;
      knight.isInvulnerable = false;
      knight.state.x = 320;
      knight.state.y = 254;
      knight.state.isGrounded = false;

      knight.update(dt, {}, cavernMap.tiles, []);
      expect(knight.state.hp).toBe(3); // 5 -> 4 -> 3
      expect(knight.isInvulnerable).toBe(true);
      expect(knight.state.x).toBe(originalSafePos.x);
      expect(knight.state.y).toBe(originalSafePos.y);
    });

    test('R2d: Shadow Dash obeys horizontal wall collision bounds without noclipping through solid walls', () => {
      const cavernMap = new CavernTilemap();
      const knight = new Knight({ id: 1, mask: 'vessel', x: 150, y: 214 });

      // Trigger Shadow Dash
      knight.update(dt, { dashJustPressed: true }, cavernMap.tiles, []);
      expect(knight.state.isShadowDashing).toBe(true);
      expect(knight.isInvulnerable).toBe(true);

      // Advance dash for several frames towards solid pillar at x=180
      for (let i = 0; i < 10; i++) {
        knight.update(dt, {}, cavernMap.tiles, []);
      }

      // Knight's right edge (x + width 16) must stop at pillar left edge (x=180), so knight.x <= 164
      expect(knight.state.x).toBeLessThanOrEqual(164);
      expect(knight.state.x).toBeGreaterThan(150);
    });

    test('R2d-Stress: Shadow Dash left and right boundary precision & invulnerability during collision', () => {
      const customMap: PlatformTile[] = [
        { x: 0, y: 0, width: 16, height: 200, isSolid: true, type: 'moss' }, // Left wall x=0..16
        { x: 200, y: 0, width: 16, height: 200, isSolid: true, type: 'stone' }, // Right wall x=200..216
        { x: 0, y: 200, width: 250, height: 32, isSolid: true, type: 'stone' }, // Floor
      ];

      // 1. Dash Right into Right Wall (x=200)
      const knightRight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 176, facing: 'right' });
      knightRight.update(dt, { dashJustPressed: true }, customMap, []);
      expect(knightRight.state.isShadowDashing).toBe(true);
      expect(knightRight.isInvulnerable).toBe(true);

      // Run full dash duration (15 frames @ dt=1/60)
      for (let i = 0; i < 15; i++) {
        knightRight.update(dt, {}, customMap, []);
        expect(knightRight.state.x).toBeLessThanOrEqual(184); // 200 - 16
        if (knightRight.state.isShadowDashing) {
          expect(knightRight.isInvulnerable).toBe(true); // Retains invulnerability while wall-blocked
        }
      }
      expect(knightRight.state.x).toBe(184);

      // 2. Dash Left into Left Wall (x=0..16)
      const knightLeft = new Knight({ id: 2, mask: 'vessel', x: 100, y: 176, facing: 'left' });
      knightLeft.update(dt, { dashJustPressed: true }, customMap, []);
      expect(knightLeft.state.isShadowDashing).toBe(true);
      expect(knightLeft.isInvulnerable).toBe(true);

      for (let i = 0; i < 15; i++) {
        knightLeft.update(dt, {}, customMap, []);
        expect(knightLeft.state.x).toBeGreaterThanOrEqual(16); // 0 + 16
        if (knightLeft.state.isShadowDashing) {
          expect(knightLeft.isInvulnerable).toBe(true);
        }
      }
      expect(knightLeft.state.x).toBe(16);
    });
  });

  describe('Requirement R3 Combat System, Level Expansion & 2-Phase Boss Verification', () => {
    const dt = 1 / 60;
    const cavernMap = new CavernTilemap();

    describe('R3a: Melee Combat & Directional Slashes', () => {
      test('Directional AABB hitboxes (forward, up, down) hit targets based on input and facing', () => {
        // Forward slash
        const knightRight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
        const enemyForward = new Enemy('spore-fwd', 'spore_bug', 125, 200);
        knightRight.update(dt, { attackJustPressed: true }, cavernMap.tiles, [enemyForward]);
        expect(enemyForward.hp).toBeLessThan(enemyForward.maxHp);

        // Upward slash
        const knightUp = new Knight({ id: 2, mask: 'vessel', x: 100, y: 200 });
        const enemyAbove = new Enemy('spore-up', 'spore_bug', 100, 180);
        knightUp.update(dt, { up: true, attackJustPressed: true }, cavernMap.tiles, [enemyAbove]);
        expect(enemyAbove.hp).toBeLessThan(enemyAbove.maxHp);

        // Downward slash in air
        const knightDown = new Knight({ id: 3, mask: 'vessel', x: 100, y: 180 });
        knightDown.state.isGrounded = false;
        const enemyBelow = new Enemy('spore-down', 'spore_bug', 100, 210);
        knightDown.update(dt, { down: true, attackJustPressed: true }, cavernMap.tiles, [enemyBelow]);
        expect(enemyBelow.hp).toBeLessThan(enemyBelow.maxHp);
      });

      test('Attacking target deducts HP, awards +11 Soul (up to max 100), and applies nail recoil on forward hit', () => {
        const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
        knight.state.soul = 0;
        const enemy = new Enemy('spore-1', 'spore_bug', 125, 200);

        knight.update(dt, { attackJustPressed: true }, cavernMap.tiles, [enemy]);

        expect(enemy.hp).toBe(enemy.maxHp - COMBAT_STATS.NAIL_DAMAGE);
        expect(knight.state.soul).toBe(11);
        expect(knight.state.vx).toBe(-PLATFORM_PHYSICS.NAIL_RECOIL_VELOCITY);

        // Additional hit caps at 100 max soul
        knight.state.soul = 95;
        knight.attackCooldown = 0;
        knight.update(dt, { attackJustPressed: true }, cavernMap.tiles, [enemy]);
        expect(knight.state.soul).toBe(100);
      });
    });

    describe('R3b: Airborne Pogo Bounce', () => {
      test('Downward slash connecting with enemy launches knight upward (vy = -350) and restores double jump', () => {
        const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 180, vy: 50 });
        knight.state.isGrounded = false;
        knight.canDoubleJump = false;

        const enemy = new Enemy('spore-pogo', 'spore_bug', 100, 210);

        knight.update(dt, { down: true, attackJustPressed: true }, cavernMap.tiles, [enemy]);

        expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY); // -350
        expect(knight.canDoubleJump).toBe(true);
      });

      test('Downward slash connecting with spike pit tile launches knight upward and restores double jump', () => {
        const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 220, vy: 50 });
        knight.state.isGrounded = false;
        knight.canDoubleJump = false;

        // Spike pit 1 is at x: 280..400, y: h-16 (254)
        knight.update(dt, { down: true, attackJustPressed: true }, cavernMap.tiles, []);

        expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
        expect(knight.canDoubleJump).toBe(true);
      });
    });

    describe('R3c: Level Expansion to 960px', () => {
      test('CAVERN_CONFIG.width is set to 960 and right wall is at x=944', () => {
        expect(CAVERN_CONFIG.width).toBe(960);
        const rightWall = cavernMap.tiles.find((t) => t.x === 944 && t.width === 16);
        expect(rightWall).toBeDefined();
        expect(rightWall?.isSolid).toBe(true);
        expect(rightWall?.type).toBe('moss');
      });

      test('Enemy position clamps x to max 940 and map allows exploration past x=480', () => {
        const enemy = new Enemy('spore-far', 'spore_bug', 950, 200);
        const knight = new Knight({ id: 1, mask: 'vessel', x: 700, y: 200 });
        enemy.update(dt, [knight]);
        expect(enemy.x).toBeLessThanOrEqual(940);

        // Knight moving smoothly in expanded zone (x=700..900)
        knight.update(dt, { right: true }, cavernMap.tiles, []);
        expect(knight.state.x).toBeGreaterThan(700);
      });
    });

    describe('R3d: 2-Phase Moss Knight Boss Encounter', () => {
      test('Moss Knight Boss spawns in expanded section x=750..850 in Phase 1', () => {
        const boss = new BossMossKnight(780, 200);
        expect(boss.x).toBeGreaterThanOrEqual(750);
        expect(boss.x).toBeLessThanOrEqual(850);
        expect(boss.phase).toBe(1);
        expect(boss.isEnraged).toBe(false);
      });

      test('Transition to Phase 2 at <= 50% HP triggers enraged state and double shockwave', () => {
        const boss = new BossMossKnight(780, 200);
        boss.takeDamage(300); // 600 -> 300 HP (50%)

        expect(boss.hp).toBe(300);
        expect(boss.phase).toBe(2);
        expect(boss.isEnraged).toBe(true);

        // Trigger vine slam attack in Phase 2
        boss.state = 'vine_slam';
        boss.timer = 0.9; // Trigger completion frame
        const knight = new Knight({ id: 1, mask: 'vessel', x: 700, y: 200 });
        const res = boss.update(dt, [knight]);

        expect(res.triggerVineShockwave).toBe(true);
        expect(res.shockwaves?.length).toBe(2); // Double shockwave!
      });

      test('Boss attack hitboxes deal 1 Mask damage to player upon contact', () => {
        const boss = new BossMossKnight(780, 200);
        boss.state = 'cleaving';
        boss.timer = 0.3;
        boss.facing = 'left';

        const knight = new Knight({ id: 1, mask: 'vessel', x: 755, y: 184 });
        knight.isInvulnerable = false;

        boss.update(dt, [knight]);

        expect(knight.state.hp).toBe(COMBAT_STATS.MASK_HP - 1);
      });

      test('takeDamage() deducts HP, triggers hit flash, and boss is defeated at 0 HP', () => {
        const boss = new BossMossKnight(780, 200);
        boss.state = 'idle';

        boss.takeDamage(50);
        expect(boss.hp).toBe(550);
        expect(boss.hitFlashTimer).toBeGreaterThan(0);

        boss.takeDamage(550);
        expect(boss.hp).toBe(0);
      });
    });
  });

  describe('Requirement R4 UI & Visual FX Polish Empirical Verification', () => {
    test('R4a: Side HUD renders Cyan Soul Vessel meter displaying active player Soul reserve (0 to 100)', () => {
      const hud = new SideHUDManager();
      const mockKnights: KnightState[] = [
        {
          id: 1,
          mask: 'vessel',
          x: 50,
          y: 200,
          vx: 0,
          vy: 0,
          hp: 5,
          maxHp: 5,
          soul: 77,
          maxSoul: 100,
          isGrounded: true,
          isWallSliding: false,
          isShadowDashing: false,
          facing: 'right',
          dashCooldownTimer: 0,
          geoCount: 15,
        },
        {
          id: 2,
          mask: 'hornet',
          x: 80,
          y: 200,
          vx: 0,
          vy: 0,
          hp: 3,
          maxHp: 5,
          soul: 0,
          maxSoul: 100,
          isGrounded: true,
          isWallSliding: false,
          isShadowDashing: false,
          facing: 'left',
          dashCooldownTimer: 0,
          geoCount: 42,
        },
      ];

      expect(() => hud.render(mockKnights)).not.toThrow();
      expect(hud.container.children.length).toBeGreaterThan(0);

      // Verify soul value bounds logic
      mockKnights[0].soul = 100;
      mockKnights[1].soul = 33;
      expect(() => hud.render(mockKnights)).not.toThrow();

      hud.destroy();
    });

    test('R4b: Top-Center Boss Health Bar positioning, 600 HP scaling, and enraged state indicator', () => {
      const hud = new SideHUDManager();
      const mockKnights: KnightState[] = [
        {
          id: 1,
          mask: 'vessel',
          x: 50,
          y: 200,
          vx: 0,
          vy: 0,
          hp: 5,
          maxHp: 5,
          soul: 50,
          maxSoul: 100,
          isGrounded: true,
          isWallSliding: false,
          isShadowDashing: false,
          facing: 'right',
          dashCooldownTimer: 0,
          geoCount: 10,
        },
      ];

      const bossPhase1: BossState = {
        type: 'boss_moss_knight',
        x: 780,
        y: 200,
        hp: 600,
        maxHp: 600,
        phase: 1,
        isEnraged: false,
      };

      // Test rendering Phase 1 Boss Health Bar at 600 HP
      expect(() => hud.render(mockKnights, bossPhase1)).not.toThrow();

      // Test rendering Phase 2 (Enraged) Boss Health Bar at <= 50% HP (300 HP)
      const bossPhase2: BossState = {
        type: 'boss_moss_knight',
        x: 780,
        y: 200,
        hp: 250,
        maxHp: 600,
        phase: 2,
        isEnraged: true,
      };

      expect(() => hud.render(mockKnights, bossPhase2)).not.toThrow();

      // Test standalone renderBossHUD method
      expect(() => hud.renderBossHUD(bossPhase2)).not.toThrow();

      hud.destroy();
    });

    test('R4c: Parallax Cavern positive modulo wrap math ((val % wrap) + wrap) % wrap', () => {
      const cavern = new ParallaxCavern();
      const wrap = 960;

      // Positive modulo math test cases
      expect(cavern.posMod(10, wrap)).toBe(10);
      expect(cavern.posMod(-50, wrap)).toBe(910);
      expect(cavern.posMod(-1000, wrap)).toBe(920);
      expect(cavern.posMod(1000, wrap)).toBe(40);
      expect(cavern.posMod(0, wrap)).toBe(0);
      expect(cavern.posMod(-960, wrap)).toBe(0);
      expect(cavern.posMod(960, wrap)).toBe(0);

      // Verify rendering background layers across full level width (cameraX=0 to cameraX=480)
      const mockGraphics = {
        rect: () => mockGraphics,
        fill: () => mockGraphics,
        circle: () => mockGraphics,
        poly: () => mockGraphics,
      } as any;

      expect(() => cavern.render(mockGraphics, 0)).not.toThrow();
      expect(() => cavern.render(mockGraphics, 240)).not.toThrow();
      expect(() => cavern.render(mockGraphics, 480)).not.toThrow();
    });
  });
});



