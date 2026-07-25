# Execution Plan: HOLLOW CLASH: SHADOW METROIDVANIA Overhaul

## Milestone 0: Exploration & Baseline Audit
- Dispatch `teamwork_preview_explorer` to analyze entire codebase in `/home/viv/Projects/PartyPlay/src/games/hollow-clash`.
- Map out files, current control handling, physics loop, combat logic, UI rendering, and map structure.
- Verify baseline build status via worker or initial exploration check.

## Milestone 1: Controls & Lounge Bypass (R1)
- Dispatch `teamwork_preview_explorer` for R1 implementation plan.
- Dispatch `teamwork_preview_worker` to implement P1 (A/D/W/S/LCTRL/LSHIFT) & P2 (Arrows/Down/RCTRL/RSHIFT) control mapping, Enter/Space lounge bypass, and spawn y=200 safety.
- Dispatch `teamwork_preview_reviewer` to review code and build.
- Dispatch `teamwork_preview_challenger` to test key inputs & state transitions.
- Dispatch `teamwork_preview_auditor` for integrity check.

## Milestone 2: Physics Engine Unification & Hazard Mechanics (R2)
- Dispatch `teamwork_preview_explorer` for R2 physics refactor plan.
- Dispatch `teamwork_preview_worker` to unify AABB tile collisions, moss wall sliding, spike pit damage & safe respawn, and Shadow Dash horizontal wall collisions.
- Dispatch `teamwork_preview_reviewer` & `teamwork_preview_challenger` & `teamwork_preview_auditor`.

## Milestone 3: Combat System, Level Expansion (960px) & Moss Knight Boss (R3)
- Dispatch `teamwork_preview_explorer` for R3 combat/map/boss plan.
- Dispatch `teamwork_preview_worker` to implement directional slash hitboxes, enemy damage & Soul gain, pogo bounce (enemies & spikes), map extension to x=960, and 2-phase Moss Knight Boss encounter.
- Dispatch `teamwork_preview_reviewer` & `teamwork_preview_challenger` & `teamwork_preview_auditor`.

## Milestone 4: UI & Visual FX Polish (R4)
- Dispatch `teamwork_preview_explorer` for R4 UI/VFX plan.
- Dispatch `teamwork_preview_worker` to render cyan Soul Vessel meter in Side HUD, top-center Boss Health Bar, and smooth Parallax Cavern background wrapping up to x=960.
- Dispatch `teamwork_preview_reviewer` & `teamwork_preview_challenger` & `teamwork_preview_auditor`.

## Milestone 5: Final E2E Audit & Hardening
- Verification of all acceptance criteria.
- Full build check (`npm run build`).
- Final forensic audit report and handover to Sentinel.
