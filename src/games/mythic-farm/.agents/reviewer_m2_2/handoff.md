# M2 Review & Adversarial Challenge Report: Weather, Seasonal Transitions & Engine Integration

**Target Files**:
- `src/games/mythic-farm/systems/WeatherSystem.ts`
- `src/games/mythic-farm/index.ts`
- `src/games/mythic-farm/systems/FarmingSystem.ts`
- `src/games/mythic-farm/entities/Grid.ts`
- `src/games/mythic-farm/entities/Crop.ts`

---

## 1. Observation

Direct observations from source code inspection and test execution:

1. **Build & Test Verification**:
   - `npm run build` completed with zero TypeScript or Vite bundling errors (`✓ built in 439ms`).
   - `npx vitest run src/games/mythic-farm` ran 8 test files with 220 tests total, and **all 220 tests passed**.
2. **WeatherSystem.ts Code Structure**:
   - `WeatherOverlay` class (lines 16-134): Extends Pixi `Container`, manages up to 90 particles for `rain`, `thunder`, `blizzard`, and `astral_rain`, and renders lightning flash overlays (`triggerFlash()`).
   - `advanceDay(farmState)` (lines 159-175): Calculates season transition based on 7-day calendar formula:
     ```typescript
     farmState.currentDay = (farmState.currentDay || 1) + 1;
     const seasonIndex = Math.floor((farmState.currentDay - 1) / DAYS_PER_SEASON) % SEASONS_ORDER.length;
     ```
   - `generateWeatherForSeason(season)` (lines 180-207): Applies season-specific weather probability matrix (Spring, Summer, Autumn, Winter).
   - `processMorningWeather(farmState)` (lines 222-279): Auto-waters tilled tiles during rainy weather, withers out-of-season crops (`crop.withered = true; crop.stage = 4`), and triggers 35% random lightning strike chance during thunderstorm weather.
   - `triggerLightningStrike(grid)` (lines 284-308): Strikes a random tile, withers crop if present, and triggers overlay lightning flash.
3. **index.ts Integration**:
   - Instantiates `WeatherSystem` and `FarmingSystem` during `init(context)` (lines 78-96) and adds `weatherOverlay` to `gameStageContainer`.
   - Calls `this.farmingSystem.update(dt)` and `this.weatherSystem.update(dt)` inside `update(dt)` (lines 117-130).
   - Accumulates `this.gameTimeAccumulator += dt` (line 121), but **never uses `gameTimeAccumulator` to trigger day advancement or weather ticks**, nor does `index.ts` export or call an `advanceDay()` method.
4. **FarmingSystem.ts Side-Effects**:
   - `FarmingSystem.advanceDay()` (lines 209-243) increments `this.state.currentDay += 1` (line 210) AND calls `this.grid.resetDailyMoisture()` (line 219) which sets `tile.watered = false` on all unfertilized tiles.
5. **Code Integrity Check**:
   - No hardcoded test shortcuts, facade implementations, or self-certifying dummy logic were detected. Code implementations are authentic and fully functional.

---

## 2. Logic Chain

1. **Reasoning Step 1 (Day Advancement Disconnect in `index.ts`)**:
   - *Observation*: `index.ts:121` increments `gameTimeAccumulator` by `dt` every frame, but lines 122-130 contain no conditional check against `DAY_DURATION_SECONDS` (60s) nor any invocation of `WeatherSystem.advanceDay()` or `FarmingSystem.advanceDay()`.
   - *Deduction*: In real-time gameplay, the game loop ticks indefinitely without ever advancing the in-game calendar from Day 1 to Day 2. Seasonal transitions and morning weather updates never run automatically.

2. **Reasoning Step 2 (Double Day Increment Conflict)**:
   - *Observation*: `WeatherSystem.advanceDay(farmState)` contains `farmState.currentDay = (farmState.currentDay || 1) + 1` (line 165). `FarmingSystem.advanceDay()` contains `this.state.currentDay += 1` (line 210).
   - *Deduction*: If an orchestrator or engine loop calls both `weatherSystem.advanceDay(farmState)` and `farmingSystem.advanceDay()`, `farmState.currentDay` will be incremented twice per day step (skipping odd/even days).

