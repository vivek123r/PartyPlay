# Mythic Farm: Authoritative M1 Specification & Data Parameter Mining Analysis

## 1. Executive Summary & M1 Architecture Integration

**MYTHIC FARM** is a single-player farming simulation and magical orchard game designed for the PartyPlay retro arcade engine. Running at a native virtual resolution of **480 × 270** with 60 FPS deterministic updates, M1 establishes the core data models, static configuration registries, procedural texture generation palettes, Web Audio synthesis parameters, and local storage state persistence.

This document serves as the authoritative specification reference for M1. All implementers building M1 types, configurations, texture generators, audio synthesizers, and state persistence MUST adhere to the exact parameters, default values, formulas, color palettes, and audio frequencies defined herein.

---

## 2. Crop Data Configurations (6 Crops)

### 2.1 Complete Crop Parameters Table

| Crop ID | Name | Category | Seed ID | Seed Cost | Base Sell Price | Growth Days | Regrow Days | Preferred Seasons | EXP Yield | Giant Chance | Reharvestable? | Special Traits & Effects |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `wheat` | Wheat | Grain | `seed_wheat` | 10g | 25g | 2 (120s) | N/A | Spring, Autumn | 12 | 0.00 | No | Processed in Mill into 2× Flour (60g value). Fast starter crop. |
| `pumpkin` | Pumpkin | Vegetable | `seed_pumpkin` | 40g | 120g | 4 (240s) | N/A | Autumn | 35 | 0.05 | No | 5% chance of forming 3×3 Giant Pumpkin (yields 9-12 items + 100 EXP). |
| `crystal_berry` | Crystal Berry | Mythical Fruit | `seed_crystal_berry` | 80g | 280g | 5 (300s) | 2 (120s) | Winter, Spring | 50 | 0.00 | Yes | Regrows every 2 days. Emits cyan light particle aura. Premium jam input. |
| `dragonfruit` | Dragonfruit | Exotic Fruit | `seed_dragonfruit` | 120g | 450g | 6 (360s) | 3 (180s) | Summer | 75 | 0.00 | Yes | Regrows every 3 days. High market volatility (±50%). Premium wine input. |
| `elder_oak` | Ancient Elder-Oak | Orchard Tree | `sapling_elder_oak` | 250g | 150g | 8 (480s) | 3 (180s) | All Seasons | 90 | 0.00 | Yes | Permanent tree. Yields 1-2 Elder Acorns + 1 Mythic Resin every 3 days. |
| `solar_sunflower` | Solar Sunflower | Magic Flower | `seed_solar_sunflower` | 30g | 90g | 3 (180s) | N/A | Summer, Spring | 25 | 0.00 | No | Emits growth aura boosting adjacent crops by +15% speed in 1-tile radius. |

---

### 2.2 Visual Growth Stage Color Palettes & Texture Specs

Each crop undergoes 5 visual stages: **Stage 0 (Seedling)**, **Stage 1 (Sprout)**, **Stage 2 (Flowering)**, **Stage 3 (Harvestable)**, and **Stage 4 (Withered)**.

#### Wheat Palette & Sprite Specs
- **Stage 0 (Seedling)**: Small brown mound (`#795548`) with 2 tiny pale green shoots (`#8bc34a`).
- **Stage 1 (Sprout)**: Cluster of 4 light green stalks (`#7cb342`, `#9ccc65`), 6px tall.
- **Stage 2 (Flowering)**: Taller green stalks (`#689f38`) with yellowing tips (`#dce775`), 10px tall.
- **Stage 3 (Harvestable)**: Golden amber grain heads (`#ffc107`, `#ffb300`, `#ff8f00`), 14px tall.
- **Stage 4 (Withered)**: Dried, droopy dark brown stalks (`#5d4037`, `#4e342e`).

