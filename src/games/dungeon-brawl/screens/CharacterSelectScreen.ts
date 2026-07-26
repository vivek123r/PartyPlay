import { Container, Graphics } from 'pixi.js';
import type { HeroClassType } from '../types';
import { HERO_CONFIGS, ARENA_CONFIG } from '../config';
import { PixelFont } from '../../turbo-rider/render/PixelFont';
import type { DungeonAssetLibrary, DungeonClipKey } from '../visuals/DungeonAssetLibrary';
import { SpriteAnimator } from '../visuals/SpriteAnimator';

const CLASS_IDLE: Record<HeroClassType, DungeonClipKey> = {
  knight: 'hero.knight.idle',
  wizard: 'hero.wizard.idle',
  rogue: 'hero.rogue.idle',
  barbarian: 'hero.barbarian.idle',
};

export class CharacterSelectScreen {
  public readonly container = new Container();
  public selections: Record<number, { classType: HeroClassType; isReady: boolean }> = {
    1: { classType: 'knight', isReady: false },
    2: { classType: 'wizard', isReady: false },
    3: { classType: 'rogue', isReady: false },
    4: { classType: 'barbarian', isReady: false },
  };

  private readonly g = new Graphics();
  private readonly previewLayer = new Container();
  private readonly previews = new Map<number, { classType: HeroClassType; animator: SpriteAnimator }>();
  private readonly order: HeroClassType[] = ['knight', 'wizard', 'rogue', 'barbarian'];
  private readonly library: DungeonAssetLibrary;
  private clock = 0;

  public constructor(library: DungeonAssetLibrary) {
    this.library = library;
    this.container.addChild(this.g, this.previewLayer);
  }

  public updateInput(id: number, left: boolean, right: boolean, action: boolean): void {
    const selection = this.selections[id];
    if (!selection) return;
    if ((left || right) && !selection.isReady) {
      const current = this.order.indexOf(selection.classType);
      selection.classType = this.order[(current + (right ? 1 : -1) + this.order.length) % this.order.length];
    }
    if (action) selection.isReady = !selection.isReady;
  }

  public isAllReady(count: number): boolean {
    return Array.from({ length: count }, (_, index) => this.selections[index + 1].isReady).every(Boolean);
  }

  public render(count: number, dt = 1 / 60): void {
    this.clock += dt;
    const { width: w, height: h } = ARENA_CONFIG;
    this.g.clear();
    this.g.rect(0, 0, w, h).fill({ color: 0x090611 });
    for (let x = 0; x < w; x += 24) for (let y = 0; y < h; y += 24) {
      if ((x + y) % 48 === 0) this.g.rect(x, y, 1, 1).fill({ color: 0x6ff7ff, alpha: .25 });
    }
    PixelFont.drawText(this.g, 'DUNGEON BRAWL', 160, 9, 0xf2c14e, 2);
    PixelFont.drawText(this.g, 'PICK YOUR ROLE', 180, 30, 0x6ff7ff, 1);

    const twoRows = count > 2;
    const cardW = twoRows ? 212 : 205;
    const cardH = twoRows ? 91 : 164;
    for (let index = 0; index < count; index++) {
      const id = index + 1;
      const selection = this.selections[id];
      const config = HERO_CONFIGS[selection.classType];
      const col = twoRows ? index % 2 : index;
      const row = twoRows ? Math.floor(index / 2) : 0;
      const x = twoRows ? 26 + col * 216 : 32 + col * 220;
      const y = twoRows ? 51 + row * 98 : 52;
      const border = selection.isReady ? 0x7de38a : config.primaryColor;

      this.g.rect(x, y, cardW, cardH).fill({ color: 0x171025, alpha: .96 });
      this.g.rect(x, y, cardW, cardH).stroke({ color: border, width: 2 });
      this.g.rect(x + 7, y + 21, 55, cardH - 31).fill({ color: config.primaryColor, alpha: .11 });
      this.g.circle(x + 34, y + (twoRows ? 62 : 102), twoRows ? 24 : 31).stroke({ color: config.secondaryColor, width: 2, alpha: .65 });

      PixelFont.drawText(this.g, `P${id}  ${config.name}`, x + 67, y + 9, config.primaryColor, 1);
      PixelFont.drawText(this.g, config.role, x + 67, y + 24, 0xa48ba8, 1);
      PixelFont.drawText(this.g, `HP ${config.maxHp}  ATK ${config.attackPower}`, x + 67, y + 39, 0xeaf6ff, 1);
      PixelFont.drawText(this.g, config.specialSkillName, x + 67, y + 54, config.secondaryColor, 1);
      if (!twoRows) {
        PixelFont.drawText(this.g, config.specialDescription, x + 67, y + 70, 0xa48ba8, 1);
        PixelFont.drawText(this.g, `ULT  ${config.ultimateSkillName}`, x + 67, y + 91, 0xf2c14e, 1);
        PixelFont.drawText(this.g, config.ultimateDescription, x + 67, y + 107, 0xa48ba8, 1);
      }
      PixelFont.drawText(this.g, selection.isReady ? 'READY' : '< > ROLE   ATTACK READY', x + 8, y + cardH - 13, selection.isReady ? 0x7de38a : 0xeaf6ff, 1);
      this.updatePreview(id, selection.classType, x + 34, y + (twoRows ? 75 : 128), twoRows ? 1.1 : 1.42, dt);
    }
    for (let id = count + 1; id <= 4; id++) {
      const preview = this.previews.get(id);
      if (preview) preview.animator.sprite.visible = false;
    }
    PixelFont.drawText(this.g, 'ATTACK = COMBO   SKILL = POWER   HOLD BOTH = ULTIMATE', 76, 250, 0xa48ba8, 1);
  }

  public destroy(): void {
    this.container.removeChildren();
    this.previews.forEach(({ animator }) => animator.destroy());
    this.previews.clear();
    this.g.destroy();
    this.previewLayer.destroy();
    this.container.destroy();
  }

  private updatePreview(id: number, classType: HeroClassType, x: number, y: number, presentationScale: number, dt: number): void {
    let preview = this.previews.get(id);
    if (!preview) {
      const animator = new SpriteAnimator(this.library, CLASS_IDLE[classType]);
      preview = { classType, animator };
      this.previews.set(id, preview);
      this.previewLayer.addChild(animator.sprite);
    }
    if (preview.classType !== classType) {
      preview.classType = classType;
      preview.animator.setClip(CLASS_IDLE[classType], true);
    }
    preview.animator.setFacing(1);
    preview.animator.update(dt);
    const sprite = preview.animator.sprite;
    sprite.visible = true;
    sprite.position.set(Math.round(x), Math.round(y));
    sprite.scale.set(sprite.scale.x * presentationScale, sprite.scale.y * presentationScale);
  }
}
