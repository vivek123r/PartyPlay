import { describe, expect, it, vi } from 'vitest';
import manifest from './manifest';
import {
  CROP_SPECIES,
  TOOL_TIER_CONFIG,
  ANIMAL_CONFIG,
  WORKSHOP_RECIPES,
  LAND_PLOT_UNLOCK_COSTS,
  DEFAULT_FARM_STATE,
  createDefaultFarmState,
} from './config';
import { TextureGenerator } from './utils/TextureGenerator';
import { AudioSynthesizer } from './utils/AudioSynthesizer';
import { StorageManager } from './utils/StorageManager';
import MythicFarmGame from './index';

describe('Mythic Farm M1 Core Engine Framework & Types', () => {
  describe('GameManifest', () => {
    it('registers with single-player configuration', () => {
      expect(manifest.id).toBe('mythic-farm');
      expect(manifest.minPlayers).toBe(1);
      expect(manifest.maxPlayers).toBe(1);
      expect(manifest.capabilities.supportsPause).toBe(true);
      expect(manifest.defaultControls).toHaveLength(1);
    });
  });

  describe('Configuration & Data Models', () => {
    it('defines 6 distinct multi-stage crops with growth parameters', () => {
      const cropKeys = Object.keys(CROP_SPECIES);
      expect(cropKeys).toEqual([
        'wheat',
        'pumpkin',
        'crystal_berry',
        'dragonfruit',
        'elder_oak',
        'sunflower',
      ]);
      expect(CROP_SPECIES.wheat.growthDays).toBe(2);
      expect(CROP_SPECIES.pumpkin.giantChance).toBe(0.05);
      expect(CROP_SPECIES.crystal_berry.regrows).toBe(true);
      expect(CROP_SPECIES.dragonfruit.regrows).toBe(true);
      expect(CROP_SPECIES.elder_oak.category).toBe('tree');
    });

    it('defines 4 tool progression tiers', () => {
      expect(TOOL_TIER_CONFIG.basic.energyCost).toBe(5);
      expect(TOOL_TIER_CONFIG.copper.energyCost).toBe(4);
      expect(TOOL_TIER_CONFIG.gold.energyCost).toBe(3);
      expect(TOOL_TIER_CONFIG.titanium.energyCost).toBe(1);
      expect(TOOL_TIER_CONFIG.titanium.waterCapacity).toBe(Infinity);
    });

    it('defines 4 mythical livestock species and workshop recipes', () => {
      expect(Object.keys(ANIMAL_CONFIG)).toEqual([
        'golden_goat',
        'astral_bee',
        'silk_moth',
        'feathered_chocobo',
      ]);
      expect(WORKSHOP_RECIPES.preserves_jar.processingTime).toBe(30);
      expect(WORKSHOP_RECIPES.brewing_barrel.processingTime).toBe(60);
      expect(LAND_PLOT_UNLOCK_COSTS[0].coinCost).toBe(0);
    });

    it('creates valid default farm state', () => {
      const state = createDefaultFarmState(500);
      expect(state.coins).toBe(500);
      expect(state.energy).toBe(100);
      expect(state.grid?.length).toBe(10);
      expect(state.grid?.[0]?.length).toBe(16);
      expect(state.unlockedPlots).toEqual([0]);
    });
  });

  describe('TextureGenerator', () => {
    it('generates texture cache without errors', () => {
      const gen = new TextureGenerator();
      const texture = gen.getTexture('tile_untilled');
      expect(texture).toBeDefined();
      // Cache hit
      expect(gen.getTexture('tile_untilled')).toBe(texture);
      gen.clear();
    });
  });

  describe('StorageManager', () => {
    it('saves and loads farm state safely', () => {
      const storageMock: any = {
        data: {},
        get(key: string, defaultValue: any) {
          return this.data[key] !== undefined ? JSON.parse(this.data[key]) : defaultValue;
        },
        set(key: string, value: any) {
          this.data[key] = JSON.stringify(value);
        },
        remove(key: string) {
          delete this.data[key];
        },
      };

      const initialState = StorageManager.createInitialFarmState(500);
      initialState.coins = 750;
      StorageManager.saveFarmState(storageMock, initialState);

      const loaded = StorageManager.loadFarmState(storageMock);
      expect(loaded).not.toBeNull();
      expect(loaded?.coins).toBe(750);

      StorageManager.clearFarmState(storageMock);
      expect(StorageManager.loadFarmState(storageMock)).toBeNull();
    });

    it('recovers gracefully from corrupted save state', () => {
      const storageMock: any = {
        get() {
          return { coins: 'INVALID_COINS', currentDay: -5 };
        },
      };

      const loaded = StorageManager.loadFarmState(storageMock);
      expect(loaded).not.toBeNull();
      expect(loaded?.coins).toBe(500); // Fell back to default 500
      expect(loaded?.currentDay).toBe(1);
    });
  });

  describe('AudioSynthesizer', () => {
    it('invokes playTone for game sound events', () => {
      const audioMock: any = {
        playTone: vi.fn(),
      };

      const synth = new AudioSynthesizer(audioMock);
      synth.playTill();
      expect(audioMock.playTone).toHaveBeenCalledWith(130, 'sawtooth', 0.1, 'sfx', 0.25);

      synth.playHarvest();
      expect(audioMock.playTone).toHaveBeenCalled();
    });
  });

  describe('MythicFarmGame Lifecycle', () => {
    it('initializes, starts, pauses, resumes, and destroys cleanly', async () => {
      const game = new MythicFarmGame();
      const stageMock: any = {
        addChild: vi.fn(),
        eventMode: 'none',
      };
      const contextMock: any = {
        renderer: { stage: stageMock, viewport: { width: 480, height: 270 } },
        input: {},
        audio: { playTone: vi.fn() },
        storage: { get: vi.fn().mockReturnValue(null), set: vi.fn(), remove: vi.fn() },
        events: {},
        random: { next: () => 0.5 },
        asset: {},
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        modifiers: { initialCoins: 1000 },
        players: [{ id: 1, color: '#ff0000', name: 'Player 1' }],
      };

      await game.init(contextMock);
      expect(game.state).toBe('Ready');
      expect(game.getFarmState().coins).toBe(1000);

      game.start();
      expect(game.state).toBe('Playing');

      game.update(1 / 60);

      game.pause();
      expect(game.state).toBe('Paused');

      game.resume();
      expect(game.state).toBe('Playing');

      game.destroy();
      expect(game.state).toBe('Destroyed');
    });
  });
});
