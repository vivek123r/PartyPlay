# Mythic Farm: Authoritative System Specifications & Domain Analysis

## 1. Executive Summary & Architecture Integration Overview

**MYTHIC FARM** is a 2D isometric/top-down single-player farming simulation game built for the PartyPlay browser console framework. It combines deep multi-stage agricultural mechanics, magical fruit orchards, mythical livestock husbandry, automated farming technology, artisan processing workshops, and a dynamic market economy into a performance-tuned 60 FPS web application.

### Framework Layer Boundaries & Architectural Positioning
Mythic Farm resides under `src/games/mythic-farm` and strictly implements the `GameModule` interface defined in `@runtime/types.ts`.
- **Canvas Rendering Engine**: Executes on PixiJS container layer wrapped inside `RendererContext` at a fixed virtual resolution of **480 × 270** with integer pixel scaling and whole-pixel snapping (`Math.round`).
- **Audio Engine**: Uses `AudioService` for 100% procedural Web Audio synthesis (zero external audio files).
- **State Persistence**: Uses `StorageService` for local save slots, avatar state, high scores, and unlocked farm land.
- **Randomization**: Driven deterministically by `PRNG` (`context.random`) for reproducible crop mutation and daily weather.

---

## 2. Comprehensive Subsystem Specifications

### R1. Dynamic Farming, Soil & Orchard Grid Engine

#### Grid Architecture & Tile State Machine
The farm map consists of an expandable 2D grid of tiles (default 16×16 main plot, expandable to 48×48 across unlocked zones). Each tile maintains an explicit state object:

```typescript
export type TileType = 'soil' | 'grass' | 'water' | 'rock' | 'path' | 'locked_land';
export type FertilizerType = 'speed_grow' | 'quality_boost' | 'water_retention';

export interface SoilState {
  tilled: boolean;
  watered: boolean;
  fertilized: boolean;
  fertilizerType: FertilizerType | null;
  daysUntilled: number; // Reverts to grass/untilled if empty for 3 days
}

export interface TileData {
  x: number;
  y: number;
  type: TileType;
  soil: SoilState;
  crop: CropEntity | null;
  tree: OrchardTreeEntity | null;
  structureId: string | null; // Sprinkler, Scarecrow, Machine ID
  debris: 'weed' | 'stone' | 'stump' | null;
}
```

#### Crop Types & Growth Stage Machine
Every crop progresses through 5 visual growth stages:
`Stage 0: Seedling` ➔ `Stage 1: Sprout` ➔ `Stage 2: Flowering` ➔ `Stage 3: Harvestable` ➔ `Stage 4: Withered`

| Crop ID | Name | Type | Base Growth Time | Preferred Season | Seed Price | Harvest Base Price | Re-harvestable? | Special Traits |
|---|---|---|---|---|---|---|---|---|
| `wheat` | Wheat | Grain | 2 Days (2 mins) | Spring, Autumn | 10g | 25g | No | Fast starter crop, processed in Mill |
| `pumpkin` | Pumpkin | Vegetable | 4 Days (4 mins) | Autumn | 40g | 120g | No | 5% chance of Giant Pumpkin (3x3 tile yield) |
| `crystal_berry` | Crystal Berry | Mythical Fruit | 5 Days (5 mins) | Winter, Spring | 80g | 280g | Yes (Regrows in 2 days) | Glows in dark, high value jam input |
| `dragonfruit` | Dragonfruit | Exotic Fruit | 6 Days (6 mins) | Summer | 120g | 450g | Yes (Regrows in 3 days) | High market volatility (+/- 50%) |
| `elder_oak` | Ancient Elder-Oak | Orchard Tree | 8 Days (8 mins) | All Seasons | 250g | 150g (Bark/Acorn per harvest) | Yes (Permanent tree, fruits every 3 days) | Single or 2x2 tile tree, yields Mythic Resin |
| `solar_sunflower` | Solar Sunflower | Magical Flower | 3 Days (3 mins) | Summer, Spring | 30g | 90g | No | Boosts adjacent crop growth by 15% |

