import type {
  CropSpecies,
  ToolTier,
  ToolConfig,
  Season,
  AnimalSpecies,
  AnimalConfig,
  FarmState,
  TileData,
  ToolType,
  TileType,
  TileTypeProperties,
  LandPlotConfig,
  AutotileMapping,
} from './types';

// ==========================================
// 1. Canvas & Resolution Architecture
// ==========================================
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 270;

// ==========================================
// 2. Grid & Land Specifications
// ==========================================
export const GRID_WIDTH = 16;
export const GRID_HEIGHT = 10;
export const TILE_SIZE = 24; // 16 * 24 = 384px grid width, leaving 96px for HUD sidebar
export const GRID_OFFSET_X = 8;
export const GRID_OFFSET_Y = 16;

// ==========================================
// 3. Time & Calendar Engine
// ==========================================
export const DAYS_PER_SEASON = 7;
export const DAY_DURATION_SECONDS = 60; // 1 in-game day = 60 real seconds
export const SEASONS_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// ==========================================
// 4. Player Energy & Progression Metrics
// ==========================================
export const BASE_MAX_ENERGY = 100;
export const ENERGY_RECOVER_SLEEP = 100;

// ==========================================
// 5. Crop Species Catalog (6 Crops)
// ==========================================
export const CROP_SPECIES: Record<string, CropSpecies> = {
  wheat: {
    id: 'wheat',
    name: 'Golden Wheat',
    category: 'grain',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 2,
    regrows: false,
    seedCost: 10,
    harvestItemId: 'crop_wheat',
    harvestYieldMin: 1,
    harvestYieldMax: 2,
    basePrice: 25,
    expYield: 12,
    seasons: ['spring', 'autumn'],
    giantChance: 0.0,
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Mythic Pumpkin',
    category: 'vegetable',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 4,
    regrows: false,
    seedCost: 40,
    harvestItemId: 'crop_pumpkin',
    harvestYieldMin: 1,
    harvestYieldMax: 1,
    basePrice: 120,
    expYield: 35,
    seasons: ['autumn'],
    giantChance: 0.05,
  },
  crystal_berry: {
    id: 'crystal_berry',
    name: 'Crystal Berry',
    category: 'mythical',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 5,
    regrows: true,
    regrowDays: 2,
    seedCost: 80,
    harvestItemId: 'crop_crystal_berry',
    harvestYieldMin: 2,
    harvestYieldMax: 4,
    basePrice: 280,
    expYield: 50,
    seasons: ['winter', 'spring'],
    giantChance: 0.0,
  },
  dragonfruit: {
    id: 'dragonfruit',
    name: 'Solar Dragonfruit',
    category: 'fruit',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 6,
    regrows: true,
    regrowDays: 3,
    seedCost: 120,
    harvestItemId: 'crop_dragonfruit',
    harvestYieldMin: 1,
    harvestYieldMax: 3,
    basePrice: 450,
    expYield: 75,
    seasons: ['summer'],
    giantChance: 0.0,
  },
  elder_oak: {
    id: 'elder_oak',
    name: 'Ancient Elder-Oak',
    category: 'tree',
    stages: ['Sapling', 'Young Tree', 'Mature Tree', 'Harvestable Tree'],
    growthDays: 8,
    regrows: true,
    regrowDays: 3,
    seedCost: 250,
    harvestItemId: 'crop_elder_oak_fruit',
    harvestYieldMin: 1,
    harvestYieldMax: 3,
    basePrice: 150,
    expYield: 90,
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    giantChance: 0.0,
  },
  sunflower: {
    id: 'sunflower',
    name: 'Solar Sunflower',
    category: 'flower',
    stages: ['Seedling', 'Sprout', 'Flowering', 'Harvestable'],
    growthDays: 3,
    regrows: false,
    seedCost: 30,
    harvestItemId: 'crop_sunflower',
    harvestYieldMin: 1,
    harvestYieldMax: 3,
    basePrice: 90,
    expYield: 25,
    seasons: ['summer', 'spring'],
    giantChance: 0.0,
    specialEffect: 'Boosts adjacent crop growth speed by +15%',
  },
};

