# HOLLOW CLASH: SHADOW METROIDVANIA — Detailed Analysis Report (Milestone 0)

**Author**: Explorer 1  
**Date**: 2026-07-25  
**Target Module**: `src/games/hollow-clash`  
**Focus**: Requirement R1 (Single-Keyboard Controls & Hero Lounge Baseline)

---

## 1. Executive Summary

A comprehensive investigation of the `hollow-clash` codebase was performed to evaluate Requirement R1 (Single-Keyboard Controls, Hero Lounge Bypass, and Knight Spawn Safety). 

Four critical flaws/bugs were identified:
1. **Broken P1 Control Mappings (`manifest.ts`)**: `moveDown` is empty (`[]`), `action` is bound to `KeyS`, `skill` is bound to `ControlLeft`, and `focus` is bound to `ShiftLeft`. This prevents downward aiming/pogo, forces `S` to slash, and swaps dash/slash key roles.
2. **Broken P2 Control Mappings (`manifest.ts`)**: `moveDown` is empty (`[]`), `action` is bound to `ArrowDown`, `skill` is bound to `ControlRight`, and `focus` is bound to `ShiftRight`. This prevents downward aiming/pogo, forces `ArrowDown` to slash, and swaps dash/slash key roles.
3. **Hero Lounge Instant Auto-Bypass (`HeroLoungeScreen.ts` & `index.ts`)**: `HeroLoungeScreen` initializes player selections with `isReady: true` by default. As a result, `isAllReady()` evaluates to `true` on the very first update tick in `index.ts`, bypassing the Hero Lounge screen instantly before players can press Enter/Space or click.
4. **Coordinate Origin Mismatch & Dual Physics Conflict on Spawn (`Knight.ts`, `PlatformPhysics.ts`, `index.ts`)**: `Knight.ts` treats `x, y` as Top-Left origin coordinates, whereas `PlatformPhysics.ts` treats `x` as Center-X and `y` as Bottom-Y. Furthermore, `index.ts` invokes physics collision handling twice per frame (once in `knight.update()` and once in `physics.update()`). When spawned at `y=200`, `PlatformPhysics` incorrectly interprets `y=200` as bottom Y, detects an overlap with floating ledge 1 (`y: 180..196`), and snaps Knights P2–P4 to `y=180`.

---

## 2. Codebase Architecture & File Mapping

- `src/games/hollow-clash/manifest.ts`: Defines game metadata and `defaultControls` for P1 through P4.
- `src/games/hollow-clash/index.ts`: Main entry point managing game state transitions (`isLoungePhase`), event listeners, and main update loop.
- `src/games/hollow-clash/screens/HeroLoungeScreen.ts`: Character/mask selection lounge screen and ready checks.
- `src/games/hollow-clash/entities/Knight.ts`: Player entity handling movement, jump, attack hitboxes, animation, and internal collision math.
- `src/games/hollow-clash/systems/PlatformPhysics.ts`: Engine physics system handling gravity, AABB tile collisions, and moss wall sliding.
- `src/games/hollow-clash/systems/CavernTilemap.ts`: Level geometry layout (floor, walls, ledges, spikes).
- `src/games/hollow-clash/types.ts`: TypeScript interfaces for `KnightState`, `PlatformTile`, `BossState`, etc.
- `src/games/hollow-clash/config.ts`: Constant values for physics (`GRAVITY`, `JUMP_VELOCITY`, `MOVE_SPEED`, `SHADOW_DASH_SPEED`) and cavern dimensions (480x270).

---

## 3. Requirement R1 Investigation Findings & Bug Breakdown

### 3.1 Bug 1: P1 Single-Keyboard Mappings (`manifest.ts:26-40`)

**Observation (`manifest.ts:30-39`)**:
```typescript
bindings: {
  moveLeft: ['KeyA'],
  moveRight: ['KeyD'],
  moveUp: ['KeyW'],
  moveDown: [],            // Bug: Empty array
  action: ['KeyS'],         // Bug: S assigned to action (slash) instead of LCTRL
  skill: ['ControlLeft'],   // Bug: LCTRL assigned to skill (dash) instead of LSHIFT
  focus: ['ShiftLeft'],
  pause: ['Escape'],
}
```