#### Soil State Transitions & Fertilizers
1. **Tilling**: Using Hoe on `grass` or `untilled` tile transforms `soil.tilled` to `true`.
2. **Watering**: Using Watering Can or Sprinkler sets `soil.watered` to `true`. Soil color darkens.
3. **Fertilizing**: Applied before planting seeds.
   - `speed_grow`: Reduces growth stage duration by 33%.
   - `quality_boost`: Increases Gold/Mythic harvest chance by +25%.
   - `water_retention`: 50% chance tile remains watered overnight without needing re-watering.
4. **Day Reset**: At 06:00 in-game time, watered tiles transition to unwatered unless retained by `water_retention` or rain.

#### Seasonal Weather System
- **Calendar**: 4 Seasons (Spring, Summer, Autumn, Winter), 28 Days per season. 1 Day = 60 real-time seconds.
- **Weather Types**:
  - `Sunny`: Standard growth, manual or sprinkler watering needed.
  - `Rainy`: Automatically waters 100% of tilled farm tiles at day start.
  - `Thunderstorm`: Waters all tiles; 2% chance per day of lightning striking an unprotected crop/tree, converting it to Charcoal. Scarecrows act as lightning rods within protection radius!
  - `Astral Rain` (Rare Mythical Weather): 5% chance in Spring/Winter; all crops grow +1 stage instantly, animal product quality guaranteed Silver or higher.
  - `Blizzard`: Occurs in Winter; un-sheltered non-winter crops wither immediately unless protected inside a Greenhouse structure.

---

### R2. Automation & Processing Workshop Specifications

#### Magical Sprinklers

```typescript
export type SprinklerTier = 'basic' | 'quality' | 'iridium' | 'cross';

export interface SprinklerStructure {
  id: string;
  tier: SprinklerTier;
  x: number;
  y: number;
  coveragePattern: Array<{ dx: number; dy: number }>;
}
```
- **Basic Sprinkler**: Waters 4 cardinal adjacent tiles `[(0,-1), (0,1), (-1,0), (1,0)]`.
- **Quality Sprinkler**: Waters 8 surrounding tiles (3×3 grid surrounding sprinkler).
- **Iridium Sprinkler**: Waters 24 surrounding tiles (5×5 grid surrounding sprinkler).
- **Cross Sprinkler**: Waters 4 tiles up to 2 spaces in cardinal directions `[(0,-2), (0,-1), (0,1), (0,2), (-2,0), (-1,0), (1,0), (2,0)]`.
- **Execution**: Daily tick at 06:00 scans all active sprinklers and sets targeted `tile.soil.watered = true`.

#### Automated Scarecrows & Harvester Drones
- **Scarecrow**: Protects an 8-tile radius circle (17×17 area) against Crows/Astral Bats that attempt to destroy harvestable crops.
  - *Deluxe Scarecrow*: Increases crop growth rate by 10% for crops in radius.
  - *Lightning Rod Scarecrow*: Absorbs lightning strikes during Thunderstorms.
- **Harvester Drone**:
  - Flies autonomously over farm tiles.
  - Detects any crop where `stage === 3 (Harvestable)`.
  - Plays harvesting beam animation, collects harvested items, deposits them in connected Shipping Bin or Storage Chest, and re-plants seeds if auto-reseed toggle is enabled.

#### Artisan Processing Stations

```typescript
export type MachineType = 'preserves_jar' | 'brewing_barrel' | 'seed_maker' | 'loom' | 'mill';

export interface ProcessingStation {
  id: string;
  type: MachineType;
  x: number;
  y: number;
  inputItem: { id: string; name: string; quantity: number } | null;
  outputItem: { id: string; name: string; quantity: number; quality: number } | null;
  processingProgress: number; // 0.0 to 1.0
  processingTimeTotal: number; // seconds
  isFinished: boolean;
}
```

