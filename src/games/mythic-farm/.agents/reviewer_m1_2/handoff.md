# Review & Handoff Report: Milestone 1 (M1) Core Engine Framework & Procedural Assets

## Review Summary

**Verdict**: **REQUEST_CHANGES**

**Milestone**: M1 (Core Engine Framework & Types)
**Target Module**: `src/games/mythic-farm`
**Date**: 2026-07-25

---

## 1. Observation

### 1.1 Build and Automated Test Results
- Executed `npm run build`:
  - **Result**: Command exited with code `0`. Compilation succeeded cleanly.
- Executed `npx vitest run src/games/mythic-farm`:
  - **Result**: Command exited with code `1`. Total: 7 test files, 196 passed, **5 failed**.
  - **Failed Tests**:
    1. `does not leak rootContainer in stage.children after rapid init/destroy cycles (50 cycles)` (AssertionError: expected 2 to be 1)
    2. `handles multiple rapid init/destroy cycles on the SAME instance` (AssertionError: expected 10 to be +0)
    3. `handles double init() call on same instance without destroy()` (AssertionError: expected 2 to be 1)
    4. `prevents orphaned SFX timers from playing after destroy()` (AssertionError: expected 10 to be +0)
    5. `handles abnormal dt values (negative, zero, very large, NaN, Infinity)` (AssertionError: expected -1 to be greater than or equal to 0)

### 1.2 Inspection of Implementation Code

- **`src/games/mythic-farm/manifest.ts`**:
  - `id`: `'mythic-farm'`
  - `minPlayers`: 1, `maxPlayers`: 1
  - `category`: `'Strategy'`
  - Compatible with `GameRegistry.ts` glob auto-discovery (`../games/*/manifest.ts` and `../games/*/index.ts`).

- **`src/games/mythic-farm/index.ts`**:
  - Line 37: `stage.addChild(this.rootContainer);`
  - Line 113-115 (`destroy()` method):
    ```typescript
    if (this.rootContainer) {
      this.rootContainer.destroy({ children: true });
    }
    ```
    *Observation*: `this.rootContainer.destroy({ children: true })` does NOT detach `this.rootContainer` from parent `stage`. `stage.children` retains references to destroyed root containers.
  - Line 23 (`init()` method): Does not check if `this.rootContainer` already exists or remove previous container from `stage` if `init()` is called multiple times without `destroy()`.
  - Line 72 (`update(dt)` method):
    ```typescript
    this.gameTimeAccumulator += dt;
    ```
    *Observation*: `dt` is accumulated without checking for negative values or non-finite numbers (`NaN`, `Infinity`).

- **`src/games/mythic-farm/utils/AudioSynthesizer.ts`**:
  - Lines 28, 36, 45, 68, 83, 91, 100: Sound effect triggers (e.g. `playWater`, `playPlant`, `playHarvest`, `playCoins`, `playLevelUp`) schedule delayed `this.audio.playTone()` calls using `setTimeout(...)` without tracking or clearing timer IDs.
  - *Observation*: Calling `destroy()` on `MythicFarmGame` or `AudioSynthesizer` does not cancel pending `setTimeout` timers, allowing callbacks to execute after game destruction.

- **`src/games/mythic-farm/utils/TextureGenerator.ts`**:
  - Pre-generates 25+ procedural textures using 2D Canvas context rendering (grass, tilled/watered soil, 6 crop species, 4 animal species, 4 tool tiers, icons/items).
  - Handles headless/SSR environments via `typeof document === 'undefined' ? Texture.EMPTY : ...`.

- **`src/games/mythic-farm/utils/StorageManager.ts`**:
  - Implements `validateAndMergeState(data)` validating `coins`, `energy`, `maxEnergy`, `farmLevel`, `farmExp`, `currentDay`, `toolTiers`, `grid`, `stations`, `animals`.
  - Safe error handling in `loadFarmState` and `saveFarmState`.

- **Layout & Structure**:
  - File `.agents/challenger_m1_2/test_harness.test.ts` was located inside the `.agents/` directory.

---

## 2. Logic Chain

