# Visual & UI Architecture Handoff Report — Explorer 1

**Project**: HOLLOW CLASH: SHADOW METROIDVANIA  
**Working Directory**: `/home/viv/Projects/PartyPlay/src/games/hollow-clash`  
**Agent**: Explorer 1 (Visual & UI Explorer)  
**Target Milestone**: M0 / R1 & R4 Visual Identity & UI Architecture  

---

## Executive Summary

This report presents a complete investigation of the rendering pipeline, character/enemy art structures, particle systems, and top-left Gothic HUD components in HOLLOW CLASH. The project features a Pixi.js Canvas-based rendering engine across 14 source files and 4 Vitest test suites (82 passing unit tests). 

Current entity and UI rendering rely on basic geometric primitives (plain circles, smooth rounded rectangles, static hit sparks). Below are the exact observations, line-by-line evidence chains, and architectural blueprints for transforming the visual identity into a grotesque dark subterranean Metroidvania aesthetic (R1) paired with a sleek top-left Gothic HUD (R4).

---

## 1. Observation

### 1.1 Player Vessel Visual Rendering (R1)
- **Current File Location**: `src/games/hollow-clash/entities/Knight.ts` (lines 370–436)
- **Observed Behavior & Code**:
  ```typescript
  // Dark Cloak (lines 397-398)
  this.graphics.roundRect(cx - 8, cy - 2, 16, 14, 4).fill({ color: 0x1a1a2e });

  // Glowing White Horns Mask (lines 401-402)
  const maskColor = 0xffffff;
  this.graphics.ellipse(cx, cy - 8, 8, 7).fill({ color: maskColor });

  // Horns (lines 405-408)
  if (this.state.mask === 'vessel') {
    this.graphics.poly([cx - 6, cy - 12, cx - 8, cy - 20, cx - 2, cy - 14]).fill({ color: maskColor });
    this.graphics.poly([cx + 6, cy - 12, cx + 8, cy - 20, cx + 2, cy - 14]).fill({ color: maskColor });
  }

  // Eye holes (lines 411-412)
  this.graphics.ellipse(cx - 3 * faceDir, cy - 7, 2, 3).fill({ color: 0x000000 });
  this.graphics.ellipse(cx + 3 * faceDir, cy - 7, 2, 3).fill({ color: 0x000000 });
  ```
- **Analysis of Current State**:
  - The mask skull is drawn as a smooth symmetric ellipse (`0xffffff`) with identical symmetric horns (`[cx-6, cy-12, cx-8, cy-20, cx-2, cy-14]` vs `[cx+6, cy-12, cx+8, cy-20, cx+2, cy-14]`).
  - Eye holes are plain solid black ellipses (`0x000000`) without inner glow or colored aura.
  - The cloak is rendered as a basic rounded rectangle (`0x1a1a2e`) with smooth borders, missing dark tattered fringes or ragged edges.
- **Required Behavior (R1)**:
  - **Cracked Horned Mask**: Asymmetrical horn structure (left horn longer/jagged: `[cx-7, cy-12, cx-9, cy-22, cx-2, cy-14]`, right horn chipped/broken: `[cx+5, cy-12, cx+7, cy-17, cx+2, cy - 14]`), overlaid with dark diagonal crack lines (`0x0f172a`) across the skull mask face.
  - **Glowing Eyes**: Dual-layer eye rendering featuring a glowing cyan (`0x00f0ff`) or crimson (`0xff0055`) outer glow aura (`ellipse` with `alpha: 0.8`) and a bright white/cyan core (`ellipse` size 1.5x2).
  - **Dark Tattered Cloak**: Ragged polygon fringe along the bottom edge (`poly([cx-8, cy-2, cx+8, cy-2, cx+8, cy+12, cx+5, cy+8, cx+2, cy+13, cx-2, cy+9, cx-5, cy+14, cx-8, cy+10])`) in abyssal dark tone (`0x0f172a` / `0x111827`).

---

