# Milestone 3 (M3): Automation Systems - Exploration & Design Analysis

## 1. Executive Summary
This document presents the detailed architectural exploration, technical specifications, and implementation strategy for **Milestone 3 (M3): Automation Systems** in *Mythic Farm*. 

The Automation system introduces three core machinery categories that reduce manual labor for players as their farm scales:
1. **Magical Sprinklers**: Automatic daily hydration of tilled soil in distinct spatial coverage patterns (**Basic** / Cardinal, **Quality** / Radial 3x3, **Magical** / Cross 5x5).
2. **Automated Scarecrows**: Protection against crow and pest crop destruction in surrounding radii (**Basic Scarecrow** 3x3, **Deluxe Scarecrow** 5x5).
3. **Harvester Drones**: Automatic harvesting of mature, harvestable crops and direct deposit into the farm shipping bin/inventory along with EXP awards.

This design fully integrates with the existing PixiJS v8 engine, deterministic game loop, state persistence model, and `FarmingSystem` / `WeatherSystem` daily progression pipeline.

---

## 2. Architecture & Integration Overview

### Existing Architecture Context
- **Grid Structure**: 16 columns × 10 rows (`GRID_WIDTH = 16`, `GRID_HEIGHT = 10`, `TILE_SIZE = 24px`).
- **Tile Data (`TileData`)**: Holds `tilled`, `watered`, `crop`, `building`, `station`, `unlocked`, `plotId`.
- **Master State (`FarmState`)**: Saved to LocalStorage via `StorageManager`. Tracks `coins`, `energy`, `grid`, `inventory`, etc.
- **Visual Display (`Grid`)**: PixiJS `Container` rendering `tilesContainer`, `fertilizerBadgesContainer`, and `cropsContainer`.
- **Daily Tick Engine (`FarmingSystem.advanceDay`)**: Coordinates season transitions, daily moisture resets, weather effects, crop growth progression, giant mutations, and player energy recovery.

### Proposed Automation Integration Architecture
```
                     +---------------------------------------+
                     |           FarmingSystem               |
                     |  advanceDay(weatherSystem, automations)|
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |          AutomationSystem             |
                     |  processDailyAutomations(farmState)   |
                     +-----+-----------------+---------------+
                           |                 |               |
             +-------------+                 |               +-------------+
             |                               v                             |
             v                     +-------------------+                   v
+------------------------+         |                   |        +---------------------+
|   Magical Sprinklers   |         |Automated Scarecrows|       |   Harvester Drones  |
|  - Cardinal (N/S/E/W)  |         |  - Basic (3x3)    |        |  - Range/Farmwide   |
|  - Radial (3x3 area)   |         |  - Deluxe (5x5)   |        |  - Auto-Harvest     |
|  - Cross (5x5 pattern) |         |  - Repel Crows    |        |  - Inventory Deposit|
+------------------------+         +-------------------+        +---------------------+
```

---

## 3. Data Model & Type Definitions (`types.ts`)

To support all required automation types while maintaining backward compatibility with existing tests, `AutomationType` and `AutomationBuilding` are structured as follows:

```typescript
// Proposed type updates in src/games/mythic-farm/types.ts

export type SprinklerTier = 'basic' | 'quality' | 'magical';
export type ScarecrowTier = 'basic_scarecrow' | 'deluxe_scarecrow';

export type AutomationType =
  // Sprinkler Types & Aliases
  | 'basic'
  | 'quality'
  | 'magical'
  | 'sprinkler_cardinal' // Alias for 'basic'
  | 'sprinkler_radial'   // Alias for 'quality'
  | 'sprinkler_cross'    // Alias for 'magical'
  // Scarecrow Types & Aliases
  | 'scarecrow'          // Alias for 'basic_scarecrow'
  | 'basic_scarecrow'
  | 'deluxe_scarecrow'
  // Drone Types & Aliases
  | 'harvester_drone'
  | 'drone';

export interface AutomationBuilding {
  id: string;              // Unique building UUID (e.g. 'auto_1721900000000_a1b2c')
  type: AutomationType;    // Machine type classifier
  tileX: number;           // Grid column coordinate (0..15)
  tileY: number;           // Grid row coordinate (0..9)
  range: number;           // Operational tile range (1, 2, or 0 for farmwide)
  active: boolean;         // Activation flag
  lastHarvestTick?: number;// Timestamp/tick tracking for harvester drones
}
```

