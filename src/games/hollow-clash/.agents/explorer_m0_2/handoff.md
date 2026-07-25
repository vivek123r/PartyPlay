# Handoff Report: Explorer 2 (Milestone 0 - Requirement R2 Physics & Hazard Baseline)

**Working Directory**: `/home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/explorer_m0_2`  
**Target Codebase**: `/home/viv/Projects/PartyPlay/src/games/hollow-clash`  
**Handoff Type**: Hard (Task complete)  

---

## 1. Observation

Direct observations from examining the codebase files:

### Obs 1: Dual Physics Loop Invocation
- In `/home/viv/Projects/PartyPlay/src/games/hollow-clash/index.ts`:
  - Line 180: `knight.update(dt, inputObj, this.tilemap.tiles, this.boss ? [this.boss] : []);`
  - Line 193: `this.physics.update(knight.state, this.tilemap.tiles, dt);`
  - Both `Knight.ts` and `PlatformPhysics.ts` attempt to move `knight.x` and `knight.y`, calculate gravity, detect collisions, and mutate `isGrounded` and `isWallSliding` flags.

### Obs 2: Coordinate Space Mismatch
- In `/home/viv/Projects/PartyPlay/src/games/hollow-clash/entities/Knight.ts`:
  - Lines 133–137:
    ```typescript
    const isIntersecting =
      this.state.x < p.x + p.width &&
      this.state.x + this.width > p.x &&
      this.state.y < p.y + p.height &&
      this.state.y + this.height > p.y;
    ```
    (Treating `this.state.x` and `this.state.y` as Top-Left coordinate of size 16x24).
- In `/home/viv/Projects/PartyPlay/src/games/hollow-clash/systems/PlatformPhysics.ts`:
  - Lines 72–75:
    ```typescript
    const kLeft = kx - kw / 2;
    const kRight = kx + kw / 2;
    const kTop = ky - kh;
    const kBottom = ky;
    ```
    (Treating `(kx, ky)` as Bottom-Center coordinate).
  - Line 56:
    ```typescript
    knight.y = tile.y;
    ```
    (Setting top-left `knight.y` equal to `tile.y` when landing, sinking the 24px entity into the tile).

### Obs 3: Wall Slide Drop & Ignored Tile Types
- In `Knight.ts` lines 133–163:
  - Once player snaps flush to a wall (`x = 16`, `p.x + p.width = 16`), `this.state.x < p.x + p.width` (`16 < 16`) evaluates to `false` on frame 2. `isIntersecting` becomes `false`, setting `isWallSliding = false` and `touchingWallDir = null`.
- In `PlatformPhysics.ts` lines 40 & 44:
  - Wall slide is set on any solid tile (`if (knight.vy > 0 && knight.facing === 'right') knight.isWallSliding = true;`) without checking `tile.type === 'moss'`.

### Obs 4: Spike Hazard Pit Non-Solid & Missing Respawn Logic
- In `systems/CavernTilemap.ts` line 19:
  - `{ x: 280, y: h - 16, width: 120, height: 16, isSolid: false, type: 'spikes' }`
- In `systems/PlatformPhysics.ts` line 34:
  - `if (!tile.isSolid) continue;`
- `knight.takeDamage(...)` is defined in `Knight.ts` line 281, but is NEVER called anywhere in the codebase.
- No `lastSafeGroundPosition` variable or safe ground respawn code exists.

### Obs 5: Shadow Dash Noclip Phasing
- In `systems/PlatformPhysics.ts` lines 9–13:
  - ```typescript
    if (knight.isShadowDashing) {
      knight.dashCooldownTimer = Math.max(0, knight.dashCooldownTimer - dt);
      knight.x += knight.vx * dt;
      return;
    }
    ```
  - Tile collision checks are explicitly skipped during Shadow Dash.
- In `Knight.ts` line 81 & `PlatformPhysics.ts` line 10:
  - `dashCooldownTimer` is decremented in BOTH files every frame during dash.

---

## 2. Logic Chain

