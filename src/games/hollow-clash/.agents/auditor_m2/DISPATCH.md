## 2026-07-25T03:03:08Z
Perform a forensic integrity audit on the Milestone 2 work product for HOLLOW CLASH: SHADOW METROIDVANIA at /home/viv/Projects/PartyPlay/src/games/hollow-clash.

INPUT INFORMATION:
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/ORIGINAL_REQUEST.md (MANDATORY).
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m2/handoff.md.
- Inspect `src/games/hollow-clash/entities/Knight.ts`, `systems/PlatformPhysics.ts`, `entities/Particle.ts`.

AUDIT CHECKS:
1. Verify genuine implementations — no hardcoded test returns, dummy spell objects, or fake charm logic.
2. Verify genuine implementation of 3 Soul Spells (Vengeful Spirit, Abyssal Shriek, Desolate Dive + shockwave), Focus Heal, Crystal Super Dash (charge & horizontal rocket velocity `vx = ±600`), Pogo reset (`resetAirAbilities`), and Charms (Quick Slash 0.18s, Longnail 1.5x hitbox, Spore Shroom cloud, Lifeblood Heart +2 blue masks).
3. Run `npx vitest run src/games/hollow-clash` to verify authentic test passing.

OUTPUT REQUIREMENTS:
- Write report to /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/auditor_m2/handoff.md
- Explicitly state verdict: CLEAN or INTEGRITY VIOLATION.
