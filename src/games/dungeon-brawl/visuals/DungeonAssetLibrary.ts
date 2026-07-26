import { Assets, Rectangle, Texture } from 'pixi.js';
import { publicAsset } from '@shared/assetUrl';

const ROOT = publicAsset('/assets/dungeon-brawl');

export interface SpriteClipDescriptor {
  url: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  loop?: boolean;
  scale: number;
  anchorX?: number;
  anchorY?: number;
}

const clip = (
  url: string,
  frameWidth: number,
  frameHeight: number,
  frames: number,
  fps: number,
  scale: number,
  loop = true,
  anchorY = 0.72,
): SpriteClipDescriptor => ({
  url: `${ROOT}/${url}`,
  frameWidth,
  frameHeight,
  frames,
  fps,
  scale,
  loop,
  anchorX: 0.5,
  anchorY,
});

export const DUNGEON_CLIPS = {
  'hero.knight.idle': clip('heroes/knight/blue-lancer--idle--sheet-12x320x320.png', 320, 320, 12, 8, 0.26),
  'hero.knight.run': clip('heroes/knight/blue-lancer--run--sheet-6x320x320.png', 320, 320, 6, 11, 0.26),
  'hero.knight.attack-right': clip('heroes/knight/blue-lancer--attack-right--sheet-3x320x320.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-downright': clip('heroes/knight/blue-lancer--attack-down-right--sheet-3x320x320.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-down': clip('heroes/knight/blue-lancer--attack-down--sheet-3x320x320.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-upright': clip('heroes/knight/blue-lancer--attack-up-right--sheet-3x320x320.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-up': clip('heroes/knight/blue-lancer--attack-up--sheet-3x320x320.png', 320, 320, 3, 14, 0.26, false),

  'hero.wizard.idle': clip('heroes/wizard/purple-monk-wizard--idle--sheet-6x192x192.png', 192, 192, 6, 8, 0.48),
  'hero.wizard.run': clip('heroes/wizard/purple-monk-wizard--run--sheet-4x192x192.png', 192, 192, 4, 11, 0.48),
  'hero.wizard.cast': clip('heroes/wizard/purple-monk-wizard--cast--sheet-11x192x192.png', 192, 192, 11, 18, 0.48, false),

  'hero.rogue.idle': clip('heroes/rogue/black-archer-rogue--idle--sheet-6x192x192.png', 192, 192, 6, 8, 0.43),
  'hero.rogue.run': clip('heroes/rogue/black-archer-rogue--run--sheet-4x192x192.png', 192, 192, 4, 12, 0.43),
  'hero.rogue.attack': clip('heroes/rogue/black-archer-rogue--bow-attack--sheet-8x192x192.png', 192, 192, 8, 20, 0.43, false),

  'hero.barbarian.idle': clip('heroes/barbarian/red-warrior-barbarian--idle--sheet-8x192x192.png', 192, 192, 8, 8, 0.43),
  'hero.barbarian.run': clip('heroes/barbarian/red-warrior-barbarian--run--sheet-6x192x192.png', 192, 192, 6, 12, 0.43),
  'hero.barbarian.attack-1': clip('heroes/barbarian/red-warrior-barbarian--axe-attack-primary--sheet-4x192x192.png', 192, 192, 4, 15, 0.43, false),
  'hero.barbarian.attack-2': clip('heroes/barbarian/red-warrior-barbarian--axe-attack-heavy--sheet-4x192x192.png', 192, 192, 4, 15, 0.43, false),
  'hero.barbarian.guard': clip('heroes/barbarian/red-warrior-barbarian--guard--sheet-6x192x192.png', 192, 192, 6, 10, 0.43),

  'enemy.skeleton.idle': clip('enemies/skeleton-mummy--idle-walk--sheet-6x69x83.png', 69, 83, 6, 8, 0.52, true, 0.84),
  'enemy.skeleton.run': clip('enemies/skeleton-mummy--idle-walk--sheet-6x69x83.png', 69, 83, 6, 11, 0.52, true, 0.84),
  'enemy.goblin.idle': clip('enemies/green-orc-goblin--idle--sheet-6x100x100.png', 100, 100, 6, 8, 1.4, true, 0.7),
  'enemy.goblin.run': clip('enemies/green-orc-goblin--walk--sheet-8x100x100.png', 100, 100, 8, 12, 1.4, true, 0.7),
  'enemy.goblin.attack': clip('enemies/green-orc-goblin--attack--sheet-6x100x100.png', 100, 100, 6, 16, 1.4, false, 0.7),
  'enemy.slime.idle': clip('enemies/green-slime--idle-squish--sheet-4x118x79.png', 118, 79, 4, 7, 0.45, true, 0.86),
  'enemy.mini_slime.idle': clip('enemies/green-slime--idle-squish--sheet-4x118x79.png', 118, 79, 4, 9, 0.27, true, 0.86),
  'enemy.imp.idle': clip('enemies/red-demon-imp--idle--sheet-6x100x100.png', 100, 100, 6, 8, 1.35, true, 0.7),
  'enemy.imp.run': clip('enemies/red-demon-imp--walk--sheet-8x100x100.png', 100, 100, 8, 12, 1.35, true, 0.7),
  'enemy.imp.attack': clip('enemies/red-demon-imp--attack--sheet-7x100x100.png', 100, 100, 7, 16, 1.35, false, 0.7),
  'enemy.wraith.idle': clip('enemies/blue-ghost-wraith--idle--sheet-7x64x80.png', 64, 80, 7, 8, 0.72, true, 0.84),
  'enemy.wraith.run': clip('enemies/blue-ghost-wraith--chase--sheet-4x64x80.png', 64, 80, 4, 11, 0.72, true, 0.84),
  'enemy.wraith.attack': clip('enemies/blue-ghost-wraith--attack--sheet-4x64x80.png', 64, 80, 4, 14, 0.72, false, 0.84),
  'enemy.brute.idle': clip('enemies/ogre-brute--idle-walk--sheet-5x128x128.png', 128, 128, 5, 7, 0.42, true, 0.84),
  'enemy.brute.run': clip('enemies/ogre-brute--idle-walk--sheet-5x128x128.png', 128, 128, 5, 10, 0.42, true, 0.84),

  'boss.crypt_warden.idle': clip('bosses/vampire-crypt-warden--idle--sheet-4x121x110.png', 121, 110, 4, 8, 0.6, true, 0.84),
  'boss.ember_fiend.idle': clip('bosses/jumping-demon-ember-fiend--idle--sheet-6x101x98.png', 101, 98, 6, 9, 0.9, true, 0.86),
  'boss.blood_champion.idle': clip('bosses/centaur-blood-champion--idle--sheet-4x112x144.png', 112, 144, 4, 8, 0.56, true, 0.86),
  'boss.horned_king.idle': clip('bosses/red-demon-horned-king--idle--sheet-5x112x153.png', 112, 153, 5, 9, 0.48, true, 0.86),

  'fx.slash-circular': clip('effects/effect--sword-slash-circular--sheet-6x52x48.png', 52, 48, 6, 24, 0.85, false, 0.5),
  'fx.slash-horizontal': clip('effects/effect--sword-slash-horizontal--sheet-5x65x40.png', 65, 40, 5, 24, 0.8, false, 0.5),
  'fx.slash-upward': clip('effects/effect--sword-slash-upward--sheet-5x52x56.png', 52, 56, 5, 24, 0.8, false, 0.5),
  'fx.arcane-runes': clip('heroes/wizard/purple-monk-wizard--cast-aura--sheet-11x192x192.png', 192, 192, 11, 20, 0.48, false, 0.5),
  'fx.magic-bolt': clip('effects/effect--arcane-bolt-projectile--sheet-4x48x32.png', 48, 32, 4, 18, 0.9, true, 0.5),
  'fx.magic-pulse': clip('effects/effect--arcane-pulse-beam--sheet-4x63x32.png', 63, 32, 4, 18, 1.05, false, 0.5),
  'fx.magic-charged': clip('effects/effect--arcane-charged-orb--sheet-6x63x48.png', 63, 48, 6, 20, 1, false, 0.5),
  'fx.shadow-cross': clip('effects/effect--shadow-cross-trail--sheet-6x32x32.png', 32, 32, 6, 22, 1.45, false, 0.5),
  'fx.magic-spark': clip('effects/effect--arcane-spark-projectile--sheet-5x63x32.png', 63, 32, 5, 24, 0.95, false, 0.5),
  'fx.magic-waveform': clip('effects/effect--shadow-waveform-trail--sheet-4x95x32.png', 95, 32, 4, 20, 0.9, false, 0.5),
  'fx.hit-knight': clip('effects/effect--knight-gold-impact--sheet-7x32x32.png', 32, 32, 7, 24, 1.25, false, 0.5),
  'fx.hit-wizard': clip('effects/effect--wizard-arcane-impact--sheet-7x32x32.png', 32, 32, 7, 22, 1.4, false, 0.5),
  'fx.hit-rogue': clip('effects/effect--rogue-shadow-impact--sheet-7x32x32.png', 32, 32, 7, 24, 1.25, false, 0.5),
  'fx.hit-barbarian': clip('effects/effect--barbarian-heavy-impact--sheet-5x32x32.png', 32, 32, 5, 22, 1.4, false, 0.5),
  'fx.ground-impact': clip('effects/effect--barbarian-ground-rupture--sheet-9x112x128.png', 112, 128, 9, 22, 0.72, false, 0.67),
  'fx.rage-explosion': clip('effects/effect--barbarian-rage-explosion--sheet-10x192x192.png', 192, 192, 10, 22, 0.55, false, 0.5),
  'fx.frost-splash': clip('effects/effect--wizard-frost-nova-splash--sheet-9x192x192.png', 192, 192, 9, 20, 0.5, false, 0.56),
  'fx.shadow-dust': clip('effects/effect--rogue-shadow-dash-dust--sheet-10x64x64.png', 64, 64, 10, 20, 0.55, false, 0.7),
  'fx.fire-ball': clip('effects/effect--fireball-projectile--sheet-3x52x29.png', 52, 29, 3, 16, 0.65, true, 0.5),
  'fx.energy-shield': clip('effects/effect--knight-energy-shield--sheet-8x51x47.png', 51, 47, 8, 18, 0.92, false, 0.5),
  'fx.energy-smack': clip('effects/effect--arcane-impact-large--sheet-8x128x96.png', 128, 96, 8, 24, 0.65, false, 0.5),
  'fx.electro-shock': clip('effects/effect--lightning-shock--sheet-9x128x96.png', 128, 96, 9, 24, 0.62, false, 0.5),
  'fx.enemy-death': clip('effects/effect--enemy-death-burst--sheet-8x56x64.png', 56, 64, 8, 22, 0.75, false, 0.68),
  'fx.dust': clip('effects/effect--movement-dust--sheet-8x64x64.png', 64, 64, 8, 18, 0.55, false, 0.7),
  'fx.explosion': clip('effects/effect--orange-explosion--sheet-8x192x192.png', 192, 192, 8, 22, 0.55, false, 0.5),
  'fx.fire': clip('effects/effect--small-fire-loop--sheet-8x64x64.png', 64, 64, 8, 12, 0.55, true, 0.76),
  'fx.fire-large': clip('effects/effect--large-fire-loop--sheet-12x64x64.png', 64, 64, 12, 16, 0.9, true, 0.76),
} as const satisfies Record<string, SpriteClipDescriptor>;

export type DungeonClipKey = keyof typeof DUNGEON_CLIPS;

export const DUNGEON_TEXTURES = {
  arrow: `${ROOT}/heroes/rogue/arrow-projectile--static-64x64.png`,
  dungeonTiles: `${ROOT}/environment/dungeon--tileset--16px-grid--304x144.png`,
  dungeonObjects: `${ROOT}/environment/dungeon--object-atlas--16px-grid--272x144.png`,
  ruinsBlue2: `${ROOT}/environment/room-prop--ruins-blue-gray--large-80x80.png`,
  ruinsBlue3: `${ROOT}/environment/room-prop--ruins-blue-gray--small-48x64.png`,
  ruinsGray2: `${ROOT}/environment/room-prop--ruins-brown-gray--large-80x80.png`,
  ruinsGray3: `${ROOT}/environment/room-prop--ruins-brown-gray--small-64x64.png`,
  ruinsBrown2: `${ROOT}/environment/room-prop--ruins-brown--large-80x80.png`,
  ruinsBrown3: `${ROOT}/environment/room-prop--ruins-brown--small-64x64.png`,
  ruinsSand2: `${ROOT}/environment/room-prop--ruins-sand--large-80x64.png`,
  ruinsSand3: `${ROOT}/environment/room-prop--ruins-sand--small-64x64.png`,
  crystalBlue: `${ROOT}/environment/room-prop--crystal-blue--static-64x64.png`,
  crystalGreen: `${ROOT}/environment/room-prop--crystal-green--static-64x64.png`,
  crystalRed: `${ROOT}/environment/room-prop--crystal-red--static-64x64.png`,
  crystalViolet: `${ROOT}/environment/room-prop--crystal-violet--static-64x64.png`,
  crystalYellow: `${ROOT}/environment/room-prop--crystal-yellow--static-64x64.png`,
  bigBarBase: `${ROOT}/ui/hud--boss-health-bar-base--320x64.png`,
  bigBarFill: `${ROOT}/ui/hud--boss-health-bar-fill--64x64.png`,
  smallBarBase: `${ROOT}/ui/hud--player-health-bar-base--320x64.png`,
  smallBarFill: `${ROOT}/ui/hud--player-health-bar-fill--64x64.png`,
  paper: `${ROOT}/ui/hud--fantasy-paper-panel--320x320.png`,
  banner: `${ROOT}/ui/hud--fantasy-banner--448x448.png`,
  icons: `${ROOT}/ui/hud--fantasy-item-icons-atlas--576x336.png`,
} as const;

export type DungeonTextureKey = keyof typeof DUNGEON_TEXTURES;

export class DungeonAssetLibrary {
  private sources = new Map<string, Texture>();
  private clipFrames = new Map<DungeonClipKey, Texture[]>();
  private regions: Texture[] = [];
  public readonly failedUrls = new Set<string>();

  public async preload(): Promise<void> {
    const urls = new Set([
      ...Object.values(DUNGEON_CLIPS).map((descriptor) => descriptor.url),
      ...Object.values(DUNGEON_TEXTURES),
    ]);
    await Promise.all([...urls].map(async (url) => {
      try {
        const texture = await Assets.load<Texture>(url);
        texture.source.scaleMode = 'nearest';
        this.sources.set(url, texture);
      } catch {
        this.failedUrls.add(url);
      }
    }));
  }

  public getClipFrames(key: DungeonClipKey): Texture[] {
    const cached = this.clipFrames.get(key);
    if (cached) return cached;
    const descriptor = DUNGEON_CLIPS[key];
    const source = this.sources.get(descriptor.url);
    if (!source) return [];
    const frames = Array.from({ length: descriptor.frames }, (_, frame) => new Texture({
      source: source.source,
      frame: new Rectangle(frame * descriptor.frameWidth, 0, descriptor.frameWidth, descriptor.frameHeight),
    }));
    this.clipFrames.set(key, frames);
    return frames;
  }

  public getTexture(key: DungeonTextureKey): Texture | undefined {
    return this.sources.get(DUNGEON_TEXTURES[key]);
  }

  public getRegion(key: DungeonTextureKey, x: number, y: number, width: number, height: number): Texture | undefined {
    const source = this.getTexture(key);
    if (!source) return undefined;
    const region = new Texture({ source: source.source, frame: new Rectangle(x, y, width, height) });
    this.regions.push(region);
    return region;
  }

  public destroy(): void {
    this.clipFrames.forEach((frames) => frames.forEach((frame) => frame.destroy(false)));
    this.clipFrames.clear();
    this.regions.forEach((region) => region.destroy(false));
    this.regions = [];
    this.sources.forEach((_, url) => { void Assets.unload(url); });
    this.sources.clear();
  }
}
