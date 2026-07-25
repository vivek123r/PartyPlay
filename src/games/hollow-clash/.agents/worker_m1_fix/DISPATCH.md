## 2026-07-25T02:58:12Z
<USER_REQUEST>
You are Worker 1 Fix (Milestone 1 Bugfix Worker).
Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix

OBJECTIVE:
Fix the `NaN` coordinate bug in `src/games/hollow-clash/entities/BossMossKnight.ts` reported by Reviewer 1.

INPUT INFORMATION:
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/ORIGINAL_REQUEST.md (MANDATORY).
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/reviewer_m1_1/handoff.md for the exact bug details.

BUG FIX INSTRUCTIONS:
1. In `src/games/hollow-clash/entities/BossMossKnight.ts`:
   - Declare `public animTimer: number = 0;` as a property on `BossMossKnight`.
   - In `update(dt: number)` method of `BossMossKnight`, add `this.animTimer += dt;`.
   - Ensure `Math.sin(this.animTimer * 8)` receives a valid number and produces valid numeric coordinates for `g.poly(...)` during tentacle/sludge rendering (line ~257).
2. Run unit tests with `npx vitest run src/games/hollow-clash` and ensure 100% pass with 0 errors.

OUTPUT REQUIREMENTS:
- Write your handoff report to /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix/handoff.md detailing the fix applied and test results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-07-25T02:58:22Z
**Context**: Additional Milestone 1 fix requirement from Reviewer 2
**Content**: Reviewer 2 identified a second HUD layout issue in `src/games/hollow-clash/systems/SideHUDManager.ts`:
1. Player 4's HUD card extends to 499px, clipping off-screen on the 480px canvas viewport. Adjust card width/spacing (e.g. `hudW = 110`, step `116px`) so P4 ends at <= 464px within the 480px boundary.
2. Top-center Boss Health Bar (`y = 16`) overlaps player HUD cards when multiple players are active. Adjust Boss HUD vertical positioning or player HUD card top margin so they do not overlap.
**Action**: Please implement both the `animTimer` fix in `BossMossKnight.ts` AND the HUD layout / Boss HUD positioning fix in `SideHUDManager.ts`. Verify all tests pass (`npx vitest run src/games/hollow-clash`) and record results in your handoff report.