### 1.2 Enemy & Boss Rendering & Dark Slime Particle Effects (R1)
- **Current File Locations**:
  - `src/games/hollow-clash/entities/Enemy.ts` (lines 100–129)
  - `src/games/hollow-clash/entities/BossMossKnight.ts` (lines 219–277)
  - `src/games/hollow-clash/entities/Knight.ts` (lines 313–327)
- **Observed Behavior & Code**:
  - `Enemy.ts` (lines 105–123):
    ```typescript
    if (this.type === 'spore_bug') {
      g.ellipse(x, y, 7, 5).fill({ color: 0x1abc9c });
      g.circle(x + 4 * faceDir, y - 2, 2).fill({ color: 0x00f0ff });
      g.ellipse(x, wingY, 6, 3).fill({ color: 0xffffff, alpha: 0.7 });
    } else if (this.type === 'mantis_crawler') {
      g.rect(x - 6, y - 12, 12, 12).fill({ color: 0x27ae60 });
      g.poly([x + 6 * faceDir, y - 14, x + 12 * faceDir, y - 4, x + 6 * faceDir, y - 6]).fill({ color: 0x2ecc71 });
    } else {
      g.rect(x - 7, y - 16, 14, 16).fill({ color: 0x34495e });
      g.rect(x + 5 * faceDir, y - 16, 6, 16).fill({ color: 0x7f8c8d });
    }
    ```
  - `BossMossKnight.ts` (lines 239–251):
    ```typescript
    const armorColor = this.phase === 1 ? 0x27ae60 : 0xe67e22;
    g.rect(x - 14, y - 32, 28, 32).fill({ color: armorColor });
    g.rect(x - 10, y - 44, 20, 14).fill({ color: 0x2c3e50 });
    ```
  - Particle Emitter in `Knight.ts` (lines 313–327):
    ```typescript
    private spawnHitParticles(x: number, y: number) {
      for (let i = 0; i < 5; i++) {
        this.trailParticles.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 80,
          vy: (Math.random() - 0.5) * 80,
          life: 0.2,
          maxLife: 0.2,
          color: 0xffffff, // Plain white square particles
          alpha: 0.9,
          size: 3,
        });
      }
    }
    ```
- **Analysis of Current State**:
  - Regular enemies are drawn as basic geometric blocks (teal ellipse for spore bug, green rectangle for mantis, navy rectangle for husk).
  - Hit effects spawn 5 generic white (`0xffffff`) square particles with zero gravity or fluid physics.
  - The Boss uses flat color rectangles (`0x27ae60` green in P1, `0xe67e22` orange in P2) without grotesque chitin textures, bio-spore pustules, or dripping sludge trails.
- **Required Behavior (R1)**:
  - **Grotesque Mutant Art Overhaul**:
    - `spore_bug` -> **Mutant Spore Husk**: Bulbous pulsating spore sac (`0x15803d` / `0x047857`) with dripping bio-sludge droplets underneath, twitching mandibles (`g.poly`), and asymmetrical void eyes.
    - `mantis_crawler` -> **Jagged Thorn Crawler**: Multi-jointed exoskeleton with serrated chitin scythes (`0x14532d`), twitching red eye-clusters (`0xd97706`), and grotesque mandible mandibles.
    - `shielded_husk` -> **Chitin Shield Abomination**: Twisted bone/carapace shield with ribbed spine plates, pulsating core, and grotesque bio-slime trail.
    - `BossMossKnight` -> **Subterranean Moss Abomination**: Multi-layered chitin armor with fungal spores, dripping bio-sludge tentacles, enraged Phase 2 aura emitting dark purple/void sludge particles (`0x4c1d95` / `0x15803d`) and acid shockwaves.
  - **Dark Slime/Sludge Particle System**:
    - Introduce dedicated bio-sludge particle emitters on enemy hits and boss movement.
    - Particles drop with downward gravity acceleration (`vy += 180 * dt`), color palette mixing `0x15803d` (bio-green), `0x4c1d95` (abyssal purple), and `0x0f172a` (dark sludge tar), varying sizes (2–6px), and splatting effects upon ground contact.

