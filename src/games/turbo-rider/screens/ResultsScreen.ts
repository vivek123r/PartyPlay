import { Container, Graphics } from 'pixi.js';
import type { BikePhysics } from '../core/BikePhysics';
import { PixelFont } from '../render/PixelFont';

export class ResultsScreen {
  public container: Container;
  private graphics: Graphics;
  private showTimer = 0;
  private showDuration = 5;
  private dismissHandle: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  public show(bikes: BikePhysics[], viewW: number, viewH: number, onComplete: () => void): void {
    // A second `show()` before the first's timeout fires (e.g. a fast restart) used to leave the
    // earlier timeout alive alongside this one, so `onComplete` could fire twice, or fire once
    // against a screen that has since been reused for a different race. Clearing it here — and
    // in destroy() below — closes both cases.
    if (this.dismissHandle !== null) {
      clearTimeout(this.dismissHandle);
      this.dismissHandle = null;
    }

    this.container.visible = true;
    this.showTimer = this.showDuration;
    const sorted = [...bikes].sort((a, b) => b.z - a.z);

    this.graphics.clear();

    // Background
    this.graphics.rect(0, 0, viewW, viewH).fill({ color: 0x0f0e17, alpha: 0.95 });

    // Title
    this.graphics.rect(0, 0, viewW, 36).fill({ color: 0xf4d160 });
    const title = 'RACE RESULTS';
    PixelFont.drawTextLarge(this.graphics, title, Math.round(viewW / 2 - PixelFont.measureLarge(title, 2) / 2), 11, 0x0f0e17, 2);

    const podiumColors = [0xf4d160, 0xbdc3c7, 0xcd6133, 0x353b48];
    const podiumLabels = ['1ST', '2ND', '3RD', '4TH'];
    const gutter = 16;
    const cardW = Math.min(200, Math.floor((viewW - gutter * (sorted.length + 1)) / sorted.length));
    const cardH = Math.min(400, viewH - 88);
    const startX = (viewW - cardW * sorted.length - gutter * (sorted.length - 1)) / 2;
    const cy = 48;

    sorted.forEach((bike, idx) => {
      const cx = startX + idx * (cardW + gutter);

      this.graphics.rect(cx, cy, cardW, cardH).fill({ color: 0x1a1a24 });
      this.graphics.rect(cx, cy, cardW, 4).fill({ color: podiumColors[idx] });
      this.graphics.rect(cx, cy, 2, cardH).fill({ color: podiumColors[idx], alpha: 0.5 });
      this.graphics.rect(cx + cardW - 2, cy, 2, cardH).fill({ color: podiumColors[idx], alpha: 0.5 });

      const col = parseInt(bike.playerColor.replace('#', ''), 16) || 0xff0055;
      PixelFont.drawTextLarge(this.graphics, `P${bike.id}`, cx + 10, cy + 10, col, 1.5);

      const rankY = cy + 34;
      PixelFont.drawTextLarge(this.graphics, podiumLabels[idx], cx + 10, rankY, podiumColors[idx], 3);

      const rowH = 20;
      let rowY = rankY + 46;
      const row = (label: string, value: string, color: number) => {
        PixelFont.drawText(this.graphics, label, cx + 10, rowY, 0x74b9ff, 2);
        PixelFont.drawText(this.graphics, value, cx + 10, rowY + 10, color, 2);
        rowY += rowH + 10;
      };

      row('DISTANCE', `${Math.round(bike.z)}M`, 0xfffffe);
      row('CRASHES', `${3 - bike.lives}`, 0xff4757);
      row('COINS', `${bike.coinsCollected || 0}`, 0xf4d160);
      row('TOP SPEED', `${Math.round(bike.speed)} KM/H`, 0x55efc4);
    });

    // Auto-dismiss timeout
    const dismiss = () => {
      this.dismissHandle = null;
      if (this.destroyed) return;
      this.container.visible = false;
      onComplete();
    };

    this.dismissHandle = setTimeout(dismiss, this.showDuration * 1000);
  }

  public update(dt: number): void {
    if (this.showTimer > 0) {
      this.showTimer -= dt;
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.dismissHandle !== null) {
      clearTimeout(this.dismissHandle);
      this.dismissHandle = null;
    }
    this.graphics.destroy();
    this.container.destroy();
  }
}
