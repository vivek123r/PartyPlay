import type { FarmState, TileData, AutomationBuilding } from '../types';
import type { Grid } from '../entities/Grid';
import type { AudioSynthesizer } from '../utils/AudioSynthesizer';

export class AutomationSystem {
  private farmState: FarmState;
  private grid: Grid;
  private audioSynthesizer: AudioSynthesizer | null;

  constructor(farmState: FarmState, grid: Grid, audioSynthesizer: AudioSynthesizer | null = null) {
    this.farmState = farmState;
    this.grid = grid;
    this.audioSynthesizer = audioSynthesizer;
  }

  /**
   * Process all automation machinery at the start of a new day.
   * Waters tiles in range for sprinklers and collects crops for drones.
   */
  public processDailyAutomation(): void {
    const matrix = this.grid.getGridMatrix();
    let wateredTilesCount = 0;
    let harvestedCropsCount = 0;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const tile = matrix[r][c];
        if (!tile.building || !tile.building.active) continue;

        const building = tile.building;

        if (building.type.startsWith('sprinkler')) {
          wateredTilesCount += this.runSprinkler(building, matrix);
        } else if (building.type === 'harvester_drone') {
          harvestedCropsCount += this.runHarvesterDrone(building, matrix);
        }
      }
    }

    if (wateredTilesCount > 0 && this.audioSynthesizer) {
      this.audioSynthesizer.playWateringSound();
    }
  }

  private runSprinkler(building: AutomationBuilding, matrix: TileData[][]): number {
    const { tileX, tileY, type } = building;
    const numRows = matrix.length;
    const numCols = matrix[0].length;
    let count = 0;

    let targetCoords: { r: number; c: number }[] = [];

    if (type === 'sprinkler_cardinal') {
      // 4 adjacent cardinal tiles (N, E, S, W)
      targetCoords = [
        { r: tileY - 1, c: tileX },
        { r: tileY + 1, c: tileX },
        { r: tileY, c: tileX - 1 },
        { r: tileY, c: tileX + 1 },
      ];
    } else if (type === 'sprinkler_radial') {
      // 3x3 surrounding tiles (8 tiles)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          targetCoords.push({ r: tileY + dr, c: tileX + dc });
        }
      }
    } else if (type === 'sprinkler_cross') {
      // Cross pattern (2-tile reach in 4 directions = 8 tiles)
      for (let dist = 1; dist <= 2; dist++) {
        targetCoords.push(
          { r: tileY - dist, c: tileX },
          { r: tileY + dist, c: tileX },
          { r: tileY, c: tileX - dist },
          { r: tileY, c: tileX + dist }
        );
      }
    }

    for (const pos of targetCoords) {
      if (pos.r >= 0 && pos.r < numRows && pos.c >= 0 && pos.c < numCols) {
        const t = matrix[pos.r][pos.c];
        if (t.tilled && !t.watered) {
          t.watered = true;
          this.grid.updateTileGraphics(t);
          count++;
        }
      }
    }

    return count;
  }

  private runHarvesterDrone(building: AutomationBuilding, matrix: TileData[][]): number {
    const { tileX, tileY } = building;
    const numRows = matrix.length;
    const numCols = matrix[0].length;
    let harvestedCount = 0;

    // Harvester drone collects mature stage-3 crops in a 5x5 radius
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = tileY + dr;
        const c = tileX + dc;
        if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
          const t = matrix[r][c];
          if (t.crop && t.crop.stage === 3 && !t.crop.withered) {
            // Add harvested crop directly to inventory
            const itemId = t.crop.speciesId;
            if (typeof this.farmState.inventory === 'object' && !Array.isArray(this.farmState.inventory)) {
              this.farmState.inventory[itemId] = (this.farmState.inventory[itemId] || 0) + 1;
            }

            // Reset or clear crop
            t.crop = undefined;
            this.grid.updateTileGraphics(t);
            harvestedCount++;
          }
        }
      }
    }

    return harvestedCount;
  }

  /**
   * Place an automation building on a target tile.
   */
  public placeBuilding(tileX: number, tileY: number, type: AutomationBuilding['type']): boolean {
    const tile = this.grid.getTile(tileX, tileY);
    if (!tile || tile.building) return false;

    tile.building = {
      id: `auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      tileX,
      tileY,
      range: type === 'sprinkler_cross' ? 2 : 1,
      active: true,
    };

    this.grid.updateTileGraphics(tile);
    if (this.audioSynthesizer) {
      this.audioSynthesizer.playBuildSound();
    }
    return true;
  }
}
