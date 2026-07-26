# Empirical Challenge Handoff Report — M2 Farming Grid Engine

**Agent**: `challenger_m2_1`  
**Working Directory**: `/home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/challenger_m2_1`  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

### Test Execution Command & Results
Command executed:
```bash
npx vitest run src/games/mythic-farm
```
Output:
```
 Test Files  10 passed (10)
      Tests  270 passed (270)
   Start at  21:13:21
   Duration  1.45s
```

All 10 test files (270 tests total), including the newly created `src/games/mythic-farm/tests/ChallengerM2Stress.test.ts` (30 stress tests) and `src/games/mythic-farm/tests/ChallengerM2WeatherStress.test.ts` (20 stress tests), compile cleanly and pass.

---

### Empirical Findings & Vulnerabilities Discovered

#### Finding 1: `Grid.getTile(x, NaN)` and `Grid.getTile(x, float)` Throw Unhandled `TypeError`
- **Location**: `src/games/mythic-farm/entities/Grid.ts:127-132`
- **Code Snippet**:
  ```typescript
  public getTile(x: number, y: number): TileData | null {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT || !this.state.grid) {
      return null;
    }
    return this.state.grid[y][x];
  }
  ```
- **Observed Behavior**:
  Calling `grid.getTile(0, NaN)` or `grid.getTile(0, 1.5)` bypasses the bounds check because `NaN < 0` and `1.5 < 0` are false, and `NaN >= 10` is false. `this.state.grid[NaN]` or `this.state.grid[1.5]` returns `undefined`. Attempting to index `[x]` on `undefined` throws:
  `TypeError: Cannot read properties of undefined (reading '0')`
- **Impact**: Unhandled exception when non-integer or `NaN` tile coordinates are passed into tile lookups.

#### Finding 2: `Grid.getTile(NaN, y)` Violates Return Contract (Returns `undefined` Instead of `null`)
- **Location**: `src/games/mythic-farm/entities/Grid.ts:127-132`
- **Observed Behavior**:
  Calling `grid.getTile(NaN, 0)` returns `undefined` because `this.state.grid[0][NaN]` evaluates to `undefined`. The function return type annotation claims `TileData | null`. Callers checking `tile === null` fail to catch `undefined`.
- **Impact**: Return type contract violation leading to logic errors in strict equality checks.

#### Finding 3: `Grid.screenToTile(NaN, y)` Returns `{ x: NaN, y: yTile }` Instead of `null`
- **Location**: `src/games/mythic-farm/entities/Grid.ts:107-118`
- **Code Snippet**:
  ```typescript
  public screenToTile(screenX: number, screenY: number): { x: number; y: number } | null {
    const localX = screenX - this.x;
    const localY = screenY - this.y;

    const tileX = Math.floor(localX / TILE_SIZE);
    const tileY = Math.floor(localY / TILE_SIZE);

    if (tileX < 0 || tileX >= GRID_WIDTH || tileY < 0 || tileY >= GRID_HEIGHT) {
      return null;
    }
    return { x: tileX, y: tileY };
  }
  ```
- **Observed Behavior**:
  When `screenX` is `NaN`, `tileX` is `NaN`. Relational comparisons `NaN < 0` and `NaN >= GRID_WIDTH` evaluate to `false`, bypassing the bounds check. The method returns `{ x: NaN, y: 3 }` (for `screenY = 100`) instead of `null`.
- **Impact**: Invalid tile objects containing `NaN` are produced and passed downstream to systems expecting valid integer tile coordinates.

#### Finding 4: `FarmingSystem.executeToolAction` Throws `TypeError` on Invalid Tool Tier Strings
- **Location**: `src/games/mythic-farm/systems/FarmingSystem.ts:50-53`
- **Code Snippet**:
  ```typescript
  const tier = this.state.toolTiers[toolType] || 'basic';
  const config = TOOL_TIER_CONFIG[tier];
  if (this.state.energy < config.energyCost) { ... }
  ```
- **Observed Behavior**:
  If `this.state.toolTiers[toolType]` is assigned an invalid string (e.g. `'unknown_tier'`), `TOOL_TIER_CONFIG['unknown_tier']` evaluates to `undefined`. Accessing `config.energyCost` throws `TypeError: Cannot read properties of undefined (reading 'energyCost')`.
- **Impact**: Crash if state persistence or hotbar selection contains an unconfigured tool tier string.

---

## 2. Logic Chain

1. **Premise 1**: Grid lookups and tool actions are core interfaces used by mouse input handlers, keyboard events, and automated systems.
2. **Premise 2**: Javascript numerical operations can produce `NaN` or floating-point values when processing mouse screen coordinates or uninitialized state fields.
3. **Premise 3**: In JavaScript, any relational comparison (`<`, `>`, `<=`, `>=`) involving `NaN` evaluates to `false`.
4. **Step 1**: The bounds checks in `Grid.getTile` (`x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT`) rely solely on relational operators. When `x` or `y` is `NaN`, all relational comparisons return `false`, causing `getTile` to skip the guard clause.
5. **Step 2**: Indexing `this.state.grid[y]` with a non-integer or `NaN` index yields `undefined`. Accessing `[x]` on `undefined` throws a runtime `TypeError`.
6. **Step 3**: Similarly, `screenToTile` returns `{ x: NaN, y: yTile }` instead of `null`, propagating `NaN` coordinates to caller systems.
7. **Step 4**: In `FarmingSystem.executeToolAction`, looking up `TOOL_TIER_CONFIG[tier]` assumes `tier` is always a valid key in `TOOL_TIER_CONFIG`. When `tier` is invalid, `config` is `undefined`, causing a runtime `TypeError`.
8. **Conclusion**: While all standard positive scenarios, AOE scaling, giant crop mutations, energy underflows, and item pickup accumulation behave correctly, these 4 unhandled edge cases can crash the game engine during boundary input or state anomalies.

