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
      const startX = 6 + i * 116;
      const startY = 6;
      const hudW = 110;
      const hudH = 40;

      // 1. Top-Left Ornate Gothic HUD Frame
      this.graphics.roundRect(startX, startY, hudW, hudH, 5).fill({ color: 0x090d16, alpha: 0.85 });
      this.graphics.roundRect(startX, startY, hudW, hudH, 5).stroke({ color: 0x334155, width: 1 });

      // Corner Gothic Filigree Accents
      this.graphics.poly([startX, startY + 5, startX + 5, startY]).fill({ color: 0x00f0ff });
      this.graphics.poly([startX + hudW, startY + 5, startX + hudW - 5, startY]).fill({ color: 0x00f0ff });
      this.graphics.poly([startX, startY + hudH - 5, startX + 5, startY + hudH]).fill({ color: 0x334155 });
      this.graphics.poly([startX + hudW, startY + hudH - 5, startX + hudW - 5, startY + hudH]).fill({ color: 0x334155 });

      // 2. Circular Soul Vessel Orb Gauge (0-100 vertical cyan 0x00f0ff liquid fill with 33-Soul tick mark)
      const soulVal = Math.max(0, Math.min(100, knight.soul ?? 0));
      const maxSoul = knight.maxSoul || 100;
      const orbX = startX + 18;
      const orbY = startY + 20;
      const r = 13;

      // Outer ornate ring & frame
      this.graphics.circle(orbX, orbY, r + 2).fill({ color: 0x0f172a });
      this.graphics.circle(orbX, orbY, r + 2).stroke({ color: 0x334155, width: 1.5 });
      // Inner dark orb vessel
      this.graphics.circle(orbX, orbY, r).fill({ color: 0x020617 });

      // Vertical Cyan (0x00f0ff) Liquid Fill
      const ratio = soulVal / maxSoul;
      if (ratio > 0) {
        const fillH = Math.round(2 * r * ratio);
        const topY = orbY + r - fillH;
        for (let y = Math.ceil(topY); y <= orbY + r; y++) {
          const dy = y - orbY;
          const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
          if (dx > 0) {
            this.graphics.rect(orbX - dx + 1, y - 0.5, (dx - 1) * 2, 1).fill({ color: 0x00f0ff, alpha: 0.95 });
          }
        }
      }

      // 33-Soul Focus Cost Tick Mark
      const tickY = Math.round(orbY + r - (2 * r * 0.33));
      this.graphics.poly([orbX - r + 3, tickY, orbX + r - 3, tickY]).stroke({ color: 0xffffff, width: 1, alpha: 0.8 });

      // Outer glowing rim when focus threshold reached
      const rimColor = ratio >= 0.33 ? 0x00f0ff : 0x1e293b;
      this.graphics.circle(orbX, orbY, r).stroke({ color: rimColor, width: 1, alpha: 0.8 });

      // 3. Player Tag & Cracked Horned Mask HP Containers
      PixelFont.drawText(this.graphics, `P${pId}`, startX + 36, startY + 3, pColor, 1);

      const currentHp = Math.max(0, knight.hp);
      const lifebloodHp = Math.max(0, knight.lifebloodHp || 0);
      const maskStartX = startX + 50;
      const maskY = startY + 4;

      for (let m = 0; m < knight.maxHp; m++) {
        const mx = maskStartX + m * 11;
        if (m < currentHp) {
          // Active Horned Mask (White Bone 0xf8fafc)
          this.graphics.ellipse(mx + 4, maskY + 5, 4, 3.5).fill({ color: 0xf8fafc });
          // Horns
          this.graphics.poly([mx + 1, maskY + 3, mx + 0, maskY - 1, mx + 3, maskY + 2]).fill({ color: 0xf8fafc });
          this.graphics.poly([mx + 7, maskY + 3, mx + 8, maskY - 1, mx + 5, maskY + 2]).fill({ color: 0xf8fafc });
          // Glowing cyan eye slits
          this.graphics.ellipse(mx + 2.5, maskY + 5, 1, 1.5).fill({ color: 0x00f0ff });
          this.graphics.ellipse(mx + 5.5, maskY + 5, 1, 1.5).fill({ color: 0x00f0ff });
        } else {
          // Depleted Cracked Skull Container (Dark Cracked 0x1e293b + 0x0f172a crack lines)
          this.graphics.ellipse(mx + 4, maskY + 5, 4, 3.5).fill({ color: 0x1e293b });
          // Broken horns
          this.graphics.poly([mx + 1, maskY + 3, mx + 1, maskY + 1, mx + 3, maskY + 2]).fill({ color: 0x1e293b });
          this.graphics.poly([mx + 7, maskY + 3, mx + 8, maskY + 0, mx + 5, maskY + 2]).fill({ color: 0x1e293b });
          // Dark crack strokes across depleted skull face
          this.graphics.poly([mx + 2, maskY + 3, mx + 4, maskY + 6, mx + 6, maskY + 8]).stroke({ color: 0x0f172a, width: 1 });
          this.graphics.ellipse(mx + 2.5, maskY + 5, 1, 1.5).fill({ color: 0x0f172a });
          this.graphics.ellipse(mx + 5.5, maskY + 5, 1, 1.5).fill({ color: 0x0f172a });
        }
      }

      // Render Blue Lifeblood Masks if active
      for (let lb = 0; lb < lifebloodHp; lb++) {
        const mx = maskStartX + (knight.maxHp + lb) * 11;
        this.graphics.ellipse(mx + 4, maskY + 5, 4, 3.5).fill({ color: 0x00f0ff });
        this.graphics.poly([mx + 1, maskY + 3, mx + 0, maskY - 1, mx + 3, maskY + 2]).fill({ color: 0x00f0ff });
        this.graphics.poly([mx + 7, maskY + 3, mx + 8, maskY - 1, mx + 5, maskY + 2]).fill({ color: 0x00f0ff });
        this.graphics.ellipse(mx + 2.5, maskY + 5, 1, 1.5).fill({ color: 0x0284c7 });
        this.graphics.ellipse(mx + 5.5, maskY + 5, 1, 1.5).fill({ color: 0x0284c7 });
      }

      // 4. Gold Geo Coin Emblem (0xf1c40f) + Count & Charm Badges
      const geoX = startX + 36;
      const geoY = startY + 22;

      // Ornate Gold Diamond Coin Icon
      this.graphics.poly([geoX, geoY + 4, geoX + 4, geoY, geoX + 8, geoY + 4, geoX + 4, geoY + 8]).fill({ color: 0xf1c40f });
      this.graphics.poly([geoX, geoY + 4, geoX + 4, geoY, geoX + 8, geoY + 4, geoX + 4, geoY + 8]).stroke({ color: 0xd97706, width: 1 });
      this.graphics.rect(geoX + 3, geoY + 3, 2, 2).fill({ color: 0xffffff, alpha: 0.8 });

      // Geo Count Typography
      PixelFont.drawText(this.graphics, `GEO:${knight.geoCount || 0}`, geoX + 12, geoY, 0xf59e0b, 1);

      // Charm Badges
      if (knight.equippedCharms && knight.equippedCharms.length > 0) {
        const charmColors: Record<string, number> = {
          quick_slash: 0xef4444,
          longnail: 0x3b82f6,
          spore_shroom: 0x84cc16,
          lifeblood_heart: 0x00f0ff,
        };
        const charmStartX = startX + hudW - 8 - knight.equippedCharms.length * 6;
        for (let c = 0; c < knight.equippedCharms.length; c++) {
          const ch = knight.equippedCharms[c];
          const color = charmColors[ch] ?? 0xffffff;
          this.graphics.rect(charmStartX + c * 6, startY + hudH - 8, 4, 4).fill({ color });
        }
      }
    }
  }

  public renderBossHUD(boss: BossState): void {
    const barW = 180;
    const viewportW = 480;
    const barX = viewportW / 2 - barW / 2; // Top-center in screen space (x=150)
    const barY = 54;

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

