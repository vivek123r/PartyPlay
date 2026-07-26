# M2 Review Report & Verdict

## 1. Observation
- **TypeScript Compilation**: `npx tsc --noEmit` executed with code 0 (clean build, zero type errors).
- **Test Suite Execution**: `npx vitest run src/games/mythic-farm` executed with code 0 (8 test files passed, 220 tests passed).
- **Code Inspection - Day Advancement**: In `src/games/mythic-farm/systems/FarmingSystem.ts` lines 219–236:
  ```typescript
  public advanceDay(): void {
    this.state.currentDay += 1;
    const isRainy = ...;

    // 1. Reset tile moisture & crop wateredToday
    this.grid.resetDailyMoisture();

    // 2. Advance growth for all active crops
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const crop = this.grid.getCrop(c, r);
        const tile = this.grid.getTile(c, r);
        if (crop && tile) {
          const adjSunflowers = this.countAdjacentSunflowers(c, r);
          crop.advanceGrowth(
            tile.watered || isRainy,
            this.state.currentSeason,
            this.state.currentWeather,
            adjSunflowers
          );
        }
      }
    }
  ```
  `grid.resetDailyMoisture()` is called at line 219 BEFORE `crop.advanceGrowth(...)` is called at line 228. In `Grid.ts` lines 197–198:
  ```typescript
  if (!isWaterRetained) {
    tile.watered = false;
  }
  ```
  `resetDailyMoisture()` sets `tile.watered = false` on all unfertilized tiles. When `crop.advanceGrowth(tile.watered || isRainy, ...)` runs next, `tile.watered` is already `false`, so crops watered by the player on the preceding day receive zero growth under sunny/clear weather.
- **Code Inspection - Giant Pumpkin Harvesting**: In `src/games/mythic-farm/systems/FarmingSystem.ts` lines 158–187:
  ```typescript
  public harvestCrop(tileX: number, tileY: number): boolean {
    const crop = this.grid.getCrop(tileX, tileY);
    if (!crop || crop.entity.stage !== 3 || crop.entity.withered) {
      return false;
    }
    const result = crop.harvest();
    ...
  ```
  `harvestCrop` does not check `crop.entity.isGiant`. When called on the center crop of a 3x3 giant pumpkin, it performs a standard harvest, yielding 1 single pumpkin and leaving the 8 surrounding crops intact. In contrast, `executeToolAction('axe', ...)` calls `harvestGiantPumpkin()`, which clears all 9 crops and yields 15–21 pumpkins + 500 EXP.

## 2. Logic Chain
1. Player tills and waters a tile (`tile.watered = true`), then plants a crop.
2. When the day ends or morning tick triggers, `farmingSystem.advanceDay()` is called.
3. `advanceDay()` calls `this.grid.resetDailyMoisture()`, setting `tile.watered = false`.
4. Immediately following this, `advanceDay()` loops through crops and calls `crop.advanceGrowth(tile.watered || isRainy, ...)`.
5. Because `tile.watered` was set to `false` in step 3, `crop.advanceGrowth` receives `watered = false`. If weather is sunny and no water retention fertilizer is present, `isHydrated` evaluates to `false`, causing `advanceGrowth` to return early without advancing growth progress.
6. Therefore, manual watering has no effect on crop growth during actual gameplay day advancement. Tests in `M2_FarmingGrid.test.ts` bypassed this issue by calling `crop.advanceGrowth(true, ...)` directly on `Crop` rather than testing `farmingSystem.advanceDay()`.
7. Additionally, invoking `harvestCrop()` directly on a giant pumpkin bypasses the axe tool requirement and giant harvest logic, breaking the 3x3 crop layout.

## 3. Caveats
- No integrity violations (hardcoded test results, facade implementations, or self-certifying shortcuts) were found in the codebase.
- The unit test suite passes because tests directly invoked `crop.advanceGrowth(true, ...)` rather than invoking `farmingSystem.advanceDay()`.

## 4. Conclusion
The implementation of Milestone 2 (M2) components (`Grid.ts`, `Crop.ts`, `FarmingSystem.ts`) contains a critical logic bug in `FarmingSystem.advanceDay()` that prevents manual watering from advancing crop growth during daily morning ticks, as well as a major edge-case bug in giant pumpkin harvesting. Changes are required before approval.

