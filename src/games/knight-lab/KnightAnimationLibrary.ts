import { Assets, Rectangle, Texture } from 'pixi.js';

export const KNIGHT_FRAME_WIDTH = 128;
export const KNIGHT_FRAME_HEIGHT = 128;
export const KNIGHT_FRAMES_PER_DIRECTION = 15;
export const KNIGHT_DIRECTION_COUNT = 8;

export type KnightDirection = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type KnightClipName = keyof typeof KNIGHT_CLIPS;

// The supplied sheet is mirrored relative to the logical control names:
// row 0 faces east/right and row 4 faces west/left.
export const KNIGHT_DIRECTIONS = ['EAST', 'SOUTHEAST', 'SOUTH', 'SOUTHWEST', 'WEST', 'NORTHWEST', 'NORTH', 'NORTHEAST'] as const;

const ASSET_ROOT = '/assets/2D%20HD%20Character%20Knight/Spritesheets/With%20shadows';

export const KNIGHT_CLIPS = {
  idle: { file: 'Idle.png', fps: 8, loop: true },
  idle2: { file: 'Idle2.png', fps: 8, loop: true },
  turn: { file: '180Turn.png', fps: 12, loop: false },
  walk: { file: 'Walk.png', fps: 10, loop: true },
  run: { file: 'Run.png', fps: 14, loop: true },
  runBackwards: { file: 'RunBackwards.png', fps: 14, loop: true },
  melee: { file: 'Melee.png', fps: 14, loop: false },
  melee2: { file: 'Melee2.png', fps: 14, loop: false },
  meleeSpin: { file: 'MeleeSpin.png', fps: 14, loop: false },
  meleeRun: { file: 'MeleeRun.png', fps: 14, loop: false },
  kick: { file: 'Kick.png', fps: 14, loop: false },
  pummel: { file: 'Pummel.png', fps: 14, loop: false },
  shieldStart: { file: 'ShieldBlockStart.png', fps: 12, loop: false },
  shieldHold: { file: 'ShieldBlockMid.png', fps: 6, loop: true },
  roll: { file: 'Rolling.png', fps: 14, loop: false },
  crouchIdle: { file: 'CrouchIdle.png', fps: 8, loop: true },
  crouchRun: { file: 'CrouchRun.png', fps: 10, loop: true },
  slideStart: { file: 'SlideStart.png', fps: 14, loop: false },
  slide: { file: 'Slide.png', fps: 14, loop: false },
  slideEnd: { file: 'SlideEnd.png', fps: 14, loop: false },
  flip: { file: 'FrontFlip.png', fps: 14, loop: false },
  spell: { file: 'CastSpell.png', fps: 12, loop: false },
  special1: { file: 'Special1.png', fps: 14, loop: false },
  special2: { file: 'Special2.png', fps: 14, loop: false },
  unsheath: { file: 'UnSheathSword.png', fps: 12, loop: false },
  strafeLeft: { file: 'StrafeLeft.png', fps: 12, loop: true },
  strafeRight: { file: 'StrafeRight.png', fps: 12, loop: true },
  damage: { file: 'TakeDamage.png', fps: 12, loop: false },
  die: { file: 'Die.png', fps: 12, loop: false },
} as const;

/**
 * Owns the source sheets and the small sub-textures used by the lab. The source
 * art is deliberately loaded on demand: one 1920x1024 sheet consumes ~8MB of
 * GPU memory, so preloading every animation would be needlessly expensive.
 */
export class KnightAnimationLibrary {
  private sourceTextures = new Map<KnightClipName, Texture>();
  private frameTextures = new Map<string, Texture[]>();

  public async preload(clips: KnightClipName[]): Promise<void> {
    await Promise.all(clips.map((clip) => this.getFrames(clip, 2)));
  }

  public async getFrames(clip: KnightClipName, direction: KnightDirection): Promise<Texture[]> {
    const key = `${clip}:${direction}`;
    const cached = this.frameTextures.get(key);
    if (cached) return cached;

    const source = await this.getSource(clip);
    const frames = Array.from({ length: KNIGHT_FRAMES_PER_DIRECTION }, (_, frame) => new Texture({
      source: source.source,
      frame: new Rectangle(
        frame * KNIGHT_FRAME_WIDTH,
        direction * KNIGHT_FRAME_HEIGHT,
        KNIGHT_FRAME_WIDTH,
        KNIGHT_FRAME_HEIGHT,
      ),
    }));
    this.frameTextures.set(key, frames);
    return frames;
  }

  public async getSource(clip: KnightClipName): Promise<Texture> {
    const cached = this.sourceTextures.get(clip);
    if (cached) return cached;

    const texture = await Assets.load<Texture>(`${ASSET_ROOT}/${KNIGHT_CLIPS[clip].file}`);
    this.sourceTextures.set(clip, texture);
    return texture;
  }

  public destroy(): void {
    this.frameTextures.forEach((frames) => frames.forEach((frame) => frame.destroy(false)));
    this.frameTextures.clear();
    this.sourceTextures.forEach((_, clip) => Assets.unload(`${ASSET_ROOT}/${KNIGHT_CLIPS[clip].file}`));
    this.sourceTextures.clear();
  }
}
