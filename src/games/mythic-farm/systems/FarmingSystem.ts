import { Container, Sprite } from 'pixi.js';
import type { FarmState, ToolType, FertilizerType } from '../types';
import { TOOL_TIER_CONFIG, CROP_SPECIES, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT } from '../config';
import { Grid } from '../entities/Grid';
import { AudioSynthesizer } from '../utils/AudioSynthesizer';
import { TextureGenerator } from '../utils/TextureGenerator';
import type { WeatherSystem } from './WeatherSystem';

export interface ItemPickup {
  sprite: Sprite;
  itemId: string;
  quantity: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  bounceCount: number;
  resting: boolean;
  baseY: number;
  animTimer: number;
}

export class FarmingSystem {
  private state: FarmState;
  private grid: Grid;
  private audioSynth: AudioSynthesizer | null;
  private textureGen: TextureGenerator | null;
  public pickupsContainer: Container;
  private activePickups: ItemPickup[] = [];
  public playerPosition: { x: number; y: number } = { x: 240, y: 135 };

  constructor(
    state: FarmState,
    grid: Grid,
    audioSynth: AudioSynthesizer | null = null,
    textureGen: TextureGenerator | null = null
  ) {
    this.state = state;
    this.grid = grid;
    this.audioSynth = audioSynth;
    this.textureGen = textureGen;
    this.pickupsContainer = new Container();
    this.grid.addChild(this.pickupsContainer);
  }

  public setTextureGenerator(textureGen: TextureGenerator): void {
    this.textureGen = textureGen;
  }

