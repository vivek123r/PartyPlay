import type { FarmState, ProcessingStation, ProcessingStationType, RecipeConfig } from '../types';
import type { Grid } from '../entities/Grid';
import type { AudioSynthesizer } from '../utils/AudioSynthesizer';
import { WORKSHOP_RECIPES } from '../config';

export const RECIPES: RecipeConfig[] = [
  {
    stationType: 'preserves_jar',
    inputItemId: 'pumpkin',
    outputItemId: 'pumpkin_jam',
    processingTimeSeconds: 15,
    priceFormula: (base) => base * 2 + 50,
  },
  {
    stationType: 'preserves_jar',
    inputItemId: 'crystal_berry',
    outputItemId: 'crystal_jelly',
    processingTimeSeconds: 20,
    priceFormula: (base) => base * 2.5 + 80,
  },
  {
    stationType: 'brewing_barrel',
    inputItemId: 'wheat',
    outputItemId: 'craft_beer',
    processingTimeSeconds: 25,
    priceFormula: (base) => base * 3,
  },
  {
    stationType: 'brewing_barrel',
    inputItemId: 'dragonfruit',
    outputItemId: 'dragon_wine',
    processingTimeSeconds: 40,
    priceFormula: (base) => base * 3.5 + 200,
  },
  {
    stationType: 'seed_maker',
    inputItemId: 'wheat',
    outputItemId: 'wheat_seed',
    processingTimeSeconds: 10,
    priceFormula: (base) => base,
  },
];

export class ProcessingSystem {
  private farmState: FarmState;
  private grid: Grid;
  private audioSynthesizer: AudioSynthesizer | null;
  private stations: ProcessingStation[] = [];

  constructor(farmState: FarmState, grid: Grid, audioSynthesizer: AudioSynthesizer | null = null) {
    this.farmState = farmState;
    this.grid = grid;
    this.audioSynthesizer = audioSynthesizer;
    this.stations = farmState.stations || [];
    this.farmState.stations = this.stations;
  }

  /**
   * Update all active processing stations each frame.
   */
  public update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;

    for (const station of this.stations) {
      if (!station.active || station.timerRemaining <= 0) continue;

      station.timerRemaining = Math.max(0, station.timerRemaining - dt);

      if (station.timerRemaining === 0) {
        // Station finished processing item!
        if (this.audioSynthesizer) {
          this.audioSynthesizer.playChimeSound();
        }
      }
    }
  }

  public addStation(type: ProcessingStationType, tileX: number, tileY: number): ProcessingStation {
    const station: ProcessingStation = {
      id: `station_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      tileX,
      tileY,
      timerRemaining: 0,
      active: false,
    };
    this.stations.push(station);
    if (!this.farmState.stations) {
      this.farmState.stations = this.stations;
    }
    return station;
  }

  /**
   * Insert raw crop item into processing station.
   */
  public insertInput(stationId: string, inputItemId: string): boolean {
    const station = this.stations.find((s) => s.id === stationId);
    if (!station || station.inputItem || station.timerRemaining > 0) return false;

    const normalizedInput = inputItemId.replace(/^crop_/, '').replace(/^product_/, '');

    // Validate station input item eligibility
    if (station.type === 'loom' && normalizedInput !== 'silk_thread') return false;
    if (station.type === 'mill' && !['wheat', 'sunflower'].includes(normalizedInput)) return false;
    if (station.type === 'brewing_barrel' && !['wheat', 'dragonfruit', 'apple', 'grape'].includes(normalizedInput)) return false;
    if (station.type === 'preserves_jar' && !['pumpkin', 'crystal_berry', 'tomato', 'apple', 'strawberry'].includes(normalizedInput)) return false;
    if (station.type === 'seed_maker' && !['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'sunflower'].includes(normalizedInput)) return false;

    // Check inventory count
    const inv = this.farmState.inventory;
    if (typeof inv === 'object' && !Array.isArray(inv)) {
      const directCount = inv[inputItemId];
      const cropCount = inv[`crop_${normalizedInput}`];
      const prodCount = inv[`product_${normalizedInput}`];
      const totalCount = (directCount || 0) + (cropCount || 0) + (prodCount || 0);

      if (totalCount <= 0) return false;

      if (directCount && directCount > 0) inv[inputItemId]--;
      else if (cropCount && cropCount > 0) inv[`crop_${normalizedInput}`]--;
      else if (prodCount && prodCount > 0) inv[`product_${normalizedInput}`]--;
    }

    let recipe = RECIPES.find(
      (r) => r.stationType === station.type && (r.inputItemId === inputItemId || r.inputItemId === normalizedInput)
    );
    if (!recipe) {
      const fallbackRecipe = (WORKSHOP_RECIPES as any)[station.type];
      recipe = {
        stationType: station.type,
        inputItemId,
        outputItemId: fallbackRecipe?.outputItem || `artisan_${normalizedInput}`,
        processingTimeSeconds: fallbackRecipe?.processingTime || 20,
        priceFormula: fallbackRecipe?.priceFormula || ((b: number) => b * 2),
      };
    }

    station.inputItem = inputItemId;
    station.outputItem = recipe.outputItemId;
    station.processingTimeTotal = recipe.processingTimeSeconds;
    station.timerRemaining = recipe.processingTimeSeconds;
    station.active = true;

    if (this.audioSynthesizer) {
      this.audioSynthesizer.playBuildSound();
    }
    return true;
  }

  /**
   * Harvest finished artisan product from station.
   */
  public harvestOutput(stationId: string): string | null {
    const station = this.stations.find((s) => s.id === stationId);
    if (!station || !station.outputItem || station.timerRemaining > 0) return null;

    const item = station.outputItem;

    // Add to inventory
    const inv = this.farmState.inventory;
    if (typeof inv === 'object' && !Array.isArray(inv)) {
      inv[item] = (inv[item] || 0) + 1;
    }

    station.inputItem = undefined;
    station.outputItem = undefined;
    station.timerRemaining = 0;
    station.active = false;

    if (this.audioSynthesizer) {
      this.audioSynthesizer.playHarvestSound();
    }
    return item;
  }

  /**
   * Build a new processing station on grid.
   */
  public placeStation(tileX: number, tileY: number, type: ProcessingStationType): boolean {
    const tile = this.grid.getTile(tileX, tileY);
    if (!tile || tile.station || tile.crop || tile.building) return false;

    const station: ProcessingStation = {
      id: `station-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      tileX,
      tileY,
      timerRemaining: 0,
      active: false,
    };

    tile.station = station;
    this.stations.push(station);

    this.grid.updateTileGraphics(tile);
    if (this.audioSynthesizer) {
      this.audioSynthesizer.playBuildSound();
    }
    return true;
  }

  public getStations(): ProcessingStation[] {
    return this.stations;
  }
}
