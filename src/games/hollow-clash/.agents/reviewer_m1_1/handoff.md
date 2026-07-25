# Review Report: Milestone 1 (R1 - Controls & Lounge Bypass)

## VERDICT: FAIL

---

## 1. Observation

### Build & Verification Commands
- `npm run build` executed in `/home/viv/Projects/PartyPlay`:
  - Result: `✓ built in 254ms`, exit code `0`. Zero build or compilation errors.
- `npm run test` executed in `/home/viv/Projects/PartyPlay`:
  - Result: `Test Files 1 passed (1), Tests 8 passed (8)`, exit code `0`.

### Code Review Findings

#### Major Finding: Player 4 Spawn Geometry Collision with Ancient Totem Pillar 1
- **Location**: `src/games/hollow-clash/index.ts:92` & `src/games/hollow-clash/systems/CavernTilemap.ts:42` & `src/games/hollow-clash/systems/PlatformPhysics.ts:33-72`.
- **Detail**:
  - `startPositions` defined in `index.ts:92`:
    ```ts
    const startPositions = [
      { x: 50, y: 200 },
      { x: 90, y: 200 },
      { x: 130, y: 200 },
      { x: 170, y: 200 },
    ];
    ```
  - Knight width is `16` and height is `24`. Player 4 spawned at `(x: 170, y: 200)` occupies horizontal span `x: [170, 186]` and vertical span `y: [200, 224]`.
  - Pillar 1 defined in `CavernTilemap.ts:42`:
    ```ts
    { x: 180, y: h - 96, width: 24, height: 64, isSolid: true, type: 'stone' }
    ```
    With `h = 270`, Pillar 1 top is `y = 174`. Pillar 1 bounds are `x: [180, 204]` and `y: [174, 238]`.
  - Player 4's rightmost 6 pixels (`x: [180, 186]`) intersect Pillar 1 (`x: [180, 204]`), and Player 4's vertical range `y: [200, 224]` lies entirely within Pillar 1's vertical range `y: [174, 238]`.
  - When physics updates on frame 1: horizontal displacement `dx = 0`, so horizontal collision resolution fails to push the knight left. Vertical displacement `dy > 0` (gravity), so `PlatformPhysics.ts:60` evaluates `knight.y = tile.y - knightHeight = 174 - 24 = 150`.
  - As a result, Player 4 instantly teleports to `y = 150` on top of Pillar 1 on frame 1, failing Requirement R1 Criterion 3 ("Knights spawn cleanly at y=200 without falling through world geometry").

#### Minor Finding: Overlapping Input Actions for P1 and P2
- **Location**: `src/games/hollow-clash/manifest.ts:36-37, 50-51`.
- **Detail**:
  - P1 default controls assign `skill: ['ShiftLeft']` and `focus: ['ShiftLeft']`.
  - P2 default controls assign `skill: ['ShiftRight']` and `focus: ['ShiftRight']`.
  - When Player 1 or Player 2 holds >= 33 Soul and presses Shift, `Knight.ts` performs a Shadow Dash AND `index.ts` simultaneously consumes 33 Soul to cast Vengeful Spirit.
  - While single-keyboard multi-player allocation restricts total available keys per player, binding `focus` to a distinct key (e.g. `KeyF` for P1, `ControlRight`/`Numpad0` or dedicated key for P2) would avoid dual-triggering actions.

---

## 2. Logic Chain

1. **Controls Verification (R1a)**:
   - `manifest.ts` assigns disjoint key sets for P1 (`A/D/W/S/LCTRL/LSHIFT`) and P2 (`Arrows/Down/RCTRL/RSHIFT`), eliminating input crosstalk between P1 and P2. `moveDown` correctly maps to `KeyS` (P1) and `ArrowDown` (P2), allowing `Knight.ts` to execute downward slashes and pogo bounces.
2. **Hero Lounge Bypass Verification (R1b)**:
   - `HeroLoungeScreen.ts` initializes `isReady: false` for player slots 1..4, ensuring `isAllReady()` returns `false` on initialization and preventing auto-start.
   - Global `keydown` listener in `index.ts` detects `Enter` or `Space` key presses and sets `lounge.startRequested = true`, immediately starting the game phase.
3. **Spawn Elevation & Collision Verification (R1c)**:
   - Knights 1, 2, and 3 spawn cleanly at `y=200` in free air below Floating Ledge 1 (`y: [180, 196]`) and land smoothly on the main floor at `y = 214`.
   - However, Player 4 spawns at `x: 170`, overlapping Pillar 1 at `x: 180` by 6 pixels. The collision resolution on frame 1 pops Player 4 to `y = 150` on top of Pillar 1, violating the acceptance criterion for clean y=200 spawning in 4-player games.

---

## 3. Caveats

- 2-player and 3-player modes function correctly without hitting Pillar 1, but 4-player mode reliably reproduces the spawn overlap bug.
- Build (`npm run build`) and unit tests (`npm run test`) pass completely, indicating no TypeScript compiler or syntax errors exist; the failure is a physical geometry overlap defect.

---

## 4. Conclusion

**Verdict: FAIL**

Requirement R1 Acceptance Criteria Status:
- [x] P1 (A/D/W/S/LCTRL/LSHIFT) & P2 (Arrows/Down/RCTRL/RSHIFT) conflict-free keyboard controls — **PASS**
- [x] Enter / Space key press in Hero Lounge immediately starts the game — **PASS**
- [ ] Knights spawn cleanly at y=200 without falling through world geometry — **FAIL** (Player 4 at x=170 spawns inside Pillar 1 at x=180, snapping to y=150).

**Required Fix**:
In `src/games/hollow-clash/index.ts`, adjust `startPositions` so all player spawn coordinates are strictly < `164` (e.g. `[{ x: 40, y: 200 }, { x: 75, y: 200 }, { x: 110, y: 200 }, { x: 145, y: 200 }]`). This ensures all 4 knights spawn in free air with zero geometry intersection.

---

## 5. Verification Method

1. Run build to verify zero compilation errors:
   ```bash
   npm run build
   ```
2. Inspect spawn geometry overlap mathematically:
   - Pillar 1: `x: 180..204`, `y: 174..238`
   - Player 4 spawn: `x: 170..186`, `y: 200..224`
   - Notice overlap: `x: 180..186`, `y: 200..224`.
3. Re-test after adjusting `startPositions` in `index.ts` to confirm Player 4 lands at `y = 214` alongside Players 1..3.
