# Handoff Report — Mechanics & Physics Architecture (R2)

## 1. Observation

Direct examination of the existing codebase at `/home/viv/Projects/PartyPlay/src/games/hollow-clash` reveals the following exact structures and code locations:

### 1.1 Physics Engine (`systems/PlatformPhysics.ts`)
- **Gravity & Speeds** (`config.ts`, lines 1-11):
  ```typescript
  export const PLATFORM_PHYSICS = {
    GRAVITY: 1200,
    JUMP_VELOCITY: -420,
    MOVE_SPEED: 180,
    WALL_SLIDE_SPEED: 70,
    SHADOW_DASH_SPEED: 380,
    SHADOW_DASH_DURATION: 0.25,
    SHADOW_DASH_COOLDOWN: 1.2,
    POGO_BOUNCE_VELOCITY: -350,
    NAIL_RECOIL_VELOCITY: 120,
  };
  ```
- **AABB Tile Collision Loop** (`systems/PlatformPhysics.ts`, lines 38-80):
  - Resolves horizontal movement (`x += dx`) first (lines 38-51), setting `vx = 0` upon wall hit.
  - Resolves vertical movement (`y += dy`) second (lines 53-80), setting `vy = 0` and `isGrounded = true` upon floor hit.
- **Moss Wall Sliding** (`systems/PlatformPhysics.ts`, lines 89-116):
  - Checks if `!knight.isGrounded && knight.vy > 0 && !knight.isShadowDashing` and tests if knight is flush (within `1.0px`) against a tile of `type === 'moss'`.
  - If flush, sets `knight.isWallSliding = true` and caps falling speed to `PLATFORM_PHYSICS.WALL_SLIDE_SPEED` (70 px/s).
  - *Gap*: No wall clinging state (`isWallClinging`) exists for staying attached to a wall when `vy <= 0` or while stationary/charging abilities.

### 1.2 Soul Spells System (`entities/SoulSpell.ts`, `entities/Knight.ts`, `index.ts`)
- **Current Soul Spell Definitions** (`types.ts`, line 5):
  ```typescript
  export type SoulSpell = 'vengeful_spirit' | 'focus_heal';
  ```
- **Spell Casting in `index.ts`** (lines 196-203):
  ```typescript
  if (input.isJustPressed('focus') && knight.state.soul >= 33) {
    knight.state.soul -= 33;
    if (knight.state.hp < knight.state.maxHp) {
      knight.state.hp += 1;
    }
    this.spells.push(new SoulSpell(`spell-${Date.now()}`, 'vengeful_spirit', knight.state.x, knight.state.y - 12, knight.state.facing === 'right'));
    this.ctx.audio.playTone(520, 'sine', 0.3);
  }
  ```
  - *Observation*: Pressing focus currently consumes 33 Soul, heals 1 HP, AND fires a `vengeful_spirit` projectile simultaneously.
- **`entities/SoulSpell.ts`** (lines 3-46):
  - Only supports horizontal projectile `vengeful_spirit` (`vx = 360` or `-360`, `damage = 40`, `lifetime = 2.0`) and stationary ring `focus_heal`.
  - *Gap*: Missing **Abyssal Shriek** (upward blast) and **Desolate Dive** (downward slam + shockwave).

### 1.3 Super Dash & Dash System (`entities/Knight.ts`)
- **Shadow Dash** (`entities/Knight.ts`, lines 102-114, 152-158):
  - Triggered by `input.dashJustPressed` when `dashCooldownTimer <= 0`.
  - Locks `vy = 0`, sets `vx = ±380`, grants invulnerability for 0.25s, cooldown 1.2s.
- *Gap*: **Crystal Super Dash** does not exist anywhere in the codebase. There is no charging mechanic, rocket flight velocity, or long-distance horizontal propulsion.

### 1.4 Downward Slash & Airborne Pogo Bouncing (`entities/Knight.ts`)
- **Pogo Implementation** (`entities/Knight.ts`, lines 296-299):
  ```typescript
  if (this.attackDirection === 'down' && (hitEnemy || hitSpikes)) {
    this.state.vy = PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY;
    this.canDoubleJump = true; // restores double jump!
  }
  ```