#### Pumpkin Palette & Sprite Specs
- **Stage 0 (Seedling)**: Soil patch with dark green sprout leaf (`#33691e`).
- **Stage 1 (Sprout)**: Spreading vine tendrils (`#558b2f`) with 3 broad leaves (`#388e3c`).
- **Stage 2 (Flowering)**: Dense vine patch with bright yellow flower blossoms (`#fbc02d`).
- **Stage 3 (Harvestable)**: Large round orange pumpkin (`#fb8c00`, `#e65100`) with green stem (`#2e7d32`).
- **Stage 4 (Withered)**: Shriveled grey-brown vine stump (`#424242`, `#3e2723`).

#### Crystal Berry Palette & Sprite Specs
- **Stage 0 (Seedling)**: Pale cyan seed shoot (`#80deea`) emerging from soil.
- **Stage 1 (Sprout)**: Crystalline blue stem (`#4fc3f7`) with glowing leaf buds.
- **Stage 2 (Flowering)**: Glowing magenta blossom (`#ab47bc`, `#ce93d8`) atop blue stalk.
- **Stage 3 (Harvestable)**: Shimmering violet-cyan berry cluster (`#00e5ff`, `#7e57c2`, `#ffffff`), emitting light sparkles.
- **Stage 4 (Withered)**: Frozen grey cracked stalk (`#78909c`, `#37474f`).

#### Dragonfruit Palette & Sprite Specs
- **Stage 0 (Seedling)**: Spiky red-tipped green shoot (`#e91e63`, `#4caf50`).
- **Stage 1 (Sprout)**: Cactus-like jointed stem (`#388e3c`) with pink spines (`#f48fb1`).
- **Stage 2 (Flowering)**: Large night-blooming white flower (`#ffffff`, `#fff59d`).
- **Stage 3 (Harvestable)**: Vibrant magenta fruit (`#d81b60`, `#c2185b`) with yellow scale tips (`#ffee58`).
- **Stage 4 (Withered)**: Burnt brown succulent stump (`#4e342e`, `#212121`).

#### Ancient Elder-Oak Palette & Sprite Specs
- **Stage 0 (Sapling)**: Thin brown sapling trunk (`#6d4c41`) with 4 green leaves (`#2e7d32`).
- **Stage 1 (Young Tree)**: Medium trunk with small round green canopy (`#1b5e20`).
- **Stage 2 (Mature Canopy)**: Tall thick oak trunk with dense 2×2 foliage canopy (`#2e7d32`, `#1b5e20`).
- **Stage 3 (Harvestable Tree)**: Full canopy dotted with golden acorns (`#ffb300`) and amber resin drops (`#ff6f00`).
- **Stage 4 (Withered)**: Bare, mossy dark trunk with empty branches (`#3e2723`, `#263238`).

#### Solar Sunflower Palette & Sprite Specs
- **Stage 0 (Seedling)**: Bright green twin-leaf seedling (`#7cb342`).
- **Stage 1 (Sprout)**: Straight green stem (`#558b2f`) with leaves (`#689f38`).
- **Stage 2 (Flowering)**: Large green flower bud (`#33691e`) pointing upward.
- **Stage 3 (Harvestable)**: Radiant golden sunflower head (`#ffeb3b`, `#f57f17`) with brown seed center (`#4e342e`).
- **Stage 4 (Withered)**: Dried, bent brown stalk with fallen petals (`#6d4c41`, `#3e2723`).

---

## 3. Workshop Processing Recipes (5 Stations)

### 3.1 Workshop Recipe Matrix Table