---

## 4. Sub-System Specifications

### 4.1 Magical Sprinklers

Sprinklers automate daily soil watering during the morning day tick.

#### Coverage Patterns & Range Mechanics:
1. **Basic Sprinkler (`'basic'` / `'sprinkler_cardinal'`)**:
   - **Pattern**: Cardinal cross (4 adjacent tiles: North, South, East, West).
   - **Relative Coordinates**: `(cx, cy-1)`, `(cx+1, cy)`, `(cx, cy+1)`, `(cx-1, cy)`.
   - **Range Rating**: `range = 1`.
2. **Quality Sprinkler (`'quality'` / `'sprinkler_radial'`)**:
   - **Pattern**: Radial 3x3 surrounding box (8 adjacent tiles surrounding the sprinkler).
   - **Relative Coordinates**: `(cx+dx, cy+dy)` for `dx ∈ [-1, 0, 1]`, `dy ∈ [-1, 0, 1]`, `(dx, dy) ≠ (0,0)`.
   - **Range Rating**: `range = 1`.
3. **Magical Sprinkler (`'magical'` / `'sprinkler_cross'`)**:
   - **Pattern**: Extended 5x5 cross pattern (reaching 2 tiles out along Cardinal arms: 8-12 tiles).
   - **Relative Coordinates**: `(cx, cy±1)`, `(cx, cy±2)`, `(cx±1, cy)`, `(cx±2, cy)`.
   - **Range Rating**: `range = 2`.

#### Execution Logic (`processSprinklers`):
```typescript
public processSprinklers(): number {
  const automations = this.getAutomations();
  let totalWatered = 0;

  for (const auto of automations) {
    if (!auto.active) continue;
    if (!this.isSprinkler(auto.type)) continue;

    const targetTiles = this.getSprinklerTargetTiles(auto);

    for (const { x, y } of targetTiles) {
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;

      const tile = this.grid.getTile(x, y);
      if (tile && tile.unlocked !== false && tile.tilled && !tile.watered) {
        tile.watered = true;
        if (tile.crop) {
          tile.crop.wateredToday = true;
        }
        this.grid.updateTileSprite(x, y);
        totalWatered++;
      }
    }
  }

  if (totalWatered > 0 && this.audioSynth) {
    this.audioSynth.playWater();
  }

  return totalWatered;
}
```

---

### 4.2 Automated Scarecrows

Scarecrows protect crops against pest and crow attacks during the morning tick.

#### Protection Radii & Mechanics:
1. **Basic Scarecrow (`'basic_scarecrow'` / `'scarecrow'`)**:
   - **Coverage Radius**: 3x3 area centered on scarecrow (`range = 1`, i.e. Chebyshev distance $\le 1$).
   - **Tiles Protected**: 9 tiles total.
2. **Deluxe Scarecrow (`'deluxe_scarecrow'`)**:
   - **Coverage Radius**: 5x5 area centered on scarecrow (`range = 2`, i.e. Chebyshev distance $\le 2$).
   - **Tiles Protected**: 25 tiles total.

#### Pest Defense Execution Algorithm:
- At the morning tick (`processPestAttacks`), unharvested growing crops have a 15% probability of being targeted by crows/pests.
- If a target tile is covered by any active scarecrow (`isTileProtectedByScarecrow(tileX, tileY)` returns `true`):
  - The attack is repelled without damage.
  - Increment `crowsRepelled` counter.
- If unprotected:
  - Crop is destroyed / withered (`crop.withered = true`, `crop.stage = 4`).

