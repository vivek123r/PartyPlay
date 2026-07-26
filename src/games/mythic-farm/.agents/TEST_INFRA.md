# Mythic Farm — E2E Test Suite Infrastructure & Specifications (TEST_INFRA.md)

## 1. Executive Summary & Overview
This document specifies the complete End-to-End (E2E), Integration, and Unit testing infrastructure for **Mythic Farm: Single-Player FarmVille & Magic Orchard**.
The test suite validates all 26 core features across 4 distinct testing tiers using **Vitest**, adhering to opaque-box specification contracts and progressive testability guidelines.

---

## 2. Test Architecture & Tier Mapping

The test suite is structured under `src/games/mythic-farm/tests/` into 4 dedicated test suites:

| Tier | Test File | Target Scope | Minimum Test Count |
|------|-----------|--------------|-------------------|
| **Tier 1** | `Tier1_FeatureCoverage.test.ts` | Features F1 – F26 full coverage (>= 5 test cases per feature) | 130+ Test Cases |
| **Tier 2** | `Tier2_BoundaryAndCorner.test.ts` | Boundary conditions, energy/coin clamps, invalid inputs, edge cases | 40+ Test Cases |
| **Tier 3** | `Tier3_CrossFeatureInteractions.test.ts` | Multi-system automation pipelines, livestock-to-market chains, weather interaction | 25+ Test Cases |
| **Tier 4** | `Tier4_RealWorldScenarios.test.ts` | E2E seasonal playthroughs, multi-year farm expansion, full economic triumph | 15+ Test Cases |

---

## 3. Detailed Feature Mapping (Tier 1: F1 – F26)

Every feature in `PROJECT.md` is tested with at least 5 distinct assertions covering happy paths, data structures, and standard state mutations:

1. **F1: Game Module Registration**: Manifest metadata, game ID `mythic-farm`, window title, standard canvas resolution 480x270, entry point export.
2. **F2: Save/Load State Persistence**: Serializing `FarmState`, storage key namespace, save/load roundtrips, corruption fallback, default state generation.
3. **F3: Grid Tile Soil Tilling & Moisture**: Tilling untilled soil, watering tilled soil, fertilizing soil, reset/clearing states, grid bounds indexing.
4. **F4: Crop Planting & Seed Management**: Planting Wheat, Pumpkin, Crystal Berry, Dragonfruit, Elder-Oak, Sunflower; seed inventory consumption; non-tilled soil protection.
5. **F5: Multi-Stage Crop & Tree Growth**: 4 visual stages (Seedling → Sprout → Flowering → Harvestable), growth timer progression, out-of-season withered state, water requirement for growth.
6. **F6: Watering Can & Soil Hydration**: Manual tile watering, daily moisture decay engine, empty watering can handling, tool upgrade area of effect.
7. **F7: Fertilizer Soil Enrichment**: `speed`, `quality`, `bountiful` fertilizers; single-fertilizer per tile constraint; growth speed multipliers; extra harvest yield boosts.
8. **F8: Crop & Tree Harvesting**: Harvesting mature crops (stage 3), awarding coins and EXP, floating pickup item spawning, tile reset after harvest, tree multi-harvest regrowth.
9. **F9: 4-Season & Dynamic Weather**: Spring, Summer, Autumn, Winter transitions; Sunny, Rain, Thunderstorm, Astral Rain, Blizzard weather effects; rain auto-watering soil; blizzard crop protection check.
10. **F10: Magical Sprinkler System**: Cardinal, Radial, Cross sprinkler placement; automatic morning watering trigger; sprinkler range validation.
11. **F11: Automated Scarecrows**: Scarecrow radius calculation, protection against crow/pest events, scarecrow placement limits.
12. **F12: Harvester Drones**: Autonomous scanning of harvestable stage 3 crops, auto-collection into shipping bin, drone battery/energy tick loop.
13. **F13: Preserves Jar Station**: Conversion of raw crops into Jams & Jellies, processing countdown timers, output item claim system, active station state toggle.
14. **F14: Brewing Barrel Station**: Conversion of fruits/grains into Cider, Wine & Juices; processing duration logic; multi-item recipe matching.
15. **F15: Seed Maker Station**: Conversion of 1 crop into 2-3 seed packets, random seed multiplier (2 to 3), seed type preservation.
16. **F16: Loom & Mill Stations**: Loom converting Silk Thread into Silk Cloth, Mill converting Wheat into Flour, processing state validation.
17. **F17: Mythical Livestock Pastures**: Golden Goats, Astral Bees, Silk Moths, Feathered Chocobos pasture entities; coordinate positioning; entity initialization.
18. **F18: Livestock Feeding & Affection**: Daily feeding state (`fedToday`), grooming action (`groomedToday`), affection score progression (0 to 100), affection decay if unfed.
19. **F19: Animal Product Harvesting**: Production readiness checks, collecting Golden Milk, Astral Honey, Silk Thread, Golden/Prism Eggs; resets product timer.
20. **F20: Dynamic Market Price Economy**: Daily price demand multipliers, item value calculation (`baseValue * marketMultiplier`), shipping bin deposit and midnight payout.
21. **F22: Farm Leveling & Land Unlocks**: EXP accumulation, level up threshold calculations, unlocking additional land plots, recipe unlock notifications.
22. **F21: Guild Order Delivery Board**: Daily quest generation, item delivery verification, order completion reward payout (coins + EXP), order rotation on day change.
23. **F23: Tool Progression & Upgrades**: Hoe, Watering Can, Axe, Scythe upgrades (Basic → Copper → Gold → Titanium); reduced energy costs; expanded tile AOE.
24. **F24: Procedural Audio Synth Engine**: Web Audio API synth initialization, chime playback for till/plant/harvest, ambient music frequency generation, sound toggle mute.
25. **F25: 60 FPS Pixel Renderer & HUD**: 480x270 canvas creation, nearest-neighbor scaling setup, deterministic `GameLoop` delta time updates, zero external sprite dependence.
26. **F26: 480x270 Modern Pixel HUD**: Rendering coins, energy bar, season/day clock, tool hotbar selection, quest goals widget.