  public executeToolAction(toolType: ToolType, targetTileX: number, targetTileY: number): boolean {
    let tier = this.state.toolTiers[toolType] || 'basic';
    if (!TOOL_TIER_CONFIG[tier]) {
      tier = 'basic';
    }
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
      } else if (toolType === 'axe') {
        const crop = this.grid.getCrop(x, y);
        if (crop && crop.entity.isGiant) {
          this.harvestGiantPumpkin(x, y);
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

  public tillSoil(x: number, y: number): boolean {
    return this.executeToolAction('hoe', x, y);
  }

  public waterSoil(x: number, y: number): boolean {
    return this.executeToolAction('watering_can', x, y);
  }

  public plantCrop(x: number, y: number, seedItemId: string): boolean {
    return this.plantSeed(x, y, seedItemId);
  }

  public plantSeed(tileX: number, tileY: number, seedItemId: string): boolean {
    const tile = this.grid.getTile(tileX, tileY);
    if (!tile || tile.unlocked === false || !tile.tilled || tile.crop || tile.building || tile.station) {
      return false;
    }

    const inventory = this.state.inventory || {};
    const count = inventory[seedItemId] || 0;
    if (count <= 0) return false;

    // Deduce speciesId from seed itemId (e.g. 'seed_wheat' -> 'wheat')
    let speciesId = seedItemId.replace(/^seed_/, '');
    if (!CROP_SPECIES[speciesId]) {
      // Fallback check
      if (CROP_SPECIES[seedItemId]) {
        speciesId = seedItemId;
      } else {
        return false;
      }
    }

    // Deduct seed item from inventory
    inventory[seedItemId] -= 1;
    if (inventory[seedItemId] <= 0) {
      delete inventory[seedItemId];
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
    const inventory = this.state.inventory || {};
    const count = inventory[fertilizerItemId] || inventory[fertilizerType] || 0;
    if (count <= 0) return false;

    if (this.grid.fertilizeTile(tileX, tileY, fertilizerType)) {
      if (inventory[fertilizerItemId]) {
        inventory[fertilizerItemId] -= 1;
        if (inventory[fertilizerItemId] <= 0) delete inventory[fertilizerItemId];
      } else if (inventory[fertilizerType]) {
        inventory[fertilizerType] -= 1;
        if (inventory[fertilizerType] <= 0) delete inventory[fertilizerType];
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

    if (crop.entity.isGiant) {
      return this.harvestGiantPumpkin(tileX, tileY);
    }

    const result = crop.harvest();

    // Add harvest item to inventory
    const inventory = this.state.inventory || {};
    inventory[result.harvestItemId] = (inventory[result.harvestItemId] || 0) + result.quantity;
    this.state.inventory = inventory;

    // Award Farm EXP
    this.state.farmExp = (this.state.farmExp || 0) + result.exp;
    this.checkLevelUp();

    // Spawn physical floating item pickup particle
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

  public harvestGiantPumpkin(tileX: number, tileY: number): boolean {
    const targetCrop = this.grid.getCrop(tileX, tileY);
    const giantOriginX = targetCrop?.entity.giantOriginX ?? Math.max(0, Math.min(GRID_WIDTH - 3, tileX - 1));
    const giantOriginY = targetCrop?.entity.giantOriginY ?? Math.max(0, Math.min(GRID_HEIGHT - 3, tileY - 1));

    // Clear all 9 tiles of the 3x3 giant pumpkin cluster
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const x = giantOriginX + dx;
        const y = giantOriginY + dy;
        this.grid.removeCrop(x, y);
        const tile = this.grid.getTile(x, y);
        if (tile) tile.fertilizer = undefined;
      }
    }

    // Award 9x pumpkin items + 500 bonus coins + 200 EXP
    const inventory = this.state.inventory || {};
    inventory['crop_pumpkin'] = (inventory['crop_pumpkin'] || 0) + 9;
    this.state.inventory = inventory;

    this.state.coins = (this.state.coins || 0) + 500;
    this.state.farmExp = (this.state.farmExp || 0) + 200;
    this.checkLevelUp();

    // Spawn physical item pickup particle
    this.createItemPickup(tileX, tileY, 'crop_pumpkin', 9);
    if (this.audioSynth) this.audioSynth.playHarvest();
    return true;
  }

  public advanceDay(weatherSystem?: WeatherSystem): void {
    // Single-source day increment
    this.state.currentDay = Math.max(1, (this.state.currentDay || 1) + 1);

    // 1. Advance calendar season & weather (prevent double-incrementing day)
    if (weatherSystem) {
      weatherSystem.advanceDay(this.state, false);
      const newWeather = weatherSystem.generateWeatherForSeason(this.state.currentSeason);
      weatherSystem.setWeather(this.state, newWeather);
    }

    // 2. Reset previous day moisture
    this.grid.resetDailyMoisture();

    // 3. Process morning weather (auto-waters tilled tiles on rain, applies crop withering & lightning)
    if (weatherSystem) {
      weatherSystem.processMorningWeather(this.state, this.grid);
    }

    const isRainy = [
      'rain',
      'rainy',
      'thunder',
      'thunderstorm',
      'astral_rain',
    ].includes(this.state.currentWeather);

    // 4. Advance growth for all active crops
    for (let r = 0; r < GRID_HEIGHT; r++) {
      for (let c = 0; c < GRID_WIDTH; c++) {
        const crop = this.grid.getCrop(c, r);
        const tile = this.grid.getTile(c, r);
        if (crop && tile) {
          const adjSunflowers = this.countAdjacentSunflowers(c, r);
          const isHydrated = tile.watered || crop.entity.wateredToday || isRainy;
          crop.advanceGrowth(
            isHydrated,
            this.state.currentSeason,
            this.state.currentWeather,
            adjSunflowers
          );
          crop.entity.wateredToday = false;
        }
      }
    }

    // 5. Giant Pumpkin Mutation Check (5% chance on 3x3 mature pumpkins)
    this.checkGiantPumpkinMutations();

    // 6. Restore Player Energy
    this.state.energy = this.state.maxEnergy;
  }

  public countAdjacentSunflowers(tileX: number, tileY: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = this.grid.getCrop(tileX + dx, tileY + dy);
        if (neighbor && neighbor.species.id === 'sunflower' && neighbor.entity.stage === 3 && !neighbor.entity.withered) {
          count++;
        }
      }
    }
    return count;
  }

  public checkGiantPumpkinMutations(): void {
    for (let r = 0; r <= GRID_HEIGHT - 3; r++) {
      for (let c = 0; c <= GRID_WIDTH - 3; c++) {
        let allMaturePumpkins = true;
        for (let dy = 0; dy < 3; dy++) {
          for (let dx = 0; dx < 3; dx++) {
            const crop = this.grid.getCrop(c + dx, r + dy);
            if (!crop || crop.species.id !== 'pumpkin' || crop.entity.stage !== 3 || crop.entity.withered) {
              allMaturePumpkins = false;
              break;
            }
          }
          if (!allMaturePumpkins) break;
        }

        if (allMaturePumpkins && Math.random() < 0.05) {
          for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
              const crop = this.grid.getCrop(c + dx, r + dy);
              if (crop) {
                crop.entity.isGiant = true;
                crop.entity.giantOriginX = c;
                crop.entity.giantOriginY = r;
              }
            }
          }
        }
      }
    }
  }

