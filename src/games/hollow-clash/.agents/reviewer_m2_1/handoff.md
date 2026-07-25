# Review & Handoff Report — Milestone 2 Mechanics & Architecture

**Reviewer**: Reviewer 1 (M2 Mechanics & Architecture Reviewer)  
**Working Directory**: `/home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/reviewer_m2_1`  
**Target Codebase**: `/home/viv/Projects/PartyPlay/src/games/hollow-clash`  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct inspection of the codebase at `/home/viv/Projects/PartyPlay/src/games/hollow-clash` and automated command execution produced the following findings:

1. **Unit Test Suite Verification (`npx vitest run src/games/hollow-clash`)**:
   - **Result**: PASSED (100% pass rate)
   - **Files**: 7 passed (7 total)
   - **Tests**: 126 passed (126 total)
     - `src/games/hollow-clash/HollowClashM2Challenger.test.ts` (16 tests) — PASS
     - `src/games/hollow-clash/HollowClash.test.ts` (31 tests) — PASS
     - `src/games/hollow-clash/HollowClashM1Challenger.test.ts` (14 tests) — PASS
     - `src/games/hollow-clash/HollowClashM1Challenger2.test.ts` (13 tests) — PASS
     - `src/games/hollow-clash/HollowClashM3Challenger.test.ts` (19 tests) — PASS
     - `src/games/hollow-clash/HollowClashM4Challenger.test.ts` (12 tests) — PASS
     - `src/games/hollow-clash/HollowClashM5Challenger.test.ts` (21 tests) — PASS

2. **Project Build Verification (`npm run build`)**:
   - **Result**: FAILED (Exit Code 2)
   - **Output**:
     ```
     src/games/hollow-clash/HollowClashM2Challenger2.test.ts:114:62 - error TS2322: Type '"solid"' is not assignable to type '"spikes" | "stone" | "moss" | undefined'.

     114         { x: 0, y: 0, width: 16, height: 300, isSolid: true, type: 'solid' }
                                                                      ~~~~

       src/games/hollow-clash/types.ts:43:3
         43   type?: 'stone' | 'moss' | 'spikes';
     ```
   - **Cause**: TypeScript type error in `HollowClashM2Challenger2.test.ts` line 114 where `type: 'solid'` is passed to `PlatformTile` instead of `'stone'`. `tsc -b` fails during `npm run build`.

3. **Codebase Feature Verification**:
   - **Soul Spells System** (`entities/Knight.ts`, `entities/SoulSpell.ts`):
     - `Vengeful Spirit`: Consumes 33 Soul, spawns horizontal soul wave (`vx = ±420`, 40 damage).
     - `Abyssal Shriek`: Consumes 33 Soul, spawns upward void column (`44x80px`, 60 damage).
     - `Desolate Dive`: Consumes 33 Soul in air, rapid downward slam (`vy = 600`), grants invulnerability, spawns ground `dive_shockwave` (`100x24px`, 50 damage) in `PlatformPhysics.ts`.
     - `Focus Heal`: 0.8s grounded channel spending 33 Soul for +1 HP without offensive projectiles.
   - **Advanced Movement & Mobility Resets** (`entities/Knight.ts`, `systems/PlatformPhysics.ts`):
     - `Airborne Pogo Bounce`: Downward slash on enemy or spike pit sets `vy = -350` and executes `resetAirAbilities()`, restoring double jump, shadow dash, crystal dash, and resetting dash cooldown.
     - `Crystal Super Dash`: 0.8s stationary charge with crystal glow particles -> rocket flight (`vx = ±600, vy = 0`), cancelled by jump, dash, damage, or solid wall collision.
     - `Moss Wall Cling & Slide`: Wall sliding and clinging triggers on `type === 'moss'` tiles; wall jump launches knight away (`vx = ±180, vy = -420`) and resets air abilities.
   - **Equippable Charms System** (`entities/Knight.ts`, `entities/SporeCloud.ts`, `systems/SideHUDManager.ts`):
     - `Quick Slash`: Multiplies attack cooldown by 0.6x (0.3s -> 0.18s).
     - `Longnail`: Expands nail AABB hitboxes (forward 42x48px, up/down 48x42px) and visual sword arcs by 1.5x.
     - `Spore Shroom`: Spawns damaging `SporeCloud` (radius 40px, 4 dmg/tick) on focus heal and taking damage.
     - `Lifeblood Heart`: Grants +2 blue Lifeblood Masks that absorb damage before white Mask HP.
     - `SideHUDManager`: Renders blue Lifeblood Masks next to white masks and charm badges on the HUD.

