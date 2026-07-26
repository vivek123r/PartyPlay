import { Container, Graphics, Ticker } from 'pixi.js';
import type { BikePhysics } from '../core/BikePhysics';
import type { BikeCustomization, BikeStats } from '../types';
import { PixelFont } from '../render/PixelFont';
import type { AudioService } from '@services/audio/AudioService';

function hexToInt(hexStr: string): number {
  return parseInt(hexStr.replace('#', ''), 16) || 0xffffff;
}

class Particle {
  x = 0; y = 0; vx = 0; vy = 0;
  life = 1; maxLife = 1; color = 0xf4d160; size = 3;
}

class FloatingText {
  text = ''; x = 0; y = 0;
  life = 1; maxLife = 1; color = 0xffffff;
}

/** Bike art centre / native size — used by the showcase, its particles and its aura so they all
 * agree on where the bike actually sits without repeating the same magic numbers three times. */
const ART_CENTER_X = 56;
const ART_CENTER_Y = 28;

export class BikeShowcase extends Container {
  private graphics: Graphics;
  private time = 0;
  private auraPulse = 0;

  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  constructor() {
    super();
    this.graphics = new Graphics();
    this.addChild(this.graphics);
  }

  public triggerUpgrade(partName: string): void {
    this.auraPulse = 1.0;

    for (let i = 0; i < 24; i++) {
      const p = new Particle();
      p.x = ART_CENTER_X; p.y = ART_CENTER_Y;
      const ang = Math.random() * Math.PI * 2;
      const speed = 24 + Math.random() * 56;
      p.vx = Math.cos(ang) * speed;
      p.vy = Math.sin(ang) * speed;
      p.maxLife = p.life = 0.4 + Math.random() * 0.4;
      p.color = Math.random() > 0.5 ? 0xf4d160 : 0x00f0ff;
      this.particles.push(p);
    }

    const ft = new FloatingText();
    ft.text = `+${partName.toUpperCase()} INSTALLED!`;
    ft.x = ART_CENTER_X; ft.y = -16;
    ft.maxLife = ft.life = 1.4;
    ft.color = 0x55efc4;
    this.floatingTexts.push(ft);
  }

