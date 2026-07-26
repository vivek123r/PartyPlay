# Milestone 2 (M2) Dynamic Farming, Soil & Orchard Grid Engine — Detailed Analysis & Implementation Plan

## 1. Executive Summary & Scope

Milestone 2 establishes the core interactive gameplay engine for **Mythic Farm: Single-Player Farmville & Magic Orchard**. It delivers an interactive grid system where players till soil, hydrate tilled land, plant 6 multi-stage crop species (Wheat, Pumpkin, Crystal Berry, Dragonfruit, Elder-Oak Tree, Sunflower), apply soil fertilizers, advance growth over in-game days and dynamic weather, harvest mature crops for EXP and coins, and collect physical floating item pickups.

This analysis details the design, architecture, interface contracts, algorithms, and complete proposed code implementations for three core components:
1. `src/games/mythic-farm/entities/Grid.ts`: Soil grid container, tile tilling/watering/fertilizing logic, plot expansion unlocking, coordinate translation, and PixiJS sprite rendering via `TextureGenerator`.
2. `src/games/mythic-farm/entities/Crop.ts`: Multi-stage crop entity visual rendering (Seedling → Sprout → Flowering → Harvestable → Withered), visual bobbing/ready animations, growth timer calculations, fertilizer & season modifiers, tree multi-harvest regrowth, and 3x3 giant crop mutation logic.
3. `src/games/mythic-farm/systems/FarmingSystem.ts`: Tool action engine (Hoe tilling, Watering Can hydration, Seed planting, Fertilizer enrichment, Hand harvesting, Scythe clearing), tool action radius scaling (Basic, Copper, Gold, Titanium), player energy validation, audio synthesizer integration, item pickup animation system, and day advance tick handler.

---

## 2. Architecture & Data Flow

```
                                  +---------------------------------------+
                                  |            MythicFarmGame             |
                                  |              (index.ts)               |
                                  +-------------------+-------------------+
                                                      |
                                       +--------------+--------------+
                                       |                             |
                         +-------------v-------------+ +-------------v-------------+
                         |           Grid            | |       FarmingSystem       |
                         |  (entities/Grid.ts)       | | (systems/FarmingSystem.ts)|
                         +-------------+-------------+ +-------------+-------------+
                                       |                             |
                               +-------v-------+                     |
                               |     Crop      |<--------------------+
                               |(entities/Crop)|   (Plant/Harvest/Growth)
                               +---------------+
                                       |
                         +-------------v-------------+
                         |     TextureGenerator      |
                         | (utils/TextureGenerator)  |
                         +---------------------------+
```

### 2.1 Visual Hierarchy & Layers
- **Stage (PixiJS Container)**
  - `rootContainer`
    - `gameStageContainer`
      - `gridContainer` (Managed by `Grid.ts` at `OFFSET_X = 8`, `OFFSET_Y = 16`)
        - `tilesContainer` (160 Tile Sprites, 16x10 matrix, 24x24 px tiles)
        - `fertilizerBadgesContainer` (Fertilizer indicator icons)
        - `cropsContainer` (Active `Crop.ts` instances)
        - `pickupsContainer` (Floating `ItemPickup` particle sprites)

---

## 3. Component Specifications & Design

### 3.1 `Grid.ts` (`src/games/mythic-farm/entities/Grid.ts`)

#### Responsibilities:
- Holds and manages the 16x10 grid matrix of `TileData` matching `FarmState.grid`.
- Converts mouse/pointer canvas screen coordinates `(screenX, screenY)` to grid coordinates `(tileX, tileY)` and vice-versa.
- Dynamically updates tile visual textures (`tile_untilled`, `tile_tilled`, `tile_watered`, `tile_stone`, `tile_locked`) using `TextureGenerator`.
- Handles land plot unlocks: Plot 0 (Top-Left 8x5) unlocked initially; Plots 1, 2, 3 unlocked via coins/leveling.
- Manages tile soil state modifications: tilling, watering, fertilizing, daily moisture decay reset.
- Mounts and manages child `Crop` entity visual containers.