---

### 1.3 Top-Left Gothic HUD Rendering (R4)
- **Current File Location**: `src/games/hollow-clash/systems/SideHUDManager.ts` (lines 51–136)
- **Observed Behavior & Code**:
  - `renderPlayerHUD` (lines 51–100):
    ```typescript
    // Player Tag (line 62)
    PixelFont.drawText(this.graphics, `P${pId}`, startX, startY, pColor, 1);

    // Mask HP Shells (lines 66-73)
    for (let m = 0; m < knight.maxHp; m++) {
      const mx = startX + 16 + m * 11;
      if (m < currentHp) {
        this.graphics.roundRect(mx, startY, 9, 11, 2).fill({ color: 0xf8fafc });
      } else {
        this.graphics.roundRect(mx, startY, 9, 11, 2).fill({ color: 0x1e293b });
      }
    }

    // Geo Count (line 76)
    PixelFont.drawText(this.graphics, `GEO:${knight.geoCount || 0}`, startX, startY + 15, 0xf59e0b, 1);

    // Cyan Soul Vessel Meter (lines 78-99)
    const barX = vesselX + 22;
    this.graphics.roundRect(barX - 1, vesselY - 1, vesselW + 2, vesselH + 2, 2).stroke({ color: 0x00b0ff, width: 1 });
    this.graphics.roundRect(barX, vesselY, vesselW, vesselH, 1).fill({ color: 0x0f172a });
    if (fillW > 0) {
      this.graphics.roundRect(barX, vesselY, fillW, vesselH, 1).fill({ color: 0x00e5ff });
    }
    ```
  - `renderBossHUD` (lines 102–135): Renders Boss Health Bar top-center (`x = viewportW / 2 - 90 = 150`, `y = 16`) displaying `"MOSS KNIGHT"`, HP fill bar, and `ENRAGED` indicator.
- **Analysis of Current State**:
  - Mask HP shells are plain rounded rectangles (`9x11px`). They lack cracked mask iconography when depleted or ornate bone mask silhouettes when full.
  - The Soul Vessel meter is rendered as a standard horizontal progress bar rather than a sleek top-left Gothic vessel gauge (circular/ornate vessel orb with vertical fluid filling).
  - The HUD elements are arranged in flat linear text/rect blocks without an overarching gothic UI frame.
- **Required Behavior (R4)**:
  - **Ornate Gothic HUD Layout**:
    - **Soul Vessel Orb / Gauge**: Prominent circular/gothic soul vessel orb (radius 16–20px) positioned on the left of the top-HUD block (`x=12, y=12`). Features glowing cyan liquid (`0x00f0ff`) filling vertically inside the vessel sphere corresponding to `soul` (0–100), with a distinct 33-Soul threshold tick mark for Focus Spell readiness and swirling soul particle wisps.
    - **Cracked Mask HP Containers**: Horned mask icon containers replacing plain rounded rectangles. Depleted masks display dark cracked skull graphics (`0x1e293b` container with `0x0f172a` crack lines), while active masks glow bone-white (`0xf8fafc`) with subtle cyan eye slits.
    - **Geo Counter**: Ornate gold emblem (diamond coin graphic `0xf1c40f` + dark border) adjacent to gold typography (`GEO: <count>`).
    - **Screen-Space Boss HUD**: Maintained at top-center (`x=150, y=16`) in screen space, camera-locked, displaying enraged phase status.

---

### 1.4 Build & Test Setup Details
- **Test Command**: `npx vitest run src/games/hollow-clash`
- **Observed Command Output**:
  ```
  RUN v4.1.10 /home/viv/Projects/PartyPlay

  ✓ src/games/hollow-clash/HollowClashM3Challenger.test.ts (19 tests) 25ms
  ✓ src/games/hollow-clash/HollowClash.test.ts (30 tests) 38ms
  ✓ src/games/hollow-clash/HollowClashM4Challenger.test.ts (12 tests) 52ms
  ✓ src/games/hollow-clash/HollowClashM5Challenger.test.ts (21 tests) 43ms

  Test Files  4 passed (4)
       Tests  82 passed (82)
  ```