---

## 3. Caveats

- Implementation code was NOT modified (compliance with review-only role constraint).
- All bug findings were verified empirically via test assertions in `ChallengerM2Stress.test.ts`.
- No performance or memory leaks were observed during 100+ item pickup stress tests.

---

## 4. Conclusion & Recommended Mitigations

### Verdict
**REQUEST_CHANGES**

### Actionable Mitigations

1. **Fix `Grid.getTile(x, y)`**:
   ```typescript
   public getTile(x: number, y: number): TileData | null {
     if (
       !Number.isInteger(x) ||
       !Number.isInteger(y) ||
       x < 0 ||
       x >= GRID_WIDTH ||
       y < 0 ||
       y >= GRID_HEIGHT ||
       !this.state.grid
     ) {
       return null;
     }
     return this.state.grid[y][x] || null;
   }
   ```

2. **Fix `Grid.screenToTile(screenX, screenY)`**:
   ```typescript
   public screenToTile(screenX: number, screenY: number): { x: number; y: number } | null {
     if (Number.isNaN(screenX) || Number.isNaN(screenY)) return null;
     const localX = screenX - this.x;
     const localY = screenY - this.y;

     const tileX = Math.floor(localX / TILE_SIZE);
     const tileY = Math.floor(localY / TILE_SIZE);

     if (
       Number.isNaN(tileX) ||
       Number.isNaN(tileY) ||
       tileX < 0 ||
       tileX >= GRID_WIDTH ||
       tileY < 0 ||
       tileY >= GRID_HEIGHT
     ) {
       return null;
     }
     return { x: tileX, y: tileY };
   }
   ```

3. **Fix `FarmingSystem.executeToolAction` Tier Resolution**:
   ```typescript
   const rawTier = this.state.toolTiers[toolType] || 'basic';
   const config = TOOL_TIER_CONFIG[rawTier] || TOOL_TIER_CONFIG.basic;
   ```

---

## 5. Adversarial Challenge Report

### Risk Assessment: MEDIUM

### Summary of Stress Test Scenarios

| Scenario | Target Entity / System | Expected Behavior | Actual Behavior | Pass / Fail |
|----------|------------------------|-------------------|-----------------|-------------|
| Titanium 5x5 AOE at Grid Border | `FarmingSystem.ts` / `Grid.ts` | Tiles within grid tilled, out-of-bounds ignored | Tiles tilled, no out-of-bounds side effects | **PASS** |
| Energy Exact Subtraction (5 cost, 5 energy) | `FarmingSystem.ts` | Energy drains to 0, action succeeds | Energy drains to 0, action succeeds | **PASS** |
| Low Energy Prevention (5 cost, 4 energy) | `FarmingSystem.ts` | Returns false, energy remains 4 | Returns false, energy remains 4 | **PASS** |
| 3x3 Giant Pumpkin Mutation | `FarmingSystem.ts` | Mutates center pumpkin when 9 mature pumpkins match | Center pumpkin receives `isGiant = true` | **PASS** |
| Giant Pumpkin Axe Harvest | `FarmingSystem.ts` | Removes 9 crops, awards 15-21 pumpkins + 500 EXP | Removes 9 crops, awards yield & EXP, spawns pickup | **PASS** |
| 100+ Item Pickups Mass Update | `FarmingSystem.ts` | Physics update 60 frames without lag or memory leaks | Physics updates stably, lifetime expiration cleans sprites | **PASS** |
| Player Magnet Pickup (dist <= 36px & dist <= 8px) | `FarmingSystem.ts` | Magnet accelerates toward player, collected at 8px | Pickup accelerates and destroys at <= 8px | **PASS** |
| Player Position Exact Overlap (dist === 0) | `FarmingSystem.ts` | Immediate collection without NaN coordinate corruption | Collected immediately, no NaN error | **PASS** |
| `getTile(0, NaN)` & `getTile(0, 1.5)` | `Grid.ts` | Return `null` | Throws `TypeError: Cannot read properties of undefined` | **FAIL** (Finding 1) |
| `getTile(NaN, 0)` | `Grid.ts` | Return `null` | Returns `undefined` | **FAIL** (Finding 2) |
| `screenToTile(NaN, 100)` | `Grid.ts` | Return `null` | Returns `{ x: NaN, y: 3 }` | **FAIL** (Finding 3) |
| `executeToolAction` with invalid tier | `FarmingSystem.ts` | Fallback to basic tier | Throws `TypeError: Cannot read properties of undefined` | **FAIL** (Finding 4) |

---

## 6. Verification Method

To independently verify this stress test report:
1. Run the vitest test suite:
   ```bash
   npx vitest run src/games/mythic-farm
   ```
2. Inspect the test suite in `src/games/mythic-farm/tests/ChallengerM2Stress.test.ts`.
3. Verify that all 30 tests in `ChallengerM2Stress.test.ts` pass and document the exact findings noted above.
