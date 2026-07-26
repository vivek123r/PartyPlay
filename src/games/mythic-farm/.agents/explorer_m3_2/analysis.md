# M3 Exploration & Architectural Analysis: Processing Workshop Systems

## 1. Executive Summary
This document provides the complete investigation, technical design, and implementation specification for **Milestone 3 (M3): Artisan Processing Workshop Systems** in *Mythic Farm*.

The Processing Workshop system enables players to convert raw farm harvests and livestock yields into high-value artisan products, seeds, cloth, and flour. The architecture consists of:
1. **Station Recipe Catalog & Dynamic Matcher**: Standardized recipe configurations for 5 station types with input item alias handling, dynamic output naming, and price formulas.
2. **Station State Machine & Timers**: Explicit 3-state state machine (`idle` -> `processing` -> `output_ready`), real-time `dt` countdowns, and daily calendar fast-forwarding.
3. **`Workshop` Entity (`src/games/mythic-farm/entities/Workshop.ts`)**: PixiJS `Container` representing a processing station on the 24x24 tile grid with status badge overlays (bobbing floating item icons when `output_ready`, processing glow animations when `processing`).
4. **`WorkshopSystem` System (`src/games/mythic-farm/systems/WorkshopSystem.ts`)**: Core logic manager interfacing with `FarmState.stations`, `Grid`, `Inventory`, and `AudioSynthesizer`.

---

## 2. Existing Codebase Audit & Infrastructure

### 2.1 Interface Contracts (`src/games/mythic-farm/types.ts`)
- **`ProcessingStationType`**: `'preserves_jar' | 'brewing_barrel' | 'seed_maker' | 'loom' | 'mill'`.
- **`ProcessingStation` interface**:
  ```typescript
  export interface ProcessingStation {
    id: string;
    type: ProcessingStationType;
    tileX: number;
    tileY: number;
    inputItem?: string;
    inputAmount?: number;
    outputItem?: string;
    outputAmount?: number;
    timerRemaining: number;       // Seconds/ticks until processing completes
    processingTimeTotal?: number;  // Total required seconds/ticks
    active: boolean;
    state?: 'idle' | 'processing' | 'output_ready';
  }
  ```
- **`TileData` interface**:
  Contains `station?: ProcessingStation;`.
  `Grid.ts` line 140 and `FarmingSystem.ts` line 101 already check `tile.station` to prevent tilling/planting over processing stations.

### 2.2 Existing Configuration (`src/games/mythic-farm/config.ts`)
- `WORKSHOP_RECIPES` defines initial recipes for `preserves_jar`, `brewing_barrel`, `seed_maker`, `loom`, and `mill`.
- `PALETTE` provides colors for workshop building rendering:
  - `JAR_GLASS`: `#90caf9`
  - `BARREL_WOOD`: `#6d4c41`
  - `SEEDER_HOPPER`: `#78909c`
  - `LOOM_FRAME`: `#8d6e63`
  - `MILL_STONE`: `#9e9e9e`

### 2.3 Texture Generation (`src/games/mythic-farm/utils/TextureGenerator.ts`)
- `TextureGenerator` handles procedural tile, crop, animal, tool, and item drawing.
- Station sprites and item icon textures (`station_preserves_jar`, `station_brewing_barrel`, `station_seed_maker`, `station_loom`, `station_mill`, `item_jam`, `item_wine`, `item_flour`, `item_cloth`) are generated or will have explicit drawing routines added.

---

## 3. Station Types & Recipe Specifications

### 3.1 Preserves Jar (`preserves_jar`)
- **Inputs**: Any crop (e.g., `crop_pumpkin` / `pumpkin`, `crop_crystal_berry` / `crystal_berry`, `crop_dragonfruit` / `dragonfruit`, `crop_wheat` / `wheat`, `crop_sunflower` / `sunflower`, `crop_elder_oak_fruit` / `elder_oak_fruit`).
- **Input Amount**: 1 raw crop.
- **Timer**: 100 ticks / seconds (default `100`).
- **Outputs**:
  - `pumpkin` -> `artisan_jam` or `pumpkin_jam` (Yield: 1)
  - `crystal_berry` -> `artisan_jam` or `crystal_jam` (Yield: 1)
  - `dragonfruit` -> `artisan_jam` or `dragonfruit_jam` (Yield: 1)
  - Generic crop -> `artisan_jam` or `${crop}_jam`
