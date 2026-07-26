import { Assets, Rectangle, Texture } from 'pixi.js';

const ROOT = '/assets/dungeon-brawl';

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
  'hero.knight.idle': clip('heroes/knight/idle.png', 320, 320, 12, 8, 0.26),
  'hero.knight.run': clip('heroes/knight/run.png', 320, 320, 6, 11, 0.26),
  'hero.knight.attack-right': clip('heroes/knight/attack-right.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-downright': clip('heroes/knight/attack-downright.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-down': clip('heroes/knight/attack-down.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-upright': clip('heroes/knight/attack-upright.png', 320, 320, 3, 14, 0.26, false),
  'hero.knight.attack-up': clip('heroes/knight/attack-up.png', 320, 320, 3, 14, 0.26, false),

  'hero.wizard.idle': clip('heroes/wizard/idle.png', 192, 192, 6, 8, 0.48),
  'hero.wizard.run': clip('heroes/wizard/run.png', 192, 192, 4, 11, 0.48),
  'hero.wizard.cast': clip('heroes/wizard/cast.png', 192, 192, 11, 18, 0.48, false),

  'hero.rogue.idle': clip('heroes/rogue/idle.png', 192, 192, 6, 8, 0.43),
  'hero.rogue.run': clip('heroes/rogue/run.png', 192, 192, 4, 12, 0.43),
  'hero.rogue.attack': clip('heroes/rogue/attack.png', 192, 192, 8, 20, 0.43, false),

  'hero.barbarian.idle': clip('heroes/barbarian/idle.png', 192, 192, 8, 8, 0.43),
  'hero.barbarian.run': clip('heroes/barbarian/run.png', 192, 192, 6, 12, 0.43),
  'hero.barbarian.attack-1': clip('heroes/barbarian/attack-1.png', 192, 192, 4, 15, 0.43, false),
  'hero.barbarian.attack-2': clip('heroes/barbarian/attack-2.png', 192, 192, 4, 15, 0.43, false),
  'hero.barbarian.guard': clip('heroes/barbarian/guard.png', 192, 192, 6, 10, 0.43),

  'enemy.skeleton.idle': clip('enemies/mummy.png', 69, 83, 6, 8, 0.52, true, 0.84),
  'enemy.skeleton.run': clip('enemies/mummy.png', 69, 83, 6, 11, 0.52, true, 0.84),
  'enemy.goblin.idle': clip('enemies/orc-idle.png', 100, 100, 6, 8, 1.4, true, 0.7),
  'enemy.goblin.run': clip('enemies/orc-walk.png', 100, 100, 8, 12, 1.4, true, 0.7),
  'enemy.goblin.attack': clip('enemies/orc-attack.png', 100, 100, 6, 16, 1.4, false, 0.7),
  'enemy.slime.idle': clip('enemies/slime.png', 118, 79, 4, 7, 0.45, true, 0.86),
  'enemy.mini_slime.idle': clip('enemies/slime.png', 118, 79, 4, 9, 0.27, true, 0.86),
  'enemy.imp.idle': clip('enemies/demon-idle.png', 100, 100, 6, 8, 1.35, true, 0.7),
  'enemy.imp.run': clip('enemies/demon-walk.png', 100, 100, 8, 12, 1.35, true, 0.7),
  'enemy.imp.attack': clip('enemies/demon-attack.png', 100, 100, 7, 16, 1.35, false, 0.7),
  'enemy.wraith.idle': clip('enemies/ghost-idle.png', 64, 80, 7, 8, 0.72, true, 0.84),
  'enemy.wraith.run': clip('enemies/ghost-chase.png', 64, 80, 4, 11, 0.72, true, 0.84),
  'enemy.wraith.attack': clip('enemies/ghost-attack.png', 64, 80, 4, 14, 0.72, false, 0.84),
  'enemy.brute.idle': clip('enemies/ogre.png', 128, 128, 5, 7, 0.42, true, 0.84),
  'enemy.brute.run': clip('enemies/ogre.png', 128, 128, 5, 10, 0.42, true, 0.84),

  'boss.crypt_warden.idle': clip('bosses/crypt-warden.png', 121, 110, 4, 8, 0.6, true, 0.84),
  'boss.ember_fiend.idle': clip('bosses/ember-fiend.png', 101, 98, 6, 9, 0.9, true, 0.86),
  'boss.blood_champion.idle': clip('bosses/blood-champion.png', 112, 144, 4, 8, 0.56, true, 0.86),
  'boss.horned_king.idle': clip('bosses/horned-king.png', 112, 153, 5, 9, 0.48, true, 0.86),

  'fx.slash-circular': clip('effects/slash-circular.png', 52, 48, 6, 24, 0.85, false, 0.5),
  'fx.slash-horizontal': clip('effects/slash-horizontal.png', 65, 40, 5, 24, 0.8, false, 0.5),
  'fx.slash-upward': clip('effects/slash-upward.png', 52, 56, 5, 24, 0.8, false, 0.5),
  'fx.fire-ball': clip('effects/fire-ball.png', 52, 29, 3, 16, 0.65, true, 0.5),
  'fx.energy-shield': clip('effects/energy-shield.png', 51, 47, 8, 18, 0.92, false, 0.5),
  'fx.energy-smack': clip('effects/energy-smack.png', 128, 96, 8, 24, 0.65, false, 0.5),
  'fx.electro-shock': clip('effects/electro-shock.png', 128, 96, 9, 24, 0.62, false, 0.5),
  'fx.enemy-death': clip('effects/enemy-death.png', 56, 64, 8, 22, 0.75, false, 0.68),
  'fx.dust': clip('effects/dust.png', 64, 64, 8, 18, 0.55, false, 0.7),
  'fx.explosion': clip('effects/explosion.png', 192, 192, 8, 22, 0.55, false, 0.5),
  'fx.fire': clip('effects/fire.png', 64, 64, 8, 12, 0.55, true, 0.76),
  'fx.fire-large': clip('effects/fire-large.png', 64, 64, 12, 16, 0.9, true, 0.76),
} as const satisfies Record<string, SpriteClipDescriptor>;

export type DungeonClipKey = keyof typeof DUNGEON_CLIPS;

export const DUNGEON_TEXTURES = {
  arrow: `${ROOT}/heroes/rogue/arrow.png`,
  dungeonTiles: `${ROOT}/environment/dungeon-tileset.png`,
  dungeonObjects: `${ROOT}/environment/dungeon-objects.png`,
  ruinsBlue2: `${ROOT}/environment/blue-gray_ruins2.png`,
  ruinsBlue3: `${ROOT}/environment/blue-gray_ruins3.png`,
  ruinsGray2: `${ROOT}/environment/brown-gray_ruins2.png`,
  ruinsGray3: `${ROOT}/environment/brown-gray_ruins3.png`,
  ruinsBrown2: `${ROOT}/environment/brown_ruins2.png`,
  ruinsBrown3: `${ROOT}/environment/brown_ruins3.png`,
  ruinsSand2: `${ROOT}/environment/sand_ruins2.png`,
  ruinsSand3: `${ROOT}/environment/sand_ruins3.png`,
  crystalBlue: `${ROOT}/environment/crystal-blue.png`,
  crystalGreen: `${ROOT}/environment/crystal-green.png`,
  crystalRed: `${ROOT}/environment/crystal-red.png`,
  crystalViolet: `${ROOT}/environment/crystal-violet.png`,
  crystalYellow: `${ROOT}/environment/crystal-yellow.png`,
  bigBarBase: `${ROOT}/ui/big-bar-base.png`,
  bigBarFill: `${ROOT}/ui/big-bar-fill.png`,
  smallBarBase: `${ROOT}/ui/small-bar-base.png`,
  smallBarFill: `${ROOT}/ui/small-bar-fill.png`,
  paper: `${ROOT}/ui/special-paper.png`,
  banner: `${ROOT}/ui/banner.png`,
  icons: `${ROOT}/ui/fantasy-icons.png`,
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