// ==========================================
// 6. Tool Tier Attributes Configuration
// ==========================================
export const TOOL_TIER_CONFIG: Record<ToolTier, ToolConfig> = {
  basic: {
    tier: 'basic',
    energyCost: 5,
    actionRadius: 1,
    workSpeed: 1.0,
    waterCapacity: 10,
    upgradeCostCoins: 0,
  },
  copper: {
    tier: 'copper',
    energyCost: 4,
    actionRadius: 2,
    workSpeed: 1.25,
    waterCapacity: 25,
    upgradeCostCoins: 500,
    upgradeCostBarType: 'copper_bar',
    upgradeCostBarCount: 5,
  },
  gold: {
    tier: 'gold',
    energyCost: 3,
    actionRadius: 3,
    workSpeed: 1.5,
    waterCapacity: 60,
    upgradeCostCoins: 5000,
    upgradeCostBarType: 'gold_bar',
    upgradeCostBarCount: 5,
  },
  titanium: {
    tier: 'titanium',
    energyCost: 1,
    actionRadius: 5,
    workSpeed: 2.0,
    waterCapacity: Infinity,
    upgradeCostCoins: 15000,
    upgradeCostBarType: 'titanium_bar',
    upgradeCostBarCount: 5,
  },
};

// ==========================================
// 7. Base Market Price Catalog
// ==========================================
export const ITEM_BASE_PRICES: Record<string, number> = {
  // Raw Crops
  crop_wheat: 25,
  crop_pumpkin: 120,
  crop_crystal_berry: 280,
  crop_dragonfruit: 450,
  crop_elder_oak_fruit: 150,
  crop_sunflower: 90,

  // Artisan Goods
  artisan_jam: 290,
  artisan_wine: 1350,
  artisan_flour: 30,
  artisan_sun_oil: 70,
  artisan_cloth: 450,

  // Animal Products
  product_golden_milk: 150,
  product_astral_honey: 200,
  product_silk_thread: 180,
  product_golden_egg: 250,
  product_prism_egg: 750,
};

// ==========================================
// 8. Mythical Livestock Specs
// ==========================================
export const ANIMAL_CONFIG: Record<AnimalSpecies, AnimalConfig> = {
  golden_goat: {
    species: 'golden_goat',
    name: 'Golden Goat',
    housing: 'barn',
    cost: 1500,
    feedType: 'hay',
    itemYield: 'product_golden_milk',
    basePrice: 150,
    productTimeDays: 1,
    specialAbility: 'Produces Golden Milk; high affection doubles yield.',
  },
  astral_bee: {
    species: 'astral_bee',
    name: 'Astral Bee',
    housing: 'apiary',
    cost: 2000,
    feedType: 'flowers',
    itemYield: 'product_astral_honey',
    basePrice: 200,
    productTimeDays: 2,
    specialAbility: 'Pollinates crops (+10% growth speed within 5 tiles).',
  },
  silk_moth: {
    species: 'silk_moth',
    name: 'Silk Moth',
    housing: 'cocoon_pen',
    cost: 1800,
    feedType: 'mulberry_leaves',
    itemYield: 'product_silk_thread',
    basePrice: 180,
    productTimeDays: 1,
    specialAbility: 'Yields Silk Thread for Loom crafting.',
  },
  feathered_chocobo: {
    species: 'feathered_chocobo',
    name: 'Feathered Chocobo',
    housing: 'coop',
    cost: 3000,
    feedType: 'grains',
    itemYield: 'product_golden_egg',
    basePrice: 250,
    productTimeDays: 2,
    specialAbility: 'Yields Golden Eggs (5% Prism Egg) and acts as mount.',
  },
};