- **Preserves Jar**:
  - *Input*: Any Crop / Fruit (1 unit).
  - *Output*: Jelly / Pickle.
  - *Value Formula*: `Output Price = (2 * Base Crop Price) + 50g`.
  - *Processing Duration*: 30 seconds.
- **Brewing Barrel**:
  - *Input*: Fruit (e.g. Dragonfruit, Crystal Berry) or Grain (Wheat).
  - *Output*: Wine (Fruit) or Cider/Beer (Grain).
  - *Value Formula*: `Output Price = 3 * Base Crop Price`.
  - *Processing Duration*: 60 seconds.
- **Seed Maker**:
  - *Input*: 1 Harvested Crop.
  - *Output*: 1 to 3 Seeds of the input crop (99.5% chance) OR 1 Ancient Seed (0.5% mythical chance).
  - *Processing Duration*: 10 seconds.
- **Loom**:
  - *Input*: 1 Silk Thread (from Silk Moths).
  - *Output*: 1 Fine Silk Bolt.
  - *Value Formula*: `Output Price = 450g`.
  - *Processing Duration*: 45 seconds.
- **Mill**:
  - *Input*: 1 Wheat.
  - *Output*: 2 Flour.
  - *Processing Duration*: 15 seconds.

---

### R3. Mythical Livestock & Animal Barns Specifications

#### Livestock Species Registry

| Animal ID | Species Name | Housing | Feed Type | Daily Product | Base Product Value | Petting Effect |
|---|---|---|---|---|---|---|
| `golden_goat` | Golden Goat | Barn | Hay / Magic Feed | Golden Milk | 150g | Glowing particle trail +10 Happiness |
| `astral_bee` | Astral Bee | Apiary / Hive | Nearby Flowers | Astral Honey | 200g | Buzzing chime + Pollinates crops (+10% growth speed within 5 tiles) |
| `silk_moth` | Silk Moth | Cocoon Pen | Mulberry Leaves | Silk Thread | 180g | Flutters wings, drops glowing silk dust |
| `feathered_chocobo` | Feathered Chocobo | Coop | Grains / Seeds | Golden Egg (Rare: Prism Egg) | 250g | Gentle cluck + Can be ridden as farm mount (+50% move speed) |

#### Animal Care & Happiness System
Each animal entity maintains state:

```typescript
export interface AnimalEntity {
  id: string;
  species: 'golden_goat' | 'astral_bee' | 'silk_moth' | 'feathered_chocobo';
  name: string;
  happiness: number; // 0 to 100
  affection: number; // 0 to 1000 (Hearts 0-5)
  isFedToday: boolean;
  isPettedToday: boolean;
  productReady: boolean;
  x: number;
  y: number;
}
```

- **Daily Care Routine**:
  - **Feeding**: Player places Hay/Feed into Barn Trough or lets animals graze outdoors on live grass. If fed, `happiness += 10`. If unfed, `happiness -= 20`.
  - **Petting/Grooming**: Interacting with animal daily increases `affection += 15` and `happiness += 10`.
  - **Quality Calculation**:
    - Product Quality (`Normal`=1.0x, `Silver`=1.25x, `Gold`=1.5x, `Mythic`=2.0x) is calculated on harvest based on `happiness * 0.5 + (affection / 10) * 0.5`.

---

### R4. Dynamic Market Economy & Expansion Specifications

#### Economy Simulation & Price Fluctuations
- **Daily Price Fluctuations**:
  Each day at 06:00, market trends adjust item sell multipliers between `0.70x` and `1.50x`.
- **Market News Bulletin**:
  "Demand for Crystal Berries skyrocketed in the Capital! +40% sale price today!"
- **Over-selling Penalty**:
  Selling >50 units of the same crop on consecutive days decreases that specific crop's market price by 5% per day (minimum floor 0.60x).