```typescript
public isTileProtectedByScarecrow(tileX: number, tileY: number): boolean {
  const automations = this.getAutomations();

  for (const auto of automations) {
    if (!auto.active || !this.isScarecrow(auto.type)) continue;

    const range = (auto.type === 'deluxe_scarecrow' || auto.type === 'scarecrow_deluxe' || auto.range === 2) ? 2 : 1;
    const dx = Math.abs(tileX - auto.tileX);
    const dy = Math.abs(tileY - auto.tileY);

    if (dx <= range && dy <= range) {
      return true;
    }
  }

  return false;
}
```

---

### 4.3 Harvester Drones

Harvester Drones automatically scan the farm for mature crops (`crop.stage === 3` and `!crop.withered`), harvest them, credit Farm EXP, deposit the yield into inventory/shipping bin, and manage crop regrowth.

#### Drone Operational Mechanics:
- **Scan Radius**: Operational within radius `range` or farmwide if `range === 0`.
- **Harvest Execution**:
  - Leverages `farmingSystem.harvestCrop(x, y)` or internal harvest algorithm.
  - Multi-stage regrowing crops (Crystal Berry, Dragonfruit, Elder-Oak) revert to stage 2 (Flowering) with `growthProgress = 2/3`.
  - Single-harvest crops (Wheat, Pumpkin, Sunflower) are harvested and removed from the tile.
  - Items are deposited directly into `farmState.inventory`.
  - Floating item pickup visual particles are spawned at tile center.

```typescript
public processHarvesterDrones(farmingSystem: FarmingSystem): number {
  const automations = this.getAutomations();
  const drones = automations.filter(
    (a) => a.active && (a.type === 'harvester_drone' || a.type === 'drone')
  );

  if (drones.length === 0) return 0;
  let harvestedCount = 0;

  for (const drone of drones) {
    const range = drone.range || 0; // 0 = farmwide

    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        if (range > 0) {
          const dist = Math.max(Math.abs(c - drone.tileX), Math.abs(r - drone.tileY));
          if (dist > range) continue;
        }

        const tile = this.grid.getTile(c, r);
        if (tile && tile.crop && tile.crop.stage === 3 && !tile.crop.withered) {
          const success = farmingSystem.harvestCrop(c, r);
          if (success) {
            harvestedCount++;
          }
        }
      }
    }
  }

  return harvestedCount;
}
```

---

## 5. Visual Rendering & Textures (`Automation.ts` & `TextureGenerator.ts`)

### `src/games/mythic-farm/entities/Automation.ts`
- Extends PixiJS `Container`.
- Contains `building: AutomationBuilding`, `tileX: number`, `tileY: number`, `sprite: Sprite`.
- Idle animation logic in `update(dt)`:
  - Drones: Hovering vertical oscillation (`Math.sin(animTimer * 4) * 2px`).
  - Sprinklers: Spray rotation / pulsing visual when active.
  - Scarecrow: Gentle swaying / glint effect.

### Procedural Texture Additions in `TextureGenerator.ts`
New procedural canvas texture keys to be added:
- `automation_sprinkler_cardinal`: Copper base with 4 blue spray nozzles.
- `automation_sprinkler_radial`: Gold base with 8-nozzle ring.
- `automation_sprinkler_cross`: Titanium/crystal core with 4 extended arms.
- `automation_scarecrow_basic`: Wooden post with straw hat and burlap coat.
- `automation_scarecrow_deluxe`: Golden post with glowing ruby hat gem.
- `automation_harvester_drone`: Futuristic quadcopter drone with golden collection claws.

---

## 6. Detailed File Specifications & Proposed Implementations

