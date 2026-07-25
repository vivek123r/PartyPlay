# Codebase Analysis & Vulnerability Report — HOLLOW CLASH: SHADOW METROIDVANIA
**Milestone 0 Audit — Focus: Requirements R3 & R4 (Combat, Level Expansion, Boss & UI Baseline)**
**Agent**: Explorer 3 (`explorer_m0_3`)
**Date**: 2026-07-25

---

## Executive Summary

A comprehensive forensic audit of `/home/viv/Projects/PartyPlay/src/games/hollow-clash` was conducted to evaluate existing combat mechanics, enemy/boss behaviors, level geometry, camera systems, UI components, and background parallax rendering against Requirements R3 & R4. 

The codebase currently compiles clean with TypeScript (`npx tsc --noEmit` exits with 0), but contains critical architectural gaps, logic bugs, missing implementations, and rendering misalignments that render the combat, boss, and UI mechanics non-functional or severely degraded.

---

## Detailed Findings by Requirement & System

### 1. Melee Slash AABB Hitboxes (Forward, Up, Down)
- **Location**: `src/games/hollow-clash/entities/Knight.ts` (lines 216–275) & `src/games/hollow-clash/index.ts` (line 179)
- **Current Behavior**:
  - `performAttack()` uses a simple radial distance formula (`Math.sqrt(dx*dx + dy*dy) < 40`) centered at `(knight.state.x, knight.state.y)` to test for hits.
  - It completely ignores directional attack parameters (`attackDirection`: 'up' | 'down' | 'forward') and player facing direction ('left' | 'right').
  - Enemies behind or above/below the knight are hit indiscriminately regardless of slash direction.
  - In `index.ts`, line 179 passes `this.boss ? [this.boss] : []` as the `enemies` array to `knight.update()`. Standard enemies (`this.enemies`) are completely omitted, making it impossible to attack or hit regular enemies (Spore Bugs, Mantis Crawlers, Shielded Husks) with melee slashes.
- **Defects Identified**:
  1. No directional AABB hitboxes (Forward, Upward, Downward).
  2. Radial hit detection ignores attack vector and facing direction.
  3. Regular enemies (`this.enemies`) are excluded from knight attack collision processing in `index.ts`.
  4. Nail slash does not trigger `enemy.takeDamage()` or `boss.takeDamage()`.

---

### 2. Enemy & Boss `takeDamage()` Handling, Visual Feedback & Soul Award
- **Location**: `entities/Enemy.ts` (lines 90–98), `entities/BossMossKnight.ts` (lines 84–88), `entities/Knight.ts` (lines 265–274), `index.ts` (lines 220–223)
- **Current Behavior**:
  - `Enemy.ts` defines `takeDamage(amount, attackDir)`.
  - `BossMossKnight.ts` defines `takeDamage(amount)`.
  - `Knight.ts` `performAttack()` detects `hitEnemy = true` and adds Soul (`addSoul(11)`), but **never calls `enemy.takeDamage()` or `boss.takeDamage()`**.
  - `SoulSpell` projectiles updated in `index.ts` (lines 220–223) move across the screen but do not perform any hit detection against regular enemies or the boss.
  - No visual feedback (white flash, hit spark particles, knockback velocity, or audio trigger) occurs when enemies or bosses are struck.
  - Soul is awarded even if an attack hits a shielded enemy or guarding boss.
- **Defects Identified**:
  1. `takeDamage()` is never invoked by player slashes or spells.
  2. Spells pass through enemies without dealing damage or registering hits.
  3. Missing hit visual feedback (flash, hit sparks, knockback).
  4. Soul is awarded on blocked hits.

---

### 3. Airborne Pogo Bounce & Spike Pit Hazard Mechanics
- **Location**: `entities/Knight.ts` (lines 259–264), `systems/CavernTilemap.ts` (line 19), `systems/PlatformPhysics.ts` (lines 33–68)
- **Current Behavior**:
  - Pogo bounce in `Knight.ts` triggers only if `attackDirection === 'down' && hitEnemy`. Because `hitEnemy` relies on radial distance to enemies, pogo bounce occurs when slashing sideways next to an enemy.
  - Slashes over spike pits (`type === 'spikes'`) do NOT trigger a pogo bounce because tiles/hazards are not checked in `performAttack()`.
  - In `CavernTilemap.ts` (line 19), spike pits are defined as `{ isSolid: false, type: 'spikes' }`.
  - In `PlatformPhysics.ts`, tiles with `!isSolid` are skipped (`if (!tile.isSolid) continue;`), allowing players to fall straight through spike pits into the void below the map.
  - No spike pit hazard collision detection, no 1 Mask HP damage deduction, and no safe ground position tracking / respawn logic exists.
