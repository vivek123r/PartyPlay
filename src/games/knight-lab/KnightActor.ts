import { Sprite, Texture } from 'pixi.js';
import {
  KNIGHT_CLIPS,
  type KnightAnimationLibrary,
  type KnightClipName,
  type KnightDirection,
} from './KnightAnimationLibrary';

export class KnightActor {
  public readonly sprite = new Sprite({ texture: Texture.EMPTY, anchor: { x: 0.5, y: 0.82 }, roundPixels: true });
  public x = 240;
  public y = 198;
  public direction: KnightDirection = 2;
  public clip: KnightClipName = 'idle';
  public frame = 0;
  public completed = false;

  private frames: Texture[] = [];
  private frameProgress = 0;
  private requestVersion = 0;
  private readonly animations: KnightAnimationLibrary;

  public constructor(animations: KnightAnimationLibrary) {
    this.animations = animations;
    this.sprite.position.set(this.x, this.y);
  }

  public async setClip(clip: KnightClipName, restart = false): Promise<void> {
    if (!restart && this.clip === clip && this.frames.length > 0) return;
    this.clip = clip;
    this.frame = 0;
    this.frameProgress = 0;
    this.completed = false;
    const requestVersion = ++this.requestVersion;
    const frames = await this.animations.getFrames(clip, this.direction);
    if (requestVersion !== this.requestVersion) return;
    this.frames = frames;
    this.sprite.texture = frames[0] ?? Texture.EMPTY;
  }

  public async setDirection(direction: KnightDirection): Promise<void> {
    if (direction === this.direction) return;
    this.direction = direction;
    const requestVersion = ++this.requestVersion;
    const frames = await this.animations.getFrames(this.clip, direction);
    if (requestVersion !== this.requestVersion) return;
    this.frames = frames;
    this.frame = Math.min(this.frame, Math.max(0, frames.length - 1));
    this.sprite.texture = frames[this.frame] ?? Texture.EMPTY;
  }

  public update(dt: number, animationSpeed = 1): void {
    if (!this.frames.length || this.completed) return;
    this.frameProgress += dt * KNIGHT_CLIPS[this.clip].fps * animationSpeed;
    const frameAdvance = Math.floor(this.frameProgress);
    if (!frameAdvance) return;
    this.frameProgress -= frameAdvance;
    const nextFrame = this.frame + frameAdvance;
    if (nextFrame >= this.frames.length) {
      if (KNIGHT_CLIPS[this.clip].loop) {
        this.frame = nextFrame % this.frames.length;
      } else {
        this.frame = this.frames.length - 1;
        this.completed = true;
      }
    } else {
      this.frame = nextFrame;
    }
    this.sprite.texture = this.frames[this.frame] ?? Texture.EMPTY;
  }

  public move(dx: number, dy: number, distance: number): void {
    const magnitude = Math.hypot(dx, dy);
    if (!magnitude) return;
    this.x = Math.max(55, Math.min(425, this.x + (dx / magnitude) * distance));
    this.y = Math.max(92, Math.min(232, this.y + (dy / magnitude) * distance));
    this.sprite.position.set(Math.round(this.x), Math.round(this.y));
  }

  public destroy(): void {
    this.sprite.destroy();
  }
}