| Station | Type ID | Input Item | Output Item | Base Output Price | Processing Time (sec / ticks) | Price Formula / Rule | Station Visual Palette |
|---|---|---|---|---|---|---|---|
| **Preserves Jar** | `preserves_jar` | Any Crop / Fruit (1×) | Jelly / Pickles | `(2 × CropPrice) + 50g` | 30s (1,800 ticks) | `Output = 2 × BasePrice + 50g` | Glass `#90caf9`, Brass lid `#d4e157`, Liquid `#e0f7fa` |
| **Brewing Barrel** | `brewing_barrel` | Any Fruit / Grain (1×) | Wine / Cider / Mead | `3 × CropPrice` | 60s (3,600 ticks) | `Output = 3 × BasePrice` | Oak wood `#6d4c41`, Iron hoops `#37474f`, Spigot `#4e342e` |
| **Seed Maker** | `seed_maker` | Any Crop (1×) | 1-3× Seeds (99.5%) or 1× Ancient Seed (0.5%) | Market Seed Value | 10s (600 ticks) | Returns 1-3 seeds of input crop; 0.5% chance Ancient Seed (500g) | Metal hopper `#78909c`, Frame `#455a64`, LED `#66bb6a` |
| **Loom** | `loom` | Silk Thread (1×) | Fine Silk Bolt (1×) | 450g | 45s (2,700 ticks) | Fixed price 450g (Input thread = 180g) | Wood frame `#8d6e63`, Shuttle `#d7ccc8`, Threads `#e1bee7` |
| **Mill** | `mill` | Wheat (1×) or Solar Sunflower (1×) | 2× Flour / 2× Sun Oil | 60g / 140g total | 15s (900 ticks) | Wheat → 2× Flour (30g each = 60g); Sunflower → 2× Sun Oil (70g each = 140g) | Stone `#9e9e9e`, Blades `#5d4037`, Flour chute `#fff9c4` |

---

### 3.2 Specific Recipe Calculations

1. **Preserves Jar Outputs**:
   - Wheat → Pickled Wheat: `(2 × 25g) + 50g = 100g`
   - Pumpkin → Pumpkin Jam: `(2 × 120g) + 50g = 290g`
   - Crystal Berry → Crystal Jelly: `(2 × 280g) + 50g = 610g`
   - Dragonfruit → Dragonfruit Jam: `(2 × 450g) + 50g = 950g`
   - Solar Sunflower → Sunflower Honey: `(2 × 90g) + 50g = 230g`

2. **Brewing Barrel Outputs**:
   - Wheat → Craft Beer: `3 × 25g = 75g`
   - Pumpkin → Spiced Pumpkin Cider: `3 × 120g = 360g`
   - Crystal Berry → Crystal Berry Wine: `3 × 280g = 840g`
   - Dragonfruit → Dragonfruit Wine: `3 × 450g = 1,350g`
   - Solar Sunflower → Solar Mead: `3 × 90g = 270g`

3. **Mill Outputs**:
   - 1× Wheat → 2× Flour (Value: 30g per unit, total 60g).
   - 1× Solar Sunflower → 2× Sun Oil (Value: 70g per unit, total 140g).

---

## 4. Mythical Livestock & Animal Product Rules (4 Livestock)

### 4.1 Livestock Specifications & Care Matrix

| Animal ID | Name | Housing | Purchase Cost | Feed Type | Petting / Grooming Effect | Daily Product Item | Base Product Price | Special Passive Abilities |
|---|---|---|---|---|---|---|---|---|
| `golden_goat` | Golden Goat | Barn | 1,500g | Hay / Pasture Grass | +15 Affection, +10 Happiness, sparkles | `golden_milk` | 150g | Glowing trail; high affection boosts milk yield to 2×. |
| `astral_bee` | Astral Bee | Apiary | 2,000g | Nearby Flowers (within 5 tiles) | +15 Affection, +10 Happiness, chime | `astral_honey` | 200g | Pollinates crops (+10% growth speed within 5 tiles). |
| `silk_moth` | Silk Moth | Cocoon Pen | Mulberry Leaves / Fiber | +15 Affection, +10 Happiness, silk dust | `silk_thread` | 180g | Drops silk dust; thread processed in Loom into Fine Silk Bolt. |
| `feathered_chocobo` | Feathered Chocobo | Coop / Pasture | 3,000g | Grains / Seeds | +15 Affection, +10 Happiness, cluck | `golden_egg` (95%) / `prism_egg` (5%) | 250g / 750g | Can be ridden as a mount for +50% movement speed boost. |

---

### 4.2 Quality Tiers & Price Multipliers

Product quality is calculated upon daily harvest based on affection and happiness:
$$\text{Quality Score} = (\text{Happiness} \times 0.5) + \left(\frac{\text{Affection}}{10} \times 0.5\right)$$

