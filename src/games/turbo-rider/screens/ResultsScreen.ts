import { Container, Graphics } from 'pixi.js';
import type { BikePhysics } from '../core/BikePhysics';
import { PixelFont } from '../render/PixelFont';

export class ResultsScreen {
  public container: Container;
  private graphics: Graphics;
  private showTimer = 0;
  private showDuration = 5;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  public show(bikes: BikePhysics[], onComplete: () => void): void {
    this.container.visible = true;
    this.showTimer = this.showDuration;
    const sorted = [...bikes].sort((a, b) => b.z - a.z);

    const viewW = 480;
    const viewH = 270;
    this.graphics.clear();

    // Background
    this.graphics.rect(0, 0, viewW, viewH).fill({ color: 0x0f0e17, alpha: 0.95 });

    // Title
    this.graphics.rect(0, 0, viewW, 18).fill({ color: 0xf4d160 });
    PixelFont.drawText(this.graphics, 'RACE RESULTS', viewW / 2 - 52, 3, 0x0f0e17, 1);

    const podiumColors = [0xf4d160, 0xbdc3c7, 0xcd6133, 0x353b48];
    const podiumLabels = ['1ST', '2ND', '3RD', '4TH'];
    const cardW = 100;
    const startX = (viewW - cardW * sorted.length - 8 * (sorted.length - 1)) / 2;

    sorted.forEach((bike, idx) => {
      const cx = startX + idx * (cardW + 8);
      const cy = 24;

      this.graphics.rect(cx, cy, cardW, 200).fill({ color: 0x1a1a24 });
      this.graphics.rect(cx, cy, cardW, 3).fill({ color: podiumColors[idx] });

      const col = parseInt(bike.playerColor.replace('#', ''), 16) || 0xff0055;
      PixelFont.drawText(this.graphics, `P${bike.id}`, cx + 4, cy + 5, col, 1);

      const rankY = cy + 20;
      PixelFont.drawText(this.graphics, podiumLabels[idx], cx + 2, rankY, podiumColors[idx], 2);

      const infoY = rankY + 24;
      PixelFont.drawText(this.graphics, `${Math.round(bike.z)}M`, cx + 4, infoY, 0x74b9ff, 1);

      const crashY = infoY + 10;
      const livesLost = 3 - bike.lives;
      PixelFont.drawText(this.graphics, `CRASHES:${livesLost}`, cx + 4, crashY, 0xff4757, 1);

      const coinY = crashY + 10;
      const coins = bike.coinsCollected || 0;
      PixelFont.drawText(this.graphics, `COINS:${coins}`, cx + 4, coinY, 0xf4d160, 1);

      const speedY = coinY + 10;
      PixelFont.drawText(this.graphics, `SPD:${Math.round(bike.speed)}`, cx + 4, speedY, 0x55efc4, 1);
    });

    // Auto-dismiss timeout
    const dismiss = () => {
      this.container.visible = false;
      onComplete();
    };

    setTimeout(dismiss, this.showDuration * 1000);
  }

  public update(dt: number): void {
    if (this.showTimer > 0) {
      this.showTimer -= dt;
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