- **Project Build System Note**:
  - Running root `npm run build` executes `tsc -b && vite build`.
  - Current root `tsc -b` flags 5 type check errors in `src/games/dungeon-brawl` (unrelated to `hollow-clash`).
  - `src/games/hollow-clash` compiles cleanly and passes all 82 unit tests.

---

## 2. Logic Chain

1. **Player Vessel Transformation**:
   - *Observation*: `Knight.ts` lines 397–413 draw symmetric white horns, plain black eyes, and a flat rectangular cloak.
   - *Deduction*: By updating `render()` in `Knight.ts` to draw asymmetrical horns (left horn extended, right horn broken), black crack strokes across the mask face, dual-layer cyan/crimson glowing eyes, and ragged polygon cloak fringes, the player character immediately matches the dark Metroidvania vessel identity without altering physics or collision boxes (`width: 16, height: 24`).

2. **Grotesque Enemy & Slime Particle Architecture**:
   - *Observation*: `Enemy.ts` lines 105–123 draw simple geometric shapes, while `Knight.ts` lines 313–327 spawn simple white square sparks.
   - *Deduction*: Redesigning `Enemy.render()` and `BossMossKnight.render()` to draw organic grotesque features (dripping spore sacs, twitching mandibles, chitin spine plates) combined with replacing `spawnHitParticles()` with a dark bio-sludge droplet emitter (`0x15803d` green + `0x4c1d95` purple, gravity acceleration `vy += 180 * dt`) fulfills R1's dark subterranean aesthetic requirement while preserving enemy hitboxes and combat logic.

3. **Top-Left Gothic HUD Structure**:
   - *Observation*: `SideHUDManager.ts` lines 51–100 render horizontal text/rect blocks for player HUD and linear progress bar for Soul.
   - *Deduction*: Refactoring `renderPlayerHUD()` in `SideHUDManager.ts` to draw a top-left gothic assembly—featuring a circular Soul Vessel orb with vertical liquid fill (0–100), horned Mask HP icons with cracked depleted states, and a gold Geo emblem—upgrades the game's presentation to a sleek Gothic UI while preserving state reactivity with `KnightState`.

4. **Safety & Zero-Regression Guarantee**:
   - *Observation*: All 82 tests in `hollow-clash` pass via `npx vitest run src/games/hollow-clash`.
   - *Deduction*: All proposed visual enhancements are 100% cosmetic canvas rendering operations (`Graphics` primitive calls in `render()`). They do not change state properties, physics parameters, or input bindings, ensuring zero breakage in existing mechanics or test suites.

---

## 3. Caveats

1. **Read-Only Scope Boundary**:
   - As Explorer 1, no source code files in `src/games/hollow-clash/` were modified. This document provides the complete evidence chain and implementation blueprint for downstream implementer agents.
2. **Root Workspace Build Note**:
   - `npm run build` runs `tsc -b` across all games in `PartyPlay`. `src/games/dungeon-brawl` currently has pre-existing TypeScript errors. Validation of `hollow-clash` must be executed via `npx vitest run src/games/hollow-clash` and targeted type-checking.
3. **Canvas Performance Budget**:
   - Complex polygon drawing for particles and HUD framing must reuse pre-allocated primitive buffers or optimized `Graphics` clearing calls (`this.graphics.clear()`) to maintain 60 FPS performance on 480x270 canvas viewports.

---

## 4. Conclusion & Implementation Blueprint

