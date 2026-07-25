# Handoff Report: Explorer 1 — Milestone 0 (Controls & Lounge Baseline)

## 1. Observation
- `src/games/hollow-clash/manifest.ts`: Lines 30-39 & 45-53.
  - P1 bindings: `moveDown: []`, `action: ['KeyS']`, `skill: ['ControlLeft']`, `focus: ['ShiftLeft']`.
  - P2 bindings: `moveDown: []`, `action: ['ArrowDown']`, `skill: ['ControlRight']`, `focus: ['ShiftRight']`.
- `src/games/hollow-clash/screens/HeroLoungeScreen.ts`: Lines 11-16.
  - `selections` object initializes all 4 player slots with `isReady: true`.
- `src/games/hollow-clash/index.ts`: Lines 76-80 & Line 138.
  - `handleGlobalKeyDown` sets `startRequested = true` on `'Enter'` or `' '`.
  - Line 138: `if (this.lounge.startRequested || this.lounge.isAllReady(count))` immediately triggers `startCavernPhase()`.
  - Lines 180 & 193: calls both `knight.update()` and `this.physics.update()`.
- `src/games/hollow-clash/entities/Knight.ts`: Lines 71, 133-140, 223.
  - Uses `x, y` as top-left corner origin for bounding box checks.
  - Downward attack check requires `input.down` (which is mapped to `moveDown`).
- `src/games/hollow-clash/systems/PlatformPhysics.ts`: Lines 71-83.
  - Calculates `kLeft = kx - kw/2` (Center X) and `kTop = ky - kh` (Bottom Y).
- `src/games/hollow-clash/systems/CavernTilemap.ts`: Line 18, 32.
  - Floor platform at `y = 238..270`.
  - Floating Ledge 1 at `x = 60..170, y = 180..196`.

## 2. Logic Chain
1. In `manifest.ts`, `moveDown` is empty (`[]`) for both P1 and P2, while `KeyS` and `ArrowDown` are mapped to `action`. Consequently, pressing `S` or `ArrowDown` performs a forward slash instead of passing `input.down = true`. In `Knight.ts:223`, `attackDirection = 'down'` requires `input.down`, making downward slashes and pogo bounces impossible for P1 and P2.
2. Furthermore, in `manifest.ts`, `LCTRL` / `RCTRL` are mapped to `skill` (dash) and `LSHIFT` / `RSHIFT` are mapped to `focus` (heal), reversing the required P1 (A/D/W/S/LCTRL/LSHIFT) and P2 (Arrows/Down/RCTRL/RSHIFT) control mapping specified in Requirement R1.
3. In `HeroLoungeScreen.ts`, initializing `isReady: true` causes `lounge.isAllReady(count)` to return `true` on frame 1 of `update()` in `index.ts`, bypassing the Hero Lounge screen immediately before Enter/Space or click input occurs.
4. In `PlatformPhysics.ts`, treating `y=200` as bottom Y (`ky - kh = 176`) causes AABB intersection detection with Floating Ledge 1 (`y: 180..196`) for P2–P4, snapping them to `y=180` on spawn. The dual physics call in `index.ts` further desynchronizes knight positions.

## 3. Caveats
- `focus` (heal) vs `skill` (shadow dash): Requirement R1 defines 6 key inputs per player on single keyboard (A/D/W/S/LCTRL/LSHIFT for P1, Arrows/Down/RCTRL/RSHIFT for P2). The implementer should ensure `action` is mapped to LCTRL/RCTRL and `skill` (and/or `focus`) is mapped to LSHIFT/RSHIFT.
- Physics unification: Complete physics engine refactoring (AABB tile collisions, spike damage, moss wall slide) is scheduled for Milestone 2 (R2). For Milestone 1, spawn position safety at `y=200` and coordinate origin consistency should be ensured so knights land smoothly.

## 4. Conclusion
Four distinct flaws break Requirement R1:
1. `manifest.ts` P1 key bindings fail R1 contract (`moveDown` empty, S attacks, LCTRL dashes).
2. `manifest.ts` P2 key bindings fail R1 contract (`moveDown` empty, DownArrow attacks, RCTRL dashes).
3. `HeroLoungeScreen.ts` defaults `isReady` to `true`, causing instant lounge bypass on game start.
4. `PlatformPhysics.ts` origin mismatch and dual physics update loop in `index.ts` cause P2–P4 spawn snapping to upper ledges at `y=200`.

Implementing the proposed fixes in `manifest.ts`, `HeroLoungeScreen.ts`, `index.ts`, `Knight.ts`, and `PlatformPhysics.ts` will satisfy Requirement R1 cleanly.

## 5. Verification Method
1. Run `npx tsc --noEmit` from `/home/viv/Projects/PartyPlay` to ensure TypeScript compilation without errors.
2. Run `npm run build` from `/home/viv/Projects/PartyPlay` to ensure bundle build completes.
3. Run `npm run test` from `/home/viv/Projects/PartyPlay` to verify test suite health.
4. Inspect `manifest.ts` to confirm P1 controls are `KeyA`, `KeyD`, `KeyW`, `KeyS`, `ControlLeft`, `ShiftLeft` and P2 controls are `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `ControlRight`, `ShiftRight`.
5. Inspect `HeroLoungeScreen.ts` to confirm `isReady` defaults to `false`.
