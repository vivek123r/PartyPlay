import type { FarmState, ProcessingStation, ProcessingStationType, RecipeConfig } from '../types';
import type { Grid } from '../entities/Grid';
import type { AudioSynthesizer } from '../utils/AudioSynthesizer';

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

  /**
   * Insert raw crop item into processing station.
   */
  public insertInput(stationId: string, inputItemId: string): boolean {
    const station = this.stations.find((s) => s.id === stationId);
    if (!station || station.inputItem || station.timerRemaining > 0) return false;

    const recipe = RECIPES.find(
      (r) => r.stationType === station.type && r.inputItemId === inputItemId
    );
    if (!recipe) return false;

    // Check inventory count
    const inv = this.farmState.inventory;
    if (typeof inv === 'object' && !Array.isArray(inv)) {
      if (!inv[inputItemId] || inv[inputItemId] < 1) return false;
      inv[inputItemId]--;
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
