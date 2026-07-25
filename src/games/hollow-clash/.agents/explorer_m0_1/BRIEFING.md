# BRIEFING — 2026-07-25T08:25:00Z

## Mission
Investigate "HOLLOW CLASH: SHADOW METROIDVANIA" codebase and map visual identity, canvas rendering, character/enemy art structures, dark slime particle effects, and gothic UI/HUD components for R1 & R4.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Explorer 1 (Visual & UI Explorer)
- Working directory: /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/explorer_m0_1
- Original parent: 2ddcd3d4-a150-49c2-9f40-9fe9bfb9a4ee
- Milestone: M0 / R1 & R4 Visual & UI Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code files
- Focus on R1 (Player vessel visual rendering, enemy/boss visual rendering, slime particles) & R4 (Gothic HUD, Soul Vessel gauge, Mask HP containers, Geo counter)
- Produce handoff.md with evidence chains, line numbers, current vs required behavior, and implementation blueprint

## Current Parent
- Conversation ID: 2ddcd3d4-a150-49c2-9f40-9fe9bfb9a4ee
- Updated: 2026-07-25T08:25:00Z

## Investigation State
- **Explored paths**:
  - `entities/Knight.ts` (lines 1-438): Player vessel rendering, particles, combat.
  - `entities/Enemy.ts` (lines 1-131): Enemy AI, rendering for spore_bug, mantis_crawler, shielded_husk.
  - `entities/BossMossKnight.ts` (lines 1-278): Moss Knight boss states, phase 2 enraged visuals, aura particles.
  - `systems/SideHUDManager.ts` (lines 1-143): Player HUD, Mask HP, Geo counter, Soul Vessel meter, top-center Boss HUD.
  - `systems/ParallaxCavern.ts` (lines 1-127): Subterranean background rendering & spore particles.
  - `systems/CavernTilemap.ts` (lines 1-71): Tilemap physics & platform rendering.
  - `screens/HeroLoungeScreen.ts` (lines 1-112): Lounge card rendering and start trigger.
  - `index.ts` (lines 1-309): Main engine loop and stage rendering assembly.
  - `HollowClash.test.ts`, `HollowClashM3Challenger.test.ts`, `HollowClashM4Challenger.test.ts`, `HollowClashM5Challenger.test.ts`: Vitest test suites.

- **Key findings**:
  - Player vessel currently drawn with simple symmetric white horns and plain black eyes (`Knight.ts`:397-413). Needs cracked asymmetrical horns, dark tattered cloak fringes, and dual-layer crimson/cyan glowing eyes.
  - Enemy art is basic geometric shapes (`Enemy.ts`:105-122). Needs grotesque dark subterranean redesign (mutant spore husks, jagged scythe crawlers, chitin shield abominations) with dark bio-sludge droplet particle emitter (`Knight.ts`:313-327).
  - HUD renders linear soul bar (`SideHUDManager.ts`:78-99) and rounded rect HP masks (lines 66-73). Needs sleek top-left Gothic HUD frame with circular/gothic Soul Vessel gauge, cracked mask HP container icons, and ornate gold Geo counter.
  - All 82 Vitest unit tests in `src/games/hollow-clash` currently pass (`npx vitest run src/games/hollow-clash`).

- **Unexplored areas**: None. Entire visual/rendering subsystem investigated.

## Key Decisions Made
- Structured findings into handoff report following 5-component protocol with comprehensive evidence chains and line-by-line implementation blueprints.

## Artifact Index
- /home/viv/Projects/PartyPlay/src/games/hollow-clash/.agents/explorer_m0_1/handoff.md — Handoff report (completed)
