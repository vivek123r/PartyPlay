# M1 Core Engine Framework & Types Analysis & Implementation Plan

## 1. Executive Summary
This document details the architectural plan and technical specification for **Milestone 1 (M1): Core Engine Framework & Types** of *Mythic Farm*. The goal of M1 is to establish the fundamental TypeScript interfaces, game configuration constants, PartyPlay `GameManifest` registration, and the `GameModule` lifecycle framework.

The files analyzed and mapped in this plan are:
1. `src/games/mythic-farm/types.ts` — Comprehensive TypeScript interfaces for grid tiles, crops, automation buildings, processing stations, mythical livestock, economy, and master farm state.
2. `src/games/mythic-farm/config.ts` — Game constants including 16×10 grid dimensions, crop species definitions, tool tier attributes, season/weather timing, base market prices, animal yields, and artisan recipes.
3. `src/games/mythic-farm/manifest.ts` — PartyPlay `GameManifest` definition configured for single-player (`minPlayers: 1`, `maxPlayers: 1`) with custom keybindings and game modifiers.
4. `src/games/mythic-farm/index.ts` — Core `MythicFarmGame` class implementing `GameModule` (`init`, `start`, `update`, `pause`, `resume`, `destroy`).

---

## 2. Interface Mapping (`src/games/mythic-farm/types.ts`)

The data contracts must support single-player farming mechanics, multi-stage crop growth, automated machinery, artisan workshop processing, animal livestock management, dynamic economy, and persistent save state.

### Key TypeScript Interfaces