#### Shipping Bin & Daily Earnings Summary
- Player drops items into Shipping Bin.
- At 22:00 or when resting in Farmhouse bed, an end-of-day summary overlay presents itemized revenue (Crops, Artisan Goods, Animal Products) and updates player coins.

#### Order Board & Quests
- **Rotating Orders**: 3 active Guild Contracts updated daily on the Town Board.
- **Example Contract**: "Supply 5 Preserves Jams & 10 Wheat. Reward: 1,200g + 150 EXP + Deluxe Fertilizer Blueprint."

#### Land Expansion & Farm Leveling
- **Farm EXP System**:
  - Action EXP: Planting = 2 EXP, Harvesting = 10 EXP, Processing = 15 EXP, Animal Petting = 5 EXP.
  - Level Up Rewards: Max Energy increase, new crafting blueprints, unlocked shop items.
- **Land Plot Unlocks**:
  - `Plot A (Main Field)`: 16×16 tiles (Unlocked by default).
  - `Plot B (Fruit Orchard)`: 16×16 tiles (Cost: 2,000g, Level 3).
  - `Plot C (Astral Meadow)`: 16×16 tiles (Cost: 5,000g, Level 5).
  - `Plot D (Mythic Sanctuary)`: 16×16 tiles (Cost: 12,000g, Level 8).

#### Tool Upgrade Progression

| Tool | Starter Tier | Copper Tier (500g + 5 Copper) | Steel Tier (2,000g + 5 Steel) | Gold Tier (5,000g + 5 Gold) | Titanium / Mythic Tier (15,000g + 5 Mythic Ore) |
|---|---|---|---|---|---|
| **Hoe** | Tills 1 tile | Tills 1×3 line | Tills 1×5 line | Tills 3×3 square | Tills 5×5 square |
| **Watering Can** | Waters 1 tile (10 cap) | Waters 1×3 line (20 cap) | Waters 3×3 square (40 cap) | Waters 3×5 area (80 cap) | Infinite water, waters 5×5 square |
| **Axe** | Clears small twigs | Clears medium stumps | Clears large fallen logs | Clears hardwood trees | Instantly fells any tree in 1 swing |
| **Pickaxe** | Clears small rocks | Clears medium boulders | Clears large granite deposits | Clears Mythic geodes | Instantly shatters any boulder in 1 swing |
| **Scythe** | Clears weeds | Clears weeds in 3×3 | Harvests 3×3 crops | Harvests 5×5 crops | Auto-harvests & replants 5×5 crops |

#### HUD & User Interface
- **Energy Bar**: Max energy 100 (expandable to 200). Actions cost 2-5 energy. At 0 energy, movement speed halved ("Exhausted").
- **Coin Display**: Live counter with increment rolling animation.
- **Season Calendar Widget**: Season icon, Day number (Day 1-28), Time Clock (06:00 to 22:00), Weather Icon.
- **Hotbar**: 10 selectable item/tool slots with key bindings (`1`-`0`, Mouse Wheel).

---

### R5. Single-Player Engine Integration & Audio Specifications

#### Input Controls & Player Navigation
- `WASD` / `Arrow Keys`: Move avatar across 2D isometric/top-down farm.
- `Space` / `Left Click`: Use active tool / Interact with tile/structure/animal.
- `E` / `I`: Toggle Inventory & Crafting UI.
- `Tab` / `1-0`: Hotbar selection.
- `Esc`: Pause Menu & Game Save.

#### Procedural Web Audio Synthesis (AudioService)
Zero audio file dependencies. All sounds synthesised via Web Audio API:

