import { Container, Graphics, Ticker } from 'pixi.js';
import type { BikePhysics } from '../core/BikePhysics';
import type { BikeCustomization, BikeStats } from '../types';
import { PixelFont } from '../render/PixelFont';

function hexToInt(hexStr: string): number {
  return parseInt(hexStr.replace('#', ''), 16) || 0xffffff;
}

let audioCtx: AudioContext | null = null;
function playRevSound(pitchMult = 1.0) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 * pitchMult, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(340 * pitchMult, audioCtx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(70 * pitchMult, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    // Audio context fallback
  }
}

class Particle {
  x = 0; y = 0; vx = 0; vy = 0;
  life = 1; maxLife = 1; color = 0xf4d160; size = 2;
}

class FloatingText {
  text = ''; x = 0; y = 0;
  life = 1; maxLife = 1; color = 0xffffff;
}

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

    for (let i = 0; i < 20; i++) {
      const p = new Particle();
      p.x = 28; p.y = 14;
      const ang = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 40;
      p.vx = Math.cos(ang) * speed;
      p.vy = Math.sin(ang) * speed;
      p.maxLife = p.life = 0.4 + Math.random() * 0.4;
      p.color = Math.random() > 0.5 ? 0xf4d160 : 0x00f0ff;
      this.particles.push(p);
    }

    const ft = new FloatingText();
    ft.text = `+${partName.toUpperCase()} INSTALLED!`;
    ft.x = 28; ft.y = -8;
    ft.maxLife = ft.life = 1.4;
    ft.color = 0x55efc4;
    this.floatingTexts.push(ft);

    playRevSound(1.0 + Math.random() * 0.4);
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
      ft.y -= 12 * deltaSeconds;
      return ft.life > 0;
    });

    this.renderBike(customization);
  }

  private renderPixelSuperbikeSide(g: Graphics, c: BikeCustomization, bob: number, time: number): void {
    const paint = hexToInt(c.primaryPaint || '#ff4757');
    const rimCol = hexToInt(c.rimColor || '#f4d160');
    const suit = hexToInt(c.suitColor || '#2d3436');
    const helmet = hexToInt(c.helmetColor || c.primaryPaint);
    const spin = time * 14;

    const drawWheel = (wx: number, wy: number) => {
      g.rect(wx - 7, wy - 7, 14, 14).fill({ color: 0x1e272e });
      g.rect(wx - 6, wy - 6, 12, 12).fill({ color: 0x2f3542 });
      g.rect(wx - 5, wy - 5, 10, 10).fill({ color: 0x7f8c8d });
      g.rect(wx - 1, wy - 1, 2, 2).fill({ color: 0x0f0e17 });
      g.rect(wx - 4, wy - 4, 8, 8).fill({ color: rimCol });

      const spX = wx + Math.cos(spin) * 4.5;
      const spY = wy + Math.sin(spin) * 4.5;
      g.rect(Math.round(spX) - 1, Math.round(spY) - 1, 2, 2).fill({ color: 0xfffffe });
    };

    drawWheel(10, 21);
    drawWheel(44, 21);

    g.rect(18, 12 + bob, 18, 9).fill({ color: 0xbdc3c7 });
    g.rect(20, 15 + bob, 14, 6).fill({ color: 0x2f3542 });

    g.rect(4, 18 + bob, 18, 3).fill({ color: 0xdcdde1 });
    g.rect(2, 17 + bob, 6, 5).fill({ color: 0x2f3542 });

    g.rect(40, 10 + bob, 3, 11).fill({ color: 0xbdc3c7 });

    g.rect(6, 7 + bob, 12, 6).fill({ color: paint });
    g.rect(8, 9 + bob, 6, 3).fill({ color: 0xfffffe });
    g.rect(20, 4 + bob, 14, 8).fill({ color: paint });
    g.rect(13, 9 + bob, 8, 4).fill({ color: 0x1e272e });
    g.rect(34, 5 + bob, 12, 11).fill({ color: paint });
    g.rect(44, 10 + bob, 4, 4).fill({ color: 0xfffffe });

    g.rect(40, 2 + bob, 8, 6).fill({ color: 0x0984e3, alpha: 0.8 });
    g.rect(34, 4 + bob, 4, 2).fill({ color: 0x2d3436 });

    g.rect(17, 1 + bob, 11, 9).fill({ color: suit });
    g.rect(28, 3 + bob, 8, 4).fill({ color: suit });
    g.rect(18, 8 + bob, 6, 6).fill({ color: suit });
    g.rect(22, 11 + bob, 4, 4).fill({ color: 0x0f0e17 });

    g.rect(24, -5 + bob, 9, 8).fill({ color: helmet });
    g.rect(28, -3 + bob, 5, 4).fill({ color: 0x0f0e17 });
  }

  private renderBike(c: BikeCustomization): void {
    this.graphics.clear();

    const bob = Math.cos(this.time * 10) * 1.2;

    if (this.auraPulse > 0) {
      this.graphics.circle(28, 14, 34).fill({ color: 0x55efc4, alpha: this.auraPulse * 0.35 });
    }

    const ledColor = hexToInt(c.underglowLed || '#00f0ff');
    const pulse = 0.6 + Math.sin(this.time * 6) * 0.35;
    this.graphics.rect(4, 26, 44, 3).fill({ color: ledColor, alpha: pulse });

    this.renderPixelSuperbikeSide(this.graphics, c, bob, this.time);

    for (const p of this.particles) {
      this.graphics.rect(p.x, p.y, p.size, p.size).fill({ color: p.color, alpha: p.life / p.maxLife });
    }

    for (const ft of this.floatingTexts) {
      PixelFont.drawText(this.graphics, ft.text, ft.x - ft.text.length * 2, ft.y, ft.color, 1, ft.life / ft.maxLife);
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
  public startButtonBounds = { x: 130, y: 242, w: 220, h: 22 };

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.container.eventMode = 'static';
    this.container.on('pointerdown', (evt) => {
      const pos = evt.getLocalPosition(this.container);
      const b = this.startButtonBounds;
      if (pos.y >= 235 || (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h)) {
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
    playRevSound(1.5);
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
      playRevSound(1.2);
      return;
    }

    if (this.playerReady[playerId]) return;

    if (navLeft || navRight) {
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
        playRevSound(1.2);
      } else {
        this.selectedRow[playerId] = (this.selectedRow[playerId] + 1) % 8;
      }
    }
  }

  public isAllReady(activePlayersCount: number): boolean {
    for (let i = 0; i < activePlayersCount; i++) {
      if (!this.playerReady[i]) return false;
    }
    return true;
  }

  private getTokenString(level: number): string {
    return '[' + '#'.repeat(level) + '-'.repeat(3 - level) + ']';
  }

  public render(bikes: BikePhysics[], viewW: number, viewH: number): void {
    const delta = this.ticker.deltaMS / 1000;
    this.graphics.clear();

    this.graphics.rect(0, 0, viewW, viewH).fill({ color: 0x0f0e17 });
    this.graphics.rect(0, 0, viewW, 16).fill({ color: 0xff0055 });
    this.graphics.rect(0, 16, viewW, 2).fill({ color: 0x00f0ff });

    PixelFont.drawText(this.graphics, 'TURBO TUNING WORKSHOP', viewW / 2 - 80, 4, 0xfffffe, 1);

    const count = bikes.length;
    const cardW = Math.floor((viewW - 16) / count) - 6;
    const cardH = viewH - 56;

    bikes.forEach((bike, idx) => {
      const cx = 8 + idx * (cardW + 6);
      const cy = 22;

      const hexColor = hexToInt(bike.playerColor) || 0xff0055;
      const isReady = this.playerReady[idx];

      this.graphics.rect(cx, cy, cardW, cardH).fill({ color: 0x1a1a24 });
      const borderCol = isReady ? 0x55efc4 : hexColor;
      this.graphics.rect(cx, cy, cardW, 2).fill({ color: borderCol });
      this.graphics.rect(cx, cy, 2, cardH).fill({ color: borderCol });
      this.graphics.rect(cx + cardW - 2, cy, 2, cardH).fill({ color: borderCol });
      this.graphics.rect(cx, cy + cardH - 2, cardW, 2).fill({ color: borderCol });

      PixelFont.drawText(this.graphics, `P${bike.id}`, cx + 4, cy + 4, hexColor, 1);

      const tokensUsed = this.getTotalTokens(bike.customization);
      const tokenColor = tokensUsed === 10 ? 0xff4757 : 0xf4d160;
      PixelFont.drawText(this.graphics, `TOKENS:${tokensUsed}/10`, cx + 28, cy + 4, tokenColor, 1);

      if (isReady) {
        PixelFont.drawText(this.graphics, 'READY!', cx + cardW - 36, cy + 4, 0x55efc4, 1);
      }

      const sc = this.showcases[idx];
      sc.x = cx + cardW / 2 - 28;
      sc.y = cy + 18;
      sc.scale.set(1.2);
      sc.update(delta, bike.customization);

      const sel = this.selectedRow[idx];
      const rows = [
        `PAINT: ${bike.customization.primaryPaint}`,
        `ENGINE: ${this.getTokenString(bike.customization.engineLevel)}`,
        `ECU: ${this.getTokenString(bike.customization.ecuLevel)}`,
        `SUSP: ${this.getTokenString(bike.customization.suspensionLevel)}`,
        `TYRES: ${this.getTokenString(bike.customization.tyresLevel)}`,
        `BRAKES: ${this.getTokenString(bike.customization.brakesLevel)}`,
        `GEARS: ${Math.round(bike.tuning.gearRatios * 100)}%`,
        `STIFF: ${Math.round(bike.tuning.suspensionStiffness * 100)}%`,
      ];

      rows.forEach((rText, rIdx) => {
        const ry = cy + 62 + rIdx * 9;
        const isSelected = sel === rIdx && !isReady;

        if (isSelected) {
          this.graphics.rect(cx + 2, ry - 1, cardW - 4, 8).fill({ color: hexColor, alpha: 0.3 });
          PixelFont.drawText(this.graphics, '>', cx + 4, ry, 0xf4d160, 1);
        }
        PixelFont.drawText(this.graphics, rText, cx + 12, ry, isSelected ? 0xfffffe : 0x74b9ff, 1);
      });

      this.renderStatRadar(cx + cardW / 2, cy + 172, 20, bike.stats, hexColor);
    });

    for (let i = count; i < 4; i++) {
      this.showcases[i].visible = false;
    }

    const btnX = viewW / 2 - 110;
    const btnY = viewH - 26;
    const btnW = 220;
    const btnH = 22;
    this.startButtonBounds = { x: btnX, y: btnY, w: btnW, h: btnH };

    const pulseGlow = 0.85 + Math.sin(this.ticker.lastTime * 0.01) * 0.15;
    this.graphics.rect(btnX, btnY, btnW, btnH).fill({ color: 0x55efc4, alpha: pulseGlow });
    this.graphics.rect(btnX + 2, btnY + 2, btnW - 4, btnH - 4).fill({ color: 0x0f0e17 });
    PixelFont.drawText(this.graphics, 'START RACE  CLICK OR ENTER', btnX + 8, btnY + 7, 0x55efc4, 1);
  }

  private renderStatRadar(centerX: number, centerY: number, radius: number, stats: BikeStats, color: number): void {
    const angles = [
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2) / 5,
      -Math.PI / 2 + (Math.PI * 4) / 5,
      -Math.PI / 2 + (Math.PI * 6) / 5,
      -Math.PI / 2 + (Math.PI * 8) / 5,
    ];

    const bgPoints: number[] = [];
    angles.forEach((ang) => {
      bgPoints.push(centerX + Math.cos(ang) * radius, centerY + Math.sin(ang) * radius);
    });
    this.graphics.poly(bgPoints).stroke({ color: 0x353b48, width: 1 });

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

    this.graphics.poly(radarPoints).fill({ color, alpha: 0.45 }).stroke({ color, width: 1.5 });
  }

  public destroy(): void {
    this.ticker.stop();
    this.ticker.destroy();
    this.graphics.destroy();
    this.showcases.forEach((sc) => sc.destroy({ children: true }));
    this.container.destroy({ children: true });
  }
}