### File 1: `src/games/mythic-farm/entities/Automation.ts`
```typescript
import { Container, Sprite } from 'pixi.js';
import type { AutomationBuilding, AutomationType } from '../types';
import { TILE_SIZE } from '../config';
import { TextureGenerator } from '../utils/TextureGenerator';

export class Automation extends Container {
  public building: AutomationBuilding;
  public tileX: number;
  public tileY: number;

  private sprite: Sprite;
  private textureGen!: TextureGenerator;
  private animTimer: number = 0;

  constructor(building: AutomationBuilding, tileX: number, tileY: number) {
    super();
    this.building = building;
    this.tileX = tileX;
    this.tileY = tileY;

    this.sprite = new Sprite();
    this.addChild(this.sprite);

    this.positionBuildingSprite();
  }

  public positionBuildingSprite(): void {
    this.x = this.tileX * TILE_SIZE;
    this.y = this.tileY * TILE_SIZE;
  }

  public initVisuals(textureGen: TextureGenerator): void {
    this.textureGen = textureGen;
    this.updateTexture();
  }

  public updateTexture(): void {
    if (!this.textureGen) return;
    const typeKey = this.getTextureKeyForType(this.building.type);
    this.sprite.texture = this.textureGen.getTexture(typeKey);
  }

  private getTextureKeyForType(type: AutomationType | string): string {
    switch (type) {
      case 'basic':
      case 'sprinkler_basic':
      case 'sprinkler_cardinal':
        return 'automation_sprinkler_cardinal';
      case 'quality':
      case 'sprinkler_quality':
      case 'sprinkler_radial':
        return 'automation_sprinkler_radial';
      case 'magical':
      case 'sprinkler_magical':
      case 'sprinkler_cross':
        return 'automation_sprinkler_cross';
      case 'basic_scarecrow':
      case 'scarecrow_basic':
      case 'scarecrow':
        return 'automation_scarecrow_basic';
      case 'deluxe_scarecrow':
      case 'scarecrow_deluxe':
        return 'automation_scarecrow_deluxe';
      case 'harvester_drone':
      case 'drone':
        return 'automation_harvester_drone';
      default:
        return 'automation_sprinkler_cardinal';
    }
  }

  public update(dt: number): void {
    this.animTimer += dt;
    const isDrone =
      this.building.type === 'harvester_drone' || (this.building.type as string) === 'drone';
    if (isDrone) {
      const hoverOffset = Math.sin(this.animTimer * 4) * 2;
      this.sprite.y = hoverOffset - 3;
    }
  }
}
```

