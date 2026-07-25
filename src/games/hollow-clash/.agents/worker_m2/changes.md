# Changes Log — Worker 4 (Milestone 2 - Requirement R2 Physics Unification & Hazard Mechanics)

## Overview of Changes
Implemented physics engine unification, moss wall sliding mechanics, spike pit hazard damage & safe ground respawn, and Shadow Dash wall collision bounds in HOLLOW CLASH.

## Modified Files

### 1. `types.ts`
- Added optional `lastSafeGroundPosition?: { x: number; y: number }` property to `KnightState` interface to track safe respawn positions.

### 2. `systems/PlatformPhysics.ts`
- **Physics Engine Unification**:
  - Unified Top-Left origin AABB physics processing for entity size 16x24.
  - Accepts `KnightState | Knight` to cleanly interface with entities or raw states.
  - Removed duplicate `dashCooldownTimer` decrement tick.
- **Shadow Dash Wall Collisions (R2d)**:
  - Removed early return when `isShadowDashing` is true.
  - Applied horizontal movement and solid tile AABB collision detection during Shadow Dash so forward motion stops flush at solid tile walls instead of noclipping/phasing through walls, while maintaining invulnerability.
  - Excluded gravity application during Shadow Dash so vertical height remains fixed.
- **Moss Wall Sliding Mechanics (R2b)**:
  - Ensured wall sliding triggers **only** on tiles with `tile.type === 'moss'`.
  - Fixed boundary equality checks (`Math.abs(...) <= 1.0`) so wall sliding remains active continuously while pressing against a moss wall without dropping after 1 frame.
- **Spike Pit Hazard & Safe Respawn (R2c)**:
  - Added AABB collision detection for hazard tiles (`tile.type === 'spikes'`).
  - Automatically records `lastSafeGroundPosition` whenever knight is grounded on solid non-spike ground.
  - When touching a spike pit, invokes `knight.takeDamage(1)` (deducting 1 Mask HP and triggering 1.5s invulnerability flash) and respawns knight at `lastSafeGroundPosition` with 0 velocity.

### 3. `entities/Knight.ts`
- Initialized `lastSafeGroundPosition` in constructor and linked `this.state.lastSafeGroundPosition = this.lastSafeGroundPosition`.
- Updated `physics.update(this, platforms, dt)` to pass full knight instance so hazard damage and position updates apply seamlessly.
- Enabled `canDoubleJump = true` when `isWallSliding` is true so wall jumping off moss walls launches the knight away without consuming the airborne double jump.

### 4. `HollowClash.test.ts`
- Added comprehensive unit tests under `describe('Requirement R2 Physics & Hazard Mechanics Verification')`:
  - `R2b`: Verifies wall sliding triggers ONLY on moss tiles, remains active continuously over multiple frames, and wall jump launches away while retaining airborne double jump.
  - `R2c`: Verifies safe ground tracking, spike pit hazard detection, 1 Mask HP damage via `takeDamage(1)`, invulnerability flash, and safe respawn at `lastSafeGroundPosition`.
  - `R2d`: Verifies Shadow Dash obeys solid wall collision bounds without noclipping into solid tile walls.

## Build and Test Verification
- `npm run build`: Succeeded with zero errors.
- `npm run test`: Passed all 13 unit tests in `HollowClash.test.ts` (and overall test suite).