- **Value Formula**: `2 * cropBasePrice + 50`

### 3.2 Brewing Barrel (`brewing_barrel`)
- **Inputs**: Any fruit or grain crop (e.g., `crop_wheat` / `wheat`, `crop_dragonfruit` / `dragonfruit`, `crop_crystal_berry` / `crystal_berry`, `crop_elder_oak_fruit` / `elder_oak_fruit`, `crop_pumpkin` / `pumpkin`).
- **Input Amount**: 1 raw crop.
- **Timer**: 200 ticks / seconds (default `200`).
- **Outputs**:
  - `wheat` -> `wheat_beer` / `artisan_beer` or `cider` (Yield: 1)
  - `dragonfruit` -> `dragonfruit_wine` / `artisan_wine` (Yield: 1)
  - `crystal_berry` -> `crystal_wine` / `artisan_wine` (Yield: 1)
  - `elder_oak_fruit` -> `elder_oak_cider` / `artisan_cider` (Yield: 1)
  - Generic fruit -> `${crop}_wine` / `artisan_wine`
- **Value Formula**: `3 * cropBasePrice`

### 3.3 Seed Maker (`seed_maker`)
- **Inputs**: Any raw crop (`crop_wheat`, `crop_pumpkin`, `crop_crystal_berry`, `crop_dragonfruit`, `crop_sunflower`, `crop_elder_oak_fruit`).
- **Input Amount**: 1 raw crop.
- **Timer**: 30 ticks / seconds (default `30`).
- **Outputs**:
  - Standard (95% chance): 2 to 3 seed packets of the input crop species (e.g. `seed_wheat` / `wheat_seed`, `seed_pumpkin` / `pumpkin_seed`, etc.).
  - Rare Mutation (5% chance): 1 `ancient_seed` or `seed_ancient`.
- **Value Formula**: Base seed purchase price.

### 3.4 Loom (`loom`)
- **Inputs**: `product_silk_thread` or `silk_thread`.
- **Input Amount**: 1.
- **Timer**: 50 ticks / seconds (default `50`).
- **Outputs**: `artisan_cloth` or `silk_cloth` (Yield: 1).
- **Value Formula**: 450 coins (fixed base selling price).

### 3.5 Mill (`mill`)
- **Inputs**:
  - `crop_wheat` or `wheat`: Output `artisan_flour` or `flour` (Yield: 2). Timer: 40 ticks / seconds.
  - `crop_sunflower` or `sunflower`: Output `artisan_sun_oil` or `sun_oil` (Yield: 1). Timer: 40 ticks / seconds.
- **Value Formula**: 60 coins for flour, 70 coins for sun oil.

---

## 4. Station Mechanics & State Machine Design

### 4.1 Station Lifecycle & State Machine
```
 +-----------------+          Insert Valid Input          +---------------------+
 |                 | -----------------------------------> |                     |
 |     IDLE        |                                      |     PROCESSING      |
 | (No Input/Out)  | <----------------------------------- | (timerRemaining > 0)|
 +-----------------+          Cancel / Remove             +---------------------+
         ^                                                           |
         |                                                           | timerRemaining <= 0
         |                                                           v
         |            Player Collects Output              +---------------------+
         +----------------------------------------------- |    OUTPUT_READY     |
                                                          |  (Icon Badge Active)|
                                                          +---------------------+
```

### 4.2 State Rules
1. **`idle`**:
   - `active: false`, `inputItem: undefined`, `outputItem: undefined`, `timerRemaining: 0`.
   - Accepting loading action if player has valid input item in inventory.
2. **`processing`**:
   - `active: true`, `inputItem` set, `timerRemaining > 0`, `state: 'processing'`.
   - Cannot load another input item.
   - `update(dt)` reduces `timerRemaining` by `dt` seconds.
3. **`output_ready`**:
   - `active: false`, `timerRemaining: 0`, `outputItem` set, `state: 'output_ready'`.
   - Visual entity displays bobbing floating output badge.
   - Interacting claims output item, awards farm EXP, spawns floating pickup item particle, and resets state to `idle`.

### 4.3 Morning / Day Advance Mechanics
When `advanceDay()` is called:
- All stations in `processing` state have their `timerRemaining` decremented by 1 in-game day (equivalent to 60 seconds).
- Any station whose `timerRemaining` drops to 0 or below transitions immediately to `output_ready`.

