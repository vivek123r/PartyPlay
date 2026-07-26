# WeatherSystem.ts — Comprehensive Architectural Analysis & Plan for Milestone 2 (M2)

## 1. Executive Summary

`WeatherSystem.ts` is a core environmental system in **MYTHIC FARM: SINGLE-PLAYER FARMVILLE & MAGIC ORCHARD**, responsible for calendar season progression, dynamic daily weather generation, weather-based automated soil hydration, lightning strike events, seasonal crop withering, and real-time PixiJS particle/overlay visual effects.

This document outlines the complete architectural design, data structures, algorithms, visual overlay engine, proposed code implementation, system integration touchpoints, and test verification strategies for `WeatherSystem.ts`.

---

## 2. Feature & Requirement Specification Mapping

| Requirement | Scope & Specification | Target Mechanics |
|---|---|---|
| **F9.1 Season Transitions** | 4-Season Calendar progression (`spring` → `summer` → `autumn` → `winter` → `spring`) | 7 days per season (`DAYS_PER_SEASON = 7`). Day 1–7 = Spring, Day 8–14 = Summer, Day 15–21 = Autumn, Day 22–28 = Winter, Day 29+ = Spring cycle. |
| **F9.2 Dynamic Weather Generation** | Daily weather generator (`sunny`, `rain`, `thunder`, `astral_rain`, `blizzard`) | Weighted seasonal probability matrix. Forecast system for upcoming weather. Weather override support. |
| **F9.3 Rain Soil Hydration** | Automatic tile watering during rainy weather conditions | At day start or weather change, all tilled soil tiles (`tilled: true`) are auto-watered (`watered: true`). Applies to `rain`, `thunder` (or `thunderstorm`), and `astral_rain`. |
| **F9.4 Lightning Strike Engine** | Random lightning strikes during thunderstorm weather | Occurs on `thunder` weather. Selects random target tile. Destroys/withers target crop or leaves rare ash/crystal pickup. Plays thunder audio tone and triggers screen flash overlay. |
| **F9.5 Crop Withering Engine** | Out-of-season crop decay | Checks crop species allowed seasons (`cropSpecies.seasons`). If active season is not in list, crop becomes `withered = true` and `stage = 4` (Withered). Elder-Oak trees never wither (`seasons` contains all 4 seasons). |
| **F9.6 Weather Visual Effects Overlay** | PixiJS stage overlay container rendering particles & screen tints | 480×270 viewport particles for Rain (blue slant lines), Thunder (rain + screen flash + lightning bolt), Astral Rain (purple celestial stars), Blizzard (white swirling snowflakes + fog), Sunny (bright warm glow). |

---

## 3. Data Structures & Type Contracts

### 3.1 Type Definitions (`types.ts` Reconciliation)

```typescript
// Weather types supported (including aliases)
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'rain' | 'thunder' | 'astral_rain' | 'blizzard' | 'rainy' | 'thunderstorm';

export interface WeatherState {
  currentSeason: Season;
  currentWeather: Weather;
  forecastWeather: Weather;
  dayInSeason: number; // 1 to 7
  totalDays: number;
}

export interface SeasonTransitionResult {
  previousSeason: Season;
  newSeason: Season;
  seasonChanged: boolean;
  dayInSeason: number;
}

export interface WitherResult {
  witheredCount: number;
  affectedTiles: Array<{ x: number; y: number; speciesId: string }>;
}

export interface LightningStrikeEvent {
  tileX: number;
  tileY: number;
  struckCrop: boolean;
  cropSpeciesId?: string;
  destroyed: boolean;
}
```

### 3.2 Seasonal Weather Probability Matrix

Weather probabilities vary per season to reflect environmental conditions:

