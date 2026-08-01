import { Container, Graphics, Text } from 'pixi.js';
import { RENT0_TEXT, RENT0_THEME } from './theme';

export interface PanelOptions { x: number; y: number; width: number; height: number; accent?: number; alpha?: number; }
export interface PlayerView { id: number; name: string; cash: number; netWorth: number; color?: number; credit?: number; isActive?: boolean; }
export interface PropertyView { id: string; name: string; price: number; districtIndex: number; ownerId?: number | null; level?: number; specialty?: string; mortgaged?: boolean; }

export function createPanel(options: PanelOptions): Container {
  const { x, y, width, height, accent = RENT0_THEME.line, alpha = 0.94 } = options;
  const root = new Container({ x, y });
  const g = new Graphics()
    .roundRect(0, 0, width, height, 8).fill({ color: RENT0_THEME.panelDark, alpha })
    .roundRect(1, 1, width - 2, height - 2, 7).stroke({ color: accent, width: 1.5, alpha: 0.92 });
  root.addChild(g);
  return root;
}

export function createLabel(text: string, x: number, y: number, kind: keyof typeof RENT0_TEXT = 'body'): Text {
  return new Text({ text, style: RENT0_TEXT[kind], x, y });
}

export function createActionButton(label: string, width = 134, accent: number = RENT0_THEME.gold): Container {
  const root = new Container();
  const g = new Graphics()
    .roundRect(0, 2, width, 31, 7).fill({ color: 0x02080e, alpha: 0.7 })
    .roundRect(0, 0, width, 29, 7).fill({ color: accent, alpha: 0.96 })
    .roundRect(2, 2, width - 4, 25, 5).stroke({ color: RENT0_THEME.ink, width: 1, alpha: 0.85 });
  const title = createLabel(label.toUpperCase(), 0, 8, 'heading');
  title.style.fill = RENT0_THEME.night;
  title.anchor.set(0.5, 0);
  title.x = width / 2;
  root.addChild(g, title);
  return root;
}

export function createPlayerBadge(player: PlayerView, width = 146): Container {
  const color = player.color ?? RENT0_THEME.players[player.id % RENT0_THEME.players.length];
  const root = createPanel({ x: 0, y: 0, width, height: 52, accent: color });
  const portrait = new Graphics().circle(22, 26, 15).fill({ color }).circle(22, 24, 11).fill({ color: 0x173149 });
  const initial = createLabel(player.name.slice(0, 1).toUpperCase(), 22, 16, 'heading'); initial.anchor.set(0.5, 0);
  const name = createLabel(player.name, 44, 7, 'heading');
  const cash = createLabel(`$${Math.round(player.cash).toLocaleString()}`, 44, 22, 'body'); cash.style.fill = RENT0_THEME.emerald;
  const worth = createLabel(`NW $${Math.round(player.netWorth).toLocaleString()}  •  CR ${player.credit ?? '—'}`, 44, 38, 'tiny'); worth.style.fill = RENT0_THEME.muted;
  const active = new Graphics().circle(width - 11, 11, 4).fill({ color: player.isActive ? RENT0_THEME.gold : RENT0_THEME.line });
  root.addChild(portrait, initial, name, cash, worth, active);
  return root;
}

export function createPropertyCard(property: PropertyView, ownerColor?: number): Container {
  const accent = ownerColor ?? RENT0_THEME.districts[property.districtIndex % RENT0_THEME.districts.length];
  const root = createPanel({ x: 0, y: 0, width: 155, height: 92, accent });
  root.addChild(createLabel(property.name.toUpperCase(), 10, 10, 'heading'));
  const district = createLabel(['WATERFRONT', 'TECH', 'DOWNTOWN', 'ARTS', 'INDUSTRY', 'LUXURY'][property.districtIndex % 6], 10, 27, 'tiny'); district.style.fill = accent;
  const price = createLabel(`VALUE  $${Math.round(property.price).toLocaleString()}`, 10, 47, 'body'); price.style.fill = RENT0_THEME.gold;
  const status = property.mortgaged ? 'MORTGAGED' : property.ownerId == null ? 'AVAILABLE' : `PRESTIGE ${property.level ?? 1}`;
  const statusLabel = createLabel(status, 10, 66, 'tiny'); statusLabel.style.fill = property.mortgaged ? RENT0_THEME.danger : RENT0_THEME.muted;
  root.addChild(district, price, statusLabel);
  return root;
}