## 5. Verification Method
1. Run `npx tsc --noEmit` to verify type checking.
2. Run `npx vitest run src/games/mythic-farm` to verify test suite execution.
3. Add a test in `M2_FarmingGrid.test.ts` that waters a tile, plants a crop, calls `farmingSystem.advanceDay()`, and verifies that the crop's `growthProgress` or `stage` advanced.
4. Verify that calling `harvestCrop()` on a giant pumpkin either triggers giant crop harvest or requires an axe.

---

## Review Summary

**Verdict**: REQUEST_CHANGES

## Findings

### [Critical] Finding 1: Daily Moisture Wiped Before Crop Growth Calculation in `FarmingSystem.advanceDay()`
- **What**: `advanceDay()` resets tile moisture (`grid.resetDailyMoisture()`) *before* executing crop growth (`crop.advanceGrowth(...)`).
- **Where**: `src/games/mythic-farm/systems/FarmingSystem.ts`, lines 219–236.
- **Why**: `resetDailyMoisture()` sets `tile.watered = false`. Consequently, `crop.advanceGrowth(tile.watered || isRainy, ...)` receives `watered = false`, causing all crops watered by the player during the day to receive 0 growth progress on sunny days.
- **Suggestion**: Swap the order of operations in `FarmingSystem.advanceDay()` so `crop.advanceGrowth(...)` runs *before* `grid.resetDailyMoisture()`.

### [Major] Finding 2: Direct `harvestCrop()` Interacting with Giant Pumpkins Breaks 3x3 Layout
- **What**: Calling `harvestCrop(x, y)` on a giant pumpkin executes a standard single crop harvest instead of a giant pumpkin harvest.
- **Where**: `src/games/mythic-farm/systems/FarmingSystem.ts`, lines 158–187 (`harvestCrop`).
- **Why**: `harvestCrop` does not check `crop.entity.isGiant`. When called on a giant pumpkin, it yields 1 pumpkin and removes only the center tile, leaving 8 surrounding mature crops orphaned in the grid.
- **Suggestion**: In `harvestCrop()`, check `if (crop.entity.isGiant)` and invoke `this.harvestGiantPumpkin(tileX, tileY)` (or require an axe for harvesting giant crops).

### [Minor] Finding 3: Crop Growth Days Specification Discrepancy
- **What**: `types.ts` defines `growthDays` as "Days to reach stage 3", but `Crop.advanceGrowth()` applies `1.0 / growthDays` per stage transition (0->1, 1->2, 2->3), resulting in 3x `growthDays` total time.
- **Where**: `src/games/mythic-farm/types.ts` line 38 vs `src/games/mythic-farm/entities/Crop.ts` line 93.
- **Why**: If `growthDays = 2` (Wheat), each stage transition takes 2 days, taking 6 days total to reach stage 3.
- **Suggestion**: Update `growthRate` formula to scale based on total stages to reach stage 3 in `growthDays` days, or clarify contract documentation.

## Verified Claims
- `npx tsc --noEmit` → verified via `run_command` → PASS
- `npx vitest run src/games/mythic-farm` (220 tests) → verified via `run_command` → PASS
- Grid tile coordinate math (`tileToScreen`, `screenToTile`) → verified via code inspection → PASS
- Tool radius scaling (Basic 1x1, Copper 1x3, Gold 3x3, Titanium 5x5) → verified via code inspection → PASS
- Item pickup physics (pop, gravity, 2-bounce restitution, magnet attraction) → verified via code inspection → PASS

## Coverage Gaps
- None.

## Unverified Items
- None.

---

## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### [Critical] Challenge 1: Manual Watering Failure in Gameplay Day Advancement
- **Assumption challenged**: Crops watered by player grow on next day tick.
- **Attack scenario**: Player tills 10 tiles, waters them all, plants wheat, advances day via `farmingSystem.advanceDay()`.
- **Blast radius**: `resetDailyMoisture()` clears `tile.watered = false` before growth calculation, resulting in 0 crop growth. Crop simulation completely halts on sunny days.
- **Mitigation**: Move `grid.resetDailyMoisture()` to run *after* the growth calculation loop in `FarmingSystem.advanceDay()`.

### [Major] Challenge 2: Harvest Action Inconsistency on Giant Crops
- **Assumption challenged**: Giant crops can only be harvested properly via axe or single harvest entry point.
- **Attack scenario**: Player right-clicks or calls `harvestCrop()` on a 3x3 giant pumpkin.
- **Blast radius**: Yields 1 pumpkin instead of 15-21, leaves 8 orphaned crops on the grid.
- **Mitigation**: Route `harvestCrop()` for giant crops to `harvestGiantPumpkin()`.