```typescript
export const SFX_PRESETS = {
  HOE_TILL: { wave: 'sawtooth', startFreq: 140, endFreq: 60, duration: 0.08, gain: 0.3 },
  WATER_CROP: { wave: 'sine', startFreq: 350, endFreq: 580, duration: 0.12, gain: 0.25 },
  PLANT_SEED: { wave: 'triangle', startFreq: 700, endFreq: 900, duration: 0.05, gain: 0.2 },
  HARVEST_CHIME: { arpeggio: [523.25, 659.25, 783.99, 1046.5], duration: 0.3, wave: 'triangle' },
  MACHINE_DONE: { wave: 'square', startFreq: 1046.5, endFreq: 1318.5, duration: 0.2, gain: 0.15 },
  ANIMAL_PET: { wave: 'sine', startFreq: 220, endFreq: 330, duration: 0.15, gain: 0.2 },
  COIN_GAIN: { arpeggio: [987.77, 1318.51], duration: 0.1, wave: 'sine' },
};
```

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F1 | R1 Farming | Dynamic Soil Tilling | Hoe tool turns grass/path tile into tilled soil | Hoe action on eligible tile | Soil state `tilled=true` | Fails silently if tile has boulder/structure | R1 Spec |
| F2 | R1 Farming | Crop Planting & Growth | Seeds planted on tilled soil grow through 5 stages | Seed item + tilled tile | `CropEntity` created | Cannot plant on untilled or occupied soil | R1 Spec |
| F3 | R1 Farming | Soil Watering & Moisture | Watering can or rain waters tilled soil; darkens tile | Water action / Rain event | Soil state `watered=true` | Fails if watering can energy/water is empty | R1 Spec |
| F4 | R1 Farming | Soil Fertilization | Applies fertilizer to boost speed, quality, or water retention | Fertilizer item + soil tile | Soil state `fertilized=true` | Cannot apply multiple fertilizers to 1 tile | R1 Spec |
| F5 | R1 Farming | Orchard Tree Planting | Plants multi-stage perennial fruit trees (Ancient Elder-Oak) | Tree Sapling + 1x1/2x2 tile | `OrchardTreeEntity` | Requires un-blocked tile surrounding sapling | R1 Spec |
| F6 | R1 Farming | Multi-Harvest Regrowth | Dragonfruit & Crystal Berry revert to Stage 2 upon harvest | Harvest action | Harvested item yield + crop stage set to 2 | Crop destroyed if non-reharvestable | R1 Spec |
| F7 | R1 Farming | Seasonal Weather Simulation | Daily weather cycle (Sunny, Rainy, Storm, Astral Rain, Blizzard) | Day start tick + PRNG seed | Updated map moisture, weather effects | Crops wither if out of season in winter | R1 Spec |
| F8 | R2 Automation | Magical Radial/Cross Sprinklers | Automatically waters surrounding adjacent tiles at 06:00 | Daily 06:00 tick | Targeted tiles `watered=true` | Does not water locked/untilled tiles | R2 Spec |
| F9 | R2 Automation | Automated Scarecrow Protection | Prevents crows/astral bats from eating harvestable crops | Crop harvest stage check | Protected status inside radius | Unprotected crops have 5% daily pest loss | R2 Spec |
| F10 | R2 Automation | Harvester Drone Collection | Autonomous drone flies, harvests ripe crops, deposits in shipping bin | Autonomous tick / ripe crop presence | Harvested pickup placed in bin | Pauses when shipping bin is full | R2 Spec |
| F11 | R2 Processing | Preserves Jar Processing | Converts Fruit/Veggie into Jelly/Pickle (+2x price + 50g) | 1 Raw Crop input | 1 Artisan Jelly/Pickle after 30s | Rejects non-crop input items | R2 Spec |
| F12 | R2 Processing | Brewing Barrel Processing | Converts Fruit/Grain into Wine/Cider/Beer (3x price) | 1 Fruit/Grain input | 1 Artisan Beverage after 60s | Rejects non-beverage raw inputs | R2 Spec |
| F13 | R2 Processing | Seed Maker Conversion | Converts 1 crop into 1-3 seeds (0.5% Ancient Seed chance) | 1 Crop input | 1-3 Seed items after 10s | Rejects processed/artisan goods | R2 Spec |
| F14 | R2 Processing | Loom & Mill Crafting | Loom turns Silk Thread to Fine Silk; Mill turns Wheat to Flour | Raw animal/crop input | Refined artisan craft material | Rejects invalid material inputs | R2 Spec |
| F15 | R3 Livestock | Golden Goat Husbandry | Feed, pet, and harvest Golden Milk from Golden Goats | Hay/Feed + Daily Petting | `Golden Milk` item + Happiness gain | Animal starves/loses happiness if unfed | R3 Spec |
| F16 | R3 Livestock | Astral Bee Apiary | Hive produces Astral Honey and pollinates adjacent crops | Flowers within 5 tiles | `Astral Honey` + +10% crop growth speed | Zero honey output if no flowers nearby | R3 Spec |
| F17 | R3 Livestock | Silk Moth Cocoon Farm | Cocoon tree yields Silk Thread for Loom processing | Mulberry leaves feed | `Silk Thread` item | Low quality output if happiness < 30 | R3 Spec |
| F18 | R3 Livestock | Feathered Chocobo Riding | Feed chocobo for Golden Eggs or ride as high-speed farm mount | Grain feed / Ride action | Golden Egg product / +50% move speed | Cannot mount inside buildings | R3 Spec |
| F19 | R4 Economy | Dynamic Price Fluctuations | Daily supply/demand multiplier (0.7x - 1.5x) on market goods | Day start tick + PRNG | Updated sell prices in market UI | Over-selling penalty reduces price floor | R4 Spec |
| F20 | R4 Economy | Shipping Bin & Day End Summary | Deposits items overnight for cash payout & summary UI | Items placed in Shipping Bin | Coin balance increment + Summary screen | Items in bin cannot be retrieved after 22:00 | R4 Spec |
| F21 | R4 Economy | Guild Order Delivery Board | Fulfill daily quests for coins, bonus EXP, and blueprints | Required item hand-in | EXP + Coin rewards + Blueprint unlock | Order expires if not fulfilled in 3 days | R4 Spec |
| F22 | R4 Economy | Land Expansion Unlocks | Purchase adjacent plots (Orchard, Astral Meadow, Sanctuary) | Coins + Level requirement | Unlocks tile grid area for farming | Locked if insufficient coins or level | R4 Spec |
| F23 | R4 Economy | Multi-Tier Tool Upgrades | Upgrade Hoe, Water Can, Axe, Pickaxe, Scythe (Copper->Mythic) | Coins + Ore bars at Forge | Upgraded tool with AOE charging | Cannot upgrade tool while upgrade in progress | R4 Spec |
| F24 | R4 Economy | Modern Farming HUD | Renders Stamina, Coins, Hotbar, Calendar Clock, Weather | Game state data | Crisp 32-color pixel overlay | Disables hotbar input when menu open | R4 Spec |
| F25 | R5 Engine | Avatar Customization & Control | 8-way WASD avatar movement, customizable hair/skin/outfit | Player input keyboard/gamepad | Animated pixel sprite rendering | Collision boundary prevents walking off map | R5 Spec |
| F26 | R5 Engine | Procedural Web Audio SFX | Synthesizes hoe, water, harvest, machine, and coin SFX | Event triggers | Real-time Web Audio API sound | Mutes gracefully if browser audio blocked | R5 Spec |