---

## 5. Entity Specification: `src/games/mythic-farm/entities/Workshop.ts`

```typescript
import { Container, Sprite, Graphics } from 'pixi.js';
import type { ProcessingStation, ProcessingStationType } from '../types';
import { TILE_SIZE } from '../config';
import { TextureGenerator } from '../utils/TextureGenerator';

export class Workshop extends Container {
  public station: ProcessingStation;
  public tileX: number;
  public tileY: number;

  private sprite: Sprite;
  private badgeContainer: Container;
  private badgeSprite: Sprite;
  private progressGraphics: Graphics;
  private textureGen!: TextureGenerator;
  private animTimer: number = 0;

  constructor(station: ProcessingStation, tileX: number, tileY: number) {
    super();
    this.station = station;
    this.tileX = tileX;
    this.tileY = tileY;

    this.x = tileX * TILE_SIZE;
    this.y = tileY * TILE_SIZE;

    this.sprite = new Sprite();
    this.addChild(this.sprite);

    this.progressGraphics = new Graphics();
    this.addChild(this.progressGraphics);

    this.badgeContainer = new Container();
    this.badgeSprite = new Sprite();
    this.badgeContainer.addChild(this.badgeSprite);
    this.addChild(this.badgeContainer);

    this.badgeContainer.x = TILE_SIZE / 2;
    this.badgeContainer.y = -6;
  }

  public initVisuals(textureGen: TextureGenerator): void {
    this.textureGen = textureGen;
    this.updateVisualState();
  }

  public updateVisualState(): void {
    if (!this.textureGen) return;

    // Base Station Sprite
    const baseKey = `station_${this.station.type}`;
    this.sprite.texture = this.textureGen.getTexture(baseKey);

    // State Visuals
    const state = this.getNormalizedState();
    if (state === 'output_ready' && this.station.outputItem) {
      this.badgeContainer.visible = true;
      const cleanOutput = this.station.outputItem
        .replace(/^artisan_/, '')
        .replace(/^crop_/, '')
        .replace(/^product_/, '');
      const badgeKey = `item_${cleanOutput}`;
      this.badgeSprite.texture = this.textureGen.getTexture(badgeKey);
      this.badgeSprite.anchor.set(0.5, 0.5);
    } else {
      this.badgeContainer.visible = false;
    }

    this.drawProgressBar();
  }

  public getNormalizedState(): 'idle' | 'processing' | 'output_ready' {
    if (this.station.state) return this.station.state;
    if (this.station.outputItem) return 'output_ready';
    if (this.station.active || this.station.timerRemaining > 0) return 'processing';
    return 'idle';
  }

  public drawProgressBar(): void {
    this.progressGraphics.clear();
    const state = this.getNormalizedState();
    if (state !== 'processing' || !this.station.processingTimeTotal) return;

    const total = this.station.processingTimeTotal;
    const remaining = Math.max(0, this.station.timerRemaining);
    const progress = Math.min(1, Math.max(0, (total - remaining) / total));

    const barW = 18;
    const barH = 3;
    const barX = 3;
    const barY = TILE_SIZE - 4;

    // Background bar
    this.progressGraphics.fillStyle({ color: 0x111111, alpha: 0.8 });
    this.progressGraphics.fillRect(barX, barY, barW, barH);

    // Progress fill bar
    this.progressGraphics.fillStyle({ color: 0x4cc9f0, alpha: 1.0 });
    this.progressGraphics.fillRect(barX, barY, barW * progress, barH);
  }

  public update(dt: number): void {
    const state = this.getNormalizedState();

    if (state === 'output_ready' && this.badgeContainer.visible) {
      // Bobbing animation for ready output item
      this.animTimer += dt;
      const bob = Math.sin(this.animTimer * 6) * 2;
      this.badgeContainer.y = -6 + bob;
    } else if (state === 'processing') {
      // Subtle gear pulse or scale bounce while processing
      this.animTimer += dt;
      this.drawProgressBar();
    }
  }
}
```

---

## 6. System Specification: `src/games/mythic-farm/systems/WorkshopSystem.ts`

