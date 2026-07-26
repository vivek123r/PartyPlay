# Codebase Survey & Architectural Analysis: Mythic Farm

## Executive Summary

**Mythic Farm** (`src/games/mythic-farm`) is a single-player farming simulation and magic orchard game designed for the PartyPlay web arcade console engine. This investigation conducted a full survey of the repository context, engine runtime architecture, and existing directory state to establish the implementation blueprint for requirements R1 through R5.

At the time of this survey:
- `/home/viv/Projects/PartyPlay/src/games/mythic-farm` contains only agent metadata (`.agents/`).
- The PartyPlay core engine runtime (`src/runtime`), services (`src/services`), and platform (`src/platform`) are fully operational.
- `npx tsc --noEmit` passes cleanly with **zero type errors**.
- `npm run build` compiles cleanly into production bundles with **zero build errors**.

---

## 1. Directory & File Inventory Analysis

### 1.1 Existing Directory State
- **Path**: `/home/viv/Projects/PartyPlay/src/games/mythic-farm`
- **Current Contents**: `.agents/` directory containing dispatch and briefing logs, plus `ORIGINAL_REQUEST.md`.
- **Status**: Clean slate ready for module creation.

### 1.2 Engine Integration Points
PartyPlay auto-discovers games through `src/runtime/GameRegistry.ts` via Vite's `import.meta.glob`:
1. `manifest.ts`: Eagerly loaded for `GameBrowser` and `PlayerSetup` screens.
2. `index.ts`: Lazily loaded when the user launches the game from `PlayerSetup`.

---

## 2. Requirement Gap Analysis (Existing vs To-Be-Implemented)

| Requirement | Title | Description | Existing Infrastructure | Required Implementation |
| :--- | :--- | :--- | :--- | :--- |
| **R1** | Dynamic Farming & Orchard Grid Engine | Soil tilling, planting, watering, fertilizing, 4-stage crop growth, orchard trees, seasonal weather. | `RendererContext` (PixiJS 480x270 stage), `InputService` for tile interaction. | `FarmGrid`, `Tile` data model, 6 crop types (Wheat, Pumpkin, Crystal Berry, Elder-Oak Tree, Dragonfruit, Moonflower) with 4 growth stages, watering/fertilizer states, decay timers, rain/sun weather system. |
| **R2** | Automation & Processing Workshop | Sprinklers (cross/radial), scarecrows, harvester drones, preserves jar, brewing barrel, seed maker, loom. | Ticker loop (60 FPS fixed dt), `AudioService` for machine hums/chimes. | `Machine` entities, sprinkler tick waterer logic, drone harvest collector, workshop conversion timers (raw crop → artisan goods: Jam, Wine, Seeds, Silk). |
| **R3** | Mythical Livestock & Animal Barns | Golden Goats, Astral Bees, Silk Moths, Feathered Chocobos; feeding, grooming, resource drops. | Physics collision math, PRNG generator for resource drop rates. | `Animal` entity AI & state machine, pasture bounds, feed trough interaction, grooming meter, resource drops (Golden Milk, Astral Honey, Silk Thread, Golden Eggs). |
| **R4** | Dynamic Market Economy & Expansion | Fluctuating market prices, order board, farm EXP/leveling, land expansion, tool upgrades, HUD. | `StorageService` for saving coin/EXP state across sessions. | `EconomyMarketSystem`, price multiplier algorithms, order board delivery UI, land expansion tile unlocking, tool tier progression (Hoe/Watering Can), pixel HUD. |
| **R5** | Single-Player Campaign & Arcade Integration | Story quest milestones, avatar customization, tool hotbar, procedural audio, 60 FPS performance. | `GameModule` interface, `AudioService.playTone()`, `PlayerSetup` screen. | Avatar controller (8-way movement + action button), tool hotbar switcher, story quest progression chapters, custom procedural synth music and sound effects. |

---

## 3. Recommended Architecture & Component Boundaries