- *Gap*: Downward pogo currently resets `canDoubleJump`, but DOES NOT reset dash abilities (`dashCooldownTimer = 0`, `canShadowDash = true`, `canCrystalDash = true`).

### 1.5 Equippable Charm / Perk System (`types.ts`, `entities/Knight.ts`, `systems/SideHUDManager.ts`)
- *Observation*: No charm types, charm state, or perk modifier calculations exist in `types.ts`, `config.ts`, `Knight.ts`, or `SideHUDManager.ts`.

---

## 2. Logic Chain

1. **Physics Engine Unification & New Movement States**:
   - The physics engine in `PlatformPhysics.ts` cleanly resolves AABB collisions for normal movement and Shadow Dash.
   - Adding Crystal Super Dash (`isCrystalDashing`), Desolate Dive (`isDiving`), and Moss Wall Clinging (`isWallClinging`) requires integrating their velocity and collision rules directly into `PlatformPhysics.ts`.
   - Specifically, during Crystal Super Dash (`vx = 600`, `vy = 0`), horizontal AABB collision must stop the flight instantly (`isCrystalDashing = false`, `vx = 0`) upon wall contact without clipping.
   - During Desolate Dive (`vy = 600`), vertical AABB collision with a solid floor tile must trigger ground landing, cancel dive state (`isDiving = false`), and spawn the `dive_shockwave` spell.

2. **Soul Spells System Architecture**:
   - `types.ts` must define 3 distinct combat spells costing 33 Soul each:
     - `vengeful_spirit`: Horizontal soul wave travelling in facing direction.
     - `abyssal_shriek`: Upward void blast column (`width = 44`, `height = 80`, multi-hit over 0.3s).
     - `desolate_dive`: Downward slam with i-frames + ground shockwave (`width = 100`, `height = 24`, `damage = 50`).
   - Input mapping needs clean separation:
     - `neutral/forward + castSpell` -> Vengeful Spirit
     - `up + castSpell` -> Abyssal Shriek
     - `down + castSpell` (in air) -> Desolate Dive
     - `hold castSpell / focus` (grounded) -> Focus Heal channel (0.8s channel time).

3. **Crystal Super Dash Architecture**:
   - States: `isChargingSuperDash` (0.8s stationary charge phase with crystal aura particles) -> `isCrystalDashing` (600 px/s rocket flight).
   - Charging can occur on solid ground or while clinging to a moss wall.
   - Flight is cancelled by Jump/Dash press, taking damage, or colliding with a wall.

4. **Airborne Pogo Bounce Refinement**:
   - `performAttack()` in `Knight.ts` must be updated so that landing a downward pogo slash on an enemy, spike pit, or breakable hazard resets BOTH `canDoubleJump = true` AND `dashCooldownTimer = 0` (as well as refreshing shadow/crystal dash flags).

5. **Charm / Perk System Integration**:
   - Define `CharmType = 'quick_slash' | 'longnail' | 'spore_shroom' | 'lifeblood_heart'`.
   - Modifiers:
     - `Quick Slash`: Reduces attack cooldown from `0.3s` to `0.18s` (0.6x multiplier).
     - `Longnail`: Scales attack hitbox dimensions by `1.5x` (forward 28x32 -> 42x32; up 32x28 -> 48x42; down 32x28 -> 48x42) and increases visual slash arc scale.
     - `Spore Shroom`: Spawns a `SporeCloud` entity (radius 40, duration 2.5s, 4 dmg per 0.3s tick) around the knight whenever focusing/healing or taking damage.
     - `Lifeblood Heart`: Adds +2 blue Lifeblood Masks to `KnightState.lifebloodHp` on spawn/bench, which absorb damage before standard Mask HP.

---

## 3. Caveats