---

## 4. Boundary & Corner Cases (Tier 2)

- Sub-zero HP/Energy and coin bounds prevention (clamping to 0).
- Grid boundary access (e.g. tile (-1, -1) or tile (99, 99) out of bounds).
- Inventory capacity overflow and underflow (selling item with count 0).
- Season boundary transition (Day 28 Spring → Day 1 Summer) and crop wither checks.
- Over-fertilization or duplicate tool actions on same tile.
- Level max cap (Level 50 / EXP cap) and level 1 initial state.

---

## 5. Cross-Feature Interaction Pipelines (Tier 3)

- **Crop & Automation Pipeline**: Weather (Rain) + Sprinkler + Fertilizer + Harvester Drone + Preserves Jar → Shipping Bin payout.
- **Livestock & Workshop Economy Pipeline**: Feed Golden Goat → High Affection Golden Milk → Preserves Processing → Market Multipliers + Guild Order Delivery → EXP & Level Up.
- **Tool Progression & Farm Expansion Pipeline**: High EXP → Level Up → Unlock Land Plot → Upgrade Hoe to Titanium → Till 3x3 Grid in 1 action.

---

## 6. Real-World End-to-End Scenarios (Tier 4)

- **Scenario A (Full Seasonal Simulation)**: 28-day Spring cycle with daily crop growth, weather changes, and seasonal transition to Summer.
- **Scenario B (Automated Magic Orchard & Livestock Enterprise)**: 50-day mid-game simulation with 4 processing stations, 3 drones, 4 mythical animals, and full order board fulfillment.
- **Scenario C (Economic Mastery & Titanium Upgrade Journey)**: 100-day long-term campaign achieving 100,000 coins, max land plots, and all Titanium tool upgrades.

---

## 7. How to Run tests

```bash
# Run all tests in PartyPlay including Mythic Farm
npx vitest run

# Run Mythic Farm test suite only
npx vitest run src/games/mythic-farm/
```