### File 2: `src/games/mythic-farm/systems/AutomationSystem.ts`
```typescript
import type { FarmState, AutomationBuilding, AutomationType } from '../types';
import { GRID_WIDTH, GRID_HEIGHT } from '../config';
import type { Grid } from '../entities/Grid';
import type { FarmingSystem } from './FarmingSystem';
import type { AudioSynthesizer } from '../utils/AudioSynthesizer';

export interface AutomationResult {
  wateredCount: number;
  crowsRepelled: number;
  harvestedCount: number;
}

export class AutomationSystem {
  private state: FarmState;
  private grid: Grid;
  private audioSynth: AudioSynthesizer | null;

  constructor(state: FarmState, grid: Grid, audioSynth: AudioSynthesizer | null = null) {
    this.state = state;
    this.grid = grid;
    this.audioSynth = audioSynth;

    if (!this.state.automations) {
      this.state.automations = [];
    }
  }

  public processDailyAutomations(farmingSystem?: FarmingSystem): AutomationResult {
    const wateredCount = this.processSprinklers();
    const crowsRepelled = this.processPestAttacks();
    const harvestedCount = farmingSystem ? this.processHarvesterDrones(farmingSystem) : 0;

    return {
      wateredCount,
      crowsRepelled,
      harvestedCount,
    };
  }

  public processSprinklers(): number {
    const automations = this.getAutomations();
    let totalWatered = 0;

    for (const auto of automations) {
      if (!auto.active || !this.isSprinkler(auto.type)) continue;

      const targetTiles = this.getSprinklerTargetTiles(auto);

      for (const { x, y } of targetTiles) {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;

        const tile = this.grid.getTile(x, y);
        if (tile && tile.unlocked !== false && tile.tilled && !tile.watered) {
          tile.watered = true;
          if (tile.crop) {
            tile.crop.wateredToday = true;
          }
          this.grid.updateTileSprite(x, y);
          totalWatered++;
        }
      }
    }

    if (totalWatered > 0 && this.audioSynth) {
      this.audioSynth.playWater();
    }

    return totalWatered;
  }

  public getSprinklerTargetTiles(auto: AutomationBuilding): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    const cx = auto.tileX;
    const cy = auto.tileY;
    const type = auto.type as string;

    if (type === 'basic' || type === 'sprinkler_basic' || type === 'sprinkler_cardinal') {
      tiles.push(
        { x: cx, y: cy - 1 },
        { x: cx + 1, y: cy },
        { x: cx, y: cy + 1 },
        { x: cx - 1, y: cy }
      );
    } else if (type === 'quality' || type === 'sprinkler_quality' || type === 'sprinkler_radial') {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          tiles.push({ x: cx + dx, y: cy + dy });
        }
      }
    } else if (type === 'magical' || type === 'sprinkler_magical' || type === 'sprinkler_cross') {
      for (let d = 1; d <= 2; d++) {
        tiles.push({ x: cx, y: cy - d });
        tiles.push({ x: cx, y: cy + d });
        tiles.push({ x: cx + d, y: cy });
        tiles.push({ x: cx - d, y: cy });
      }
    }

    return tiles;
  }

  public processPestAttacks(): number {
    let crowsRepelled = 0;
    const pestChance = 0.15;

    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tile = this.grid.getTile(c, r);
        if (!tile || !tile.crop || tile.crop.withered || tile.crop.stage === 3) continue;

        if (Math.random() < pestChance) {
          if (this.isTileProtectedByScarecrow(c, r)) {
            crowsRepelled++;
          } else {
            tile.crop.withered = true;
            tile.crop.stage = 4;
            const cropDisplay = this.grid.getCrop(c, r);
            if (cropDisplay) cropDisplay.updateTexture();
          }
        }
      }
    }

    return crowsRepelled;
  }

  public isTileProtectedByScarecrow(tileX: number, tileY: number): boolean {
    const automations = this.getAutomations();

    for (const auto of automations) {
      if (!auto.active || !this.isScarecrow(auto.type)) continue;

      const type = auto.type as string;
      const range =
        type === 'deluxe_scarecrow' || type === 'scarecrow_deluxe' || auto.range === 2 ? 2 : 1;

      const dx = Math.abs(tileX - auto.tileX);
      const dy = Math.abs(tileY - auto.tileY);

      if (dx <= range && dy <= range) {
        return true;
      }
    }

    return false;
  }

  public processHarvesterDrones(farmingSystem: FarmingSystem): number {
    const automations = this.getAutomations();
    const drones = automations.filter(
      (a) => a.active && (a.type === 'harvester_drone' || (a.type as string) === 'drone')
    );

    if (drones.length === 0) return 0;
    let harvestedCount = 0;

    for (const drone of drones) {
      const range = drone.range || 0;

      for (let r = 0; r < GRID_HEIGHT; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
          if (range > 0) {
            const dist = Math.max(Math.abs(c - drone.tileX), Math.abs(r - drone.tileY));
            if (dist > range) continue;
          }

          const tile = this.grid.getTile(c, r);
          if (tile && tile.crop && tile.crop.stage === 3 && !tile.crop.withered) {
            const success = farmingSystem.harvestCrop(c, r);
            if (success) harvestedCount++;
          }
        }
      }
    }

    return harvestedCount;
  }

  public placeAutomation(tileX: number, tileY: number, type: AutomationType): boolean {
    const tile = this.grid.getTile(tileX, tileY);
    if (!tile || tile.unlocked === false || tile.building || tile.station || tile.crop) {
      return false;
    }

    const building: AutomationBuilding = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      tileX,
      tileY,
      range: this.getRangeForType(type),
      active: true,
    };

    tile.building = building;
    if (!this.state.automations) this.state.automations = [];
    this.state.automations.push(building);
    return true;
  }

  public removeAutomation(tileX: number, tileY: number): AutomationBuilding | null {
    const tile = this.grid.getTile(tileX, tileY);
    if (!tile || !tile.building) return null;

    const building = tile.building;
    tile.building = undefined;

    if (this.state.automations) {
      const idx = this.state.automations.findIndex((a) => a.id === building.id);
      if (idx >= 0) this.state.automations.splice(idx, 1);
    }

    return building;
  }

  public getAutomations(): AutomationBuilding[] {
    if (this.state.automations && this.state.automations.length > 0) {
      return this.state.automations;
    }

    const found: AutomationBuilding[] = [];
    if (this.state.grid) {
      for (let r = 0; r < GRID_HEIGHT; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
          const b = this.state.grid[r]?.[c]?.building;
          if (b) found.push(b);
        }
      }
    }
    return found;
  }

  private isSprinkler(type: AutomationType | string): boolean {
    return (
      type.startsWith('sprinkler_') ||
      ['basic', 'quality', 'magical', 'sprinkler_basic', 'sprinkler_quality', 'sprinkler_magical'].includes(type)
    );
  }

  private isScarecrow(type: AutomationType | string): boolean {
    return (
      type === 'scarecrow' ||
      type === 'basic_scarecrow' ||
      type === 'scarecrow_basic' ||
      type === 'deluxe_scarecrow' ||
      type === 'scarecrow_deluxe'
    );
  }

  private getRangeForType(type: AutomationType | string): number {
    switch (type) {
      case 'basic':
      case 'sprinkler_basic':
      case 'sprinkler_cardinal':
        return 1;
      case 'quality':
      case 'sprinkler_quality':
      case 'sprinkler_radial':
        return 1;
      case 'magical':
      case 'sprinkler_magical':
      case 'sprinkler_cross':
        return 2;
      case 'basic_scarecrow':
      case 'scarecrow_basic':
      case 'scarecrow':
        return 1;
      case 'deluxe_scarecrow':
      case 'scarecrow_deluxe':
        return 2;
      case 'harvester_drone':
      case 'drone':
        return 0;
      default:
        return 1;
    }
  }
}
```