  public update(deltaSeconds: number, customization: BikeCustomization): void {
    this.time += deltaSeconds;
    if (this.auraPulse > 0) {
      this.auraPulse = Math.max(0, this.auraPulse - deltaSeconds * 2.5);
    }

    this.particles = this.particles.filter((p) => {
      p.life -= deltaSeconds;
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      return p.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter((ft) => {
      ft.life -= deltaSeconds;
      ft.y -= 16 * deltaSeconds;
      return ft.life > 0;
    });

    this.renderBike(customization);
  }

  /**
   * Native 112x68 art box (doubled from the legacy 56x34 sprite so it reads at native pixel
   * density instead of being scaled up — see GAME_REFERENCE.md). Every part from the old art is
   * present at 2x its old coordinates, plus new components the extra pixel budget affords:
   * 6-spoke wheels + brake disc/caliper, fork tubes, a chain/sprocket, an exhaust with a heat
   * tint, fairing vents, mirror stalks, a separated rider arm/knee, and a visor highlight.
   */
  private renderPixelSuperbikeSide(g: Graphics, c: BikeCustomization, bob: number, time: number): void {
    const paint = hexToInt(c.primaryPaint || '#ff4757');
    const rimCol = hexToInt(c.rimColor || '#f4d160');
    const suit = hexToInt(c.suitColor || '#2d3436');
    const helmet = hexToInt(c.helmetColor || c.primaryPaint);
    const spin = time * 14;

    const drawWheel = (wx: number, wy: number) => {
      g.rect(wx - 14, wy - 14, 28, 28).fill({ color: 0x1e272e });
      g.rect(wx - 12, wy - 12, 24, 24).fill({ color: 0x2f3542 });
      g.rect(wx - 10, wy - 10, 20, 20).fill({ color: 0x7f8c8d });
      // Brake disc + caliper
      g.rect(wx - 9, wy - 9, 18, 18).fill({ color: 0xced6e0, alpha: 0.5 });
      g.rect(wx - 13, wy - 4, 5, 8).fill({ color: 0x2d3436 });
      g.rect(wx - 2, wy - 2, 4, 4).fill({ color: 0x0f0e17 });
      g.rect(wx - 8, wy - 8, 16, 16).fill({ color: rimCol });
      // 6-spoke rotating rim
      for (let i = 0; i < 6; i++) {
        const a = spin + (i * Math.PI) / 3;
        const sx = Math.round(wx + Math.cos(a) * 6);
        const sy = Math.round(wy + Math.sin(a) * 6);
        g.rect(sx - 1, sy - 1, 2, 2).fill({ color: 0x1e272e });
      }
      const spX = Math.round(wx + Math.cos(spin) * 9);
      const spY = Math.round(wy + Math.sin(spin) * 9);
      g.rect(spX - 1, spY - 1, 2, 2).fill({ color: 0xfffffe });
    };

    drawWheel(20, 42);
    drawWheel(88, 42);

    // Fork tubes
    g.rect(78, 20 + bob, 4, 24).fill({ color: 0xdcdde1 });
    g.rect(82, 20 + bob, 3, 24).fill({ color: 0x7f8c8d });

    // Chain + sprocket
    g.rect(34, 40, 46, 2).fill({ color: 0x2d3436, alpha: 0.7 });
    for (let i = 0; i < 8; i++) {
      const a = spin * 1.4 + (i * Math.PI) / 4;
      const sx = Math.round(20 + Math.cos(a) * 10);
      const sy = Math.round(42 + Math.sin(a) * 10);
      g.rect(sx - 1, sy - 1, 2, 2).fill({ color: 0x57606f });
    }

    // Tank
    g.rect(36, 24 + bob, 36, 18).fill({ color: 0xbdc3c7 });
    g.rect(40, 30 + bob, 28, 12).fill({ color: 0x2f3542 });
    g.rect(38, 26 + bob, 10, 4).fill({ color: 0xffffff, alpha: 0.4 });

    // Front fender / headlight
    g.rect(8, 36 + bob, 36, 6).fill({ color: 0xdcdde1 });
    g.rect(4, 34 + bob, 12, 10).fill({ color: 0x2f3542 });

    g.rect(80, 20 + bob, 6, 22).fill({ color: 0xbdc3c7 });

    // Exhaust can, heat-tinted tip
    g.rect(78, 44 + bob, 14, 6).fill({ color: 0x7f8c8d });
    g.rect(90, 45 + bob, 6, 4).fill({ color: 0xff7043, alpha: 0.6 });
    g.rect(94, 46 + bob, 3, 2).fill({ color: 0xffd54f, alpha: 0.5 });

    // Lower fairing (paint) + vents
    g.rect(12, 14 + bob, 24, 12).fill({ color: paint });
    g.rect(16, 18 + bob, 12, 6).fill({ color: 0xfffffe });
    g.rect(14, 22 + bob, 6, 2).fill({ color: 0x1e272e, alpha: 0.6 });
    g.rect(22, 22 + bob, 6, 2).fill({ color: 0x1e272e, alpha: 0.6 });

    // Seat + tail fairing + tail light
    g.rect(40, 8 + bob, 28, 16).fill({ color: paint });
    g.rect(26, 18 + bob, 16, 8).fill({ color: 0x1e272e });
    g.rect(68, 10 + bob, 24, 22).fill({ color: paint });
    g.rect(88, 20 + bob, 8, 8).fill({ color: 0xfffffe });

    // Windscreen + frame
    g.rect(80, 4 + bob, 16, 12).fill({ color: 0x0984e3, alpha: 0.8 });
    g.rect(68, 8 + bob, 8, 4).fill({ color: 0x2d3436 });

    // Mirror stalks
    g.rect(66, 6 + bob, 2, 8).fill({ color: 0x2f3542 });
    g.rect(60, 4 + bob, 8, 5).fill({ color: 0xdcdde1 });

    // Rider torso, arm, knee
    g.rect(34, 2 + bob, 22, 18).fill({ color: suit });
    g.rect(56, 6 + bob, 16, 8).fill({ color: suit });
    g.rect(36, 16 + bob, 12, 12).fill({ color: suit });
    g.rect(44, 22 + bob, 8, 8).fill({ color: 0x0f0e17 });
    g.rect(60, 18 + bob, 10, 6).fill({ color: suit });
    g.rect(30, 28 + bob, 8, 10).fill({ color: suit, alpha: 0.9 });

    // Helmet + visor highlight
    g.rect(48, -10 + bob, 18, 16).fill({ color: helmet });
    g.rect(56, -6 + bob, 10, 8).fill({ color: 0x0f0e17 });
    g.rect(58, -5 + bob, 4, 2).fill({ color: 0xffffff, alpha: 0.5 });
  }

  private renderBike(c: BikeCustomization): void {
    this.graphics.clear();

    const bob = Math.cos(this.time * 10) * 1.4;

    // Ground shadow / turntable platform
    this.graphics.ellipse(ART_CENTER_X, 58, 46, 6).fill({ color: 0x000000, alpha: 0.35 });

    if (this.auraPulse > 0) {
      this.graphics.circle(ART_CENTER_X, ART_CENTER_Y, 68).fill({ color: 0x55efc4, alpha: this.auraPulse * 0.35 });
    }

    const ledColor = hexToInt(c.underglowLed || '#00f0ff');
    const pulse = 0.6 + Math.sin(this.time * 6) * 0.35;
    this.graphics.rect(8, 52, 88, 6).fill({ color: ledColor, alpha: pulse });

    this.renderPixelSuperbikeSide(this.graphics, c, bob, this.time);

    for (const p of this.particles) {
      this.graphics.rect(p.x, p.y, p.size, p.size).fill({ color: p.color, alpha: p.life / p.maxLife });
    }

    for (const ft of this.floatingTexts) {
      const w = PixelFont.measure(ft.text);
      PixelFont.drawText(this.graphics, ft.text, ft.x - w / 2, ft.y, ft.color, 1, ft.life / ft.maxLife);
    }
  }
}

export class GarageScreen {
  public container: Container;
  private graphics: Graphics;

  public playerReady: boolean[] = [false, false, false, false];
  private selectedRow: number[] = [0, 0, 0, 0];
  private colorPalette = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502', '#e84393', '#00d2d3'];
  private colorIdx: number[] = [0, 1, 2, 3];

  private showcases: BikeShowcase[] = [];
  private ticker: Ticker;
  /** Recomputed every `render()` call (below) — the click handler always tests against the
   * bounds that were actually drawn, never a stale literal (see the fixed bug this replaced). */
  public startButtonBounds = { x: 0, y: 0, w: 0, h: 0 };
  private audio: AudioService | null = null;

  public setAudioService(audio: AudioService): void {
    this.audio = audio;
  }

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.container.eventMode = 'static';
    this.container.on('pointerdown', (evt) => {
      const pos = evt.getLocalPosition(this.container);
      const b = this.startButtonBounds;
      if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
        this.forceStartAll();
      }
    });

    for (let i = 0; i < 4; i++) {
      const showcase = new BikeShowcase();
      this.showcases.push(showcase);
      this.container.addChild(showcase);
    }

    this.ticker = new Ticker();
    this.ticker.start();
  }

