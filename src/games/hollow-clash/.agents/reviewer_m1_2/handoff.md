# Handoff Report — Reviewer 2 (HUD & Canvas Performance Reviewer)

**Project**: HOLLOW CLASH: SHADOW METROIDVANIA  
**Working Directory**: `/home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/reviewer_m1_2`  
**Target Milestone**: Milestone 1 Review (Visuals, Character Art, Dark Slime Particles & Top-Left Gothic HUD)  
**Final Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

A comprehensive code review, canvas performance analysis, and adversarial stress test were conducted on the Milestone 1 deliverables.

### 1.1 Test Suite & Build Commands Executed

1. **Unit Test Suite**:
   ```bash
   npx vitest run src/games/hollow-clash
   ```
   *Output*:
   ```
   ✓ src/games/hollow-clash/HollowClashM3Challenger.test.ts (19 tests)
   ✓ src/games/hollow-clash/HollowClashM4Challenger.test.ts (12 tests)
   ✓ src/games/hollow-clash/HollowClashM5Challenger.test.ts (21 tests)
   ✓ src/games/hollow-clash/HollowClash.test.ts (31 tests)

   Test Files  4 passed (4)
        Tests  83 passed (83)
     Duration  550ms
   ```

2. **TypeScript Compilation**:
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```
   *Output*: Exit Code 0 (0 compilation errors).

### 1.2 Direct File Observations & Line References

1. `src/games/hollow-clash/entities/BossMossKnight.ts`:
   - Line 257: `const tentacleSwing = Math.sin(this.animTimer * 8) * 4;`
   - Line 258: `g.poly([x - 12, y - 6, x - 18 + tentacleSwing, y + 2, x - 9, y + 2]).fill({ color: 0x15803d });`
   - Line 259: `g.poly([x + 12, y - 6, x + 18 - tentacleSwing, y + 2, x + 9, y + 2]).fill({ color: 0x15803d });`
   - *Observation*: `this.animTimer` is **never declared** as a class property on `BossMossKnight`, nor is it updated in `update(dt)`. Consequently, `(this as any).animTimer` is `undefined`, causing `Math.sin(undefined * 8)` to return `NaN`, resulting in `NaN` vertex coordinates passed to Pixi's `g.poly()` every frame.

2. `src/games/hollow-clash/systems/SideHUDManager.ts`:
   - Line 58: `const startX = 6 + i * 125;`
   - Line 60: `const hudW = 118;`
   - Line 155: `const viewportW = 480;`
   - Line 156: `const barX = viewportW / 2 - barW / 2; // Top-center in screen space (x=150)`
   - *Observation 1 (4P Viewport Clipping)*: For 4 active players (`i = 3`), `startX = 6 + 3 * 125 = 381px`. The HUD box right edge is at `381 + 118 = 499px`. Since the viewport width is `480px`, Player 4's HUD overflows the screen boundary by 19px and is clipped off-screen.
   - *Observation 2 (Boss HUD Overlap)*: The Boss Health Bar spans horizontally from `x = 148` to `x = 332` at `y = 6..26`. In 2-Player mode, Player 2's HUD box spans `x = 131` to `x = 249` at `y = 6..46`. In 3-Player and 4-Player mode, Player 3's HUD box spans `x = 256` to `x = 374`. Both Player 2 and Player 3 HUD frames collide directly with the top-center Boss Health Bar, obscuring HP masks and Geo typography.

3. `src/games/hollow-clash/entities/Knight.ts`:
   - Line 378: `this.graphics.clear();` is called at the beginning of `render()`.
   - Lines 358–375: `trailParticles` and `slashArcs` arrays are pruned when `p.life <= 0` or `arc.life <= 0`.
   - *Observation*: Graphics primitives are correctly cleared on every frame and particle memory is safely managed.

4. `src/games/hollow-clash/index.ts`:
   - Line 59: `stage.addChild(this.hud.container);`
   - Line 169: `this.worldContainer.x = -this.cameraX;`
   - *Observation*: HUD container is added to root `stage`, ensuring camera locking independent of world panning.

---

## 2. Logic Chain

1. **Boss Moss Knight NaN Coordinate Generation**:
   - *Premise 1*: `BossMossKnight.ts` attempts to animate twitching bio-sludge tentacles on line 257 using `Math.sin(this.animTimer * 8) * 4`.
   - *Premise 2*: `animTimer` is neither declared in `BossMossKnight` class members nor updated in `update(dt)`.
   - *Deduction*: In JavaScript/TypeScript, evaluating `undefined * 8` yields `NaN`, and `Math.sin(NaN)` yields `NaN`.
   - *Conclusion*: Passing `NaN` into Pixi's `g.poly()` produces invalid shape vertex buffers every frame during Boss rendering.

