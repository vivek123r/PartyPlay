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

  public positionCropSprite(): void {
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
    const isHydrated =
      watered ||
      weather === 'rain' ||
      weather === 'rainy' ||
      weather === 'thunder' ||
      weather === 'thunderstorm' ||
      weather === 'astral_rain';
    if (!isHydrated) return;

    this.entity.daysPlanted = (this.entity.daysPlanted || 0) + 1;
    if (this.entity.stage >= 3) return; // Fully grown

    // Calculate base daily growth progress toward stage 3
    const isRegrowing = this.entity.stage >= 2 && this.species.regrows;
    let dailyProgress = 0;

    if (isRegrowing && this.species.regrowDays) {
      // Regrowing from stage 2 (2/3) to stage 3 (1.0): remaining progress needed is 1/3
      dailyProgress = (1.0 / 3.0) / Math.max(1, this.species.regrowDays);
    } else {
      // Growing from stage 0 (0.0) to stage 3 (1.0): daily progress is 1.0 / growthDays
      dailyProgress = 1.0 / Math.max(1, this.species.growthDays);
    }

    // Speed Fertilizer Modifier (+25%)
    if (this.entity.fertilizedWith === 'speed') {
      dailyProgress *= 1.25;
    }

    // Sunflower Proximity Modifier (+15% per sunflower)
    if (adjacentSunflowers > 0) {
      dailyProgress *= 1 + 0.15 * adjacentSunflowers;
    }

    // Astral Rain Weather Modifier (+50% for mythical category)
    if (weather === 'astral_rain' && this.species.category === 'mythical') {
      dailyProgress *= 1.5;
    }

    this.entity.growthProgress = Math.min(1.0, (this.entity.growthProgress || 0) + dailyProgress);

    // Map overall growthProgress (0.0 to 1.0) to stage (0..3)
    if (this.entity.growthProgress >= 1.0) {
      this.entity.stage = 3;
    } else if (this.entity.growthProgress >= 2 / 3) {
      this.entity.stage = 2;
    } else if (this.entity.growthProgress >= 1 / 3) {
      this.entity.stage = 1;
    } else {
      this.entity.stage = 0;
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
    let yieldAmount =
      Math.floor(
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

    if (isQualityFertilizer) {
      if (qualityRoll < 0.08) quality = 4;
      else if (qualityRoll < 0.30) quality = 3;
      else if (qualityRoll < 0.60) quality = 2;
    } else {
      if (qualityRoll < 0.01) quality = 4;
      else if (qualityRoll < 0.10) quality = 3;
      else if (qualityRoll < 0.30) quality = 2;
    }

    const regrows = this.species.regrows;
    if (regrows) {
      // Multi-Harvest Regrowth: Reset to Stage 2 (Flowering) with 2/3 progress
      this.entity.stage = 2;
      this.entity.growthProgress = 2 / 3;
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
      const baseY = this.tileY * TILE_SIZE + (isTree ? -8 : 4);
      this.y = baseY + bobOffset;
    }
  }
}
