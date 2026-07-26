# Handoff Report — Mythic Farm Specification Mining (Survey 3)

## 1. Observation

- **Source File**: `/home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/ORIGINAL_REQUEST.md`
- **Target Working Directory**: `/home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/spec_miner_survey_3`
- **Framework Integration**: PartyPlay modular monolith framework, target location `src/games/mythic-farm`.
- **Target Requirements (R1–R5)**:
  - **R1 (Farming & Soil Grid Engine)**: Dynamic tilling, crops (wheat, pumpkin, crystal berry, ancient elder-oak, dragonfruit), growth stages (seedling -> sprout -> flowering -> harvestable -> withered), soil moisture/fertilization states, seasonal weather (Spring, Summer, Autumn, Winter, Rainy, Thunderstorm, Astral Rain, Blizzard).
  - **R2 (Automation & Processing Workshop)**: Magical sprinklers (cardinal, radial, cross), automated scarecrows, harvester drones, artisan machines (Preserves Jar, Brewing Barrel, Seed Maker, Loom/Mill).
  - **R3 (Mythical Livestock & Barns)**: Golden Goats, Astral Bees, Silk Moths, Feathered Chocobos; feeding/grooming affection mechanics; products (Golden Milk, Astral Honey, Silk Thread, Golden/Prism Eggs).
  - **R4 (Dynamic Market Economy & Expansion)**: Price fluctuations, daily market trends, shipping bin payouts, order delivery board, farm leveling, land plot unlocks, tool progression (Basic -> Titanium), HUD widgets.
  - **R5 (Single-Player Campaign & Arcade Engine)**: PartyPlay `GameModule` compliance, WASD/hotbar controls, avatar customization, zero-file Web Audio API procedural synthesis, 60 FPS integer-scaled canvas rendering.

---

## 2. Logic Chain

1. **Requirement Extraction**: Every feature requirement explicitly stated in `ORIGINAL_REQUEST.md` was enumerated and mapped to discrete subsystem mechanics.
2. **Subsystem Architecture**: The system was decomposed into 5 distinct module specifications (R1: Grid & Crops, R2: Automation & Workshop, R3: Livestock, R4: Market & Progression, R5: Runtime & Audio).
3. **Data Modeling**: Pure TypeScript contracts were derived for tile states, crops, machinery, livestock, market dynamics, and player farm state (`FarmState`, `CropEntity`, `ProcessingStation`, `AnimalEntity`, `TileData`).
4. **Feature Enumeration**: 26 granular features (F1 through F26) were cataloged into the mandatory *Features Discovered* table format with inputs, outputs, error behaviors, and discovery methods.
5. **Edge Case Mapping**: 14 critical edge cases (E1 through E14) covering boundary conditions, energy depletion, out-of-season crop transitions, lightning strikes, machine input invalidation, and market saturation were specified with observed behaviors.

---

## 3. Caveats

- **Read-Only Role**: As a Specification Miner, no game source code was written or modified in `src/games/mythic-farm/`. Implementation is delegated to implementer agents.
- **PixiJS Rendering Constraint**: Game code must adhere to PartyPlay layer rules — interacting with rendering strictly via `RendererContext` and avoiding direct PixiJS imports in game modules.

---

## 4. Conclusion

The specification mining for Mythic Farm is complete. The detailed findings document (`analysis.md`) provides a complete blueprint for the design and implementation teams. All features (F1–F26), data models, edge cases (E1–E14), procedural audio presets, and build criteria are fully specified.

---

## 5. Verification Method

To verify this specification delivery:
1. Inspect findings file:
   `view_file /home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/spec_miner_survey_3/analysis.md`
2. Inspect handoff report:
   `view_file /home/viv/Projects/PartyPlay/src/games/mythic-farm/.agents/spec_miner_survey_3/handoff.md`
3. Verify repository build integrity:
   Run `npm run build` from `/home/viv/Projects/PartyPlay`.