### Blueprint 1: Player Vessel Visual Enhancements (`entities/Knight.ts`)
- Replace lines 397–413 in `Knight.ts` with:
  1. **Dark Tattered Cloak**: Jagged bottom fringe `g.poly([cx-8, cy-2, cx+8, cy-2, cx+8, cy+12, cx+5, cy+8, cx+2, cy+13, cx-2, cy+9, cx-5, cy+14, cx-8, cy+10])` filled with `0x0f172a`.
  2. **Asymmetrical Cracked Mask**:
     - Left horn: `g.poly([cx-7, cy-12, cx-9, cy-22, cx-2, cy-14])`
     - Right horn (broken tip): `g.poly([cx+5, cy-12, cx+7, cy-17, cx+2, cy-14])`
     - Crack strokes: `g.poly([cx-3, cy-12, cx-1, cy-8, cx+2, cy-6]).stroke({ color: 0x0f172a, width: 1 })`
  3. **Glowing Eyes**:
     - Outer glow: `g.ellipse(cx - 3*faceDir, cy - 7, 3, 4).fill({ color: 0x00f0ff, alpha: 0.8 })`
     - Inner core: `g.ellipse(cx - 3*faceDir, cy - 7, 1.5, 2).fill({ color: 0xffffff })`

### Blueprint 2: Dark Slime Particles & Grotesque Enemy Art (`entities/Enemy.ts`, `entities/BossMossKnight.ts`, `entities/Knight.ts`)
- Update `spawnHitParticles()` in `Knight.ts` (lines 313–327) to spawn 8 dark bio-sludge droplets:
  - Colors: Randomly pick from `[0x15803d, 0x4c1d95, 0x0f172a]` (bio-green, void purple, dark sludge tar).
  - Gravity: Add downward velocity acceleration in `updateParticles()`.
- Update `Enemy.render()` in `Enemy.ts` (lines 100–129) to draw:
  - Spore Husk: Bulbous sac with green/purple slime aura and twitching mandibles.
  - Thorn Crawler: Serrated chitin scythes (`0x14532d`) and crimson multi-eyespots.
  - Chitin Husk: Bone-ribbed shield with pulsating core.

### Blueprint 3: Sleek Top-Left Gothic HUD (`systems/SideHUDManager.ts`)
- Overhaul `renderPlayerHUD()` in `SideHUDManager.ts` (lines 51–100):
  1. **Soul Vessel Orb**: Circular soul container (`x=14, y=18, radius=14`) filled with vertical cyan liquid (`0x00f0ff`) proportional to `knight.soul / maxSoul`, marked with 33-Soul Focus cost line.
  2. **Cracked Mask HP Icons**: Mask silhouette icons (`x = startX + 36 + m * 13`) displaying white bone finish (`0xf8fafc`) when active and dark cracked skull texture (`0x1e293b` + `0x0f172a` cracks) when depleted.
  3. **Geo Emblem**: Gold diamond coin icon (`0xf1c40f`) next to gold count typography.

---

## 5. Verification Method

To independently verify the visual architecture and implementation details:

1. **Run Unit Test Suite**:
   ```bash
   npx vitest run src/games/hollow-clash
   ```
   *Expected Result*: All 82 tests in `HollowClash.test.ts`, `HollowClashM3Challenger.test.ts`, `HollowClashM4Challenger.test.ts`, and `HollowClashM5Challenger.test.ts` pass with 0 errors.

2. **Inspect Source Files & Line Numbers**:
   - Inspect `src/games/hollow-clash/entities/Knight.ts` (lines 370–436) for player vessel drawing logic.
   - Inspect `src/games/hollow-clash/entities/Enemy.ts` (lines 100–129) & `entities/BossMossKnight.ts` (lines 219–277) for enemy/boss art structures.
   - Inspect `src/games/hollow-clash/systems/SideHUDManager.ts` (lines 51–136) for HUD components.

3. **Invalidation Conditions**:
   - Any proposed change that breaks player/enemy AABB hitboxes, alters physics constants in `config.ts`, or causes test failures in `src/games/hollow-clash` invalidates the implementation blueprint.