4. **Integrity Audit**:
   - No hardcoded test outputs or dummy return shortcuts were found.
   - All physics calculations, state machines, particle systems, and damage routines are fully functional.

---

## 2. Logic Chain

1. **Build Failure Logic**:
   - `ORIGINAL_REQUEST.md` Acceptance Criteria explicitly requires: "`npm run build` compiles cleanly with zero errors."
   - Executing `npm run build` runs `tsc -b && vite build`.
   - `HollowClashM2Challenger2.test.ts` line 114 defines a `PlatformTile` with `type: 'solid'`.
   - In `types.ts`, `PlatformTile.type` is defined as `'stone' | 'moss' | 'spikes' | undefined`.
   - TypeScript compiler rejects `'solid'` with `error TS2322`.
   - Because build fails, the milestone cannot be approved until this compilation error is resolved.

2. **Gameplay Mechanics Architecture Logic**:
   - The implementation of Soul Spells, Crystal Dash, Airborne Pogo Bounce, Moss Wall Clinging, and Charms is architecturally sound, clean, and backwards compatible.
   - Centralizing air mobility restoration inside `resetAirAbilities()` guarantees consistent state resetting across pogo bounces, wall jumps, and landing.
   - SideHUDManager cleanly renders Lifeblood Masks and Charm badges without affecting existing HUD elements.

---

## 3. Review Findings & Challenges

### [Major] Finding 1: TypeScript Compilation Failure in Test File (`npm run build`)
- **What**: `npm run build` fails with TS2322 compilation error in `HollowClashM2Challenger2.test.ts`.
- **Where**: `src/games/hollow-clash/HollowClashM2Challenger2.test.ts`, Line 114.
- **Why**: Type `'solid'` is assigned to `PlatformTile.type`, which only accepts `'stone' | 'moss' | 'spikes' | undefined`.
- **Suggestion**: Change `type: 'solid'` to `type: 'stone'` in `HollowClashM2Challenger2.test.ts:114`.

### [Minor] Finding 2: Desolate Dive Invulnerability Shields Player from Spike Pit Damage
- **What**: While diving (`isDiving = true`), the knight is granted `isInvulnerable = true`. Diving into spikes triggers position reset to `lastSafeGroundPosition`, but `takeDamage(1)` is blocked by `isInvulnerable`.
- **Where**: `src/games/hollow-clash/systems/PlatformPhysics.ts` (lines 166-170).
- **Why**: `takeDamage` exits early if `isInvulnerable` is true.
- **Suggestion**: Consider if spike pits should bypass spell invulnerability or accept this as intended dive invulnerability behavior.

### [Minor] Finding 3: Grounded Down-Cast Fallthrough to Vengeful Spirit
- **What**: Pressing `down + cast` while grounded casts `vengeful_spirit` (neutral spell) instead of being ignored or starting focus heal.
- **Where**: `src/games/hollow-clash/entities/Knight.ts` (lines 368-394).
- **Why**: `castSpell('down')` checks `!this.state.isGrounded`. If grounded, it falls through to the `else` block (Vengeful Spirit).
- **Suggestion**: If intentional, document as fallback; otherwise, prevent grounded down-cast from spending soul on Vengeful Spirit.

---

## 4. Caveats

No caveats regarding mechanics or code quality. The core game logic for M2 is cleanly built and tested. The sole blocking issue is the TypeScript build error in `HollowClashM2Challenger2.test.ts`.

---

## 5. Conclusion

**Verdict**: **REQUEST_CHANGES**

All Milestone 2 gameplay mechanics (Soul Spells, Airborne Pogo Bounce, Crystal Super Dash, Moss Wall Cling, and Equippable Charms) are correctly implemented and pass all 126 unit tests. However, the work product cannot be approved because `npm run build` fails due to a TypeScript error in `HollowClashM2Challenger2.test.ts`.

Worker 2 must fix line 114 of `HollowClashM2Challenger2.test.ts` (change `type: 'solid'` to `type: 'stone'`) so `npm run build` passes with zero errors.

---

## 6. Verification Method

To independently verify after changes:

1. **Run Project Build**:
   ```bash
   cd /home/viv/Projects/PartyPlay
   npm run build
   ```
   Confirm zero TypeScript or Vite bundle errors (Exit Code 0).

2. **Run Unit Test Suite**:
   ```bash
   cd /home/viv/Projects/PartyPlay
   npx vitest run src/games/hollow-clash
   ```
   Confirm all 126 tests pass across all test files.