- **Read-Only Scope**: As Explorer 2, no source code files in `/home/viv/Projects/PartyPlay/src/games/hollow-clash/` have been modified during this investigation.
- **Input Action Mapping**: The current `manifest.ts` maps `action` (Attack), `skill` (Dash), and `focus` (Spell/Heal). Adding distinct spell directions (`up`, `down`, `neutral`) relies on existing directional inputs (`moveUp`, `moveDown`).
- **Test Suite Compatibility**: Existing Vitest suites (`HollowClash.test.ts`, `HollowClashM3Challenger.test.ts`, `HollowClashM4Challenger.test.ts`, `HollowClashM5Challenger.test.ts`) assert specific stats (`NAIL_DAMAGE = 25`, `SOUL_PER_HIT = 11`, `SPELL_SOUL_COST = 33`, `MASK_HP = 5`). All additions must maintain strict backward compatibility with these baseline values.

---

## 4. Conclusion & Implementation Blueprint

### 4.1 File Modification Index & Architectural Blueprint

| Target File | Required Changes & Enhancements |
|---|---|
| `types.ts` | Expand `KnightState` with `isWallClinging`, `isChargingSuperDash`, `superDashChargeTimer`, `isCrystalDashing`, `isDiving`, `equippedCharms: CharmType[]`, `lifebloodHp: number`. Define `SoulSpellType = 'vengeful_spirit' | 'abyssal_shriek' | 'desolate_dive' | 'dive_shockwave' | 'focus_heal'` and `CharmType`. |
| `config.ts` | Add constants: `CRYSTAL_DASH_SPEED: 600`, `CRYSTAL_DASH_CHARGE_TIME: 0.8`, `DESOLATE_DIVE_SPEED: 600`, `QUICK_SLASH_COOLDOWN_MULT: 0.6`, `LONGNAIL_HITBOX_MULT: 1.5`, `SPORE_SHROOM_RADIUS: 40`, `LIFEBLOOD_EXTRA_MASKS: 2`. |
| `systems/PlatformPhysics.ts` | Support `isCrystalDashing` (stop on wall collision), `isDiving` (land on floor collision & trigger shockwave), and `isWallClinging` (sticking flush against moss wall). |
| `entities/Knight.ts` | Implement spell direction checks (`vengeful_spirit`, `abyssal_shriek`, `desolate_dive`), Crystal Dash charge/propulsion, Pogo bounce resetting both jump & dash, and Charm perk effect calculations in combat/damage. |
| `entities/SoulSpell.ts` | Implement rendering and collision routines for `abyssal_shriek` (vertical void column), `desolate_dive` (downward projectile/slam), and `dive_shockwave` (expanding ground wave). |
| `entities/SporeCloud.ts` | Create new entity for Spore Shroom fungal aura (radius 40, area damage over time). |
| `systems/SideHUDManager.ts` | Render cyan Soul Vessel, blue Lifeblood Masks alongside white Mask containers, and active equippable Charm icons. |

### 4.2 Detailed System Implementation Specifications

#### A. Physics Engine & Wall Clinging/Sliding Integration
1. In `PlatformPhysics.ts`:
   - Extend horizontal collision handling: if `knight.isCrystalDashing` is true and horizontal collision occurs, set `knight.isCrystalDashing = false` and `knight.vx = 0`.
   - Extend vertical collision handling: if `knight.isDiving` is true and floor collision occurs, set `knight.isDiving = false`, `knight.vy = 0`, `knight.isGrounded = true`, and trigger `onDiveImpact()` callback to spawn `dive_shockwave`.
   - Add Wall Clinging logic: when pressing direction towards a moss wall, set `knight.isWallClinging = true` and reduce fall speed to `WALL_CLING_SPEED` (30 px/s) or 0 px/s while holding input.

