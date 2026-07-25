# Handoff Report — Milestone 1 Re-verification (Challenger 2)

## Verdict: FAIL

---

## 1. Observation

- **Tool Execution & Build / Unit Test Status**:
  - `npm run build`: Exit code 0, 819 modules transformed, `dist/assets/hollow-clash-D3MA35w1.js` built in 307ms.
  - `npm run test`: Exit code 0, 17/17 tests passed (9/9 in `HollowClash.test.ts`).

- **Inspection 1 (Knight Spawn Positions)**:
  In `/home/viv/Projects/PartyPlay/src/games/hollow-clash/index.ts`, lines 92–97:
  ```ts
  const startPositions = [
    { x: 50, y: 200 },
    { x: 80, y: 200 },
    { x: 110, y: 200 },
    { x: 140, y: 200 },
  ];
  ```
  Knight 4 spawns at `(140, 200)` with bounding box `x=140..156, y=200..224`. Totem Pillar 1 in `CavernTilemap.ts` is at `x=180..204, y=174..238`. There is 24px of clear horizontal space between Knight 4 and Totem Pillar 1. When updated, Knight 4 falls vertically to cavern floor `y=214`.

- **Inspection 2 (Hero Lounge Enter/Space Bypass)**:
  In `/home/viv/Projects/PartyPlay/src/games/hollow-clash/index.ts`, lines 76–80 & 138:
  ```ts
  private handleGlobalKeyDown(e: KeyboardEvent): void {
    if (this.isLoungePhase && (e.key === 'Enter' || e.key === ' ')) {
      this.lounge.startRequested = true;
    }
  }
  ```
  `lounge.startRequested = true` triggers `this.startCavernPhase()` on the next frame, starting the game instantly.

- **Inspection 3 (Keybindings)**:
  In `/home/viv/Projects/PartyPlay/src/games/hollow-clash/manifest.ts`, default controls are correctly set:
  - P1: `moveLeft: KeyA`, `moveRight: KeyD`, `moveUp: KeyW`, `moveDown: KeyS`, `action: ControlLeft`, `skill: ShiftLeft`
  - P2: `moveLeft: ArrowLeft`, `moveRight: ArrowRight`, `moveUp: ArrowUp`, `moveDown: ArrowDown`, `action: ControlRight`, `skill: ShiftRight`

- **Observation 4 (CRITICAL REGRESSION BUG in PlatformPhysics.ts)**:
  In `/home/viv/Projects/PartyPlay/src/games/hollow-clash/systems/PlatformPhysics.ts`, line 86:
  ```ts
  private checkAABB(kx: number, ky: number, kw: number, kh: number, tile: PlatformTile): boolean {
    const kLeft = kx;
    const kRight = kx + kw;
    const kTop = ky;
    const kBottom = ky + kh;

    const tLeft = tile.x;
    const tRight = tile.x + tile.width;
    const tTop = tile.y;
    const tBottom = tile.y + tile.height;

    return kLeft < tRight && kRight > tLeft && kTop < tBottom && kBottom >= tTop;
  }
  ```
  Lines 32–51:
  ```ts
  // Horizontal Movement & Collisions
  knight.x += dx;
  for (const tile of tiles) {
    if (!tile.isSolid) continue;

    if (this.checkAABB(knight.x, knight.y, this.knightWidth, this.knightHeight, tile)) {
      if (dx > 0) {
        knight.x = tile.x - this.knightWidth;
        knight.vx = 0;
        if (knight.vy > 0 && knight.facing === 'right' && tile.type === 'moss') {
          knight.isWallSliding = true;
        }
      } else if (dx < 0) {
        knight.x = tile.x + tile.width;
        knight.vx = 0;
        if (knight.vy > 0 && knight.facing === 'left' && tile.type === 'moss') {
          knight.isWallSliding = true;
        }
      }
    }
  }
  ```

- **Empirical Execution Result**:
  Running an empirical test simulation of horizontal movement for a knight standing grounded on the floor (`x=50, y=214` on floor tile `x=0..280, y=238..270`):
  ```
  Initial resting state: x=50, y=214, isGrounded=true
  Input: moveRight (dx > 0)
  Result: x=-16, y=214, isGrounded=false

  Initial resting state: x=100, y=214, isGrounded=true
  Input: moveLeft (dx < 0)
  Result: x=280, y=214, isGrounded=false
  ```
  Attempting to walk right on the ground immediately teleports the knight to `x = -16` (off-screen left). Attempting to walk left immediately teleports the knight to `x = 280` (right edge of the floor tile).

