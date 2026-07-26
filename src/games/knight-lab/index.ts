import { Container, Graphics } from 'pixi.js';
import type { GameContext, GameModule, InternalGameState } from '@runtime/types';
import { PixelFont } from '../turbo-rider/render/PixelFont';
import {
  KNIGHT_CLIPS,
  KNIGHT_DIRECTIONS,
  KNIGHT_FRAMES_PER_DIRECTION,
  KnightAnimationLibrary,
  type KnightClipName,
  type KnightDirection,
} from './KnightAnimationLibrary';
import { KnightActor } from './KnightActor';

interface TrainingDummy {
  x: number;
  y: number;
  hitTimer: number;
}

const SHOWCASE_CLIPS: KnightClipName[] = ['kick', 'pummel', 'meleeSpin', 'meleeRun', 'special2', 'unsheath', 'strafeLeft', 'strafeRight', 'idle2', 'turn', 'walk', 'runBackwards'];
const CORE_PRELOAD: KnightClipName[] = ['idle', 'run', 'walk', 'melee', 'melee2', 'shieldStart', 'shieldHold', 'roll', 'damage', 'die'];

const DIRECTION_VECTOR: Record<KnightDirection, { x: number; y: number }> = {
  0: { x: 1, y: 0 }, 1: { x: 1, y: 1 }, 2: { x: 0, y: 1 }, 3: { x: -1, y: 1 },
  4: { x: -1, y: 0 }, 5: { x: -1, y: -1 }, 6: { x: 0, y: -1 }, 7: { x: 1, y: -1 },
};

function directionFromVector(dx: number, dy: number, fallback: KnightDirection): KnightDirection {
  if (!dx && !dy) return fallback;
  if (!dx) return dy > 0 ? 2 : 6;
  if (!dy) return dx > 0 ? 0 : 4;
  if (dx > 0) return dy > 0 ? 1 : 7;
  return dy > 0 ? 3 : 5;
}

