import { Container, Sprite, Graphics } from 'pixi.js';
import type { FarmState, TileData, FertilizerType, CropEntity, Season } from '../types';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y, LAND_PLOT_UNLOCK_COSTS } from '../config';
import { TextureGenerator } from '../utils/TextureGenerator';
import { Crop } from './Crop';

export class Grid extends Container {
  public tilesContainer: Container;
  public pathsContainer: Container;
  public fertilizerBadgesContainer: Container;
  public cropsContainer: Container;
  public fencesContainer: Container;
  public lockedOverlaysContainer: Container;
  public cursorContainer: Container;

  private state!: FarmState;
  private textureGen!: TextureGenerator;
  private tileSprites: Sprite[][] = [];
  private cropEntities: Map<string, Crop> = new Map();
  private cursorSprite!: Graphics;
  private targetTile: { x: number; y: number } | null = null;
  private animTime: number = 0;

  constructor(state?: FarmState) {
    super();
    this.x = GRID_OFFSET_X;
    this.y = GRID_OFFSET_Y;

    this.tilesContainer = new Container();
    this.pathsContainer = new Container();
    this.fertilizerBadgesContainer = new Container();
    this.cropsContainer = new Container();
    this.fencesContainer = new Container();
    this.lockedOverlaysContainer = new Container();
    this.cursorContainer = new Container();

    this.addChild(this.tilesContainer);
    this.addChild(this.pathsContainer);
    this.addChild(this.fertilizerBadgesContainer);
    this.addChild(this.cropsContainer);
    this.addChild(this.fencesContainer);
    this.addChild(this.lockedOverlaysContainer);
    this.addChild(this.cursorContainer);

    this.initCursor();

    if (state) {
      this.init(state, new TextureGenerator());
    }
  }

  public plantCrop(x: number, y: number, speciesId: string): Crop | null {
    const tile = this.getTile(x, y);
    if (!tile || !tile.tilled || tile.crop) return null;
    const cropEntity: CropEntity = {
      id: `crop_${speciesId}_${Date.now()}_${Math.random()}`,
      speciesId,
      stage: 0,
      withered: false,
      growthProgress: 0,
      daysPlanted: 0,
    };
    return this.addCrop(x, y, cropEntity);
  }

  public updateDailyCrops(season: Season): void {
    for (const crop of this.cropEntities.values()) {
      const adjSunflowers = this.countAdjacentSunflowers(crop.tileX, crop.tileY);
      crop.advanceGrowth(crop.entity.wateredToday ?? false, season, 'sunny', adjSunflowers);
    }
  }

