import type { StorageService } from '@services/storage/StorageService';
import type { FarmState } from '../types';
import { createDefaultFarmState } from '../config';

export class StorageManager {
  public static readonly STORAGE_KEY = 'mythic_farm_save_v1';

  /**
   * Saves complete FarmState object to storage.
   */
  public static saveFarmState(
    storage: StorageService,
    state: FarmState,
    key = StorageManager.STORAGE_KEY
  ): void {
    try {
      state.lastSavedTimestamp = Date.now();
      storage.set<FarmState>(key, state);
    } catch (err) {
      console.warn('[StorageManager] Failed to save farm state:', err);
    }
  }

  /**
   * Loads and validates FarmState from storage; returns null if missing or corrupted.
   */
  public static loadFarmState(
    storage: StorageService,
    key = StorageManager.STORAGE_KEY
  ): FarmState | null {
    try {
      const data = storage.get<FarmState | null>(key, null);
      if (!data || typeof data !== 'object') {
        return null;
      }
      return this.validateAndMergeState(data);
    } catch (err) {
      console.warn('[StorageManager] Failed to load farm state:', err);
      return null;
    }
  }

  /**
   * Clears saved farm state from storage.
   */
  public static clearFarmState(
    storage: StorageService,
    key = StorageManager.STORAGE_KEY
  ): void {
    try {
      storage.remove(key);
    } catch (err) {
      console.warn('[StorageManager] Failed to clear farm state:', err);
    }
  }

  /**
   * Constructs fresh initial FarmState.
   */
  public static createInitialFarmState(initialCoins = 500): FarmState {
    return createDefaultFarmState(initialCoins);
  }

  /**
   * Schema validation & default fallback merging to handle version/property changes safely.
   */
  public static validateAndMergeState(data: any): FarmState {
    const initial = this.createInitialFarmState();

    if (!data || typeof data !== 'object') {
      return initial;
    }

    const coins =
      typeof data.coins === 'number' && Number.isFinite(data.coins) && data.coins >= 0
        ? data.coins
        : initial.coins;
    const energy =
      typeof data.energy === 'number' && Number.isFinite(data.energy) && data.energy >= 0
        ? data.energy
        : initial.energy;
    const maxEnergy =
      typeof data.maxEnergy === 'number' && Number.isFinite(data.maxEnergy) && data.maxEnergy > 0
        ? data.maxEnergy
        : initial.maxEnergy;
    const farmLevel =
      typeof data.farmLevel === 'number' && Number.isFinite(data.farmLevel) && data.farmLevel >= 1
        ? data.farmLevel
        : initial.farmLevel;
    const farmExp =
      typeof data.farmExp === 'number' && Number.isFinite(data.farmExp) && data.farmExp >= 0
        ? data.farmExp
        : initial.farmExp;
    const currentDay =
      typeof data.currentDay === 'number' && Number.isFinite(data.currentDay) && data.currentDay >= 1
        ? data.currentDay
        : initial.currentDay;

    const validSeasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentSeason = validSeasons.includes(data.currentSeason)
      ? data.currentSeason
      : initial.currentSeason;

    const validWeathers = ['sunny', 'rain', 'thunder', 'astral_rain', 'blizzard'];
    const currentWeather = validWeathers.includes(data.currentWeather)
      ? data.currentWeather
      : initial.currentWeather;

    const isValidGrid =
      Array.isArray(data.grid) &&
      data.grid.length === 10 &&
      data.grid.every(
        (row: any) =>
          Array.isArray(row) &&
          row.length === 16 &&
          row.every((tile: any) => tile && typeof tile === 'object')
      );
    const grid = isValidGrid ? data.grid : initial.grid;

    const validatedInventory: Record<string, number> = { ...initial.inventory };
    if (data.inventory && typeof data.inventory === 'object') {
      for (const [key, val] of Object.entries(data.inventory)) {
        if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
          validatedInventory[key] = val;
        }
      }
    }

    const validatedMarketMultipliers: Record<string, number> = { ...initial.marketMultipliers };
    if (data.marketMultipliers && typeof data.marketMultipliers === 'object') {
      for (const [key, val] of Object.entries(data.marketMultipliers)) {
        if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
          validatedMarketMultipliers[key] = val;
        }
      }
    }

    return {
      ...initial,
      ...data,
      coins,
      energy,
      maxEnergy,
      farmLevel,
      farmExp,
      currentDay,
      currentSeason,
      currentWeather,
      toolTiers: { ...initial.toolTiers, ...(typeof data.toolTiers === 'object' && data.toolTiers ? data.toolTiers : {}) },
      inventory: validatedInventory,
      marketMultipliers: validatedMarketMultipliers,
      grid,
      stations: Array.isArray(data.stations) ? data.stations : initial.stations,
      animals: Array.isArray(data.animals) ? data.animals : initial.animals,
      activeOrders: Array.isArray(data.activeOrders) ? data.activeOrders : initial.activeOrders,
      lastSavedTimestamp:
        typeof data.lastSavedTimestamp === 'number' && Number.isFinite(data.lastSavedTimestamp)
          ? data.lastSavedTimestamp
          : Date.now(),
    };
  }
}