export default class KnightLabGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private readonly root = new Container();
  private readonly room = new Graphics();
  private readonly effects = new Graphics();
  private readonly hud = new Graphics();
  private readonly animations = new KnightAnimationLibrary();
  private actor!: KnightActor;
  private readonly dummies: TrainingDummy[] = [{ x: 330, y: 146, hitTimer: 0 }, { x: 154, y: 190, hitTimer: 0 }];
  private animationSpeed = 1;
  private showcaseIndex = 0;
  private dead = false;
  private actionQueued = false;
  private showcaseTimer = 0;
  private labMode: 'menu' | 'knight' = 'menu';
  private time = 0;
  private notice = 'MOVE, ATTACK, AND TEST EVERY ACTION';
  private noticeTimer = 5;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.animationSpeed = Math.max(0.5, Math.min(1.5, this.ctx.modifiers.animationSpeed ?? 1));
    this.root.addChild(this.room, this.effects);
    this.actor = new KnightActor(this.animations);
    this.actor.sprite.visible = false;
    this.root.addChild(this.actor.sprite, this.hud);
    this.hud.eventMode = 'static';
    this.hud.cursor = 'pointer';
    this.hud.on('pointertap', this.handleLabPointerTap);
    this.ctx.renderer.stage.addChild(this.root);

    await this.animations.preload(CORE_PRELOAD);
    await this.actor.setClip('idle', true);
    this.render();
    this.state = 'Ready';
  }

  public start(): void {
    this.state = 'Playing';
    this.ctx.audio.playTone(392, 'square', 0.1);
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;
    const safeDt = Math.min(dt, 1 / 20);
    this.time += safeDt;
    this.noticeTimer = Math.max(0, this.noticeTimer - safeDt);
    this.showcaseTimer = Math.max(0, this.showcaseTimer - safeDt);
    this.dummies.forEach((dummy) => { dummy.hitTimer = Math.max(0, dummy.hitTimer - safeDt); });

    const input = this.ctx.input.getPlayer(1);
    if (this.labMode === 'menu') {
      if (input.isJustPressed('selectKnight')) {
        this.openKnightModule();
      }
      if (input.isJustPressed('pause')) this.ctx.events.emit('game:pause', undefined);
      this.render();
      return;
    }
    if (input.isJustPressed('pause')) {
      this.ctx.events.emit('game:pause', undefined);
      return;
    }

    if (this.dead) {
      if (input.isJustPressed('reset')) this.resetKnight();
      this.actor.update(safeDt, this.animationSpeed);
      this.render();
      return;
    }

    if (input.isJustPressed('damage')) this.triggerAction('damage', true, 'DAMAGE TEST');
    if (input.isJustPressed('reset')) {
      this.dead = true;
      this.triggerAction('die', true, 'KNIGHT DOWN // K TO RESET');
    }

    const dx = Number(input.isActive('moveRight')) - Number(input.isActive('moveLeft'));
    const dy = Number(input.isActive('moveDown')) - Number(input.isActive('moveUp'));
    const moving = dx !== 0 || dy !== 0;
    if (moving) void this.actor.setDirection(directionFromVector(dx, dy, this.actor.direction));

    if (this.actor.completed && !KNIGHT_CLIPS[this.actor.clip].loop) {
      this.resolveCompletedAction(input.isActive('block'));
    }

    const busy = !KNIGHT_CLIPS[this.actor.clip].loop && !this.actor.completed;
    if (!busy && !this.dead) {
      if (input.isJustPressed('action')) this.triggerAction('melee', false, 'MELEE');
      else if (input.isJustPressed('alternate')) this.triggerAction('melee2', false, 'ALT MELEE');
      else if (input.isJustPressed('skill')) this.triggerAction('special1', false, 'SPECIAL 1');
      else if (input.isJustPressed('spell')) this.triggerAction('spell', false, 'CAST SPELL');
      else if (input.isJustPressed('roll')) this.triggerAction('roll', false, 'ROLL');
      else if (input.isJustPressed('slide')) this.triggerAction('slideStart', false, 'SLIDE');
      else if (input.isJustPressed('flip')) this.triggerAction('flip', false, 'FRONT FLIP');
      else if (input.isJustPressed('showcase')) this.cycleShowcase();
      else if (input.isActive('block')) {
        if (this.actor.clip !== 'shieldHold' && this.actor.clip !== 'shieldStart') void this.actor.setClip('shieldStart', true);
      } else if (input.isActive('crouch')) {
        void this.actor.setClip(moving ? 'crouchRun' : 'crouchIdle');
        if (moving) this.actor.move(dx, dy, 48 * safeDt);
      } else if (moving) {
        void this.actor.setClip('run');
        this.actor.move(dx, dy, 88 * safeDt);
      } else if (this.showcaseTimer <= 0 && this.actor.clip !== 'idle') {
        void this.actor.setClip('idle');
      }
    }
    if (this.actor.clip === 'shieldStart' && this.actor.completed && input.isActive('block')) void this.actor.setClip('shieldHold', true);
    if (!input.isActive('block') && this.actor.clip === 'shieldHold') void this.actor.setClip(moving ? 'run' : 'idle');

    this.actor.update(safeDt, this.animationSpeed);
    this.render();
  }

  public pause(): void { this.state = 'Paused'; }
  public resume(): void { this.state = 'Playing'; }

  public destroy(): void {
    this.ctx.renderer.stage.removeChild(this.root);
    this.root.destroy({ children: true });
    this.animations.destroy();
    this.state = 'Destroyed';
  }

  private handleLabPointerTap = (): void => {
    if (this.labMode === 'menu') this.openKnightModule();
  };

  private openKnightModule(): void {
    this.labMode = 'knight';
    this.actor.sprite.visible = true;
    this.notice = 'KNIGHT MODULE LOADED';
    this.noticeTimer = 2;
    this.ctx.audio.playTone(520, 'square', 0.1);
  }

  private triggerAction(clip: KnightClipName, force: boolean, notice: string): void {
    const busy = !KNIGHT_CLIPS[this.actor.clip].loop && !this.actor.completed;
    if (busy && !force) return;
    void this.actor.setClip(clip, true);
    this.actionQueued = ['melee', 'melee2', 'meleeSpin', 'meleeRun', 'kick', 'pummel', 'special1', 'special2'].includes(clip);
    this.notice = notice;
    this.noticeTimer = 1.3;
    this.ctx.audio.playTone(clip === 'damage' || clip === 'die' ? 130 : 520, 'square', 0.08);
  }

  private resolveCompletedAction(blockHeld: boolean): void {
    if (this.actionQueued) {
      this.tryStrike();
      this.actionQueued = false;
    }
    if (this.dead) return;
    if (this.actor.clip === 'shieldStart' && blockHeld) void this.actor.setClip('shieldHold', true);
    else if (this.actor.clip === 'slideStart') void this.actor.setClip('slide', true);
    else if (this.actor.clip === 'slide') void this.actor.setClip('slideEnd', true);
    else void this.actor.setClip('idle');
  }

  private tryStrike(): void {
    const facing = DIRECTION_VECTOR[this.actor.direction];
    const target = this.dummies.find((dummy) => {
      const dx = dummy.x - this.actor.x;
      const dy = dummy.y - this.actor.y;
      return Math.hypot(dx, dy) < 92 && dx * facing.x + dy * facing.y > 8;
    });
    if (!target) return;
    target.hitTimer = 0.35;
    this.notice = 'TRAINING DUMMY HIT';
    this.noticeTimer = 1;
    this.ctx.audio.playTone(160, 'sawtooth', 0.08);
  }

  private cycleShowcase(): void {
    const clip = SHOWCASE_CLIPS[this.showcaseIndex++ % SHOWCASE_CLIPS.length]!;
    this.showcaseTimer = KNIGHT_CLIPS[clip].loop ? 2.5 : 0;
    this.triggerAction(clip, false, `SHOWCASE // ${clip.toUpperCase()}`);
  }

  private resetKnight(): void {
    this.dead = false;
    this.actor.x = 240;
    this.actor.y = 198;
    this.actor.sprite.position.set(240, 198);
    void this.actor.setClip('idle', true);
    this.notice = 'KNIGHT RESET';
    this.noticeTimer = 1.5;
  }

  private render(): void {
    const { width, height } = this.ctx.renderer.viewport;
    this.room.clear();
    this.room.rect(0, 0, width, height).fill({ color: 0x10141c });
    for (let x = 0; x < width; x += 16) this.room.rect(x, 62, 1, 182).fill({ color: 0x1f3140 });
    for (let y = 62; y < height; y += 16) this.room.rect(0, y, width, 1).fill({ color: 0x1f3140 });
    this.room.rect(18, 66, width - 36, height - 84).stroke({ color: 0x688b96, width: 2 });
    this.room.rect(18, 66, width - 36, 4).fill({ color: 0x2a4a55 });

    this.effects.clear();
    for (const dummy of this.dummies) {
      const hit = dummy.hitTimer > 0;
      this.effects.rect(dummy.x - 11, dummy.y - 30, 22, 30).fill({ color: hit ? 0xffde7d : 0x7d4f45 });
      this.effects.rect(dummy.x - 15, dummy.y - 34, 30, 6).fill({ color: hit ? 0xffffff : 0xb97858 });
      this.effects.rect(dummy.x - 2, dummy.y - 28, 4, 6).fill({ color: 0x15121b });
      if (hit) this.effects.rect(dummy.x - 19, dummy.y - 40, 38, 2).fill({ color: 0xff2e63 });
    }

    this.hud.clear();
    this.hud.rect(0, 0, width, 56).fill({ color: 0x0a1018, alpha: 0.94 });
    this.hud.rect(0, 54, width, 2).fill({ color: 0x08d9d6 });
    PixelFont.drawText(this.hud, 'ANIMATION LAB', 14, 11, 0xffde7d, 2);
    PixelFont.drawText(this.hud, `CLIP: ${this.actor.clip}`, 14, 34, 0x08d9d6, 1);
    PixelFont.drawText(this.hud, `DIR: ${KNIGHT_DIRECTIONS[this.actor.direction]}  FRAME: ${this.actor.frame + 1}/${KNIGHT_FRAMES_PER_DIRECTION}`, 178, 34, 0xfffffe, 1);
    PixelFont.drawText(this.hud, `SPD ${this.animationSpeed.toFixed(2)}X`, 386, 12, 0x2af598, 1);

    if (this.labMode === 'menu') {
      this.hud.rect(30, 72, width - 60, 154).fill({ color: 0x070b12, alpha: 0.97 });
      this.hud.rect(30, 72, width - 60, 154).stroke({ color: 0xffde7d, width: 2 });
      PixelFont.drawText(this.hud, 'SELECT TEST MODULE', 58, 88, 0xffde7d, 2);
      this.hud.rect(52, 116, width - 104, 30).fill({ color: 0x31434b });
      PixelFont.drawText(this.hud, '1  KNIGHT', 66, 126, 0x2af598, 2);
      PixelFont.drawText(this.hud, 'READY // 29 ANIMATIONS', 230, 128, 0xfffffe, 1);
      PixelFont.drawText(this.hud, '2  ROGUE', 66, 164, 0x65757b, 2);
      PixelFont.drawText(this.hud, 'COMING SOON', 230, 166, 0x65757b, 1);
      PixelFont.drawText(this.hud, '3  CREATURE', 66, 192, 0x65757b, 2);
      PixelFont.drawText(this.hud, 'COMING SOON', 230, 194, 0x65757b, 1);
      PixelFont.drawText(this.hud, 'PRESS 1 / ENTER / SPACE TO OPEN', 78, 214, 0x08d9d6, 1);
      return;
    }

    const message = this.noticeTimer > 0 ? this.notice : 'SPACE MELEE  Q GUARD  TAB SHOWCASE  H HIT  K RESET';
    PixelFont.drawText(this.hud, message, 28, 250, this.noticeTimer > 0 ? 0xffde7d : 0xa7a9be, 1);
  }
}