  public countAdjacentSunflowers(tileX: number, tileY: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = this.getCrop(tileX + dx, tileY + dy);
        if (neighbor && neighbor.species.id === 'sunflower' && neighbor.entity.stage === 3 && !neighbor.entity.withered) {
          count++;
        }
      }
    }
    return count;
  }

  public triggerGiantMutation(x: number, y: number): boolean {
    const crop = this.getCrop(x, y);
    if (crop) {
      crop.entity.isGiant = true;
      return true;
    }
    return false;
  }

  public checkGiantMutationAt(x: number, y: number): boolean {
    if (x < 0 || x > GRID_WIDTH - 3 || y < 0 || y > GRID_HEIGHT - 3) return false;
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const crop = this.getCrop(x + dx, y + dy);
        if (!crop || crop.species.id !== 'pumpkin' || crop.entity.stage !== 3 || crop.entity.withered) {
          return false;
        }
      }
    }
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const crop = this.getCrop(x + dx, y + dy);
        if (crop) {
          crop.entity.isGiant = true;
          crop.entity.giantOriginX = x;
          crop.entity.giantOriginY = y;
        }
      }
    }
    return true;
  }

  private initCursor(): void {
    const g = new Graphics();
    g.rect(0, 0, TILE_SIZE, TILE_SIZE);
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
    g.rect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    g.stroke({ width: 1, color: 0xffd166, alpha: 0.6 });
    this.cursorSprite = g;
    this.cursorSprite.visible = false;
    this.cursorContainer.addChild(this.cursorSprite);
  }

  public setTargetTile(x: number | null, y: number | null): void {
    if (x === null || y === null || x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      this.targetTile = null;
      if (this.cursorSprite) this.cursorSprite.visible = false;
      return;
    }
    this.targetTile = { x, y };
    if (this.cursorSprite) {
      this.cursorSprite.x = x * TILE_SIZE;
      this.cursorSprite.y = y * TILE_SIZE;
      this.cursorSprite.visible = true;
    }
  }

  public getTargetTile(): { x: number; y: number } | null {
    return this.targetTile;
  }

  public init(state: FarmState, textureGen: TextureGenerator): void {
    this.state = state;
    this.textureGen = textureGen;

    // Ensure state.grid exists and has 10 rows x 16 cols
    if (!this.state.grid || this.state.grid.length !== GRID_HEIGHT) {
      this.state.grid = [];
      for (let r = 0; r < GRID_HEIGHT; r++) {
        const row: TileData[] = [];
        for (let c = 0; c < GRID_WIDTH; c++) {
          row.push({
            x: c,
            y: r,
            tilled: false,
            watered: false,
            unlocked: c < 8 && r < 5,
            plotId: (r < 5 ? 0 : 2) + (c < 8 ? 0 : 1),
          });
        }
        this.state.grid.push(row);
      }
    }

    this.buildGrid();
  }

  private buildGrid(): void {
    this.tilesContainer.removeChildren();
    this.pathsContainer.removeChildren();
    this.fertilizerBadgesContainer.removeChildren();
    this.cropsContainer.removeChildren();
    this.fencesContainer.removeChildren();
    this.lockedOverlaysContainer.removeChildren();
    this.tileSprites = [];
    this.cropEntities.clear();

    for (let r = 0; r < GRID_HEIGHT; r++) {
      const rowSprites: Sprite[] = [];
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tileData = this.state.grid![r][c];
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

    this.buildOverlaysAndFences();
  }

  private calculateTilledBitmask(x: number, y: number): number {
    const n = this.getTile(x, y - 1)?.tilled ? 1 : 0;
    const e = this.getTile(x + 1, y)?.tilled ? 2 : 0;
    const s = this.getTile(x, y + 1)?.tilled ? 4 : 0;
    const w = this.getTile(x - 1, y)?.tilled ? 8 : 0;
    return n | e | s | w;
  }

  public updateTileSprite(
    x: number,
    y: number,
    sprite?: Sprite,
    data?: TileData,
    updateNeighbors = false
  ): void {
    const tileData = data || this.getTile(x, y);
    const tileSprite = sprite || this.tileSprites[y]?.[x];
    if (!tileData || !tileSprite || !this.textureGen) return;

    let textureKey = 'tile_untilled';
    if (tileData.unlocked === false) {
      textureKey = 'tile_locked';
      tileSprite.tint = 0x667755;
    } else if (tileData.type === 'stone_path') {
      textureKey = 'tile_stone';
      tileSprite.tint = 0xffffff;
    } else if (tileData.tilled) {
      const bitmask = this.calculateTilledBitmask(x, y);
      textureKey = `tilled_autotile_bm_${bitmask}`;
      tileSprite.tint = tileData.watered ? 0x7799bb : 0xffffff;
    } else {
      textureKey = 'tile_untilled';
      tileSprite.tint = 0xffffff;
    }

    tileSprite.texture = this.textureGen.getTexture(textureKey);

    if (updateNeighbors) {
      if (y > 0) this.updateTileSprite(x, y - 1, undefined, undefined, false);
      if (x < GRID_WIDTH - 1) this.updateTileSprite(x + 1, y, undefined, undefined, false);
      if (y < GRID_HEIGHT - 1) this.updateTileSprite(x, y + 1, undefined, undefined, false);
      if (x > 0) this.updateTileSprite(x - 1, y, undefined, undefined, false);
    }
  }

  public buildOverlaysAndFences(): void {
    this.fencesContainer.removeChildren();
    this.lockedOverlaysContainer.removeChildren();

    const quadrantCenters: Record<number, { x: number; y: number }> = {
      1: { x: 11, y: 2 },
      2: { x: 3, y: 7 },
      3: { x: 11, y: 7 },
    };

    for (const [plotIdStr, center] of Object.entries(quadrantCenters)) {
      const plotId = parseInt(plotIdStr, 10);
      const isUnlocked = this.isPlotUnlocked(plotId);
      if (!isUnlocked) {
        const padlock = new Sprite(this.textureGen.getTexture('item_chest'));
        padlock.x = center.x * TILE_SIZE + (TILE_SIZE - 16) / 2;
        padlock.y = center.y * TILE_SIZE + (TILE_SIZE - 16) / 2;
        padlock.width = 16;
        padlock.height = 16;
        this.lockedOverlaysContainer.addChild(padlock);
      }
    }

    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tile = this.getTile(c, r);
        if (!tile) continue;

        if (tile.unlocked !== false) {
          const rightTile = this.getTile(c + 1, r);
          const bottomTile = this.getTile(c, r + 1);

          if (rightTile && rightTile.unlocked === false) {
            const fence = new Sprite(this.textureGen.getTexture('tile_fence'));
            fence.x = c * TILE_SIZE + TILE_SIZE - 4;
            fence.y = r * TILE_SIZE;
            fence.width = 4;
            fence.height = TILE_SIZE;
            this.fencesContainer.addChild(fence);
          }

          if (bottomTile && bottomTile.unlocked === false) {
            const fence = new Sprite(this.textureGen.getTexture('tile_fence'));
            fence.x = c * TILE_SIZE;
            fence.y = r * TILE_SIZE + TILE_SIZE - 4;
            fence.width = TILE_SIZE;
            fence.height = 4;
            this.fencesContainer.addChild(fence);
          }
        }
      }
    }
  }

  private isPlotUnlocked(plotId: number): boolean {
    if (Array.isArray(this.state.unlockedPlots)) {
      return this.state.unlockedPlots.includes(plotId);
    }
    return plotId === 0;
  }

  public screenToTile(screenX: number, screenY: number): { x: number; y: number } | null {
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
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

  public getGridMatrix(): TileData[][] {
    return this.state.grid || [];
  }

  public updateTileGraphics(tile: TileData): void {
    this.updateTileSprite(tile.x, tile.y, undefined, tile, true);
  }

  public tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    return this.tileToScreen(tileX, tileY);
  }

  public worldToTile(worldX: number, worldY: number): { tileX: number; tileY: number } {
    const res = this.screenToTile(worldX, worldY);
    return { tileX: res?.x ?? 0, tileY: res?.y ?? 0 };
  }

  public getTile(x: number, y: number): TileData | null {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    if (tileX < 0 || tileX >= GRID_WIDTH || tileY < 0 || tileY >= GRID_HEIGHT || !this.state?.grid) {
      return null;
    }
    return this.state.grid[tileY]?.[tileX] || null;
  }

  public tillTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.unlocked === false || tile.building || tile.station) return false;
    if (!tile.tilled) {
      tile.tilled = true;
      tile.type = 'tilled_dirt';
      this.updateTileSprite(x, y, undefined, undefined, true);
      return true;
    }
    return false;
  }

  public waterTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.unlocked === false || !tile.tilled) return false;
    if (!tile.watered) {
      tile.watered = true;
      tile.type = 'watered_dirt';
      if (tile.crop) {
        tile.crop.wateredToday = true;
      }
      this.updateTileSprite(x, y);
      return true;
    }
    return false;
  }

  public fertilizeTile(x: number, y: number, fertilizer: FertilizerType): boolean {
    const validFertilizers = ['speed', 'quality', 'bountiful', 'water_retention'];
    if (!validFertilizers.includes(fertilizer as string)) return false;
    const tile = this.getTile(x, y);
    if (!tile || tile.unlocked === false || !tile.tilled || tile.fertilizer) return false;
    tile.fertilizer = fertilizer;
    if (tile.crop) {
      tile.crop.fertilizedWith = fertilizer;
    }
    return true;
  }

  public unlockPlot(plotId: number, bypassRequirements = false): boolean {
    if (!this.state?.grid) return false;
    const config = LAND_PLOT_UNLOCK_COSTS[plotId];
    const isAlreadyUnlocked = this.isPlotUnlocked(plotId);
    if (!isAlreadyUnlocked && config && !bypassRequirements) {
      if ((this.state.coins ?? 0) < config.coinCost || (this.state.farmLevel ?? 1) < config.levelReq) {
        return false;
      }
      this.state.coins -= config.coinCost;
    }

    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tile = this.state.grid[r][c];
        if (tile.plotId === plotId) {
          tile.unlocked = true;
          this.updateTileSprite(c, r);
        }
      }
    }

    if (Array.isArray(this.state.unlockedPlots)) {
      if (!this.state.unlockedPlots.includes(plotId)) {
        this.state.unlockedPlots.push(plotId);
      }
    } else {
      this.state.unlockedPlots = [0, plotId];
    }

    this.buildOverlaysAndFences();
    return true;
  }

  public resetDailyMoisture(): void {
    if (!this.state.grid) return;
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tile = this.state.grid[r][c];
        const isWaterRetained = tile.fertilizer === 'water_retention' && Math.random() < 0.5;
        const wasWatered = tile.watered;
        if (!isWaterRetained) {
          tile.watered = false;
          if (tile.tilled) {
            tile.type = 'tilled_dirt';
          }
        }
        if (tile.crop) {
          tile.crop.wateredToday = wasWatered || tile.watered;
        }
        this.updateTileSprite(c, r);
      }
    }
  }

  public addCrop(tileX: number, tileY: number, cropEntity: CropEntity): Crop {
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
    this.animTime += dt;
    if (this.cursorSprite && this.cursorSprite.visible) {
      this.cursorSprite.alpha = 0.7 + 0.3 * Math.sin(this.animTime * 6);
    }
    for (const crop of this.cropEntities.values()) {
      crop.update(dt);
    }
  }

  public destroy(options?: any): void {
    this.tileSprites = [];
    this.cropEntities.clear();
    super.destroy(options);
  }
}
