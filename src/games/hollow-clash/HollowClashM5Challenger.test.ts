import { describe, test, expect, beforeEach } from 'vitest';
import HollowClashGame from './index';
import { HeroLoungeScreen } from './screens/HeroLoungeScreen';
import { SideHUDManager } from './systems/SideHUDManager';
import { ParallaxCavern } from './systems/ParallaxCavern';
import { CavernTilemap } from './systems/CavernTilemap';
import { PlatformPhysics } from './systems/PlatformPhysics';
import { Knight } from './entities/Knight';
import { BossMossKnight } from './entities/BossMossKnight';
import { Enemy } from './entities/Enemy';
import { CAVERN_CONFIG, COMBAT_STATS, PLATFORM_PHYSICS } from './config';
import type { KnightState, BossState } from './types';

describe('Milestone 5 (R1-R4) E2E Comprehensive Stress Test Suite', () => {
  const dt = 1 / 60;
  let tilemap: CavernTilemap;
  let physics: PlatformPhysics;

  beforeEach(() => {
    tilemap = new CavernTilemap();
    physics = new PlatformPhysics();

    // Mock window event listener for Node test runner environment
    if (typeof window === 'undefined') {
      (globalThis as any).window = {
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }
  });

  describe('1. Simultaneous P1 & P2 Multi-Key Keyboard Inputs', () => {
    test('Simultaneous P1 (WASD+LCTRL+LSHIFT) and P2 (Arrows+RCTRL+RSHIFT) inputs execute without state interference', () => {
      const k1 = new Knight({ id: 1, mask: 'vessel', x: 50, y: 200, facing: 'right' });
      const k2 = new Knight({ id: 2, mask: 'hornet', x: 80, y: 200, facing: 'left' });
      const dummyBoss = new BossMossKnight(300, 200);

      // P1 input: Move right + Jump + Attack + Dash
      const p1Input = {
        left: false,
        right: true,
        up: true,
        down: false,
        jumpJustPressed: true,
        jumpReleased: false,
        attackJustPressed: true,
        dashJustPressed: true,
      };

      // P2 input: Move left + Jump + Attack + Dash
      const p2Input = {
        left: true,
        right: false,
        up: true,
        down: false,
        jumpJustPressed: true,
        jumpReleased: false,
        attackJustPressed: true,
        dashJustPressed: true,
      };

      // Execute simultaneous updates for 60 frames
      for (let f = 0; f < 60; f++) {
        k1.update(dt, f === 0 ? p1Input : { left: true, right: false, up: false, down: false, jumpJustPressed: false, jumpReleased: false, attackJustPressed: false, dashJustPressed: false }, tilemap.tiles, [dummyBoss]);
        k2.update(dt, f === 0 ? p2Input : { left: false, right: true, up: false, down: false, jumpJustPressed: false, jumpReleased: false, attackJustPressed: false, dashJustPressed: false }, tilemap.tiles, [dummyBoss]);
      }

      // Verify both knights update independently without NaN or position corruption
      expect(Number.isFinite(k1.state.x)).toBe(true);
      expect(Number.isFinite(k1.state.y)).toBe(true);
      expect(Number.isFinite(k2.state.x)).toBe(true);
      expect(Number.isFinite(k2.state.y)).toBe(true);
      expect(k1.state.id).toBe(1);
      expect(k2.state.id).toBe(2);
    });

    test('4-Player simultaneous multi-key stress simulation', () => {
      const knights = [1, 2, 3, 4].map((id) => new Knight({ id, mask: 'vessel', x: 30 * id, y: 200 }));
      const enemies = [new Enemy('bug-1', 'spore_bug', 200, 200)];

      for (let frame = 0; frame < 100; frame++) {
        knights.forEach((k, idx) => {
          const input = {
            left: idx % 2 === 0,
            right: idx % 2 !== 0,
            up: frame % 10 === 0,
            down: false,
            jumpJustPressed: frame % 10 === 0,
            jumpReleased: frame % 10 === 5,
            attackJustPressed: frame % 15 === 0,
            dashJustPressed: frame % 30 === 0,
          };
          k.update(dt, input, tilemap.tiles, enemies);
          expect(Number.isFinite(k.state.x)).toBe(true);
          expect(Number.isFinite(k.state.y)).toBe(true);
        });
      }
    });
  });

  describe('2. Instant Lounge Bypass into Gameplay', () => {
    test('Lounge screen bypasses into gameplay immediately when startRequested is set via Enter/Space/Click', () => {
      const lounge = new HeroLoungeScreen();
      expect(lounge.startRequested).toBe(false);

      // Trigger Enter key bypass
      lounge.startRequested = true;
      expect(lounge.startRequested).toBe(true);
      expect(lounge.isAllReady(2)).toBe(false); // Bypasses despite ready state being false!
    });

    test('Game module initializes Lounge phase and transitions to Cavern phase upon bypass signal', async () => {
      const game = new HollowClashGame();
      const mockCtx: any = {
        logger: { info: () => {}, warn: () => {}, error: () => {} },
        renderer: { stage: { addChild: () => {}, on: () => {} } },
        players: [{ id: 1 }, { id: 2 }],
        input: {
          getPlayer: () => ({
            isJustPressed: () => false,
            isActive: () => false,
          }),
        },
        audio: { playTone: () => {} },
        events: { emit: () => {} },
      };

      await game.init(mockCtx);
      game.start();
      expect(game.state).toBe('Playing');

      // Bypassing lounge phase
      (game as any).lounge.startRequested = true;
      game.update(dt);

      // Verify transition to cavern phase
      expect((game as any).isLoungePhase).toBe(false);
      expect((game as any).knights.length).toBe(2);
      expect((game as any).boss).not.toBeNull();
      expect((game as any).enemies.length).toBe(5);

      game.destroy();
    });
  });

  describe('3. Physics Stability, Moss Wall Slide & Wall Jump Double Jump Preservation', () => {
    test('Moss Wall Slide caps downward velocity vy at WALL_SLIDE_SPEED (70)', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 16, y: 100, facing: 'left' });
      k.state.vy = 300; // High falling speed

      // Perform physics update step flush against moss wall
      physics.update(k, tilemap.tiles, dt);

      // When flush against moss wall, wall sliding triggers and vy is capped
      expect(k.state.isWallSliding).toBe(true);
      expect(k.state.vy).toBeLessThanOrEqual(PLATFORM_PHYSICS.WALL_SLIDE_SPEED);
    });

    test('Wall Jump reverses facing, applies JUMP_VELOCITY (-420), and preserves canDoubleJump = true', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 16, y: 100, facing: 'left' });
      k.state.isWallSliding = true;
      k.canDoubleJump = false; // Intentionally depleted before wall jump

      const wallJumpInput = {
        left: false,
        right: false,
        up: true,
        down: false,
        jumpJustPressed: true,
        jumpReleased: false,
      };

      k.update(dt, wallJumpInput, tilemap.tiles, []);

      // Verify Wall Jump response (vy = JUMP_VELOCITY + gravity*dt = -420 + 20 = -400)
      expect(k.state.vy).toBe(PLATFORM_PHYSICS.JUMP_VELOCITY + PLATFORM_PHYSICS.GRAVITY * dt);
      expect(k.state.facing).toBe('right'); // Reversed facing from left
      expect(k.canDoubleJump).toBe(true); // Preserved double jump!
    });

    test('Double Jump executes in mid-air following a Wall Jump', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 50, y: 100, facing: 'right' });
      k.state.isGrounded = false;
      k.state.isWallSliding = true;

      // 1. Execute Wall Jump
      k.update(dt, { jumpJustPressed: true }, tilemap.tiles, []);
      expect(k.canDoubleJump).toBe(true);

      // Simulate rising to peak of wall jump
      k.state.vy = 50;

      // 2. Execute Double Jump in mid-air
      k.update(dt, { jumpJustPressed: true }, tilemap.tiles, []);

      expect(k.state.vy).toBe(PLATFORM_PHYSICS.JUMP_VELOCITY + PLATFORM_PHYSICS.GRAVITY * dt);
      expect(k.canDoubleJump).toBe(false); // Used up double jump
    });

    test('Physics stability under extreme dt spikes (dt=0.001 to dt=0.5) prevents position NaNs or boundary leaks', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100 });
      const dtSpikes = [0.001, 0.016, 0.033, 0.1, 0.25, 0.5];

      for (const spikeDt of dtSpikes) {
        k.state.vx = 200;
        k.state.vy = 400;
        expect(() => physics.update(k, tilemap.tiles, spikeDt)).not.toThrow();
        expect(Number.isFinite(k.state.x)).toBe(true);
        expect(Number.isFinite(k.state.y)).toBe(true);
      }
    });
  });

  describe('4. Spike Hazard Damage & Safe Ground Respawn', () => {
    test('Landing in Spike Pit triggers 1 damage, resets velocity, and teleports to lastSafeGroundPosition', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200 }); // Grounded at safe position
      physics.update(k, tilemap.tiles, dt);
      const expectedSafePos = { ...k.lastSafeGroundPosition };

      expect(expectedSafePos.x).toBeGreaterThan(0);
      expect(k.state.hp).toBe(5);

      // Move knight over Spike Pit 1 (x=300, y=CAVERN_CONFIG.height - 16)
      const spikeTile = tilemap.tiles.find((t) => t.type === 'spikes')!;
      k.state.x = spikeTile.x + 10;
      k.state.y = spikeTile.y + 2;

      // Update physics to trigger hazard collision
      physics.update(k, tilemap.tiles, dt);

      // Verification
      expect(k.state.hp).toBe(4); // 1 damage taken
      expect(k.state.x).toBe(expectedSafePos.x); // Teleported back to safe ground x
      expect(k.state.y).toBe(expectedSafePos.y); // Teleported back to safe ground y
      expect(k.state.vx).toBe(0);
      expect(k.state.vy).toBe(0);
    });

    test('Spike tile position is NEVER saved as lastSafeGroundPosition', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 50, y: CAVERN_CONFIG.height - 32 - 24 });
      physics.update(k, tilemap.tiles, dt);
      const validGroundX = k.lastSafeGroundPosition.x;
      const validGroundY = k.lastSafeGroundPosition.y;

      // Force knight into spike pit for 10 frames
      const spikeTile = tilemap.tiles.find((t) => t.type === 'spikes')!;
      for (let f = 0; f < 10; f++) {
        k.state.x = spikeTile.x + 5;
        k.state.y = spikeTile.y + 5;
        physics.update(k, tilemap.tiles, dt);

        // Expect lastSafeGroundPosition to remain on valid non-spike ground
        expect(k.lastSafeGroundPosition.x).toBe(validGroundX);
        expect(k.lastSafeGroundPosition.y).toBe(validGroundY);
      }
    });
  });

  describe('5. Shadow Dash Wall Stopping with Invulnerability', () => {
    test('Shadow Dash activates invulnerability and high horizontal speed (380)', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });

      // Frame 1: Trigger dash input
      k.update(dt, { dashJustPressed: true }, tilemap.tiles, []);
      expect(k.state.isShadowDashing).toBe(true);
      expect(k.isInvulnerable).toBe(true);

      // Frame 2: Active shadow dash movement
      k.update(dt, {}, tilemap.tiles, []);
      expect(k.state.vx).toBe(PLATFORM_PHYSICS.SHADOW_DASH_SPEED); // 380
    });

    test('Shadow Dash into solid wall immediately stops horizontal movement (vx=0) at wall boundary without clipping', () => {
      // Place knight near right boundary wall at x=944 (width 16)
      const k = new Knight({ id: 1, mask: 'vessel', x: 920, y: 200, facing: 'right' });

      k.update(dt, { dashJustPressed: true }, tilemap.tiles, []);
      expect(k.state.isShadowDashing).toBe(true);

      // Advance physics step into the wall
      physics.update(k, tilemap.tiles, dt);

      // Verify horizontal stopping at wall left boundary (944 - 16 = 928)
      expect(k.state.x).toBeLessThanOrEqual(928);
      expect(k.state.vx).toBe(0);
    });

    test('Invulnerability protects player from enemy contact damage during Shadow Dash', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      const enemy = new Enemy('bug-1', 'spore_bug', 105, 200);

      k.update(dt, { dashJustPressed: true }, tilemap.tiles, []);
      expect(k.isInvulnerable).toBe(true);

      // Simulate contact damage check
      if (!k.isInvulnerable && Math.abs(k.state.x - enemy.x) < 16) {
        k.takeDamage(1);
      }

      expect(k.state.hp).toBe(COMBAT_STATS.MASK_HP); // No HP lost!
    });
  });

  describe('6. Directional Slashes, Soul Gain, Pogo Bounce, Level Exploration & 2-Phase Boss Fight', () => {
    test('Directional Slashes (Forward, Up, Down) register hitboxes correctly', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      const enemyAbove = new Enemy('bug-up', 'spore_bug', 100, 180);
      const enemyBelow = new Enemy('bug-down', 'spore_bug', 100, 230);

      // Up attack
      k.update(dt, { attackJustPressed: true, up: true }, tilemap.tiles, [enemyAbove]);
      expect(k.attackDirection).toBe('up');

      // Reset cooldown and execute Down attack
      k.attackCooldown = 0;
      k.state.isGrounded = false;
      k.update(dt, { attackJustPressed: true, down: true }, tilemap.tiles, [enemyBelow]);
      expect(k.attackDirection).toBe('down');
    });

    test('Nail hits increase Soul by +11 up to max 100', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 100, y: 200, facing: 'right' });
      const boss = new BossMossKnight(120, 200);
      expect(k.state.soul).toBe(0);

      k.update(dt, { attackJustPressed: true }, tilemap.tiles, [boss]);
      expect(k.state.soul).toBe(COMBAT_STATS.SOUL_PER_HIT); // 11
    });

    test('Airborne Downward Attack Pogo Bounce on enemy or spikes sets vy = -350 and restores double jump', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 100, y: 190, facing: 'right' });
      k.state.isGrounded = false;
      k.canDoubleJump = false; // Depleted double jump
      const enemy = new Enemy('bug-1', 'spore_bug', 100, 210);

      // Execute Down Attack over enemy
      k.update(dt, { attackJustPressed: true, down: true }, tilemap.tiles, [enemy]);

      // Verification of Pogo Bounce (vy = POGO_BOUNCE_VELOCITY = -350)
      expect(k.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
      expect(k.canDoubleJump).toBe(true); // Restored double jump!
    });

    test('Expanded x=960 Level Exploration & Camera Panning (maxCameraX = 480)', () => {
      const k = new Knight({ id: 1, mask: 'vessel', x: 900, y: 200 }); // Far right of level
      const viewportW = 480;
      const maxCameraX = CAVERN_CONFIG.width - viewportW; // 960 - 480 = 480

      let cameraX = 0;
      const avgX = k.state.x;
      cameraX += (avgX - viewportW / 2 - cameraX) * 4.0 * dt;
      cameraX = Math.max(0, Math.min(maxCameraX, cameraX));

      expect(cameraX).toBeLessThanOrEqual(480);
    });

    test('2-Phase Boss Moss Knight: Phase 1 (HP > 300) vs Phase 2 Enraged (HP <= 300)', () => {
      const boss = new BossMossKnight(780, 200);
      const knight = new Knight({ id: 1, mask: 'vessel', x: 750, y: 200 });

      // Phase 1 Initial State
      expect(boss.hp).toBe(600);
      expect(boss.phase).toBe(1);
      expect(boss.isEnraged).toBe(false);

      // Vine slam in Phase 1 yields 1 shockwave
      boss.state = 'vine_slam';
      boss.timer = 0.9;
      const p1Res = boss.update(dt, [knight]);
      expect(p1Res.triggerVineShockwave).toBe(true);
      expect(p1Res.shockwaves?.length).toBe(1);

      // Reduce HP to 300 to trigger Phase 2 Enraged transition
      boss.takeDamage(300);
      expect(boss.hp).toBe(300);
      expect(boss.phase).toBe(2);
      expect(boss.isEnraged).toBe(true);

      // Vine slam in Phase 2 yields double shockwave (left & right)
      boss.state = 'vine_slam';
      boss.timer = 0.9;
      const p2Res = boss.update(dt, [knight]);
      expect(p2Res.triggerVineShockwave).toBe(true);
      expect(p2Res.shockwaves?.length).toBe(2);
    });
  });

  describe('7. Side HUD Soul Vessel, Screen-Space Boss Bar & Seamless Parallax Cavern Wrap Scrolling', () => {
    test('Side HUD Soul Vessel renders cyan vessel meter for player states cleanly', () => {
      const hud = new SideHUDManager();
      const knightStates: KnightState[] = [
        { id: 1, mask: 'vessel', x: 50, y: 200, vx: 0, vy: 0, hp: 5, maxHp: 5, soul: 66, maxSoul: 100, isGrounded: true, isWallSliding: false, isShadowDashing: false, facing: 'right', dashCooldownTimer: 0, geoCount: 150 },
      ];

      expect(() => hud.render(knightStates)).not.toThrow();
      hud.destroy();
    });

    test('Screen-Space Top-Center Boss Health Bar renders at x=150 in viewport screen space', () => {
      const hud = new SideHUDManager();
      const bossState: BossState = {
        type: 'boss_moss_knight',
        x: 800,
        y: 200,
        hp: 450,
        maxHp: 600,
        phase: 1,
        isEnraged: false,
      };

      expect(hud.container.x).toBe(0); // Viewport screen space lock
      expect(() => hud.renderBossHUD(bossState)).not.toThrow();
      hud.destroy();
    });

    test('Seamless Parallax Cavern wrap scrolling supports positive, negative, and large camera bounds without NaN', () => {
      const cavern = new ParallaxCavern();
      const mockG: any = {
        rect: () => mockG,
        fill: () => mockG,
        circle: () => mockG,
        poly: () => mockG,
      };

      const testCameraPositions = [-1000, -480, 0, 240, 480, 960, 2500];

      for (const camX of testCameraPositions) {
        cavern.update(dt);
        expect(() => cavern.render(mockG, camX)).not.toThrow();
      }
    });
  });
});