3. **Reasoning Step 3 (Moisture Reset vs. Rain Auto-Hydration Visual Desync)**:
   - *Observation*: `WeatherSystem.processMorningWeather()` sets `grid[r][c].watered = true` on rainy days. However, `FarmingSystem.advanceDay()` calls `grid.resetDailyMoisture()`, which sets `grid[r][c].watered = false` and calls `updateTileSprite()`, assigning the `tile_tilled` (dry) texture to all tiles.
   - *Deduction*: If `resetDailyMoisture()` runs after `processMorningWeather()`, rainy tiles will visually turn dry (`tile_tilled`) on screen, causing a visual desync between the weather particle effect and tile moisture visuals.

4. **Reasoning Step 4 (Sprite Texture Update Omission)**:
   - *Observation*: `WeatherSystem.processMorningWeather()` and `triggerLightningStrike()` set `tile.crop.withered = true` and `tile.crop.stage = 4` on `CropEntity` data objects. Neither method calls `crop.updateTexture()` on the Pixi `Crop` container entity.
   - *Deduction*: Struck or withered crops retain their previous visual sprite (e.g. Stage 2 Flowering) on screen until a separate visual refresh occurs.

---

## 3. Caveats

- **No Caveats**: All relevant files (`WeatherSystem.ts`, `index.ts`, `FarmingSystem.ts`, `Grid.ts`, `Crop.ts`, `config.ts`, `types.ts`, and test suites) were directly viewed and analyzed.

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

While the component-level implementation of `WeatherSystem.ts` and `WeatherOverlay` is well-constructed with zero integrity violations, 3 Major design and integration issues prevent clean runtime execution in `index.ts`.

---

## Review Summary & Findings

### Findings

#### [Major] Finding 1: Engine Day Loop Disconnect in `index.ts`
- **What**: `index.ts` accumulates delta time into `gameTimeAccumulator`, but never checks `gameTimeAccumulator >= DAY_DURATION_SECONDS` nor triggers day advancement or morning weather ticks.
- **Where**: `src/games/mythic-farm/index.ts`, lines 117-130.
- **Why**: The game loop never advances the in-game calendar from Day 1, meaning seasons never change and dynamic weather updates never execute during gameplay.
- **Suggestion**: In `index.ts#update(dt)`, when `gameTimeAccumulator >= DAY_DURATION_SECONDS`, deduct `DAY_DURATION_SECONDS` and invoke an `advanceDay()` helper that coordinates `WeatherSystem` and `FarmingSystem` day transitions.

#### [Major] Finding 2: Double `currentDay` Increment Bug
- **What**: `WeatherSystem.advanceDay(farmState)` (line 165) and `FarmingSystem.advanceDay()` (line 210) both increment `currentDay`.
- **Where**: `src/games/mythic-farm/systems/WeatherSystem.ts:165` & `src/games/mythic-farm/systems/FarmingSystem.ts:210`.
- **Why**: Executing both system day-advance routines during a calendar transition causes `currentDay` to advance by +2 instead of +1.
- **Suggestion**: Single-source `currentDay` increment within `WeatherSystem.advanceDay()` or a top-level engine manager.

#### [Major] Finding 3: Soil Moisture Reset vs. Rain Auto-Hydration Visual Desync
- **What**: `FarmingSystem.advanceDay()` calls `resetDailyMoisture()` which sets `tile.watered = false` and updates tile sprites to dry soil (`tile_tilled`), overriding `WeatherSystem.processMorningWeather()`'s rain hydration.
- **Where**: `src/games/mythic-farm/systems/FarmingSystem.ts:219` & `src/games/mythic-farm/systems/WeatherSystem.ts:241-253`.
- **Why**: Soil tiles appear dry during rainstorms if moisture reset runs after weather processing or without re-triggering weather auto-watering.
- **Suggestion**: Sequence day transitions such that `grid.resetDailyMoisture()` runs first, followed by `weatherSystem.processMorningWeather()` which re-hydrates tilled tiles and updates tile textures via `updateTileSprite()`.