  public forceStartAll(): void {
    this.playerReady = [true, true, true, true];
    this.audio?.playTone(659, 'triangle', 0.12);
  }

  private getTotalTokens(c: BikeCustomization): number {
    return c.engineLevel + c.ecuLevel + c.suspensionLevel + c.tyresLevel + c.brakesLevel;
  }

  public updateGarageInput(
    playerId: number,
    bike: BikePhysics,
    navLeft: boolean,
    navRight: boolean,
    actionSelect: boolean,
    toggleReady: boolean
  ): void {
    const c = bike.customization;
    const t = bike.tuning;

    if (toggleReady) {
      this.playerReady[playerId] = !this.playerReady[playerId];
      this.audio?.playTone(659, 'triangle', 0.12);
      return;
    }

    if (this.playerReady[playerId]) return;

    if (navLeft || navRight) {
      this.audio?.playTone(440, 'sine', 0.03);
      const dir = navRight ? 1 : -1;
      const row = this.selectedRow[playerId];
      const totalTokens = this.getTotalTokens(c);

      if (row === 0) {
        this.colorIdx[playerId] = (this.colorIdx[playerId] + dir + this.colorPalette.length) % this.colorPalette.length;
        c.primaryPaint = this.colorPalette[this.colorIdx[playerId]];
        c.rimColor = this.colorPalette[(this.colorIdx[playerId] + 1) % this.colorPalette.length];
        c.underglowLed = this.colorPalette[(this.colorIdx[playerId] + 3) % this.colorPalette.length];
        bike.playerColor = c.primaryPaint;
      } else if (row >= 1 && row <= 5) {
        const parts = ['engineLevel', 'ecuLevel', 'suspensionLevel', 'tyresLevel', 'brakesLevel'] as const;
        const partNames = ['Engine', 'ECU', 'Suspension', 'Tyres', 'Brakes'];
        const part = parts[row - 1];

        if (dir === 1 && totalTokens < 10 && c[part] < 3) {
          c[part]++;
          this.showcases[playerId].triggerUpgrade(partNames[row - 1]);
          this.audio?.playSweep({ type: 'square', startFreq: 440, endFreq: 880, duration: 0.15 });
        } else if (dir === -1 && c[part] > 0) {
          c[part]--;
        }
      } else if (row === 6) {
        t.gearRatios = Math.max(0, Math.min(1.0, t.gearRatios + dir * 0.1));
      } else if (row === 7) {
        t.suspensionStiffness = Math.max(0, Math.min(1.0, t.suspensionStiffness + dir * 0.1));
      }

      bike.updateStats();
    } else if (actionSelect) {
      if (this.selectedRow[playerId] === 7) {
        this.playerReady[playerId] = true;
        this.audio?.playTone(659, 'triangle', 0.12);
      } else {
        this.selectedRow[playerId] = (this.selectedRow[playerId] + 1) % 8;
        this.audio?.playTone(440, 'sine', 0.03);
      }
    }
  }

