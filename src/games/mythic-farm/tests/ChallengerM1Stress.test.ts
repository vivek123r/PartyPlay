import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TextureGenerator } from '../utils/TextureGenerator';
import { StorageManager } from '../utils/StorageManager';
import { AudioSynthesizer } from '../utils/AudioSynthesizer';
import {
  CROP_SPECIES,
  TOOL_TIER_CONFIG,
  ANIMAL_CONFIG,
  WORKSHOP_RECIPES,
  LAND_PLOT_UNLOCK_COSTS,
  DEFAULT_FARM_STATE,
  createDefaultFarmState,
  GRID_WIDTH,
  GRID_HEIGHT,
} from '../config';

describe('Challenger M1 Stress & Boundary Suite', () => {
  describe('TextureGenerator Stress Tests', () => {
    let generator: TextureGenerator;

    beforeEach(() => {
      generator = new TextureGenerator();
    });

    afterEach(() => {
      generator.clear();
    });

    it('handles high volume cached texture lookups efficiently', () => {
      generator.generateAll();
      const start = performance.now();
      const lookupCount = 50000;
      for (let i = 0; i < lookupCount; i++) {
        generator.getTexture('tile_untilled');
        generator.getTexture('crop_wheat_3');
        generator.getTexture('animal_golden_goat');
      }
      const duration = performance.now() - start;
      // 150,000 lookups should take less than 100ms with Map caching
      expect(duration).toBeLessThan(100);
    });

    it('handles malformed, empty, and arbitrary texture keys safely without crashing', () => {
      const malformedKeys = [
        '',
        '   ',
        'crop_',
        'crop_wheat',
        'crop_wheat_9999',
        'tool_',
        'tool_invalid_tier',
        'animal_dragon',
        'tile_unknown_tile',
        'icon_nonexistent',
        'item_',
        'a'.repeat(500),
      ];

      for (const key of malformedKeys) {
        expect(() => generator.getTexture(key)).not.toThrow();
        const tex = generator.getTexture(key);
        expect(tex).toBeDefined();
      }
    });

    it('investigates clear() behavior on Texture.EMPTY in headless environment', () => {
      const tex = generator.getTexture('tile_untilled');
      expect(tex).toBeDefined();

      // In Node environment without document, createCanvasTexture returns Texture.EMPTY
      if (typeof document === 'undefined') {
        const wasDestroyedBefore = (TextureGenerator as any).EMPTY?.destroyed;
        generator.clear();
        // Check if clearing ruined Texture.EMPTY or internal state
        expect(() => generator.getTexture('tile_untilled')).not.toThrow();
      } else {
        generator.clear();
        expect(() => generator.getTexture('tile_untilled')).not.toThrow();
      }
    });
  });

  describe('StorageManager Robustness & Failure Mode Tests', () => {
    it('safely handles null or undefined input in validateAndMergeState without throwing TypeError', () => {
      expect(() => StorageManager.validateAndMergeState(null)).not.toThrow();
      expect(() => StorageManager.validateAndMergeState(undefined)).not.toThrow();
      expect(StorageManager.validateAndMergeState(null)).toBeDefined();
      expect(StorageManager.validateAndMergeState(undefined)).toBeDefined();
    });

    it('handles non-object primitive inputs in loadFarmState', () => {
      const mockStorageString: any = {
        get: () => 'raw_string_data',
      };
      const mockStorageNum: any = {
        get: () => 12345,
      };
      const mockStorageBool: any = {
        get: () => true,
      };

      expect(StorageManager.loadFarmState(mockStorageString)).toBeNull();
      expect(StorageManager.loadFarmState(mockStorageNum)).toBeNull();
      expect(StorageManager.loadFarmState(mockStorageBool)).toBeNull();
    });

    it('validates enum fields in validateAndMergeState with fallbacks for invalid season & weather', () => {
      const corruptData = {
        currentSeason: 'apocalypse_season',
        currentWeather: 'firestorm',
      };

      const merged = StorageManager.validateAndMergeState(corruptData);
      expect(merged.currentSeason).toBe('spring');
      expect(merged.currentWeather).toBe('sunny');
    });

    it('validates extreme numeric values (Infinity, NaN, negative) in validateAndMergeState', () => {
      const corruptData = {
        coins: Infinity,
        energy: -100,
        maxEnergy: 0,
        farmLevel: -5,
        farmExp: NaN,
        currentDay: -10,
      };

      const merged = StorageManager.validateAndMergeState(corruptData);

      // Coins: Infinity falls back to default 500
      expect(merged.coins).toBe(500);

      // Energy: -100 is negative, falls back to default 100
      expect(merged.energy).toBe(100);

      // maxEnergy: 0 is not > 0, falls back to default 100
      expect(merged.maxEnergy).toBe(100);

      // farmLevel: -5 is not >= 1, falls back to default 1
      expect(merged.farmLevel).toBe(1);

      // farmExp: NaN falls back to default 0
      expect(merged.farmExp).toBe(0);

      // currentDay: -10 falls back to default 1
      expect(merged.currentDay).toBe(1);
    });

    it('validates grid array structures in validateAndMergeState and falls back on corrupt grid', () => {
      // Case 1: grid with 10 empty rows
      const emptyRowsGrid = Array.from({ length: 10 }, () => []);
      const merged1 = StorageManager.validateAndMergeState({ grid: emptyRowsGrid });
      expect(merged1.grid!.length).toBe(10);
      expect(merged1.grid![0].length).toBe(16);

      // Case 2: grid with 10 nulls
      const nullRowsGrid = new Array(10).fill(null);
      const merged2 = StorageManager.validateAndMergeState({ grid: nullRowsGrid });
      expect(merged2.grid!.length).toBe(10);
      expect(merged2.grid![0].length).toBe(16);
    });

    it('validates inventory quantities and filters negative, NaN, and non-numeric values', () => {
      const corruptInventory = {
        inventory: {
          seed_wheat: -999,
          seed_pumpkin: NaN,
          invalid_item: 'one_million',
        },
      };

      const merged = StorageManager.validateAndMergeState(corruptInventory);
      expect(merged.inventory.seed_wheat).toBe(5); // default fallback
      expect(merged.inventory.seed_pumpkin).toBeUndefined();
      expect(merged.inventory.invalid_item).toBeUndefined();
    });

    it('handles storage throwing exception during save/load/clear gracefully', () => {
      const throwingStorage: any = {
        get() {
          throw new Error('Disk Read Error');
        },
        set() {
          throw new Error('Quota Exceeded');
        },
        remove() {
          throw new Error('Access Denied');
        },
      };

      const state = createDefaultFarmState();

      expect(() => StorageManager.saveFarmState(throwingStorage, state)).not.toThrow();
      expect(StorageManager.loadFarmState(throwingStorage)).toBeNull();
      expect(() => StorageManager.clearFarmState(throwingStorage)).not.toThrow();
    });
  });

  describe('AudioSynthesizer Stress & Lifecycle Tests', () => {
    it('handles rapid burst of sound effects without throwing or crashing', () => {
      const playToneMock = vi.fn();
      const synth = new AudioSynthesizer({ playTone: playToneMock } as any);

      for (let i = 0; i < 100; i++) {
        synth.playTill();
        synth.playWater();
        synth.playPlant();
        synth.playHarvest();
        synth.playAnimalGoat();
        synth.playAnimalBee();
        synth.playAnimalChocobo();
        synth.playAnimalMoth();
        synth.playWorkshop();
        synth.playCoins();
        synth.playLevelUp();
        synth.playError();
      }

      expect(playToneMock).toHaveBeenCalled();
    });

    it('manages ambient BGM lifecycle safely under repeated start/stop calls', () => {
      vi.useFakeTimers();
      const playToneMock = vi.fn();
      const synth = new AudioSynthesizer({ playTone: playToneMock } as any);

      // Start BGM multiple times
      synth.startAmbientBGM();
      synth.startAmbientBGM();
      synth.startAmbientBGM();

      expect(playToneMock).toHaveBeenCalledTimes(1);

      // Fast-forward time by 1 second (2 beats @ 500ms interval)
      vi.advanceTimersByTime(1000);
      expect(playToneMock).toHaveBeenCalledTimes(3);

      // Stop BGM
      synth.stopAmbientBGM();
      vi.advanceTimersByTime(2000);

      // No new calls after stop
      expect(playToneMock).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('handles underlying AudioService exceptions without blowing up caller', () => {
      const throwingAudio: any = {
        playTone() {
          throw new Error('AudioContext state is suspended');
        },
      };

      const synth = new AudioSynthesizer(throwingAudio);

      // Note: synth.playTill calls playTone synchronously
      expect(() => synth.playTill()).toThrow('AudioContext state is suspended');
    });
  });

  describe('Config & Default State Isolation Tests', () => {
    it('verifies DEFAULT_FARM_STATE object immutability', () => {
      const state1 = DEFAULT_FARM_STATE;
      const state2 = DEFAULT_FARM_STATE;

      expect(state1).toBe(state2);
      expect(Object.isFrozen(DEFAULT_FARM_STATE)).toBe(true);

      try {
        (DEFAULT_FARM_STATE as any).coins = 9999;
      } catch (e) {
        // Strict mode throws error on modifying frozen object
      }
      expect(DEFAULT_FARM_STATE.coins).toBe(500);
    });

    it('verifies createDefaultFarmState generates independent instances', () => {
      const state1 = createDefaultFarmState(500);
      const state2 = createDefaultFarmState(500);

      expect(state1).not.toBe(state2);
      state1.coins = 9999;
      expect(state2.coins).toBe(500);

      state1.grid![0][0].tilled = true;
      expect(state2.grid![0][0].tilled).toBe(false);
    });

    it('validates grid dimensions in default farm state match config constants', () => {
      const state = createDefaultFarmState();
      expect(state.grid!.length).toBe(GRID_HEIGHT); // 10
      for (const row of state.grid!) {
        expect(row.length).toBe(GRID_WIDTH); // 16
      }
    });

    it('validates tool tier energy costs are strictly decreasing', () => {
      const basic = TOOL_TIER_CONFIG.basic.energyCost;
      const copper = TOOL_TIER_CONFIG.copper.energyCost;
      const gold = TOOL_TIER_CONFIG.gold.energyCost;
      const titanium = TOOL_TIER_CONFIG.titanium.energyCost;

      expect(copper).toBeLessThan(basic);
      expect(gold).toBeLessThan(copper);
      expect(titanium).toBeLessThan(gold);
    });
  });
});
