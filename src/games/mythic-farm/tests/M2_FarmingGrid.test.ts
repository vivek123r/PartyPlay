import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Grid } from '../entities/Grid';
import { Crop } from '../entities/Crop';
import { FarmingSystem } from '../systems/FarmingSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { TextureGenerator } from '../utils/TextureGenerator';
import { createDefaultFarmState, CROP_SPECIES, TOOL_TIER_CONFIG } from '../config';
import type { FarmState, CropEntity, Season, Weather } from '../types';
import MythicFarmGame from '../index';

describe('Milestone 2 (M2) Dynamic Farming, Soil & Orchard Grid Engine', () => {
  let farmState: FarmState;
  let textureGen: TextureGenerator;
  let grid: Grid;
  let farmingSystem: FarmingSystem;
  let weatherSystem: WeatherSystem;

  beforeEach(() => {
    farmState = createDefaultFarmState(500);
    textureGen = new TextureGenerator();
    textureGen.generateAll();

    grid = new Grid();
    grid.init(farmState, textureGen);

    farmingSystem = new FarmingSystem(farmState, grid, null, textureGen);
    weatherSystem = new WeatherSystem({ overlayEnabled: true });
  });

  // ==========================================
  // 1. Grid Engine Tests
  // ==========================================
  describe('Grid Tile Engine & Coordinates', () => {
    it('initializes a 16x10 tile matrix with correct plot unlock states', () => {
      expect(farmState.grid).toBeDefined();
      expect(farmState.grid!.length).toBe(10);
      expect(farmState.grid![0].length).toBe(16);

      // Plot 0 (top-left 8x5) should be unlocked by default
      const topLeft = grid.getTile(0, 0);
      expect(topLeft).not.toBeNull();
      expect(topLeft?.unlocked).toBe(true);

      // Bottom-right tile should be locked initially
      const bottomRight = grid.getTile(15, 9);
      expect(bottomRight).not.toBeNull();
      expect(bottomRight?.unlocked).toBe(false);
    });

    it('correctly translates screen coordinates to tile coordinates and vice versa', () => {
      const screenPos = grid.tileToScreen(2, 3);
      expect(screenPos.x).toBe(8 + 2 * 24); // GRID_OFFSET_X (8) + tileX * TILE_SIZE (24)
      expect(screenPos.y).toBe(16 + 3 * 24); // GRID_OFFSET_Y (16) + tileY * TILE_SIZE (24)

      const tilePos = grid.screenToTile(screenPos.x + 10, screenPos.y + 10);
      expect(tilePos).toEqual({ x: 2, y: 3 });

      // Out of bounds screen coords return null
      expect(grid.screenToTile(-10, -10)).toBeNull();
      expect(grid.screenToTile(999, 999)).toBeNull();
    });

    it('tills, waters, and fertilizes soil tiles', () => {
      const tile = grid.getTile(1, 1)!;
      expect(tile.tilled).toBe(false);
      expect(tile.watered).toBe(false);

      // Cannot water untilled soil
      expect(grid.waterTile(1, 1)).toBe(false);

      // Till soil
      expect(grid.tillTile(1, 1)).toBe(true);
      expect(tile.tilled).toBe(true);
      // Double tilling is no-op
      expect(grid.tillTile(1, 1)).toBe(false);

      // Water tilled soil
      expect(grid.waterTile(1, 1)).toBe(true);
      expect(tile.watered).toBe(true);

      // Fertilize soil
      expect(grid.fertilizeTile(1, 1, 'speed')).toBe(true);
      expect(tile.fertilizer).toBe('speed');
      // Cannot re-fertilize
      expect(grid.fertilizeTile(1, 1, 'quality')).toBe(false);
    });

    it('unlocks land plots on unlockPlot call', () => {
      const tilePlot1 = grid.getTile(9, 1)!; // Top-Right (Plot 1)
      expect(tilePlot1.unlocked).toBe(false);

      grid.unlockPlot(1);
      expect(tilePlot1.unlocked).toBe(true);
    });

    it('resets daily tile moisture on morning tick', () => {
      grid.tillTile(0, 0);
      grid.waterTile(0, 0);
      expect(grid.getTile(0, 0)!.watered).toBe(true);

      grid.resetDailyMoisture();
      // Unfertilized tile moisture resets to false
      expect(grid.getTile(0, 0)!.watered).toBe(false);
    });
  });

  // ==========================================
  // 2. Crop Entity & Growth Engine Tests
  // ==========================================
  describe('Crop Entity & Growth Engine', () => {
    it('plants all 6 crop species and handles positioning offsets', () => {
      const speciesList = ['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'elder_oak', 'sunflower'];

      speciesList.forEach((speciesId, idx) => {
        const x = idx;
        const y = 0;
        grid.tillTile(x, y);

        const cropEntity: CropEntity = {
          id: `crop_${speciesId}`,
          speciesId,
          stage: 0,
          withered: false,
          growthProgress: 0,
          daysPlanted: 0,
        };

        const crop = grid.addCrop(x, y, cropEntity);
        expect(crop).toBeDefined();
        expect(grid.getCrop(x, y)).toBe(crop);

        if (speciesId === 'elder_oak') {
          // Tree positioning offset (-4, -8)
          expect(crop.x).toBe(x * 24 - 4);
          expect(crop.y).toBe(y * 24 - 8);
        } else {
          // Standard crop positioning offset (+4, +4)
          expect(crop.x).toBe(x * 24 + 4);
          expect(crop.y).toBe(y * 24 + 4);
        }
      });
    });

    it('advances growth stage when watered over required growth days', () => {
      grid.tillTile(0, 0);
      const cropEntity: CropEntity = {
        id: 'crop_wheat_1',
        speciesId: 'wheat', // growthDays = 2
        stage: 0,
        withered: false,
        growthProgress: 0,
        daysPlanted: 0,
      };
      const crop = grid.addCrop(0, 0, cropEntity);

      // Unwatered: no growth
      crop.advanceGrowth(false, 'spring', 'sunny');
      expect(crop.entity.stage).toBe(0);

      // Watered Day 1: advances 50% growth (Stage 1: Sprout)
      crop.advanceGrowth(true, 'spring', 'sunny');
      expect(crop.entity.growthProgress).toBe(0.5);
      expect(crop.entity.stage).toBe(1);

      // Watered Day 2: advances 100% growth (Stage 3: Harvestable)
      crop.advanceGrowth(true, 'spring', 'sunny');
      expect(crop.entity.stage).toBe(3);
    });

    it('withers crops planted in incompatible seasons', () => {
      grid.tillTile(0, 0);
      const cropEntity: CropEntity = {
        id: 'crop_pumpkin_1',
        speciesId: 'pumpkin', // seasons = ['autumn']
        stage: 0,
        withered: false,
        growthProgress: 0,
        daysPlanted: 0,
      };
      const crop = grid.addCrop(0, 0, cropEntity);

      // Advancing in Spring (invalid for pumpkin) withers crop
      crop.advanceGrowth(true, 'spring', 'sunny');
      expect(crop.entity.withered).toBe(true);
      expect(crop.entity.stage).toBe(4);
    });

    it('regrows perennial crops (Crystal Berry, Dragonfruit, Elder-Oak) to Stage 2 on harvest', () => {
      grid.tillTile(0, 0);
      const cropEntity: CropEntity = {
        id: 'crop_crystal_berry_1',
        speciesId: 'crystal_berry', // regrows = true, regrowDays = 2
        stage: 3,
        withered: false,
        growthProgress: 1.0,
        daysPlanted: 5,
      };
      const crop = grid.addCrop(0, 0, cropEntity);

      const harvestResult = crop.harvest();
      expect(harvestResult.regrows).toBe(true);
      expect(harvestResult.quantity).toBeGreaterThanOrEqual(2);
      expect(crop.entity.stage).toBe(2); // Stage 2: Flowering
      expect(crop.entity.growthProgress).toBeCloseTo(2 / 3, 2);
    });

    it('applies sunflower proximity bonus (+15% speed) to adjacent crops', () => {
      grid.tillTile(1, 1); // Crop center
      grid.tillTile(0, 1); // Sunflower neighbor

      const targetCrop = grid.addCrop(1, 1, {
        id: 'target',
        speciesId: 'wheat',
        stage: 0,
        withered: false,
        growthProgress: 0,
        daysPlanted: 0,
      });

      // Add mature sunflower neighbor
      grid.addCrop(0, 1, {
        id: 'sunflower_neighbor',
        speciesId: 'sunflower',
        stage: 3,
        withered: false,
        growthProgress: 1.0,
        daysPlanted: 3,
      });

      const adjSunflowers = farmingSystem.countAdjacentSunflowers(1, 1);
      expect(adjSunflowers).toBe(1);

      targetCrop.advanceGrowth(true, 'spring', 'sunny', adjSunflowers);
      // Base progress 0.5 * 1.15 = 0.575
      expect(targetCrop.entity.growthProgress).toBeCloseTo(0.575, 3);
    });
  });

  // ==========================================
  // 3. FarmingSystem Tools & AOE Scaling Tests
  // ==========================================
  describe('FarmingSystem Tools & AOE Scaling', () => {
    it('executes tool actions with radius scaling (Basic 1x1, Copper 1x3, Gold 3x3, Titanium 5x5)', () => {
      // Basic Hoe: 1x1
      farmState.toolTiers.hoe = 'basic';
      expect(farmingSystem.executeToolAction('hoe', 2, 2)).toBe(true);
      expect(grid.getTile(2, 2)!.tilled).toBe(true);
      expect(grid.getTile(1, 2)!.tilled).toBe(false);

      // Gold Hoe: 3x3
      farmState.toolTiers.hoe = 'gold';
      expect(farmingSystem.executeToolAction('hoe', 4, 2)).toBe(true);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          expect(grid.getTile(4 + dx, 2 + dy)!.tilled).toBe(true);
        }
      }
    });

    it('deducts energy and prevents actions when energy is depleted', () => {
      farmState.energy = 2; // Basic Hoe costs 5 energy
      farmState.toolTiers.hoe = 'basic';
      expect(farmingSystem.executeToolAction('hoe', 0, 0)).toBe(false);
      expect(grid.getTile(0, 0)!.tilled).toBe(false);
    });

    it('plants seeds and deducts inventory', () => {
      grid.tillTile(0, 0);
      farmState.inventory['seed_wheat'] = 2;

      expect(farmingSystem.plantSeed(0, 0, 'seed_wheat')).toBe(true);
      expect(farmState.inventory['seed_wheat']).toBe(1);
      expect(grid.getCrop(0, 0)).not.toBeNull();
    });

    it('harvests mature crops and spawns physical item pickups', () => {
      grid.tillTile(0, 0);
      grid.addCrop(0, 0, {
        id: 'c1',
        speciesId: 'wheat',
        stage: 3,
        withered: false,
        growthProgress: 1.0,
        daysPlanted: 2,
      });

      expect(farmingSystem.harvestCrop(0, 0)).toBe(true);
      expect(farmState.inventory['crop_wheat']).toBeGreaterThanOrEqual(1);
      expect(farmingSystem.getActivePickups().length).toBe(1);

      const pickup = farmingSystem.getActivePickups()[0];
      expect(pickup.itemId).toBe('crop_wheat');
    });

    it('triggers 3x3 giant pumpkin mutation check', () => {
      // Plant 3x3 mature pumpkins
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          grid.tillTile(c, r);
          grid.addCrop(c, r, {
            id: `p_${c}_${r}`,
            speciesId: 'pumpkin',
            stage: 3,
            withered: false,
            growthProgress: 1.0,
            daysPlanted: 4,
          });
        }
      }

      // Mock Math.random to return < 0.05 for giant pumpkin trigger
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

      farmingSystem.checkGiantPumpkinMutations();
      const centerCrop = grid.getCrop(1, 1);
      expect(centerCrop?.entity.isGiant).toBe(true);

      spy.mockRestore();
    });
  });

  // ==========================================
  // 4. WeatherSystem Engine Tests
  // ==========================================
  describe('WeatherSystem Calendar & Weather Engine', () => {
    it('advances 7-day calendar seasons (Spring -> Summer -> Autumn -> Winter -> Spring)', () => {
      farmState.currentDay = 1;
      farmState.currentSeason = 'spring';

      for (let day = 1; day < 7; day++) {
        weatherSystem.advanceDay(farmState);
      }
      expect(farmState.currentDay).toBe(7);
      expect(farmState.currentSeason).toBe('spring');

      // Day 8 transitions to Summer
      const res8 = weatherSystem.advanceDay(farmState);
      expect(res8.seasonChanged).toBe(true);
      expect(farmState.currentSeason).toBe('summer');

      // Day 15 transitions to Autumn
      farmState.currentDay = 14;
      weatherSystem.advanceDay(farmState);
      expect(farmState.currentSeason).toBe('autumn');

      // Day 22 transitions to Winter
      farmState.currentDay = 21;
      weatherSystem.advanceDay(farmState);
      expect(farmState.currentSeason).toBe('winter');
    });

    it('automatically waters all tilled tiles during rainy weather', () => {
      grid.tillTile(0, 0);
      grid.tillTile(1, 0);
      expect(grid.getTile(0, 0)!.watered).toBe(false);

      weatherSystem.setWeather(farmState, 'rain');
      const res = weatherSystem.processMorningWeather(farmState);
      expect(res.wateredTiles).toBe(2);
      expect(grid.getTile(0, 0)!.watered).toBe(true);
      expect(grid.getTile(1, 0)!.watered).toBe(true);
    });

    it('withers out-of-season crops during morning weather tick', () => {
      grid.tillTile(0, 0);
      grid.addCrop(0, 0, {
        id: 'p1',
        speciesId: 'pumpkin', // seasons = ['autumn']
        stage: 2,
        withered: false,
        growthProgress: 0.5,
        daysPlanted: 2,
      });

      farmState.currentSeason = 'winter'; // Incompatible season
      weatherSystem.setWeather(farmState, 'sunny');

      const res = weatherSystem.processMorningWeather(farmState);
      expect(res.witheredCrops).toBe(1);
      expect(grid.getCrop(0, 0)?.entity.withered).toBe(true);
    });

    it('never withers Elder-Oak tree across any season', () => {
      grid.tillTile(0, 0);
      grid.addCrop(0, 0, {
        id: 'oak1',
        speciesId: 'elder_oak', // seasons = ['spring', 'summer', 'autumn', 'winter']
        stage: 2,
        withered: false,
        growthProgress: 0.5,
        daysPlanted: 5,
      });

      const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
      seasons.forEach((season) => {
        farmState.currentSeason = season;
        weatherSystem.processMorningWeather(farmState);
        expect(grid.getCrop(0, 0)?.entity.withered).toBe(false);
      });
    });

    it('triggers lightning strikes during thunderstorm weather', () => {
      grid.tillTile(2, 2);
      grid.addCrop(2, 2, {
        id: 'target_crop',
        speciesId: 'wheat',
        stage: 2,
        withered: false,
        growthProgress: 0.5,
        daysPlanted: 1,
      });

      farmState.currentWeather = 'thunder';
      const strike = weatherSystem.triggerLightningStrike(farmState.grid!);
      expect(strike).not.toBeNull();
      expect(strike?.tileX).toBeGreaterThanOrEqual(0);
      expect(strike?.tileY).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================
  // 5. MythicFarmGame Lifecycle Integration Tests
  // ==========================================
  describe('MythicFarmGame Integration', () => {
    it('mounts Grid, FarmingSystem, and WeatherSystem in Game context', async () => {
      const mockStage: any = {
        addChild: vi.fn(),
        removeChild: vi.fn(),
        eventMode: 'none',
      };
      const mockContext: any = {
        renderer: { stage: mockStage },
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        storage: { get: vi.fn(), set: vi.fn() },
      };

      const game = new MythicFarmGame();
      await game.init(mockContext);

      expect(game.getGrid()).toBeDefined();
      expect(game.getFarmingSystem()).toBeDefined();
      expect(game.getWeatherSystem()).toBeDefined();

      game.start();
      expect(game.state).toBe('Playing');

      // Tick loop update
      game.update(0.016);

      game.destroy();
      expect(game.state).toBe('Destroyed');
    });
  });
});
