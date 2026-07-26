# Technical Analysis & Architecture Plan: M1 Utilities
**Module**: Mythic Farm (`src/games/mythic-farm/utils/`)
**Target Utilities**: `TextureGenerator.ts`, `AudioSynthesizer.ts`, `StorageManager.ts`
**Author**: explorer_m1_2

---

## 1. Executive Summary

This document specifies the technical design, interface contracts, pixel rendering procedural algorithms, sound synthesis presets, and LocalStorage state persistence strategy for the M1 Utilities of **Mythic Farm**.

These three utility modules provide the foundational services required by the game's entity and system layers:
1. **`TextureGenerator.ts`**: Procedural 2D Canvas-to-PixiJS `Texture` generation engine producing 100% pixel-perfect asset-free sprites for ground tiles, multi-stage crops/trees, mythical livestock, farming tools, and HUD interface icons.
2. **`AudioSynthesizer.ts`**: Web Audio sound synthesis engine built on top of PartyPlay's `context.audio.playTone()` providing custom frequency/waveform presets for farming actions, mythical animal chirps, workshop events, economic sales, and an ambient pentatonic background music loop.
3. **`StorageManager.ts`**: Type-safe persistence layer wrapping PartyPlay's `context.storage` (`StorageService`), managing JSON serialization, versioning, fallback schema initialization, corrupt data recovery, and save/load operations for `FarmState`.

---

## 2. Codebase Architecture & File Structure

```
src/games/mythic-farm/
├── types.ts                     # Shared interfaces (TileData, CropEntity, FarmState, etc.)
├── config.ts                    # Game constants & asset palettes
└── utils/
    ├── TextureGenerator.ts      # Canvas 2D -> PixiJS Texture cache engine
    ├── AudioSynthesizer.ts      # Web Audio playTone preset facade & BGM synth
    ├── StorageManager.ts        # context.storage persistence manager
    └── Utils.test.ts            # Unit test suite for utilities
```

---

## 3. Component Specification: `TextureGenerator.ts`

### 3.1 Architectural Strategy
To satisfy the zero-external-asset constraint, `TextureGenerator` utilizes HTML5 `HTMLCanvasElement` 2D context rendering to build pixel sprites at specified dimensions, converting canvas instances into PixiJS `Texture` objects via `Texture.from(canvas)`.

- **Crisp Pixel Art**: `ctx.imageSmoothingEnabled = false` is enforced on all canvas contexts.
- **Caching**: Generated textures are cached in an internal `Map<string, Texture>` to prevent redundant canvas operations and GPU allocations.
- **Base Grid Resolution**: 16×16 pixel grid for standard tiles, crops, tools, and HUD icons; 24×24 pixel grid for livestock entities; 32×32 pixel grid for trees (Elder-Oak).

### 3.2 Texture Asset Catalog & Procedural Drawing Specs

#### Ground Tiles (16×16 px)
1. **`tile_untilled` / `tile_grass`**:
   - Base color: Lush Green `#4a8505` (Hex: `0x4a8505`)
   - Details: Random 1x1 noise pixels of lighter green `#68a614` and dark green `#346102` to give depth and texture.
2. **`tile_tilled`**:
   - Base color: Dark Rich Brown `#5c3a21` (Hex: `0x5c3a21`)
   - Details: 4 horizontal furrow lines (`#3b2312`) with lighter dirt specks (`#7a4d2c`).
3. **`tile_watered`**:
   - Base color: Damp Mud Brown `#3b2312` (Hex: `0x3b2312`)
   - Details: Blue specular moisture highlights (`#4d88ff`, 2-3 pixels per tile).
4. **`tile_stone`**:
   - Base color: Slate Gray `#686d76` (Hex: `0x686d76`)
   - Details: Cobblestone grid outline (`#373a40`) and highlight edges (`#9aa0a6`).
5. **`tile_locked`**:
   - Base color: Shadowed Grass `#2a4505` (Hex: `0x2a4505`)
   - Details: Semi-transparent dark hatch lines (`rgba(0,0,0,0.4)`) and a central padlock icon outline.