**Logic Chain**:
1. Requirement R1 specifies P1 controls: `A` (left), `D` (right), `W` (up/jump), `S` (down/crouch), `LCTRL` (slash/attack), `LSHIFT` (dash/skill).
2. Currently, `moveDown` is `[]`. When Player 1 presses `S`, `input.isActive('moveDown')` returns `false`, while `input.isJustPressed('action')` returns `true`.
3. In `Knight.ts:223`, downward attack (`attackDirection = 'down'`) requires `input.down` to be `true`. Because `moveDown` is empty, `input.down` is never `true`.
4. As a result, P1 cannot execute downward attacks or airborne pogo bounces using `S`. Additionally, pressing `S` causes a forward slash instead of downward intent, and `LCTRL` dashes instead of slashing.

---

### 3.2 Bug 2: P2 Single-Keyboard Mappings (`manifest.ts:41-54`)

**Observation (`manifest.ts:45-53`)**:
```typescript
bindings: {
  moveLeft: ['ArrowLeft'],
  moveRight: ['ArrowRight'],
  moveUp: ['ArrowUp'],
  moveDown: [],              // Bug: Empty array
  action: ['ArrowDown'],     // Bug: ArrowDown assigned to action (slash)
  skill: ['ControlRight'],   // Bug: RCTRL assigned to skill (dash) instead of RSHIFT
  focus: ['ShiftRight'],
  pause: ['Escape'],
}
```

**Logic Chain**:
1. Requirement R1 specifies P2 controls: `ArrowLeft` (left), `ArrowRight` (right), `ArrowUp` (up/jump), `ArrowDown` (down/crouch), `RCTRL` (slash/attack), `RSHIFT` (dash/skill).
2. Currently, `moveDown` is `[]`. Pressing `ArrowDown` triggers `action` (slash) rather than setting `moveDown` to `true`.
3. In `Knight.ts:223`, downward attack requires `input.down`. Because `moveDown` is empty, P2 cannot perform downward slashes or pogo bounces.
4. Pressing `ArrowDown` causes a forward attack, `RCTRL` triggers dash instead of slash, and `RSHIFT` triggers focus instead of dash.

---

### 3.3 Bug 3: Hero Lounge Auto-Bypass (`HeroLoungeScreen.ts:11-16`, `index.ts:138`)

**Observation (`HeroLoungeScreen.ts:11-16`)**:
```typescript
public selections: Record<number, { mask: KnightMaskType; isReady: boolean }> = {
  1: { mask: 'vessel', isReady: true },
  2: { mask: 'hornet', isReady: true },
  3: { mask: 'mantis', isReady: true },
  4: { mask: 'grimm', isReady: true },
};
```
**Observation (`index.ts:138`)**:
```typescript
if (this.lounge.startRequested || this.lounge.isAllReady(count)) {
  this.startCavernPhase();
}
```

**Logic Chain**:
1. Requirement R1 requires that players view the Hero Lounge until explicit bypass input occurs (Enter or Space key press, or clicking the start button).
2. In `HeroLoungeScreen.ts`, `isReady` is initialized to `true` for all slots.
3. On the first call to `update()` in `index.ts`, `this.lounge.isAllReady(count)` returns `true` immediately.
4. `startCavernPhase()` is invoked on tick 1, instantly hiding the Hero Lounge screen before any keyboard or mouse input can take place.

---

### 3.4 Bug 4: Spawn Coordinates, Physics System Mismatch, and Dual Physics Invocation (`index.ts:180,193`, `Knight.ts`, `PlatformPhysics.ts`)

**Observation 1 (Spawn Positions in `index.ts:92-97`)**:
- P1: `x: 50, y: 200`
- P2: `x: 90, y: 200`
- P3: `x: 130, y: 200`
- P4: `x: 170, y: 200`