1. **Dual Physics & Coordinate System Conflict** (from Obs 1 & Obs 2):
   - `index.ts` runs both `Knight.update()` and `PlatformPhysics.update()` every frame.
   - `Knight.ts` calculates position changes assuming Top-Left origin.
   - `PlatformPhysics.ts` checks collisions assuming Bottom-Center origin and snaps `knight.y = tile.y` on ground landing.
   - This causes the Top-Left of the knight to snap to the tile surface, burying the knight 24px into solid ground and creating severe jittering and conflicting states every frame.

2. **1-Frame Moss Wall Slide Failure** (from Obs 3):
   - Strict inequality (`<`) in AABB check fails when the player is flush against a wall boundary.
   - On frame 1, position snaps flush to the wall edge.
   - On frame 2, strict inequality returns `false` for intersection. `isWallSliding` turns `false`, causing wall sliding to drop after 1 frame and triggering full gravity fall.
   - Because `isWallSliding` drops to `false`, pressing jump against a wall fails Wall Jump and consumes the player's Double Jump.
   - In addition, `PlatformPhysics.ts` ignores `tile.type === 'moss'` and enables wall sliding on stone tiles.

3. **Spike Hazard & Respawn Absence** (from Obs 4):
   - Spike tiles are set to `isSolid: false`.
   - `PlatformPhysics.ts` filters out non-solid tiles, so spikes are ignored by collision detection.
   - `Knight.takeDamage()` is never called, no safe ground position is stored, and no respawn logic exists.
   - When players fall into spike pits, they fall through the map floor into the void without taking damage or respawning.

4. **Shadow Dash Wall Clipping** (from Obs 5):
   - `PlatformPhysics.ts` contains an explicit `return` when `isShadowDashing` is true, bypassing all solid tile collision checks.
   - As a result, dashing towards a solid wall causes the player to phase straight through into out-of-bounds space.
   - Furthermore, `dashCooldownTimer` ticks down in both update functions, breaking cooldown timing.

---

## 3. Caveats

- **No Code Modifications Made**: Investigation was strictly read-only per rules. No changes were committed to `src/games/hollow-clash`.
- **Combat / Enemy Collision Scope**: Enemy hitboxes (`Enemy.ts`, `BossMossKnight.ts`) were examined to verify damage call usage, but full enemy AI combat balance belongs to Explorer 3 / Implementer scopes.

---

## 4. Conclusion

Requirement R2 contains critical architecture and implementation defects:
1. **Unification needed**: Physics must be unified into `PlatformPhysics.ts` using a single Top-Left AABB coordinate model, removing redundant physics logic from `Knight.ts`.
2. **Moss Wall Sliding**: AABB contact bounds must be fixed to allow continuous wall sliding on `type === 'moss'` tiles, preserving Wall Jump without consuming Double Jump.
3. **Spike Pit Hazards**: Spike collision detection, 1 Mask HP damage via `takeDamage(1)`, safe ground position tracking, and safe ground respawn execution must be fully implemented.
4. **Shadow Dash**: Early return in `PlatformPhysics.ts` must be removed so horizontal wall collisions stop forward motion while maintaining `isInvulnerable = true` for the dash duration.

---

## 5. Verification Method

To verify these findings and check future implementations:

1. **Codebase Inspection**:
   - `index.ts`: Inspect lines 180 and 193 for dual physics calls.
   - `systems/PlatformPhysics.ts`: Inspect lines 9-13 (Shadow Dash noclip return), line 56 (`knight.y = tile.y` top-left mismatch), and lines 40/44 (missing moss tile check).
   - `entities/Knight.ts`: Inspect lines 133-163 (boundary equality wall slide drop) and line 281 (`takeDamage` uncalled).
   - `systems/CavernTilemap.ts`: Inspect line 19 (`isSolid: false` spike pit tile).

2. **Project Verification Steps (Post-Implementation)**:
   - Run type checking / build: `npx tsc --noEmit` or build command in `src/games/hollow-clash`.
   - Test Wall Sliding: Jump against mossy left/right wall, hold direction towards wall. Confirm smooth sliding at 70 speed limit and successful wall jumping.
   - Test Spike Pit: Fall into spike pit at `x: 280-400`. Confirm 1 Mask HP damage is deducted, player flicker invulnerability triggers, and player respawns at `lastSafeGroundPosition`.
   - Test Shadow Dash: Press skill key towards solid stone wall. Confirm player stops at wall boundary and does not clip through.