| Quality Tier | Score Requirement | Price Multiplier | Example: Golden Milk | Example: Astral Honey | Example: Golden Egg | Example: Prism Egg |
|---|---|---|---|---|---|---|
| **Normal** | Score < 40 | 1.0× | 150g | 200g | 250g | 750g |
| **Silver** | 40 ≤ Score < 65 | 1.25× | 187g | 250g | 312g | 937g |
| **Gold** | 65 ≤ Score < 85 | 1.50× | 225g | 300g | 375g | 1,125g |
| **Mythic** | Score ≥ 85 | 2.00× | 300g | 400g | 500g | 1,500g |

---

### 4.3 Livestock Color Palettes & Sprite Specs

- **Golden Goat**: Body `#ffb300` (Golden fur), Horns `#fff8e1` (Ivory), Eyes `#4e342e`, Udder/Bell `#ffd54f`.
- **Astral Bee**: Body `#7e57c2` (Violet aura), Stripes `#ffd54f` (Starlight yellow), Wings `#e0f7fa` (Translucent cyan).
- **Silk Moth**: Body `#f5f5f5` (Pearl silk), Wings `#f8bbd0` (Iridescent pink), Antennae `#8e24aa` (Deep purple).
- **Feathered Chocobo**: Feathers `#ffeb3b` (Bright yellow), Beak `#ff9800` (Orange), Crest `#4caf50` (Emerald green).

---

## 5. Tool Tier Stats & Progression (4 Tiers)

### 5.1 Tool Tier Specifications Matrix

| Tool | Tier | Range / AOE | Stamina Cost | Capacity / Durability | Upgrade Cost (Coins + Ores) | Visual Palette & Color | Special Mechanics |
|---|---|---|---|---|---|---|---|
| **Hoe** | Basic | 1×1 tile | 5 | Unlimited | 0g (Starter) | Wood `#8d6e63`, Dark Iron `#546e7a` | Tills single grass tile into soil. |
| **Hoe** | Copper | 1×3 line | 4 | Unlimited | 500g + 5 Copper Bars | Copper `#d84315` | Hold action to charge 1×3 line till. |
| **Hoe** | Gold | 3×3 square | 3 | Unlimited | 5,000g + 5 Gold Bars | Metallic Gold `#ffc107` | Hold action to charge 3×3 square till. |
| **Hoe** | Titanium | 5×5 square | 1 | Unlimited | 15,000g + 5 Titanium Bars | Dark Titanium `#78909c` + Cyan `#00e5ff` | Instant 5×5 square till. |
| **Watering Can** | Basic | 1×1 tile | 4 | 10 Uses | 0g (Starter) | Tin `#b0bec5` | Refill at well/water tile. |
| **Watering Can** | Copper | 1×3 line | 3 | 25 Uses | 500g + 5 Copper Bars | Copper `#d84315` | Holds 25 water charges. |
| **Watering Can** | Gold | 3×3 square | 2 | 60 Uses | 5,000g + 5 Gold Bars | Metallic Gold `#ffc107` | Holds 60 water charges. |
| **Watering Can** | Titanium | 5×5 square | 0 | Infinite | 15,000g + 5 Titanium Bars | Titanium `#78909c` + Cyan `#00bcd4` | Infinite water capacity; never needs refill. |
| **Axe** | Basic | 1×1 tile | 6 | Unlimited | 0g (Starter) | Wood `#6d4c41`, Steel `#78909c` | Clears twigs & small stumps (4 hits/stump). |
| **Axe** | Copper | 1×1 tile | 5 | Unlimited | 500g + 5 Copper Bars | Copper `#d84315` | 2× damage (2 hits/stump). |
| **Axe** | Gold | 1×3 line | 3 | Unlimited | 5,000g + 5 Gold Bars | Metallic Gold `#ffc107` | Instant clear small stumps; 1 hit per tree. |
| **Axe** | Titanium | 3×3 area | 1 | Unlimited | 15,000g + 5 Titanium Bars | Titanium `#78909c` + Glow `#00e5ff` | Instantly fells any tree/log in 3×3 area in 1 swing. |
| **Scythe** | Basic | 1×1 tile | 3 | Unlimited | 0g (Starter) | Wood `#5d4037`, Iron `#9e9e9e` | Clears 1 weed tile or harvests 1 crop. |
| **Scythe** | Copper | 1×3 line | 2 | Unlimited | 500g + 5 Copper Bars | Copper `#d84315` | Harvests 3 crops at once in a line. |
| **Scythe** | Gold | 3×3 square | 1 | Unlimited | 5,000g + 5 Gold Bars | Metallic Gold `#ffc107` | Harvests 9 crops at once in 3×3 area. |
| **Scythe** | Titanium | 5×5 square | 0 | Unlimited | 15,000g + 5 Titanium Bars | Titanium `#78909c` + Violet `#d500f9` | Auto-harvests and auto-replants seeds in 5×5 area. |

