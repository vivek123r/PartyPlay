import { Container, Graphics } from 'pixi.js';
import type { KnightMaskType } from '../types';
import { CAVERN_CONFIG } from '../config';
import { PixelFont } from '../../turbo-rider/render/PixelFont';

export class HeroLoungeScreen {
  public container = new Container();
  private g = new Graphics();

  public selections: Record<number, { mask: KnightMaskType; isReady: boolean }> = {
    1: { mask: 'vessel', isReady: false },
    2: { mask: 'hornet', isReady: false },
    3: { mask: 'mantis', isReady: false },
    4: { mask: 'grimm', isReady: false },
  };

  private maskOrder: KnightMaskType[] = ['vessel', 'hornet', 'mantis', 'grimm'];

  constructor() {
    this.container.addChild(this.g);
  }

  public updateInput(playerId: number, navLeft: boolean, navRight: boolean, toggleReady: boolean): void {
    const sel = this.selections[playerId];
    if (!sel || sel.isReady) return;

    if (navLeft || navRight) {
      const idx = this.maskOrder.indexOf(sel.mask);
      const nextIdx = navRight
        ? (idx + 1) % this.maskOrder.length
        : (idx - 1 + this.maskOrder.length) % this.maskOrder.length;
      sel.mask = this.maskOrder[nextIdx];
    }

    if (toggleReady) {
      sel.isReady = true;
    }
  }

  public isAllReady(count: number): boolean {
    for (let i = 1; i <= count; i++) {
      if (!this.selections[i]?.isReady) return false;
    }
    return true;
  }

  public render(playerCount: number): void {
    this.g.clear();
    const w = CAVERN_CONFIG.width;
    const h = CAVERN_CONFIG.height;

    // Dark Cavern Background
    this.g.rect(0, 0, w, h).fill({ color: 0x070b19 });

    // Title
    PixelFont.drawText(this.g, 'HOLLOW CLASH: KNIGHT LOUNGE', w / 2 - 110, 16, 0x00f0ff, 1);
    PixelFont.drawText(this.g, 'SELECT MASK & PRESS ACTION TO READY', w / 2 - 120, 32, 0xf1c40f, 1);

    const cardW = 100;
    const cardH = 180;
    const spacing = Math.floor((w - playerCount * cardW) / (playerCount + 1));

    for (let i = 0; i < playerCount; i++) {
      const pId = i + 1;
      const sel = this.selections[pId];
      const cardX = spacing + i * (cardW + spacing);
      const cardY = 56;

      const borderColor = sel.isReady ? 0x2ecc71 : 0x00f0ff;
      this.g.rect(cardX, cardY, cardW, cardH).fill({ color: 0x112240 });
      this.g.rect(cardX, cardY, cardW, cardH).stroke({ color: borderColor, width: 2 });

      PixelFont.drawText(this.g, `KNIGHT ${pId}`, cardX + 8, cardY + 8, 0xffffff, 1);
      PixelFont.drawText(this.g, `MASK: ${sel.mask.toUpperCase()}`, cardX + 8, cardY + 28, 0x00f0ff, 1);

      // Knight Mask Icon Preview
      this.g.ellipse(cardX + cardW / 2, cardY + 80, 12, 16).fill({ color: 0xffffff });
      this.g.ellipse(cardX + cardW / 2 - 4, cardY + 76, 3, 4).fill({ color: 0x000000 });
      this.g.ellipse(cardX + cardW / 2 + 4, cardY + 76, 3, 4).fill({ color: 0x000000 });

      if (sel.isReady) {
        this.g.rect(cardX + 10, cardY + 145, cardW - 20, 22).fill({ color: 0x2ecc71 });
        PixelFont.drawText(this.g, 'READY!', cardX + cardW / 2 - 18, cardY + 152, 0xffffff, 1);
      } else {
        PixelFont.drawText(this.g, '< CHOOSE >', cardX + cardW / 2 - 30, cardY + 152, 0x7f8c8d, 1);
      }
    }
  }

  public destroy(): void {
    this.g.destroy();
    this.container.destroy();
  }
}