```typescript
import type { GameContext } from '@runtime/types';

// ==========================================
// 1. Grid & Soil Types
// ==========================================
export type FertilizerType = 'speed' | 'quality' | 'bountiful';

export interface TileData {
  x: number;               // Grid tile column (0..15)
  y: number;               // Grid tile row (0..9)
  tilled: boolean;         // Soil tilling status
  watered: boolean;        // Hydrated status (resets daily)
  fertilizer?: FertilizerType; // Applied fertilizer
  crop?: CropEntity;       // Active crop planted on tile
  building?: AutomationBuilding; // Sprinkler, scarecrow, or drone on tile
  station?: ProcessingStation;  // Processing station placed on tile
  unlocked: boolean;       // Land plot expansion unlock status
  plotId: number;          // Land plot index (0..3)
}

// ==========================================
// 2. Crop & Species Types
// ==========================================
export type CropStage = 0 | 1 | 2 | 3; // 0: Seedling, 1: Sprout, 2: Flowering, 3: Harvestable

export interface CropSpecies {
  id: string;              // 'wheat' | 'pumpkin' | 'crystal_berry' | 'dragonfruit' | 'elder_oak' | 'sunflower'
  name: string;
  stages: [string, string, string, string]; // Descriptions/labels for stages
  growthDays: number;      // Total in-game days to reach stage 3
  regrows: boolean;        // Whether crop regrows after harvest (e.g. dragonfruit)
  regrowDays?: number;     // Days to regrow to harvestable stage
  seedCost: number;        // Purchase price in store
  harvestItemId: string;   // Inventory item produced on harvest
  harvestYieldMin: number; // Minimum item yield per harvest
  harvestYieldMax: number; // Maximum item yield per harvest
  basePrice: number;       // Base selling price per item
  expYield: number;        // Farm EXP awarded on harvest
  seasons: Season[];       // Seasons in which crop thrives
}

export interface CropEntity {
  id: string;              // Unique crop instance UUID
  speciesId: string;       // Foreign key to CropSpecies
  stage: CropStage;        // Current growth stage (0..3)
  withered: boolean;       // True if killed by wrong season or severe weather
  growthProgress: number;  // Fractional growth percentage (0.0 to 1.0)
  daysPlanted: number;     // Total days since planting
  wateredToday: boolean;   // Hydration tracking for current day tick
  fertilizedWith?: FertilizerType;
}

// ==========================================
// 3. Automation Buildings
// ==========================================
export type AutomationType = 
  | 'sprinkler_cardinal' // Waters 4 adjacent tiles (N, E, S, W)
  | 'sprinkler_radial'   // Waters 8 surrounding tiles (3x3 area)
  | 'sprinkler_cross'    // Waters 12 tiles in cross pattern (2-tile reach)
  | 'scarecrow'          // Protects 5x5 radius against crow damage
  | 'harvester_drone';   // Auto-collects mature crops into shipping bin

export interface AutomationBuilding {
  id: string;
  type: AutomationType;
  tileX: number;
  tileY: number;
  range: number;
  active: boolean;
}

// ==========================================
// 4. Processing Workshop Stations
// ==========================================
export type ProcessingStationType = 
  | 'preserves_jar'  // Crops -> Jam/Jelly
  | 'brewing_barrel' // Fruits/Grains -> Wine/Cider/Juice
  | 'seed_maker'     // Crops -> 2-3 Seeds
  | 'loom'           // Silk Thread -> Silk Cloth
  | 'mill';          // Wheat -> Flour

export interface ProcessingStation {
  id: string;
  type: ProcessingStationType;
  tileX: number;
  tileY: number;
  inputItem?: string;
  inputAmount?: number;
  outputItem?: string;
  outputAmount?: number;
  timerRemaining: number;      // Seconds until processing completes
  processingTimeTotal: number; // Total required seconds
  active: boolean;
}

// ==========================================
// 5. Mythical Livestock & Animal Barns
// ==========================================
export type AnimalSpecies = 
  | 'golden_goat' 
  | 'astral_bee' 
  | 'silk_moth' 
  | 'feathered_chocobo';

export interface AnimalEntity {
  id: string;
  species: AnimalSpecies;
  name: string;
  x: number;                 // World sub-tile X position inside pasture
  y: number;                 // World sub-tile Y position inside pasture
  fedToday: boolean;         // Feed state for current day
  groomedToday: boolean;     // Grooming state for current day
  affection: number;         // Affection rating (0 to 100)
  productReady: boolean;     // Harvestable product ready indicator
  daysOld: number;           // Age of animal
}

// ==========================================
// 6. Tools & Progression
// ==========================================
export type ToolType = 'hoe' | 'watering_can' | 'axe' | 'scythe';
export type ToolTier = 'basic' | 'copper' | 'gold' | 'titanium';

export interface ToolConfig {
  tier: ToolTier;
  energyCost: number;
  actionRadius: number; // 1x1 = 1, 1x2 = 2, 3x3 = 3, 5x5 = 5
  workSpeed: number;
}

// ==========================================
// 7. Environment, Seasons & Weather
// ==========================================
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'rain' | 'thunder' | 'astral_rain' | 'blizzard';

// ==========================================
// 8. Economy & Guild Orders
// ==========================================
export interface GuildOrder {
  id: string;
  title: string;
  requiredItem: string;
  requiredCount: number;
  currentCount: number;
  rewardCoins: number;
  rewardExp: number;
  completed: boolean;
  expiresDay: number;
}

export interface HotbarSlot {
  id: string;
  type: 'tool' | 'seed' | 'fertilizer' | 'building' | 'consumable';
  targetId: string;  // ToolType or CropSpecies ID or Item ID
  label: string;
  count?: number;
}

// ==========================================
// 9. Master Persistent Farm State
// ==========================================
export interface FarmState {
  version: number;
  coins: number;
  energy: number;
  maxEnergy: number;
  farmLevel: number;
  farmExp: number;
  currentDay: number;
  currentSeason: Season;
  currentWeather: Weather;
  toolTiers: Record<ToolType, ToolTier>;
  selectedHotbarIndex: number;
  unlockedPlots: number[]; // Array of unlocked plot IDs e.g. [0] (plot 0 default unlocked)
  inventory: Record<string, number>; // Item ID -> Quantity map
  marketMultipliers: Record<string, number>; // Item ID -> Daily price multiplier
  grid: TileData[][];      // 10 rows x 16 columns grid matrix
  stations: ProcessingStation[];
  animals: AnimalEntity[];
  activeOrders: GuildOrder[];
  lastSavedTimestamp: number;
}
```

---

## 3. Configuration Mapping (`src/games/mythic-farm/config.ts`)

`config.ts` defines all static constants, resolution metrics, crop catalogs, tool specs, price lists, animal configs, and crafting recipes.

### Constants Blueprint