**Observation 2 (Level Layout in `CavernTilemap.ts:18,32`)**:
- Floor platform: `x: 0..280`, `y: 238..270` (`h - 32 = 238`).
- Floating Ledge 1: `x: 60..170`, `y: 180..196`.

**Observation 3 (Coordinate Model Mismatch)**:
- `Knight.ts`: `state.x` and `state.y` represent Top-Left origin coordinates. Width = 16, Height = 24.
  - At `y = 200`, the knight occupies `y: 200..224`. This is below Floating Ledge 1 (`y: 180..196`) and above the floor (`y: 238`), which is clear in Top-Left space.
- `PlatformPhysics.ts:71-83`: `checkAABB` calculates:
  `kLeft = kx - kw / 2` (Center X), `kTop = ky - kh` (Bottom Y).
  - When `ky = 200`, `PlatformPhysics` calculates `kTop = 200 - 24 = 176` and `kBottom = 200`.
  - Because `176 < 196` (ledge bottom) and `200 > 180` (ledge top), `PlatformPhysics` detects an AABB collision with Floating Ledge 1 (`x: 60..170, y: 180..196`) for P2, P3, P4.
  - On tick 1, `PlatformPhysics.ts:56` snaps `knight.y = tile.y` (setting Y to 180).

**Observation 4 (Dual Physics Update)**:
- In `index.ts:180`, `knight.update()` is called, executing `Knight.ts` internal physics and collision math.
- In `index.ts:193`, `this.physics.update(knight.state, ...)` is called immediately afterwards, executing a completely different set of collision calculations on the same state.

---

## 4. Proposed Modifications for Implementer

### 4.1 Fix Control Bindings in `manifest.ts`
```typescript
// P1: A/D/W/S/LCTRL/LSHIFT
bindings: {
  moveLeft: ['KeyA'],
  moveRight: ['KeyD'],
  moveUp: ['KeyW'],
  moveDown: ['KeyS'],
  action: ['ControlLeft'],
  skill: ['ShiftLeft'],
  focus: ['ShiftLeft'],
  pause: ['Escape'],
}

// P2: Arrows/DownArrow/RCTRL/RSHIFT
bindings: {
  moveLeft: ['ArrowLeft'],
  moveRight: ['ArrowRight'],
  moveUp: ['ArrowUp'],
  moveDown: ['ArrowDown'],
  action: ['ControlRight'],
  skill: ['ShiftRight'],
  focus: ['ShiftRight'],
  pause: ['Escape'],
}
```

### 4.2 Fix Hero Lounge Ready Initialization in `HeroLoungeScreen.ts`
```typescript
public selections: Record<number, { mask: KnightMaskType; isReady: boolean }> = {
  1: { mask: 'vessel', isReady: false },
  2: { mask: 'hornet', isReady: false },
  3: { mask: 'mantis', isReady: false },
  4: { mask: 'grimm', isReady: false },
};
```

### 4.3 Unify Physics Origin & Collision Resolution
- Standardize `state.x` and `state.y` across `Knight.ts` and `PlatformPhysics.ts` (Top-Left origin, width=16, height=24).
- Ensure physics collision calculation is executed in a single location per frame rather than duplicated in both `Knight.ts` and `PlatformPhysics.ts`.
- Ensure spawn `y = 200` places Knights safely above the main floor (`y = 238`) without overlapping floating ledges.

---

## 5. Verification Method

1. **Typecheck & Build**: Run `npx tsc --noEmit` and `npm run build` in `/home/viv/Projects/PartyPlay`.
2. **Unit Tests**: Run `npm run test`.
3. **Controls Audit**: Verify P1 (`KeyA`, `KeyD`, `KeyW`, `KeyS`, `ControlLeft`, `ShiftLeft`) and P2 (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `ControlRight`, `ShiftRight`) respond correctly to movement, jumping, downward attacks, and dashing.
4. **Hero Lounge Audit**: Confirm game stays in Hero Lounge phase until Enter key, Space key, or mouse click triggers start.
5. **Spawn Safety Audit**: Confirm Knights spawn cleanly at `y = 200` and land on main floor without snapping to upper ledges.