// ==========================================
// 9. Workshop Recipes
// ==========================================
export const WORKSHOP_RECIPES = {
  preserves_jar: {
    processingTime: 30,
    inputItem: 'crop_pumpkin',
    outputItem: 'artisan_jam',
    outputAmount: 1,
    priceFormula: (basePrice: number) => 2 * basePrice + 50,
  },
  brewing_barrel: {
    processingTime: 60,
    inputItem: 'crop_dragonfruit',
    outputItem: 'artisan_wine',
    outputAmount: 1,
    priceFormula: (basePrice: number) => 3 * basePrice,
  },
  seed_maker: {
    processingTime: 10,
    inputItem: 'crop_wheat',
    outputItem: 'seed_wheat',
    outputAmount: 2,
    priceFormula: (basePrice: number) => basePrice,
  },
  loom: {
    processingTime: 45,
    inputItem: 'product_silk_thread',
    outputItem: 'artisan_cloth',
    outputAmount: 1,
    priceFormula: (_basePrice: number) => 450,
  },
  mill: {
    processingTime: 15,
    inputItem: 'crop_wheat',
    outputItem: 'artisan_flour',
    outputAmount: 2,
    priceFormula: (_basePrice: number) => 60,
  },
};

// ==========================================
// 10. Land Expansion Plots & Autotile Maps
// ==========================================
export const LAND_PLOT_UNLOCK_COSTS: Record<number, { levelReq: number; coinCost: number }> = {
  0: { levelReq: 1, coinCost: 0 },      // Plot 0: Top-Left (Unlocked by default)
  1: { levelReq: 3, coinCost: 500 },    // Plot 1: Top-Right
  2: { levelReq: 5, coinCost: 1500 },   // Plot 2: Bottom-Left
  3: { levelReq: 8, coinCost: 4000 },   // Plot 3: Bottom-Right
};

export const LAND_PLOT_CONFIGS: Record<number, LandPlotConfig> = {
  0: {
    plotId: 0,
    name: 'Northwest Meadow (Starter Plot)',
    levelReq: 1,
    coinCost: 0,
    bounds: { minX: 0, maxX: 7, minY: 0, maxY: 4 },
  },
  1: {
    plotId: 1,
    name: 'Northeast Orchard Expansion',
    levelReq: 3,
    coinCost: 500,
    bounds: { minX: 8, maxX: 15, minY: 0, maxY: 4 },
  },
  2: {
    plotId: 2,
    name: 'Southwest Livestock Pasture',
    levelReq: 5,
    coinCost: 1500,
    bounds: { minX: 0, maxX: 7, minY: 5, maxY: 9 },
  },
  3: {
    plotId: 3,
    name: 'Southeast Automation Workshop',
    levelReq: 8,
    coinCost: 4000,
    bounds: { minX: 8, maxX: 15, minY: 5, maxY: 9 },
  },
};

export const TILE_TYPE_CONFIG: Record<TileType, TileTypeProperties> = {
  untilled_grass: {
    type: 'untilled_grass',
    walkable: true,
    tillable: true,
    plantable: false,
    waterable: false,
    unlockable: true,
    defaultTextureKey: 'tile_untilled',
  },
  tilled_dirt: {
    type: 'tilled_dirt',
    walkable: true,
    tillable: false,
    plantable: true,
    waterable: true,
    unlockable: true,
    defaultTextureKey: 'tile_tilled',
  },
  watered_dirt: {
    type: 'watered_dirt',
    walkable: true,
    tillable: false,
    plantable: true,
    waterable: false,
    unlockable: true,
    defaultTextureKey: 'tile_watered',
  },
  stone_path: {
    type: 'stone_path',
    walkable: true,
    tillable: false,
    plantable: false,
    waterable: false,
    unlockable: true,
    defaultTextureKey: 'tile_stone',
  },
  locked_plot: {
    type: 'locked_plot',
    walkable: false,
    tillable: false,
    plantable: false,
    waterable: false,
    unlockable: true,
    defaultTextureKey: 'tile_locked',
  },
  fence: {
    type: 'fence',
    walkable: false,
    tillable: false,
    plantable: false,
    waterable: false,
    unlockable: true,
    defaultTextureKey: 'tile_fence',
  },
  water_edge: {
    type: 'water_edge',
    walkable: false,
    tillable: false,
    plantable: false,
    waterable: false,
    unlockable: false,
    defaultTextureKey: 'tile_water',
  },
  building_floor: {
    type: 'building_floor',
    walkable: true,
    tillable: false,
    plantable: false,
    waterable: false,
    unlockable: true,
    defaultTextureKey: 'tile_house',
  },
};