#### [Minor] Finding 4: Missing Sprite Texture Refresh on Lightning Strike / Morning Withering
- **What**: `WeatherSystem.processMorningWeather()` and `triggerLightningStrike()` update `crop.withered = true` and `crop.stage = 4` on the data object, but do not invoke `crop.updateTexture()` on the Pixi display object.
- **Where**: `src/games/mythic-farm/systems/WeatherSystem.ts:262-264` & `297-301`.
- **Why**: Struck/withered crops do not immediately change to the withered texture on screen.
- **Suggestion**: Lookup the `Crop` display instance from `Grid` when modifying crop state in `WeatherSystem` and call `crop.updateTexture()`.

---

## Verified Claims

- `npm run build` succeeds cleanly → verified via `run_command` → **PASS**
- `npx vitest run src/games/mythic-farm` (220 tests) → verified via `run_command` → **PASS**
- Season calendar 7 days/season transition math → verified via code trace & unit tests → **PASS**
- Dynamic weather probability matrix per season → verified via code inspection → **PASS**
- Weather particle overlay rendering (Rain, Thunder, Blizzard, Astral Rain) → verified via code inspection → **PASS**
- Code integrity (no hardcoded test outputs or dummy facades) → verified via code inspection → **PASS**

---

## Adversarial Challenge Report

### Challenge Summary
**Overall Risk Assessment**: **MEDIUM**

### Challenges

#### [Medium] Challenge 1: Invalid or Negative `currentDay` Calendar Calculation
- **Assumption challenged**: `farmState.currentDay` is always a positive integer `>= 1`.
- **Attack scenario**: If save state or external input sets `farmState.currentDay = 0` or negative, `Math.floor((farmState.currentDay - 1) / 7) % 4` produces a negative index `-1`, evaluating `SEASONS_ORDER[-1]` to `undefined`.
- **Blast radius**: `farmState.currentSeason` becomes `undefined`, breaking crop growth season checks and throwing exceptions in `processMorningWeather`.
- **Mitigation**: Guard `farmState.currentDay` using `Math.max(1, farmState.currentDay || 1)`.

#### [Medium] Challenge 2: Rain Hydration Visual Overwrite on Daily Moisture Reset
- **Assumption challenged**: Calling `FarmingSystem.advanceDay()` after rain processing maintains watered soil visuals.
- **Attack scenario**: `processMorningWeather` runs first on a rainy day, setting `tile.watered = true`. `FarmingSystem.advanceDay()` runs next and calls `grid.resetDailyMoisture()`, setting `tile.watered = false` and updating sprite texture to `tile_tilled`.
- **Blast radius**: Visual mismatch: rain particles fall on screen while ground tiles render dry brown soil.
- **Mitigation**: Ensure `processMorningWeather` runs AFTER `resetDailyMoisture()` and calls `grid.updateTileSprite()` for affected tiles.

### Stress Test Results

- **7-Day Season Transition Cycle** → Spring (Days 1-7) → Summer (Days 8-14) → Autumn (Days 15-21) → Winter (Days 22-28) → Spring (Day 29) → **PASS**
- **Weather Probability Matrix Roll** → Generates valid weather types (`sunny`, `rain`, `thunder`, `astral_rain`, `blizzard`) for all seasons → **PASS**
- **Lightning Strike Tile Selection** → Selects random tile grid coordinate and withers crop if present → **PASS**
- **Particle Overlay Lifecycle** → Destroys/clears particle graphics on weather change without memory leakage → **PASS**

---

## 5. Verification Method

To independently verify this review and findings:

1. **Build & Test Suite**:
   ```bash
   npm run build
   npx vitest run src/games/mythic-farm
   ```
2. **Inspect Engine Loop Integration**:
   - Inspect `src/games/mythic-farm/index.ts` lines 117-130. Confirm `gameTimeAccumulator` is not checked against `DAY_DURATION_SECONDS` and no `advanceDay()` method is present.
3. **Inspect Duplicate Increment**:
   - Compare `src/games/mythic-farm/systems/WeatherSystem.ts` line 165 (`farmState.currentDay = (farmState.currentDay || 1) + 1`) with `src/games/mythic-farm/systems/FarmingSystem.ts` line 210 (`this.state.currentDay += 1`).
4. **Inspect Weather Sprite Texture Update**:
   - Inspect `src/games/mythic-farm/systems/WeatherSystem.ts` lines 262-264 & 297-301. Confirm `crop.updateTexture()` is not invoked when modifying crop stage/withered status.
