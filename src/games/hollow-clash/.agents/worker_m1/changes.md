# Changes Made — Milestone 1: Controls & Lounge Bypass (R1)

## Summary of Code Modifications

### 1. `src/games/hollow-clash/manifest.ts`
- **Player 1 Controls**:
  - `moveLeft`: `['KeyA']`
  - `moveRight`: `['KeyD']`
  - `moveUp`: `['KeyW']`
  - `moveDown`: `['KeyS']`
  - `action`: `['ControlLeft']` (LCTRL for slash/attack)
  - `skill`: `['ShiftLeft']` (LSHIFT for shadow dash)
  - `focus`: `['ShiftLeft']` (LSHIFT for focus/heal spell)
  - `pause`: `['Escape']`
- **Player 2 Controls**:
  - `moveLeft`: `['ArrowLeft']`
  - `moveRight`: `['ArrowRight']`
  - `moveUp`: `['ArrowUp']`
  - `moveDown`: `['ArrowDown']`
  - `action`: `['ControlRight']` (RCTRL for slash/attack)
  - `skill`: `['ShiftRight']` (RSHIFT for shadow dash)
  - `focus`: `['ShiftRight']` (RSHIFT for focus/heal spell)
  - `pause`: `['Escape']`
- **Rationale**: Replaced empty `moveDown` array (`[]`) with `['KeyS']` (P1) and `['ArrowDown']` (P2) so downward inputs pass to `Knight.ts` for downward attacks and pogo bounces. Corrected `action` and `skill`/`focus` key mappings to match Requirement R1a contract.

### 2. `src/games/hollow-clash/screens/HeroLoungeScreen.ts`
- **Selection Initialization**:
  - Initialized `isReady: false` for player slots 1, 2, 3, and 4 in `selections`.
- **Input Handling**:
  - Updated `updateInput` so `toggleReady` toggles `sel.isReady = !sel.isReady`.
- **UI Render**:
  - Updated `render` card status text and border stroke to indicate ready status (`[READY!]` in green vs `< CHOOSE >`).
- **Rationale**: Prevents Hero Lounge from auto-starting on frame 1 of game initialization.

### 3. `src/games/hollow-clash/systems/PlatformPhysics.ts`
- **Coordinate Origin Alignment**:
  - Updated `checkAABB` and collision resolution methods to consistently treat `(x, y)` as the top-left origin of the knight bounding box (`width = 16`, `height = 24`):
    - `kLeft = kx`, `kRight = kx + 16`
    - `kTop = ky`, `kBottom = ky + 24`
- **Ground & Wall Collision Resolution**:
  - Ground collision: `knight.y = tile.y - knightHeight` (setting top edge so bottom edge `knight.y + 24` matches `tile.y`).
  - Ceiling collision: `knight.y = tile.y + tile.height`.
  - Wall collision: `knight.x = tile.x - knightWidth` (moving right) or `tile.x + tile.width` (moving left).
- **Rationale**: Aligns collision geometry with Pixi.js container rendering origin, preventing knights spawning at `y=200` from falling through geometry or snapping to upper floating ledges.

### 4. `src/games/hollow-clash/entities/Knight.ts`
- **Unified Physics Step**:
  - Integrated `PlatformPhysics` directly inside `Knight.update()` for clean, single-pass movement and collision resolution.
  - Removed duplicate inline platform collision loop and manual gravity calculation.
  - Resets `canDoubleJump = true` when `this.state.isGrounded` becomes `true`.
- **Rationale**: Eliminates double-application of gravity and movement deltas per frame, ensuring smooth falling, landing, jumping, wall slides, and downward pogo bounces.

### 5. `src/games/hollow-clash/index.ts`
- **Duplicate Physics Call Removal**:
  - Removed redundant `this.physics.update(knight.state, this.tilemap.tiles, dt)` call inside the knight update loop in `index.ts`.
- **Lounge Bypass via Enter / Space**:
  - Confirmed `handleGlobalKeyDown` sets `startRequested = true` on `Enter` or `Space` keypresses during `isLoungePhase`.
- **Rationale**: Prevents double physics execution and guarantees pressing Enter/Space immediately bypasses Hero Lounge to enter playing state.
