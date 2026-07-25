# Handoff Report: Challenger 1 — Milestone 1 (Controls & Lounge Bypass R1)

## Verdict: FAIL

### Summary of Findings
While keybinding definitions (R1a) and Hero Lounge Enter/Space bypass mechanics (R1b) are properly set up, Requirement R1c fails due to critical physics clipping and ground state instability at spawn. Specifically:
1. **Knight 4 Spawn Clipping**: Player 4 spawns at `(170, 200)`. Knight width is 16, so its horizontal span is `[170, 186]`. Totem Pillar 1 in `CavernTilemap.ts:42` is located at `x: 180..204` and `y: 174..238`. Because `186 > 180` and `200..224` falls inside `174..238`, Knight 4 spawns embedded 6 pixels deep inside Totem Pillar 1, causing an instant vertical snap-teleport to `y = 150` (top of Totem Pillar 1) on frame 1.
2. **Grounded State Flickering Bug**: `PlatformPhysics.ts:86` uses strict inequality `kBottom > tTop` for AABB collision detection. When a knight lands at `y = 214`, `kBottom` equals `238` and `tTop` equals `238`. The condition `238 > 238` evaluates to `false`, causing `isGrounded` to drop to `false` on alternating frames, triggering gravity dips and unstable jump behavior.

---

## 1. Observation
- `src/games/hollow-clash/index.ts:92-97`:
  ```ts
  const startPositions = [
    { x: 50, y: 200 },
    { x: 90, y: 200 },
    { x: 130, y: 200 },
    { x: 170, y: 200 },
  ];
  ```
- `src/games/hollow-clash/entities/Knight.ts:31-32`:
  ```ts
  public width = 16;
  public height = 24;
  ```
- `src/games/hollow-clash/systems/CavernTilemap.ts:42`:
  ```ts
  { x: 180, y: h - 96, width: 24, height: 64, isSolid: true, type: 'stone' }, // Totem Pillar 1 at y = 174
  ```
- `src/games/hollow-clash/systems/PlatformPhysics.ts:75-87`:
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

    return kLeft < tRight && kRight > tLeft && kTop < tBottom && kBottom > tTop;
  }
  ```
- `src/games/hollow-clash/manifest.ts:26-84`:
  - Confirmed P1 bindings: `moveLeft: ['KeyA']`, `moveRight: ['KeyD']`, `moveUp: ['KeyW']`, `moveDown: ['KeyS']`, `action: ['ControlLeft']`, `skill: ['ShiftLeft']`, `focus: ['ShiftLeft']`, `pause: ['Escape']`.
  - Confirmed P2 bindings: `moveLeft: ['ArrowLeft']`, `moveRight: ['ArrowRight']`, `moveUp: ['ArrowUp']`, `moveDown: ['ArrowDown']`, `action: ['ControlRight']`, `skill: ['ShiftRight']`, `focus: ['ShiftRight']`, `pause: ['Escape']`.
- `src/games/hollow-clash/screens/HeroLoungeScreen.ts:11-16 & 48-53`:
  - `selections` initializes all 4 slots with `isReady: false`.
  - `isAllReady(count)` returns `false` initially.
- `src/games/hollow-clash/index.ts:76-80`:
  - `handleGlobalKeyDown` sets `this.lounge.startRequested = true` on `Enter` or `' '` (Space) keypress.

---

## 2. Logic Chain
1. P1 & P2 Keybindings (R1a): P1 and P2 controls match all requirements cleanly, do not collide with each other, and satisfy R1a.
2. Hero Lounge Bypass (R1b): Defaulting `isReady` to `false` prevents unwanted auto-start. Keydown listener listening for `Enter` and `Space` sets `startRequested = true`, properly bypassing the lounge phase into the cavern playing state on keypress.
3. Knight Spawn Bounds (R1c):
   - Knights 1, 2, and 3 (spawned at x=50, 90, 130) occupy x-spans `[50, 66]`, `[90, 106]`, and `[130, 146]`. At `y=200..224`, they spawn in free space between Floating Ledge 1 (`y=180..196`) and the Main Floor (`y=238..270`).
   - However, Knight 4 (spawned at x=170) occupies x-span `[170, 186]`. Totem Pillar 1 is at `x=180..204`, extending from `y=174` down to `y=238`. Because `186 > 180` and `224 > 174`, Knight 4's rightmost 6 pixels overlap Totem Pillar 1 on spawn.
   - On frame 1 of physics update, because horizontal movement delta `dx = 0`, horizontal collision resolution does not separate the knight. Vertical physics sees `dy > 0` (from gravity) while inside the pillar's bounding box and resolves vertical collision by setting `knight.y = tile.y - height = 174 - 24 = 150`, teleporting Knight 4 to the top of Totem Pillar 1.
4. Grounded Physics Instability:
   - When resting at `y = 214`, `kBottom` is `238`. Main floor `tTop` is `238`.
   - `checkAABB` evaluates `kBottom > tTop` (`238 > 238`), which is `false`.
   - Because `checkAABB` returns `false`, `isGrounded` is cleared to `false` on the subsequent frame, causing gravity to pull the knight down by ~0.33 pixels, which then triggers collision and sets `isGrounded = true` on the next frame.
   - This creates an infinite `isGrounded` state flicker every frame.

---

## 3. Caveats
- No caveats. The empirical test suite (`src/games/hollow-clash/HollowClash.test.ts`) reproduces these findings deterministically.

---

## 4. Conclusion & Recommended Action
Verdict: **FAIL**.

### Required Fixes for Worker:
1. **Fix Knight 4 Spawn Position or Totem Pillar Placement**: Shift Knight 4 spawn position left (e.g. `{ x: 50, y: 200 }`, `{ x: 80, y: 200 }`, `{ x: 110, y: 200 }`, `{ x: 140, y: 200 }`) so all 4 knights spawn within `x=50..156` (comfortably clear of Totem Pillar 1 at `x=180`), OR adjust Totem Pillar 1 placement.
2. **Fix Ground Collision AABB Check**: In `PlatformPhysics.ts:86`, update `kBottom > tTop` to `kBottom >= tTop` (or use a small epsilon tolerance `kBottom >= tTop - 0.01`) so that knights standing on a tile remain grounded without frame-by-frame state flickering.

---

## 5. Verification Method
1. Run test suite:
   ```bash
   npm run test
   ```
   All 17 tests (including 9 empirical verification tests in `src/games/hollow-clash/HollowClash.test.ts`) execute and pass.
2. Run build command:
   ```bash
   npm run build
   ```
   Output: built cleanly in ~256ms with exit code 0.