| Season | Sunny | Rain | Thunder | Astral Rain | Blizzard |
|---|---|---|---|---|---|
| **Spring** | 50% | 30% | 10% | 10% | 0% |
| **Summer** | 60% | 20% | 15% | 5% | 0% |
| **Autumn** | 45% | 35% | 10% | 10% | 0% |
| **Winter** | 30% | 10% | 0% | 10% | 50% |

---

## 4. System Architecture & Algorithms

```
                             +-----------------------+
                             |   MythicFarmGame      |
                             +-----------+-----------+
                                         |
                                         v
                             +-----------------------+
                             |    WeatherSystem      |
                             +-----------+-----------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
+------------------+           +-------------------+           +-------------------+
| Season & Weather |           | Hydration & Crop  |           | PixiJS Overlay    |
|   State Engine   |           | Withering Engine  |           | (WeatherOverlay)  |
+------------------+           +-------------------+           +-------------------+
| - advanceDay()   |           | - autoWaterGrid() |           | - Rain drops      |
| - generateNext() |           | - checkWithering()|           | - Thunder flashes |
| - forecast()     |           | - strikeLightning()           | - Snowflakes      |
+------------------+           +-------------------+           | - Astral sparks   |
                                                               +-------------------+
```

### 4.1 Season Progression Algorithm

```typescript
public advanceDay(farmState: FarmState): SeasonTransitionResult {
  const prevSeason = farmState.currentSeason;
  farmState.currentDay += 1;

  // Calculate season based on 7 days per season
  const seasonIndex = Math.floor((farmState.currentDay - 1) / DAYS_PER_SEASON) % SEASONS_ORDER.length;
  const newSeason = SEASONS_ORDER[seasonIndex];
  
  const seasonChanged = prevSeason !== newSeason;
  farmState.currentSeason = newSeason;

  const dayInSeason = ((farmState.currentDay - 1) % DAYS_PER_SEASON) + 1;

  return {
    previousSeason: prevSeason,
    newSeason,
    seasonChanged,
    dayInSeason,
  };
}
```

### 4.2 Soil Hydration Algorithm

```typescript
public processRainHydration(grid: TileData[][], weather: Weather): number {
  const isRainy = weather === 'rain' || weather === 'rainy' ||
                  weather === 'thunder' || weather === 'thunderstorm' ||
                  weather === 'astral_rain';
  if (!isRainy || !grid) return 0;

  let wateredCount = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tile = grid[r][c];
      if (tile && tile.tilled) {
        tile.watered = true;
        wateredCount++;
      }
    }
  }
  return wateredCount;
}
```

### 4.3 Out-of-Season Crop Withering Algorithm

```typescript
public checkAndApplyCropWithering(grid: TileData[][], currentSeason: Season): WitherResult {
  const result: WitherResult = { witheredCount: 0, affectedTiles: [] };
  if (!grid) return result;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tile = grid[r][c];
      if (tile && tile.crop && !tile.crop.withered) {
        const species = CROP_SPECIES[tile.crop.speciesId];
        if (species && !species.seasons.includes(currentSeason)) {
          tile.crop.withered = true;
          tile.crop.stage = 4; // Stage 4: Withered
          result.witheredCount++;
          result.affectedTiles.push({ x: c, y: r, speciesId: tile.crop.speciesId });
        }
      }
    }
  }
  return result;
}
```

### 4.4 Lightning Strike Algorithm