---

## 4. Edge Cases & Boundary Behaviors

| # | Feature | Input / Condition | Observed / Specified Behavior |
|---|---------|-------------------|-------------------------------|
| E1 | Soil Tilling | Attempting to till soil under an existing structure or rock | Action blocked; low error bump SFX played; stamina not consumed. |
| E2 | Crop Planting | Planting a Spring crop on Day 27 of Spring | Crop plants normally, but withers on Day 1 of Summer unless grown or protected. |
| E3 | Multi-Harvest Crops | Harvesting Dragonfruit when inventory is 100% full | Crop remains harvestable at Stage 3; item pickup stays on ground or harvest fails. |
| E4 | Watering Can | Attempting to water crops with 0 water in watering can | Player plays empty water can animation; zero water applied; prompt to refill at well. |
| E5 | Seasonal Transition | Season changes from Autumn to Winter overnight | All non-winter annual crops transition to Stage 4 (Withered). Orchard trees retain trunk. |
| E6 | Thunderstorm Lightning | Lightning strikes a tile containing an Iridium Sprinkler | Sprinkler remains intact; adjacent crop converted to Charcoal pickup; scarecrow absorbs if in range. |
| E7 | Preserves Jar Input | Player inserts non-edible item (e.g. Stone or Wood) into Preserves Jar | Machine rejects item; returns item to hotbar; displays notification "Invalid ingredient!". |
| E8 | Harvester Drone | Shipping bin is 100% full when drone attempts to deposit harvested crops | Drone hovers near Shipping Bin; displays "Bin Full!" icon; resumes deposit once bin emptied. |
| E9 | Animal Starvation | Animal left unfed for 3 consecutive days | Animal happiness drops to 0; animal produces no products; animal does NOT die (kid-friendly design). |
| E10 | Animal Pasture Gate | Leaving pasture gate open overnight during rainy weather | Animals stay outside; happiness drops by 30; product quality next day degrades to Normal. |
| E11 | Market Selling | Player sells 200 pumpkins in one day | Day 1 yields full price; Day 2 pumpkin price depressed by 15% due to market saturation. |
| E12 | Tool Upgrade | Player submits Watering Can for upgrade while crops need water | Watering Can unavailable for 1 day; player must rely on sprinklers or rain during upgrade. |
| E13 | Energy Depletion | Energy hits 0 while tilling soil at 21:00 | Player receives "Exhausted" debuff (movement speed -50%); passing out occurs at 02:00. |
| E14 | Land Expansion | Unlocking Plot B while debris (rocks/stumps) exists on boundary | Boundary fences dissolve; debris becomes interactable and harvestable for wood/stone resources. |

