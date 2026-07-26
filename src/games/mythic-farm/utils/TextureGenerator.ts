import { Texture } from 'pixi.js';

export type TextureKey =
  | 'tile_untilled'
  | 'tile_tilled'
  | 'tile_watered'
  | 'tile_stone'
  | 'tile_locked'
  | `crop_${string}_${0 | 1 | 2 | 3 | 'withered'}`
  | `animal_${'golden_goat' | 'astral_bee' | 'silk_moth' | 'feathered_chocobo'}`
  | `tool_${'hoe' | 'watering_can' | 'axe' | 'scythe'}_${'basic' | 'copper' | 'gold' | 'titanium'}`
  | `icon_${string}`
  | `item_${string}`;

export class TextureGenerator {
  private cache: Map<string, Texture> = new Map();

  /**
   * Retrieves a cached texture or generates a new procedural pixel texture.
   */
  public getTexture(key: string): Texture {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const texture = this.generateTextureByKey(key);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Pre-generates and caches all standard procedural textures.
   */
  public generateAll(): Map<string, Texture> {
    const keys: string[] = [
      'tile_untilled',
      'tile_tilled',
      'tile_watered',
      'tile_stone',
      'tile_locked',
      ...this.getCropKeys(),
      'animal_golden_goat',
      'animal_astral_bee',
      'animal_silk_moth',
      'animal_feathered_chocobo',
      ...this.getToolKeys(),
      'icon_coin',
      'icon_energy',
      'icon_season_spring',
      'icon_season_summer',
      'icon_season_autumn',
      'icon_season_winter',
      'item_jam',
      'item_wine',
      'item_flour',
      'item_cloth',
      'item_milk',
      'item_honey',
      'item_thread',
      'item_egg',
    ];

    for (const key of keys) {
      this.getTexture(key);
    }
    return this.cache;
  }

  /**
   * Destroys all cached textures and resets the internal map.
   */
  public clear(): void {
    for (const texture of this.cache.values()) {
      texture.destroy(true);
    }
    this.cache.clear();
  }

  /**
   * Helper static method to create a PixiJS Texture from Canvas 2D.
   */
  public static createCanvasTexture(
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D) => void
  ): Texture {
    if (typeof document === 'undefined') {
      return Texture.EMPTY;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx);
    }
    return Texture.from(canvas);
  }

  private generateTextureByKey(key: string): Texture {
    const isLargeTree = key.startsWith('crop_elder_oak');
    const isAnimal = key.startsWith('animal_');
    const width = isLargeTree ? 32 : isAnimal ? 24 : 16;
    const height = width;

    return TextureGenerator.createCanvasTexture(width, height, (ctx) => {
      if (key.startsWith('tile_')) {
        this.drawTile(ctx, key, width, height);
      } else if (key.startsWith('crop_')) {
        this.drawCrop(ctx, key, width, height);
      } else if (key.startsWith('animal_')) {
        this.drawAnimal(ctx, key, width, height);
      } else if (key.startsWith('tool_')) {
        this.drawTool(ctx, key, width, height);
      } else if (key.startsWith('icon_') || key.startsWith('item_')) {
        this.drawIconOrItem(ctx, key, width, height);
      } else {
        // Fallback simple square
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, width, height);
      }
    });
  }

  // ==========================================
  // Tile Drawing Routines
  // ==========================================
  private drawTile(ctx: CanvasRenderingContext2D, key: string, w: number, h: number): void {
    if (key === 'tile_untilled') {
      // Grass tile
      ctx.fillStyle = '#4a8505';
      ctx.fillRect(0, 0, w, h);
      // Speckles
      ctx.fillStyle = '#68a614';
      ctx.fillRect(2, 3, 1, 1);
      ctx.fillRect(8, 2, 2, 1);
      ctx.fillRect(12, 9, 1, 2);
      ctx.fillRect(4, 11, 2, 1);
      ctx.fillStyle = '#346102';
      ctx.fillRect(5, 7, 1, 1);
      ctx.fillRect(10, 14, 2, 1);
      ctx.fillRect(1, 13, 1, 1);
    } else if (key === 'tile_tilled') {
      // Tilled soil
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(0, 0, w, h);
      // Furrows
      ctx.fillStyle = '#3b2312';
      ctx.fillRect(0, 2, w, 2);
      ctx.fillRect(0, 7, w, 2);
      ctx.fillRect(0, 12, w, 2);
      // Dirt highlights
      ctx.fillStyle = '#7a4d2c';
      ctx.fillRect(3, 1, 2, 1);
      ctx.fillRect(9, 6, 3, 1);
      ctx.fillRect(2, 11, 2, 1);
    } else if (key === 'tile_watered') {
      // Damp watered soil
      ctx.fillStyle = '#3b2312';
      ctx.fillRect(0, 0, w, h);
      // Moisture furrows
      ctx.fillStyle = '#241409';
      ctx.fillRect(0, 2, w, 2);
      ctx.fillRect(0, 7, w, 2);
      ctx.fillRect(0, 12, w, 2);
      // Water sheen
      ctx.fillStyle = '#4d88ff';
      ctx.fillRect(4, 3, 2, 1);
      ctx.fillRect(10, 8, 3, 1);
      ctx.fillRect(2, 13, 2, 1);
    } else if (key === 'tile_stone') {
      // Cobblestone path
      ctx.fillStyle = '#686d76';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#373a40';
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      ctx.fillRect(8, 0, 1, h);
      ctx.fillRect(0, 8, w, 1);
      ctx.fillStyle = '#9aa0a6';
      ctx.fillRect(1, 1, 6, 6);
      ctx.fillRect(9, 9, 6, 6);
    } else if (key === 'tile_locked') {
      // Locked expand plot tile
      ctx.fillStyle = '#2a4505';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      for (let i = 0; i < w; i += 4) {
        ctx.fillRect(i, 0, 2, h);
      }
      // Padlock outline
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(6, 7, 4, 4);
      ctx.fillRect(7, 5, 2, 2);
    }
  }

  // ==========================================
  // Crop Drawing Routines
  // ==========================================
  private drawCrop(ctx: CanvasRenderingContext2D, key: string, w: number, h: number): void {
    const parts = key.split('_');
    const species = parts.slice(1, -1).join('_');
    const stageStr = parts[parts.length - 1];

    if (stageStr === 'withered') {
      // Withered crop
      ctx.fillStyle = '#523a28';
      ctx.fillRect(7, 9, 2, 7);
      ctx.fillStyle = '#8c6d3f';
      ctx.fillRect(5, 7, 6, 3);
      return;
    }

    const stage = parseInt(stageStr, 10);

    if (stage === 0) {
      // Seedling (Universal)
      ctx.fillStyle = '#7bc043';
      ctx.fillRect(7, 12, 2, 4);
      ctx.fillRect(5, 11, 2, 2);
      ctx.fillRect(9, 11, 2, 2);
      return;
    }

    if (stage === 1) {
      // Sprout
      ctx.fillStyle = '#438945';
      ctx.fillRect(7, 8, 2, 8);
      ctx.fillRect(4, 9, 3, 2);
      ctx.fillRect(9, 8, 3, 2);
      return;
    }

    // Stage 2 (Flowering) and Stage 3 (Harvestable) by species
    if (species === 'wheat') {
      ctx.fillStyle = stage === 2 ? '#a3c75d' : '#e8bc3a';
      ctx.fillRect(6, 4, 4, 12);
      ctx.fillRect(4, 2, 8, 4);
      if (stage === 3) {
        ctx.fillStyle = '#fff3b0';
        ctx.fillRect(3, 1, 2, 2);
        ctx.fillRect(11, 1, 2, 2);
      }
    } else if (species === 'pumpkin') {
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(3, 12, 10, 3);
      if (stage === 2) {
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(6, 8, 4, 4);
      } else {
        ctx.fillStyle = '#f3722c';
        ctx.beginPath();
        ctx.arc(8, 9, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e65100';
        ctx.fillRect(7, 4, 2, 2);
      }
    } else if (species === 'crystal_berry') {
      ctx.fillStyle = '#4cc9f0';
      ctx.fillRect(7, 6, 2, 10);
      if (stage === 2) {
        ctx.fillStyle = '#ab47bc';
        ctx.fillRect(5, 4, 6, 4);
      } else {
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(4, 4, 4, 4);
        ctx.fillRect(9, 5, 4, 4);
        ctx.fillRect(6, 8, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(5, 5, 1, 1);
        ctx.fillRect(10, 6, 1, 1);
      }
    } else if (species === 'dragonfruit') {
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(6, 6, 4, 10);
      if (stage === 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(5, 3, 6, 5);
      } else {
        ctx.fillStyle = '#f72585';
        ctx.fillRect(4, 3, 8, 8);
        ctx.fillStyle = '#ffee58';
        ctx.fillRect(4, 3, 2, 2);
        ctx.fillRect(10, 3, 2, 2);
        ctx.fillRect(7, 10, 2, 2);
      }
    } else if (species === 'elder_oak') {
      // 32x32 Tree
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(13, 16, 6, 16);
      if (stage === 2) {
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(16, 14, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath();
        ctx.arc(16, 14, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffb300';
        ctx.fillRect(10, 10, 3, 3);
        ctx.fillRect(19, 12, 3, 3);
        ctx.fillRect(14, 18, 3, 3);
      }
    } else if (species === 'sunflower') {
      ctx.fillStyle = '#558b2f';
      ctx.fillRect(7, 5, 2, 11);
      if (stage === 2) {
        ctx.fillStyle = '#33691e';
        ctx.fillRect(5, 3, 6, 5);
      } else {
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(8, 5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4e342e';
        ctx.beginPath();
        ctx.arc(8, 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ==========================================
  // Livestock Drawing Routines (24x24 px)
  // ==========================================
  private drawAnimal(ctx: CanvasRenderingContext2D, key: string, w: number, h: number): void {
    if (key === 'animal_golden_goat') {
      // Goat body
      ctx.fillStyle = '#ffe8a3';
      ctx.fillRect(4, 8, 14, 10);
      // Legs
      ctx.fillStyle = '#f4a261';
      ctx.fillRect(5, 18, 2, 5);
      ctx.fillRect(8, 18, 2, 5);
      ctx.fillRect(13, 18, 2, 5);
      ctx.fillRect(16, 18, 2, 5);
      // Head & Horns
      ctx.fillRect(15, 4, 6, 6);
      ctx.fillStyle = '#b07d62';
      ctx.fillRect(16, 1, 2, 3);
      ctx.fillRect(19, 2, 2, 2);
      // Eye & Collar
      ctx.fillStyle = '#111111';
      ctx.fillRect(19, 6, 1, 1);
      ctx.fillStyle = '#e9c46a';
      ctx.fillRect(14, 10, 2, 4);
    } else if (key === 'animal_astral_bee') {
      // Bee body
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(6, 8, 12, 10);
      ctx.fillStyle = '#111111';
      ctx.fillRect(9, 8, 2, 10);
      ctx.fillRect(13, 8, 2, 10);
      // Wings
      ctx.fillStyle = 'rgba(200,240,255,0.7)';
      ctx.fillRect(7, 3, 5, 5);
      ctx.fillRect(12, 3, 5, 5);
      // Stinger
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(4, 12, 2, 2);
    } else if (key === 'animal_silk_moth') {
      // Moth wings
      ctx.fillStyle = '#e0aaff';
      ctx.beginPath();
      ctx.ellipse(12, 12, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c77dff';
      ctx.beginPath();
      ctx.ellipse(12, 12, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fluffy body
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(10, 6, 4, 12);
    } else if (key === 'animal_feathered_chocobo') {
      // Chocobo body
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(6, 10, 12, 9);
      // Neck & Head
      ctx.fillRect(14, 4, 4, 8);
      ctx.fillRect(16, 2, 5, 5);
      // Beak
      ctx.fillStyle = '#fb8500';
      ctx.fillRect(21, 4, 3, 2);
      // Legs
      ctx.fillRect(8, 19, 2, 4);
      ctx.fillRect(13, 19, 2, 4);
    }
  }

  // ==========================================
  // Tool Drawing Routines (16x16 px)
  // ==========================================
  private drawTool(ctx: CanvasRenderingContext2D, key: string, w: number, h: number): void {
    const parts = key.split('_');
    const toolType = parts[1];
    const tier = parts[2];

    const tierColors: Record<string, string> = {
      basic: '#8d99ae',
      copper: '#b56576',
      gold: '#ffb703',
      titanium: '#48cae4',
    };
    const metallic = tierColors[tier] || '#8d99ae';

    // Wooden handle
    ctx.fillStyle = '#6c584c';
    ctx.fillRect(3, 11, 10, 2);

    // Tool head
    ctx.fillStyle = metallic;
    if (toolType === 'hoe') {
      ctx.fillRect(11, 6, 3, 7);
    } else if (toolType === 'watering_can') {
      ctx.fillRect(5, 5, 7, 7);
      ctx.fillRect(12, 7, 3, 2);
    } else if (toolType === 'axe') {
      ctx.fillRect(10, 4, 4, 6);
    } else if (toolType === 'scythe') {
      ctx.beginPath();
      ctx.arc(10, 6, 4, 0, Math.PI);
      ctx.fill();
    }
  }

  // ==========================================
  // Icons & Item Drawing Routines (16x16 px)
  // ==========================================
  private drawIconOrItem(ctx: CanvasRenderingContext2D, key: string, w: number, h: number): void {
    if (key === 'icon_coin') {
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(6, 6, 4, 4);
    } else if (key === 'icon_energy') {
      ctx.fillStyle = '#06d6a0';
      ctx.beginPath();
      ctx.moveTo(9, 2);
      ctx.lineTo(4, 9);
      ctx.lineTo(8, 9);
      ctx.lineTo(7, 14);
      ctx.lineTo(12, 7);
      ctx.lineTo(8, 7);
      ctx.closePath();
      ctx.fill();
    } else if (key.startsWith('icon_season_')) {
      const season = key.replace('icon_season_', '');
      const seasonColors: Record<string, string> = {
        spring: '#ff87ab',
        summer: '#ffd166',
        autumn: '#f4a261',
        winter: '#90e0ef',
      };
      ctx.fillStyle = seasonColors[season] || '#ffffff';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (key.startsWith('item_')) {
      ctx.fillStyle = '#90caf9';
      ctx.fillRect(4, 4, 8, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 5, 6, 3);
    }
  }

  private getCropKeys(): string[] {
    const crops = ['wheat', 'pumpkin', 'crystal_berry', 'dragonfruit', 'elder_oak', 'sunflower'];
    const stages: Array<0 | 1 | 2 | 3 | 'withered'> = [0, 1, 2, 3, 'withered'];
    const keys: string[] = [];
    for (const crop of crops) {
      for (const st of stages) {
        keys.push(`crop_${crop}_${st}`);
      }
    }
    return keys;
  }

  private getToolKeys(): string[] {
    const tools = ['hoe', 'watering_can', 'axe', 'scythe'];
    const tiers = ['basic', 'copper', 'gold', 'titanium'];
    const keys: string[] = [];
    for (const tool of tools) {
      for (const tier of tiers) {
        keys.push(`tool_${tool}_${tier}`);
      }
    }
    return keys;
  }
}