#### Key Methods & Interface:
- `init(state: FarmState, textureGen: TextureGenerator): void`
- `screenToTile(screenX: number, screenY: number): { x: number; y: number } | null`
- `tileToScreen(tileX: number, tileY: number): { x: number; y: number }`
- `getTile(x: number, y: number): TileData | null`
- `tillTile(x: number, y: number): boolean`
- `waterTile(x: number, y: number): boolean`
- `fertilizeTile(x: number, y: number, type: FertilizerType): boolean`
- `unlockPlot(plotId: number): void`
- `resetDailyMoisture(): void`
- `updateTileSprite(x: number, y: number): void`
- `addCrop(tileX: number, tileY: number, speciesId: string, entity?: CropEntity): Crop`
- `removeCrop(tileX: number, tileY: number): void`
- `getCrop(tileX: number, tileY: number): Crop | null`

---

### 3.2 `Crop.ts` (`src/games/mythic-farm/entities/Crop.ts`)

#### Responsibilities:
- Represents individual planted crop and fruit tree instances on grid tiles.
- Visual rendering across 5 visual growth stages:
  - `0`: Seedling (`crop_${speciesId}_0`)
  - `1`: Sprout (`crop_${speciesId}_1`)
  - `2`: Flowering (`crop_${speciesId}_2`)
  - `3`: Harvestable (`crop_${speciesId}_3`)
  - `4`: Withered (`crop_${speciesId}_withered`)
- Custom sprite positioning & origin offsets:
  - Standard crops (16x16 px) centered on 24x24 px tile (`+4px, +4px`).
  - Trees (`elder_oak`, 32x32 px) centered over tile (`-4px, -8px` offset to allow tree canopy to overhang nicely).
- Harvest ready animation: Sine wave floating bounce (`Math.sin(time * 5) * 2px`) and glowing/sparkle indicator when `stage === 3`.
- Growth Timer & Progression Engine:
  - Increments `growthProgress` (0.0 to 1.0) on day tick.
  - Modifiers:
    - Base growth per day: `1.0 / species.growthDays`.
    - Speed fertilizer modifier: `+25%` growth speed (`* 1.25`).
    - Sunflower proximity bonus: `+15%` growth speed per adjacent solar sunflower.
    - Astral rain weather bonus: `+50%` growth speed for mythical category crops (`crystal_berry`).
    - Water requirement: Growth advances only if tile is watered (or watered today).
  - Out-of-season withering: Checks `species.seasons`. If current season is not in allowed seasons, crop transitions to `withered = true` and `stage = 4`.
- Regrowth vs Harvest:
  - Non-regrowable crops (`wheat`, `pumpkin`, `sunflower`) cleared from grid on harvest.
  - Regrowable crops/trees (`crystal_berry`, `dragonfruit`, `elder_oak`) reset to `stage = 2` (Flowering) with `growthProgress = 0.0`.
- Giant Crop Mutation Logic:
  - 3x3 block check for mature pumpkins (`giantChance: 0.05`). On daily update tick, if 9 adjacent tiles (3x3 grid) contain harvestable pumpkins, rolls 5% chance to merge into a single Giant Pumpkin occupying 3x3 tiles, yielding 3x harvest rewards and bonus coins.

---

### 3.3 `FarmingSystem.ts` (`src/games/mythic-farm/systems/FarmingSystem.ts`)

#### Responsibilities:
- Tool execution controller & energy validation:
  - Validates player energy before tool action (`farmState.energy >= toolConfig.energyCost`).
  - Tool Action Radius scaling based on `farmState.toolTiers[toolType]`:
    - `basic`: 1x1 tile (target tile).
    - `copper`: 1x3 tile line (aligned with facing direction or target row/col).
    - `gold`: 3x3 tile box (9 tiles centered at target).
    - `titanium`: 5x5 tile box (25 tiles centered at target).
