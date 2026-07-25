import { Container, Graphics } from 'pixi.js';
import type { KnightState, BossState } from '../types';
import { PixelFont } from '../../turbo-rider/render/PixelFont';

export class SideHUDManager {
  public container = new Container();
  private graphics = new Graphics();
  private animTimer = 0;

  constructor() {
    this.container.addChild(this.graphics);
  }

  public update(dt: number): void {
    this.animTimer += dt;
  }

  public render(knights: KnightState[], boss?: BossState | null, isFinished?: boolean, isVictory?: boolean): void {
    this.graphics.clear();
    if (knights && knights.length > 0) {
      this.renderPlayerHUD(knights);
    }
    if (boss && boss.hp > 0) {
      this.renderBossHUD(boss);
    }
    if (isFinished) {
      this.renderGameOverOverlay(!!isVictory);
    }
  }

  private renderGameOverOverlay(isVictory: boolean): void {
    const w = 480;
    const h = 270;

    // Dark semi-transparent backdrop
    this.graphics.rect(0, 0, w, h).fill({ color: 0x070b19, alpha: 0.85 });

    if (isVictory) {
      PixelFont.drawText(this.graphics, 'VICTORY ACHIEVED!', w / 2 - 70, h / 2 - 25, 0x2ecc71, 1);
      PixelFont.drawText(this.graphics, 'MOSS KNIGHT VANQUISHED', w / 2 - 85, h / 2 - 5, 0x00f0ff, 1);
    } else {
      PixelFont.drawText(this.graphics, 'GAME OVER', w / 2 - 35, h / 2 - 25, 0xe74c3c, 1);
      PixelFont.drawText(this.graphics, 'ALL KNIGHTS HAVE FALLEN', w / 2 - 85, h / 2 - 5, 0x94a3b8, 1);
    }

    const pulse = Math.floor(Date.now() * 0.005) % 2 === 0;
    const promptColor = pulse ? 0xffffff : 0x7f8c8d;
    PixelFont.drawText(this.graphics, 'MATCH CONCLUDING...', w / 2 - 60, h / 2 + 20, promptColor, 1);
  }

  private renderPlayerHUD(knights: KnightState[]): void {
    const PLAYER_COLORS = [0x38bdf8, 0xf43f5e, 0x10b981, 0xf59e0b];

    for (let i = 0; i < knights.length; i++) {
      const knight = knights[i];
      const pId = knight.id || i + 1;
      const pColor = PLAYER_COLORS[(pId - 1) % PLAYER_COLORS.length];
      const startX = 8 + i * 115;
      const startY = 8;

      // Player Tag
      PixelFont.drawText(this.graphics, `P${pId}`, startX, startY, pColor, 1);

      // Mask HP Shells
      const currentHp = Math.max(0, knight.hp);
      for (let m = 0; m < knight.maxHp; m++) {
        const mx = startX + 16 + m * 11;
        if (m < currentHp) {
          this.graphics.roundRect(mx, startY, 9, 11, 2).fill({ color: 0xf8fafc });
        } else {
          this.graphics.roundRect(mx, startY, 9, 11, 2).fill({ color: 0x1e293b });
        }
      }

      // Geo Count
      PixelFont.drawText(this.graphics, `GEO:${knight.geoCount || 0}`, startX, startY + 15, 0xf59e0b, 1);

      // Cyan Soul Vessel Meter (0 to 100) (#00e5ff / #00b0ff)
      const soulVal = Math.max(0, Math.min(100, knight.soul ?? 0));
      const maxSoul = knight.maxSoul || 100;
      const vesselX = startX;
      const vesselY = startY + 27;
      const vesselW = 55;
      const vesselH = 6;

      // Soul Vessel Label
      PixelFont.drawText(this.graphics, `SOUL`, vesselX, vesselY - 1, 0x00b0ff, 1);

      // Vessel Frame (Dark background + Cyan Accent outline)
      const barX = vesselX + 22;
      this.graphics.roundRect(barX - 1, vesselY - 1, vesselW + 2, vesselH + 2, 2).stroke({ color: 0x00b0ff, width: 1 });
      this.graphics.roundRect(barX, vesselY, vesselW, vesselH, 1).fill({ color: 0x0f172a });

      // Cyan Soul Fill Bar (#00e5ff)
      const fillW = Math.round((soulVal / maxSoul) * vesselW);
      if (fillW > 0) {
        this.graphics.roundRect(barX, vesselY, fillW, vesselH, 1).fill({ color: 0x00e5ff });
      }
    }
  }

  public renderBossHUD(boss: BossState): void {
    const barW = 180;
    const viewportW = 480;
    const barX = viewportW / 2 - barW / 2; // Top-center in screen space (x=150)
    const barY = 16;

    const bossName = boss.type === 'boss_moss_knight' ? 'MOSS KNIGHT' : 'MOSS KNIGHT';
    const isEnraged = boss.isEnraged || boss.hp <= boss.maxHp * 0.5;

    // Boss Name Label (Centered top-center)
    const nameX = Math.floor(viewportW / 2 - (bossName.length * 4) / 2);
    const nameColor = isEnraged ? 0xe67e22 : 0xf8fafc;
    PixelFont.drawText(this.graphics, bossName, nameX, barY - 10, nameColor, 1);

    // Enraged State Indicator Badge
    if (isEnraged) {
      PixelFont.drawText(this.graphics, 'ENRAGED', barX + barW - 32, barY - 10, 0xe67e22, 1);
    }

    // Outer Frame Background & Border
    this.graphics.roundRect(barX - 2, barY - 2, barW + 4, 10, 2).fill({ color: 0x0f0e17 });
    const borderColor = isEnraged ? 0xe67e22 : 0x334155;
    const borderWidth = isEnraged ? 2 : 1;
    this.graphics.roundRect(barX - 2, barY - 2, barW + 4, 10, 2).stroke({ color: borderColor, width: borderWidth });

    // Boss HP Fill Bar (reflecting current vs max 600 HP)
    const hpRatio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
    const fillW = Math.round(hpRatio * barW);
    const hpColor = isEnraged ? 0xe74c3c : 0x2ecc71;

    if (fillW > 0) {
      this.graphics.roundRect(barX, barY, fillW, 6, 1).fill({ color: hpColor });
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}