  public isAllReady(activePlayersCount: number): boolean {
    for (let i = 0; i < activePlayersCount; i++) {
      if (!this.playerReady[i]) return false;
    }
    return true;
  }

  /** Graphical 3-segment upgrade-level bar — replaces the old `[##-]` text token string so a
   * level reads at a glance instead of requiring the player to parse ASCII brackets. */
  private drawTokenBar(g: Graphics, x: number, y: number, level: number, max: number, w: number, h: number, color: number): void {
    const segW = (w - (max - 1) * 2) / max;
    for (let i = 0; i < max; i++) {
      const sx = x + i * (segW + 2);
      const filled = i < level;
      g.rect(sx, y, segW, h).fill({ color: filled ? color : 0x353b48 });
      g.rect(sx, y, segW, h).stroke({ width: 1, color: 0x0f0e17, alpha: 0.6 });
      if (filled) g.rect(sx + 1, y + 1, segW - 2, 1).fill({ color: 0xffffff, alpha: 0.35 });
    }
  }

  private drawSlider(g: Graphics, x: number, y: number, w: number, h: number, frac: number, color: number): void {
    g.rect(x, y + h / 2 - 1, w, 2).fill({ color: 0x353b48 });
    const knobX = x + w * Math.max(0, Math.min(1, frac));
    g.rect(x, y + h / 2 - 1, Math.max(1, knobX - x), 2).fill({ color, alpha: 0.7 });
    g.rect(knobX - 3, y, 6, h).fill({ color });
    g.rect(knobX - 3, y, 6, h).stroke({ width: 1, color: 0x0f0e17, alpha: 0.6 });
  }

