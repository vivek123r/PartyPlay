import { Container, Graphics } from 'pixi.js';
import type { FarmState, HotbarSlot, ToolType, ToolTier } from '../types';
import { TOOL_TIER_CONFIG } from '../config';
import { PixelFont } from '../../turbo-rider/render/PixelFont';

export class FarmHUDManager {
  public container = new Container();
  private g = new Graphics();
  private farmState: FarmState;

  private notifications: { text: string; color: number; life: number; yOffset: number }[] = [];

  public defaultHotbar: HotbarSlot[] = [
    { id: '1', type: 'tool', targetId: 'hoe', label: 'HOE' },
    { id: '2', type: 'tool', targetId: 'watering_can', label: 'CAN' },
    { id: '3', type: 'seed', targetId: 'wheat', label: 'WHEAT' },
    { id: '4', type: 'seed', targetId: 'pumpkin', label: 'PUMPKIN' },
    { id: '5', type: 'seed', targetId: 'crystal_berry', label: 'BERRY' },
    { id: '6', type: 'seed', targetId: 'dragonfruit', label: 'DRAGON' },
  ];

  constructor(farmState: FarmState) {
    this.farmState = farmState;
    this.container.addChild(this.g);
  }

  public upgradeTool(tool: ToolType | string): void {
    const currentTier = this.farmState.toolTiers?.[tool as keyof typeof this.farmState.toolTiers] || 'basic';
    const nextTier: Record<string, ToolTier> = {
      basic: 'copper',
      copper: 'gold',
      gold: 'titanium',
      titanium: 'titanium',
    };
    const target = nextTier[currentTier];
    if (target && target !== currentTier && this.farmState.toolTiers) {
      const cost = TOOL_TIER_CONFIG[target as ToolTier].upgradeCostCoins || 0;
      if (this.farmState.coins >= cost) {
        this.farmState.coins -= cost;
        this.farmState.toolTiers[tool as keyof typeof this.farmState.toolTiers] = target;
      }
    }
  }

  public getHotbarSlots(): HotbarSlot[] {
    return this.defaultHotbar;
  }

  public showToast(msg: string): void {
    this.addNotification(msg);
  }

  public getActiveToasts(): Array<{ text: string }> {
    return this.notifications;
  }

  public fulfillOrder(orderId: string): boolean {
    if (!this.farmState.activeOrders) return false;
    const order = this.farmState.activeOrders.find((o: any) => o.id === orderId);
    if (order) {
      order.completed = true;
      this.farmState.coins += order.rewardCoins || 0;
      this.farmState.farmExp += order.rewardExp || 0;
      return true;
    }
    return false;
  }

  public addNotification(text: string, color: number = 0x00f0ff): void {
    this.notifications.push({
      text,
      color,
      life: 2.5,
      yOffset: 0,
    });
  }

  public update(dt: number): void {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const n = this.notifications[i];
      n.life -= dt;
      n.yOffset += 15 * dt;
      if (n.life <= 0) {
        this.notifications.splice(i, 1);
      }
    }
  }

  public render(): void {
    this.g.clear();
    const viewportW = 480;
    const viewportH = 270;

    // ==========================================
    // 1. TOP STATUS BAR (Season, Weather, Day, Coins, Energy, Level)
    // ==========================================
    this.g.rect(0, 0, viewportW, 26).fill({ color: 0x0f172a, alpha: 0.9 });
    this.g.rect(0, 25, viewportW, 1).fill({ color: 0x334155 });

    // Season & Day
    const seasonText = `${(this.farmState.currentSeason || 'spring').toUpperCase()} DAY ${this.farmState.currentDay || 1}`;
    PixelFont.drawText(this.g, seasonText, 8, 8, 0x00f0ff, 1);

    // Weather Icon
    const weatherText = `WEATHER: ${(this.farmState.currentWeather || 'sunny').toUpperCase()}`;
    PixelFont.drawText(this.g, weatherText, 120, 8, 0xfacc15, 1);

    // Coins Counter
    const coinText = `COINS: ${this.farmState.coins || 0}`;
    PixelFont.drawText(this.g, coinText, 250, 8, 0xf59e0b, 1);

    // Level & EXP
    const lvlText = `LVL ${this.farmState.farmLevel || 1}`;
    PixelFont.drawText(this.g, lvlText, 350, 8, 0x22c55e, 1);

    // Energy Meter Bar (Top Right)
    const energyMax = this.farmState.maxEnergy || 100;
    const energyCur = Math.max(0, this.farmState.energy || 100);
    const barW = 55;
    const barH = 8;
    const barX = 415;
    const barY = 9;

    this.g.rect(barX, barY, barW, barH).fill({ color: 0x1e293b });
    this.g.rect(barX, barY, (energyCur / energyMax) * barW, barH).fill({ color: 0xef4444 });
    this.g.rect(barX, barY, barW, barH).stroke({ color: 0xf8fafc, width: 1 });

    // ==========================================
    // 2. BOTTOM TOOL HOTBAR (1-6 SLOTS)
    // ==========================================
    const slotW = 38;
    const slotH = 28;
    const numSlots = 6;
    const hotbarW = numSlots * slotW + (numSlots - 1) * 4;
    const startX = viewportW / 2 - hotbarW / 2;
    const startY = viewportH - 32;

    // Hotbar Backdrop
    this.g.rect(startX - 6, startY - 4, hotbarW + 12, slotH + 8).fill({ color: 0x0f172a, alpha: 0.85 });
    this.g.rect(startX - 6, startY - 4, hotbarW + 12, slotH + 8).stroke({ color: 0x334155, width: 1 });

    for (let i = 0; i < numSlots; i++) {
      const slotX = startX + i * (slotW + 4);
      const isSelected = (this.farmState.selectedHotbarIndex || 0) === i;
      const slot = this.defaultHotbar[i];

      const slotBg = isSelected ? 0x1e293b : 0x0f172a;
      const slotBorder = isSelected ? 0x00f0ff : 0x475569;

      this.g.rect(slotX, startY, slotW, slotH).fill({ color: slotBg });
      this.g.rect(slotX, startY, slotW, slotH).stroke({ color: slotBorder, width: isSelected ? 2 : 1 });

      // Hotkey Badge Number (1-6)
      PixelFont.drawText(this.g, `${i + 1}`, slotX + 3, startY + 3, isSelected ? 0x00f0ff : 0x94a3b8, 1);

      // Slot Label
      PixelFont.drawText(this.g, slot.label, slotX + 4, startY + 14, isSelected ? 0xffffff : 0xc084fc, 1);
    }

    // ==========================================
    // 3. TOAST NOTIFICATIONS
    // ==========================================
    let notifY = 35;
    for (const n of this.notifications) {
      const alpha = Math.max(0, Math.min(1, n.life / 0.5));
      this.g.rect(8, notifY, 180, 16).fill({ color: 0x0f172a, alpha: 0.8 * alpha });
      PixelFont.drawText(this.g, n.text, 12, notifY + 3, n.color, 1);
      notifY += 18;
    }
  }

  public destroy(): void {
    this.g.destroy();
    this.container.destroy();
  }
}
