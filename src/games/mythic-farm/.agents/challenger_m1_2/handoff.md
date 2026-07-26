# Handoff Report — Empirical Challenge of `MythicFarmGame` Lifecycle & Tick Loop

**Verdict**: **REQUEST_CHANGES**

## Challenge Summary

**Overall risk assessment**: **HIGH**

Empirical stress testing of `MythicFarmGame` (`index.ts`) lifecycle methods (`init`, `start`, `update`, `pause`, `resume`, `destroy`) revealed **7 verified failure modes** (3 High, 3 Medium, 1 Low). The most critical defects are PixiJS scene graph memory leaks across rapid init/destroy cycles, state machine race conditions during async initialization teardown, orphaned SFX audio timers executing post-destruction, and unclamped/unvalidated delta time in `update(dt)`.

---

## 1. Observation

### 1.1 Test Execution Commands & Results
- **Command**: `npx vitest run src/games/mythic-farm/.agents/challenger_m1_2/test_harness.test.ts`
- **Result**: `16 tests run | 7 failed | 9 passed`

### 1.2 Direct Code Quotes & Line Numbers

#### Bug 1: Stage Scene Graph Memory Leak in `destroy()`
- **Location**: `index.ts:37` & `index.ts:113-115`
- **Code**:
```typescript
37: stage.addChild(this.rootContainer);
...
113: if (this.rootContainer) {
114:   this.rootContainer.destroy({ children: true });
115: }
```
- **Observed Behavior**: PixiJS v8 `Container.destroy({ children: true })` destroys child nodes but DOES NOT remove `rootContainer` from `stage.children`.
- **Empirical Failure Output**:
```
AssertionError: expected 10 to be +0
- Expected: 0
+ Received: 10
```
After 10 init/destroy cycles, `stage.children.length` remains at 10. After 50 cycles, 50 destroyed container instances remain attached to `stage.children`.

#### Bug 2: Unhandled Double `init()` Scene Graph Corruption
- **Location**: `index.ts:31-37`
- **Code**:
```typescript
31: this.rootContainer = new Container();
...
37: stage.addChild(this.rootContainer);
```
- **Observed Behavior**: Re-calling `init(context)` without calling `destroy()` overwrites `this.rootContainer` reference and attaches a second container to `stage`. The first container is orphaned on `stage`.
- **Empirical Failure Output**:
```
AssertionError: expected 2 to be 1
- Expected: 1
+ Received: 2
```

#### Bug 3: Orphaned SFX Audio Timers Post-Destruction
- **Location**: `utils/AudioSynthesizer.ts:42-47, 97-102` & `index.ts:105-107`
- **Code**:
```typescript
// AudioSynthesizer.ts
44: notes.forEach((freq, idx) => {
45:   setTimeout(() => this.audio.playTone(freq, 'sine', 0.08, 'sfx', 0.25), idx * 60);
46: });
```
- **Observed Behavior**: `destroy()` calls `this.audioSynthesizer.stopAmbientBGM()`, which clears `bgmTimer` but leaves scheduled SFX `setTimeout` handles untracked and active.
- **Empirical Failure Output**:
```
AssertionError: expected 10 to be +0
- Expected: 0
+ Received: 10
```
10 audio tones were played asynchronously by `setTimeout` after `game.destroy()` completed.

#### Bug 4: Async `init()` Async Teardown Race Condition
- **Location**: `index.ts:23-55`
- **Code**:
```typescript
23: public async init(context: GameContext): Promise<void> {
...
48:   await this.loadOrCreateFarmState();
...
53:   this.state = 'Ready';
54: }
```
- **Observed Behavior**: If `destroy()` is called while `init()` is awaiting `loadOrCreateFarmState()`, `destroy()` sets `this.state = 'Destroyed'`. But when `init()` resolves, line 53 executes and overwrites `this.state` back to `'Ready'`.
- **Empirical Failure Output**:
```
AssertionError: expected 'Ready' to be 'Destroyed'
- Expected: "Destroyed"
+ Received: "Ready"
```

#### Bug 5: Unclamped / Unvalidated Delta Time in `update(dt)`
- **Location**: `index.ts:69-73`
- **Code**:
```typescript
69: public update(dt: number): void {
70:   if (this.state !== 'Playing' || this.isPaused) return;
71:   this.gameTimeAccumulator += dt;
72: }
```
- **Observed Behavior**: `update(-1.0)` decrements `gameTimeAccumulator` to `-1`. `update(NaN)` sets accumulator to `NaN`. `update(Infinity)` sets accumulator to `Infinity`.
- **Empirical Failure Output**:
```
AssertionError: expected -1 to be greater than or equal to 0
```

#### Bug 6: Incomplete `TextureGenerator.clear()`
- **Location**: `utils/TextureGenerator.ts`
- **Observed Behavior**: Calling `clear()` on `TextureGenerator` during `destroy()` does not invalidate or purge generated textures.
- **Empirical Failure Output**:
```
AssertionError: expected Texture to be undefined
```

#### Bug 7: Storage Exception Blocks Lifecycle Cleanup in `destroy()`
- **Location**: `index.ts:103-115`
- **Code**:
```typescript
103: this.saveFarmState();
105: if (this.audioSynthesizer) ...
113: if (this.rootContainer) ...
```
- **Observed Behavior**: If `this.saveFarmState()` throws an exception (e.g. storage error), execution aborts before reaching container cleanup or setting state to `'Destroyed'`.

---

## 2. Logic Chain

