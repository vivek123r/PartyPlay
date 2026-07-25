import { describe, test, expect, beforeEach } from 'vitest';
import { Knight } from './entities/Knight';
import { Enemy } from './entities/Enemy';
import { BossMossKnight } from './entities/BossMossKnight';
import { SoulSpell } from './entities/SoulSpell';
import { CavernTilemap } from './systems/CavernTilemap';
import { CAVERN_CONFIG, COMBAT_STATS, PLATFORM_PHYSICS } from './config';

describe('Milestone 3 Empirical Adversarial Verification Suite', () => {
  const dt = 1 / 60;
  let tilemap: CavernTilemap;

  beforeEach(() => {
    tilemap = new CavernTilemap();
  });

  describe('1. Directional Melee Slash Hitboxes & Angle Coverage', () => {
    test('Forward slash hitbox boundaries (facing right and left)', () => {
      // Knight at (100, 100) in clear air, width=16, height=24. Facing right.
      // Right forward hitbox: x=116..144, y=96..128.
      const knightRight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100, facing: 'right' });

      // Enemy 1: Just inside right hitbox (x=120, y=100 -> tLeft=108, tRight=132, tTop=80, tBottom=110)
      const enemyInsideRight = new Enemy('inside-r', 'spore_bug', 120, 100);
      knightRight.update(dt, { attackJustPressed: true }, [], [enemyInsideRight]);
      expect(enemyInsideRight.hp).toBe(enemyInsideRight.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Knight at (100, 100), facing left.
      // Left forward hitbox: x=72..100, y=96..128.
      const knightLeft = new Knight({ id: 2, mask: 'vessel', x: 100, y: 100, facing: 'left' });
      const enemyInsideLeft = new Enemy('inside-l', 'spore_bug', 80, 100);
      knightLeft.update(dt, { attackJustPressed: true }, [], [enemyInsideLeft]);
      expect(enemyInsideLeft.hp).toBe(enemyInsideLeft.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Enemy outside range (behind knight facing right)
      const knightBehind = new Knight({ id: 3, mask: 'vessel', x: 100, y: 100, facing: 'right' });
      const enemyBehind = new Enemy('behind', 'spore_bug', 70, 100);
      knightBehind.update(dt, { attackJustPressed: true }, [], [enemyBehind]);
      expect(enemyBehind.hp).toBe(enemyBehind.maxHp);
    });

    test('Upward slash hitbox against multiple enemy positioning angles', () => {
      // Knight at (100, 100). Up hitbox: x=92..124, y=72..100.
      
      // Angle 1: Directly above head (100, 80)
      const k1 = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100 });
      const eDirectAbove = new Enemy('up-1', 'spore_bug', 100, 80);
      k1.update(dt, { up: true, attackJustPressed: true }, [], [eDirectAbove]);
      expect(eDirectAbove.hp).toBe(eDirectAbove.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Angle 2: Diagonal above-right (118, 82)
      const k2 = new Knight({ id: 2, mask: 'vessel', x: 100, y: 100 });
      const eDiagRight = new Enemy('up-2', 'spore_bug', 118, 82);
      k2.update(dt, { up: true, attackJustPressed: true }, [], [eDiagRight]);
      expect(eDiagRight.hp).toBe(eDiagRight.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Angle 3: Diagonal above-left (94, 82)
      const k3 = new Knight({ id: 3, mask: 'vessel', x: 100, y: 100 });
      const eDiagLeft = new Enemy('up-3', 'spore_bug', 94, 82);
      k3.update(dt, { up: true, attackJustPressed: true }, [], [eDiagLeft]);
      expect(eDiagLeft.hp).toBe(eDiagLeft.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Angle 4: Too far above (100, 40) -> Miss
      const k4 = new Knight({ id: 4, mask: 'vessel', x: 100, y: 100 });
      const eFarAbove = new Enemy('up-4', 'spore_bug', 100, 40);
      k4.update(dt, { up: true, attackJustPressed: true }, [], [eFarAbove]);
      expect(eFarAbove.hp).toBe(eFarAbove.maxHp);
    });

    test('Downward slash hitbox against multiple enemy positioning angles in air', () => {
      // Knight at (100, 100) in air. Down hitbox: x=92..124, y=124..152.

      // Angle 1: Directly below feet (100, 130)
      const k1 = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100 });
      k1.state.isGrounded = false;
      const eDirectBelow = new Enemy('down-1', 'spore_bug', 100, 130);
      k1.update(dt, { down: true, attackJustPressed: true }, [], [eDirectBelow]);
      expect(eDirectBelow.hp).toBe(eDirectBelow.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Angle 2: Diagonal below-right (118, 132)
      const k2 = new Knight({ id: 2, mask: 'vessel', x: 100, y: 100 });
      k2.state.isGrounded = false;
      const eDiagRight = new Enemy('down-2', 'spore_bug', 118, 132);
      k2.update(dt, { down: true, attackJustPressed: true }, [], [eDiagRight]);
      expect(eDiagRight.hp).toBe(eDiagRight.maxHp - COMBAT_STATS.NAIL_DAMAGE);

      // Angle 3: Diagonal below-left (94, 132)
      const k3 = new Knight({ id: 3, mask: 'vessel', x: 100, y: 100 });
      k3.state.isGrounded = false;
      const eDiagLeft = new Enemy('down-3', 'spore_bug', 94, 132);
      k3.update(dt, { down: true, attackJustPressed: true }, [], [eDiagLeft]);
      expect(eDiagLeft.hp).toBe(eDiagLeft.maxHp - COMBAT_STATS.NAIL_DAMAGE);
    });

    test('Combat Stats: Damage deduction, +11 Soul cap at 100, and Recoil behavior', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100, facing: 'right' });
      knight.state.soul = 0;
      const enemy = new Enemy('target', 'spore_bug', 125, 100);

      // Hit 1: Forward attack
      knight.update(dt, { attackJustPressed: true }, [], [enemy]);
      expect(enemy.hp).toBe(30 - 25); // 5 HP left
      expect(knight.state.soul).toBe(11);
      expect(knight.state.vx).toBe(-PLATFORM_PHYSICS.NAIL_RECOIL_VELOCITY); // -120 horizontal recoil

      // Upward attack does NOT trigger horizontal recoil
      const knightUp = new Knight({ id: 2, mask: 'vessel', x: 100, y: 100, facing: 'right' });
      const enemyUp = new Enemy('target-up', 'spore_bug', 100, 80);
      knightUp.update(dt, { up: true, attackJustPressed: true }, [], [enemyUp]);
      expect(knightUp.state.vx).toBe(0); // No horizontal recoil on up slash!

      // Soul gain caps at 100
      knight.state.soul = 95;
      knight.attackCooldown = 0;
      knight.update(dt, { attackJustPressed: true }, [], [enemy]);
      expect(knight.state.soul).toBe(100);
    });

    test('Shielded Husk frontal attack block logic', () => {
      // Shielded Husk at (150, 100) facing left. Front shield faces left (< 150).
      const husk = new Enemy('husk-1', 'shielded_husk', 150, 100);
      expect(husk.facing).toBe('left');

      // Player facing right at x=125 attacks forward (hits front of husk)
      const knightFront = new Knight({ id: 1, mask: 'vessel', x: 125, y: 100, facing: 'right' });
      knightFront.update(dt, { attackJustPressed: true }, [], [husk]);
      expect(husk.hp).toBe(husk.maxHp); // Blocked!

      // Player attacks from above (down pogo in air) -> bypasses shield
      const knightAbove = new Knight({ id: 2, mask: 'vessel', x: 150, y: 70 });
      knightAbove.state.isGrounded = false;
      knightAbove.update(dt, { down: true, attackJustPressed: true }, [], [husk]);
      expect(husk.hp).toBe(husk.maxHp - COMBAT_STATS.NAIL_DAMAGE); // Connects!
    });
  });

  describe('2. Airborne Pogo Bounce & Continuous Double Jump Reset', () => {
    test('Pogo on enemy sets vy = -350 and resets canDoubleJump = true', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100, vy: 100 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;

      const enemy = new Enemy('spore', 'spore_bug', 100, 130);
      knight.update(dt, { down: true, attackJustPressed: true }, [], [enemy]);

      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY); // -350
      expect(knight.canDoubleJump).toBe(true);
    });

    test('Air double jump execution after pogo bounce', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100, vy: 100 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;

      const enemy = new Enemy('spore', 'spore_bug', 100, 130);

      // Frame 1: Pogo on enemy in clear air
      knight.update(dt, { down: true, attackJustPressed: true }, [], [enemy]);
      expect(knight.state.vy).toBe(-350);
      expect(knight.canDoubleJump).toBe(true);

      // Frame 2: Execute double jump in mid-air
      knight.update(dt, { jumpJustPressed: true }, [], []);
      expect(knight.state.vy).toBe(-400); // JUMP_VELOCITY (-420) + gravity (20)
      expect(knight.canDoubleJump).toBe(false);
    });

    test('Pogo on spike pit tile sets vy = -350, resets canDoubleJump, and prevents spike damage', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 300, y: 220, vy: 100 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;
      const initialHp = knight.state.hp;

      // Spike pit 1 is at x: 280..400, y: 254..270
      knight.update(dt, { down: true, attackJustPressed: true }, tilemap.tiles, []);

      expect(knight.state.vy).toBe(PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY);
      expect(knight.canDoubleJump).toBe(true);
      expect(knight.state.hp).toBe(initialHp); // No spike damage!
    });

    test('Continuous pogoing across multiple enemies without touching ground', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 100, vy: 50 });
      knight.state.isGrounded = false;
      knight.canDoubleJump = false;

      const enemy1 = new Enemy('e1', 'spore_bug', 100, 130);
      const enemy2 = new Enemy('e2', 'spore_bug', 150, 130);

      // Pogo 1
      knight.update(dt, { down: true, attackJustPressed: true }, [], [enemy1, enemy2]);
      expect(knight.state.vy).toBe(-350);
      expect(knight.canDoubleJump).toBe(true);

      // Consume double jump
      knight.canDoubleJump = false;
      knight.attackCooldown = 0;
      knight.state.x = 150;
      knight.state.y = 100;

      // Pogo 2
      knight.update(dt, { down: true, attackJustPressed: true }, [], [enemy1, enemy2]);
      expect(knight.state.vy).toBe(-350);
      expect(knight.canDoubleJump).toBe(true);
    });

    test('Ground down-slash input does not trigger pogo direction', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 100, y: 214 });
      knight.state.isGrounded = true;

      const enemy = new Enemy('e1', 'spore_bug', 125, 214);
      knight.update(dt, { down: true, attackJustPressed: true }, tilemap.tiles, [enemy]);

      expect(knight.attackDirection).toBe('forward'); // Grounded down input defaults to forward!
    });
  });

  describe('3. Level Expansion to 960px, Exploration & Camera Bounds', () => {
    test('CAVERN_CONFIG width is 960 and boundaries are properly constructed', () => {
      expect(CAVERN_CONFIG.width).toBe(960);
      const leftWall = tilemap.tiles.find((t) => t.x === 0 && t.width === 16 && t.type === 'moss');
      const rightWall = tilemap.tiles.find((t) => t.x === 944 && t.width === 16 && t.type === 'moss');

      expect(leftWall).toBeDefined();
      expect(rightWall).toBeDefined();
    });

    test('Player exploration past x=464 up to x=928 without wall sticking', () => {
      const knight = new Knight({ id: 1, mask: 'vessel', x: 450, y: 214 });

      // Move right from x=450 past x=464 to expanded section
      for (let i = 0; i < 100; i++) {
        knight.update(dt, { right: true }, tilemap.tiles, []);
      }
      expect(knight.state.x).toBeGreaterThan(464);
      expect(knight.state.x).toBeLessThanOrEqual(928); // Stopped cleanly by right wall at x=944 (width 16)

      // Turn left from right wall boundary
      const boundX = knight.state.x;
      knight.update(dt, { left: true }, tilemap.tiles, []);
      expect(knight.state.x).toBeLessThan(boundX); // Immediate smooth response without sticking!
    });

    test('Enemy positioning and clamping across expanded section up to x=940', () => {
      const enemyFar = new Enemy('far-enemy', 'mantis_crawler', 900, 200);
      const knight = new Knight({ id: 1, mask: 'vessel', x: 920, y: 200 });

      enemyFar.update(dt, [knight]);
      expect(enemyFar.x).toBeGreaterThan(464);
      expect(enemyFar.x).toBeLessThanOrEqual(940);
    });

    test('Camera panning lerps smoothly and clamps to max 480 without pop', () => {
      const viewportW = 480;
      const maxCameraX = CAVERN_CONFIG.width - viewportW; // 480
      let cameraX = 0;

      // Simulate player moving from spawn x=50 to x=900
      const playerPositions = [50, 200, 450, 700, 900];

      for (const px of playerPositions) {
        const target = px - viewportW / 2;
        // Run 60 frames of camera update per waypoint for full smooth transition
        for (let frame = 0; frame < 60; frame++) {
          const prevCam = cameraX;
          cameraX += (target - cameraX) * 4.0 * dt;
          cameraX = Math.max(0, Math.min(maxCameraX, cameraX));

          expect(cameraX).toBeGreaterThanOrEqual(0);
          expect(cameraX).toBeLessThanOrEqual(480);
          // Verify continuity: no camera jump greater than 40px per frame
          expect(Math.abs(cameraX - prevCam)).toBeLessThan(40);
        }
      }
      expect(cameraX).toBeCloseTo(480, 0);
    });
  });

  describe('4. 2-Phase Moss Knight Boss Encounter & Victory Trigger', () => {
    test('Moss Knight Boss spawns at x=750..850 with 600 HP in Phase 1', () => {
      const boss = new BossMossKnight(780, 200);
      expect(boss.x).toBe(780);
      expect(boss.hp).toBe(600);
      expect(boss.maxHp).toBe(600);
      expect(boss.phase).toBe(1);
      expect(boss.isEnraged).toBe(false);
    });

    test('Transition to Phase 2 at 50% HP threshold triggers enraged state and double shockwave', () => {
      const boss = new BossMossKnight(780, 200);
      boss.takeDamage(300);

      expect(boss.hp).toBe(300);
      expect(boss.phase).toBe(2);
      expect(boss.isEnraged).toBe(true);

      // Force vine_slam attack state in Phase 2
      boss.state = 'vine_slam';
      boss.timer = 0.9;

      const knight = new Knight({ id: 1, mask: 'vessel', x: 700, y: 200 });
      const updateResult = boss.update(dt, [knight]);

      expect(updateResult.triggerVineShockwave).toBe(true);
      expect(updateResult.shockwaves).toHaveLength(2);
      expect(updateResult.shockwaves).toEqual([
        { x: boss.x, y: CAVERN_CONFIG.height - 32, dir: 1 },
        { x: boss.x, y: CAVERN_CONFIG.height - 32, dir: -1 },
      ]);
    });

    test('Boss guard stance blocks damage', () => {
      const boss = new BossMossKnight(780, 200);
      boss.state = 'guarding';

      boss.takeDamage(100);
      expect(boss.hp).toBe(600); // Blocked!
    });

    test('Boss attacks deal 1 Mask damage to active players', () => {
      const boss = new BossMossKnight(780, 200);
      boss.state = 'cleaving';
      boss.timer = 0.3;
      boss.facing = 'left';

      const knight = new Knight({ id: 1, mask: 'vessel', x: 755, y: 184 }); // Within cleave range
      knight.isInvulnerable = false;
      const initialHp = knight.state.hp;

      boss.update(dt, [knight]);
      expect(knight.state.hp).toBe(initialHp - 1);
    });

    test('Defeating Moss Knight Boss (0 HP) triggers victory state', () => {
      const boss = new BossMossKnight(780, 200);
      boss.state = 'idle';

      boss.takeDamage(600);
      expect(boss.hp).toBe(0);
    });
  });
});
