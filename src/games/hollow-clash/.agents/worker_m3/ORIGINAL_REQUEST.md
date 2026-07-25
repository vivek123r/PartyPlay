## 2026-07-25T01:20:42Z
<USER_REQUEST>
MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

You are teamwork_preview_worker assigned to implement Milestone 3 (Requirement R3: Combat System, Level Expansion to 960px, and 2-Phase Moss Knight Boss) for HOLLOW CLASH: SHADOW METROIDVANIA.
Working Directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m3
Target Codebase: /home/viv/Projects/PartyPlay/src/games/hollow-clash

Task Breakdown:
1. Melee Combat & Directional Slashes (R3a):
   - Implement directional AABB hitboxes ('forward', 'up', 'down') based on player input & facing in entities/Knight.ts.
   - Ensure attack loop checks both regular enemies (this.enemies) and boss (this.boss), calling takeDamage(amount) on hit targets, triggering hit particles, and awarding +11 Soul (up to max 100).
2. Airborne Pogo Bounce (R3b):
   - Downward slash connecting with enemy or spike pit tile launches knight upward (vy = POGO_BOUNCE_VELOCITY, e.g. -350).
   - Restores airborne double jump (canDoubleJump = true).
3. Level Expansion to 960px (R3c):
   - Update map width in config.ts to 960 (CAVERN_CONFIG.width = 960).
   - Update right wall boundary in systems/CavernTilemap.ts to x=944 (tile at x=944, y=0, width=16, height=CAVERN_CONFIG.height).
   - Extend tilemap platforms, moss walls, spike pits, and enemy spawn points across the new x=480..960 area.
   - Update camera panning max bounds (max cameraX = 960 - 480 = 480) and enemy position clamps (x max = 940).
4. 2-Phase Moss Knight Boss Encounter (R3d):
   - Position Moss Knight Boss in the expanded section (x=750..850).
   - Implement authentic 2-Phase combat loop in entities/BossMossKnight.ts:
     - Phase 1 (100% down to 50% HP): Melee slash, leap strike, vine shockwave spell.
     - Phase 2 (<=50% HP): Enraged state, accelerated attack timers, double shockwave, enhanced visual particles.
   - Ensure boss attack hitboxes deal 1 Mask damage to players upon contact.
   - Correct takeDamage() on boss: deduct HP, trigger hit flash, transition to Phase 2 at 50% HP, and trigger boss defeat when HP reaches 0.
5. Verification & Tests:
   - Add comprehensive Vitest unit tests in HollowClash.test.ts testing directional slashes, enemy takeDamage, soul gain, pogo bounce, x=960 exploration, and 2-phase boss behavior.
   - Run: cd /home/viv/Projects/PartyPlay/src/games/hollow-clash && npm run build && npm run test
   - Confirm exit code 0, zero TS errors, and all tests passing.
6. Handoff:
   - Document all changes, files modified, test results, and logic in /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m3/handoff.md.
   - Send completion summary to parent via send_message.
</USER_REQUEST>
