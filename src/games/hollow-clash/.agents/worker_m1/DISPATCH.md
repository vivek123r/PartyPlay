## 2026-07-25T08:25:30Z
You are Worker 1 (Milestone 1 Visuals & Gothic HUD Worker).
Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1

OBJECTIVE:
Implement Milestone 1 (Grotesque Dark Subterranean Visual Identity, Character Art, Dark Slime Particles & Top-Left Gothic HUD) for HOLLOW CLASH: SHADOW METROIDVANIA at /home/viv/Projects/PartyPlay/src/games/hollow-clash.

INPUT INFORMATION:
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/ORIGINAL_REQUEST.md (MANDATORY).
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/orchestrator/PROJECT.md for architecture and scope.
- Read /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/explorer_m0_1/handoff.md for exact line-by-line implementation blueprints.

IMPLEMENTATION REQUIREMENTS (Milestone 1 / R1 & R4 HUD):
1. **Player Vessel Visual Rendering** (`src/games/hollow-clash/entities/Knight.ts`):
   - Render dark tattered cloak with ragged bottom fringe (`poly`) in dark abyssal tone (`0x0f172a`).
   - Render asymmetrical cracked horned mask (left horn longer/jagged, right horn chipped/broken) with dark crack strokes (`0x0f172a`).
   - Render dual-layer glowing eyes (cyan `0x00f0ff` / crimson `0xff0055` outer glow aura + bright core).
2. **Grotesque Enemy & Boss Art + Dark Slime Particles** (`src/games/hollow-clash/entities/Enemy.ts`, `BossMossKnight.ts`, `Knight.ts`):
   - Redraw enemies: Mutant Spore Husk (pulsating spore sac + bio-sludge droplets + twitching mandibles), Jagged Thorn Crawler (serrated chitin scythes + crimson multi-eyespots), Chitin Shield Abomination (bone-ribbed shield + bio-slime trail).
   - Redraw BossMossKnight: Multi-layered chitin armor with fungal spores, bio-sludge tentacles, and enraged purple/green slime aura.
   - Update `spawnHitParticles()` in `Knight.ts` to spawn dark bio-sludge droplets (`0x15803d` green, `0x4c1d95` purple, `0x0f172a` tar) with downward gravity acceleration (`vy += 180 * dt`).
3. **Top-Left Gothic HUD & Soul Vessel Gauge** (`src/games/hollow-clash/systems/SideHUDManager.ts`):
   - Render top-left ornate Gothic HUD frame.
   - Render circular Soul Vessel orb gauge (0-100 vertical cyan `0x00f0ff` liquid fill with 33-Soul focus cost tick mark).
   - Render cracked horned mask HP containers (white bone active `0xf8fafc`, dark cracked skull depleted `0x1e293b`).
   - Render gold Geo coin emblem (`0xf1c40f`) + Geo count.

VERIFICATION REQUIREMENTS:
- Run unit tests with `npx vitest run src/games/hollow-clash` and ensure all tests pass with 0 errors.
- Document test commands and results in your handoff report at `/home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/worker_m1/handoff.md`.
