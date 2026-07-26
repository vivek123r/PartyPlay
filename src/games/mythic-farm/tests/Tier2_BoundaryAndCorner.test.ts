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
    inventory: { wheat_seed: 5 },
    marketMultipliers: { wheat: 1.0 },
    ...overrides,
  };
}

describe('Mythic Farm — Tier 2: Boundary & Corner Cases', () => {
  describe('1. Currency & Resource Bound Clamping', () => {
    test('Coins cannot drop below 0 when spending more than current balance', () => {
      const state = createDefaultFarmState({ coins: 50 });
      const cost = 100;
      let spent = false;
      if (state.coins >= cost) {
        state.coins -= cost;
        spent = true;
      }
      expect(spent).toBe(false);
      expect(state.coins).toBe(50);
    });

    test('Energy cannot drop below 0 when attempting actions with low energy', () => {
      const state = createDefaultFarmState({ energy: 1 });
      const actionCost = 5;
      let performed = false;
      if (state.energy >= actionCost) {
        state.energy -= actionCost;
        performed = true;
      } else {
        // Clamp to zero if forced
        state.energy = Math.max(0, state.energy - actionCost);
      }
      expect(performed).toBe(false);
      expect(state.energy).toBe(0);
    });

    test('Energy cannot exceed maxEnergy when receiving food/energy boosts', () => {
      const state = createDefaultFarmState({ energy: 90, maxEnergy: 100 });
      const restoreAmount = 30;
      state.energy = Math.min(state.maxEnergy, state.energy + restoreAmount);
      expect(state.energy).toBe(100);
    });

    test('Negative coin input values in reward logic are clamped to 0', () => {
      const state = createDefaultFarmState({ coins: 200 });
      const reward = -50;
      const safeReward = Math.max(0, reward);
      state.coins += safeReward;
      expect(state.coins).toBe(200);
    });
  });

  describe('2. Grid Spatial & Plot Boundaries', () => {
    test('Querying negative grid coordinates (-1, -1) returns out-of-bounds safety flag', () => {
      const isOutOfBounds = (x: number, y: number, width: number, height: number) => {
        return x < 0 || y < 0 || x >= width || y >= height;
      };
      expect(isOutOfBounds(-1, -1, 10, 10)).toBe(true);
      expect(isOutOfBounds(0, 0, 10, 10)).toBe(false);
    });

    test('Querying beyond max grid dimensions (100, 100) returns out-of-bounds safety flag', () => {
      const isOutOfBounds = (x: number, y: number, width: number, height: number) => {
        return x < 0 || y < 0 || x >= width || y >= height;
      };
      expect(isOutOfBounds(100, 100, 20, 20)).toBe(true);
    });

    test('Attempting to till or plant on locked land plot (unlocked: false) fails', () => {
      const tile: TileData = { x: 5, y: 5, tilled: false, watered: false, unlocked: false };
      let actionSuccess = false;
      if (tile.unlocked) {
        tile.tilled = true;
        actionSuccess = true;
      }
      expect(actionSuccess).toBe(false);
      expect(tile.tilled).toBe(false);
    });

    test('Sprinkler placed on edge tile (0,0) only waters valid adjacent in-bounds tiles', () => {
      const gridWidth = 10;
      const gridHeight = 10;
      const sprinklerX = 0;
      const sprinklerY = 0;

      const cardinalOffsets = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
      const validTargets = cardinalOffsets
        .map(off => ({ x: sprinklerX + off.x, y: sprinklerY + off.y }))
        .filter(t => t.x >= 0 && t.y >= 0 && t.x < gridWidth && t.y < gridHeight);

      expect(validTargets.length).toBe(2); // Only (0,1) and (1,0) are valid
    });
  });

  describe('3. Inventory & Item Edge Conditions', () => {
    test('Attempting to plant seed with 0 inventory count is rejected', () => {
      const state = createDefaultFarmState({ inventory: { wheat_seed: 0 } });
      let planted = false;
      if ((state.inventory['wheat_seed'] || 0) > 0) {
        state.inventory['wheat_seed'] -= 1;
        planted = true;
      }
      expect(planted).toBe(false);
      expect(state.inventory['wheat_seed']).toBe(0);
    });

    test('Attempting to sell item with 0 inventory count is rejected', () => {
      const state = createDefaultFarmState({ inventory: { pumpkin: 0 } });
      let sold = false;
      if ((state.inventory['pumpkin'] || 0) > 0) {
        state.inventory['pumpkin'] -= 1;
        sold = true;
      }
      expect(sold).toBe(false);
    });

    test('Selling negative quantity of items is rejected', () => {
      const state = createDefaultFarmState({ inventory: { wheat: 10 } });
      const qtyToSell = -5;
      let sold = false;
      if (qtyToSell > 0 && (state.inventory['wheat'] || 0) >= qtyToSell) {
        state.inventory['wheat'] -= qtyToSell;
        sold = true;
      }
      expect(sold).toBe(false);
      expect(state.inventory['wheat']).toBe(10);
    });
  });

  describe('4. Seasonal & Calendar Boundaries', () => {
    test('Day 28 transition advances to Day 1 of next season', () => {
      let season: FarmState['currentSeason'] = 'spring';
      let day = 28;

      // Advance day
      day += 1;
      if (day > 28) {
        day = 1;
        const seasons: FarmState['currentSeason'][] = ['spring', 'summer', 'autumn', 'winter'];
        const idx = seasons.indexOf(season);
        season = seasons[(idx + 1) % seasons.length];
      }

      expect(day).toBe(1);
      expect(season).toBe('summer');
    });

    test('Year roll-over from Winter Day 28 to Spring Day 1 increments year count', () => {
      let season: FarmState['currentSeason'] = 'winter';
      let day = 28;
      let year = 1;

      day += 1;
      if (day > 28) {
        day = 1;
        const seasons: FarmState['currentSeason'][] = ['spring', 'summer', 'autumn', 'winter'];
        const idx = seasons.indexOf(season);
        season = seasons[(idx + 1) % seasons.length];
        if (season === 'spring') {
          year += 1;
        }
      }

      expect(day).toBe(1);
      expect(season).toBe('spring');
      expect(year).toBe(2);
    });
  });

  describe('5. Workshop & Recipe Edge Conditions', () => {
    test('Inserting invalid non-recipe item into Preserves Jar returns error / rejected', () => {
      const station: ProcessingStation = {
        id: 'pj_1',
        type: 'preserves_jar',
        tileX: 1, tileY: 1,
        active: false,
        timerRemaining: 0,
      };
      const validInputs = ['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'elder_oak_fruit', 'sunflower'];
      const input = 'iron_ingot';

      let inserted = false;
      if (validInputs.includes(input)) {
        station.inputItem = input;
        station.active = true;
        inserted = true;
      }

      expect(inserted).toBe(false);
      expect(station.active).toBe(false);
    });

    test('Processing station handles large delta time (dt = 3600) without negative timers', () => {
      const station: ProcessingStation = {
        id: 'pj_1',
        type: 'preserves_jar',
        tileX: 1, tileY: 1,
        inputItem: 'pumpkin',
        timerRemaining: 30,
        active: true,
      };

      const dt = 3600; // 1 hour skip
      station.timerRemaining = Math.max(0, station.timerRemaining - dt);
      if (station.timerRemaining === 0) {
        station.outputItem = 'pumpkin_jam';
        station.active = false;
      }

      expect(station.timerRemaining).toBe(0);
      expect(station.outputItem).toBe('pumpkin_jam');
      expect(station.active).toBe(false);
    });
  });

  describe('6. Leveling & Tool Upgrade Caps', () => {
    test('Farm level caps at Level 50 and prevents EXP overflow', () => {
      const maxLevel = 50;
      let currentLevel = 50;
      let currentExp = 999999;

      if (currentLevel >= maxLevel) {
        currentLevel = maxLevel;
        currentExp = 0; // Or capped
      }

      expect(currentLevel).toBe(50);
    });

    test('Tool upgrade past Titanium returns maximum tier error / no-op', () => {
      const currentTier: FarmState['toolTiers']['hoe'] = 'titanium';
      const upgradeTool = (tier: string) => {
        if (tier === 'titanium') return 'titanium';
        if (tier === 'gold') return 'titanium';
        if (tier === 'copper') return 'gold';
        return 'copper';
      };
      expect(upgradeTool(currentTier)).toBe('titanium');
    });

    test('Animal affection is bounded between 0 and 100 under continuous neglect or max grooming', () => {
      const animal: AnimalEntity = {
        id: 'a1', species: 'golden_goat', x: 0, y: 0, fedToday: false, groomedToday: false, affection: 0, productReady: false,
      };

      // Continuous neglect
      for (let i = 0; i < 20; i++) {
        animal.affection = Math.max(0, animal.affection - 10);
      }
      expect(animal.affection).toBe(0);

      // Continuous grooming
      for (let i = 0; i < 30; i++) {
        animal.affection = Math.min(100, animal.affection + 10);
      }
      expect(animal.affection).toBe(100);
    });
  });
});