```typescript
public triggerLightningStrike(
  grid: TileData[][],
  farmState: FarmState,
  audioSynth?: AudioSynthesizer | null
): LightningStrikeEvent | null {
  if (farmState.currentWeather !== 'thunder' && farmState.currentWeather !== 'thunderstorm') {
    return null;
  }

  // Find all unlocked tilled tiles or tiles with crops
  const eligibleTiles: Array<{ r: number; c: number; hasCrop: boolean }> = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const tile = grid[r][c];
      if (tile && tile.unlocked) {
        eligibleTiles.push({ r, c, hasCrop: !!(tile.crop && !tile.crop.withered) });
      }
    }
  }

  if (eligibleTiles.length === 0) return null;

  // Pick random eligible tile
  const target = eligibleTiles[Math.floor(Math.random() * eligibleTiles.length)];
  const tile = grid[target.r][target.c];
  let struckCrop = false;
  let speciesId: string | undefined;

  if (tile.crop) {
    struckCrop = true;
    speciesId = tile.crop.speciesId;
    tile.crop.withered = true;
    tile.crop.stage = 4; // Charred/withered by lightning strike
  }

  // Play audio chime if synthesizer available
  if (audioSynth) {
    // Low punchy saw tone simulating thunder clap
    (audioSynth as any).audio?.playTone?.(90, 'sawtooth', 0.4, 'sfx', 0.5);
  }

  return {
    tileX: target.c,
    tileY: target.r,
    struckCrop,
    cropSpeciesId: speciesId,
    destroyed: true,
  };
}
```

---

## 5. Visual Weather Effects Overlay Container (`WeatherOverlay`)

The `WeatherOverlay` class manages active PixiJS particle visual effects on a 480×270 viewport:

```typescript
import { Container, Graphics } from 'pixi.js';
import type { Weather } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: number;
}

export class WeatherOverlay extends Container {
  private particles: WeatherParticle[] = [];
  private particleGraphics: Graphics;
  private flashGraphics: Graphics;
  private flashTimer: number = 0;
  private currentWeather: Weather = 'sunny';

  constructor() {
    super();
    this.particleGraphics = new Graphics();
    this.flashGraphics = new Graphics();
    this.addChild(this.particleGraphics);
    this.addChild(this.flashGraphics);
  }

  public setWeather(weather: Weather): void {
    this.currentWeather = weather;
    this.particles = [];
    this.initParticlesForWeather(weather);
  }

  private initParticlesForWeather(weather: Weather): void {
    const count = weather === 'rain' || weather === 'rainy' ? 60
      : weather === 'thunder' || weather === 'thunderstorm' ? 90
      : weather === 'blizzard' ? 80
      : weather === 'astral_rain' ? 40
      : 0;

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(weather));
    }
  }

  private createParticle(weather: Weather): WeatherParticle {
    const isRain = weather === 'rain' || weather === 'rainy' || weather === 'thunder' || weather === 'thunderstorm';
    const isBlizzard = weather === 'blizzard';
    const isAstral = weather === 'astral_rain';

    return {
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      vx: isRain ? -15 : isBlizzard ? -40 - Math.random() * 20 : isAstral ? -5 + Math.random() * 10 : 0,
      vy: isRain ? 120 + Math.random() * 40 : isBlizzard ? 30 + Math.random() * 20 : isAstral ? 40 + Math.random() * 20 : 0,
      size: isRain ? 6 : isBlizzard ? 2 : isAstral ? 3 : 0,
      alpha: isRain ? 0.6 : isBlizzard ? 0.8 : isAstral ? 0.9 : 0,
      color: isRain ? 0x4d88ff : isBlizzard ? 0xffffff : 0xab47bc,
    };
  }

  public update(dt: number): void {
    if (this.currentWeather === 'sunny') {
      this.particleGraphics.clear();
      this.flashGraphics.clear();
      return;
    }

    // Update screen flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashGraphics.clear();
      }
    }

    // Occasional lightning flash during thunder
    if ((this.currentWeather === 'thunder' || this.currentWeather === 'thunderstorm') && Math.random() < 0.005) {
      this.triggerFlash();
    }

    this.particleGraphics.clear();

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.y > CANVAS_HEIGHT) {
        p.y = 0;
        p.x = Math.random() * CANVAS_WIDTH;
      }
      if (p.x < 0) p.x = CANVAS_WIDTH;

      if (this.currentWeather === 'rain' || this.currentWeather === 'rainy' || this.currentWeather === 'thunder' || this.currentWeather === 'thunderstorm') {
        this.particleGraphics.moveTo(p.x, p.y);
        this.particleGraphics.lineTo(p.x + p.vx * 0.05, p.y + p.size);
        this.particleGraphics.stroke({ width: 1, color: p.color, alpha: p.alpha });
      } else {
        this.particleGraphics.rect(p.x, p.y, p.size, p.size);
        this.particleGraphics.fill({ color: p.color, alpha: p.alpha });
      }
    }
  }

  public triggerFlash(): void {
    this.flashTimer = 0.15; // 150ms flash
    this.flashGraphics.clear();
    this.flashGraphics.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.flashGraphics.fill({ color: 0xffffff, alpha: 0.7 });
  }
}
```