```typescript
import type { CropSpecies, ToolTier, ToolConfig, Season, AnimalSpecies, ToolType } from './types';

// Canvas & Resolution Architecture
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 270;

// Grid Specifications
export const GRID_WIDTH = 16;
export const GRID_HEIGHT = 10;
export const TILE_SIZE = 24; // 16 * 24 = 384px width, leaving 96px for HUD sidebar
export const GRID_OFFSET_X = 8;
export const GRID_OFFSET_Y = 16;

// Time & Season Engine
export const DAYS_PER_SEASON = 7;
export const DAY_DURATION_SECONDS = 60; // 1 in-game day = 60 real seconds
export const SEASONS_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// Crop Species Definitions (6 distinct crops)
export const CROP_SPECIES: Record<string, CropSpecies> = {
  wheat: {
    id: 'wheat',
    name: 'Golden Wheat',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 2,
    regrows: false,
    seedCost: 10,
    harvestItemId: 'crop_wheat',
    harvestYieldMin: 1,
    harvestYieldMax: 2,
    basePrice: 25,
    expYield: 10,
    seasons: ['spring', 'autumn'],
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Mythic Pumpkin',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 4,
    regrows: false,
    seedCost: 35,
    harvestItemId: 'crop_pumpkin',
    harvestYieldMin: 1,
    harvestYieldMax: 1,
    basePrice: 120,
    expYield: 35,
    seasons: ['autumn'],
  },
  crystal_berry: {
    id: 'crystal_berry',
    name: 'Crystal Berry',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 3,
    regrows: true,
    regrowDays: 2,
    seedCost: 40,
    harvestItemId: 'crop_crystal_berry',
    harvestYieldMin: 2,
    harvestYieldMax: 4,
    basePrice: 60,
    expYield: 25,
    seasons: ['summer', 'winter'],
  },
  dragonfruit: {
    id: 'dragonfruit',
    name: 'Solar Dragonfruit',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 5,
    regrows: true,
    regrowDays: 3,
    seedCost: 75,
    harvestItemId: 'crop_dragonfruit',
    harvestYieldMin: 1,
    harvestYieldMax: 3,
    basePrice: 180,
    expYield: 50,
    seasons: ['summer'],
  },
  elder_oak: {
    id: 'elder_oak',
    name: 'Ancient Elder-Oak',
    stages: ['Sapling', 'Growing Tree', 'Blossoming Tree', 'Harvestable Orchard Tree'],
    growthDays: 6,
    regrows: true,
    regrowDays: 3,
    seedCost: 100,
    harvestItemId: 'crop_elder_oak_fruit',
    harvestYieldMin: 2,
    harvestYieldMax: 5,
    basePrice: 220,
    expYield: 70,
    seasons: ['spring', 'summer', 'autumn', 'winter'],
  },
  sunflower: {
    id: 'sunflower',
    name: 'Radiant Sunflower',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 3,
    regrows: false,
    seedCost: 20,
    harvestItemId: 'crop_sunflower',
    harvestYieldMin: 1,
    harvestYieldMax: 3,
    basePrice: 50,
    expYield: 20,
    seasons: ['spring', 'summer'],
  },
};

// Tool Tier Attributes
export const TOOL_TIER_CONFIG: Record<ToolTier, ToolConfig> = {
  basic: { tier: 'basic', energyCost: 5, actionRadius: 1, workSpeed: 1.0 },
  copper: { tier: 'copper', energyCost: 4, actionRadius: 2, workSpeed: 1.25 },
  gold: { tier: 'gold', energyCost: 3, actionRadius: 3, workSpeed: 1.5 },
  titanium: { tier: 'titanium', energyCost: 2, actionRadius: 5, workSpeed: 2.0 },
};

// Player Energy Metrics
export const BASE_MAX_ENERGY = 100;
export const ENERGY_RECOVER_SLEEP = 100;

// Base Price Catalog for Economy
export const ITEM_BASE_PRICES: Record<string, number> = {
  // Raw Crops
  crop_wheat: 25,
  crop_pumpkin: 120,
  crop_crystal_berry: 60,
  crop_dragonfruit: 180,
  crop_elder_oak_fruit: 220,
  crop_sunflower: 50,
  
  // Artisan Goods
  artisan_jam: 150,
  artisan_wine: 350,
  artisan_flour: 50,
  artisan_cloth: 200,

  // Animal Goods
  product_golden_milk: 180,
  product_astral_honey: 250,
  product_silk_thread: 90,
  product_golden_egg: 300,
};

// Animal Species Specs
export const ANIMAL_CONFIG: Record<AnimalSpecies, { cost: number; productTimeDays: number; itemYield: string; basePrice: number }> = {
  golden_goat: { cost: 300, productTimeDays: 1, itemYield: 'product_golden_milk', basePrice: 180 },
  astral_bee: { cost: 450, productTimeDays: 2, itemYield: 'product_astral_honey', basePrice: 250 },
  silk_moth: { cost: 200, productTimeDays: 1, itemYield: 'product_silk_thread', basePrice: 90 },
  feathered_chocobo: { cost: 600, productTimeDays: 2, itemYield: 'product_golden_egg', basePrice: 300 },
};

// Workshop Recipes
export const WORKSHOP_RECIPES = {
  preserves_jar: { processingTime: 30, inputItem: 'crop_pumpkin', outputItem: 'artisan_jam', outputAmount: 1 },
  brewing_barrel: { processingTime: 60, inputItem: 'crop_dragonfruit', outputItem: 'artisan_wine', outputAmount: 1 },
  seed_maker: { processingTime: 15, inputItem: 'crop_wheat', outputItem: 'seed_wheat', outputAmount: 3 },
  loom: { processingTime: 40, inputItem: 'product_silk_thread', outputItem: 'artisan_cloth', outputAmount: 1 },
  mill: { processingTime: 20, inputItem: 'crop_wheat', outputItem: 'artisan_flour', outputAmount: 2 },
};

// Land Expansion Plots Configuration (4 Quadrants of 8x5 tiles each)
export const LAND_PLOT_UNLOCK_COSTS: Record<number, { levelReq: number; coinCost: number }> = {
  0: { levelReq: 1, coinCost: 0 },      // Starting plot (Top-Left 8x5)
  1: { levelReq: 3, coinCost: 500 },    // Plot 1 (Top-Right 8x5)
  2: { levelReq: 5, coinCost: 1500 },   // Plot 2 (Bottom-Left 8x5)
  3: { levelReq: 8, coinCost: 4000 },   // Plot 3 (Bottom-Right 8x5)
};
```