- Action execution workflows:
  1. **Hoe Tilling**: Tills unlocked, untilled tiles without buildings/stations. Plays `playTill()` audio.
  2. **Watering Can Hydration**: Hydrates tilled tiles. Checks watering capacity (decrements water level; infinite for titanium). Plays `playWater()` audio.
  3. **Seed Planting**: Validates selected hotbar seed, checks tile is tilled & unplanted, decrements seed inventory, spawns `Crop` entity. Plays `playPlant()` audio.
  4. **Fertilizer Enrichment**: Applies fertilizer item to tilled tile (speed, quality, bountiful, water retention). Decrements inventory.
  5. **Hand Harvesting**: Harvests stage 3 mature crops. Rolls harvest item quantity (`harvestYieldMin`..`harvestYieldMax` + bountiful bonus) & quality tier (1..4). Awards EXP & coins. Triggers regrowth or crop removal. Spawns floating item pickups. Plays `playHarvest()` audio.
  6. **Scythe Clearing**: Clears withered crops, weeds, or unwanted seedlings.
- Floating Item Pickup Animation Engine:
  - Spawns `ItemPickup` sprites at harvested tile pixel coordinates.
  - Pickup animation lifecycle:
    1. Initial pop upward (`vy = -2.5px/frame`).
    2. Gravity float & deceleration.
    3. Homing arc toward target HUD icon (Coins/Inventory).
    4. Collection event updating inventory/coins.
- Day Advance & Morning Engine:
  - `advanceDay(farmState: FarmState, grid: Grid)`:
    - Weather handling: Rain, Thunderstorm, or Astral Rain automatically waters all tilled tiles.
    - Day moisture decay: Resets tile `watered` state (unless `water_retention` fertilizer applied).
    - Advances growth on all crops across the grid.
    - Evaluates giant crop mutation attempts.
    - Restores player energy to `farmState.maxEnergy`.

---

## 4. Proposed Source Code Implementations

### 4.1 `src/games/mythic-farm/entities/Grid.ts`