---

## 5. Complete TypeScript Interface Specifications (`types.ts`)

The following TypeScript definitions specify the exact data layer for Mythic Farm implementation:

```typescript
import type { GameModule, GameContext } from '@runtime/types';

export type CropId = 'wheat' | 'pumpkin' | 'crystal_berry' | 'dragonfruit' | 'solar_sunflower';
export type TreeId = 'elder_oak';
export type GrowthStage = 0 | 1 | 2 | 3 | 4; // Seedling, Sprout, Flowering, Harvestable, Withered

export interface CropEntity {
  id: string;
  cropId: CropId;
  stage: GrowthStage;
  daysInStage: number;
  isWateredToday: boolean;
  quality: 1 | 2 | 3 | 4; // Normal, Silver, Gold, Mythic
}

export interface OrchardTreeEntity {
  id: string;
  treeId: TreeId;
  stage: GrowthStage;
  daysToFruit: number;
  hasFruit: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'seed' | 'crop' | 'artisan' | 'animal_product' | 'tool' | 'material';
  quantity: number;
  quality?: 1 | 2 | 3 | 4;
  sellPrice: number;
}

export interface FarmState {
  coins: number;
  energy: number;
  maxEnergy: number;
  day: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  year: number;
  timeMinutes: number; // 360 = 06:00, 1320 = 22:00
  weather: 'sunny' | 'rainy' | 'thunderstorm' | 'astral_rain' | 'blizzard';
  playerLevel: number;
  playerExp: number;
  unlockedPlots: string[];
  tools: Record<string, 'basic' | 'copper' | 'steel' | 'gold' | 'titanium'>;
  inventory: Array<InventoryItem | null>;
  hotbarIndex: number;
}
```
