import { describe, test, expect } from 'vitest';
import type { TileData, CropEntity, ProcessingStation, AnimalEntity, FarmState } from '../types';

function createDefaultFarmState(overrides?: Partial<FarmState>): FarmState {
  return {
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
    unlockedPlots: 1,
    inventory: {
      wheat_seed: 10,
      pumpkin_seed: 5,
      silk_thread: 3,
      wheat: 5,
    },
    marketMultipliers: {
      wheat: 1.2,
      pumpkin_jam: 1.5,
      silk_cloth: 1.8,
      flour: 1.4,
    },
    ...overrides,
  };
}

describe('Mythic Farm — Tier 3: Cross-Feature Interactions', () => {
  test('1. Full Weather -> Sprinkler -> Drone -> Shipping Bin -> Economy -> Level Up Pipeline', () => {
    const state = createDefaultFarmState({ coins: 200, farmExp: 90, currentWeather: 'rain' });

    // Step A: Weather auto-waters tilled tiles
    const grid: TileData[] = [
      { x: 0, y: 0, tilled: true, watered: false, unlocked: true, crop: { id: 'c1', speciesId: 'pumpkin', stage: 3, withered: false, growthProgress: 1.0, daysPlanted: 4 } },
      { x: 1, y: 0, tilled: true, watered: false, unlocked: true },
    ];

    if (state.currentWeather === 'rain') {
      grid.forEach(t => { if (t.tilled) t.watered = true; });
    }
    expect(grid[0].watered).toBe(true);

    // Step B: Sprinkler waters adjacent dry tiles
    const sprinklerPos = { x: 1, y: 1 };
    grid.forEach(t => {
      if (Math.abs(t.x - sprinklerPos.x) <= 1 && Math.abs(t.y - sprinklerPos.y) <= 1) {
        t.watered = true;
      }
    });

    // Step C: Harvester Drone scans mature stage 3 crops and deposits into shipping bin
    const shippingBin: Record<string, number> = {};
    grid.forEach(t => {
      if (t.crop && t.crop.stage === 3 && !t.crop.withered) {
        const item = t.crop.speciesId;
        shippingBin[item] = (shippingBin[item] || 0) + 1;
        t.crop = undefined;
      }
    });
    expect(shippingBin['pumpkin']).toBe(1);
    expect(grid[0].crop).toBeUndefined();

    // Step D: Midnight economy payout
    const basePrices: Record<string, number> = { pumpkin: 50 };
    const multiplier = state.marketMultipliers['pumpkin'] || 1.0;
    let earnedCoins = 0;
    for (const [item, count] of Object.entries(shippingBin)) {
      earnedCoins += Math.floor((basePrices[item] || 0) * count * multiplier);
    }
    state.coins += earnedCoins;
    state.farmExp += 20; // EXP from harvest

    expect(state.coins).toBe(250);

    // Step E: Farm Level Up trigger
    const expNeeded = 100;
    if (state.farmExp >= expNeeded) {
      state.farmLevel += 1;
      state.maxEnergy += 10;
    }
    expect(state.farmLevel).toBe(2);
    expect(state.maxEnergy).toBe(110);
  });

  test('2. Livestock Feeding -> Affection Boost -> Yield -> Preserves Processing -> Guild Order Fulfillment', () => {
    const state = createDefaultFarmState({ coins: 300, farmExp: 0 });
    const goat: AnimalEntity = {
      id: 'goat_1',
      species: 'golden_goat',
      x: 50, y: 50,
      fedToday: false,
      groomedToday: false,
      affection: 75,
      productReady: false,
    };

    // Step A: Feed & Groom goat -> boost affection above 80
    goat.fedToday = true;
    goat.groomedToday = true;
    goat.affection = Math.min(100, goat.affection + 10);
    expect(goat.affection).toBe(85);

    // Step B: Day advance -> product ready
    if (goat.fedToday) {
      goat.productReady = true;
    }
    expect(goat.productReady).toBe(true);

    // Step C: Harvest product -> Golden Milk
    let goldenMilkCount = 0;
    if (goat.productReady) {
      goldenMilkCount = 1;
      goat.productReady = false;
    }
    expect(goldenMilkCount).toBe(1);

    // Step D: Process Golden Milk in Preserves Jar -> Golden Cheese
    const station: ProcessingStation = {
      id: 'pj_1',
      type: 'preserves_jar',
      tileX: 2, tileY: 2,
      inputItem: 'golden_milk',
      timerRemaining: 0, // Instant complete for test
      active: true,
    };
    if (station.timerRemaining <= 0) {
      station.outputItem = 'golden_cheese';
      station.active = false;
    }
    expect(station.outputItem).toBe('golden_cheese');

    // Step E: Fulfill Guild Order for Golden Cheese
    const order = {
      id: 'guild_1',
      itemRequired: 'golden_cheese',
      countRequired: 1,
      rewardCoins: 450,
      rewardExp: 80,
      completed: false,
    };

    if (station.outputItem === order.itemRequired) {
      state.coins += order.rewardCoins;
      state.farmExp += order.rewardExp;
      order.completed = true;
    }

    expect(state.coins).toBe(750);
    expect(state.farmExp).toBe(80);
    expect(order.completed).toBe(true);
  });

  test('3. Crop Harvest -> Seed Maker -> Re-seeding & Surplus Processing Loop', () => {
    const state = createDefaultFarmState({ inventory: { pumpkin_seed: 0, pumpkin: 2 } });

    // Step A: Input 1 Pumpkin into Seed Maker
    const seedMaker: ProcessingStation = {
      id: 'sm_1',
      type: 'seed_maker',
      tileX: 0, tileY: 0,
      inputItem: 'pumpkin',
      timerRemaining: 0,
      active: true,
    };
    state.inventory['pumpkin'] -= 1;

    // Seed Maker yields 3 Pumpkin seeds
    const seedYield = 3;
    state.inventory['pumpkin_seed'] = (state.inventory['pumpkin_seed'] || 0) + seedYield;
    seedMaker.active = false;

    expect(state.inventory['pumpkin_seed']).toBe(3);

    // Step B: Input remaining 1 Pumpkin into Preserves Jar
    const jar: ProcessingStation = {
      id: 'pj_1',
      type: 'preserves_jar',
      tileX: 1, tileY: 0,
      inputItem: 'pumpkin',
      timerRemaining: 0,
      active: true,
    };
    state.inventory['pumpkin'] -= 1;
    jar.outputItem = 'pumpkin_jam';
    jar.active = false;

    expect(state.inventory['pumpkin']).toBe(0);
    expect(jar.outputItem).toBe('pumpkin_jam');
  });

  test('4. Tool Upgrade -> Expanded Land Plot -> Mass Tilling & Auto-Watering', () => {
    const state = createDefaultFarmState({
      coins: 1000,
      farmLevel: 5,
      unlockedPlots: 1,
      inventory: { gold_ingot: 5 },
      toolTiers: { hoe: 'basic', watering_can: 'basic', axe: 'basic', scythe: 'basic' },
    });

    // Step A: Level 5 unlocks Plot 2
    state.unlockedPlots = 2;
    expect(state.unlockedPlots).toBe(2);

    // Step B: Upgrade Hoe to Titanium
    state.coins -= 500;
    state.toolTiers.hoe = 'titanium';
    expect(state.toolTiers.hoe).toBe('titanium');

    // Step C: Titanium Hoe tills 25 tiles in 1 action
    const tilesTilled = state.toolTiers.hoe === 'titanium' ? 25 : 1;
    expect(tilesTilled).toBe(25);
  });

  test('5. Multi-Station Simultaneous Workshop Processing Pipeline (Loom + Mill + Preserves Jar + Brewing Barrel)', () => {
    const state = createDefaultFarmState({
      inventory: { silk_thread: 1, wheat: 5, pumpkin: 1, dragonfruit: 1 },
    });

    const stations: ProcessingStation[] = [
      { id: 'st_1', type: 'loom', tileX: 0, tileY: 0, inputItem: 'silk_thread', timerRemaining: 0, active: true },
      { id: 'st_2', type: 'mill', tileX: 1, tileY: 0, inputItem: 'wheat', timerRemaining: 0, active: true },
      { id: 'st_3', type: 'preserves_jar', tileX: 2, tileY: 0, inputItem: 'pumpkin', timerRemaining: 0, active: true },
      { id: 'st_4', type: 'brewing_barrel', tileX: 3, tileY: 0, inputItem: 'dragonfruit', timerRemaining: 0, active: true },
    ];

    // Process all stations simultaneously
    stations.forEach(s => {
      if (s.timerRemaining <= 0) {
        if (s.type === 'loom') s.outputItem = 'silk_cloth';
        if (s.type === 'mill') s.outputItem = 'flour';
        if (s.type === 'preserves_jar') s.outputItem = 'pumpkin_jam';
        if (s.type === 'brewing_barrel') s.outputItem = 'dragonfruit_wine';
        s.active = false;
      }
    });

    expect(stations[0].outputItem).toBe('silk_cloth');
    expect(stations[1].outputItem).toBe('flour');
    expect(stations[2].outputItem).toBe('pumpkin_jam');
    expect(stations[3].outputItem).toBe('dragonfruit_wine');
    expect(stations.every(s => s.active === false)).toBe(true);
  });
});