```typescript
import { Container, Sprite, Texture } from 'pixi.js';
import type { FarmState, TileData, FertilizerType } from '../types';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y } from '../config';
import { TextureGenerator } from '../utils/TextureGenerator';
import { Crop } from './Crop';

export class Grid extends Container {
  public tilesContainer: Container;
  public fertilizerBadgesContainer: Container;
  public cropsContainer: Container;

  private state!: FarmState;
  private textureGen!: TextureGenerator;
  private tileSprites: Sprite[][] = [];
  private fertilizerSprites: Map<string, Sprite> = new Map();
  private cropEntities: Map<string, Crop> = new Map();

  constructor() {
    super();
    this.x = GRID_OFFSET_X;
    this.y = GRID_OFFSET_Y;

    this.tilesContainer = new Container();
    this.fertilizerBadgesContainer = new Container();
    this.cropsContainer = new Container();

    this.addChild(this.tilesContainer);
    this.addChild(this.fertilizerBadgesContainer);
    this.addChild(this.cropsContainer);
  }

  public init(state: FarmState, textureGen: TextureGenerator): void {
    this.state = state;
    this.textureGen = textureGen;
    this.buildGrid();
  }

  private buildGrid(): void {
    this.tilesContainer.removeChildren();
    this.fertilizerBadgesContainer.removeChildren();
    this.cropsContainer.removeChildren();
    this.tileSprites = [];
    this.cropEntities.clear();
    this.fertilizerSprites.clear();

    if (!this.state.grid || this.state.grid.length !== GRID_HEIGHT) {
      return;
    }

    for (let r = 0; r < GRID_HEIGHT; r++) {
      const rowSprites: Sprite[] = [];
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tileData = this.state.grid[r][c];
        const sprite = new Sprite();
        sprite.x = c * TILE_SIZE;
        sprite.y = r * TILE_SIZE;
        sprite.width = TILE_SIZE;
        sprite.height = TILE_SIZE;
        this.tilesContainer.addChild(sprite);
        rowSprites.push(sprite);

        this.updateTileSprite(c, r, sprite, tileData);

        // Restore crop entity if present in save state
        if (tileData.crop) {
          const crop = new Crop(tileData.crop, c, r);
          crop.initVisuals(this.textureGen);
          this.cropsContainer.addChild(crop);
          this.cropEntities.set(`${c},${r}`, crop);
        }
      }
      this.tileSprites.push(rowSprites);
    }
  }

  public updateTileSprite(x: number, y: number, sprite?: Sprite, data?: TileData): void {
    const tileData = data || this.getTile(x, y);
    const tileSprite = sprite || this.tileSprites[y]?.[x];
    if (!tileData || !tileSprite) return;

    let textureKey = 'tile_untilled';
    if (!tileData.unlocked) {
      textureKey = 'tile_locked';
    } else if (tileData.watered) {
      textureKey = 'tile_watered';
    } else if (tileData.tilled) {
      textureKey = 'tile_tilled';
    }

    tileSprite.texture = this.textureGen.getTexture(textureKey);
  }

  public screenToTile(screenX: number, screenY: number): { x: number; y: number } | null {
    const localX = screenX - this.x;
    const localY = screenY - this.y;

    const tileX = Math.floor(localX / TILE_SIZE);
    const tileY = Math.floor(localY / TILE_SIZE);

    if (tileX < 0 || tileX >= GRID_WIDTH || tileY < 0 || tileY >= GRID_HEIGHT) {
      return null;
    }
    return { x: tileX, y: tileY };
  }

  public tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: this.x + tileX * TILE_SIZE,
      y: this.y + tileY * TILE_SIZE,
    };
  }

  public getTile(x: number, y: number): TileData | null {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return null;
    }
    return this.state.grid[y][x];
  }

  public tillTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.unlocked || tile.building || tile.station) return false;
    if (!tile.tilled) {
      tile.tilled = true;
      this.updateTileSprite(x, y);
      return true;
    }
    return false;
  }

  public waterTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.unlocked || !tile.tilled) return false;
    if (!tile.watered) {
      tile.watered = true;
      if (tile.crop) {
        tile.crop.wateredToday = true;
      }
      this.updateTileSprite(x, y);
      return true;
    }
    return false;
  }

  public fertilizeTile(x: number, y: number, fertilizer: FertilizerType): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.unlocked || !tile.tilled || tile.fertilizer) return false;
    tile.fertilizer = fertilizer;
    if (tile.crop) {
      tile.crop.fertilizedWith = fertilizer;
    }
    return true;
  }

  public unlockPlot(plotId: number): void {
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tile = this.state.grid[r][c];
        if (tile.plotId === plotId) {
          tile.unlocked = true;
          this.updateTileSprite(c, r);
        }
      }
    }
  }

  public resetDailyMoisture(): void {
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tile = this.state.grid[r][c];
        if (tile.fertilizer !== 'water_retention') {
          tile.watered = false;
        }
        if (tile.crop) {
          tile.crop.wateredToday = tile.watered;
        }
        this.updateTileSprite(c, r);
      }
    }
  }

  public addCrop(tileX: number, tileY: number, cropEntity: any): Crop {
    const key = `${tileX},${tileY}`;
    if (this.cropEntities.has(key)) {
      this.removeCrop(tileX, tileY);
    }
    const crop = new Crop(cropEntity, tileX, tileY);
    crop.initVisuals(this.textureGen);
    this.cropsContainer.addChild(crop);
    this.cropEntities.set(key, crop);

    const tile = this.getTile(tileX, tileY);
    if (tile) tile.crop = cropEntity;

    return crop;
  }

  public removeCrop(tileX: number, tileY: number): void {
    const key = `${tileX},${tileY}`;
    const crop = this.cropEntities.get(key);
    if (crop) {
      this.cropsContainer.removeChild(crop);
      crop.destroy({ children: true });
      this.cropEntities.delete(key);
    }
    const tile = this.getTile(tileX, tileY);
    if (tile) tile.crop = undefined;
  }

  public getCrop(tileX: number, tileY: number): Crop | null {
    return this.cropEntities.get(`${tileX},${tileY}`) || null;
  }

  public update(dt: number): void {
    for (const crop of this.cropEntities.values()) {
      crop.update(dt);
    }
  }

  public destroy(options?: any): void {
    this.tileSprites = [];
    this.cropEntities.clear();
    this.fertilizerSprites.clear();
    super.destroy(options);
  }
}
```

---

