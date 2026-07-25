## 2026-07-25T01:14:24Z
You are Worker 4 for HOLLOW CLASH: SHADOW METROIDVANIA (Milestone 2 - Physics Unification & Hazard Mechanics R2).

Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m2

Context & Baseline Findings:
Read Explorer 2's detailed report at /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/explorer_m0_2/handoff.md.

Your Task:
1. Create directory /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m2 and initialize progress.md.
2. Implement Requirement R2:
   a. Physics Engine Unification:
      - Unify movement, jumping, and top-left AABB tile collisions in systems/PlatformPhysics.ts and entities/Knight.ts.
      - Ensure coordinate system consistently uses Top-Left origin throughout without duplicate physics update loops.
   b. Moss Wall Sliding Mechanics:
      - Wall sliding triggers ONLY on tiles marked as moss (tile.type === 'moss' or moss wall flags).
      - Fix collision boundary equality so wall sliding stays active continuously while pressing against a moss wall without dropping after 1 frame.
      - Wall jump while sliding launches the knight away from the wall without consuming the airborne double jump.
   c. Spike Pit Hazard Damage & Safe Respawn:
      - Enable hazard collision detection for spike pit tiles in CavernTilemap.ts / PlatformPhysics.ts.
      - Track each knight's `lastSafeGroundPosition` (last valid grounded position on solid ground).
      - When touching a spike pit: call `knight.takeDamage(1)` (1 Mask HP damage) and respawn the knight safely at `lastSafeGroundPosition` with brief invulnerability / visual flash.
   d. Shadow Dash Wall Collisions:
      - Ensure Shadow Dash (`dash()`) retains invulnerability while obeying horizontal wall collision bounds (stops horizontal movement at solid tile walls instead of noclipping/phasing through walls).
3. Tests & Verification:
   - Add unit tests in HollowClash.test.ts verifying R2 mechanics: moss wall sliding, spike pit damage & safe respawn, and Shadow Dash wall collision stopping.
   - Run `npm run build` and `npm run test` in /home/viv/Projects/PartyPlay/src/games/hollow-clash to ensure build passes with ZERO errors and test suite passes.
4. Deliverables:
   - Save changes to codebase files.
   - Write /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m2/changes.md detailing your modifications.
   - Write /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m2/handoff.md detailing implementation details, build/test results, and layout compliance.
   - Send a message to parent (ID: 733e7419-7e6d-48c6-8ff9-7a1dd367a322) notifying completion.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
