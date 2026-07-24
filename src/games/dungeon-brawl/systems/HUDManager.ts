import { Graphics } from 'pixi.js';
import type { Hero } from '../entities/Hero';
import { PixelFont } from '../../turbo-rider/render/PixelFont';
import { ARENA_CONFIG } from '../config';

export class HUDManager {
  public renderHUD(g: Graphics, heroes: Hero[], waveNum: number, enemiesLeft: number): void {
    const w = ARENA_CONFIG.width;
    const h = ARENA_CONFIG.height;

    // 1. Top Wave & Enemy Banner
    g.rect(w / 2 - 75, 4, 150, 16).fill({ color: 0x0f0e17, alpha: 0.85 });
    PixelFont.drawText(g, `WAVE ${waveNum} - ENEMIES: ${enemiesLeft}`, w / 2 - 68, 8, 0xf1c40f, 1);

    // 2. 4-Player Status Cards
    const count = heroes.length;
    const colW = Math.floor(w / count);

    for (let i = 0; i < count; i++) {
      const hero = heroes[i];
      const startX = i * colW + 4;
      const bottomY = h - 22;

      g.rect(startX, bottomY, colW - 8, 18).fill({ color: 0x0f0e17, alpha: 0.85 });

      // Player Tag & Hero Name
      PixelFont.drawText(g, `P${hero.id}:${hero.config.name.substring(0, 4)}`, startX + 2, bottomY + 2, hero.config.primaryColor, 1);

      // HP Bar
      const hpPct = Math.max(0, hero.hp / hero.maxHp);
      g.rect(startX + 38, bottomY + 3, 40, 5).fill({ color: 0x2c3e50 });
      g.rect(startX + 38, bottomY + 3, hpPct * 40, 5).fill({ color: 0xe74c3c });

      // Mana Bar
      const manaPct = Math.max(0, hero.mana / hero.maxMana);
      g.rect(startX + 38, bottomY + 10, 40, 4).fill({ color: 0x2c3e50 });
      g.rect(startX + 38, bottomY + 10, manaPct * 40, 4).fill({ color: 0x3498db });

      // Skill CD Indicator
      if (hero.specialCooldownTimer > 0) {
        PixelFont.drawText(g, `${Math.ceil(hero.specialCooldownTimer)}S`, startX + 82, bottomY + 5, 0x7f8c8d, 1);
      } else {
        PixelFont.drawText(g, 'SKILL', startX + 82, bottomY + 5, 0x2ecc71, 1);
      }
    }
  }
}