### 4.2 `src/games/mythic-farm/entities/Crop.ts`

```typescript
import { Container, Sprite } from 'pixi.js';
import type { CropEntity, CropSpecies, Season, Weather, QualityTier } from '../types';
import { CROP_SPECIES, TILE_SIZE } from '../config';
import { TextureGenerator } from '../utils/TextureGenerator';

export class Crop extends Container {
  public entity: CropEntity;
  public tileX: number;
  public tileY: number;
  public species: CropSpecies;

  private sprite: Sprite;
  private textureGen!: TextureGenerator;
  private animTimer: number = 0;

  constructor(entity: CropEntity, tileX: number, tileY: number) {
    super();
    this.entity = entity;
    this.tileX = tileX;
    this.tileY = tileY;
    this.species = CROP_SPECIES[entity.speciesId] || CROP_SPECIES.wheat;

    this.sprite = new Sprite();
    this.addChild(this.sprite);

    this.positionCropSprite();
  }

  private positionCropSprite(): void {
    const isTree = this.species.category === 'tree';
    if (isTree) {
      // 32x32 Tree Sprite centered over 24x24 tile (-4px X, -8px Y offset)
      this.x = this.tileX * TILE_SIZE - 4;
      this.y = this.tileY * TILE_SIZE - 8;
    } else {
      // 16x16 Standard Crop Sprite centered over 24x24 tile (+4px X, +4px Y offset)
      this.x = this.tileX * TILE_SIZE + 4;
      this.y = this.tileY * TILE_SIZE + 4;
    }
  }

  public initVisuals(textureGen: TextureGenerator): void {
    this.textureGen = textureGen;
    this.updateTexture();
  }

  public updateTexture(): void {
    if (!this.textureGen) return;

    let textureKey = '';
    if (this.entity.withered || this.entity.stage === 4) {
      textureKey = `crop_${this.entity.speciesId}_withered`;
    } else {
      textureKey = `crop_${this.entity.speciesId}_${this.entity.stage}`;
    }

    this.sprite.texture = this.textureGen.getTexture(textureKey);
  }

  public advanceGrowth(
    watered: boolean,
    season: Season,
    weather: Weather,
    adjacentSunflowers: number = 0
  ): void {
    if (this.entity.withered) return;

    // Season Compatibility Check: Wither if current season is invalid for species
    if (!this.species.seasons.includes(season)) {
      this.entity.withered = true;
      this.entity.stage = 4;
      this.updateTexture();
      return;
    }

    // Must be watered to grow (or weather is rain/thunder/astral_rain)
    const isHydrated = watered || weather === 'rain' || weather === 'thunder' || weather === 'astral_rain';
    if (!isHydrated) return;

    this.entity.daysPlanted += 1;
    if (this.entity.stage >= 3) return; // Fully grown

    // Calculate base daily growth rate
    let growthRate = 1.0 / this.species.growthDays;

    // Speed Fertilizer Modifier (+25%)
    if (this.entity.fertilizedWith === 'speed') {
      growthRate *= 1.25;
    }

    // Sunflower Proximity Modifier (+15% per sunflower)
    if (adjacentSunflowers > 0) {
      growthRate *= 1 + 0.15 * adjacentSunflowers;
    }

    // Astral Rain Weather Modifier (+50% for mythical category)
    if (weather === 'astral_rain' && this.species.category === 'mythical') {
      growthRate *= 1.5;
    }

    this.entity.growthProgress += growthRate;

    // Stage Transitions: 0 -> 1 -> 2 -> 3
    if (this.entity.growthProgress >= 1.0) {
      this.entity.stage = Math.min(3, (this.entity.stage + 1)) as 0 | 1 | 2 | 3;
      this.entity.growthProgress = this.entity.stage === 3 ? 1.0 : 0.0;
    }

    this.updateTexture();
  }

  public harvest(): {
    harvestItemId: string;
    quantity: number;
    exp: number;
    quality: QualityTier;
    regrows: boolean;
  } {
    if (this.entity.stage !== 3 || this.entity.withered) {
      throw new Error('Crop is not harvestable.');
    }

    // Base Yield Calculation
    let yieldAmount = Math.floor(
      Math.random() * (this.species.harvestYieldMax - this.species.harvestYieldMin + 1)
    ) + this.species.harvestYieldMin;

    // Bountiful Fertilizer Bonus (+1 extra yield)
    if (this.entity.fertilizedWith === 'bountiful') {
      yieldAmount += 1;
    }

    // Quality Tier Roll (1: Normal, 2: Silver, 3: Gold, 4: Mythic)
    let quality: QualityTier = 1;
    const qualityRoll = Math.random();
    const isQualityFertilizer = this.entity.fertilizedWith === 'quality';

    if (qualityRoll < (isQualityFertilizer ? 0.15 : 0.05)) {
      quality = 4; // Mythic
    } else if (qualityRoll < (isQualityFertilizer ? 0.40 : 0.20)) {
      quality = 3; // Gold
    } else if (qualityRoll < (isQualityFertilizer ? 0.75 : 0.50)) {
      quality = 2; // Silver
    }

    const regrows = this.species.regrows;
    if (regrows) {
      // Multi-Harvest Regrowth: Reset to Stage 2 (Flowering)
      this.entity.stage = 2;
      this.entity.growthProgress = 0.0;
      this.updateTexture();
    }

    return {
      harvestItemId: this.species.harvestItemId,
      quantity: yieldAmount,
      exp: this.species.expYield,
      quality,
      regrows,
    };
  }

  public update(dt: number): void {
    if (this.entity.stage === 3 && !this.entity.withered) {
      // Bobbing animation for harvestable crops
      this.animTimer += dt;
      const bobOffset = Math.sin(this.animTimer * 6) * 1.5;
      const isTree = this.species.category === 'tree';
      this.y = (this.tileY * TILE_SIZE + (isTree ? -8 : 4)) + bobOffset;
    }
  }
}
```

