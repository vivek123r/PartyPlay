import { Container, Sprite } from 'pixi.js';
import type { FarmState, TileData, FertilizerType, CropEntity } from '../types';
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
    this.fertilizerBadgesContainer.removeChildren();
    this.cropsContainer.removeChildren();
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
  }

  public updateTileSprite(x: number, y: number, sprite?: Sprite, data?: TileData): void {
    const tileData = data || this.getTile(x, y);
    const tileSprite = sprite || this.tileSprites[y]?.[x];
    if (!tileData || !tileSprite || !this.textureGen) return;

    let textureKey = 'tile_untilled';
    if (tileData.unlocked === false) {
      textureKey = 'tile_locked';
    } else if (tileData.watered) {
      textureKey = 'tile_watered';
    } else if (tileData.tilled) {
      textureKey = 'tile_tilled';
    }

    tileSprite.texture = this.textureGen.getTexture(textureKey);
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
    this.updateTileSprite(tile.x, tile.y, undefined, tile);
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
      this.updateTileSprite(x, y);
      return true;
    }
    return false;
  }

  public waterTile(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || tile.unlocked === false || !tile.tilled) return false;
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
    if (!tile || tile.unlocked === false || !tile.tilled || tile.fertilizer) return false;
    tile.fertilizer = fertilizer;
    if (tile.crop) {
      tile.crop.fertilizedWith = fertilizer;
    }
    return true;
  }

  public unlockPlot(plotId: number): void {
    if (!this.state.grid) return;
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const tile = this.state.grid[r][c];
        if (tile.plotId === plotId) {
          tile.unlocked = true;
          this.updateTileSprite(c, r);
        }
      }
    }

    // Keep unlockedPlots array updated in farmState
    if (Array.isArray(this.state.unlockedPlots)) {
      if (!this.state.unlockedPlots.includes(plotId)) {
        this.state.unlockedPlots.push(plotId);
      }
    } else {
      this.state.unlockedPlots = [0, plotId];
    }
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