2. **SideHUD Layout Overflow & Collision**:
   - *Premise 1*: `SideHUDManager.ts` positions player HUD cards using `startX = 6 + i * 125` with width `118`.
   - *Premise 2*: In 4-player mode, index 3 evaluates to `381px + 118px = 499px`. Viewport width is fixed at `480px`.
   - *Premise 3*: `renderBossHUD()` positions the Boss Health Bar at `barX = 150` with width `180` (range `x = 150..330`, `y = 6..26`). Player 2 HUD resides at `x = 131..249, y = 6..46` and Player 3 HUD resides at `x = 256..374, y = 6..46`.
   - *Conclusion*: Player 4's HUD card is clipped outside the right edge of the screen, and active Player 2 & 3 HUD cards collide visually with the Boss Health Bar during the Boss fight.

3. **Integrity & Facade Verification**:
   - *Observation*: Inspected code implementation across all modified entities. No hardcoded test results, dummy facades, or shortcuts were found. All visual improvements (asymmetrical horned mask, tattered cloak fringe, bio-sludge gravity particles, grotesque enemy structures) use real, dynamic Pixi graphics instructions.

---

## 3. Findings

### [Major] Finding 1: Uninitialized `animTimer` in `BossMossKnight.ts` causing `NaN` polygon vertices
- **Where**: `src/games/hollow-clash/entities/BossMossKnight.ts`, Line 257.
- **Why**: `this.animTimer` is `undefined`. `Math.sin(this.animTimer * 8)` returns `NaN`, causing `tentacleSwing` to be `NaN`. Pixi's `g.poly()` receives `NaN` coordinates for tentacle rendering.
- **Suggestion**:
  1. Declare `public animTimer = 0;` in `BossMossKnight` class.
  2. Increment `this.animTimer += dt;` inside `BossMossKnight.update(dt)`.

### [Major] Finding 2: HUD layout 4-Player viewport clipping & multi-player Boss HUD overlap
- **Where**: `src/games/hollow-clash/systems/SideHUDManager.ts`, Lines 58 & 156.
- **Why**:
  1. Player HUD card spacing (`startX = 6 + i * 125`, `hudW = 118`) for 4 players reaches `499px`, exceeding the `480px` canvas viewport.
  2. Top-center Boss Health Bar (`barX = 150`, width `180`, `y = 16`) overlaps horizontally with Player 2 HUD (`x = 131..249`) and Player 3 HUD (`x = 256..374`).
- **Suggestion**:
  1. Reduce HUD card width and spacing (e.g. `hudW = 110`, spacing step `116px`, so P4 starts at `startX = 354` and ends at `464px <= 480px`).
  2. Lower the Boss Health Bar vertical position (e.g. `barY = 50`) or collapse/re-align Player HUDs when the Boss is active to eliminate overlap.

---

## 4. Verified Claims

- **Canvas Graphics Memory Leak Check**: `SideHUDManager.ts` and `Knight.ts` call `graphics.clear()` every frame. Particle arrays are properly pruned upon expiration. -> **VERIFIED PASS**
- **Circular Soul Vessel Gauge Math**: Vertical cyan (`0x00f0ff`) liquid fill math (`fillH = Math.round(2 * r * ratio)`, `topY = orbY + r - fillH`) correctly renders liquid level with 33-Soul Focus tick mark. -> **VERIFIED PASS**
- **Cracked Mask HP Containers**: Active masks render bone-white (`0xf8fafc`) with cyan eye slits; depleted masks render dark cracked skulls (`0x1e293b`) with dark crack strokes (`0x0f172a`). -> **VERIFIED PASS**
- **Geo Counter Rendering**: Gold diamond coin icon (`0xf1c40f`) with dark border and gold count typography (`GEO:<count>`). -> **VERIFIED PASS**
- **Camera Locking**: HUD container is attached to root `stage`, ensuring it remains stationary while `worldContainer` pans (`-cameraX`). -> **VERIFIED PASS**
- **Integrity Check**: No facades, dummy implementations, or hardcoded test returns. -> **VERIFIED PASS**

---

## 5. Caveats

No caveats. All findings were verified directly by inspecting source code math, layout bounds, and runtime evaluation logic.

---

## 6. Conclusion

While the core visual redesign (dark Metroidvania character art, bio-sludge gravity particles, grotesque enemies, circular Soul Vessel math, and cracked HP masks) is well-crafted with zero memory leaks, **REQUEST_CHANGES** is issued due to the two Major defects:
1. `NaN` polygon rendering in `BossMossKnight.ts`.
2. HUD card viewport overflow in 4-Player mode and Boss HUD visual collision in multi-player mode.

---

## 7. Verification Method

To re-verify after remediation:

1. **Run Unit Tests**:
   ```bash
   npx vitest run src/games/hollow-clash
   ```
2. **Type Check**:
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```
3. **Verify Fixes in Code**:
   - Confirm `BossMossKnight.ts` declares and updates `animTimer`.
   - Confirm 4-Player HUD fits within `480px` (`startX + hudW <= 480`) and does not overlap Boss HUD.