  public render(bikes: BikePhysics[], viewW: number, viewH: number): void {
    const delta = this.ticker.deltaMS / 1000;
    this.graphics.clear();

    this.graphics.rect(0, 0, viewW, viewH).fill({ color: 0x0f0e17 });
    this.graphics.rect(0, 0, viewW, 32).fill({ color: 0xff0055 });
    this.graphics.rect(0, 32, viewW, 4).fill({ color: 0x00f0ff });

    const title = 'TURBO TUNING WORKSHOP';
    PixelFont.drawTextLarge(this.graphics, title, Math.round(viewW / 2 - PixelFont.measureLarge(title, 2) / 2), 9, 0xfffffe, 2);

    const count = bikes.length;
    const gutter = 16;
    const cardW = Math.floor((viewW - gutter * (count + 1)) / count);
    const cy = 44;
    const cardH = 424;

    bikes.forEach((bike, idx) => {
      const cx = gutter + idx * (cardW + gutter);

      const hexColor = hexToInt(bike.playerColor) || 0xff0055;
      const isReady = this.playerReady[idx];

      // --- Card chrome ---
      this.graphics.rect(cx, cy, cardW, cardH).fill({ color: 0x1a1a24 });
      const borderCol = isReady ? 0x55efc4 : hexColor;
      this.graphics.rect(cx, cy, cardW, 3).fill({ color: borderCol });
      this.graphics.rect(cx, cy, 3, cardH).fill({ color: borderCol });
      this.graphics.rect(cx + cardW - 3, cy, 3, cardH).fill({ color: borderCol });
      this.graphics.rect(cx, cy + cardH - 3, cardW, 3).fill({ color: borderCol });
      this.graphics.rect(cx + 1, cy + 1, cardW - 2, cardH - 2).stroke({ width: 1, color: 0x000000, alpha: 0.4 });

      // --- Header strip: P#, token pip count, READY badge ---
      PixelFont.drawTextLarge(this.graphics, `P${bike.id}`, cx + 8, cy + 6, hexColor, 2);

      const tokensUsed = this.getTotalTokens(bike.customization);
      const tokenColor = tokensUsed === 10 ? 0xff4757 : 0xf4d160;
      const tokenLabel = `TOKENS ${tokensUsed}/10`;
      PixelFont.drawText(this.graphics, tokenLabel, cx + 8 + PixelFont.measureLarge(`P${bike.id}`, 2) + 12, cy + 9, tokenColor, 2);

      if (isReady) {
        const t = 'READY!';
        PixelFont.drawText(this.graphics, t, cx + cardW - 8 - PixelFont.measure(t, 2), cy + 9, 0x55efc4, 2);
      }

      // --- Showcase bay: a framed panel for the bike art ---
      const bayY = cy + 26;
      const bayH = 140;
      this.graphics.rect(cx + 4, bayY, cardW - 8, bayH).fill({ color: 0x0a0a12 });
      this.graphics.rect(cx + 4, bayY, cardW - 8, bayH).stroke({ width: 1, color: 0x2a2a38 });
      // Faint grid backdrop
      for (let gx = cx + 4; gx < cx + cardW - 4; gx += 20) {
        this.graphics.rect(gx, bayY, 1, bayH).fill({ color: 0xffffff, alpha: 0.03 });
      }

      const sc = this.showcases[idx];
      sc.x = cx + cardW / 2 - ART_CENTER_X;
      sc.y = bayY + bayH / 2 - ART_CENTER_Y - 8;
      sc.scale.set(1);
      sc.update(delta, bike.customization);

      // --- Stat radar ---
      const radarCenterY = bayY + bayH + 6 + 44;
      this.renderStatRadar(cx + cardW / 2, radarCenterY, 44, bike.stats, hexColor);

      // --- Tuning rows ---
      const sel = this.selectedRow[idx];
      const rowLabels = ['PAINT', 'ENGINE', 'ECU', 'SUSP', 'TYRES', 'BRAKES', 'GEARS', 'STIFF'];
      const rowsTop = radarCenterY + 44 + 16 + 8;
      const rowH = 18;
      const barW = Math.min(160, cardW - 96);
      const barX = cx + cardW - 8 - barW;

      rowLabels.forEach((label, rIdx) => {
        const ry = rowsTop + rIdx * rowH;
        const isSelected = sel === rIdx && !isReady;

        if (isSelected) {
          this.graphics.rect(cx + 4, ry - 2, cardW - 8, rowH - 2).fill({ color: hexColor, alpha: 0.25 });
          this.graphics.rect(cx + 4, ry - 2, 3, rowH - 2).fill({ color: 0xf4d160 });
        }
        const labelColor = isSelected ? 0xfffffe : 0x74b9ff;
        PixelFont.drawText(this.graphics, label, cx + 12, ry, labelColor, 2);

        if (rIdx === 0) {
          // PAINT — palette swatches, active one ringed
          const activeIdx = this.colorIdx[idx];
          const swW = 14;
          this.colorPalette.forEach((hex, pIdx) => {
            const sx = barX + pIdx * (swW + 4);
            const col = hexToInt(hex);
            this.graphics.rect(sx, ry, swW, swW).fill({ color: col });
            if (pIdx === activeIdx) {
              this.graphics.rect(sx - 2, ry - 2, swW + 4, swW + 4).stroke({ width: 2, color: 0xfffffe });
            }
          });
        } else if (rIdx >= 1 && rIdx <= 5) {
          const parts = ['engineLevel', 'ecuLevel', 'suspensionLevel', 'tyresLevel', 'brakesLevel'] as const;
          const level = bike.customization[parts[rIdx - 1]];
          this.drawTokenBar(this.graphics, barX, ry, level, 3, barW, 14, hexColor);
        } else if (rIdx === 6) {
          this.drawSlider(this.graphics, barX, ry, barW, 14, bike.tuning.gearRatios, hexColor);
        } else if (rIdx === 7) {
          this.drawSlider(this.graphics, barX, ry, barW, 14, bike.tuning.suspensionStiffness, hexColor);
        }
      });
    });

    for (let i = count; i < 4; i++) {
      this.showcases[i].visible = false;
    }

    const btnW = 320;
    const btnH = 36;
    const btnX = viewW / 2 - btnW / 2;
    const btnY = viewH - 56;
    this.startButtonBounds = { x: btnX, y: btnY - 8, w: btnW, h: btnH + 12 };

    const pulseGlow = 0.85 + Math.sin(this.ticker.lastTime * 0.01) * 0.15;
    this.graphics.rect(btnX - 3, btnY - 3, btnW + 6, btnH + 6).fill({ color: 0x55efc4, alpha: pulseGlow * 0.5 });
    this.graphics.rect(btnX, btnY, btnW, btnH).fill({ color: 0x55efc4, alpha: pulseGlow });
    this.graphics.rect(btnX + 3, btnY + 3, btnW - 6, btnH - 6).fill({ color: 0x0f0e17 });
    // Corner notches
    [[btnX, btnY], [btnX + btnW - 6, btnY], [btnX, btnY + btnH - 6], [btnX + btnW - 6, btnY + btnH - 6]].forEach(([nx, ny]) => {
      this.graphics.rect(nx, ny, 6, 6).fill({ color: 0x55efc4 });
    });

    const btnLabel = 'START RACE';
    PixelFont.drawTextLarge(this.graphics, btnLabel, Math.round(viewW / 2 - PixelFont.measureLarge(btnLabel, 2) / 2), btnY + 10, 0x55efc4, 2);

    // Controls legend
    const legend = 'A/D NAV   W SELECT   S READY';
    PixelFont.drawText(this.graphics, legend, Math.round(viewW / 2 - PixelFont.measure(legend, 2) / 2), viewH - 16, 0x74b9ff, 2);
  }