  public calculateToolAOE(cx: number, cy: number, radius: number): { x: number; y: number }[] {
    const tiles: { x: number; y: number }[] = [];
    if (radius === 1) {
      tiles.push({ x: cx, y: cy });
    } else if (radius === 2) {
      // 1x3 horizontal line
      tiles.push({ x: cx - 1, y: cy }, { x: cx, y: cy }, { x: cx + 1, y: cy });
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

  public createItemPickup(tileX: number, tileY: number, itemId: string, quantity: number): ItemPickup {
    const sprite = new Sprite();
    const startX = tileX * TILE_SIZE + 4;
    const startY = tileY * TILE_SIZE + 4;

    sprite.x = startX;
    sprite.y = startY;

    if (this.textureGen) {
      const texKey = `item_${itemId.replace('crop_', '')}`;
      sprite.texture = this.textureGen.getTexture(texKey);
    }

    this.pickupsContainer.addChild(sprite);

    const pickup: ItemPickup = {
      sprite,
      itemId,
      quantity,
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 40,
      vy: -90, // Upward pop velocity
      life: 5.0, // 5 seconds total lifespan
      bounceCount: 0,
      resting: false,
      baseY: startY,
      animTimer: Math.random() * Math.PI * 2,
    };

    this.activePickups.push(pickup);
    return pickup;
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

    // Update active item pickup physics & magnet attraction
    for (let i = this.activePickups.length - 1; i >= 0; i--) {
      const pickup = this.activePickups[i];
      pickup.life -= dt;

      if (!pickup.resting) {
        // Physics Arc & Bounce
        pickup.x += pickup.vx * dt;
        pickup.vy += 320 * dt; // Gravity
        pickup.y += pickup.vy * dt;

        if (pickup.y >= pickup.baseY && pickup.bounceCount < 2) {
          pickup.y = pickup.baseY;
          pickup.vy = -pickup.vy * 0.45; // Bounce coefficient
          pickup.vx *= 0.45;
          pickup.bounceCount += 1;
        } else if (pickup.y >= pickup.baseY && pickup.bounceCount >= 2) {
          pickup.y = pickup.baseY;
          pickup.vy = 0;
          pickup.vx = 0;
          pickup.resting = true;
        }
        pickup.sprite.x = pickup.x;
        pickup.sprite.y = pickup.y;
      } else {
        // Resting Sinusoidal Bobbing Animation
        pickup.animTimer += dt;
        const bobOffset = Math.sin(pickup.animTimer * 9.42) * 3.0;
        pickup.sprite.y = pickup.baseY - 4.0 + bobOffset;

        // Player Magnet Attraction
        const dx = this.playerPosition.x - pickup.sprite.x;
        const dy = this.playerPosition.y - pickup.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= 36.0) {
          // Accelerate toward player
          const speed = 150.0;
          pickup.sprite.x += (dx / dist) * speed * dt;
          pickup.sprite.y += (dy / dist) * speed * dt;

          if (dist <= 8.0) {
            // Collected!
            pickup.life = 0;
          }
        }
      }

      // Fade out near end of life
      if (pickup.life < 1.0) {
        pickup.sprite.alpha = Math.max(0, pickup.life);
      }

      if (pickup.life <= 0) {
        this.pickupsContainer.removeChild(pickup.sprite);
        pickup.sprite.destroy();
        this.activePickups.splice(i, 1);
      }
    }
  }

  public getActivePickups(): ItemPickup[] {
    return this.activePickups;
  }
}
