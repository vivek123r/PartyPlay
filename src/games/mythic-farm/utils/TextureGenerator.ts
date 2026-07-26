import { Assets, Rectangle, Texture } from 'pixi.js';
import { AUTOTILE_BITMASK_MAP } from '../config';
import { publicAsset } from '@shared/assetUrl';

const FARM_ASSET_ROOT = '/assets/Farming/Sprout Lands - Sprites - Basic pack';
const farmAsset = (path: string): string => publicAsset(`${FARM_ASSET_ROOT}/${path}`);

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
  private loadedSproutLands = false;

  /**
   * Asynchronously loads Sprout Lands PNG sprite assets via PixiJS Assets.load.
   */
  public async loadSproutLandsAssets(): Promise<void> {
    if (this.loadedSproutLands) return;
    try {
      const urls = {
        grass: farmAsset('Tilesets/Grass.png'),
        tilled: farmAsset('Tilesets/Tilled_Dirt.png'),
        fences: farmAsset('Tilesets/Fences.png'),
        house: farmAsset('Tilesets/Wooden House.png'),
        tools: farmAsset('Objects/Basic_tools_and_meterials.png'),
      };

      const [grassTex, tilledTex, fenceTex, houseTex, toolsTex] = await Promise.all([
        Assets.load<Texture>(urls.grass),
        Assets.load<Texture>(urls.tilled),
        Assets.load<Texture>(urls.fences),
        Assets.load<Texture>(urls.house),
        Assets.load<Texture>(urls.tools),
      ]);

      if (grassTex?.source) grassTex.source.scaleMode = 'nearest';
      if (tilledTex?.source) tilledTex.source.scaleMode = 'nearest';
      if (fenceTex?.source) fenceTex.source.scaleMode = 'nearest';
      if (houseTex?.source) houseTex.source.scaleMode = 'nearest';
      if (toolsTex?.source) toolsTex.source.scaleMode = 'nearest';

      // Base terrain tiles
      this.cache.set('tile_untilled', new Texture({ source: grassTex.source, frame: new Rectangle(16, 16, 16, 16) }));
      this.cache.set('tile_tilled', new Texture({ source: tilledTex.source, frame: new Rectangle(16, 16, 16, 16) }));
      this.cache.set('tile_watered', new Texture({ source: tilledTex.source, frame: new Rectangle(16, 16, 16, 16) }));

      // Extract full 11x7 autotile maps (Grass & Tilled Dirt)
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 11; c++) {
          const frame = new Rectangle(c * 16, r * 16, 16, 16);
          this.cache.set(`grass_autotile_${c}_${r}`, new Texture({ source: grassTex.source, frame }));
          this.cache.set(`tilled_autotile_${c}_${r}`, new Texture({ source: tilledTex.source, frame }));
        }
      }

      // Populate bitmask map keys (0..15)
      for (const [bmStr, mapping] of Object.entries(AUTOTILE_BITMASK_MAP)) {
        const bm = parseInt(bmStr, 10);
        const frame = new Rectangle(mapping.col * 16, mapping.row * 16, 16, 16);
        this.cache.set(`grass_autotile_bm_${bm}`, new Texture({ source: grassTex.source, frame }));
        this.cache.set(`tilled_autotile_bm_${bm}`, new Texture({ source: tilledTex.source, frame }));
      }

      // Fences (4x4 tileset)
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const frame = new Rectangle(c * 16, r * 16, 16, 16);
          this.cache.set(`fence_${c}_${r}`, new Texture({ source: fenceTex.source, frame }));
        }
      }
      this.cache.set('tile_fence', new Texture({ source: fenceTex.source, frame: new Rectangle(0, 0, 16, 16) }));

      // Wooden House (7x5 tileset)
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 7; c++) {
          const frame = new Rectangle(c * 16, r * 16, 16, 16);
          this.cache.set(`house_${c}_${r}`, new Texture({ source: houseTex.source, frame }));
        }
      }
      this.cache.set('tile_house', new Texture({ source: houseTex.source, frame: new Rectangle(16, 16, 16, 16) }));

      // Tools & Materials
      this.cache.set('tool_watering_can_basic', new Texture({ source: toolsTex.source, frame: new Rectangle(0, 0, 16, 16) }));
      this.cache.set('item_watering_can', new Texture({ source: toolsTex.source, frame: new Rectangle(0, 0, 16, 16) }));
      this.cache.set('tool_axe_basic', new Texture({ source: toolsTex.source, frame: new Rectangle(16, 0, 16, 16) }));
      this.cache.set('item_axe', new Texture({ source: toolsTex.source, frame: new Rectangle(16, 0, 16, 16) }));
      this.cache.set('tool_hoe_basic', new Texture({ source: toolsTex.source, frame: new Rectangle(32, 0, 16, 16) }));
      this.cache.set('item_hoe', new Texture({ source: toolsTex.source, frame: new Rectangle(32, 0, 16, 16) }));
      this.cache.set('item_stone', new Texture({ source: toolsTex.source, frame: new Rectangle(0, 16, 16, 16) }));
      this.cache.set('item_wood', new Texture({ source: toolsTex.source, frame: new Rectangle(16, 16, 16, 16) }));

      // ── Character Walk Animations ────────────────────────────────────────
      // Basic Charakter Spritesheet.png: 192×192px, 4×4 frames @ 48×48px
      // Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up; Col 0..3 = walk cycle
      const charTex = await Assets.load<Texture>(
        farmAsset('Characters/Basic Charakter Spritesheet.png')
      );
      if (charTex?.source) charTex.source.scaleMode = 'nearest';
      const WALK_DIRS = ['down', 'left', 'right', 'up'];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const frame = new Rectangle(col * 48, row * 48, 48, 48);
          this.cache.set(`character_walk_${WALK_DIRS[row]}_${col}`, new Texture({ source: charTex.source, frame }));
        }
      }

      // ── Tool Action Animations ────────────────────────────────────────────
      // Basic Charakter Actions.png: 96×576px, 2×12 frames @ 48×48px
      // Row order: hoe_down, hoe_up, can_down, can_up, axe_down, axe_up, scythe_down, scythe_up, ...
      const actionTex = await Assets.load<Texture>(
        farmAsset('Characters/Basic Charakter Actions.png')
      );
      if (actionTex?.source) actionTex.source.scaleMode = 'nearest';
      const ACTION_ROWS = ['hoe_down', 'hoe_up', 'can_down', 'can_up', 'axe_down', 'axe_up', 'scythe_down', 'scythe_up'];
      for (let row = 0; row < ACTION_ROWS.length; row++) {
        // col 0 = character frame (with tool visible), col 1 = tool-only frame
        const frame = new Rectangle(0, row * 48, 48, 48);
        this.cache.set(`action_${ACTION_ROWS[row]}`, new Texture({ source: actionTex.source, frame }));
      }

      // ── Crop Growth Stage Sprites ─────────────────────────────────────────
      // Basic_Plants.png: 96×32px, 6×2 grid @ 16×16px
      // Col: 0=wheat, 1=pumpkin, 2=strawberry(crystal_berry), 3=dragonfruit, 4=sunflower, 5=elder_oak
      // Row 0 = seedling/sprout stages (0,1) | Row 1 = flowering/ripe stages (2,3)
      const plantsTex = await Assets.load<Texture>(
        farmAsset('Objects/Basic_Plants.png')
      );
      if (plantsTex?.source) plantsTex.source.scaleMode = 'nearest';
      const PLANT_COLS: Record<string, number> = {
        wheat: 0, pumpkin: 1, crystal_berry: 2, dragonfruit: 3, sunflower: 4, elder_oak: 5,
      };
      for (const [species, col] of Object.entries(PLANT_COLS)) {
        const youngFrame = new Rectangle(col * 16, 0, 16, 16);
        const matureFrame = new Rectangle(col * 16, 16, 16, 16);
        // Stages 0 & 1 → young plant sprite (row 0)
        this.cache.set(`crop_${species}_0`, new Texture({ source: plantsTex.source, frame: youngFrame }));
        this.cache.set(`crop_${species}_1`, new Texture({ source: plantsTex.source, frame: youngFrame }));
        // Stages 2 & 3 → mature/ripe sprite (row 1)
        this.cache.set(`crop_${species}_2`, new Texture({ source: plantsTex.source, frame: matureFrame }));
        this.cache.set(`crop_${species}_3`, new Texture({ source: plantsTex.source, frame: matureFrame }));
        // Withered → keep procedural fallback (no sheet entry)
      }

      // ── Chicken Sprites ───────────────────────────────────────────────────
      // Free Chicken Sprites.png: 64×32px, 4×2 frames @ 16×16px
      // Row 0 = idle cycle (4 frames), Row 1 = walk cycle (4 frames)
      const chickenTex = await Assets.load<Texture>(
        farmAsset('Characters/Free Chicken Sprites.png')
      );
      if (chickenTex?.source) chickenTex.source.scaleMode = 'nearest';
      for (let f = 0; f < 4; f++) {
        this.cache.set(`chicken_idle_${f}`, new Texture({ source: chickenTex.source, frame: new Rectangle(f * 16, 0, 16, 16) }));
        this.cache.set(`chicken_walk_${f}`, new Texture({ source: chickenTex.source, frame: new Rectangle(f * 16, 16, 16, 16) }));
      }

      // ── Cow Sprites ───────────────────────────────────────────────────────
      // Free Cow Sprites.png: 96×64px, 3×2 frames @ 32×32px
      // Row 0 = idle cycle (3 frames), Row 1 = walk cycle (3 frames)
      const cowTex = await Assets.load<Texture>(
        farmAsset('Characters/Free Cow Sprites.png')
      );
      if (cowTex?.source) cowTex.source.scaleMode = 'nearest';
      for (let f = 0; f < 3; f++) {
        this.cache.set(`cow_idle_${f}`, new Texture({ source: cowTex.source, frame: new Rectangle(f * 32, 0, 32, 32) }));
        this.cache.set(`cow_walk_${f}`, new Texture({ source: cowTex.source, frame: new Rectangle(f * 32, 32, 32, 32) }));
      }

      // ── Egg & Nest Items ──────────────────────────────────────────────────
      // Egg_And_Nest.png: 64×16px, 4×1 frames @ 16×16px
      const eggNestTex = await Assets.load<Texture>(
        farmAsset('Characters/Egg_And_Nest.png')
      );
      if (eggNestTex?.source) eggNestTex.source.scaleMode = 'nearest';
      this.cache.set('egg_item',       new Texture({ source: eggNestTex.source, frame: new Rectangle(0,  0, 16, 16) }));
      this.cache.set('nest_empty',     new Texture({ source: eggNestTex.source, frame: new Rectangle(16, 0, 16, 16) }));
      this.cache.set('nest_with_egg',  new Texture({ source: eggNestTex.source, frame: new Rectangle(32, 0, 16, 16) }));
      this.cache.set('item_egg',       new Texture({ source: eggNestTex.source, frame: new Rectangle(0,  0, 16, 16) }));

      this.loadedSproutLands = true;

    } catch (e) {
      console.warn('[TextureGenerator] Failed to load Sprout Lands assets (using procedural fallback):', e);
    }
  }

  public isSproutLandsLoaded(): boolean {
    return this.loadedSproutLands;
  }

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

  public getTileTexture(type: string): Texture {
    if (type === 'grass') return this.getTexture('tile_untilled');
    if (type === 'tilled') return this.getTexture('tile_tilled');
    if (type === 'watered') return this.getTexture('tile_watered');
    if (type.startsWith('tile_')) return this.getTexture(type);
    return this.getTexture('tile_' + type);
  }

  public getCropTextures(species: string): Texture[] {
    return [
      this.getTexture(`crop_${species}_0`),
      this.getTexture(`crop_${species}_1`),
      this.getTexture(`crop_${species}_2`),
      this.getTexture(`crop_${species}_3`),
    ];
  }

  public getCharacterWalkTextures(direction: string): Texture[] {
    return [
      this.getTexture(`character_walk_${direction}_0`),
      this.getTexture(`character_walk_${direction}_1`),
    ];
  }

  public clearCache(): void {
    this.clear();
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
    if (key === 'tile_untilled' || key.startsWith('grass_autotile')) {
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
    } else if (key === 'tile_tilled' || key.startsWith('tilled_autotile')) {
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
    } else if (key === 'tile_watered' || key.startsWith('watered_autotile')) {
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
