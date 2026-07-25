# Technical Analysis Report: Milestone 0 - Physics & Hazard Mechanics (Requirement R2)

**Game**: HOLLOW CLASH: SHADOW METROIDVANIA  
**Module**: `src/games/hollow-clash`  
**Explorer**: Explorer 2 (`.agents/explorer_m0_2`)  
**Date**: 2026-07-25  

---

## Executive Summary

A comprehensive read-only investigation of `src/games/hollow-clash` was conducted to evaluate Requirement R2 (Physics Engine Unification, Moss Wall Sliding, Spike Pit Hazards & Safe Ground Respawn, and Shadow Dash Wall Collisions).

The investigation revealed that physics simulation and collision resolution are currently split across two conflicting files (`entities/Knight.ts` and `systems/PlatformPhysics.ts`), with an incompatible coordinate system assumption (Top-Left vs. Bottom-Center). Furthermore, hazard collision detection and safe ground respawn logic are 0% implemented, moss wall sliding drops after a single frame due to strict AABB inequality boundary conditions, and Shadow Dash explicitly bypasses all tile collisions, resulting in noclip wall clipping.

---

## Findings by Focus Area

### 1. Physics Engine Unification (Movement, Gravity, Jumping & AABB Collisions)

#### Observations & Evidence
1. **Dual Physics Execution in Main Loop**:
   In `index.ts`, both `Knight.update()` and `PlatformPhysics.update()` are called sequentially during the update loop:
   ```typescript
   // index.ts:180
   knight.update(dt, inputObj, this.tilemap.tiles, this.boss ? [this.boss] : []);
   
   // index.ts:193
   this.physics.update(knight.state, this.tilemap.tiles, dt);
   ```
2. **Conflicting AABB Origin / Coordinate System**:
   - `Knight.ts` treats `state.x` and `state.y` as **Top-Left** coordinates of an AABB box with `width = 16` and `height = 24`:
     ```typescript
     // Knight.ts:133-137
     const isIntersecting =
       this.state.x < p.x + p.width &&
       this.state.x + this.width > p.x &&
       this.state.y < p.y + p.height &&
       this.state.y + this.height > p.y;
     ```
   - `PlatformPhysics.ts` treats `(kx, ky)` as **Bottom-Center** coordinates:
     ```typescript
     // PlatformPhysics.ts:72-75
     const kLeft = kx - kw / 2;
     const kRight = kx + kw / 2;
     const kTop = ky - kh;
     const kBottom = ky;
     ```
   - Because `PlatformPhysics.ts` assumes `ky` is the bottom of the knight, landing on ground sets `knight.y = tile.y` (line 56). Since `knight.y` is top-left in `Knight.ts`, this snaps the knight's head to the tile top, sinking the entire 24px entity into the tile and causing violent position jitter every frame.

3. **Flawed Pre-Movement Swept Check in `Knight.ts`**:
   In `Knight.ts` (lines 141 & 150), collision resolution checks:
   ```typescript
   if (this.state.vy > 0 && this.state.y + this.height - this.state.vy * dt <= p.y)
   ```
   `this.state.y` has NOT been updated by `vy * dt` yet (position integration occurs later at line 209: `this.state.y += this.state.vy * dt`). Subtracting `vy * dt` from the un-integrated `this.state.y` computes a historical position from 2 frames prior, breaking landing checks.

4. **Double Cooldown Decrement Bug**:
   `dashCooldownTimer` is decremented in `Knight.ts` (line 81) AND in `PlatformPhysics.ts` (line 10), cutting dash cooldown duration in half (0.6s instead of 1.2s).

---

### 2. Moss Wall Sliding Physics & Wall Jumping

#### Observations & Evidence
1. **1-Frame Wall Slide Drop (Flush Boundary Failure)**:
   In `Knight.ts` (lines 133-163), when a player pushes against a moss wall (e.g. left wall at `x = 16`), position is snapped flush to the wall (`x = 16`). On frame 2, `this.state.x < p.x + p.width` (`16 < 16`) evaluates to `false`. Because `isIntersecting` is false, `touchingWallDir` becomes `null`, `onMoss` becomes `false`, and `isWallSliding` turns `false`. Wall sliding drops immediately, causing the player to fall at full gravity speed.

2. **Tile Type Ignored in `PlatformPhysics.ts`**:
   In `PlatformPhysics.ts` (lines 40 & 44), wall sliding is enabled for ANY solid tile (`isSolid: true`) regardless of `type`:
   ```typescript
   if (knight.vy > 0 && knight.facing === 'right') knight.isWallSliding = true;
   ```
   This allows sliding on stone pillars and ceiling borders, contradicting `Knight.ts` which checks `onMoss = true`.

3. **Wall Jump Consumption of Double Jump**:
   Because `isWallSliding` drops to `false` after 1 frame, pressing Jump while leaning against a wall fails the `isWallSliding` check and executes an aerial Double Jump (`canDoubleJump = false`), leaving the player without a double jump after leaving the wall.

4. **Wall Jump Directional Overwrite**:
   When wall jumping, `Knight.ts` sets `this.state.vx = MOVE_SPEED` (line 178), but horizontal input handling (lines 111-119) immediately overwrites `vx` in the same frame if the player holds directional keys.

---

### 3. Spike Pit Hazard Detection, HP Damage & Safe Ground Respawn Logic

#### Observations & Evidence
1. **0% Hazard Collision Implementation**:
   In `CavernTilemap.ts` (line 19):
   ```typescript
   { x: 280, y: h - 16, width: 120, height: 16, isSolid: false, type: 'spikes' }
   ```
   Because `isSolid: false`, both `PlatformPhysics.ts` (line 34: `if (!tile.isSolid) continue;`) and `Knight.ts` skip the spike tile completely.