```typescript
import { Container } from 'pixi.js';
import type { ProcessingStation, ProcessingStationType, RecipeConfig, FarmState } from '../types';
import { WORKSHOP_RECIPES, CROP_SPECIES, ITEM_BASE_PRICES, TILE_SIZE, DAY_DURATION_SECONDS } from '../config';
import { Grid } from '../entities/Grid';
import { Workshop } from '../entities/Workshop';
import { AudioSynthesizer } from '../utils/AudioSynthesizer';
import { TextureGenerator } from '../utils/TextureGenerator';
import type { FarmingSystem } from './FarmingSystem';

export class WorkshopSystem {
  private state: FarmState;
  private grid: Grid;
  private audioSynth: AudioSynthesizer | null;
  private textureGen: TextureGenerator | null;
  private farmingSystem: FarmingSystem | null;
  public workshopsContainer: Container;
  private workshopEntities: Map<string, Workshop> = new Map();

  constructor(
    state: FarmState,
    grid: Grid,
    audioSynth: AudioSynthesizer | null = null,
    textureGen: TextureGenerator | null = null,
    farmingSystem: FarmingSystem | null = null
  ) {
    this.state = state;
    this.grid = grid;
    this.audioSynth = audioSynth;
    this.textureGen = textureGen;
    this.farmingSystem = farmingSystem;
    this.workshopsContainer = new Container();
    this.grid.addChild(this.workshopsContainer);

    this.initExistingStations();
  }

  public setTextureGenerator(textureGen: TextureGenerator): void {
    this.textureGen = textureGen;
    for (const workshop of this.workshopEntities.values()) {
      workshop.initVisuals(textureGen);
    }
  }

  private initExistingStations(): void {
    if (!this.state.stations) {
      this.state.stations = [];
    }
    for (const stationData of this.state.stations) {
      this.addWorkshopEntity(stationData);
    }
  }

  private addWorkshopEntity(station: ProcessingStation): Workshop {
    const key = `${station.tileX},${station.tileY}`;
    if (this.workshopEntities.has(key)) {
      this.removeWorkshopEntity(station.tileX, station.tileY);
    }

    const workshop = new Workshop(station, station.tileX, station.tileY);
    if (this.textureGen) {
      workshop.initVisuals(this.textureGen);
    }
    this.workshopsContainer.addChild(workshop);
    this.workshopEntities.set(key, workshop);

    // Sync tile reference
    const tile = this.grid.getTile(station.tileX, station.tileY);
    if (tile) {
      tile.station = station;
    }

    return workshop;
  }

  private removeWorkshopEntity(tileX: number, tileY: number): void {
    const key = `${tileX},${tileY}`;
    const workshop = this.workshopEntities.get(key);
    if (workshop) {
      this.workshopsContainer.removeChild(workshop);
      workshop.destroy({ children: true });
      this.workshopEntities.delete(key);
    }

    const tile = this.grid.getTile(tileX, tileY);
    if (tile) {
      tile.station = undefined;
    }
  }

  public placeStation(tileX: number, tileY: number, stationType: ProcessingStationType): boolean {
    const tile = this.grid.getTile(tileX, tileY);
    if (!tile || tile.unlocked === false || tile.building || tile.station || tile.crop) {
      return false;
    }

    const stationItemKey = `building_${stationType}`;
    const inventory = this.state.inventory || {};
    if (inventory[stationItemKey] !== undefined && inventory[stationItemKey] <= 0) {
      return false;
    }

    // Deduct building item from inventory if present
    if (inventory[stationItemKey] && inventory[stationItemKey] > 0) {
      inventory[stationItemKey] -= 1;
      if (inventory[stationItemKey] <= 0) delete inventory[stationItemKey];
    }

    const stationData: ProcessingStation = {
      id: `station_${stationType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: stationType,
      tileX,
      tileY,
      timerRemaining: 0,
      processingTimeTotal: 0,
      active: false,
      state: 'idle',
    };

    if (!this.state.stations) this.state.stations = [];
    this.state.stations.push(stationData);

    this.addWorkshopEntity(stationData);
    if (this.audioSynth) this.audioSynth.playCraft();
    return true;
  }

  public loadInput(tileX: number, tileY: number, inputItemId: string): boolean {
    const key = `${tileX},${tileY}`;
    const workshop = this.workshopEntities.get(key);
    if (!workshop) return false;

    const station = workshop.station;
    const currentState = workshop.getNormalizedState();
    if (currentState !== 'idle') return false;

    const inventory = this.state.inventory || {};
    const count = inventory[inputItemId] || 0;
    if (count <= 0) return false;

    const recipe = this.getRecipe(station.type, inputItemId);
    if (!recipe) return false;

    // Deduct input item
    inventory[inputItemId] -= 1;
    if (inventory[inputItemId] <= 0) delete inventory[inputItemId];

    station.inputItem = inputItemId;
    station.inputAmount = 1;
    station.timerRemaining = recipe.processingTimeSeconds;
    station.processingTimeTotal = recipe.processingTimeSeconds;
    station.active = true;
    station.state = 'processing';
    station.outputItem = undefined;

    workshop.updateVisualState();
    if (this.audioSynth) this.audioSynth.playCraft();
    return true;
  }

  public collectOutput(tileX: number, tileY: number): boolean {
    const key = `${tileX},${tileY}`;
    const workshop = this.workshopEntities.get(key);
    if (!workshop) return false;

    const station = workshop.station;
    const currentState = workshop.getNormalizedState();
    if (currentState !== 'output_ready' || !station.outputItem) return false;

    const outputItem = station.outputItem;
    const outputAmount = station.outputAmount || 1;

    // Add output item to inventory
    const inventory = this.state.inventory || {};
    inventory[outputItem] = (inventory[outputItem] || 0) + outputAmount;
    this.state.inventory = inventory;

    // Award Farm EXP
    this.state.farmExp = (this.state.farmExp || 0) + 20;

    // Spawn physical pickup item particle if farmingSystem available
    if (this.farmingSystem) {
      this.farmingSystem.createItemPickup(tileX, tileY, outputItem, outputAmount);
    }

    // Reset station to idle
    station.inputItem = undefined;
    station.inputAmount = undefined;
    station.outputItem = undefined;
    station.outputAmount = undefined;
    station.timerRemaining = 0;
    station.processingTimeTotal = 0;
    station.active = false;
    station.state = 'idle';

    workshop.updateVisualState();
    if (this.audioSynth) this.audioSynth.playHarvest();
    return true;
  }

  public interact(tileX: number, tileY: number, selectedItemId?: string): boolean {
    const key = `${tileX},${tileY}`;
    const workshop = this.workshopEntities.get(key);
    if (!workshop) return false;

    const currentState = workshop.getNormalizedState();
    if (currentState === 'output_ready') {
      return this.collectOutput(tileX, tileY);
    } else if (currentState === 'idle' && selectedItemId) {
      return this.loadInput(tileX, tileY, selectedItemId);
    }
    return false;
  }

  public update(dt: number): void {
    if (!this.state.stations) return;

    for (const station of this.state.stations) {
      const currentState = station.state || (station.outputItem ? 'output_ready' : station.active ? 'processing' : 'idle');
      if (currentState === 'processing' && station.timerRemaining > 0) {
        station.timerRemaining = Math.max(0, station.timerRemaining - dt);
        if (station.timerRemaining <= 0) {
          this.completeProcessing(station);
        }
      }

      const workshop = this.workshopEntities.get(`${station.tileX},${station.tileY}`);
      if (workshop) {
        workshop.update(dt);
      }
    }
  }

  public advanceDay(): void {
    if (!this.state.stations) return;
    for (const station of this.state.stations) {
      const currentState = station.state || (station.outputItem ? 'output_ready' : station.active ? 'processing' : 'idle');
      if (currentState === 'processing') {
        // Fast-forward processing by 1 full day (60s)
        station.timerRemaining = Math.max(0, station.timerRemaining - DAY_DURATION_SECONDS);
        if (station.timerRemaining <= 0) {
          this.completeProcessing(station);
        }
      }
    }
  }

  private completeProcessing(station: ProcessingStation): void {
    station.timerRemaining = 0;
    station.active = false;
    station.state = 'output_ready';

    if (station.inputItem) {
      const recipe = this.getRecipe(station.type, station.inputItem);
      if (recipe) {
        station.outputItem = recipe.outputItemId;
        station.outputAmount = 1;

        // Seed Maker Special Handling
        if (station.type === 'seed_maker') {
          const isAncient = Math.random() < 0.05;
          if (isAncient) {
            station.outputItem = 'ancient_seed';
            station.outputAmount = 1;
          } else {
            station.outputAmount = Math.floor(Math.random() * 2) + 2; // 2 to 3 seeds
          }
        } else if (station.type === 'mill' && (station.inputItem === 'wheat' || station.inputItem === 'crop_wheat')) {
          station.outputAmount = 2; // Mill outputs 2 flour packets
        }
      }
    }

    const workshop = this.workshopEntities.get(`${station.tileX},${station.tileY}`);
    if (workshop) {
      workshop.updateVisualState();
    }
  }

  public getRecipe(stationType: ProcessingStationType, inputItemId: string): RecipeConfig | null {
    const rawInput = inputItemId.replace(/^crop_/, '').replace(/^product_/, '').replace(/^seed_/, '');

    if (stationType === 'preserves_jar') {
      const isCrop = CROP_SPECIES[rawInput] || inputItemId.startsWith('crop_');
      if (!isCrop && !['pumpkin', 'crystal_berry', 'dragonfruit', 'wheat', 'sunflower', 'elder_oak_fruit'].includes(rawInput)) {
        return null;
      }
      let outputItemId = 'artisan_jam';
      if (rawInput === 'pumpkin') outputItemId = 'pumpkin_jam';
      else if (rawInput === 'crystal_berry') outputItemId = 'crystal_jam';
      else if (rawInput === 'dragonfruit') outputItemId = 'dragonfruit_jam';

      return {
        stationType,
        inputItemId,
        outputItemId,
        processingTimeSeconds: 100,
        priceFormula: (basePrice: number) => 2 * basePrice + 50,
      };
    }

    if (stationType === 'brewing_barrel') {
      const brewableList = ['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'elder_oak_fruit', 'sunflower'];
      if (!brewableList.includes(rawInput) && !CROP_SPECIES[rawInput]) {
        return null;
      }
      let outputItemId = 'artisan_wine';
      if (rawInput === 'wheat') outputItemId = 'wheat_beer';
      else if (rawInput === 'dragonfruit') outputItemId = 'dragonfruit_wine';
      else if (rawInput === 'crystal_berry') outputItemId = 'crystal_wine';
      else if (rawInput === 'elder_oak_fruit') outputItemId = 'elder_oak_cider';

      return {
        stationType,
        inputItemId,
        outputItemId,
        processingTimeSeconds: 200,
        priceFormula: (basePrice: number) => 3 * basePrice,
      };
    }

    if (stationType === 'seed_maker') {
      if (!CROP_SPECIES[rawInput] && !['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'sunflower', 'elder_oak'].includes(rawInput)) {
        return null;
      }
      return {
        stationType,
        inputItemId,
        outputItemId: `${rawInput}_seed`,
        processingTimeSeconds: 30,
        priceFormula: (basePrice: number) => basePrice,
      };
    }

    if (stationType === 'loom') {
      if (rawInput !== 'silk_thread' && inputItemId !== 'product_silk_thread') return null;
      return {
        stationType,
        inputItemId,
        outputItemId: 'silk_cloth',
        processingTimeSeconds: 50,
        priceFormula: () => 450,
      };
    }

    if (stationType === 'mill') {
      if (rawInput === 'wheat' || inputItemId === 'crop_wheat') {
        return {
          stationType,
          inputItemId,
          outputItemId: 'flour',
          processingTimeSeconds: 40,
          priceFormula: () => 60,
        };
      }
      if (rawInput === 'sunflower' || inputItemId === 'crop_sunflower') {
        return {
          stationType,
          inputItemId,
          outputItemId: 'artisan_sun_oil',
          processingTimeSeconds: 40,
          priceFormula: () => 70,
        };
      }
      return null;
    }

    return null;
  }
}
```

---

## 7. Verification & Implementation Roadmap

### 7.1 Key Files to Implement / Modify
1. Create `src/games/mythic-farm/entities/Workshop.ts`
2. Create `src/games/mythic-farm/systems/WorkshopSystem.ts`
3. Update `src/games/mythic-farm/index.ts` to instantiate `WorkshopSystem` and connect `update(dt)` and `advanceDay()`.
4. Add unit test suite `tests/M3_WorkshopSystems.test.ts`.

### 7.2 Verification Steps
1. Run `npx vitest run src/games/mythic-farm` to ensure all existing 270 tests pass without regression.
2. Run `npx vitest run src/games/mythic-farm/tests/M3_WorkshopSystems.test.ts` to verify new processing workshop tests.
3. Validate zero lint/type errors across all targets.