#### B. Soul Spells (Vengeful Spirit, Abyssal Shriek, Desolate Dive)
1. **Vengeful Spirit**: Horizontal soul projectile (`vx = ±420`, `damage = 40`, `lifetime = 1.5s`).
2. **Abyssal Shriek**: Spawned at `(knight.x, knight.y - 40)`. Hits all enemies within AABB `x: knight.x - 22 .. knight.x + 22`, `y: knight.y - 80 .. knight.y`. Ticks 3 times for 20 damage each (total 60 damage).
3. **Desolate Dive**: Triggered in air with `down + spellKey`. Knight gains invulnerability (`isInvulnerable = true`) and dives down at `vy = 600`. Upon landing, spawns `dive_shockwave` (width 100, height 24, damage 50) expanding left and right along floor.

#### C. Crystal Super Dash
1. Holding Super Dash key (`skill` or dedicated key) initiates charge phase: `isChargingSuperDash = true`. Knight freezes in place (`vx = 0, vy = 0`) for `0.8s`.
2. Emits glowing purple/pink crystal charge particles.
3. Upon full charge / key release, sets `isCrystalDashing = true`, `vx = facing === 'right' ? 600 : -600`, `vy = 0`.
4. Rocket flight continues until wall collision, taking damage, or pressing Jump/Dash.

#### D. Downward Slash & Airborne Pogo Bouncing
1. In `Knight.ts`:
   ```typescript
   if (this.attackDirection === 'down' && (hitEnemy || hitSpikes || hitHazard)) {
     this.state.vy = PLATFORM_PHYSICS.POGO_BOUNCE_VELOCITY; // -350
     this.canDoubleJump = true; // Reset double jump
     this.state.dashCooldownTimer = 0; // Reset dash cooldown
     this.canShadowDash = true; // Reset shadow dash state
     this.canCrystalDash = true; // Reset crystal dash state
     this.spawnHitParticles(hitbox.x + hitbox.width / 2, hitbox.y);
   }
   ```

#### E. Charm / Perk System Implementation
1. **Quick Slash**:
   - Checks `this.hasCharm('quick_slash')`.
   - Modifies `attackCooldown`: `0.3 * 0.6 = 0.18s`.
   - Modifies `attackTimer`: `0.2 * 0.6 = 0.12s`.
2. **Longnail**:
   - Checks `this.hasCharm('longnail')`.
   - Scales hitbox width and height by 1.5x in `performAttack()`.
   - Scales visual slash arc dimensions by 1.5x.
3. **Spore Shroom**:
   - Checks `this.hasCharm('spore_shroom')`.
   - When `focus_heal` completes or player takes damage, spawns `SporeCloud` at `(knight.x, knight.y)`.
   - `SporeCloud` deals 4 damage every 0.3s to all enemies within 40px radius for 2.5s duration.
4. **Lifeblood Heart**:
   - On game start / respawn, initializes `knight.state.lifebloodHp = 2`.
   - Damage deduction order: `takeDamage(amount)` first reduces `lifebloodHp`, then regular `hp`.

---

## 5. Verification Method

To independently verify these architectural findings and validate future implementation:

1. **Automated Vitest Verification**:
   ```bash
   cd /home/viv/Projects/PartyPlay/src/games/hollow-clash
   npm test
   ```
   Run individual test suites:
   ```bash
   npx vitest run HollowClash.test.ts
   npx vitest run HollowClashM3Challenger.test.ts
   npx vitest run HollowClashM4Challenger.test.ts
   npx vitest run HollowClashM5Challenger.test.ts
   ```

2. **Files & Line Inspections**:
   - Confirm physics AABB loop in `systems/PlatformPhysics.ts` lines 38-80.
   - Confirm spell casting logic in `index.ts` lines 196-203.
   - Confirm pogo bounce logic in `entities/Knight.ts` lines 296-299.
   - Confirm HUD vessel rendering in `systems/SideHUDManager.ts` lines 78-99.

3. **Invalidation Conditions**:
   - If `npm test` fails with syntax or type errors.
   - If pogo bounce fails to reset jump/dash abilities.
   - If Crystal Super Dash clips through solid wall tiles at 600 px/s velocity.
   - If Soul Spells fail to deduct 33 Soul or fail to execute directional variants (Vengeful Spirit, Abyssal Shriek, Desolate Dive).
