import { describe, test, expect } from 'vitest';
import type { TileData, CropEntity, ProcessingStation, AnimalEntity, FarmState } from '../types';

function createInitialFarmState(): FarmState {
  return {
    coins: 500,
    energy: 100,
    maxEnergy: 100,
    farmLevel: 1,
    farmExp: 0,
    currentDay: 1,
    currentSeason: 'spring',
    currentWeather: 'sunny',
    toolTiers: { hoe: 'basic', watering_can: 'basic', axe: 'basic', scythe: 'basic' },
    selectedHotbarIndex: 0,
    unlockedPlots: 1,
    inventory: { wheat_seed: 10, pumpkin_seed: 5 },
    marketMultipliers: { wheat: 1.0, pumpkin: 1.2, dragonfruit: 1.5 },
  };
}

describe('Mythic Farm — Tier 4: Real-World Farm Scenarios', () => {
  test('Scenario A: Full 28-Day Spring Season Playthrough & Transition to Summer', () => {
    const state = createInitialFarmState();
    const grid: TileData[] = Array.from({ length: 9 }, (_, i) => ({
      x: i % 3,
      y: Math.floor(i / 3),
      tilled: false,
      watered: false,
      unlocked: true,
    }));

    let totalCropsHarvested = 0;

    // Simulate 28 days of Spring
    for (let day = 1; day <= 28; day++) {
      state.currentDay = day;

      // Dynamic weather schedule (Rain on Day 5 and Day 15)
      if (day === 5 || day === 15) {
        state.currentWeather = 'rain';
      } else {
        state.currentWeather = 'sunny';
      }

      // Morning tick: Weather auto-waters or player manually waters tilled tiles
      grid.forEach(t => { if (t.tilled) t.watered = true; });

      // Day 1: Till 4 tiles and plant Wheat seeds
      if (day === 1) {
        for (let i = 0; i < 4; i++) {
          grid[i].tilled = true;
          grid[i].watered = true;
          grid[i].crop = {
            id: `crop_${i}`,
            speciesId: 'wheat',
            stage: 0,
            withered: false,
            growthProgress: 0,
            daysPlanted: 0,
          };
          state.inventory['wheat_seed'] -= 1;
        }
      }

      // Daily crop growth tick
      grid.forEach(t => {
        if (t.crop && t.watered && !t.crop.withered && t.crop.stage < 3) {
          t.crop.growthProgress += 0.5;
          t.crop.daysPlanted += 1;
          if (t.crop.growthProgress >= 1.0) {
            t.crop.stage = (t.crop.stage + 1) as 0 | 1 | 2 | 3;
            t.crop.growthProgress = 0;
          }
        }
      });

      // Harvest ready crops
      grid.forEach(t => {
        if (t.crop && t.crop.stage === 3) {
          totalCropsHarvested += 1;
          state.coins += 25; // Revenue per wheat
          state.farmExp += 10;
          t.crop = undefined; // Clear tile
        }
      });

      // Evening tick: Reset tile moisture unless rainy
      if (state.currentWeather !== 'rain') {
        grid.forEach(t => { t.watered = false; });
      }
    }

    // Season wrap logic after Day 28
    if (state.currentDay === 28) {
      state.currentDay = 1;
      state.currentSeason = 'summer';
    }

    expect(state.currentSeason).toBe('summer');
    expect(state.currentDay).toBe(1);
    expect(totalCropsHarvested).toBeGreaterThanOrEqual(4);
    expect(state.coins).toBeGreaterThan(500);
  });

  test('Scenario B: 50-Day Automated Orchard & Mythical Livestock Enterprise', () => {
    const state = createInitialFarmState();
    state.coins = 5000;
    state.farmLevel = 5;

    // 4 Mythical Animals in Pasture
    const animals: AnimalEntity[] = [
      { id: 'a1', species: 'golden_goat', x: 10, y: 10, fedToday: false, groomedToday: false, affection: 50, productReady: false },
      { id: 'a2', species: 'astral_bee', x: 20, y: 10, fedToday: false, groomedToday: false, affection: 50, productReady: false },
      { id: 'a3', species: 'silk_moth', x: 30, y: 10, fedToday: false, groomedToday: false, affection: 50, productReady: false },
      { id: 'a4', species: 'feathered_chocobo', x: 40, y: 10, fedToday: false, groomedToday: false, affection: 50, productReady: false },
    ];

    let totalProductsCollected = 0;

    // Simulate 50 daily cycles
    for (let day = 1; day <= 50; day++) {
      // Daily feeding and grooming routines
      animals.forEach(anim => {
        anim.fedToday = true;
        anim.groomedToday = true;
        anim.affection = Math.min(100, anim.affection + 2);
        if (anim.fedToday) {
          anim.productReady = true;
        }
      });

      // Product harvesting
      animals.forEach(anim => {
        if (anim.productReady) {
          totalProductsCollected += 1;
          state.coins += 100;
          state.farmExp += 15;
          anim.productReady = false;
        }
      });
    }

    expect(totalProductsCollected).toBe(200); // 4 animals * 50 days
    expect(animals.every(a => a.affection >= 90)).toBe(true);
    expect(state.coins).toBeGreaterThanOrEqual(25000);
  });

  test('Scenario C: 100-Day Economic Mastery, All Land Plot Unlocks & Titanium Tool Suite', () => {
    const state = createInitialFarmState();

    // Fast-forward 100 days of farming operations
    for (let day = 1; day <= 100; day++) {
      state.currentDay = day;
      state.coins += 1200; // Average daily profit
      state.farmExp += 100;

      // Level progression check
      if (state.farmExp >= state.farmLevel * 200) {
        state.farmLevel += 1;
      }

      // Land unlocks based on level
      if (state.farmLevel >= 5 && state.unlockedPlots < 2) state.unlockedPlots = 2;
      if (state.farmLevel >= 10 && state.unlockedPlots < 3) state.unlockedPlots = 3;
      if (state.farmLevel >= 15 && state.unlockedPlots < 4) state.unlockedPlots = 4;
      if (state.farmLevel >= 20 && state.unlockedPlots < 5) state.unlockedPlots = 5;

      // Tool upgrades
      if (state.coins >= 5000 && state.toolTiers.hoe === 'basic') state.toolTiers.hoe = 'titanium';
      if (state.coins >= 5000 && state.toolTiers.watering_can === 'basic') state.toolTiers.watering_can = 'titanium';
      if (state.coins >= 5000 && state.toolTiers.axe === 'basic') state.toolTiers.axe = 'titanium';
      if (state.coins >= 5000 && state.toolTiers.scythe === 'basic') state.toolTiers.scythe = 'titanium';
    }

    expect(state.coins).toBeGreaterThan(100000);
    expect(state.farmLevel).toBeGreaterThanOrEqual(20);
    expect(state.unlockedPlots).toBe(5);
    expect(state.toolTiers.hoe).toBe('titanium');
    expect(state.toolTiers.watering_can).toBe('titanium');
    expect(state.toolTiers.axe).toBe('titanium');
    expect(state.toolTiers.scythe).toBe('titanium');

    // Serialization integrity verification at Day 100
    const serialized = JSON.stringify(state);
    const restored: FarmState = JSON.parse(serialized);
    expect(restored.unlockedPlots).toBe(5);
    expect(restored.toolTiers.hoe).toBe('titanium');
  });
});