1. **Premise**: `MythicFarmGame` is intended to run inside PartyPlay with clean creation, destruction, pause/resume, and deterministic tick loops.
2. **Step 1 (Scene Graph Leak)**: `stage.addChild(this.rootContainer)` increases `stage.children.length`. In PixiJS v8, `rootContainer.destroy({ children: true })` does not detach `rootContainer` from `stage`. Therefore, `stage.removeChild(this.rootContainer)` or `rootContainer.removeFromParent()` is required before or during destruction. Without it, every init/destroy cycle permanently leaks nodes in `stage.children`.
3. **Step 2 (Double Init)**: Calling `init()` on an already-initialized game instance without calling `destroy()` first replaces `this.rootContainer` without removing the existing container from `stage`, creating orphaned display branches.
4. **Step 3 (Audio Timers)**: Sound effects (`playHarvest`, `playWater`, `playPlant`, `playLevelUp`, `playCoins`, `playWorkshop`, `playAnimalChocobo`) use asynchronous `setTimeout` calls. `destroy()` only clears BGM timers. Pending SFX timeouts continue firing after destroy, sending `playTone` calls to the audio service. `AudioSynthesizer` needs a `destroy()` / `clear()` method that clears all pending timeout handles and ignores subsequent calls.
5. **Step 4 (Async Init Race)**: `init()` is asynchronous. If `destroy()` is called before `init()` completes, `this.state` must stay `'Destroyed'`, and `init()` must abort early instead of setting `this.state = 'Ready'`.
6. **Step 5 (Tick Accumulator)**: `update(dt)` accepts raw `dt`. If `dt` is negative, NaN, or non-finite, `gameTimeAccumulator` becomes corrupted. `dt` must be sanitized (`dt = Math.max(0, dt)` and guarded against `isNaN`/`isFinite`) and clamped (e.g., `Math.min(dt, 0.25)`).
7. **Step 6 (Storage Fault Tolerance)**: In `destroy()`, `saveFarmState()` must be wrapped in a `try...catch` block to ensure container teardown and state update always complete even if storage fails.

---

## 3. Challenges & Attack Scenarios

### [High] Challenge 1: Scene Graph Memory Leak on Rapid Game Transitions
- **Assumption Challenged**: Calling `rootContainer.destroy({ children: true })` cleans up container references from the parent stage.
- **Attack Scenario**: Rapidly starting and quitting games or reloading modules in PartyPlay engine.
- **Blast Radius**: Leaked PixiJS Containers accumulate in `stage.children`, causing memory bloat and frame rate degradation over time.
- **Mitigation**: Add `this.rootContainer.removeFromParent()` (or `stage.removeChild(this.rootContainer)`) before calling `destroy()`.

### [High] Challenge 2: Async Initialization Race Condition
- **Assumption Challenged**: `destroy()` will only be called after `init()` has fully resolved.
- **Attack Scenario**: User immediately leaves/destroys the game while asset loading / save loading is in progress.
- **Blast Radius**: `state` becomes `'Ready'` after game destruction, allowing invalid `start()` and `update()` calls on destroyed games.
- **Mitigation**: Check `if (this.state === 'Destroyed') return;` after `await loadOrCreateFarmState()` in `init()`.

### [Medium] Challenge 3: Asynchronous Audio Leaks
- **Assumption Challenged**: Stopping BGM clears all audio timers.
- **Attack Scenario**: Player harvests crops or levels up and immediately exits to menu.
- **Blast Radius**: Multi-note arpeggio SFXs continue playing audio chimes over menu UI post-game exit.
- **Mitigation**: Maintain a list of active SFX `setTimeout` IDs in `AudioSynthesizer` and clear them upon `stop()` / `destroy()`.

### [Medium] Challenge 4: Corrupted Delta Time in `update(dt)`
- **Assumption Challenged**: Engine always supplies valid, positive floating-point `dt` values.
- **Attack Scenario**: System clock shifts, tab backgrounding/un-backgrounding lag spikes, or engine passing invalid delta.
- **Blast Radius**: `gameTimeAccumulator` goes negative or becomes `NaN`, freezing game progression.
- **Mitigation**: Sanitize `dt`: `if (typeof dt !== 'number' || isNaN(dt) || !isFinite(dt) || dt < 0) dt = 0; const clampedDt = Math.min(dt, 0.25);`.

---

## 4. Caveats
- Tested against PixiJS v8 mock environment matching PartyPlay runtime.
- Milestone 2-5 gameplay systems (FarmingSystem, AutomationSystem, etc.) are planned for subsequent milestones and were not part of this M1 core lifecycle challenge.

---

## 5. Conclusion

**VERDICT**: **REQUEST_CHANGES**

`MythicFarmGame` lifecycle methods currently fail critical empirical stress tests. Before approving Milestone 1 lifecycle management:
1. `destroy()` must detach `rootContainer` from `stage` (`this.rootContainer.removeFromParent()`).
2. `init()` must handle re-entrancy and check if game was destroyed during async loading.
3. `AudioSynthesizer` must track and clear all pending SFX `setTimeout` handles on destroy.
4. `update(dt)` must sanitize and clamp `dt` values (`Math.max(0, Math.min(dt, 0.25))`).
5. `destroy()` must wrap `saveFarmState()` in `try...catch`.

---

## 6. Verification Method

To independently verify these findings:

```bash
npx vitest run src/games/mythic-farm/.agents/challenger_m1_2/test_harness.test.ts
```

### Invalidation Conditions:
- All 16 tests in `test_harness.test.ts` pass with `0` failures.
- `stage.children.length` is `0` after 50 `init()` / `destroy()` cycles.
- No `playTone` calls fire after `destroy()`.
- `gameTimeAccumulator` remains `>= 0` and finite under invalid `dt` inputs.
- `game.state` is `'Destroyed'` when `destroy()` is called during async `init()`.