---

## 4. Manifest Mapping (`src/games/mythic-farm/manifest.ts`)

The `manifest.ts` must export a default `GameManifest` that complies with PartyPlay's `@runtime/types`.

### Manifest Blueprint

```typescript
import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'mythic-farm',
  title: 'MYTHIC FARM: MAGIC ORCHARD',
  description: 'An insane, vibrant 2D isometric single-player farming simulation featuring multi-stage crops, mythical livestock, automated harvesting machinery, processing workshops, and dynamic market economy!',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Strategy',
  thumbnail: '',
  tags: ['Farming', 'Simulation', 'Single-Player', 'Automation', 'Economy', 'Crafting'],
  difficulty: 'Medium',
  minPlayers: 1,
  maxPlayers: 1,
  estimatedRoundTime: 'Endless',

  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: true,
    supportsSeed: true,
    supportsGamepad: false,
    supportsTouch: true,
  },

  defaultControls: [
    {
      playerId: 1,
      deviceId: 'keyboard-main',
      bindings: {
        moveUp: ['KeyW', 'ArrowUp'],
        moveDown: ['KeyS', 'ArrowDown'],
        moveLeft: ['KeyA', 'ArrowLeft'],
        moveRight: ['KeyD', 'ArrowRight'],
        action: ['Space', 'KeyE'],       // Use selected tool / interact
        secondary: ['KeyF'],              // Open market / interaction menu
        slot1: ['Digit1'],
        slot2: ['Digit2'],
        slot3: ['Digit3'],
        slot4: ['Digit4'],
        slot5: ['Digit5'],
        slot6: ['Digit6'],
        pause: ['Escape'],
      },
    },
  ],

  defaultModifiers: {
    initialCoins: 500,
    growthSpeedMultiplier: 1.0,
    energyDecayMultiplier: 1.0,
  },
};

export default manifest;
```

---

## 5. Lifecycle Architecture (`src/games/mythic-farm/index.ts`)

The main entry point class `MythicFarmGame` implements `GameModule`. It bridges the PartyPlay `GameContext` (providing renderer, audio, storage, input, logger, events) to Mythic Farm's internal systems.

### Lifecycle Diagram & State Transitions

```
 [ Uninitialized ]
        │
        ▼ (init)
   [ Loading ] ──► Load Saved FarmState from context.storage / Init Graphics & Synth
        │
        ▼
    [ Ready ]
        │
        ▼ (start)
   [ Playing ] ◄───────► [ Paused ] (pause / resume)
        │
        ▼ (destroy)
  [ Destroyed ] ──► Auto-Save FarmState to context.storage / Dispose PIXI Stage
```

### Skeletal Implementation Blueprint

