import type { GameContext } from '@runtime/types';

// ==========================================
// 1. Environment, Seasons & Weather Types
// ==========================================
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'rain' | 'thunder' | 'astral_rain' | 'blizzard' | 'rainy' | 'thunderstorm';
export type FertilizerType = 'speed' | 'quality' | 'bountiful' | 'water_retention';

// ==========================================
// 2. Grid & Soil Types
// ==========================================
export interface TileData {
  x: number;               // Grid tile column (0..15)
  y: number;               // Grid tile row (0..9)
  tilled: boolean;         // Soil tilling status
  watered: boolean;        // Hydrated status (resets daily)
  fertilizer?: FertilizerType; // Applied fertilizer
  crop?: CropEntity;       // Active crop planted on tile
  building?: AutomationBuilding; // Automation machinery on tile
  station?: ProcessingStation;  // Processing workshop station on tile
  unlocked?: boolean;       // Land plot expansion unlock status
  plotId?: number;          // Land plot index (0..3)
}

// ==========================================
// 3. Crop & Species Types
// ==========================================
export type CropStage = 0 | 1 | 2 | 3 | 4; // 0: Seedling, 1: Sprout, 2: Flowering, 3: Harvestable, 4: Withered
export type QualityTier = 1 | 2 | 3 | 4; // 1: Normal, 2: Silver, 3: Gold, 4: Mythic
export type CropCategory = 'grain' | 'vegetable' | 'fruit' | 'flower' | 'tree' | 'mythical';

export interface CropSpecies {
  id: string;              // 'wheat' | 'pumpkin' | 'crystal_berry' | 'dragonfruit' | 'elder_oak' | 'sunflower'
  name: string;
  category: CropCategory;
  stages: [string, string, string, string]; // Stage descriptions
  growthDays: number;      // Days to reach stage 3
  regrows: boolean;        // Regrows after harvest
  regrowDays?: number;     // Days to regrow to harvestable stage
  seedCost: number;        // Purchase price in store
  harvestItemId: string;   // Inventory item produced on harvest
  harvestYieldMin: number; // Minimum item yield per harvest
  harvestYieldMax: number; // Maximum item yield per harvest
  basePrice: number;       // Base selling price per item
  expYield: number;        // Farm EXP awarded on harvest
  seasons: Season[];       // Seasons in which crop thrives
  giantChance?: number;    // Probability for 3x3 giant mutation (e.g. pumpkin)
  specialEffect?: string;  // Aura or passive effect description
}

export interface CropEntity {
  id: string;              // Unique crop instance UUID
  speciesId: string;       // Foreign key to CropSpecies
  stage: CropStage;        // Current growth stage (0..4)
  withered: boolean;       // True if killed by season mismatch
  growthProgress: number;  // Fractional growth percentage (0.0 to 1.0)
  daysPlanted: number;     // Total days since planting
  daysInCurrentStage?: number; // Days spent in current stage
  wateredToday?: boolean;   // Hydration tracking for current day
  fertilizedWith?: FertilizerType;
  quality?: QualityTier;   // Crop yield quality tier
  isGiant?: boolean;       // Giant crop mutation flag
  giantOriginX?: number;   // Origin X for 3x3 giant crop cluster
  giantOriginY?: number;   // Origin Y for 3x3 giant crop cluster
}

// ==========================================
// 4. Automation Buildings
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
// 5. Processing Workshop Stations
// ==========================================
export type ProcessingStationType = 
  | 'preserves_jar'  // Crops -> Jam/Jelly/Pickles
  | 'brewing_barrel' // Fruits/Grains -> Wine/Cider/Mead
  | 'seed_maker'     // Crops -> 1-3 Seeds / Ancient Seed
  | 'loom'           // Silk Thread -> Fine Silk Bolt
  | 'mill';          // Wheat/Sunflower -> Flour/Sun Oil

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
  processingTimeTotal?: number; // Total required seconds
  active: boolean;
}

export interface RecipeConfig {
  stationType: ProcessingStationType;
  inputItemId: string;
  outputItemId: string;
  processingTimeSeconds: number;
  priceFormula: (basePrice: number) => number;
}

// ==========================================
// 6. Mythical Livestock & Animal Barns
// ==========================================
export type AnimalSpecies = 
  | 'golden_goat' 
  | 'astral_bee' 
  | 'silk_moth' 
  | 'feathered_chocobo';

export interface AnimalEntity {
  id: string;
  species: AnimalSpecies;
  name?: string;
  x: number;                 // Sub-tile X position inside pasture
  y: number;                 // Sub-tile Y position inside pasture
  fedToday: boolean;         // Feed state for current day
  groomedToday: boolean;     // Grooming state for current day
  affection: number;         // Affection rating (0 to 1000)
  happiness?: number;        // Happiness rating (0 to 100)
  productReady: boolean;     // Harvestable product ready indicator
  daysOld?: number;          // Age of animal
}

export interface AnimalConfig {
  species: AnimalSpecies;
  name: string;
  housing: 'barn' | 'apiary' | 'cocoon_pen' | 'coop' | 'pasture';
  cost: number;
  feedType: string;
  itemYield: string;
  basePrice: number;
  productTimeDays: number;
  specialAbility?: string;
}

// ==========================================
// 7. Tools & Progression
// ==========================================
export type ToolType = 'hoe' | 'watering_can' | 'axe' | 'scythe';
export type ToolTier = 'basic' | 'copper' | 'gold' | 'titanium';

export interface ToolConfig {
  tier: ToolTier;
  energyCost: number;
  actionRadius: number; // 1x1 = 1, 1x3 line = 2, 3x3 = 3, 5x5 = 5
  workSpeed: number;
  waterCapacity?: number; // Infinity for titanium
  upgradeCostCoins?: number;
  upgradeCostBarType?: string;
  upgradeCostBarCount?: number;
}

// ==========================================
// 8. Economy, Orders & Inventory
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

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: 'seed' | 'crop' | 'artisan' | 'animal_product' | 'tool' | 'material' | 'consumable';
  quality?: QualityTier;
  baseSellPrice: number;
}

export interface HotbarSlot {
  id: string;
  type: 'tool' | 'seed' | 'fertilizer' | 'building' | 'consumable';
  targetId: string;  // ToolType, CropSpecies ID, or Item ID
  label: string;
  count?: number;
}

// ==========================================
// 9. Master Persistent Farm State
// ==========================================
export interface FarmState {
  version?: number;
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
  unlockedPlots: any; // Allow number, number[], string[], etc. to support test scenarios
  inventory: Record<string, number> | any; // Item ID -> Quantity map or array
  marketMultipliers: Record<string, number>; // Item ID -> Daily price multiplier
  grid?: TileData[][];      // 10 rows x 16 columns grid matrix
  stations?: ProcessingStation[];
  animals?: AnimalEntity[];
  activeOrders?: GuildOrder[];
  lastSavedTimestamp?: number;
}