### 3.1 Directory Layout
```
src/games/mythic-farm/
├── manifest.ts                     # Game manifest configuration (minPlayers: 1, maxPlayers: 1)
├── index.ts                        # Main GameModule class implementation
├── types.ts                        # Data models (FarmState, Tile, Crop, Machine, Animal, MarketOrder)
├── config.ts                       # Game constants (Crop data, Recipes, Tool upgrades, Seasons)
├── entities/                       # Renderable PixiJS display objects & game entities
│   ├── Player.ts                   # Player avatar, 8-directional movement, facing tile calculator
│   ├── FarmGrid.ts                 # Grid renderer, till/water tilemap, crop sprite lifecycle
│   ├── Crop.ts                     # 4-stage visual growth & harvest state manager
│   ├── Machine.ts                  # Sprinklers, workshop processors, drones, scarecrows
│   ├── Animal.ts                   # Livestock state machine, feed/grooming, item spawner
│   └── ItemPickup.ts               # Physical pickup items, bounce animations, floating text
├── systems/                        # Simulation & game logic modules
│   ├── TimeWeatherSystem.ts        # Season calendar, day/night clock, weather effects (Rain/Sun)
│   ├── EconomyMarketSystem.ts      # Price fluctuations, market transactions, order board logic
│   ├── QuestSystem.ts              # Story chapter progression & task milestone tracker
│   └── SoundFxSystem.ts            # Procedural Web Audio synth sound generator
└── ui/                             # PixiJS Canvas-rendered HUD and modal screens
    ├── HUDManager.ts               # Top bar (Coins, Energy, Calendar) & bottom Tool Hotbar
    ├── MarketUI.ts                 # Interactive selling & buying market modal
    ├── OrderBoardUI.ts             # Order delivery board modal
    └── QuestDialogUI.ts            # Campaign quest dialog overlay
```

---

## 4. State Management & Data Flow Patterns

1. **Internal Game Loop State (`FarmState`)**:
   - `tiles`: 2D array of grid cell states (`x, y, tilled, watered, fertilized, cropId, growthStage, growthTimer`).
   - `inventory`: Map of item IDs to quantities (Seeds, Crops, Artisan Goods, Animal Products).
   - `tools`: Active tool slot, tier levels (Basic, Gold, Titanium).
   - `player`: Coordinates `(x, y)`, energy (0-100), stamina drain per tool hit.
   - `economy`: Coins, farm level, farm EXP, unlocked land plots.
   - `time`: Current day, season (Spring/Summer/Autumn/Winter), weather state, clock time (06:00 to 24:00).

2. **Persistence Layer**:
   - Uses `context.storage` (namespaced to `games:mythic-farm`).
   - Auto-saves farm state on in-game day completion or session pause.

3. **Rendering & PixiJS Canvas Pipeline**:
   - Native fixed resolution: 480 × 270.
   - Main container layer structure:
     - `backgroundContainer`: Ground tiles, grass, tilled soil, fences.
     - `cropContainer`: Multi-stage crops, orchard trees, sprinkles, workshops.
     - `entityContainer`: Player avatar, animals, drones, item pickups (Y-sorted for depth).
     - `weatherFXContainer`: Rain drops, sunny ambient sparkles, falling leaves.
     - `hudContainer`: Hotbar, status bars, coin counter, active modals.

4. **Audio Synthesis Architecture**:
   - 100% procedural via `context.audio.playTone()`.
   - Distinct sound signatures:
     - Tilling: Sawtooth 120Hz → 90Hz envelope (0.1s).
     - Watering: Sine wave frequency glide 400Hz → 600Hz (0.15s).
     - Planting/Harvesting: Chime arpeggio 523Hz → 659Hz → 784Hz (0.2s).
     - Animal interaction: Triangle wave 300Hz wobbles.
     - Market sell: Dual square wave 880Hz + 1174Hz (0.25s).

---

## 5. Risk Assessment & Verification Plan

### Key Implementation Guidelines
- **Single-Player Focus**: Set `minPlayers: 1` and `maxPlayers: 1` in `manifest.ts`.
- **Performance Budget**: Target constant 60 FPS tick using fixed `dt = 1/60`. Avoid allocating dynamic objects inside the 60 FPS `update()` loop.
- **Whole-Pixel Precision**: All rendered entity positions must apply `Math.round(x)` and `Math.round(y)` to prevent subpixel jitter on the 480x270 canvas.
- **Type Safety**: Strictly define interfaces in `types.ts` to ensure `npx tsc --noEmit` and `npm run build` pass without warnings.
