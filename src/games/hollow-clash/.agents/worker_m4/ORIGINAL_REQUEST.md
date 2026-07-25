## 2026-07-25T01:25:04Z
<USER_REQUEST>
MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.

You are teamwork_preview_worker assigned to implement Milestone 4 (Requirement R4: UI & Visual FX Polish) for HOLLOW CLASH: SHADOW METROIDVANIA.
Working Directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m4
Target Codebase: /home/viv/Projects/PartyPlay/src/games/hollow-clash

Task Breakdown:
1. Cyan Soul Vessel Meter in Side HUD (R4a):
   - In systems/SideHUDManager.ts, implement rendering of the cyan Soul Vessel meter (#00e5ff / #00b0ff) displaying the active player's Soul reserve (0 to 100).
   - Ensure Side HUD displays player Mask HP, Geo count, and cyan Soul Vessel cleanly.
2. Top-Center Boss Health Bar (R4b):
   - Render the Boss Health Bar at top-center of the viewport in screen space (UI layer independent of camera panning).
   - Display Boss name ("MOSS KNIGHT"), HP bar reflecting current vs max 600 HP, and enraged state indicator when boss HP <= 50%.
3. Parallax Cavern Wrap Math (R4c):
   - In systems/ParallaxCavern.ts, correct modulo wrap calculations using positive modulo math: ((val % wrap) + wrap) % wrap.
   - Ensure parallax cavern background layers scroll smoothly across the full 960px level width without polygon stretching, gaps, seams, or flickering.
4. Verification & Unit Tests:
   - Add unit test cases in HollowClash.test.ts to verify Side HUD Soul Vessel rendering, top-center Boss Health Bar positioning/scaling, and positive modulo wrap math.
   - Run: cd /home/viv/Projects/PartyPlay/src/games/hollow-clash && npm run build && npm run test
   - Confirm exit code 0, 0 TS errors, and all tests passing.
5. Handoff:
   - Document all changes, files modified, test results, and logic in /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m4/handoff.md.
   - Send completion summary to parent via send_message.
</USER_REQUEST>
