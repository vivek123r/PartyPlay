import { Sprite, Texture } from 'pixi.js';
import {
  DUNGEON_CLIPS,
  type DungeonAssetLibrary,
  type DungeonClipKey,
} from './DungeonAssetLibrary';

export class SpriteAnimator {
  public readonly sprite = new Sprite({
    texture: Texture.EMPTY,
    anchor: { x: 0.5, y: 0.72 },
    roundPixels: true,
  });
  public clip: DungeonClipKey;
  public completed = false;

  private frames: Texture[] = [];
  private frame = 0;
  private elapsed = 0;
  private facing = 1;
  private readonly library: DungeonAssetLibrary;

  public constructor(library: DungeonAssetLibrary, initialClip: DungeonClipKey) {
    this.library = library;
    this.clip = initialClip;
    this.setClip(initialClip, true);
  }

  public setClip(clip: DungeonClipKey, restart = false): void {
    if (clip === this.clip && !restart && this.frames.length) return;
    this.clip = clip;
    const descriptor = DUNGEON_CLIPS[clip];
    this.frames = this.library.getClipFrames(clip);
    this.frame = 0;
    this.elapsed = 0;
    this.completed = false;
    this.sprite.texture = this.frames[0] ?? Texture.EMPTY;
    this.sprite.anchor.set(descriptor.anchorX ?? 0.5, descriptor.anchorY ?? 0.72);
    this.applyScale();
  }

  public setFacing(facing: number): void {
    this.facing = facing < 0 ? -1 : 1;
    this.applyScale();
  }

  public update(dt: number): void {
    if (!this.frames.length || this.completed) return;
    const descriptor = DUNGEON_CLIPS[this.clip];
    this.elapsed += dt * descriptor.fps;
    const advance = Math.floor(this.elapsed);
    if (!advance) return;
    this.elapsed -= advance;
    const next = this.frame + advance;
    if (next >= this.frames.length) {
      if (descriptor.loop !== false) this.frame = next % this.frames.length;
      else { this.frame = this.frames.length - 1; this.completed = true; }
    } else this.frame = next;
    this.sprite.texture = this.frames[this.frame] ?? Texture.EMPTY;
  }

  public destroy(): void {
    this.sprite.destroy();
  }

  private applyScale(): void {
    const scale = DUNGEON_CLIPS[this.clip].scale;
    this.sprite.scale.set(scale * this.facing, scale);
  }
}
