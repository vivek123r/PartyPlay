# Project: MYTHIC FARM: SINGLE-PLAYER FARMVILLE & MAGIC ORCHARD

## Architecture
Mythic Farm is built as a single-player simulation game module for the PartyPlay engine.
- Resolution: 480 × 270 native pixel canvas with nearest-neighbor integer scaling.
- Engine: PixiJS v8 (`RendererContext.stage`), deterministic 60 FPS tick loop (`GameLoop`), procedural audio synthesis (`AudioService.playTone`), namespaced storage (`StorageService`).
- Design Pattern: Clean modular architecture segregating `types.ts`, `config.ts`, `entities/`, `systems/`, `ui/`, `audio/`, `utils/`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: Game Module Registration | `manifest.ts` & `index.ts` implementation for PartyPlay `GameRegistry` auto-discovery | M1 | Survey |
| 2 | F2: Save/Load State Persistence | LocalStorage persistence via `context.storage` for farm layout, inventory, coins, level | M1 | Survey |
| 3 | F3: Grid Tile Soil Tilling & Moisture | Dynamic grid engine supporting till, water, fertilize, reset states | M2 | Survey |
| 4 | F4: Crop Planting & Seed Management | Plant Wheat, Pumpkin, Crystal Berry, Dragonfruit, Elder-Oak, Sunflower | M2 | Survey |
| 5 | F5: Multi-Stage Crop & Tree Growth | 4 visual growth stages (Seedling, Sprout, Flowering, Harvestable) + Withered | M2 | Survey |
| 6 | F6: Watering Can & Soil Hydration | Manual watering tool & daily moisture decay engine | M2 | Survey |
| 7 | F7: Fertilizer Soil Enrichment | Quality & growth speed boost fertilizers | M2 | Survey |
| 8 | F8: Crop & Tree Harvesting | Harvesting crops/orchard fruits awarding coins, EXP, and floating item pickups | M2 | Survey |
| 9 | F9: 4-Season & Dynamic Weather | Spring, Summer, Autumn, Winter calendar + Rain, Thunderstorm, Astral Rain, Blizzard | M2 | Survey |
| 10 | F10: Magical Sprinkler System | Cardinal, Radial, and Cross sprinklers watering adjacent tiles on tick/day start | M3 | Survey |
| 11 | F11: Automated Scarecrows | Scarecrows protecting crops from crow/pest damage in radius | M3 | Survey |
| 12 | F12: Harvester Drones | Drones auto-harvesting mature crops into shipping bin | M3 | Survey |
| 13 | F13: Preserves Jar Station | Converts raw crops into Jams & Jellies after countdown | M3 | Survey |
| 14 | F14: Brewing Barrel Station | Converts fruits/grains into Cider, Wine, & Juices | M3 | Survey |
| 15 | F15: Seed Maker Station | Converts harvested crops into 2-3 seed packets | M3 | Survey |
| 16 | F16: Loom & Mill Stations | Converts Silk Thread into Silk Cloth, Wheat into Flour | M3 | Survey |
| 17 | F17: Mythical Livestock Pastures | Golden Goats, Astral Bees, Silk Moths, Feathered Chocobos pasture entities | M4 | Survey |
| 18 | F18: Livestock Feeding & Affection | Feeding & grooming animals to boost affection & production tiers | M4 | Survey |
| 19 | F19: Animal Product Harvesting | Collecting Golden Milk, Astral Honey, Silk Thread, Golden/Prism Eggs | M4 | Survey |
| 20 | F20: Dynamic Market Price Economy | Fluctuating daily crop/goods demand multipliers & shipping bin sale system | M5 | Survey |
| 21 | F21: Guild Order Delivery Board | Daily quest orders requiring specific crop/artisan goods deliveries for rewards | M5 | Survey |
| 22 | F22: Farm Leveling & Land Unlocks | EXP progression unlocking higher tier land plots & workshop recipes | M5 | Survey |
| 23 | F23: Tool Progression & Upgrades | Upgrade Hoe, Watering Can, Axe, Scythe from Basic to Titanium | M5 | Survey |
| 24 | F24: Procedural Audio Synth Engine | Web Audio API oscillator chimes for tilling, planting, harvesting, ambient music | M1 | Survey |
| 25 | F25: 60 FPS Pixel Renderer & HUD | Pixel-perfect 480x270 rendering loop with zero external asset dependencies | M1 | Survey |
| 26 | F26: 480x270 Modern Pixel HUD | Coins, Energy bar, Season/Day clock, Tool Hotbar, Quest widget | M5 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Core Engine Framework & Types | Registration, Data Models, Procedural Texture Cache, Audio Synthesizer, Storage | none | DONE |
| 2 | M2: Dynamic Farming, Soil & Orchard Grid Engine | Soil Tilling, Planting, 4-Stage Crops/Trees, Weather System, Pickups | M1 | DONE |
| 3 | M3: Insane Automation & Processing Workshop | Sprinklers (Cardinal/Radial/Cross), Scarecrows, Drones, Jars, Barrels, Mills | M1, M2 | IN_PROGRESS |
| 4 | M4: Mythical Livestock & Animal Barns | Goats, Bees, Silk Moths, Chocobos, Feeding/Grooming, Yield Tiers | M1, M2 | PLANNED |
| 5 | M5: Dynamic Economy, Land Expansions & HUD | Price Fluctuations, Orders, Leveling, Land Plot Unlocks, Tool Upgrades, HUD | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `src/games/mythic-farm/types.ts`
```typescript
export interface TileData {
  x: number;
  y: number;
  tilled: boolean;
  watered: boolean;
  fertilizer?: 'speed' | 'quality' | 'bountiful';
  crop?: CropEntity;
  building?: AutomationBuilding;
  unlocked: boolean;
}

export interface CropEntity {
  id: string;
  speciesId: string;
  stage: 0 | 1 | 2 | 3; // 0: Seedling, 1: Sprout, 2: Flowering, 3: Harvestable
  withered: boolean;
  growthProgress: number; // 0 to 1
  daysPlanted: number;
}

export interface ProcessingStation {
  id: string;
  type: 'preserves_jar' | 'brewing_barrel' | 'seed_maker' | 'loom' | 'mill';
  tileX: number;
  tileY: number;
  inputItem?: string;
  outputItem?: string;
  timerRemaining: number;
  active: boolean;
}

export interface AnimalEntity {
  id: string;
  species: 'golden_goat' | 'astral_bee' | 'silk_moth' | 'feathered_chocobo';
  x: number;
  y: number;
  fedToday: boolean;
  groomedToday: boolean;
  affection: number; // 0 to 100
  productReady: boolean;
}

export interface FarmState {
  coins: number;
  energy: number;
  maxEnergy: number;
  farmLevel: number;
  farmExp: number;
  currentDay: number;
  currentSeason: 'spring' | 'summer' | 'autumn' | 'winter';
  currentWeather: 'sunny' | 'rain' | 'thunder' | 'astral_rain' | 'blizzard';
  toolTiers: Record<'hoe' | 'watering_can' | 'axe' | 'scythe', 'basic' | 'copper' | 'gold' | 'titanium'>;
  selectedHotbarIndex: number;
  unlockedPlots: number;
  inventory: Record<string, number>;
  marketMultipliers: Record<string, number>;
}
```

## Code Layout
```
src/games/mythic-farm/
├── manifest.ts
├── index.ts
├── types.ts
├── config.ts
├── utils/
│   ├── TextureGenerator.ts
│   ├── AudioSynthesizer.ts
│   └── StorageManager.ts
├── entities/
│   ├── Grid.ts
│   ├── Crop.ts
│   ├── Automation.ts
│   ├── Workshop.ts
│   └── Animal.ts
├── systems/
│   ├── FarmingSystem.ts
│   ├── AutomationSystem.ts
│   ├── WorkshopSystem.ts
│   ├── AnimalSystem.ts
│   ├── EconomySystem.ts
│   └── WeatherSystem.ts
└── ui/
    ├── HUD.ts
    ├── MarketUI.ts
    ├── OrderBoardUI.ts
    └── HotbarUI.ts
```