export const AUTOTILE_BITMASK_MAP: Record<number, AutotileMapping> = {
  0: { col: 5, row: 0 },
  1: { col: 3, row: 2 },
  2: { col: 4, row: 0 },
  3: { col: 0, row: 2 },
  4: { col: 3, row: 0 },
  5: { col: 3, row: 1 },
  6: { col: 0, row: 0 },
  7: { col: 0, row: 1 },
  8: { col: 4, row: 2 },
  9: { col: 2, row: 2 },
  10: { col: 4, row: 1 },
  11: { col: 1, row: 2 },
  12: { col: 2, row: 0 },
  13: { col: 2, row: 1 },
  14: { col: 1, row: 0 },
  15: { col: 1, row: 1 },
};

// ==========================================
// 11. Asset Palette Specifications
// ==========================================
export const PALETTE = {
  // Terrain & Environment
  GRASS_BASE: '#4a8505',
  GRASS_HIGHLIGHT: '#68a614',
  GRASS_DARK: '#346102',
  SOIL_DRY: '#5c3a21',
  SOIL_WATERED: '#3b2312',
  SOIL_HIGHLIGHT: '#7a4d2c',
  WATER_BLUE: '#4d88ff',
  STONE_GRAY: '#686d76',
  STONE_DARK: '#373a40',

  // Tool Tiers
  TOOL_BASIC: '#8d99ae',
  TOOL_COPPER: '#b56576',
  TOOL_GOLD: '#ffb703',
  TOOL_TITANIUM: '#48cae4',

  // HUD & UI
  STAMINA_HIGH: '#06d6a0',
  STAMINA_MED: '#ffd166',
  STAMINA_LOW: '#ef476f',
  COIN_GOLD: '#ffb703',
  HOTBAR_BG: '#1d3557',
  HOTBAR_BORDER: '#457b9d',
  TEXT_LIGHT: '#f1faee',

  // Workshop Buildings
  JAR_GLASS: '#90caf9',
  BARREL_WOOD: '#6d4c41',
  SEEDER_HOPPER: '#78909c',
  LOOM_FRAME: '#8d6e63',
  MILL_STONE: '#9e9e9e',
};

// ==========================================
// 12. Initial Farm State Generator
// ==========================================
export function createDefaultFarmState(initialCoins = 500): FarmState {
  const grid: TileData[][] = [];
  for (let r = 0; r < GRID_HEIGHT; r++) {
    const row: TileData[] = [];
    for (let c = 0; c < GRID_WIDTH; c++) {
      row.push({
        x: c,
        y: r,
        tilled: false,
        watered: false,
        unlocked: c < 8 && r < 5, // Quadrant 0 (Top-Left 8x5) unlocked initially
        plotId: (r < 5 ? 0 : 2) + (c < 8 ? 0 : 1),
      });
    }
    grid.push(row);
  }

  return {
    version: 1,
    coins: initialCoins,
    energy: BASE_MAX_ENERGY,
    maxEnergy: BASE_MAX_ENERGY,
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
    marketMultipliers: {
      wheat: 1.0,
      pumpkin: 1.0,
      crystal_berry: 1.0,
      dragonfruit: 1.0,
      elder_oak: 1.0,
      sunflower: 1.0,
    },
    grid,
    stations: [],
    animals: [],
    activeOrders: [],
    lastSavedTimestamp: Date.now(),
  };
}

export const DEFAULT_FARM_STATE = Object.freeze(createDefaultFarmState(500));
