# BRIEFING — 2026-07-25T02:58:14Z

## Mission
Fix `NaN` coordinate bug in `BossMossKnight.ts`, P4 HUD card clipping, and Boss HUD overlap in `SideHUDManager.ts`.

## 🔒 My Identity
- Archetype: worker_m1_fix
- Roles: implementer, qa, specialist
- Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix
- Original parent: 2ddcd3d4-a150-49c2-9f40-9fe9bfb9a4ee
- Milestone: Milestone 1 Bugfix

## 🔒 Key Constraints
- Minimal change principle.
- No hardcoding test results or facade implementations.
- Handoff report in `/home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix/handoff.md`.

## Current Parent
- Conversation ID: 2ddcd3d4-a150-49c2-9f40-9fe9bfb9a4ee
- Updated: 2026-07-25T02:58:22Z

## Task Summary
- **What to build**: Add `animTimer` property to `BossMossKnight`, increment in `update(dt)`, adjust `SideHUDManager.ts` spacing (`step = 116px`, `hudW = 110`) and Boss HUD `barY = 54`.
- **Success criteria**: 100% pass unit tests (`npx vitest run src/games/hollow-clash`).
- **Interface contracts**: `BossMossKnight.ts` and `SideHUDManager.ts`.

## Key Decisions Made
- Declared `public animTimer = 0;` on `BossMossKnight` and incremented in `update(dt)`.
- Adjusted player HUD card horizontal step to 116px and width to 110px so P4 ends at 464px (<= 480px viewport).
- Adjusted Boss HUD vertical position `barY = 54` to place the Boss health bar below the player HUD cards (bottom at y=46) without overlap.

## Artifact Index
- /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix/DISPATCH.md — Dispatch instructions
- /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1_fix/handoff.md — Handoff report

## Change Tracker
- **Files modified**:
  - `src/games/hollow-clash/entities/BossMossKnight.ts`: Declared `animTimer`, incremented in `update()`.
  - `src/games/hollow-clash/systems/SideHUDManager.ts`: Updated card width, step, and Boss HUD `barY`.
  - `src/games/hollow-clash/HollowClashM1Challenger2.test.ts`: Updated `animTimer` test and added HUD layout bounds test.
- **Build status**: PASS (110/110 vitest tests pass)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 110/110 vitest tests passed across 6 test files.
- **Lint status**: Clean (tsc 0 errors).
- **Tests added/modified**: Updated `HollowClashM1Challenger2.test.ts`.
