import { Container, Graphics } from 'pixi.js';
import type { KnightMaskType, CharmType } from '../types';
import { PixelFont } from '../../turbo-rider/render/PixelFont';

const CHARM_DESCRIPTIONS: Record<CharmType, string> = {
  quick_slash:    'QUICK SLASH: Faster attacks',
  longnail:       'LONGNAIL: Longer nail reach',
  spore_shroom:   'SPORE SHROOM: Heal=spore cloud',
  lifeblood_heart:'LIFEBLOOD: +2 blue masks',
};

const CHARM_COLORS: Record<CharmType, number> = {
  quick_slash:    0xef4444,
  longnail:       0x3b82f6,
  spore_shroom:   0x84cc16,
  lifeblood_heart:0x00f0ff,
};

const ALL_CHARMS: CharmType[] = ['quick_slash', 'longnail', 'spore_shroom', 'lifeblood_heart'];

export class HeroLoungeScreen {
  public container = new Container();
  private g = new Graphics();
  public startRequested = false;

  public selections: Record<number, { mask: KnightMaskType; charm: CharmType; isReady: boolean }> = {
    1: { mask: 'vessel',  charm: 'quick_slash',    isReady: false },
    2: { mask: 'hornet',  charm: 'longnail',        isReady: false },
    3: { mask: 'mantis',  charm: 'spore_shroom',   isReady: false },
    4: { mask: 'grimm',   charm: 'lifeblood_heart', isReady: false },
  };

  private maskOrder: KnightMaskType[] = ['vessel', 'hornet', 'mantis', 'grimm'];

  constructor() {
    this.container.addChild(this.g);
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.on('pointerdown', () => {
      this.startRequested = true;
    });
  }