---

## 6. Detailed File Specification: `WeatherSystem.ts`

Here is the blueprint for `src/games/mythic-farm/systems/WeatherSystem.ts`:

```typescript
import type { FarmState, Season, Weather, TileData } from '../types';
import { CROP_SPECIES, DAYS_PER_SEASON, SEASONS_ORDER } from '../config';
import { AudioSynthesizer } from '../utils/AudioSynthesizer';
import { WeatherOverlay } from './WeatherOverlay';

export interface WeatherSystemConfig {
  overlayEnabled?: boolean;
  audioSynthesizer?: AudioSynthesizer | null;
}

export class WeatherSystem {
  private overlay: WeatherOverlay | null = null;
  private audioSynth: AudioSynthesizer | null = null;
  private forecast: Weather = 'sunny';

  constructor(config: WeatherSystemConfig = {}) {
    if (config.overlayEnabled !== false) {
      this.overlay = new WeatherOverlay();
    }
    this.audioSynth = config.audioSynthesizer || null;
  }

  public getOverlay(): WeatherOverlay | null {
    return this.overlay;
  }

  /**
   * Advances the in-game calendar by 1 day and checks season transition.
   */
  public advanceDay(farmState: FarmState): { seasonChanged: boolean; previousSeason: Season; newSeason: Season } {
    const previousSeason = farmState.currentSeason;
    farmState.currentDay += 1;

    const seasonIndex = Math.floor((farmState.currentDay - 1) / DAYS_PER_SEASON) % SEASONS_ORDER.length;
    const newSeason = SEASONS_ORDER[seasonIndex];
    const seasonChanged = previousSeason !== newSeason;

    farmState.currentSeason = newSeason;

    return { seasonChanged, previousSeason, newSeason };
  }

  /**
   * Generates the next day's weather based on current season probability matrix.
   */
  public generateWeatherForSeason(season: Season): Weather {
    const rand = Math.random();

    switch (season) {
      case 'spring':
        if (rand < 0.50) return 'sunny';
        if (rand < 0.80) return 'rain';
        if (rand < 0.90) return 'thunder';
        return 'astral_rain';
      case 'summer':
        if (rand < 0.60) return 'sunny';
        if (rand < 0.80) return 'rain';
        if (rand < 0.95) return 'thunder';
        return 'astral_rain';
      case 'autumn':
        if (rand < 0.45) return 'sunny';
        if (rand < 0.80) return 'rain';
        if (rand < 0.90) return 'thunder';
        return 'astral_rain';
      case 'winter':
        if (rand < 0.30) return 'sunny';
        if (rand < 0.40) return 'rain';
        if (rand < 0.50) return 'astral_rain';
        return 'blizzard';
      default:
        return 'sunny';
    }
  }

  /**
   * Sets current weather state and updates overlay.
   */
  public setWeather(farmState: FarmState, weather: Weather): void {
    farmState.currentWeather = weather;
    if (this.overlay) {
      this.overlay.setWeather(weather);
    }
  }

  /**
   * Performs daily morning weather tick: auto-waters tiles during rain, applies crop withering.
   */
  public processMorningWeather(farmState: FarmState): {
    wateredTiles: number;
    witheredCrops: number;
    lightningStruck: boolean;
  } {
    const grid = farmState.grid;
    let wateredTiles = 0;
    let witheredCrops = 0;
    let lightningStruck = false;

    if (!grid) {
      return { wateredTiles: 0, witheredCrops: 0, lightningStruck: false };
    }

    // 1. Automatic Rain Hydration
    const isRainy = ['rain', 'rainy', 'thunder', 'thunderstorm', 'astral_rain'].includes(farmState.currentWeather);
    if (isRainy) {
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c].tilled) {
            grid[r][c].watered = true;
            wateredTiles++;
          }
        }
      }
    }

    // 2. Out-of-Season Crop Withering
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const crop = grid[r][c].crop;
        if (crop && !crop.withered) {
          const species = CROP_SPECIES[crop.speciesId];
          if (species && !species.seasons.includes(farmState.currentSeason)) {
            crop.withered = true;
            crop.stage = 4; // Withered
            witheredCrops++;
          }
        }
      }
    }

    // 3. Lightning Strike check on Thunder weather
    if (['thunder', 'thunderstorm'].includes(farmState.currentWeather) && Math.random() < 0.35) {
      const strike = this.triggerLightningStrike(grid);
      if (strike) {
        lightningStruck = true;
      }
    }

    return { wateredTiles, witheredCrops, lightningStruck };
  }

  /**
   * Triggers a lightning strike on a random grid tile.
   */
  public triggerLightningStrike(grid: TileData[][]): { tileX: number; tileY: number; struckCrop: boolean } | null {
    if (!grid || grid.length === 0) return null;

    const rows = grid.length;
    const cols = grid[0].length;
    const randR = Math.floor(Math.random() * rows);
    const randC = Math.floor(Math.random() * cols);

    const tile = grid[randR][randC];
    let struckCrop = false;

    if (tile && tile.crop) {
      tile.crop.withered = true;
      tile.crop.stage = 4;
      struckCrop = true;
    }

    if (this.overlay) {
      this.overlay.triggerFlash();
    }

    return { tileX: randC, tileY: randR, struckCrop };
  }

  /**
   * Updates visual overlay particle system.
   */
  public update(dt: number): void {
    if (this.overlay) {
      this.overlay.update(dt);
    }
  }
}
```