2. **Missing Damage Call**:
   `knight.takeDamage(...)` is defined in `Knight.ts` (line 281), but is NEVER called anywhere in the entire codebase. Falling into spikes does 0 HP damage (1 Mask HP damage is required).
3. **Missing Safe Ground Tracking & Respawn**:
   No logic exists to track `lastSafeGroundPosition` when grounded on solid non-hazard ground, nor is there any respawn execution to return the player to safe ground after hazard contact or map fall-through.

---

### 4. Shadow Dash Horizontal Wall Collisions & Invulnerability

#### Observations & Evidence
1. **Explicit Noclip Wall Phasing**:
   In `PlatformPhysics.ts` (lines 9-13):
   ```typescript
   if (knight.isShadowDashing) {
     knight.dashCooldownTimer = Math.max(0, knight.dashCooldownTimer - dt);
     knight.x += knight.vx * dt;
     return;
   }
   ```
   When `isShadowDashing` is true, `PlatformPhysics.update()` bypasses ALL tile collision checks and returns immediately. This allows the player to dash directly through solid walls into out-of-bounds areas.

2. **Required Dash Wall Collision Behavior**:
   During Shadow Dash (`SHADOW_DASH_SPEED = 380`), hitting a solid tile must halt horizontal movement (`vx = 0`, position clamped to wall boundary) while keeping `isInvulnerable = true` for the remaining `shadowDashDuration` (0.25s). Currently, collision is ignored entirely.

---

## Summary Matrix of Defects

| Defect ID | Category | Description | Source Location | Impact |
|-----------|----------|-------------|-----------------|--------|
| **DEF-01** | Physics | Dual physics execution in update loop | `index.ts:180,193` | Double movement, state corruption |
| **DEF-02** | Physics | AABB Origin mismatch (Top-Left vs Bottom-Center) | `PlatformPhysics.ts:72`, `Knight.ts:133` | Snaps top-left to floor, 24px sinking, violent jitter |
| **DEF-03** | Physics | Swept check on un-integrated position | `Knight.ts:141,150` | Incorrect historical position calculation |
| **DEF-04** | Physics | Double cooldown tick for Shadow Dash | `Knight.ts:81`, `PlatformPhysics.ts:10` | Dash cooldown finishes 2x too fast |
| **DEF-05** | Moss Slide | Boundary flush equality drops slide state | `Knight.ts:133-163` | Wall slide drops after 1 frame, full gravity fall |
| **DEF-06** | Moss Slide | Ignored `moss` tile type in `PlatformPhysics` | `PlatformPhysics.ts:40,44` | Allows wall sliding on stone tiles/pillars |
| **DEF-07** | Moss Slide | Wall jump consumes double jump | `Knight.ts:175-185` | Player loses double jump on wall jump |
| **DEF-08** | Moss Slide | Wall jump velocity overwritten by input | `Knight.ts:111-119,178` | Wall jump impulse cancelled by directional keys |
| **DEF-09** | Hazards | Spike pit tile bypassed (non-solid) | `CavernTilemap.ts:19`, `PlatformPhysics.ts:34` | Player passes through spikes into bottom void |
| **DEF-10** | Hazards | `knight.takeDamage()` never called | Entire Codebase | Player takes 0 damage from hazards/enemies |
| **DEF-11** | Hazards | Missing safe ground position tracking | `Knight.ts`, `PlatformPhysics.ts` | Cannot determine respawn location |
| **DEF-12** | Hazards | Missing hazard respawn execution | `Knight.ts`, `PlatformPhysics.ts` | Player falls endlessly below screen |
| **DEF-13** | Shadow Dash | Tile collisions bypassed during dash | `PlatformPhysics.ts:9-13` | Noclips through solid walls |
| **DEF-14** | Shadow Dash | Wall impact does not retain invulnerability | `Knight.ts:97-108` | Wall impact logic incomplete during dash |

---

## Proposed Architectural Solution

To achieve clean unification and meet Requirement R2:

1. **Unify Physics in `PlatformPhysics.ts`**:
   - Transfer all movement integration, gravity, AABB tile collisions (Top-Left model), wall sliding, and hazard detection into `PlatformPhysics.ts`.
   - Remove redundant collision/gravity/movement code from `Knight.ts`, leaving `Knight.ts` focused on state management, input interpretation, attack logic, and visual rendering.
   - Standardize all AABB checks using Top-Left origin `(x, y)` and bounding box `[x, y, width, height]`.

2. **Fix Moss Wall Sliding**:
   - Modify AABB check to include edge contact checks (`kLeft <= tRight && kRight >= tLeft`).
   - Check `tile.type === 'moss'` explicitly before setting `isWallSliding = true`.
   - Ensure Wall Jump sets `canDoubleJump = true` and applies a wall launch velocity lock for a few frames to prevent input override.

3. **Implement Hazard System & Safe Ground Respawn**:
   - Track `lastSafeGroundX` and `lastSafeGroundY` on `KnightState` when `isGrounded` is true and standing on a non-hazard solid tile.
   - Detect collision with `tile.type === 'spikes'` or falling below `y > CAVERN_CONFIG.height`.
   - Trigger `knight.takeDamage(1)`, set `invulnerabilityTimer = 1.5`, reset velocity (`vx = 0, vy = 0`), and reposition knight to `(lastSafeGroundX, lastSafeGroundY)`.

4. **Fix Shadow Dash Wall Collision**:
   - Include tile collision checks during Shadow Dash in `PlatformPhysics.ts`.
   - Upon colliding with a solid tile horizontally during dash, set `vx = 0` and clamp `x` to the wall edge, but keep `isShadowDashing` active (or maintain `isInvulnerable = true`) for the remaining `shadowDashDuration`.
