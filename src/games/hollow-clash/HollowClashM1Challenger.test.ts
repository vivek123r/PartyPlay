import { describe, test, expect, beforeEach } from 'vitest';
import { Graphics } from 'pixi.js';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { BossMossKnight } from './entities/BossMossKnight';
import { SideHUDManager } from './systems/SideHUDManager';
import { COMBAT_STATS } from './config';

describe('Milestone 1 Visuals & HUD Empirical Stress Suite (Challenger 1)', () => {
  const dt = 1 / 60;
  let mockG: Graphics;

  beforeEach(() => {
    mockG = new Graphics();
  });

  describe('1. Gothic HUD & SideHUDManager Boundary & Extreme State Stress Tests', () => {
    test('Player HUD rendering handles HP extremes (0 HP, 1 HP, max HP, negative HP, overflow HP)', () => {
      const hud = new SideHUDManager();

      // 0 HP: All masks depleted, rendered as cracked skulls
      const kDead = new Knight({ id: 1, hp: 0, maxHp: 5 });
      expect(() => hud.render([kDead.state])).not.toThrow();

      // 1 HP: Low health state (1 active mask, 4 depleted)
      const kLow = new Knight({ id: 1, hp: 1, maxHp: 5 });
      expect(() => hud.render([kLow.state])).not.toThrow();

      // Max HP: 5 active masks
      const kFull = new Knight({ id: 1, hp: 5, maxHp: 5 });
      expect(() => hud.render([kFull.state])).not.toThrow();

      // Sub-zero HP: Clamped to 0 active masks
      const kSubZero = new Knight({ id: 1, hp: -10, maxHp: 5 });
      expect(() => hud.render([kSubZero.state])).not.toThrow();

      // Overflow HP: 20 HP with maxHp 10
      const kOverflow = new Knight({ id: 1, hp: 20, maxHp: 10 });
      expect(() => hud.render([kOverflow.state])).not.toThrow();

      // 0 maxHp: Edge case with zero containers
      const kZeroMax = new Knight({ id: 1, hp: 0, maxHp: 0 });
      expect(() => hud.render([kZeroMax.state])).not.toThrow();

      hud.destroy();
    });

    test('Player HUD rendering handles Soul Vessel extremes and focus threshold boundary', () => {
      const hud = new SideHUDManager();

      // 0 Soul: Empty liquid fill
      const k0 = new Knight({ id: 1, soul: 0, maxSoul: 100 });
      expect(() => hud.render([k0.state])).not.toThrow();

      // 32 Soul: Just under 33-Soul focus threshold (rim color: 0x1e293b)
      const k32 = new Knight({ id: 1, soul: 32, maxSoul: 100 });
      expect(() => hud.render([k32.state])).not.toThrow();

      // 33 Soul: Exact 33-Soul focus threshold tick boundary (rim color: 0x00f0ff)
      const k33 = new Knight({ id: 1, soul: 33, maxSoul: 100 });
      expect(() => hud.render([k33.state])).not.toThrow();

      // 34 Soul: Just above focus threshold
      const k34 = new Knight({ id: 1, soul: 34, maxSoul: 100 });
      expect(() => hud.render([k34.state])).not.toThrow();

      // 100 Soul: Maximum full Soul Vessel liquid fill
      const k100 = new Knight({ id: 1, soul: 100, maxSoul: 100 });
      expect(() => hud.render([k100.state])).not.toThrow();

      // Negative Soul & Overflow Soul fallback clamping
      const kNeg = new Knight({ id: 1, soul: -50, maxSoul: 100 });
      const kOver = new Knight({ id: 1, soul: 250, maxSoul: 100 });
      expect(() => hud.render([kNeg.state])).not.toThrow();
      expect(() => hud.render([kOver.state])).not.toThrow();

      // Undefined soul fallback
      const kUndef = new Knight({ id: 1 });
      delete (kUndef.state as any).soul;
      expect(() => hud.render([kUndef.state])).not.toThrow();

      hud.destroy();
    });

    test('Player HUD rendering handles Geo counter extremes', () => {
      const hud = new SideHUDManager();

      // 0 Geo
      const k0 = new Knight({ id: 1, geoCount: 0 });
      expect(() => hud.render([k0.state])).not.toThrow();

      // Max Geo (999,999)
      const kMax = new Knight({ id: 1, geoCount: 999999 });
      expect(() => hud.render([kMax.state])).not.toThrow();

      // Negative Geo
      const kNeg = new Knight({ id: 1, geoCount: -50 });
      expect(() => hud.render([kNeg.state])).not.toThrow();

      // Undefined Geo
      const kUndef = new Knight({ id: 1 });
      delete (kUndef.state as any).geoCount;
      expect(() => hud.render([kUndef.state])).not.toThrow();

      hud.destroy();
    });

    test('Player HUD handles 1 to 4 concurrent player slots without layout collision or crash', () => {
      const hud = new SideHUDManager();

      const k1 = new Knight({ id: 1, hp: 5, soul: 10, geoCount: 100 });
      const k2 = new Knight({ id: 2, hp: 3, soul: 50, geoCount: 250 });
      const k3 = new Knight({ id: 3, hp: 1, soul: 90, geoCount: 500 });
      const k4 = new Knight({ id: 4, hp: 4, soul: 100, geoCount: 999 });

      expect(() => hud.render([k1.state, k2.state, k3.state, k4.state])).not.toThrow();

      hud.destroy();
    });

    test('Boss HUD rendering handles HP extremes and enraged transition', () => {
      const hud = new SideHUDManager();

      const bossFull = new BossMossKnight(780, 200); // 600 HP (100%)
      expect(() => hud.render([], bossFull)).not.toThrow();

      const bossHalf = new BossMossKnight(780, 200);
      bossHalf.hp = 300; // 50% HP threshold (Enraged transition)
      bossHalf.isEnraged = true;
      expect(() => hud.render([], bossHalf)).not.toThrow();

      const bossLow = new BossMossKnight(780, 200);
      bossLow.hp = 1; // 1 HP
      expect(() => hud.render([], bossLow)).not.toThrow();

      const bossDead = new BossMossKnight(780, 200);
      bossDead.hp = 0; // 0 HP (Boss HUD hidden)
      expect(() => hud.render([], bossDead)).not.toThrow();

      hud.destroy();
    });

    test('Game Over overlay renders victory and defeat states cleanly', () => {
      const hud = new SideHUDManager();
      const k1 = new Knight({ id: 1, hp: 0 });

      expect(() => hud.render([k1.state], null, true, true)).not.toThrow(); // Victory
      expect(() => hud.render([k1.state], null, true, false)).not.toThrow(); // Defeat

      hud.destroy();
    });
  });

  describe('2. Player Vessel Visuals & Particle Physics Stress Harness', () => {
    test('Knight vessel renders cleanly across all health & state conditions', () => {
      const k = new Knight({ id: 1, x: 100, y: 100, hp: 5 });

      // Standing facing right
      expect(() => k.render()).not.toThrow();

      // Facing left
      k.state.facing = 'left';
      expect(() => k.render()).not.toThrow();

      // Low health eye aura (hp = 1 -> crimson 0xff0055 glow)
      k.state.hp = 1;
      expect(() => k.render()).not.toThrow();

      // Shadow Dash state (crimson eye glow & trail particles)
      k.state.isShadowDashing = true;
      expect(() => k.render()).not.toThrow();
      k.state.isShadowDashing = false;

      // Invulnerability flicker
      k.invulnerabilityTimer = 0.5;
      expect(() => k.render()).not.toThrow();
      k.invulnerabilityTimer = 0.4;
      expect(() => k.render()).not.toThrow();
      k.invulnerabilityTimer = 0;

      // Attacking forward, up, down
      k.isAttacking = true;
      k.attackDirection = 'forward';
      expect(() => k.render()).not.toThrow();

      k.attackDirection = 'up';
      expect(() => k.render()).not.toThrow();

      k.attackDirection = 'down';
      expect(() => k.render()).not.toThrow();
      k.isAttacking = false;

      // Dead knight state (broken mask & ghost grave)
      k.state.hp = 0;
      expect(() => k.render()).not.toThrow();
    });

    test('Particle physics gravity acceleration (vy += 180 * dt) and particle lifecycle', () => {
      const k = new Knight({ id: 1, x: 100, y: 100 });

      // Spawn hit particles
      (k as any).spawnHitParticles(100, 100);
      expect(k.trailParticles.length).toBe(8);

      const gravityParticle = k.trailParticles.find((p) => p.hasGravity);
      expect(gravityParticle).toBeDefined();
      expect(gravityParticle!.hasGravity).toBe(true);

      const initialVy = gravityParticle!.vy;
      const initialY = gravityParticle!.y;

      // Step simulation by 0.1s
      (k as any).updateParticles(0.1);

      expect(gravityParticle!.vy).toBeCloseTo(initialVy + 18, 1); // vy += 180 * 0.1
      expect(gravityParticle!.y).toBeCloseTo(initialY + (initialVy + 18) * 0.1, 1); // y updated by vy * dt

      // Advance time until all particles expire
      for (let step = 0; step < 60; step++) {
        (k as any).updateParticles(0.05);
      }

      expect(k.trailParticles.length).toBe(0);
    });

    test('Rapid hit particle spawning stress test (1,000+ particles)', () => {
      const k = new Knight({ id: 1, x: 100, y: 100 });

      // Rapidly trigger 200 hit particle bursts = 1,600 particles
      for (let i = 0; i < 200; i++) {
        (k as any).spawnHitParticles(100 + i, 100 + i);
      }
      expect(k.trailParticles.length).toBe(1600);

      // Render with 1,600 particles present
      expect(() => k.render()).not.toThrow();

      // Simulate physics loop for 60 frames
      for (let frame = 0; frame < 60; frame++) {
        (k as any).updateParticles(dt);
        expect(() => k.render()).not.toThrow();
      }

      // Check that no NaN values were created in particle properties
      for (const p of k.trailParticles) {
        expect(Number.isNaN(p.x)).toBe(false);
        expect(Number.isNaN(p.y)).toBe(false);
        expect(Number.isNaN(p.vx)).toBe(false);
        expect(Number.isNaN(p.vy)).toBe(false);
      }
    });
  });

  describe('3. Grotesque Mutant Enemy Visual Rendering Stress', () => {
    test('Mutant Spore Bug renders cleanly with sine wave animation & extreme animTimer', () => {
      const bug = new Enemy('bug1', 'spore_bug', 150, 150);

      expect(() => bug.render(mockG)).not.toThrow();

      // Facing right
      bug.facing = 'right';
      expect(() => bug.render(mockG)).not.toThrow();

      // Extreme animTimer (100,000s)
      bug.animTimer = 100000.5;
      expect(() => bug.render(mockG)).not.toThrow();

      // Damaged state (renders HP bar)
      bug.hp = 15;
      expect(() => bug.render(mockG)).not.toThrow();

      // 0 HP state
      bug.hp = 0;
      expect(() => bug.render(mockG)).not.toThrow();
    });

    test('Jagged Thorn Crawler renders chitin scythes & crimson multi-eyespots', () => {
      const crawler = new Enemy('c1', 'mantis_crawler', 200, 200);

      expect(() => crawler.render(mockG)).not.toThrow();

      crawler.facing = 'right';
      expect(() => crawler.render(mockG)).not.toThrow();

      crawler.hp = 25; // Render HP bar
      expect(() => crawler.render(mockG)).not.toThrow();
    });

    test('Chitin Shield Abomination renders bone-ribbed shield & purple core eye', () => {
      const shieldHusk = new Enemy('s1', 'shielded_husk', 250, 200);

      expect(() => shieldHusk.render(mockG)).not.toThrow();

      shieldHusk.facing = 'right';
      expect(() => shieldHusk.render(mockG)).not.toThrow();

      shieldHusk.hp = 35; // Render HP bar
      expect(() => shieldHusk.render(mockG)).not.toThrow();
    });
  });

  describe('4. Boss Moss Knight Visual & Particle Stress Harness', () => {
    test('BossMossKnight Phase 1 & Phase 2 (Enraged) visual rendering and slime aura particles', () => {
      const boss = new BossMossKnight(780, 200);
      const k = new Knight({ id: 1, x: 700, y: 200 });

      // Phase 1 rendering
      expect(() => boss.render(mockG)).not.toThrow();

      // Trigger hit flash
      boss.takeDamage(50);
      expect(boss.hitFlashTimer).toBeGreaterThan(0);
      expect(() => boss.render(mockG)).not.toThrow();

      // Transition to Phase 2 (Enraged at 50% HP = 300)
      boss.takeDamage(260);
      expect(boss.phase).toBe(2);
      expect(boss.isEnraged).toBe(true);

      // Run update for 200 ticks to accumulate enraged aura particles
      for (let i = 0; i < 200; i++) {
        boss.update(dt, [k]);
      }
      expect(boss.auraParticles.length).toBeGreaterThan(0);

      // Render enraged state with multi-colored slime aura particles
      expect(() => boss.render(mockG)).not.toThrow();

      // Check aura particles for validity
      for (const p of boss.auraParticles) {
        expect(Number.isNaN(p.x)).toBe(false);
        expect(Number.isNaN(p.y)).toBe(false);
        expect(Number.isNaN(p.vx)).toBe(false);
        expect(Number.isNaN(p.vy)).toBe(false);
        expect(p.life).toBeGreaterThan(0);
      }
    });
  });

  describe('5. Integrated Rendering Loop High-Load Stress Harness', () => {
    test('600-frame intensive gameplay rendering loop with continuous particle generation and HUD updates', () => {
      const k1 = new Knight({ id: 1, x: 100, y: 200, hp: 5, maxHp: 5, soul: 0, geoCount: 0 });
      const k2 = new Knight({ id: 2, x: 120, y: 200, hp: 5, maxHp: 5, soul: 50, geoCount: 100 });

      const e1 = new Enemy('e1', 'spore_bug', 150, 150);
      const e2 = new Enemy('e2', 'mantis_crawler', 220, 200);
      const e3 = new Enemy('e3', 'shielded_husk', 300, 200);

      const boss = new BossMossKnight(780, 200);
      const hud = new SideHUDManager();

      const knights = [k1, k2];
      const enemies = [e1, e2, e3];

      for (let frame = 0; frame < 600; frame++) {
        // Input simulation
        const input1 = {
          right: frame % 120 < 60,
          left: frame % 120 >= 60,
          jumpJustPressed: frame % 90 === 0,
          attackJustPressed: frame % 15 === 0,
          down: frame % 30 < 15,
        };

        k1.update(dt, input1, [], enemies);
        k2.update(dt, { left: true, attackJustPressed: frame % 20 === 0 }, [], enemies);

        e1.update(dt, knights);
        e2.update(dt, knights);
        e3.update(dt, knights);
        boss.update(dt, knights);

        hud.update(dt);

        // Rendering calls
        expect(() => k1.render()).not.toThrow();
        expect(() => k2.render()).not.toThrow();
        expect(() => e1.render(mockG)).not.toThrow();
        expect(() => e2.render(mockG)).not.toThrow();
        expect(() => e3.render(mockG)).not.toThrow();
        expect(() => boss.render(mockG)).not.toThrow();
        expect(() => hud.render([k1.state, k2.state], boss)).not.toThrow();

        // Simulate HP and Soul state mutations
        if (frame === 100) k1.takeDamage(1);
        if (frame === 200) k1.addSoul(33);
        if (frame === 300) k1.state.geoCount += 50;
        if (frame === 400) boss.takeDamage(350); // Enraged transition
      }

      hud.destroy();
    });
  });
});