  private renderStatRadar(centerX: number, centerY: number, radius: number, stats: BikeStats, color: number): void {
    const labels = ['SPD', 'ACC', 'TOR', 'GRP', 'BRK'];
    const angles = [
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2) / 5,
      -Math.PI / 2 + (Math.PI * 4) / 5,
      -Math.PI / 2 + (Math.PI * 6) / 5,
      -Math.PI / 2 + (Math.PI * 8) / 5,
    ];

    // Concentric guide rings at 50% / 100%
    [0.5, 1.0].forEach((f) => {
      const ringPts: number[] = [];
      angles.forEach((ang) => {
        ringPts.push(centerX + Math.cos(ang) * radius * f, centerY + Math.sin(ang) * radius * f);
      });
      this.graphics.poly(ringPts).stroke({ color: 0x353b48, width: 1, alpha: f === 1 ? 0.8 : 0.4 });
    });

    // Axis spokes
    angles.forEach((ang) => {
      this.graphics.moveTo(centerX, centerY)
        .lineTo(centerX + Math.cos(ang) * radius, centerY + Math.sin(ang) * radius)
        .stroke({ color: 0x353b48, width: 1, alpha: 0.4 });
    });

    const statVals = [
      Math.min(1.0, stats.topSpeed / 250),
      Math.min(1.0, stats.acceleration / 100),
      Math.min(1.0, stats.torque / 160),
      Math.min(1.0, stats.cornerGrip / 100),
      Math.min(1.0, stats.braking / 120),
    ];

    const radarPoints: number[] = [];
    angles.forEach((ang, idx) => {
      const r = radius * statVals[idx];
      radarPoints.push(centerX + Math.cos(ang) * r, centerY + Math.sin(ang) * r);
    });

    this.graphics.poly(radarPoints).fill({ color, alpha: 0.45 }).stroke({ color, width: 2 });

    // Stat labels + numeric readout
    angles.forEach((ang, idx) => {
      const lx = centerX + Math.cos(ang) * (radius + 16);
      const ly = centerY + Math.sin(ang) * (radius + 12);
      const lw = PixelFont.measure(labels[idx], 1.5);
      PixelFont.drawText(this.graphics, labels[idx], Math.round(lx - lw / 2), Math.round(ly - 4), 0x74b9ff, 1.5);
    });
  }

  public destroy(): void {
    this.ticker.stop();
    this.ticker.destroy();
    this.graphics.destroy();
    this.showcases.forEach((sc) => sc.destroy({ children: true }));
    this.container.destroy({ children: true });
  }
}
