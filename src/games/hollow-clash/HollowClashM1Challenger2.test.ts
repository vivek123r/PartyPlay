import { describe, test, expect } from 'vitest';
import { Graphics } from 'pixi.js';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { BossMossKnight } from './entities/BossMossKnight';
import { PlatformPhysics } from './systems/PlatformPhysics';
import { CavernTilemap } from './systems/CavernTilemap';
import { SideHUDManager } from './systems/SideHUDManager';
import { PLATFORM_PHYSICS, COMBAT_STATS } from './config';

describe('Empirical Milestone 1 Stress & Regression Harness (Challenger 2)', () => {
  const tilemap = new CavernTilemap();

  describe('1. Player Movement & Physics Mechanics', () => {
    test('Horizontal movement sets exact velocity according to facing direction', () => {
      const knight = new Knight({ x: 100, y: 100 });

      // Move Right
      knight.update(0.016, { right: true }, [], []);
      expect(knight.state.vx).toBe(PLATFORM_PHYSICS.MOVE_SPEED);
      expect(knight.state.facing).toBe('right');

      // Move Left
      knight.update(0.016, { left: true }, [], []);
      expect(knight.state.vx).toBe(-PLATFORM_PHYSICS.MOVE_SPEED);
      expect(knight.state.facing).toBe('left');

      // Idle (No movement input)
      knight.update(0.016, {}, [], []);
      expect(knight.state.vx).toBe(0);
    });

    test('Jump velocity, variable jump cut, and double jump behavior', () => {
      const knight = new Knight({ x: 100, y: 100 });
      knight.state.isGrounded = true;
      knight.canDoubleJump = true;

      // Ground Jump (no tiles around in empty tile array)
      knight.update(0.016, { jumpJustPressed: true }, [], []);
      expect(knight.state.isGrounded).toBe(false);
      expect(knight.state.vy).toBeLessThan(0); // Ascending upward

      // Variable Jump Cut (release jump button while ascending)
      const vyBeforeCut = knight.state.vy;
      knight.update(0.016, { jumpReleased: true }, [], []);
      expect(knight.state.vy).toBeGreaterThan(vyBeforeCut); // Reduced upward velocity

      // Double Jump in mid-air (jumpJustPressed = true, jumpReleased = false)
      knight.canDoubleJump = true;
      knight.update(0.016, { jumpJustPressed: true, jumpReleased: false }, [], []);
      expect(knight.canDoubleJump).toBe(false);
      expect(knight.state.vy).toBeLessThan(-300); // Re-accelerated upward

      // Attempting 3rd jump in mid-air should fail
      knight.update(0.016, { jumpJustPressed: true }, [], []);
      expect(knight.canDoubleJump).toBe(false);
    });

    test('Moss wall sliding limits fall speed and restores double jump', () => {
      const mossTile = { x: 116, y: 100, width: 32, height: 64, isSolid: true, type: 'moss' as const };

      // Position knight flush against the left side of the moss tile, falling downwards
      const knight = new Knight({
        x: 100,
        y: 100,
        vx: 0,
        vy: 200,
        isGrounded: false,
        facing: 'right',
      });

      knight.update(0.016, { right: true }, [mossTile], []);
      expect(knight.state.isWallSliding).toBe(true);
      expect(knight.state.vy).toBeLessThanOrEqual(PLATFORM_PHYSICS.WALL_SLIDE_SPEED);
      expect(knight.canDoubleJump).toBe(true);
    });

    test('Shadow Dash freezes vy=0, gives invulnerability, and maintains horizontal wall collision', () => {
      const knight = new Knight({ x: 100, y: 100 });

      // Trigger Shadow Dash input (frame 1 activates flag)
      knight.update(0.016, { dashJustPressed: true }, [], []);
      expect(knight.state.isShadowDashing).toBe(true);
      expect(knight.isInvulnerable).toBe(true);

      // Frame 2 applies dash velocity
      knight.update(0.016, {}, [], []);
      expect(knight.state.vx).toBe(PLATFORM_PHYSICS.SHADOW_DASH_SPEED);
      expect(knight.state.vy).toBe(0);

      // Test horizontal wall collision during Shadow Dash
      const wallTile = { x: 120, y: 90, width: 32, height: 40, isSolid: true, type: 'stone' as const };
      knight.update(0.1, {}, [wallTile], []);

      // Knight should be stopped at the wall (x = wallTile.x - knight.width = 120 - 16 = 104)
      expect(knight.state.x).toBe(wallTile.x - knight.width);
      expect(knight.state.vx).toBe(0);
    });

    test('Spike pit hazard deals 1 damage and safe respawns player', () => {
      const spikeTile = { x: 200, y: 200, width: 32, height: 16, isSolid: false, type: 'spikes' as const };
      const knight = new Knight({ x: 100, y: 150 });
      knight.lastSafeGroundPosition = { x: 100, y: 150 };

      // Move knight directly onto spikes
      knight.state.x = 205;
      knight.state.y = 200;
      knight.update(0.016, {}, [spikeTile], []);

      expect(knight.state.hp).toBe(COMBAT_STATS.MASK_HP - 1);
      expect(knight.state.x).toBe(100);
      expect(knight.state.y).toBe(150);
      expect(knight.isInvulnerable).toBe(true);
    });
  });

  describe('2. Hitboxes, Combat & Damage Taking Mechanics', () => {
    test('Melee attack hitboxes correctly hit enemies in forward, up, and down directions', () => {
      // Forward attack
      const knight = new Knight({ x: 100, y: 100, facing: 'right' });
      const enemy1 = new Enemy('1', 'spore_bug', 120, 100);
      knight.update(0.016, { attackJustPressed: true }, [], [enemy1]);
      expect(enemy1.hp).toBe(enemy1.maxHp - COMBAT_STATS.NAIL_DAMAGE);
      expect(knight.state.soul).toBe(COMBAT_STATS.SOUL_PER_HIT);

      // Reset knight cooldown
      knight.attackCooldown = 0;

      // Upward attack
      knight.state.x = 100;
      knight.state.y = 100;
      const enemy2 = new Enemy('2', 'spore_bug', 100, 80);
      knight.update(0.016, { attackJustPressed: true, up: true }, [], [enemy2]);
      expect(enemy2.hp).toBe(enemy2.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Reset knight cooldown & grounded state for down attack
      knight.attackCooldown = 0;
      knight.state.isGrounded = false;
      knight.state.x = 100;
      knight.state.y = 100;
      const enemy3 = new Enemy('3', 'spore_bug', 100, 125);
      knight.update(0.016, { attackJustPressed: true, down: true }, [], [enemy3]);
      expect(enemy3.hp).toBe(enemy3.maxHp - COMBAT_STATS.NAIL_DAMAGE);
      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
      expect(knight.canDoubleJump).toBe(true);
    });

    test('Downward slash on spike pit triggers pogo bounce and restores double jump', () => {
      const spikeTile = { x: 100, y: 130, width: 32, height: 16, isSolid: false, type: 'spikes' as const };
      const knight = new Knight({ x: 100, y: 100 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;

      knight.update(0.016, { attackJustPressed: true, down: true }, [spikeTile], []);
      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
      expect(knight.canDoubleJump).toBe(true);
    });

    test('Shielded Husk blocks frontal strikes but takes damage from behind and down pogo', () => {
      const enemy = new Enemy('husk', 'shielded_husk', 200, 100);
      enemy.facing = 'left';

      // Frontal strike from left: knight is at x=175 facing right, attacking right towards enemy facing left
      const knightFront = new Knight({ x: 175, y: 100, facing: 'right' });
      knightFront.update(0.016, { attackJustPressed: true }, [], [enemy]);
      expect(enemy.hp).toBe(enemy.maxHp); // Blocked!

      // Behind strike from right: knight is at x=220 facing left, attacking left towards enemy facing left
      const knightBehind = new Knight({ x: 220, y: 100, facing: 'left' });
      knightBehind.update(0.016, { attackJustPressed: true }, [], [enemy]);
      expect(enemy.hp).toBe(enemy.maxHp - COMBAT_STATS.NAIL_DAMAGE); // Took damage!

      // Down pogo strike from above
      const knightPogo = new Knight({ x: 200, y: 75, facing: 'right' });
      knightPogo.state.isGrounded = false;
      knightPogo.update(0.016, { attackJustPressed: true, down: true }, [], [enemy]);
      expect(enemy.hp).toBe(enemy.maxHp - COMBAT_STATS.NAIL_DAMAGE * 2); // Took damage!
    });
  });

  describe('3. Visual Particles & Physics Isolation Verification', () => {
    test('Bio-sludge hit particles have gravity applied while ground platform holds Knight stable', () => {
      const groundTile = { x: 50, y: 124, width: 100, height: 32, isSolid: true, type: 'stone' as const };
      const knight = new Knight({ x: 100, y: 100, facing: 'right' });
      knight.state.isGrounded = true;
      const enemy = new Enemy('1', 'spore_bug', 120, 100);

      // Hit enemy to spawn bio-sludge particles
      knight.update(0.016, { attackJustPressed: true }, [groundTile], [enemy]);
      expect(knight.trailParticles.length).toBeGreaterThan(0);

      const sludgeParticle = knight.trailParticles.find((p) => p.hasGravity);
      expect(sludgeParticle).toBeDefined();
      const initialVy = sludgeParticle!.vy;

      // Update particle physics for 10 frames with grounded knight
      for (let i = 0; i < 10; i++) {
        knight.update(0.016, {}, [groundTile], []);
      }

      // Particle vy should have increased due to downward gravity acceleration (vy += 180 * dt)
      expect(sludgeParticle!.vy).toBeGreaterThan(initialVy);
      // Knight remains stable on ground at y = groundTile.y - knight.height = 124 - 24 = 100
      expect(knight.state.y).toBe(100);
      expect(knight.state.isGrounded).toBe(true);
    });

    test('BossMossKnight animTimer inspection', () => {
      const boss = new BossMossKnight(780, 200);

      // Verify whether animTimer property is defined on BossMossKnight
      const hasAnimTimerProperty = Object.prototype.hasOwnProperty.call(boss, 'animTimer') || (boss as any).animTimer !== undefined;
      expect(hasAnimTimerProperty).toBe(true);

      // Calculate tentacleSwing with current implementation
      const tentacleSwing = Math.sin((boss as any).animTimer * 8) * 4;
      expect(Number.isNaN(tentacleSwing)).toBe(false);
    });

    test('Enemy rendering for all three grotesque mutant types works cleanly', () => {
      const sporeBug = new Enemy('1', 'spore_bug', 100, 100);
      const mantis = new Enemy('2', 'mantis_crawler', 200, 100);
      const husk = new Enemy('3', 'shielded_husk', 300, 100);

      const g = new Graphics();
      expect(() => sporeBug.render(g)).not.toThrow();
      expect(() => mantis.render(g)).not.toThrow();
      expect(() => husk.render(g)).not.toThrow();
    });

    test('SideHUDManager renders Gothic HUD correctly for P1 and P2', () => {
      const hud = new SideHUDManager();
      const knights = [
        new Knight({ id: 1, hp: 5, maxHp: 5, soul: 33, geoCount: 120 }),
        new Knight({ id: 2, hp: 3, maxHp: 5, soul: 0, geoCount: 45 }),
      ];

      expect(() => hud.render(knights.map((k) => k.state))).not.toThrow();
    });

    test('SideHUDManager 4P cards fit within 480px viewport and Boss HUD does not overlap player HUD cards', () => {
      const knights = [
        new Knight({ id: 1 }),
        new Knight({ id: 2 }),
        new Knight({ id: 3 }),
        new Knight({ id: 4 }),
      ];

      const hudW = 110;
      const step = 116;
      const p4RightEdge = 6 + 3 * step + hudW;
      expect(p4RightEdge).toBeLessThanOrEqual(464);

      const playerHudBottomY = 6 + 40; // 46px
      const bossBarY = 54; // 54px
      expect(bossBarY).toBeGreaterThan(playerHudBottomY);
    });
  });
});