---

## 6. Procedural Web Audio Synthesizer Specifications

All audio in Mythic Farm is synthesized procedurally via `AudioService.playTone()`. Zero external sound files are used.

### 6.1 Audio Frequency & Synthesizer Presets Table

| Preset Key | Trigger Event | Waveform | Start Freq (Hz) | End Freq (Hz) | Duration (sec) | Gain / Vol | Arpeggio Frequencies (Hz) |
|---|---|---|---|---|---|---|---|
| `HOE_TILL` | Tilling soil with Hoe | `sawtooth` | 140 | 60 | 0.08 | 0.30 | N/A |
| `WATER_SPRAY` | Watering tile with Can | `sine` | 350 | 580 | 0.12 | 0.25 | N/A |
| `SEED_PLANT` | Planting seed packet | `triangle` | 700 | 900 | 0.05 | 0.20 | N/A |
| `CROP_HARVEST` | Harvesting mature crop | `triangle` | N/A | N/A | 0.25 | 0.30 | `[523.25, 659.25, 783.99, 1046.5]` (C5-E5-G5-C6) |
| `FERTILIZER_APPLY` | Applying fertilizer | `sine` | 440 | 880 | 0.10 | 0.20 | N/A |
| `MACHINE_START` | Placing ingredient in machine | `square` | 180 | 320 | 0.15 | 0.20 | N/A |
| `MACHINE_HUM` | Machine processing tick | `sawtooth` | 120 | 120 | 0.30 | 0.08 | N/A |
| `MACHINE_DONE` | Processing complete | `square` | N/A | N/A | 0.20 | 0.25 | `[1046.5, 1318.5]` (C6-E6) |
| `ANIMAL_PET` | Petting / grooming animal | `sine` | 220 | 330 | 0.15 | 0.25 | N/A |
| `ANIMAL_FEED` | Feeding animal in trough | `square` | 150 | 100 | 0.10 | 0.20 | N/A |
| `PRODUCT_HARVEST` | Collecting animal product | `sine` | N/A | N/A | 0.20 | 0.30 | `[440.0, 554.37, 659.25]` (A4-C#5-E5) |
| `COIN_GAIN` | Selling items / coin payout | `sine` | N/A | N/A | 0.12 | 0.30 | `[987.77, 1318.51]` (B5-E6) |
| `LEVEL_UP` | Farm level up notification | `triangle` | N/A | N/A | 0.45 | 0.35 | `[523.25, 659.25, 783.99, 1046.5, 1318.5]` |
| `UI_CLICK` | UI menu button press | `sine` | 800 | 1200 | 0.03 | 0.15 | N/A |
| `ERROR_BUMP` | Invalid action / blocked tile | `sawtooth` | 150 | 80 | 0.12 | 0.30 | N/A |

---

## 7. Texture Color Palettes & Graphics Specs

All graphics are rendered procedurally onto PixiJS display objects at 480 × 270 resolution.

### 7.1 Palette Specification Registry

```typescript
export const PALETTE = {
  // Terrain & Environment
  GRASS_BASE: 0x4a7c59,
  GRASS_HIGHLIGHT: 0x5b8e6a,
  SOIL_DRY: 0x8b5a2b,
  SOIL_WATERED: 0x5c3a1e,
  FERTILIZER_SPEED: 0x795548,
  FERTILIZER_QUALITY: 0x512da8,
  PATH_GRAVEL: 0x9e9e9e,
  WATER_BLUE: 0x29b6f6,
  ROCK_GREY: 0x616161,

  // Tool Tiers
  TOOL_BASIC: 0x8d6e63,
  TOOL_COPPER: 0xd84315,
  TOOL_GOLD: 0xffc107,
  TOOL_TITANIUM: 0x78909c,
  TOOL_TITANIUM_GLOW: 0x00e5ff,

  // HUD & UI
  STAMINA_HIGH: 0x66bb6a,
  STAMINA_MED: 0xffa726,
  STAMINA_LOW: 0xef5350,
  COIN_GOLD: 0xffc107,
  HOTBAR_BG: 0x212121,
  HOTBAR_ACTIVE_BORDER: 0xffd54f,
  HUD_TEXT: 0xffffff,

  // Workshop Machines
  JAR_GLASS: 0x90caf9,
  JAR_LID: 0xd4e157,
  BARREL_WOOD: 0x6d4c41,
  BARREL_HOOP: 0x37474f,
  SEEDER_HOPPER: 0x78909c,
  LOOM_FRAME: 0x8d6e63,
  MILL_STONE: 0x9e9e9e
};
```

---

## 8. Complete Interface Specifications & Default State

### 8.1 `types.ts` Definition Contract

```typescript
import type { GameModule, GameContext } from '@runtime/types';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'rainy' | 'thunderstorm' | 'astral_rain' | 'blizzard';
export type GrowthStage = 0 | 1 | 2 | 3 | 4; // 0: Seedling, 1: Sprout, 2: Flowering, 3: Harvestable, 4: Withered
export type ToolType = 'hoe' | 'watering_can' | 'axe' | 'scythe';
export type ToolTier = 'basic' | 'copper' | 'gold' | 'titanium';
export type MachineType = 'preserves_jar' | 'brewing_barrel' | 'seed_maker' | 'loom' | 'mill';
export type AnimalSpecies = 'golden_goat' | 'astral_bee' | 'silk_moth' | 'feathered_chocobo';
export type QualityTier = 1 | 2 | 3 | 4; // 1: Normal, 2: Silver, 3: Gold, 4: Mythic

export interface TileData {
  x: number;
  y: number;
  tilled: boolean;
  watered: boolean;
  fertilizer?: 'speed' | 'quality' | 'water_retention';
  crop?: CropEntity;
  building?: ProcessingStation;
  unlocked: boolean;
}

export interface CropEntity {
  id: string;
  speciesId: string;
  stage: GrowthStage;
  daysPlanted: number;
  daysInCurrentStage: number;
  isWateredToday: boolean;
  quality: QualityTier;
  withered: boolean;
}

export interface CropConfig {
  id: string;
  name: string;
  category: 'grain' | 'vegetable' | 'fruit' | 'flower' | 'tree';
  seedId: string;
  seedCost: number;
  baseSellPrice: number;
  growthDays: number;
  regrowDays: number;
  preferredSeasons: Season[];
  expYield: number;
  giantChance: number;
  reharvestable: boolean;
  specialEffect?: string;
  stageColors: string[];
}

export interface ProcessingStation {
  id: string;
  type: MachineType;
  tileX: number;
  tileY: number;
  inputItem?: string;
  outputItem?: string;
  timerRemaining: number;
  processingTimeTotal: number;
  active: boolean;
}

export interface RecipeConfig {
  stationType: MachineType;
  inputItemId: string;
  outputItemId: string;
  processingTimeSeconds: number;
  priceFormula: (basePrice: number) => number;
}

export interface AnimalEntity {
  id: string;
  species: AnimalSpecies;
  name: string;
  x: number;
  y: number;
  fedToday: boolean;
  groomedToday: boolean;
  affection: number; // 0 to 1000
  happiness: number; // 0 to 100
  productReady: boolean;
}

export interface AnimalConfig {
  species: AnimalSpecies;
  name: string;
  housing: 'barn' | 'apiary' | 'cocoon_pen' | 'coop';
  purchaseCost: number;
  feedType: string;
  dailyProductId: string;
  baseProductPrice: number;
  specialAbility: string;
}

export interface ToolTierStats {
  tier: ToolTier;
  staminaCost: number;
  rangePattern: string;
  waterCapacity?: number;
  upgradeCostCoins: number;
  upgradeCostBarType: string;
  upgradeCostBarCount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: 'seed' | 'crop' | 'artisan' | 'animal_product' | 'tool' | 'material';
  quality?: QualityTier;
  baseSellPrice: number;
}

export interface FarmState {
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
  unlockedPlots: string[];
  inventory: Array<InventoryItem | null>;
  marketMultipliers: Record<string, number>;
}
```

---

### 8.2 Default Farm State Constant (`DEFAULT_FARM_STATE`)

```typescript
export const DEFAULT_FARM_STATE: FarmState = {
  coins: 500,
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
  unlockedPlots: ['plot_a_main'],
  inventory: [
    { id: 'tool_hoe_basic', name: 'Basic Hoe', quantity: 1, category: 'tool', baseSellPrice: 0 },
    { id: 'tool_watering_can_basic', name: 'Basic Water Can', quantity: 1, category: 'tool', baseSellPrice: 0 },
    { id: 'tool_axe_basic', name: 'Basic Axe', quantity: 1, category: 'tool', baseSellPrice: 0 },
    { id: 'tool_scythe_basic', name: 'Basic Scythe', quantity: 1, category: 'tool', baseSellPrice: 0 },
    { id: 'seed_wheat', name: 'Wheat Seeds', quantity: 10, category: 'seed', baseSellPrice: 5 },
    null, null, null, null, null
  ],
  marketMultipliers: {
    wheat: 1.0,
    pumpkin: 1.0,
    crystal_berry: 1.0,
    dragonfruit: 1.0,
    elder_oak: 1.0,
    solar_sunflower: 1.0,
  }
};
```

---

## 9. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F1 | Crop Data | 6 Multi-Stage Crops | Wheat, Pumpkin, Crystal Berry, Dragonfruit, Elder-Oak, Sunflower | Crop config parameters | Seedling → Harvestable stages | Cannot plant out-of-season seeds without greenhouse | M1 Spec Scope |
| F2 | Crop Growth | Re-harvestable Regrowth | Crystal Berry & Dragonfruit regrow after initial harvest | Harvest action at Stage 3 | Harvest yield + crop stage reverts to Stage 2 | Non-reharvestable crops get destroyed on harvest | M1 Spec Scope |
| F3 | Crop Mutation | Giant Pumpkin Mutation | 5% chance for 3×3 pumpkin plot to merge into Giant Pumpkin | 3×3 adjacent harvestable pumpkins | 1 Giant Pumpkin entity (9-12 yield + 100 EXP) | Blocked if tiles watered unevenly | M1 Spec Scope |
| F4 | Workshop | Preserves Jar Station | Converts raw crops/fruits into Jams/Pickles | 1× Crop input | 1× Preserves (2× price + 50g) after 30s | Rejects non-crop items | M1 Spec Scope |
| F5 | Workshop | Brewing Barrel Station | Converts fruits/grains into Wine/Cider/Mead | 1× Fruit/Grain input | 1× Beverage (3× price) after 60s | Rejects non-fruit/grain inputs | M1 Spec Scope |
| F6 | Workshop | Seed Maker Station | Converts crop into 1-3 seed packets or 0.5% Ancient Seed | 1× Harvested crop input | 1-3× Seeds or 1× Ancient Seed after 10s | Rejects non-crop processed goods | M1 Spec Scope |
| F7 | Workshop | Loom Crafting | Weaves Silk Thread into Fine Silk Bolt | 1× Silk Thread input | 1× Fine Silk Bolt (450g) after 45s | Rejects non-silk inputs | M1 Spec Scope |
| F8 | Workshop | Mill Station | Grinds Wheat into 2× Flour or Sunflower into 2× Sun Oil | 1× Wheat or Sunflower input | 2× Flour (60g) / 2× Sun Oil (140g) after 15s | Rejects non-millable crops | M1 Spec Scope |
| F9 | Livestock | Golden Goat Husbandry | Daily feeding & grooming produces Golden Milk | Hay/Grass feed + daily petting | Golden Milk (150g-300g depending on quality) | Unfed goat produces 0 milk & loses happiness | M1 Spec Scope |
| F10 | Livestock | Astral Bee Apiary | Hive produces Astral Honey & boosts crop growth speed | Flowers within 5 tiles | Astral Honey (200g-400g) + +10% crop growth aura | Zero honey output if no flowers nearby | M1 Spec Scope |
| F11 | Livestock | Silk Moth Cocoon Pen | Cocoon pen yields Silk Thread | Mulberry leaves feed + grooming | Silk Thread (180g-360g) | Low quality output if happiness < 30 | M1 Spec Scope |
| F12 | Livestock | Feathered Chocobo Mount | Coop animal yields Golden/Prism Eggs and acts as farm mount | Grain feed + grooming / Mount action | Golden Egg (250g) / Prism Egg (750g) + +50% move speed | Cannot mount inside buildings | M1 Spec Scope |
| F13 | Tools | 4-Tier Tool Progression | Hoe, Watering Can, Axe, Scythe upgrade from Basic to Titanium | Coins + Bar ores at Forge | Upgraded AOE range, lower stamina, higher capacity | Blocked if insufficient coins or ore bars | M1 Spec Scope |
| F14 | Audio | Web Audio Procedural Synth | Synthesizes all tool, farming, machine, animal, and UI sound effects | Event triggers & synth presets | Real-time audio oscillator playback | Mutes cleanly if Web Audio context suspended | M1 Spec Scope |
| F15 | Textures | Procedural Pixel Palette Cache | Generates pixel graphics procedurally from 32-color hex palette | TextureGenerator draw routines | Cached PixiJS Textures for 480×270 resolution | Returns solid color fallback tile on error | M1 Spec Scope |
| F16 | Storage | Namespaced Save Persistence | Saves farm state, inventory, coins, level, and tool tiers to LocalStorage | Save triggers (day end / pause) | Serialized JSON under `games:mythic-farm` | Falls back to `DEFAULT_FARM_STATE` on corrupt save | M1 Spec Scope |

---

## 10. Edge Cases & Boundary Behaviors

| # | Feature | Input / Condition | Observed / Specified Behavior |
|---|---------|-------------------|-------------------------------|
| E1 | Crop Growth | Planting seeds on Day 27 of a non-preferred season | Crop plants normally, but withers to Stage 4 on Day 1 of next season unless reharvestable/winter-tolerant. |
| E2 | Machine Input | Player inserts invalid item into Preserves Jar | Machine rejects item; plays `ERROR_BUMP` SFX (sawtooth 150Hz→80Hz); returns item to inventory. |
| E3 | Seed Maker | Seed Maker finishes processing with 0.5% Ancient Seed roll | Plays `LEVEL_UP` chime; drops glowing golden seed packet into output slot. |
| E4 | Animal Product | Harvesting animal product when player inventory is completely full | Product stays on pasture ground as an `ItemPickup` entity with float animation. |
| E5 | Watering Can | Upgrading Watering Can to Titanium Tier | Max water capacity set to `Infinity`; water refill meter replaced with infinity icon `∞`. |
| E6 | Tool Stamina | Player uses tool when energy is at 1 point | Action succeeds, energy hits 0, player receives "Exhausted" status (-50% move speed). |
| E7 | Chocobo Riding | Dismounting Chocobo while standing on a crop tile | Dismount places player on nearest adjacent un-cropped tile to prevent stomping crops. |
| E8 | Storage Persistence | Loading a save file with missing/corrupted inventory slots | `StorageManager` validates schema, replaces invalid slots with `null`, logs warning, and proceeds. |
| E9 | Market Economy | Selling 100+ Dragonfruits on a single day | Next day dragonfruit market price multiplier drops by -10% (floor at 0.50×). |
| E10 | Giant Pumpkin | 3×3 Pumpkin plot has 8 harvestable pumpkins and 1 unwatered sprout | Giant Pumpkin roll fails; crops remain individual 1×1 pumpkins. |