---

## 2. Logic Chain

1. *Observation*: Worker 2 modified `checkAABB()` in `PlatformPhysics.ts` line 86 from strict inequality `kBottom > tTop` to inclusive inequality `kBottom >= tTop`.
2. *Deduction*: When a knight rests on the floor (`y=214`, height 24, `kBottom=238`, floor `tTop=238`), `kBottom >= tTop` evaluates to `238 >= 238 = true`.
3. *Observation*: `checkAABB()` is invoked inside BOTH horizontal collision resolution (lines 33–51) AND vertical collision resolution (lines 55–72).
4. *Deduction*: When player inputs horizontal movement while standing on the floor (e.g. `moveRight` with `dx > 0`), line 32 updates `knight.x` to `52`. Line 36 calls `this.checkAABB(52, 214, 16, 24, floorTile)`.
5. *Deduction*: `checkAABB` evaluates:
   - `kLeft < tRight`: `52 < 280` (true)
   - `kRight > tLeft`: `68 > 0` (true)
   - `kTop < tBottom`: `214 < 270` (true)
   - `kBottom >= tTop`: `238 >= 238` (true)
   Thus `checkAABB()` returns `true` for the floor tile during horizontal movement processing!
6. *Deduction*: Because `dx > 0`, line 38 executes: `knight.x = tile.x - this.knightWidth` -> `0 - 16 = -16`. The knight is instantly teleported to `x = -16`.
7. *Deduction*: In the subsequent vertical pass, at `x = -16`, there is no floor tile under `x = -16`, so `isGrounded` is set to `false`.
8. *Conclusion*: Worker 2's unit test in `HollowClash.test.ts` only tested stationary knights with `{ left: false, right: false, up: false, down: false }`. It failed to test horizontal player movement while grounded. Inclusive `kBottom >= tTop` in generic `checkAABB()` completely breaks player movement controls.

---

## 3. Caveats

No caveats. The failure was empirically reproduced with 100% deterministic output.

---

## 4. Conclusion

**Verdict: FAIL**

While Knight 4's spawn position fix (`x=140`) and Hero Lounge Enter/Space bypass are working correctly:
1. **Critical Failure**: Grounded horizontal movement is completely broken. Any attempt to move left or right while grounded teleports the player to `x=-16` or `x=280`.
2. **Root Cause**: Worker 2 changed `checkAABB()` to use inclusive `kBottom >= tTop`. Generic `checkAABB()` must use strict inequalities (`kBottom > tTop` and `kTop < tBottom`) for collision detection so that resting surfaces are not treated as vertical obstacle walls during horizontal movement.
3. **Required Fix for Remediation**:
   - Restore strict inequality in `checkAABB()`:
     `return kLeft < tRight && kRight > tLeft && kTop < tBottom && kBottom > tTop;`
   - For vertical grounding without flickering, check grounded state in vertical pass when `dy >= 0` by testing if `kBottom` is touching or within epsilon of `tTop` (e.g. `Math.abs(kBottom - tTop) < 0.01` or testing `checkAABB` with `kBottom + 1` specifically for ground contact), OR separate `checkAABB` from ground contact probing.
   - Add unit tests verifying horizontal movement while grounded (`{ right: true }` and `{ left: true }`).

---

## 5. Verification Method

To independently reproduce the bug:
1. Run the following node command in `/home/viv/Projects/PartyPlay/src/games/hollow-clash`:
   ```bash
   npx tsx -e "
   import { Knight } from './entities/Knight';
   import { CavernTilemap } from './systems/CavernTilemap';
   const knight = new Knight({ id: 1, mask: 'vessel', x: 50, y: 200 });
   const tilemap = new CavernTilemap();
   for (let i = 0; i < 10; i++) knight.update(1/60, { left: false, right: false, up: false, down: false }, tilemap.tiles, []);
   console.log('Before move:', knight.state.x, knight.state.y);
   knight.update(1/60, { left: false, right: true, up: false, down: false }, tilemap.tiles, []);
   console.log('After moveRight:', knight.state.x, knight.state.y);
   "
   ```
2. **Expected vs Actual**:
   - Expected: `After moveRight: 52 214`
   - Actual (Current Code): `After moveRight: -16 214` (Bug confirmed).