```typescript
import { Container, Graphics } from 'pixi.js';
import type { GameModule, GameContext, InternalGameState } from '@runtime/types';
import type { FarmState } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRID_WIDTH, GRID_HEIGHT } from './config';

export default class MythicFarmGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private rootContainer!: Container;
  private gameStageContainer!: Container;
  private hudContainer!: Container;

  private farmState!: FarmState;
  private isPaused: boolean = false;
  private gameTimeAccumulator: number = 0;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.ctx.logger.info('Initializing MYTHIC FARM: SINGLE-PLAYER FARMVILLE & MAGIC ORCHARD...');

    const { stage } = this.ctx.renderer;

    // Create Root Container
    this.rootContainer = new Container();
    this.gameStageContainer = new Container();
    this.hudContainer = new Container();

    this.rootContainer.addChild(this.gameStageContainer);
    this.rootContainer.addChild(this.hudContainer);
    stage.addChild(this.rootContainer);

    // Initialize or Load Farm State from Storage
    await this.loadOrCreateFarmState();

    // Set stage interaction
    stage.eventMode = 'static';

    this.state = 'Ready';
    this.ctx.logger.info('Mythic Farm initialized successfully.');
  }

  public start(): void {
    if (this.state !== 'Ready') return;
    this.state = 'Playing';
    this.ctx.logger.info('Mythic Farm started.');
  }

  public update(dt: number): void {
    if (this.state !== 'Playing' || this.isPaused) return;

    // Advance real-time day tick timer
    this.gameTimeAccumulator += dt;
    
    // Core Engine Sub-System Tick Hierarchy:
    // 1. Weather System Update
    // 2. Crop Growth & Soil Hydration Decay
    // 3. Automation Machinery (Sprinklers, Scarecrows, Drones)
    // 4. Processing Workshop Countdown Timers
    // 5. Animal Livestock Tick & Product Readiness
    // 6. Input Handler & Avatar Movement
    // 7. HUD Render Sync
  }

  public pause(): void {
    if (this.state !== 'Playing') return;
    this.isPaused = true;
    this.state = 'Paused';
    this.ctx.logger.info('Mythic Farm paused.');
  }

  public resume(): void {
    if (this.state !== 'Paused') return;
    this.isPaused = false;
    this.state = 'Playing';
    this.ctx.logger.info('Mythic Farm resumed.');
  }

  public destroy(): void {
    this.ctx.logger.info('Destroying Mythic Farm...');
    
    // Auto-save state to StorageService
    this.saveFarmState();

    // Cleanup PIXI containers
    if (this.rootContainer) {
      this.rootContainer.destroy({ children: true });
    }

    this.state = 'Destroyed';
  }

  private async loadOrCreateFarmState(): Promise<void> {
    const saved = await this.ctx.storage.getItem<FarmState>('mythic_farm_save');
    if (saved && saved.version === 1) {
      this.farmState = saved;
      this.ctx.logger.info('Loaded existing farm save state.');
    } else {
      this.farmState = this.createInitialFarmState();
      this.ctx.logger.info('Created new default farm state.');
    }
  }

  private saveFarmState(): void {
    if (this.farmState && this.ctx?.storage) {
      this.farmState.lastSavedTimestamp = Date.now();
      this.ctx.storage.setItem('mythic_farm_save', this.farmState);
    }
  }

  private createInitialFarmState(): FarmState {
    // Generate initial 16x10 grid matrix
    const grid = [];
    for (let r = 0; r < GRID_HEIGHT; r++) {
      const row = [];
      for (let c = 0; c < GRID_WIDTH; c++) {
        row.push({
          x: c,
          y: r,
          tilled: false,
          watered: false,
          unlocked: c < 8 && r < 5, // Quadrant 0 (top-left 8x5) unlocked by default
          plotId: (r < 5 ? 0 : 2) + (c < 8 ? 0 : 1),
        });
      }
      grid.push(row);
    }

    return {
      version: 1,
      coins: (this.ctx.modifiers?.initialCoins as number) || 500,
      energy: 100,
      maxEnergy: 100,
      farmLevel: 1,
      farmExp: 0,
      currentDay: 1,
      currentSeason: 'spring',
      currentWeather: 'sunny',
      toolTiers: {
        hoe: 'basic',
        watering_can: 'basic',
        axe: 'basic',
        scythe: 'basic',
      },
      selectedHotbarIndex: 0,
      unlockedPlots: [0],
      inventory: {
        seed_wheat: 5,
        seed_sunflower: 3,
      },
      marketMultipliers: {},
      grid,
      stations: [],
      animals: [],
      activeOrders: [],
      lastSavedTimestamp: Date.now(),
    };
  }
}
```

---

## 6. Synthesis & Verification Checklist
1. All types in `types.ts` are strictly typed and cover all features requested in `ORIGINAL_REQUEST.md` (crops, workshops, livestock, market economy, plot unlocks, tool tiers).
2. Configuration constants in `config.ts` align with PartyPlay 480×270 resolution and pixel grid geometry.
3. Manifest in `manifest.ts` is configured as a single-player game (`minPlayers: 1`, `maxPlayers: 1`).
4. Lifecycle in `index.ts` correctly integrates PartyPlay `GameContext` services (`storage`, `renderer`, `logger`).