- **Defects Identified**:
  1. Downward slash does not pogo on spike pits.
  2. Downward pogo on enemies uses non-directional distance check.
  3. Spike tiles have no collision or trigger detection, causing player to fall off-screen.
  4. Missing spike pit damage (-1 Mask HP) and safe ground respawn logic.

---

### 4. Level Bounds & Expansion to x=960
- **Location**: `config.ts` (lines 21–25), `index.ts` (lines 150–158), `systems/CavernTilemap.ts` (lines 12–45), `entities/Enemy.ts` (line 86)
- **Current Behavior**:
  - `config.ts` specifies `CAVERN_CONFIG.width = 480`.
  - `CavernTilemap.ts` initializes the right border wall at `x = w - 16` (`x = 464`), blocking access past x=464.
  - In `index.ts`, `cameraX` is clamped to `CAVERN_CONFIG.width`. If `CAVERN_CONFIG.width` is set to 960 without adjusting max camera pan, `cameraX` could scroll up to 960, displaying black void past the level edge. (Max camera X must be `WORLD_WIDTH - SCREEN_WIDTH` = `960 - 480 = 480`).
  - `Enemy.ts` clamps enemy movement to `CAVERN_CONFIG.width - 20` (`460`). Enemies spawned beyond x=460 (e.g. Husk at x=650, Boss at x=780) get clamped immediately to x=460.
- **Defects Identified**:
  1. Level width configured at 480px instead of 960px expansion.
  2. Right moss wall blocks traversal past x=464.
  3. Camera clamping formula uses total world width rather than max scroll offset (`WORLD_WIDTH - VIEWPORT_WIDTH`).
  4. Enemy position clamping restricts enemy AI to x <= 460.

---

### 5. 2-Phase Moss Knight Boss Encounter Logic
- **Location**: `entities/BossMossKnight.ts` (lines 6–139), `index.ts` (lines 208–218)
- **Current Behavior**:
  - Boss transitions to Phase 2 at 50% HP (`this.hp <= 300`) and changes color from green (`0x27ae60`) to orange (`0xe67e22`).
  - Boss attacks (`cleaving`, `spore_explosion`, `vine_slam`) display graphics but execute **zero collision detection** against knights. Boss attacks deal 0 damage.
  - Boss remains completely stationary (`vx = 0`, `vy = 0`), never moving toward or engaging players.
  - `vine_slam` returns `triggerVineShockwave: true`, causing `index.ts` to spawn a player `SoulSpell` projectile moving right across the ground instead of a boss hazard shockwave.
  - `guarding` stance blocks damage from all angles (including from above and behind).
  - Boss death (`this.hp <= 0`) immediately sets `this.boss = null` and triggers match over without defeat visual effects, particle bursts, or delay.
- **Defects Identified**:
  1. Boss attacks deal no damage to players.
  2. Boss is completely stationary.
  3. Vine shockwave spawns player spell instead of boss shockwave hazard.
  4. Guard stance blocks attacks from all directions.
  5. Missing boss fight arena boundary locking and death sequence polish.

---

### 6. Side HUD Cyan Soul Vessel Meter Rendering
- **Location**: `systems/SideHUDManager.ts` (lines 19–49)
- **Current Behavior**:
  - `SideHUDManager.ts` renders player label (`P1`), Mask HP icons (white/dark rounded rects), and Geo count (`GEO:0`).
  - **The cyan Soul Vessel meter is completely missing from the Side HUD rendering code.**
  - Players have no visual feedback for current Soul amount (0–100) or spell cast readiness (33 Soul cost).
  - HUD spacing (`8 + i * 115`) leaves insufficient vertical and horizontal layout space for 4 players with full Soul meters.
- **Defects Identified**:
  1. Cyan Soul Vessel meter gauge/orb is completely unrendered in Side HUD.
  2. Multi-player HUD layout requires restructuring to accommodate Soul display cleanly.

---

### 7. Top-Center Boss Health Bar Alignment
- **Location**: `entities/BossMossKnight.ts` (lines 132–138), `index.ts` (line 251)
- **Current Behavior**:
  - In `BossMossKnight.ts`, `render(g)` draws the Boss Health Bar at `barX = CAVERN_CONFIG.width / 2 - barW / 2` (x=140).
  - In `index.ts`, `this.boss.render(this.worldGraphics)` draws the boss (and its health bar) into `worldGraphics`.
  - Because `worldGraphics` is inside `worldContainer` which pans with camera movement (`worldContainer.x = -cameraX`), **the Boss Health Bar slides off screen as the camera moves!**
  - Positioning math uses `CAVERN_CONFIG.width / 2` (world coordinates) instead of fixed viewport center (screen coordinates `240`).
