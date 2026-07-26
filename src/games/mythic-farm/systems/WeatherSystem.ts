import { Container, Graphics } from 'pixi.js';
import type { FarmState, Season, Weather, TileData } from '../types';
import { CROP_SPECIES, DAYS_PER_SEASON, SEASONS_ORDER, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config';
import { AudioSynthesizer } from '../utils/AudioSynthesizer';

export interface WeatherParticle {
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
    const count =
      weather === 'rain' || weather === 'rainy'
        ? 60
        : weather === 'thunder' || weather === 'thunderstorm'
        ? 90
        : weather === 'blizzard'
        ? 80
        : weather === 'astral_rain'
        ? 40
        : 0;

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(weather));
    }
  }

  private createParticle(weather: Weather): WeatherParticle {
    const isRain =
      weather === 'rain' || weather === 'rainy' || weather === 'thunder' || weather === 'thunderstorm';
    const isBlizzard = weather === 'blizzard';
    const isAstral = weather === 'astral_rain';

    return {
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      vx: isRain ? -15 : isBlizzard ? -40 - Math.random() * 20 : isAstral ? -5 + Math.random() * 10 : 0,
      vy: isRain
        ? 120 + Math.random() * 40
        : isBlizzard
        ? 30 + Math.random() * 20
        : isAstral
        ? 40 + Math.random() * 20
        : 0,
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
    if (
      (this.currentWeather === 'thunder' || this.currentWeather === 'thunderstorm') &&
      Math.random() < 0.005
    ) {
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

      if (
        this.currentWeather === 'rain' ||
        this.currentWeather === 'rainy' ||
        this.currentWeather === 'thunder' ||
        this.currentWeather === 'thunderstorm'
      ) {
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

export interface WeatherSystemConfig {
  overlayEnabled?: boolean;
  audioSynthesizer?: AudioSynthesizer | null;
}

export class WeatherSystem {
  private overlay: WeatherOverlay | null = null;
  private audioSynth: AudioSynthesizer | null = null;

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
   * Advances the calendar by 1 day and checks season transitions.
   */
  public advanceDay(
    farmState: FarmState,
    incrementDay: boolean = true
  ): {
    seasonChanged: boolean;
    previousSeason: Season;
    newSeason: Season;
  } {
    const previousSeason = farmState.currentSeason || 'spring';
    if (incrementDay) {
      farmState.currentDay = Math.max(1, (farmState.currentDay || 1) + 1);
    }

    const currentDay = Math.max(1, farmState.currentDay || 1);
    const seasonIndex =
      Math.floor((currentDay - 1) / DAYS_PER_SEASON) % SEASONS_ORDER.length;
    const newSeason = SEASONS_ORDER[seasonIndex];
    const seasonChanged = previousSeason !== newSeason;

    farmState.currentSeason = newSeason;

    return { seasonChanged, previousSeason, newSeason };
  }

  /**
   * Generates next weather based on current season probability matrix.
   */
  public generateWeatherForSeason(season: Season): Weather {
    const rand = Math.random();

    switch (season) {
      case 'spring':
        if (rand < 0.5) return 'sunny';
        if (rand < 0.8) return 'rain';
        if (rand < 0.9) return 'thunder';
        return 'astral_rain';
      case 'summer':
        if (rand < 0.6) return 'sunny';
        if (rand < 0.8) return 'rain';
        if (rand < 0.95) return 'thunder';
        return 'astral_rain';
      case 'autumn':
        if (rand < 0.45) return 'sunny';
        if (rand < 0.8) return 'rain';
        if (rand < 0.9) return 'thunder';
        return 'astral_rain';
      case 'winter':
        if (rand < 0.3) return 'sunny';
        if (rand < 0.4) return 'rain';
        if (rand < 0.5) return 'astral_rain';
        return 'blizzard';
      default:
        return 'sunny';
    }
  }

  /**
   * Sets active weather state and updates particle overlay.
   */
  public setWeather(farmState: FarmState, weather: Weather): void {
    farmState.currentWeather = weather;
    if (this.overlay) {
      this.overlay.setWeather(weather);
    }
  }

  /**
   * Morning weather tick: auto-waters tiles during rain, applies crop withering.
   */
  public processMorningWeather(
    farmState: FarmState,
    gridEntity?: any
  ): {
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
    const isRainy = ['rain', 'rainy', 'thunder', 'thunderstorm', 'astral_rain'].includes(
      farmState.currentWeather
    );

    if (isRainy) {
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c].tilled) {
            grid[r][c].watered = true;
            if (grid[r][c].crop) {
              grid[r][c].crop!.wateredToday = true;
            }
            wateredTiles++;
            if (gridEntity && typeof gridEntity.updateTileSprite === 'function') {
              gridEntity.updateTileSprite(c, r);
            }
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
            if (gridEntity && typeof gridEntity.getCrop === 'function') {
              const cropDisplay = gridEntity.getCrop(c, r);
              if (cropDisplay && typeof cropDisplay.updateTexture === 'function') {
                cropDisplay.updateTexture();
              }
            }
          }
        }
      }
    }

    // 3. Lightning Strike check on Thunder weather
    if (['thunder', 'thunderstorm'].includes(farmState.currentWeather) && Math.random() < 0.35) {
      const strike = this.triggerLightningStrike(grid, gridEntity);
      if (strike) {
        lightningStruck = true;
      }
    }

    return { wateredTiles, witheredCrops, lightningStruck };
  }

  /**
   * Triggers a lightning strike on a random grid tile.
   */
  public triggerLightningStrike(
    grid: TileData[][],
    gridEntity?: any
  ): { tileX: number; tileY: number; struckCrop: boolean } | null {
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
      if (gridEntity && typeof gridEntity.getCrop === 'function') {
        const cropDisplay = gridEntity.getCrop(randC, randR);
        if (cropDisplay && typeof cropDisplay.updateTexture === 'function') {
          cropDisplay.updateTexture();
        }
      }
    }

    if (this.overlay) {
      this.overlay.triggerFlash();
    }

    return { tileX: randC, tileY: randR, struckCrop };
  }

  public update(dt: number): void {
    if (this.overlay) {
      this.overlay.update(dt);
    }
  }
}
