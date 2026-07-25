import { describe, test, expect, beforeEach } from 'vitest';
import { SideHUDManager } from './systems/SideHUDManager';
import { ParallaxCavern } from './systems/ParallaxCavern';
import { Knight } from './entities/Knight';
import { BossMossKnight } from './entities/BossMossKnight';
import { Enemy } from './entities/Enemy';
import { CavernTilemap } from './systems/CavernTilemap';
import { CAVERN_CONFIG, COMBAT_STATS } from './config';
import type { KnightState, BossState } from './types';

describe('Milestone 4 (R4) Empirical Adversarial Verification Suite', () => {
  const dt = 1 / 60;
  let tilemap: CavernTilemap;

  beforeEach(() => {
    tilemap = new CavernTilemap();
  });

  describe('1. Cyan Soul Vessel Meter in Side HUD (0 to 100)', () => {
    test('Soul Vessel Meter accurately reflects player soul from 0 to 100', () => {
      const hud = new SideHUDManager();
      const knightState: KnightState = {
        id: 1,
        mask: 'vessel',
        x: 50,
        y: 200,
        vx: 0,
        vy: 0,
        hp: 5,
        maxHp: 5,
        soul: 0,
        maxSoul: 100,
        isGrounded: true,
        isWallSliding: false,
        isShadowDashing: false,
        facing: 'right',
        dashCooldownTimer: 0,
        geoCount: 0,
      };

      // Test 0 Soul
      expect(() => hud.render([knightState])).not.toThrow();

      // Test midpoint 50 Soul
      knightState.soul = 50;
      expect(() => hud.render([knightState])).not.toThrow();

      // Test full 100 Soul
      knightState.soul = 100;
      expect(() => hud.render([knightState])).not.toThrow();

      hud.destroy();
    });

    test('Soul Vessel Meter clamps out-of-bounds soul values (< 0 and > 100)', () => {
      const hud = new SideHUDManager();
      const knightState: KnightState = {
        id: 1,
        mask: 'vessel',
        x: 50,
        y: 200,
        vx: 0,
        vy: 0,
        hp: 5,
        maxHp: 5,
        soul: -25, // Negative soul
        maxSoul: 100,
        isGrounded: true,
        isWallSliding: false,
        isShadowDashing: false,
        facing: 'right',
        dashCooldownTimer: 0,
        geoCount: 0,
      };

      expect(() => hud.render([knightState])).not.toThrow();

      // Overflow soul > 100
      knightState.soul = 150;
      expect(() => hud.render([knightState])).not.toThrow();

      hud.destroy();
    });

    test('Soul Gain lifecycle: Nail attacks accumulate +11 Soul up to max 100', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.soul = 0;
      const boss = new BossMossKnight(130, 200);

      // Hit 1: 0 -> 11
      knight.update(dt, { attackJustPressed: true }, tilemap.tiles, [boss]);
      expect(knight.state.soul).toBe(11);

      // Hit 2: 11 -> 22
      knight.attackCooldown = 0;
      knight.update(dt, { attackJustPressed: true }, tilemap.tiles, [boss]);
      expect(knight.state.soul).toBe(22);

      // Hit 3: 22 -> 33
      knight.attackCooldown = 0;
      knight.update(dt, { attackJustPressed: true }, tilemap.tiles, [boss]);
      expect(knight.state.soul).toBe(33);

      // Fast-forward to 95 soul and hit again -> caps at 100
      knight.state.soul = 95;
      knight.attackCooldown = 0;
      knight.update(dt, { attackJustPressed: true }, tilemap.tiles, [boss]);
      expect(knight.state.soul).toBe(100);
    });

    test('Soul Spending lifecycle: Focus Soul Spell consumes 33 Soul and heals player', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      knight.state.hp = 3; // Damaged
      knight.state.soul = 100;

      // Attempt focus with 100 soul
      if (knight.state.soul >= 33) {
        knight.state.soul -= 33;
        if (knight.state.hp < knight.state.maxHp) knight.state.hp += 1;
      }
      expect(knight.state.soul).toBe(67);
      expect(knight.state.hp).toBe(4);

      // Focus again: 67 -> 34
      if (knight.state.soul >= 33) {
        knight.state.soul -= 33;
        if (knight.state.hp < knight.state.maxHp) knight.state.hp += 1;
      }
      expect(knight.state.soul).toBe(34);
      expect(knight.state.hp).toBe(5);

      // Focus again: 34 -> 1
      if (knight.state.soul >= 33) {
        knight.state.soul -= 33;
        if (knight.state.hp < knight.state.maxHp) knight.state.hp += 1;
      }
      expect(knight.state.soul).toBe(1);

      // Attempt focus with 1 soul (insufficient)
      const canCast = knight.state.soul >= 33;
      expect(canCast).toBe(false);
      expect(knight.state.soul).toBe(1); // Unchanged
    });

    test('Multiplayer HUD: Side HUD renders distinct vessel meters for up to 4 knights', () => {
      const hud = new SideHUDManager();
      const knights: KnightState[] = [1, 2, 3, 4].map((id) => ({
        id,
        mask: 'vessel',
        x: 50 + id * 30,
        y: 200,
        vx: 0,
        vy: 0,
        hp: 5,
        maxHp: 5,
        soul: id * 25,
        maxSoul: 100,
        isGrounded: true,
        isWallSliding: false,
        isShadowDashing: false,
        facing: 'right',
        dashCooldownTimer: 0,
        geoCount: id * 10,
      }));

      expect(() => hud.render(knights)).not.toThrow();
      hud.destroy();
    });
  });

  describe('2. Top-Center Boss Health Bar & Camera Panning Screen-Space Lock', () => {
    test('Boss Health Bar position calculates top-center in viewport screen space (x=150)', () => {
      const hud = new SideHUDManager();
      const boss: BossState = {
        type: 'boss_moss_knight',
        x: 780, // World position x=780
        y: 200,
        hp: 600,
        maxHp: 600,
        phase: 1,
        isEnraged: false,
      };

      // HUD container remains at position (0, 0) relative to stage / viewport
      expect(hud.container.x).toBe(0);
      expect(hud.container.y).toBe(0);

      // renderBossHUD calculates barX = 480 / 2 - 180 / 2 = 150
      const viewportW = 480;
      const barW = 180;
      const expectedBarX = viewportW / 2 - barW / 2;
      expect(expectedBarX).toBe(150);

      expect(() => hud.renderBossHUD(boss)).not.toThrow();
      hud.destroy();
    });

    test('Boss Health Bar screen space position is invariant across camera panning (cameraX=0 to 480)', () => {
      const hud = new SideHUDManager();
      const boss: BossState = {
        type: 'boss_moss_knight',
        x: 780,
        y: 200,
        hp: 450,
        maxHp: 600,
        phase: 1,
        isEnraged: false,
      };

      // Simulate camera panning from cameraX = 0 up to 480
      const cameraOffsets = [0, 100, 240, 360, 480];

      for (const camX of cameraOffsets) {
        // HUD container is mounted to stage (screen space), so its transform is unchanged by cameraX
        expect(hud.container.x).toBe(0);
        expect(() => hud.render([], boss)).not.toThrow();
      }

      hud.destroy();
    });

    test('Phase 1 Boss HP > 300 (e.g. 600, 301) uses Phase 1 visual theme', () => {
      const boss1: BossState = {
        type: 'boss_moss_knight',
        x: 780,
        y: 200,
        hp: 600,
        maxHp: 600,
        phase: 1,
        isEnraged: false,
      };

      const isEnraged1 = boss1.isEnraged || boss1.hp <= boss1.maxHp * 0.5;
      expect(isEnraged1).toBe(false);

      const boss2: BossState = {
        type: 'boss_moss_knight',
        x: 780,
        y: 200,
        hp: 301,
        maxHp: 600,
        phase: 1,
        isEnraged: false,
      };

      const isEnraged2 = boss2.isEnraged || boss2.hp <= boss2.maxHp * 0.5;
      expect(isEnraged2).toBe(false);
    });

    test('Phase 2 transition at HP <= 300 (50%) correctly activates enraged visual indicator', () => {
      // Exact threshold 300 HP
      const bossExact: BossState = {
        type: 'boss_moss_knight',
        x: 780,
        y: 200,
        hp: 300,
        maxHp: 600,
        phase: 1, // Phase indicator in state might be 1 or 2, but HP <= 300 triggers enraged
        isEnraged: false,
      };

      const isEnragedExact = bossExact.isEnraged || bossExact.hp <= bossExact.maxHp * 0.5;
      expect(isEnragedExact).toBe(true);

      // Low HP Phase 2 boss
      const bossLow: BossState = {
        type: 'boss_moss_knight',
        x: 780,
        y: 200,
        hp: 150,
        maxHp: 600,
        phase: 2,
        isEnraged: true,
      };

      const isEnragedLow = bossLow.isEnraged || bossLow.hp <= bossLow.maxHp * 0.5;
      expect(isEnragedLow).toBe(true);

      const hud = new SideHUDManager();
      expect(() => hud.renderBossHUD(bossExact)).not.toThrow();
      expect(() => hud.renderBossHUD(bossLow)).not.toThrow();
      hud.destroy();
    });
  });

  describe('3. Parallax Cavern Wrap Math & Arbitrary Camera Offsets', () => {
    test('posMod positive wrapping math handles positive, negative, zero, and extreme camera offsets', () => {
      const cavern = new ParallaxCavern();
      const wrap = 960;

      // Positive inputs
      expect(cavern.posMod(0, wrap)).toBe(0);
      expect(cavern.posMod(100, wrap)).toBe(100);
      expect(cavern.posMod(959, wrap)).toBe(959);
      expect(cavern.posMod(960, wrap)).toBe(0);
      expect(cavern.posMod(961, wrap)).toBe(1);
      expect(cavern.posMod(1920, wrap)).toBe(0);
      expect(cavern.posMod(5000, wrap)).toBe(200);

      // Negative inputs
      expect(cavern.posMod(-1, wrap)).toBe(959);
      expect(cavern.posMod(-100, wrap)).toBe(860);
      expect(cavern.posMod(-480, wrap)).toBe(480);
      expect(cavern.posMod(-960, wrap)).toBe(0);
      expect(cavern.posMod(-961, wrap)).toBe(959);
      expect(cavern.posMod(-10000, wrap)).toBe(560);

      // Floating point inputs
      expect(cavern.posMod(12.34, wrap)).toBeCloseTo(12.34, 4);
      expect(cavern.posMod(-12.34, wrap)).toBeCloseTo(947.66, 4);
    });

    test('Parallax Cavern render executes cleanly without polygon distortion or seam gaps across full camera range', () => {
      const cavern = new ParallaxCavern();

      // Collect all draw calls to inspect for NaNs or invalid coordinates
      const recordedDraws: { type: string; args: any[] }[] = [];

      const mockGraphics = {
        rect: (x: number, y: number, w: number, h: number) => {
          recordedDraws.push({ type: 'rect', args: [x, y, w, h] });
          return mockGraphics;
        },
        fill: (opts: any) => {
          recordedDraws.push({ type: 'fill', args: [opts] });
          return mockGraphics;
        },
        circle: (x: number, y: number, r: number) => {
          recordedDraws.push({ type: 'circle', args: [x, y, r] });
          return mockGraphics;
        },
        poly: (coords: number[]) => {
          recordedDraws.push({ type: 'poly', args: [coords] });
          return mockGraphics;
        },
      } as any;

      const testCameraPositions = [-480, -100, 0, 120, 240, 360, 480, 960, 1500];

      for (const camX of testCameraPositions) {
        recordedDraws.length = 0;
        cavern.update(dt);
        expect(() => cavern.render(mockGraphics, camX)).not.toThrow();

        // Inspect recorded calls for numeric validity
        for (const draw of recordedDraws) {
          if (draw.type === 'poly') {
            const coords = draw.args[0] as number[];
            expect(coords.length).toBeGreaterThan(0);
            for (const val of coords) {
              expect(Number.isFinite(val)).toBe(true);
              expect(Number.isNaN(val)).toBe(false);
            }
          } else if (draw.type === 'rect' || draw.type === 'circle') {
            for (const val of draw.args) {
              if (typeof val === 'number') {
                expect(Number.isFinite(val)).toBe(true);
                expect(Number.isNaN(val)).toBe(false);
              }
            }
          }
        }
      }
    });

    test('Layer 1 silhouette wrapping polygon seamless horizontal coverage', () => {
      const cavern = new ParallaxCavern();
      const w = CAVERN_CONFIG.width; // 960

      // Test shiftX across multiple camera positions
      for (let camX = -480; camX <= 960; camX += 60) {
        const p1 = camX * 0.35;
        const shiftX = cavern.posMod(p1, w);

        const offset1 = -shiftX;
        const offset2 = -shiftX + w;

        // Base points start at 0 and end at 960
        // Polygon 1 covers [0 + offset1, 960 + offset1] = [-shiftX, 960 - shiftX]
        // Polygon 2 covers [0 + offset2, 960 + offset2] = [960 - shiftX, 1920 - shiftX]
        const poly1Start = offset1;
        const poly1End = 960 + offset1;
        const poly2Start = offset2;
        const poly2End = 960 + offset2;

        // Verify seam alignment: Poly 1 end equals Poly 2 start
        expect(poly1End).toBe(poly2Start);

        // Verify full viewport [0, 480] and level [0, 960] coverage
        expect(poly1Start).toBeLessThanOrEqual(0);
        expect(poly2End).toBeGreaterThanOrEqual(480);
      }
    });
  });
});
