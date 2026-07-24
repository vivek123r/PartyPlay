import { Container, Graphics } from 'pixi.js';
import type { HeroClassType } from '../types';
import { HERO_CONFIGS, ARENA_CONFIG } from '../config';
import { PixelFont } from '../../turbo-rider/render/PixelFont';

export class CharacterSelectScreen {
  public container = new Container();
  private g = new Graphics();

  public selections: Record<number, { classType: HeroClassType; isReady: boolean }> = {
    1: { classType: 'knight', isReady: false },
    2: { classType: 'wizard', isReady: false },
    3: { classType: 'rogue', isReady: false },
    4: { classType: 'barbarian', isReady: false },
  };

  private classOrder: HeroClassType[] = ['knight', 'wizard', 'rogue', 'barbarian'];

  constructor() {
    this.container.addChild(this.g);
  }

  public updateInput(playerId: number, navLeft: boolean, navRight: boolean, toggleReady: boolean): void {
    const sel = this.selections[playerId];
    if (!sel || sel.isReady) return;

    if (navLeft || navRight) {
      const curIdx = this.classOrder.indexOf(sel.classType);
      const nextIdx = navRight
        ? (curIdx + 1) % this.classOrder.length
        : (curIdx - 1 + this.classOrder.length) % this.classOrder.length;
      sel.classType = this.classOrder[nextIdx];
    }

    if (toggleReady) {
      sel.isReady = true;
    }
  }

  public isAllReady(playerCount: number): boolean {
    for (let i = 1; i <= playerCount; i++) {
      if (!this.selections[i]?.isReady) return false;
    }
    return true;
  }

  public render(playerCount: number): void {
    this.g.clear();
    const w = ARENA_CONFIG.width;
    const h = ARENA_CONFIG.height;

    // Background
    this.g.rect(0, 0, w, h).fill({ color: 0x0f0e17 });

    // Title
    PixelFont.drawText(this.g, 'DUNGEON BRAWL: HERO SELECT', w / 2 - 110, 16, 0xf1c40f, 1);
    PixelFont.drawText(this.g, 'PRESS ACTION TO LOCK IN HERO', w / 2 - 100, 32, 0x00f0ff, 1);

    const cardW = 100;
    const cardH = 180;
    const spacing = Math.floor((w - playerCount * cardW) / (playerCount + 1));

    for (let i = 0; i < playerCount; i++) {
      const pId = i + 1;
      const sel = this.selections[pId];
      const cfg = HERO_CONFIGS[sel.classType];
      const cardX = spacing + i * (cardW + spacing);
      const cardY = 56;

      // Card Container Box
      const borderColor = sel.isReady ? 0x2ecc71 : 0x3498db;
      this.g.rect(cardX, cardY, cardW, cardH).fill({ color: 0x1e272e });
      this.g.rect(cardX, cardY, cardW, cardH).stroke({ color: borderColor, width: 2 });

      // Player Tag
      PixelFont.drawText(this.g, `P${pId}`, cardX + 8, cardY + 8, 0xfffffe, 1);

      // Hero Name
      PixelFont.drawText(this.g, cfg.name.toUpperCase(), cardX + 8, cardY + 24, cfg.primaryColor, 1);
      PixelFont.drawText(this.g, cfg.role.substring(0, 14), cardX + 8, cardY + 38, 0xbdc3c7, 1);

      // Skill Names
      PixelFont.drawText(this.g, `SKILL:`, cardX + 8, cardY + 110, 0xf1c40f, 1);
      PixelFont.drawText(this.g, cfg.specialSkillName.substring(0, 12), cardX + 8, cardY + 124, 0xecf0f1, 1);

      // Ready Status
      if (sel.isReady) {
        this.g.rect(cardX + 10, cardY + 150, cardW - 20, 20).fill({ color: 0x2ecc71 });
        PixelFont.drawText(this.g, 'READY!', cardX + cardW / 2 - 18, cardY + 156, 0xfffffe, 1);
      } else {
        PixelFont.drawText(this.g, '< CHOOSE >', cardX + cardW / 2 - 30, cardY + 156, 0x7f8c8d, 1);
      }
    }
  }

  public destroy(): void {
    this.g.destroy();
    this.container.destroy();
  }
}
