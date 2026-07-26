import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Grid } from '../entities/Grid';
import { Crop } from '../entities/Crop';
import { FarmingSystem } from '../systems/FarmingSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { TextureGenerator } from '../utils/TextureGenerator';
import { StorageManager } from '../utils/StorageManager';
import { createDefaultFarmState, CROP_SPECIES, DAYS_PER_SEASON, SEASONS_ORDER } from '../config';
import type { FarmState, CropEntity, Season, Weather } from '../types';

describe('Empirical Challenge: WeatherSystem & Seasonal Transitions (M2)', () => {
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
  // 1. Multi-Year Seasonal Progression & Wrap-Around
  // ==========================================
  describe('Multi-Year Seasonal Progression & Calendar Wrap-Around', () => {
    it('advances calendar predictably through 100 days across 4 full years (28 days/year)', () => {
      // 1 year = 4 seasons * 7 days = 28 days
      // 100 days = 3 full years (84 days) + 16 days into Year 4
      // Day 100: (100 - 1) / 7 = 14.14 -> Math.floor(14.14) = 14 -> 14 % 4 = 2 ('autumn')
      
      let expectedSeason: Season = 'spring';
      expect(farmState.currentDay).toBe(1);
      expect(farmState.currentSeason).toBe('spring');

      for (let day = 1; day <= 100; day++) {
        // Calculate expected season for currentDay
        const seasonIndex = Math.floor((farmState.currentDay - 1) / DAYS_PER_SEASON) % SEASONS_ORDER.length;
        expectedSeason = SEASONS_ORDER[seasonIndex];

        expect(farmState.currentSeason).toBe(expectedSeason);

        if (day < 100) {
          const transition = weatherSystem.advanceDay(farmState);
          // Day N+1
          const nextSeasonIndex = Math.floor((farmState.currentDay - 1) / DAYS_PER_SEASON) % SEASONS_ORDER.length;
          const nextExpectedSeason = SEASONS_ORDER[nextSeasonIndex];

          if (transition.seasonChanged) {
            expect(transition.previousSeason).not.toBe(transition.newSeason);
            expect(transition.newSeason).toBe(nextExpectedSeason);
          } else {
            expect(transition.previousSeason).toBe(transition.newSeason);
          }
        }
      }

      expect(farmState.currentDay).toBe(100);
      expect(farmState.currentSeason).toBe('autumn');
    });

    it('handles Winter -> Spring seasonal wrap-around at day boundaries (Day 28 -> Day 29)', () => {
      farmState.currentDay = 28;
      farmState.currentSeason = 'winter';

      const result = weatherSystem.advanceDay(farmState);

      expect(farmState.currentDay).toBe(29);
      expect(result.seasonChanged).toBe(true);
      expect(result.previousSeason).toBe('winter');
      expect(result.newSeason).toBe('spring');
      expect(farmState.currentSeason).toBe('spring');
    });

    it('maintains seasonal wrap-around integrity up to 1000 days (35+ years)', () => {
      farmState.currentDay = 1;
      farmState.currentSeason = 'spring';

      for (let d = 1; d < 1000; d++) {
        const prevSeason = farmState.currentSeason;
        const res = weatherSystem.advanceDay(farmState);

        const expectedSeasonIdx = Math.floor((d) / DAYS_PER_SEASON) % 4; // d is now currentDay - 1
        const expectedSeason = SEASONS_ORDER[expectedSeasonIdx];

        expect(farmState.currentSeason).toBe(expectedSeason);
        if (prevSeason !== expectedSeason) {
          expect(res.seasonChanged).toBe(true);
          expect(res.newSeason).toBe(expectedSeason);
        }
      }

      expect(farmState.currentDay).toBe(1000);
    });

    it('identifies currentDay double-increment discrepancy if FarmingSystem and WeatherSystem are both called', () => {
      // EMPIRICAL DISCOVERY TEST:
      // FarmingSystem.advanceDay() increments state.currentDay by 1.
      // WeatherSystem.advanceDay(farmState) ALSO increments state.currentDay by 1.
      const initialDay = farmState.currentDay; // 1

      farmingSystem.advanceDay(); // advances day in farming system
      expect(farmState.currentDay).toBe(initialDay + 1); // 2

      weatherSystem.advanceDay(farmState); // advances day in weather system
      expect(farmState.currentDay).toBe(initialDay + 2); // 3! (Double increment)
    });
  });

  // ==========================================
  // 2. Crop Withering Engine across All 6 Species
  // ==========================================
  describe('Crop Withering Engine for All 6 Species', () => {
    const speciesList = ['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'elder_oak', 'sunflower'];

    it('verifies season compatibility specs for all 6 species in config', () => {
      expect(CROP_SPECIES['wheat'].seasons).toEqual(['spring', 'autumn']);
      expect(CROP_SPECIES['pumpkin'].seasons).toEqual(['autumn']);
      expect(CROP_SPECIES['crystal_berry'].seasons).toEqual(['winter', 'spring']);
      expect(CROP_SPECIES['dragonfruit'].seasons).toEqual(['summer']);
      expect(CROP_SPECIES['elder_oak'].seasons).toEqual(['spring', 'summer', 'autumn', 'winter']);
      expect(CROP_SPECIES['sunflower'].seasons).toEqual(['summer', 'spring']);
    });

    it('tests withering behavior for all 6 crop species across all 4 seasons', () => {
      const allSeasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

      speciesList.forEach((speciesId, tileIdx) => {
        const spec = CROP_SPECIES[speciesId];

        allSeasons.forEach((season) => {
          const x = tileIdx;
          const y = 0;

          // Clear existing crop & till tile
          grid.removeCrop(x, y);
          grid.tillTile(x, y);

          const cropEntity: CropEntity = {
            id: `test_${speciesId}_${season}`,
            speciesId,
            stage: 1,
            withered: false,
            growthProgress: 0.5,
            daysPlanted: 1,
          };
          const crop = grid.addCrop(x, y, cropEntity);

          farmState.currentSeason = season;
          weatherSystem.setWeather(farmState, 'sunny');

          const weatherResult = weatherSystem.processMorningWeather(farmState);
          const isValidSeason = spec.seasons.includes(season);

          if (isValidSeason) {
            expect(crop.entity.withered).toBe(false);
            expect(crop.entity.stage).not.toBe(4);
          } else {
            expect(weatherResult.witheredCrops).toBeGreaterThanOrEqual(1);
            expect(crop.entity.withered).toBe(true);
            expect(crop.entity.stage).toBe(4);
          }
        });
      });
    });

    it('guarantees Ancient Elder-Oak trees NEVER wither in any season (Spring, Summer, Autumn, Winter)', () => {
      grid.tillTile(0, 0);
      const oakCrop = grid.addCrop(0, 0, {
        id: 'tree_elder_oak',
        speciesId: 'elder_oak',
        stage: 2,
        withered: false,
        growthProgress: 0.5,
        daysPlanted: 4,
      });

      const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
      for (const season of seasons) {
        farmState.currentSeason = season;
        weatherSystem.setWeather(farmState, 'sunny');

        const result = weatherSystem.processMorningWeather(farmState);
        expect(result.witheredCrops).toBe(0);
        expect(oakCrop.entity.withered).toBe(false);

        // Also test advanceGrowth
        oakCrop.advanceGrowth(true, season, 'sunny');
        expect(oakCrop.entity.withered).toBe(false);
      }
    });

    it('prevents withered crops from being harvested and allows scythe clearing', () => {
      grid.tillTile(0, 0);
      const crop = grid.addCrop(0, 0, {
        id: 'withered_pumpkin',
        speciesId: 'pumpkin',
        stage: 4,
        withered: true,
        growthProgress: 1.0,
        daysPlanted: 5,
      });

      // Attempting harvest throws error
      expect(() => crop.harvest()).toThrow('Crop is not harvestable.');
      expect(farmingSystem.harvestCrop(0, 0)).toBe(false);

      // Scythe clears withered crop
      farmState.toolTiers.scythe = 'basic';
      const scytheResult = farmingSystem.executeToolAction('scythe', 0, 0);
      expect(scytheResult).toBe(true);
      expect(grid.getCrop(0, 0)).toBeNull();
    });

    it('ensures withered crops do NOT un-wither when the season returns to a compatible season', () => {
      grid.tillTile(0, 0);
      const wheatCrop = grid.addCrop(0, 0, {
        id: 'wheat_crop',
        speciesId: 'wheat', // Seasons: spring, autumn
        stage: 1,
        withered: false,
        growthProgress: 0.5,
        daysPlanted: 1,
      });

      // Wither in Summer
      farmState.currentSeason = 'summer';
      weatherSystem.processMorningWeather(farmState);
      expect(wheatCrop.entity.withered).toBe(true);
      expect(wheatCrop.entity.stage).toBe(4);

      // Advance to Autumn (compatible season for wheat)
      farmState.currentSeason = 'autumn';
      weatherSystem.processMorningWeather(farmState);
      wheatCrop.advanceGrowth(true, 'autumn', 'sunny');

      // Crop MUST remain withered
      expect(wheatCrop.entity.withered).toBe(true);
      expect(wheatCrop.entity.stage).toBe(4);
    });
  });

  // ==========================================
  // 3. Rain Auto-Watering Engine
  // ==========================================
  describe('Rain Auto-Watering Engine & Hydration', () => {
    it('automatically waters ALL tilled tiles during rain, thunder, and astral_rain weather', () => {
      const rainyWeathers: Weather[] = ['rain', 'rainy', 'thunder', 'thunderstorm', 'astral_rain'];

      for (const w of rainyWeathers) {
        // Reset grid
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            grid.tillTile(c, r);
            grid.getTile(c, r)!.watered = false;
          }
        }

        weatherSystem.setWeather(farmState, w);
        const result = weatherSystem.processMorningWeather(farmState);

        expect(result.wateredTiles).toBe(25);
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            expect(grid.getTile(c, r)!.watered).toBe(true);
          }
        }
      }
    });

    it('does NOT auto-water tilled tiles during sunny or blizzard weather', () => {
      const dryWeathers: Weather[] = ['sunny', 'blizzard'];

      for (const w of dryWeathers) {
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            grid.tillTile(c, r);
            grid.getTile(c, r)!.watered = false;
          }
        }

        weatherSystem.setWeather(farmState, w);
        const result = weatherSystem.processMorningWeather(farmState);

        expect(result.wateredTiles).toBe(0);
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            expect(grid.getTile(c, r)!.watered).toBe(false);
          }
        }
      }
    });

    it('hydrates crops automatically during rain without player manual watering', () => {
      grid.tillTile(0, 0);
      const crop = grid.addCrop(0, 0, {
        id: 'rain_crop',
        speciesId: 'wheat',
        stage: 0,
        withered: false,
        growthProgress: 0,
        daysPlanted: 0,
      });

      // Tile is NOT manually watered
      expect(grid.getTile(0, 0)!.watered).toBe(false);

      farmState.currentSeason = 'spring';
      weatherSystem.setWeather(farmState, 'rain');
      weatherSystem.processMorningWeather(farmState);

      expect(grid.getTile(0, 0)!.watered).toBe(true);
      expect(crop.entity.wateredToday).toBe(true);

      crop.advanceGrowth(grid.getTile(0, 0)!.watered, 'spring', 'rain');
      expect(crop.entity.growthProgress).toBe(0.5);
    });

    it('only waters tilled tiles and ignores untilled or locked tiles during rain', () => {
      // 0,0 is untilled, 1,0 is tilled, 15,9 is locked untilled
      grid.tillTile(1, 0);
      grid.getTile(1, 0)!.watered = false;

      weatherSystem.setWeather(farmState, 'rain');
      const result = weatherSystem.processMorningWeather(farmState);

      expect(result.wateredTiles).toBe(1);
      expect(grid.getTile(0, 0)!.watered).toBe(false);
      expect(grid.getTile(1, 0)!.watered).toBe(true);
      expect(grid.getTile(15, 9)!.watered).toBe(false);
    });
  });

  // ==========================================
  // 4. Lightning Strike Frequency & Impact Engine
  // ==========================================
  describe('Lightning Strike Frequency & Impact Engine', () => {
    it('empirically verifies lightning strike probability during thunder (~35%) via Monte Carlo simulation (10,000 samples)', () => {
      const samples = 10000;
      let strikes = 0;

      farmState.currentWeather = 'thunder';

      for (let i = 0; i < samples; i++) {
        const result = weatherSystem.processMorningWeather(farmState);
        if (result.lightningStruck) {
          strikes++;
        }
      }

      const strikeProbability = strikes / samples;
      // Expected probability: 0.35
      // Allow 95% confidence interval margin of error [0.33, 0.37]
      expect(strikeProbability).toBeGreaterThanOrEqual(0.32);
      expect(strikeProbability).toBeLessThanOrEqual(0.38);
    });

    it('never triggers lightning strikes during sunny, rain, astral_rain, or blizzard weather', () => {
      const nonThunderWeathers: Weather[] = ['sunny', 'rain', 'astral_rain', 'blizzard'];

      for (const w of nonThunderWeathers) {
        farmState.currentWeather = w;
        for (let i = 0; i < 500; i++) {
          const result = weatherSystem.processMorningWeather(farmState);
          expect(result.lightningStruck).toBe(false);
        }
      }
    });

    it('withers target crop when lightning strikes a tile containing a crop', () => {
      // Plant crop at tile (2, 2)
      grid.tillTile(2, 2);
      const crop = grid.addCrop(2, 2, {
        id: 'lightning_target',
        speciesId: 'wheat',
        stage: 2,
        withered: false,
        growthProgress: 0.8,
        daysPlanted: 2,
      });

      // Force lightning strike directly on (2, 2) using spy
      // randR: Math.floor(0.25 * 10) = 2
      // randC: Math.floor(0.15 * 16) = 2
      const spy = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.25)  // for randR = 2
        .mockReturnValueOnce(0.15); // for randC = 2

      const strike = weatherSystem.triggerLightningStrike(farmState.grid!);

      expect(strike).not.toBeNull();
      expect(strike?.tileX).toBe(2);
      expect(strike?.tileY).toBe(2);
      expect(strike?.struckCrop).toBe(true);
      expect(crop.entity.withered).toBe(true);
      expect(crop.entity.stage).toBe(4);

      spy.mockRestore();
    });

    it('safely handles lightning strikes on empty tilled or untilled tiles without throwing errors', () => {
      // No crops planted anywhere on grid
      for (let i = 0; i < 100; i++) {
        expect(() => {
          const strike = weatherSystem.triggerLightningStrike(farmState.grid!);
          expect(strike).not.toBeNull();
          expect(strike?.struckCrop).toBe(false);
        }).not.toThrow();
      }
    });

    it('handles empty or null grid in triggerLightningStrike gracefully', () => {
      expect(weatherSystem.triggerLightningStrike([])).toBeNull();
      expect(weatherSystem.triggerLightningStrike(null as any)).toBeNull();
    });
  });

  // ==========================================
  // 5. Seasonal Weather Generation Distributions
  // ==========================================
  describe('Seasonal Weather Distribution Probabilities', () => {
    it('empirically verifies weather distributions per season via 40,000 Monte Carlo generations', () => {
      const samples = 10000;

      // 1. Spring: sunny (0.5), rain (0.3), thunder (0.1), astral_rain (0.1)
      const springCounts: Record<string, number> = { sunny: 0, rain: 0, thunder: 0, astral_rain: 0, blizzard: 0 };
      for (let i = 0; i < samples; i++) {
        const w = weatherSystem.generateWeatherForSeason('spring');
        springCounts[w] = (springCounts[w] || 0) + 1;
      }
      expect(springCounts.sunny / samples).toBeCloseTo(0.50, 1);
      expect(springCounts.rain / samples).toBeCloseTo(0.30, 1);
      expect(springCounts.thunder / samples).toBeCloseTo(0.10, 1);
      expect(springCounts.astral_rain / samples).toBeCloseTo(0.10, 1);

      // 2. Summer: sunny (0.6), rain (0.2), thunder (0.15), astral_rain (0.05)
      const summerCounts: Record<string, number> = { sunny: 0, rain: 0, thunder: 0, astral_rain: 0, blizzard: 0 };
      for (let i = 0; i < samples; i++) {
        const w = weatherSystem.generateWeatherForSeason('summer');
        summerCounts[w] = (summerCounts[w] || 0) + 1;
      }
      expect(summerCounts.sunny / samples).toBeCloseTo(0.60, 1);
      expect(summerCounts.rain / samples).toBeCloseTo(0.20, 1);
      expect(summerCounts.thunder / samples).toBeCloseTo(0.15, 1);
      expect(summerCounts.astral_rain / samples).toBeCloseTo(0.05, 1);

      // 3. Autumn: sunny (0.45), rain (0.35), thunder (0.10), astral_rain (0.10)
      const autumnCounts: Record<string, number> = { sunny: 0, rain: 0, thunder: 0, astral_rain: 0, blizzard: 0 };
      for (let i = 0; i < samples; i++) {
        const w = weatherSystem.generateWeatherForSeason('autumn');
        autumnCounts[w] = (autumnCounts[w] || 0) + 1;
      }
      expect(autumnCounts.sunny / samples).toBeCloseTo(0.45, 1);
      expect(autumnCounts.rain / samples).toBeCloseTo(0.35, 1);
      expect(autumnCounts.thunder / samples).toBeCloseTo(0.10, 1);

      // 4. Winter: sunny (0.30), rain (0.10), astral_rain (0.10), blizzard (0.50)
      const winterCounts: Record<string, number> = { sunny: 0, rain: 0, thunder: 0, astral_rain: 0, blizzard: 0 };
      for (let i = 0; i < samples; i++) {
        const w = weatherSystem.generateWeatherForSeason('winter');
        winterCounts[w] = (winterCounts[w] || 0) + 1;
      }
      expect(winterCounts.sunny / samples).toBeCloseTo(0.30, 1);
      expect(winterCounts.rain / samples).toBeCloseTo(0.10, 1);
      expect(winterCounts.astral_rain / samples).toBeCloseTo(0.10, 1);
      expect(winterCounts.blizzard / samples).toBeCloseTo(0.50, 1);
    });
  });

  // ==========================================
  // 6. Comprehensive 100-Day Multi-Year Simulation Loop
  // ==========================================
  describe('Comprehensive 100-Day Multi-Year Simulation Stress Harness', () => {
    it('executes a full 100-day simulation loop with crop lifecycle, weather ticks, and save/load persistence', () => {
      // Initialize 6 test plots with different crop species
      const speciesList = ['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'elder_oak', 'sunflower'];
      speciesList.forEach((speciesId, idx) => {
        grid.tillTile(idx, 0);
        grid.addCrop(idx, 0, {
          id: `sim_crop_${speciesId}`,
          speciesId,
          stage: 0,
          withered: false,
          growthProgress: 0,
          daysPlanted: 0,
        });
      });

      let totalWateredTicks = 0;
      let totalWitheredEvents = 0;
      let totalLightningStrikes = 0;

      for (let day = 1; day <= 100; day++) {
        // 1. Generate new daily weather based on current season
        const dailyWeather = weatherSystem.generateWeatherForSeason(farmState.currentSeason);
        weatherSystem.setWeather(farmState, dailyWeather);

        // 2. Process morning weather effects (rain hydration, crop withering, lightning)
        const morningSummary = weatherSystem.processMorningWeather(farmState);
        totalWateredTicks += morningSummary.wateredTiles;
        totalWitheredEvents += morningSummary.witheredCrops;
        if (morningSummary.lightningStruck) totalLightningStrikes++;

        // 3. Advance growth for crops
        for (let idx = 0; idx < speciesList.length; idx++) {
          const crop = grid.getCrop(idx, 0);
          if (crop && !crop.entity.withered) {
            const tile = grid.getTile(idx, 0)!;
            crop.advanceGrowth(
              tile.watered,
              farmState.currentSeason,
              farmState.currentWeather
            );
          }
        }

        // 4. End of day: reset moisture and advance day calendar
        grid.resetDailyMoisture();
        weatherSystem.advanceDay(farmState);
      }

      expect(farmState.currentDay).toBe(101);
      expect(totalWateredTicks).toBeGreaterThan(0);
      
      // Elder Oak at tile index 4 MUST remain alive and healthy through all 100 days
      const elderOakCrop = grid.getCrop(4, 0);
      expect(elderOakCrop).not.toBeNull();
      expect(elderOakCrop?.entity.withered).toBe(false);
      expect(elderOakCrop?.entity.stage).toBe(3); // Harvestable mature tree!

      // Validate save/load persistence at Day 101
      const mockStorage: Record<string, string> = {};
      const storageAdapter = {
        prefix: 'test',
        namespace: 'test',
        get: (key: string) => mockStorage[key] || null,
        set: (key: string, val: string) => { mockStorage[key] = val; },
        remove: (key: string) => { delete mockStorage[key]; },
      };

      StorageManager.saveFarmState(storageAdapter as any, farmState);
      const reloadedState = StorageManager.loadFarmState(storageAdapter as any);

      expect(reloadedState).not.toBeNull();
      expect(reloadedState?.currentDay).toBe(101);
      expect(reloadedState?.currentSeason).toBe('autumn');
    });
  });
});