  /** navLeft/Right = move mask; navUp/Down = cycle charm; toggleReady = confirm */
  public updateInput(
    playerId: number,
    navLeft: boolean,
    navRight: boolean,
    toggleReady: boolean,
    navUp?: boolean,
    navDown?: boolean,
  ): void {
    const sel = this.selections[playerId];
    if (!sel) return;

    if (navLeft || navRight) {
      const idx = this.maskOrder.indexOf(sel.mask);
      const nextIdx = navRight
        ? (idx + 1) % this.maskOrder.length
        : (idx - 1 + this.maskOrder.length) % this.maskOrder.length;
      sel.mask = this.maskOrder[nextIdx];
    }

    if (navUp || navDown) {
      const idx = ALL_CHARMS.indexOf(sel.charm);
      const nextIdx = navDown
        ? (idx + 1) % ALL_CHARMS.length
        : (idx - 1 + ALL_CHARMS.length) % ALL_CHARMS.length;
      sel.charm = ALL_CHARMS[nextIdx];
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

    // ── Gothic dark background ──────────────────────────────────────
    this.g.rect(0, 0, w, h).fill({ color: 0x050912 });

    // Subtle cavern-texture vignette
    for (let row = 0; row < h; row += 12) {
      this.g.rect(0, row, w, 6).fill({ color: 0x060a14, alpha: 0.4 });
    }

    // Title glow
    const pulseAlpha = (Math.sin(Date.now() * 0.004) * 0.3 + 0.7);
    this.g.rect(0, 0, w, 28).fill({ color: 0x0a0f22 });
    PixelFont.drawText(this.g, 'HOLLOW CLASH  SHADOW METROIDVANIA', 16, 8, 0x00f0ff, 1);
    PixelFont.drawText(this.g, '-- CHOOSE YOUR VESSEL & CHARM --', 22, 19, 0x6d28d9 * pulseAlpha | 0, 1);

    // ── Player cards ───────────────────────────────────────────────
    const cardW = 100;
    const cardH = 168;
    const spacing = Math.floor((w - playerCount * cardW) / (playerCount + 1));

    for (let i = 0; i < playerCount; i++) {
      const pId = i + 1;
      const sel = this.selections[pId];
      const cardX = spacing + i * (cardW + spacing);
      const cardY = 32;

      const readyColor = sel.isReady ? 0x22c55e : 0x00f0ff;

      // Card background + border
      this.g.rect(cardX, cardY, cardW, cardH).fill({ color: 0x0d1526 });
      this.g.rect(cardX, cardY, cardW, cardH).stroke({ color: readyColor, width: 2 });

      // Player label
      PixelFont.drawText(this.g, `KNIGHT ${pId}`, cardX + 6, cardY + 6, 0xffffff, 1);

      // ── Mask Preview (pixel art knight face) ──
      const maskColors: Record<KnightMaskType, number> = {
        vessel: 0xffffff, hornet: 0xf472b6, mantis: 0x4ade80, grimm: 0xf87171,
      };
      const maskColor = maskColors[sel.mask] ?? 0xffffff;
      const cx = cardX + cardW / 2;
      const cy = cardY + 58;

      // Dark cloak silhouette
      this.g.poly([cx - 8, cy, cx + 8, cy, cx + 8, cy + 12, cx + 5, cy + 9, cx + 2, cy + 14, cx - 2, cy + 10, cx - 5, cy + 13, cx - 8, cy + 10]).fill({ color: 0x0f172a });
      // Mask face
      this.g.ellipse(cx, cy - 7, 9, 8).fill({ color: maskColor });
      // Left horn (longer)
      this.g.poly([cx - 7, cy - 13, cx - 9, cy - 22, cx - 5, cy - 18, cx - 2, cy - 14]).fill({ color: maskColor });
      // Right horn (chipped)
      this.g.poly([cx + 5, cy - 13, cx + 7, cy - 18, cx + 2, cy - 14]).fill({ color: maskColor });
      // Crack lines
      this.g.poly([cx - 3, cy - 13, cx - 1, cy - 9, cx + 2, cy - 7]).stroke({ color: 0x0f172a, width: 1 });
      // Eyes
      this.g.ellipse(cx + 3, cy - 7, 2.5, 3.5).fill({ color: 0x00f0ff, alpha: 0.9 });
      this.g.ellipse(cx - 3, cy - 7, 2, 3).fill({ color: 0x00f0ff, alpha: 0.6 });

      // Mask label
      PixelFont.drawText(this.g, sel.mask.toUpperCase(), cardX + 6, cardY + 19, 0x94a3b8, 1);
      PixelFont.drawText(this.g, '< MASK >', cardX + 6, cardY + 27, 0x334155, 1);

      // ── Charm selector ──
      const charmY = cardY + 78;
      const charmColor = CHARM_COLORS[sel.charm];

      this.g.rect(cardX + 4, charmY, cardW - 8, 38).fill({ color: 0x0a101e });
      this.g.rect(cardX + 4, charmY, cardW - 8, 38).stroke({ color: charmColor, width: 1 });

      // Charm icon (small colored diamond)
      this.g.poly([
        cardX + 13, charmY + 10,
        cardX + 18, charmY + 15,
        cardX + 13, charmY + 20,
        cardX + 8,  charmY + 15,
      ]).fill({ color: charmColor });

      // Charm name (wrap at ~12 chars)
      const charmName = sel.charm.replace('_', '\n').toUpperCase();
      PixelFont.drawText(this.g, charmName.split('\n')[0], cardX + 22, charmY + 7, charmColor, 1);
      PixelFont.drawText(this.g, (charmName.split('\n')[1] ?? ''), cardX + 22, charmY + 16, charmColor, 1);
      PixelFont.drawText(this.g, '^ CHARM v', cardX + 18, charmY + 28, 0x334155, 1);

      // ── Description ──
      PixelFont.drawText(this.g, CHARM_DESCRIPTIONS[sel.charm], cardX + 4, cardY + 122, 0x64748b, 1);

      // ── Ready state ──
      const statusText = sel.isReady ? 'READY!' : '[ACTION]';
      const statusColor = sel.isReady ? 0x22c55e : 0x64748b;
      this.g.rect(cardX + 4, cardY + cardH - 22, cardW - 8, 14).fill({ color: sel.isReady ? 0x052e16 : 0x0a101e });
      PixelFont.drawText(this.g, statusText, cardX + (sel.isReady ? 24 : 18), cardY + cardH - 18, statusColor, 1);
    }

    // ── Bottom START hint ───────────────────────────────────────────
    const btnW = 280;
    const btnX = w / 2 - btnW / 2;
    const btnY = h - 24;
    const pulse = (Math.sin(Date.now() * 0.005) * 0.4 + 0.6);
    const btnColor = (0x00f0ff * pulse) | 0;
    PixelFont.drawText(this.g, 'PRESS ENTER / SPACE / CLICK TO START', btnX, btnY, 0x00f0ff, 1);
  }

  public destroy(): void {
    this.g.destroy();
    this.container.destroy();
  }
}