---

## 7. Integration Touchpoints

1. **`MythicFarmGame` (`index.ts`)**:
   - Instantiate `WeatherSystem` during `init()`.
   - Add `weatherSystem.getOverlay()` to `this.gameStageContainer`.
   - Call `weatherSystem.update(dt)` in `MythicFarmGame.update(dt)`.

2. **`FarmingSystem.ts`**:
   - Integrate daily day advancement calls into `WeatherSystem.advanceDay(farmState)`.
   - Trigger `processMorningWeather(farmState)` on day change tick.

3. **`HUD.ts`**:
   - Query `farmState.currentSeason` and `farmState.currentWeather` to render season/weather icons (`icon_season_spring`, `icon_weather_rain`, etc.).

---

## 8. Verification & Test Plan

1. **Unit Test Coverage (`WeatherSystem.test.ts`)**:
   - Verify calendar progression: Day 1 (Spring) -> Day 8 (Summer) -> Day 15 (Autumn) -> Day 22 (Winter) -> Day 29 (Spring).
   - Verify `processMorningWeather` waters all `tilled: true` tiles when weather is `rain` / `thunder` / `astral_rain`.
   - Verify out-of-season crops wither (e.g. Pumpkin planted in Spring becomes `withered = true` and `stage = 4`).
   - Verify Elder-Oak tree NEVER withers across any season.
   - Verify lightning strikes during thunderstorm trigger tile effect and screen flash.
   - Verify weather probability output stays within valid `Weather` enum values.

2. **Command Verification**:
   ```bash
   npx vitest run src/games/mythic-farm/
   ```