#### Multi-Stage Crops & Trees (16×16 px / 32×32 px for trees)
Each crop features 4 growth stages (0: Seedling, 1: Sprout, 2: Flowering/Maturing, 3: Harvestable) plus 1 Withered stage:

| Crop/Tree | Stage 0 (Seedling) | Stage 1 (Sprout) | Stage 2 (Flowering/Branching) | Stage 3 (Harvestable) | Withered |
|-----------|--------------------|------------------|-------------------------------|-----------------------|----------|
| **Wheat** | 2 small green dots (`#7bc043`) | 2 tall green shoots (`#438945`) | Tall stalks with green heads (`#a3c75d`) | Golden wheat head with grain awns (`#e8bc3a`) | Brown drooping dry stalk (`#8c6d3f`) |
| **Pumpkin** | 2 rounded green seedling leaves | Vine stem spreading sideways | Yellow flower blossom (`#ffd166`) | Plump orange pumpkin with green stem (`#f3722c`) | Dark brown shriveled vine (`#523a28`) |
| **Crystal Berry** | Cyan seedling dot | Dual stem with tiny cyan leaves | Cyan flower with blue core (`#4cc9f0`) | 3 glowing cyan/blue berries with white shine highlight (`#48cae4`, `#ffffff`) | Dull cracked gray crystal stem (`#6c757d`) |
| **Dragonfruit** | Magenta seed dot | Green cactus stem segment | Magenta flower bulb (`#f72585`) | Vibrant pink & green scaled dragonfruit (`#7209b7`, `#f72585`) | Pale withered cactus stump (`#8d99ae`) |
| **Elder-Oak** (32x32) | Small oak sapling stem | Young leafy shrub (16x16 canopy) | Medium oak tree with branches (24x24) | Ancient oak tree (32x32) with golden glowing leaves (`#fb8500`) | Bare dead branches with no leaves (`#4a3e3d`) |
| **Sunflower** | Seedling leaf | Tall stem with side leaves | Green stem with unopened round bud | Large golden sunflower face (`#ffb703`) with dark center (`#381d2a`) | Drooping brown withered blossom (`#584033`) |

#### Mythical Livestock (24×24 px)
1. **`animal_golden_goat`**:
   - White/Golden body (`#ffe8a3`, `#f4a261`), brown curving horns (`#b07d62`), dark eye, pink ears, brass bell collar (`#e9c46a`).
2. **`animal_astral_bee`**:
   - Black and glowing cyan striped abdomen (`#00f5d4`, `#111111`), translucent blue wings (`rgba(200,240,255,0.7)`), glowing antenna tips.
3. **`animal_silk_moth`**:
   - Iridescent silver/lavender wide wings (`#e0aaff`, `#c77dff`), fluffy antenna crown, soft white body (`#f8f9fa`).
4. **`animal_feathered_chocobo`**:
   - Vibrant golden-yellow feathered bird body (`#ffb703`, `#fd9e02`), head crest plume, orange beak (`#fb8500`), cute tail feathers.

#### Tools (16×16 px in 4 Tiers: Basic `#8d99ae`, Copper `#b56576`, Gold `#ffb703`, Titanium `#48cae4`)
- **Hoe**: Angled blade with wooden handle (`#6c584c`).
- **Watering Can**: Can spout with handle and water droplet detail.
- **Axe**: Dual-curved axe blade with reinforced shaft.
- **Scythe**: Curved harvesting blade with long handle.

#### HUD & Icon Assets (16×16 px)
- **`icon_coin`**: Golden coin ring (`#ffb703`) with inner shadow (`#f77f00`) and shine (`#fff3b0`).
- **`icon_energy`**: Emerald stamina lightning bolt (`#06d6a0`) with bright highlight.
- **`icon_season_spring`**: Pink cherry blossom petal (`#ff87ab`).
- **`icon_season_summer`**: Bright yellow sun icon (`#ffd166`).
- **`icon_season_autumn`**: Amber maple leaf (`#f4a261`).
- **`icon_season_winter`**: Cyan snowflake motif (`#90e0ef`).
- **Item Pickups**: Preserves jar (red/purple jam inside glass), Cider bottle, Flour sack, Silk thread spool, Golden Egg, Astral Honey pot.

---

