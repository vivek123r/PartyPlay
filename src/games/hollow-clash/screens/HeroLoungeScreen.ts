import { Container, Graphics } from 'pixi.js';
import type { KnightMaskType } from '../types';
import { CAVERN_CONFIG } from '../config';
import { PixelFont } from '../../turbo-rider/render/PixelFont';

export class HeroLoungeScreen {
  public container = new Container();
  private g = new Graphics();
  public startRequested = false;

  public selections: Record<number, { mask: KnightMaskType; isReady: boolean }> = {
    1: { mask: 'vessel', isReady: false },
    2: { mask: 'hornet', isReady: false },
    3: { mask: 'mantis', isReady: false },
    4: { mask: 'grimm', isReady: false },
  };

  private maskOrder: KnightMaskType[] = ['vessel', 'hornet', 'mantis', 'grimm'];

  constructor() {
    this.container.addChild(this.g);

    // Make container interactive for click/tap to start
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.on('pointerdown', () => {
      this.startRequested = true;
    });
  }

  public updateInput(playerId: number, navLeft: boolean, navRight: boolean, toggleReady: boolean): void {
    const sel = this.selections[playerId];
    if (!sel) return;

    if (navLeft || navRight) {
      const idx = this.maskOrder.indexOf(sel.mask);
      const nextIdx = navRight
        ? (idx + 1) % this.maskOrder.length
        : (idx - 1 + this.maskOrder.length) % this.maskOrder.length;
      sel.mask = this.maskOrder[nextIdx];
    }

    if (toggleReady) {
      sel.isReady = !sel.isReady;
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
    const w = 480;
    const h = 270;

    // Dark Cavern Background
    this.g.rect(0, 0, w, h).fill({ color: 0x070b19 });

    // Title
    PixelFont.drawText(this.g, 'HOLLOW CLASH: KNIGHT LOUNGE', w / 2 - 110, 12, 0x00f0ff, 1);

    const cardW = 95;
    const cardH = 150;
    const spacing = Math.floor((w - playerCount * cardW) / (playerCount + 1));

    for (let i = 0; i < playerCount; i++) {
      const pId = i + 1;
      const sel = this.selections[pId];
      const cardX = spacing + i * (cardW + spacing);
      const cardY = 36;

      this.g.rect(cardX, cardY, cardW, cardH).fill({ color: 0x112240 });
      this.g.rect(cardX, cardY, cardW, cardH).stroke({ color: sel.isReady ? 0x2ecc71 : 0x00f0ff, width: 2 });

      PixelFont.drawText(this.g, `KNIGHT ${pId}`, cardX + 8, cardY + 8, 0xffffff, 1);
      PixelFont.drawText(this.g, `MASK: ${sel.mask.toUpperCase()}`, cardX + 8, cardY + 24, 0x00f0ff, 1);

      // Knight Mask Icon Preview
      this.g.ellipse(cardX + cardW / 2, cardY + 70, 12, 16).fill({ color: 0xffffff });
      this.g.ellipse(cardX + cardW / 2 - 4, cardY + 66, 3, 4).fill({ color: 0x000000 });
      this.g.ellipse(cardX + cardW / 2 + 4, cardY + 66, 3, 4).fill({ color: 0x000000 });

      const statusText = sel.isReady ? 'READY!' : '< CHOOSE >';
      const statusColor = sel.isReady ? 0x2ecc71 : 0x7f8c8d;
      PixelFont.drawText(this.g, statusText, cardX + cardW / 2 - 30, cardY + 120, statusColor, 1);
    }

    // Giant Glowing START GAME Button at Bottom Center
    const btnW = 240;
    const btnH = 34;
    const btnX = w / 2 - btnW / 2;
    const btnY = h - 50;

    const pulse = Math.floor(Date.now() * 0.006) % 2 === 0;
    const btnColor = pulse ? 0x2ecc71 : 0x00f0ff;

    this.g.rect(btnX, btnY, btnW, btnH).fill({ color: 0x1e272e });
    this.g.rect(btnX, btnY, btnW, btnH).stroke({ color: btnColor, width: 3 });

    PixelFont.drawText(this.g, 'PRESS ENTER / SPACE / CLICK TO START', btnX + 10, btnY + 10, btnColor, 1);
  }

  public destroy(): void {
    this.g.destroy();
    this.container.destroy();
  }
}