- **Defects Identified**:
  1. Boss Health Bar is rendered in world space inside camera-panned container.
  2. Health bar moves offscreen during camera panning instead of staying fixed at top-center of the HUD.
  3. Lacks boss title text, phase divider, and polished health bar framing.

---

### 8. Parallax Cavern Background Modulo Wrap Math
- **Location**: `systems/ParallaxCavern.ts` (lines 39–96)
- **Current Behavior**:
  - Parallax layers use simple modulo math: `(x - cameraX * factor) % w` where `w = CAVERN_CONFIG.width = 480`.
  - In JavaScript, `(val % w)` yields negative numbers when `val < 0`. For example, `cameraX = 600` on layer 0 (`0.1x`): `50 - 60 = -10`, `-10 % 480 = -10`. Coordinates become negative, causing background elements to disappear on the left and leaving empty gaps on the right.
  - Modulo `% 480` causes background elements to abruptly pop/jump when `cameraX` reaches 480px.
  - Layer 1 midground cavern wall silhouette is drawn using a single `g.poly()` with individual vertex coordinates evaluated with `% w`. Evaluating modulo on individual polygon vertices distorts and breaks the silhouette geometry completely during scrolling.
- **Defects Identified**:
  1. Standard `%` operator produces negative offsets during camera scrolling, creating seam gaps.
  2. Polygon silhouette vertices evaluate modulo independently, corrupting shape geometry.
  3. Modulo wrap bound set to 480 instead of full 960px extended world span.

---

### 9. Core Architectural & Physics Integration Issues
- **Location**: `entities/Knight.ts` & `systems/PlatformPhysics.ts`
- **Current Behavior**:
  - `Knight.ts` `update()` contains its own inline platform collision logic (lines 131–164) AND `index.ts` calls `this.physics.update()` (line 193) immediately afterward.
  - `Knight.ts` treats `(state.x, state.y)` as top-left origin, while `PlatformPhysics.ts` `checkAABB` treats `knight.x` as horizontal center (`kx - kw / 2`) and `knight.y` as feet (`ky`).
  - This conflict causes severe player jittering, wall clipping, wall sliding failures, and ground alignment errors.
  - `PlatformPhysics.ts` line 9 bypasses all tile collisions when `isShadowDashing` is true, allowing players to dash through solid walls out of bounds.
- **Defects Identified**:
  1. Duplicate, conflicting collision resolution in `Knight.ts` and `PlatformPhysics.ts`.
  2. Mismatched AABB origin definitions (Top-Left vs Center-Bottom).
  3. Shadow Dash bypasses wall collision physics.

---

## Proposed Remediation Plan & Specifications

### Summary Table of Fixes
| Item | Target File | Proposed Fix / Specification |
|------|-------------|------------------------------|
| 1 | `entities/Knight.ts` & `index.ts` | Define `getSlashHitbox()` returning AABB box based on `facing` and `attackDirection`. Pass `this.enemies` and `this.boss` to `performAttack()`. Call `takeDamage()`. |
| 2 | `entities/Enemy.ts` & `BossMossKnight.ts` | Add hit flash timer, particle spark burst, knockback impulse on `takeDamage()`. Prevent Soul award on blocked strikes. |
| 3 | `entities/Knight.ts` & `systems/PlatformPhysics.ts` | Check downward slash AABB against enemy AABBs and spike tile AABBs for pogo bounce. Add spike hazard collision, -1 HP damage, and safe ground position respawn. |
| 4 | `config.ts`, `index.ts`, `CavernTilemap.ts` | Set `CAVERN_CONFIG.width = 960`. Move right wall to x=944. Clamp `cameraX` to `Math.max(0, Math.min(960 - 480, cameraX))`. |
| 5 | `entities/BossMossKnight.ts` | Add AABB attack hitboxes for cleave, spore explosion, and vine slam dealing damage to knights. Add boss movement AI, shockwave hazard entity, and phase 2 enraged behavior. |
| 6 | `systems/SideHUDManager.ts` | Add cyan Soul Vessel meter bar/orb (`0x00f0ff`) displaying current Soul (0–100) with 33 Soul spell threshold marker. |
| 7 | `index.ts` & `SideHUDManager.ts` | Move Boss Health Bar rendering out of `worldGraphics` into screen-space UI layer fixed at top-center (`x = 240`, `y = 20`). |
| 8 | `systems/ParallaxCavern.ts` | Fix modulo math to `((val % wrapW) + wrapW) % wrapW`. Render background layers across 960px width or double-buffer tiled layer graphics to prevent seams. |
| 9 | `systems/PlatformPhysics.ts` & `entities/Knight.ts` | Unify physics collision handling into `PlatformPhysics.ts`. Fix AABB origin coordinates. Keep Shadow Dash invulnerable to damage while maintaining wall collision stopping. |