## 4. Component Specification: `AudioSynthesizer.ts`

### 4.1 Dependency Injection & Wrapper Facade
`AudioSynthesizer` wraps PartyPlay's `AudioService` (injected via `GameContext.audio`).
It exposes a clean, high-level API while shielding callers from frequency and oscillator configurations.

```typescript
export class AudioSynthesizer {
  private audio: AudioService;
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;
  private isBgmPlaying = false;

  constructor(audio: AudioService) {
    this.audio = audio;
  }
}
```

### 4.2 SFX Synthesis Preset Matrix

| Event Preset | Frequency Sequence (Hz) | Waveform | Duration (s) | Channel | Volume | Rationale / Acoustic Effect |
|--------------|-------------------------|----------|--------------|---------|--------|-----------------------------|
| **`playTill()`** | 130 → 80 (Linear Pitch Drop) | `sawtooth` | 0.10s | `'sfx'` | 0.25 | Earthy thud simulating shovel striking soil. |
| **`playWater()`** | 350 → 550 (Pitch Sweep) | `sine` | 0.14s | `'sfx'` | 0.20 | Liquid splash bubbling effect. |
| **`playPlant()`** | 440, 554 (A4 → C#5) | `triangle` | 0.08s each | `'sfx'` | 0.18 | Gentle rustling seed placement chime. |
| **`playHarvest()`** | 523 (C5), 659 (E5), 784 (G5), 1046 (C6) | `sine` | 0.06s each | `'sfx'` | 0.30 | Ascending arpeggio rewarding harvest. |
| **`playAnimalGoat()`**| 220 → 260 → 210 (Vibrato) | `triangle` | 0.25s | `'sfx'` | 0.22 | Bleating goat vocalization synth. |
| **`playAnimalBee()`** | 140 (Fast pitch modulation) | `sawtooth` | 0.20s | `'sfx'` | 0.15 | Low buzzing insect flight vibration. |
| **`playAnimalChocobo()`**| 880 → 1174 (Fast High Sweep) | `sine` | 0.12s | `'sfx'` | 0.20 | High-pitched bird chirp. |
| **`playAnimalMoth()`**| 600 → 400 | `triangle` | 0.15s | `'sfx'` | 0.12 | Soft wing flutter tone. |
| **`playWorkshop()`**| 300, 450, 600 | `square` | 0.05s each | `'sfx'` | 0.20 | Metallic gear clunk / station start. |
| **`playCoins()`** | 987 (B5), 1318 (E6) | `sine` | 0.08s each | `'sfx'` | 0.35 | Bright cash register chime. |
| **`playLevelUp()`**| 523, 659, 784, 1046, 1318, 1568 | `triangle` | 0.09s each | `'sfx'` | 0.40 | Grand fanfare ascension. |
| **`playError()`** | 180 → 120 | `sawtooth` | 0.22s | `'sfx'` | 0.25 | Low buzz indicating low energy / invalid move. |

### 4.3 Ambient Pentatonic Background Music (BGM) Generator
- **Scale**: C Major Pentatonic (`[261.63, 293.66, 329.63, 392.00, 440.00, 523.25]`).
- **Rhythm Pattern**: Relaxing 8-beat loop triggered every 400ms (150 BPM quarter-note feel).
- **Implementation**:
  Uses `updateBGM(dt)` or a 400ms tick interval sending soft `sine` or `triangle` tones on the `'music'` channel with low gain (`volume: 0.08` to `0.12`).
  Does not block the 60 FPS update loop.

---

## 5. Component Specification: `StorageManager.ts`

### 5.1 Storage Contract & Namespace
Wrapped around `context.storage` (`StorageService`).
Key identifier: `'farm_save_v1'` (producing full LocalStorage key: `partyplay:games:mythic-farm:farm_save_v1`).

### 5.2 Storage API Methods

```typescript
export interface StorageManagerOptions {
  storageKey?: string;
}

export class StorageManager {
  private static readonly DEFAULT_KEY = 'farm_save_v1';

  /** Saves complete FarmState object to storage */
  public static saveFarmState(storage: StorageService, state: FarmState, key = StorageManager.DEFAULT_KEY): void;

  /** Loads and validates FarmState from storage; returns null if missing or corrupted */
  public static loadFarmState(storage: StorageService, key = StorageManager.DEFAULT_KEY): FarmState | null;

  /** Clears saved farm state from storage */
  public static clearFarmState(storage: StorageService, key = StorageManager.DEFAULT_KEY): void;

  /** Constructs fresh initial FarmState according to M1 specification */
  public static createInitialFarmState(): FarmState;
}
```

### 5.3 Initial `FarmState` Blueprint

```typescript
export function createInitialFarmState(): FarmState {
  return {
    coins: 500,
    energy: 100,
    maxEnergy: 100,
    farmLevel: 1,
    farmExp: 0,
    currentDay: 1,
    currentSeason: 'spring',
    currentWeather: 'sunny',
    toolTiers: {
      hoe: 'basic',
      watering_can: 'basic',
      axe: 'basic',
      scythe: 'basic',
    },
    selectedHotbarIndex: 0,
    unlockedPlots: 1,
    inventory: {
      'seed_wheat': 5,
      'seed_pumpkin': 3,
    },
    marketMultipliers: {
      'wheat': 1.0,
      'pumpkin': 1.0,
      'crystal_berry': 1.0,
      'dragonfruit': 1.0,
      'elder_oak_fruit': 1.0,
      'sunflower': 1.0,
    },
  };
}
```

### 5.4 Corrupt Data & Schema Validation Logic
When `loadFarmState` is called:
1. `storage.get<FarmState | null>(key, null)` is executed.
2. If result is `null` or `typeof result !== 'object'`, returns `null`.
3. Validates essential numeric fields (`coins`, `energy`, `farmLevel`, `currentDay`). If any are `NaN` or negative out of range, logs warning via console / logger and returns `null`.
4. Merges loaded state over `createInitialFarmState()` using shallow/deep default merge to guarantee new properties added in future milestones exist safely.

---

## 6. Implementation Code Blueprints

### Blueprint A: `src/games/mythic-farm/utils/TextureGenerator.ts`

```typescript
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
  | `icon_${string}`;

export class TextureGenerator {
  private cache: Map<string, Texture> = new Map();

  public getTexture(key: string): Texture {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const texture = this.generateTextureByKey(key);
    this.cache.set(key, texture);
    return texture;
  }

  public generateAll(): Map<string, Texture> {
    const keys: string[] = [
      'tile_untilled', 'tile_tilled', 'tile_watered', 'tile_stone', 'tile_locked',
      // Crops
      ...this.getCropKeys(),
      // Livestock
      'animal_golden_goat', 'animal_astral_bee', 'animal_silk_moth', 'animal_feathered_chocobo',
      // Tools
      ...this.getToolKeys(),
      // Icons
      'icon_coin', 'icon_energy', 'icon_season_spring', 'icon_season_summer', 'icon_season_autumn', 'icon_season_winter',
    ];

    for (const key of keys) {
      this.getTexture(key);
    }
    return this.cache;
  }

  public clear(): void {
    for (const texture of this.cache.values()) {
      texture.destroy(true);
    }
    this.cache.clear();
  }

  private generateTextureByKey(key: string): Texture {
    const width = key.startsWith('crop_elder_oak') ? 32 : (key.startsWith('animal_') ? 24 : 16);
    const height = width;
    
    return TextureGenerator.createCanvasTexture(width, height, (ctx) => {
      this.drawProceduralAsset(ctx, key, width, height);
    });
  }

  public static createCanvasTexture(
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D) => void
  ): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return Texture.from(canvas);
  }

  private drawProceduralAsset(
    ctx: CanvasRenderingContext2D,
    key: string,
    w: number,
    h: number
  ): void {
    // Canvas pixel drawing implementation based on key prefix...
    if (key.startsWith('tile_')) this.drawTile(ctx, key, w, h);
    else if (key.startsWith('crop_')) this.drawCrop(ctx, key, w, h);
    else if (key.startsWith('animal_')) this.drawAnimal(ctx, key, w, h);
    else if (key.startsWith('tool_')) this.drawTool(ctx, key, w, h);
    else if (key.startsWith('icon_')) this.drawIcon(ctx, key, w, h);
  }

  // Sub-renderers (drawTile, drawCrop, drawAnimal, drawTool, drawIcon) ...
}
```

### Blueprint B: `src/games/mythic-farm/utils/AudioSynthesizer.ts`

```typescript
import type { AudioService } from '@services/audio/AudioService';

export class AudioSynthesizer {
  private audio: AudioService;
  private bgmStep = 0;
  private isBgmPlaying = false;
  private bgmTimer: any = null;

  // C Major Pentatonic frequencies
  private readonly bgmNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

  constructor(audio: AudioService) {
    this.audio = audio;
  }

  public playTill(): void {
    this.audio.playTone(130, 'sawtooth', 0.10, 'sfx', 0.25);
  }

  public playWater(): void {
    this.audio.playTone(350, 'sine', 0.14, 'sfx', 0.20);
    setTimeout(() => this.audio.playTone(550, 'sine', 0.10, 'sfx', 0.15), 50);
  }

  public playPlant(): void {
    this.audio.playTone(440, 'triangle', 0.08, 'sfx', 0.18);
    setTimeout(() => this.audio.playTone(554, 'triangle', 0.08, 'sfx', 0.18), 60);
  }

  public playHarvest(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.audio.playTone(freq, 'sine', 0.08, 'sfx', 0.25), idx * 60);
    });
  }

  public playAnimalGoat(): void {
    this.audio.playTone(220, 'triangle', 0.25, 'sfx', 0.22);
  }

  public playAnimalBee(): void {
    this.audio.playTone(140, 'sawtooth', 0.20, 'sfx', 0.15);
  }

  public playAnimalChocobo(): void {
    this.audio.playTone(880, 'sine', 0.08, 'sfx', 0.20);
    setTimeout(() => this.audio.playTone(1174, 'sine', 0.10, 'sfx', 0.20), 50);
  }

  public playAnimalMoth(): void {
    this.audio.playTone(500, 'triangle', 0.15, 'sfx', 0.12);
  }

  public playCoins(): void {
    this.audio.playTone(987, 'sine', 0.08, 'sfx', 0.30);
    setTimeout(() => this.audio.playTone(1318, 'sine', 0.12, 'sfx', 0.35), 70);
  }

  public playLevelUp(): void {
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.audio.playTone(freq, 'triangle', 0.10, 'sfx', 0.35), idx * 70);
    });
  }

  public playError(): void {
    this.audio.playTone(180, 'sawtooth', 0.22, 'sfx', 0.25);
  }

  public startAmbientBGM(): void {
    if (this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.scheduleNextBgmNote();
  }

  public stopAmbientBGM(): void {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleNextBgmNote(): void {
    if (!this.isBgmPlaying) return;
    const note = this.bgmNotes[this.bgmStep % this.bgmNotes.length];
    this.audio.playTone(note, 'sine', 0.35, 'music', 0.10);
    this.bgmStep = (this.bgmStep + 1) % 16;
    this.bgmTimer = setTimeout(() => this.scheduleNextBgmNote(), 500);
  }
}
```

### Blueprint C: `src/games/mythic-farm/utils/StorageManager.ts`

```typescript
import type { StorageService } from '@services/storage/StorageService';
import type { FarmState } from '../types';

export class StorageManager {
  public static readonly STORAGE_KEY = 'farm_state_v1';

  public static saveFarmState(storage: StorageService, state: FarmState, key = StorageManager.STORAGE_KEY): void {
    try {
      storage.set<FarmState>(key, state);
    } catch (err) {
      console.warn('[StorageManager] Failed to save farm state:', err);
    }
  }

  public static loadFarmState(storage: StorageService, key = StorageManager.STORAGE_KEY): FarmState | null {
    try {
      const data = storage.get<FarmState | null>(key, null);
      if (!data || typeof data !== 'object') {
        return null;
      }
      // Schema validation & default fallback merging
      return this.validateAndMergeState(data);
    } catch (err) {
      console.warn('[StorageManager] Failed to load farm state:', err);
      return null;
    }
  }

  public static clearFarmState(storage: StorageService, key = StorageManager.STORAGE_KEY): void {
    try {
      storage.remove(key);
    } catch (err) {
      console.warn('[StorageManager] Failed to clear farm state:', err);
    }
  }

  public static createInitialFarmState(): FarmState {
    return {
      coins: 500,
      energy: 100,
      maxEnergy: 100,
      farmLevel: 1,
      farmExp: 0,
      currentDay: 1,
      currentSeason: 'spring',
      currentWeather: 'sunny',
      toolTiers: {
        hoe: 'basic',
        watering_can: 'basic',
        axe: 'basic',
        scythe: 'basic',
      },
      selectedHotbarIndex: 0,
      unlockedPlots: 1,
      inventory: {
        'seed_wheat': 5,
        'seed_pumpkin': 3,
      },
      marketMultipliers: {
        'wheat': 1.0,
        'pumpkin': 1.0,
        'crystal_berry': 1.0,
        'dragonfruit': 1.0,
        'elder_oak': 1.0,
        'sunflower': 1.0,
      },
    };
  }

  private static validateAndMergeState(data: any): FarmState {
    const initial = this.createInitialFarmState();
    return {
      ...initial,
      ...data,
      coins: typeof data.coins === 'number' && !isNaN(data.coins) ? data.coins : initial.coins,
      energy: typeof data.energy === 'number' && !isNaN(data.energy) ? data.energy : initial.energy,
      maxEnergy: typeof data.maxEnergy === 'number' && !isNaN(data.maxEnergy) ? data.maxEnergy : initial.maxEnergy,
      farmLevel: typeof data.farmLevel === 'number' && !isNaN(data.farmLevel) ? data.farmLevel : initial.farmLevel,
      currentDay: typeof data.currentDay === 'number' && !isNaN(data.currentDay) ? data.currentDay : initial.currentDay,
      toolTiers: { ...initial.toolTiers, ...(data.toolTiers || {}) },
      inventory: { ...initial.inventory, ...(data.inventory || {}) },
      marketMultipliers: { ...initial.marketMultipliers, ...(data.marketMultipliers || {}) },
    };
  }
}
```

---

## 7. Verification & Testing Strategy

### Unit Tests (`src/games/mythic-farm/utils/Utils.test.ts`)
To independently verify M1 Utilities:

1. **`TextureGenerator` Test Specs**:
   - Verify `getTexture('tile_untilled')` produces a valid PixiJS `Texture`.
   - Verify cache hit: subsequent calls return exact same `Texture` reference.
   - Verify `generateAll()` populates cache with ground, crop, animal, tool, and HUD icon textures.
   - Verify `clear()` destroys textures and clears map.

2. **`AudioSynthesizer` Test Specs**:
   - Mock `AudioService` with spy function `playTone: vi.fn()`.
   - Verify `playTill()`, `playWater()`, `playHarvest()`, etc. call `playTone` with expected frequencies and channels (`'sfx'`).
   - Verify `startAmbientBGM()` triggers `playTone` with `'music'` channel.

3. **`StorageManager` Test Specs**:
   - Mock `StorageService` (`get`, `set`, `remove`).
   - Verify `createInitialFarmState()` matches default values (500 coins, 100 energy, 5 wheat seeds).
   - Verify `saveFarmState` serializes state properly.
   - Verify `loadFarmState` recovers saved state or falls back to valid merged defaults when given partial/invalid input.
   - Verify `clearFarmState` invokes `remove`.

---

## 8. Summary of Action Items for Implementer

| File | Task | Key Deliverable |
|------|------|-----------------|
| `src/games/mythic-farm/utils/TextureGenerator.ts` | Implement Canvas 2D texture cache engine | `TextureGenerator` class with tile, crop, animal, tool, HUD drawing methods |
| `src/games/mythic-farm/utils/AudioSynthesizer.ts` | Implement Web Audio playTone preset facade & BGM loop | `AudioSynthesizer` class wrapping `AudioService` |
| `src/games/mythic-farm/utils/StorageManager.ts` | Implement `FarmState` storage persistence manager | `StorageManager` static class wrapping `StorageService` |
| `src/games/mythic-farm/utils/Utils.test.ts` | Write vitest suite | Unit tests covering all 3 utility classes |