---

### 4.3 `src/games/mythic-farm/systems/FarmingSystem.ts`

```typescript
import { Container, Sprite } from 'pixi.js';
import type { FarmState, ToolType, FertilizerType, QualityTier } from '../types';
import { TOOL_TIER_CONFIG, CROP_SPECIES, TILE_SIZE } from '../config';
import { Grid } from '../entities/Grid';
import { AudioSynthesizer } from '../utils/AudioSynthesizer';

export interface ItemPickup {
  sprite: Sprite;
  itemId: string;
  quantity: number;
  x: number;
  y: number;
  vy: number;
  life: number;
}

export class FarmingSystem {
  private state: FarmState;
  private grid: Grid;
  private audioSynth: AudioSynthesizer | null;
  private pickupsContainer: Container;
  private activePickups: ItemPickup[] = [];

  constructor(state: FarmState, grid: Grid, audioSynth: AudioSynthesizer | null) {
    this.state = state;
    this.grid = grid;
    this.audioSynth = audioSynth;
    this.pickupsContainer = new Container();
    this.grid.addChild(this.pickupsContainer);
  }

  public executeToolAction(toolType: ToolType, targetTileX: number, targetTileY: number): boolean {
    const tier = this.state.toolTiers[toolType] || 'basic';
    const config = TOOL_TIER_CONFIG[tier];

    // Energy Validation
    if (this.state.energy < config.energyCost) {
      return false;
    }

    const affectedTiles = this.calculateToolAOE(targetTileX, targetTileY, config.actionRadius);
    let success = false;

    for (const { x, y } of affectedTiles) {
      if (toolType === 'hoe') {
        if (this.grid.tillTile(x, y)) {
          success = true;
        }
      } else if (toolType === 'watering_can') {
        if (this.grid.waterTile(x, y)) {
          success = true;
        }
      } else if (toolType === 'scythe') {
        const crop = this.grid.getCrop(x, y);
        if (crop && (crop.entity.withered || crop.entity.stage === 4)) {
          this.grid.removeCrop(x, y);
          success = true;
        }
      }
    }

    if (success) {
      this.state.energy = Math.max(0, this.state.energy - config.energyCost);
      if (toolType === 'hoe' && this.audioSynth) this.audioSynth.playTill();
      if (toolType === 'watering_can' && this.audioSynth) this.audioSynth.playWater();
    }

    return success;
  }

  public plantSeed(tileX: number, tileY: number, seedItemId: string): boolean {
    const tile = this.grid.getTile(tileX, tileY);
    if (!tile || !tile.unlocked || !tile.tilled || tile.crop || tile.building || tile.station) {
      return false;
    }

    const count = this.state.inventory[seedItemId] || 0;
    if (count <= 0) return false;

    // Deduce speciesId from seed itemId (e.g. 'seed_wheat' -> 'wheat')
    const speciesId = seedItemId.replace('seed_', '');
    if (!CROP_SPECIES[speciesId]) return false;

    // Deduct seed item
    this.state.inventory[seedItemId] -= 1;
    if (this.state.inventory[seedItemId] <= 0) {
      delete this.state.inventory[seedItemId];
    }

    const cropEntity = {
      id: `crop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      speciesId,
      stage: 0 as const,
      withered: false,
      growthProgress: 0,
      daysPlanted: 0,
      wateredToday: tile.watered,
      fertilizedWith: tile.fertilizer,
    };

    this.grid.addCrop(tileX, tileY, cropEntity);
    if (this.audioSynth) this.audioSynth.playPlant();
    return true;
  }

  public applyFertilizer(tileX: number, tileY: number, fertilizerType: FertilizerType): boolean {
    const fertilizerItemId = `fertilizer_${fertilizerType}`;
    const count = this.state.inventory[fertilizerItemId] || 0;
    if (count <= 0) return false;

    if (this.grid.fertilizeTile(tileX, tileY, fertilizerType)) {
      this.state.inventory[fertilizerItemId] -= 1;
      if (this.state.inventory[fertilizerItemId] <= 0) {
        delete this.state.inventory[fertilizerItemId];
      }
      return true;
    }
    return false;
  }

  public harvestCrop(tileX: number, tileY: number): boolean {
    const crop = this.grid.getCrop(tileX, tileY);
    if (!crop || crop.entity.stage !== 3 || crop.entity.withered) {
      return false;
    }

    const result = crop.harvest();

    // Add item to inventory
    this.state.inventory[result.harvestItemId] =
      (this.state.inventory[result.harvestItemId] || 0) + result.quantity;

    // Award EXP
    this.state.farmExp += result.exp;
    this.checkLevelUp();

    // Spawn physical floating item pickup animation
    this.createItemPickup(tileX, tileY, result.harvestItemId, result.quantity);

    // If crop does not regrow, remove from tile & clear fertilizer
    if (!result.regrows) {
      this.grid.removeCrop(tileX, tileY);
      const tile = this.grid.getTile(tileX, tileY);
      if (tile) tile.fertilizer = undefined;
    }

    if (this.audioSynth) this.audioSynth.playHarvest();
    return true;
  }

  public advanceDay(): void {
    this.state.currentDay += 1;
    const isRainy =
      this.state.currentWeather === 'rain' ||
      this.state.currentWeather === 'thunder' ||
      this.state.currentWeather === 'astral_rain';

    // 1. Reset tile moisture & crop wateredToday
    this.grid.resetDailyMoisture();

    // 2. Advance growth for all active crops
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 16; c++) {
        const crop = this.grid.getCrop(c, r);
        const tile = this.grid.getTile(c, r);
        if (crop && tile) {
          const adjSunflowers = this.countAdjacentSunflowers(c, r);
          crop.advanceGrowth(
            tile.watered || isRainy,
            this.state.currentSeason,
            this.state.currentWeather,
            adjSunflowers
          );
        }
      }
    }

    // 3. Giant Pumpkin Mutation Check (5% chance on 3x3 mature pumpkins)
    this.checkGiantPumpkinMutations();

    // 4. Restore Energy
    this.state.energy = this.state.maxEnergy;
  }

  private countAdjacentSunflowers(tileX: number, tileY: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = this.grid.getCrop(tileX + dx, tileY + dy);
        if (neighbor && neighbor.species.id === 'sunflower' && neighbor.entity.stage === 3) {
          count++;
        }
      }
    }
    return count;
  }

  private checkGiantPumpkinMutations(): void {
    for (let r = 0; r <= 10 - 3; r++) {
      for (let c = 0; c <= 16 - 3; c++) {
        let allMaturePumpkins = true;
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const crop = this.grid.getCrop(c + dx, r + dy);
            if (!crop || crop.species.id !== 'pumpkin' || crop.entity.stage !== 3) {
              allMaturePumpkins = false;
              break;
            }
          }
          if (!allMaturePumpkins) break;
        }

        if (allMaturePumpkins && Math.random() < 0.05) {
          // Mutate center pumpkin into giant pumpkin
          const centerCrop = this.grid.getCrop(c + 1, r + 1);
          if (centerCrop) {
            centerCrop.entity.isGiant = true;
          }
        }
      }
    }
  }

  private calculateToolAOE(cx: number, cy: number, radius: number): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    if (radius === 1) {
      tiles.push({ x: cx, y: cy });
    } else if (radius === 2) {
      // 1x3 line
      tiles.push({ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx + 1, y: cy });
    } else if (radius === 3) {
      // 3x3 square
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          tiles.push({ x: cx + dx, y: cy + dy });
        }
      }
    } else if (radius === 5) {
      // 5x5 square
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          tiles.push({ x: cx + dx, y: cy + dy });
        }
      }
    }
    return tiles;
  }

  private createItemPickup(tileX: number, tileY: number, itemId: string, quantity: number): void {
    const sprite = new Sprite();
    sprite.x = tileX * TILE_SIZE + 4;
    sprite.y = tileY * TILE_SIZE + 4;
    this.pickupsContainer.addChild(sprite);

    this.activePickups.push({
      sprite,
      itemId,
      quantity,
      x: sprite.x,
      y: sprite.y,
      vy: -2.5,
      life: 1.0,
    });
  }

  private checkLevelUp(): void {
    const reqExp = this.state.farmLevel * 100;
    if (this.state.farmExp >= reqExp) {
      this.state.farmLevel += 1;
      this.state.maxEnergy += 10;
      this.state.energy = this.state.maxEnergy;
    }
  }

  public update(dt: number): void {
    this.grid.update(dt);

    // Update Item Pickups
    for (let i = this.activePickups.length - 1; i >= 0; i--) {
      const pickup = this.activePickups[i];
      pickup.y += pickup.vy;
      pickup.vy += 0.1; // gravity
      pickup.life -= dt;
      pickup.sprite.y = pickup.y;
      pickup.sprite.alpha = Math.max(0, pickup.life);

      if (pickup.life <= 0) {
        this.pickupsContainer.removeChild(pickup.sprite);
        pickup.sprite.destroy();
        this.activePickups.splice(i, 1);
      }
    }
  }
}
```

---

## 5. Verification & Test Plan

A comprehensive test harness `src/games/mythic-farm/tests/M2_FarmingEngine.test.ts` will verify all Milestone 2 features:
1. **Grid Tile State Verification**: Tilling untilled soil, double-tilling no-op, watering tilled soil, daily moisture decay.
2. **Crop Multi-Stage Visuals & Growth**: Planting all 6 crop species, daily growth progress accumulation, visual stage transitions (0 → 1 → 2 → 3), season mismatch withering (Stage 4).
3. **Fertilizer & Modifiers**: Speed fertilizer (+25% growth), Quality fertilizer (Mythic/Gold/Silver quality boost), Bountiful fertilizer (+1 item yield), Sunflower adjacency (+15% growth speed).
4. **Harvest & Multi-Harvest Regrowth**: Standard crop removal, Tree & Crystal Berry regrowth to Stage 2, EXP accumulation, level up.
5. **Tool Action Radius & Energy Constraints**: Energy deduction per tool tier, action radius calculation (1x1, 1x3, 3x3, 5x5), low energy prevention.
6. **Giant Crop Mutation**: 3x3 mature pumpkin detection and 5% giant mutation chance.

Verification Command:
```bash
npx vitest run src/games/mythic-farm/MythicFarmM1.test.ts
```