---

## 7. Edge Cases & Risk Mitigation

| # | Potential Risk / Edge Case | Mitigation Strategy |
|---|----------------------------|---------------------|
| 1 | Sprinkler target tiles out of grid bounds (e.g. `(0,0)` sprinkler) | Boundary checks `0 <= x < GRID_WIDTH` and `0 <= y < GRID_HEIGHT` before indexing tile arrays. |
| 2 | Overlapping scarecrow coverage areas | `isTileProtectedByScarecrow` returns true on first matching active scarecrow using `Array.prototype.some` logic. |
| 3 | Drone harvesting non-harvestable / withered crops | Strict state assertion: `tile.crop.stage === 3 && !tile.crop.withered`. |
| 4 | State persistence mismatch (`state.automations` vs `tile.building`) | `getAutomations()` dynamically falls back to scanning `state.grid` if `state.automations` array is missing or empty. |
| 5 | Type naming alias conflicts (`'basic'` vs `'sprinkler_cardinal'`) | Type helper methods support all variant aliases seamlessly. |

---

## 8. Verification & Test Plan

1. **Unit Test Suite**:
   - `AutomationSystem.processSprinklers`: Test Basic (Cardinal), Quality (Radial), and Magical (Cross) coverage patterns.
   - `AutomationSystem.isTileProtectedByScarecrow`: Verify 3x3 vs 5x5 coverage boundaries.
   - `AutomationSystem.processHarvesterDrones`: Verify mature crops are harvested, added to inventory, and regrowing crops are updated to Stage 2.
2. **Integration Test Suite**:
   - Call `FarmingSystem.advanceDay` with `AutomationSystem` active and verify daily watering, crow defense, and harvesting occur seamlessly before crop growth computation.
3. **Regression Test Suite**:
   - Execute `npx vitest run src/games/mythic-farm` to verify all 270 existing M1/M2 tests pass with zero regressions.