1. **Stage Container Leak**:
   - Observation: `stage.addChild(this.rootContainer)` attaches `rootContainer` to PixiJS `stage`. `this.rootContainer.destroy({ children: true })` in `destroy()` destroys child nodes but does not remove `rootContainer` from `stage.children`.
   - Deduction: Upon destruction or re-initialization, the parent `stage` retains references to old/destroyed containers, causing a memory leak and failing Vitest lifecycle stress tests.
   - Remediation: Call `this.rootContainer.removeFromParent()` or `stage.removeChild(this.rootContainer)` inside `destroy()`, and check/cleanup existing containers in `init()`.

2. **Audio Timer Leak**:
   - Observation: `AudioSynthesizer` schedules SFX note sequences using untracked `setTimeout` calls.
   - Deduction: When a game instance is destroyed shortly after playing a multi-note SFX (e.g. harvest or level-up), scheduled timeouts fire post-destruction, causing unexpected audio playback and memory leaks.
   - Remediation: Track all pending `setTimeout` timer handles in an array inside `AudioSynthesizer`, and provide a `destroy()` / `clear()` method that clears all active timers.

3. **Delta-Time Guarding**:
   - Observation: `update(dt)` performs `this.gameTimeAccumulator += dt` without validating `dt`.
   - Deduction: If `dt` is negative, `NaN`, or non-finite, `gameTimeAccumulator` becomes invalid or negative.
   - Remediation: Add input guard `if (typeof dt !== 'number' || isNaN(dt) || dt <= 0 || !isFinite(dt)) return;`.

4. **Layout Compliance**:
   - Observation: `.agents/challenger_m1_2/test_harness.test.ts` is stored inside `.agents/`.
   - Deduction: `.agents/` directory must contain only agent metadata (plans, briefings, progress, handoffs). Test files must be co-located under `tests/` or alongside source code.

---

## 3. Caveats

- **No Caveats**: All M1 source files, data models, registration interfaces, storage manager routines, texture generators, audio synthesizers, and test suites were fully inspected and executed.

---

## 4. Conclusion & Required Actions

**Verdict**: **REQUEST_CHANGES**

### Required Action Items:
1. **Fix Stage Container Cleanup in `src/games/mythic-farm/index.ts`**:
   - In `destroy()`: Ensure `this.rootContainer` is detached from parent stage (`if (this.rootContainer.parent) this.rootContainer.parent.removeChild(this.rootContainer); this.rootContainer.destroy({ children: true });`).
   - In `init()`: Guard against double initialization by cleaning up previous containers if `this.rootContainer` already exists.
2. **Fix Audio Timer Cleanup in `src/games/mythic-farm/utils/AudioSynthesizer.ts`**:
   - Store all `setTimeout` IDs in an internal `sfxTimers: ReturnType<typeof setTimeout>[]` array.
   - Provide a `destroy()` or `stopAll()` method on `AudioSynthesizer` that clears all pending timers and stops BGM.
   - Call `this.audioSynthesizer.destroy()` inside `MythicFarmGame.destroy()`.
3. **Fix Delta-Time Validation in `src/games/mythic-farm/index.ts`**:
   - In `update(dt)`: Guard against invalid or negative `dt` values (`if (typeof dt !== 'number' || isNaN(dt) || dt <= 0 || !isFinite(dt)) return;`).
4. **Fix Layout Compliance**:
   - Move or re-locate `.agents/challenger_m1_2/test_harness.test.ts` to `tests/` (e.g. `tests/MythicFarmLifecycleStress.test.ts`) so that `.agents/` contains only agent metadata.

---

## 5. Verification Method

To verify the requested fixes independently:

1. **Run Build**:
   ```bash
   npm run build
   ```
   *Expected*: Zero compilation errors.

2. **Run Vitest Test Suite**:
   ```bash
   npx vitest run src/games/mythic-farm
   ```
   *Expected*: All test files pass with 0 failures (100% pass rate).

3. **Verify Layout Compliance**:
   ```bash
   find src/games/mythic-farm/.agents -name "*.ts"
   ```
   *Expected*: No `.ts` source or test files exist in `.agents/`.
