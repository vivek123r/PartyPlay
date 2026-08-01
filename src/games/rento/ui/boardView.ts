import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { RENT0_ASSETS } from './assetManifest';
import { createBoardLayout, tokenPosition, type BoardTileLayout } from './layout';
import { RENT0_TEXT, RENT0_THEME } from './theme';
import type { PropertyView } from './components';

export interface BoardTileView {
  id: string;
  label: string;
  kind: 'property' | 'start' | 'bank' | 'market' | 'event' | 'tax' | 'auction' | 'fortune' | 'wheel' | 'teleport';
  propertyId?: string;
  districtIndex?: number;
  ownerColor?: number;
}

export interface TokenView {
  playerId: number;
  tileIndex: number;
  slot: number;
  total: number;
  color?: number;
  label?: string;
  x?: number;
  y?: number;
  facing?: -1 | 1;
  moving?: boolean;
}

const AVATAR_FRAMES = [
  new Rectangle(175, 12, 345, 575),
  new Rectangle(735, 12, 345, 575),
  new Rectangle(115, 620, 430, 620),
  new Rectangle(710, 620, 430, 620),
];

const SPECIAL_SYMBOL: Record<Exclude<BoardTileView['kind'], 'property'>, string> = {
  start: '▶', bank: '¤', market: '⌂', event: '✦', tax: '◆', auction: '♜', fortune: '◎', wheel: '✺', teleport: '↟',
};

const destroyChildren = (container: Container): void => {
  container.removeChildren().forEach((child) => child.destroy({ children: true }));
};

const compactLabel = (label: string): string => {
  const words = label.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 10);
  if (words.length === 2) return `${words[0].slice(0, 10)}\n${words[1].slice(0, 10)}`;
  return `${words.slice(0, 2).join(' ').slice(0, 10)}\n${words.slice(2).join(' ').slice(0, 10)}`;
};

/** A fixed, readable tabletop board. Tiles stay clear while pawns run on the inner rail. */
export class RentoBoardView extends Container {
  private readonly board = new Graphics();
  private readonly buildings = new Container();
  private readonly tiles = new Container();
  private readonly tokenLayer = new Container();
  private readonly tileLayouts: BoardTileLayout[] = createBoardLayout();
  private avatarTextures: Texture[] = [];

  public constructor() {
    super();
    this.tokenLayer.sortableChildren = true;
    this.addChild(this.board, this.buildings, this.tiles, this.tokenLayer);
  }

  public async loadPremiumArt(): Promise<void> {
    try {
      const sheet = await Assets.load<Texture>(RENT0_ASSETS.tycoonAvatars);
      this.avatarTextures = AVATAR_FRAMES.map((frame) => new Texture({ source: sheet.source, frame }));
    } catch {
      // The procedural pawn remains an intentionally legible offline fallback.
      this.avatarTextures = [];
    }
  }

  public render(tiles: BoardTileView[], properties: PropertyView[], tokens: TokenView[]): void {
    this.board.clear();
    destroyChildren(this.tiles);
    destroyChildren(this.buildings);
    this.drawBoardTable();
    const byId = new Map(properties.map((property) => [property.id, property]));
    this.tileLayouts.forEach((layout, index) => this.drawTile(layout, tiles[index], byId, index));
    this.renderTokens(tokens);
  }

  public getTileCenter(index: number): { x: number; y: number } {
    return this.tileLayouts[((index % 32) + 32) % 32].center;
  }

  public getPawnPoint(index: number): { x: number; y: number } {
    return this.tileLayouts[((index % 32) + 32) % 32].pawn;
  }

  public renderTokens(tokens: TokenView[]): void {
    destroyChildren(this.tokenLayer);
    tokens.forEach((token) => this.drawToken(token));
  }

  private drawBoardTable(): void {
    const x = 230; const y = 62; const width = 500; const height = 400; const tile = 50;
    const innerX = x + tile; const innerY = y + tile; const innerW = width - tile * 2; const innerH = height - tile * 2;
    this.board
      .roundRect(x + 7, y + 10, width, height, 17).fill({ color: 0x000408, alpha: 0.76 })
      .roundRect(x, y, width, height, 17).fill({ color: 0x122231 })
      .roundRect(x + 2, y + 2, width - 4, height - 4, 15).stroke({ color: RENT0_THEME.goldDark, width: 2.4 })
      .roundRect(x + 7, y + 7, width - 14, height - 14, 11).stroke({ color: 0xe8c77a, width: 0.8, alpha: 0.5 })
      .roundRect(innerX, innerY, innerW, innerH, 6).fill({ color: 0x0a1a27 })
      .roundRect(innerX + 2, innerY + 2, innerW - 4, innerH - 4, 5).stroke({ color: 0x3e6175, width: 1, alpha: 0.72 });

    // A clean city plan stays decorative: the dice vault owns the centre.
    this.board
      .rect(innerX + 8, innerY + innerH / 2 - 19, innerW - 16, 38).fill({ color: 0x1d2f38, alpha: 0.8 })
      .rect(innerX + innerW / 2 - 20, innerY + 8, 40, innerH - 16).fill({ color: 0x1d2f38, alpha: 0.8 });
    for (let line = 0; line < 7; line++) {
      this.board.rect(innerX + 15 + line * 53, innerY + innerH / 2 - 1, 24, 2).fill({ color: RENT0_THEME.gold, alpha: 0.23 });
    }
    for (let line = 0; line < 5; line++) {
      this.board.rect(innerX + innerW / 2 - 1, innerY + 16 + line * 49, 2, 22).fill({ color: RENT0_THEME.gold, alpha: 0.18 });
    }
    this.drawCityQuarter(innerX + 12, innerY + 12, 90, 75, 0x3d718a, 0);
    this.drawCityQuarter(innerX + innerW - 102, innerY + 12, 90, 75, 0x9a6d30, 1);
    this.drawCityQuarter(innerX + 12, innerY + innerH - 87, 90, 75, 0x3b806d, 2);
    this.drawCityQuarter(innerX + innerW - 102, innerY + innerH - 87, 90, 75, 0x744866, 3);
  }

  private drawCityQuarter(x: number, y: number, width: number, height: number, color: number, accent: number): void {
    const g = new Graphics()
      .roundRect(x, y, width, height, 7).fill({ color: 0x0d2635 }).stroke({ color, width: 1.2, alpha: 0.72 })
      .rect(x + 6, y + 6, width - 12, height - 12).fill({ color: 0x173746, alpha: 0.7 });
    const blocks = [[10, 12, 23, 30], [39, 9, 38, 22], [12, 47, 31, 19], [50, 39, 27, 27]] as const;
    blocks.forEach(([ox, oy, w, h], index) => {
      const roof = index === accent ? RENT0_THEME.goldDark : color;
      g.roundRect(x + ox + 2, y + oy + 3, w, h, 2).fill({ color: 0x01050a, alpha: 0.62 })
        .roundRect(x + ox, y + oy, w, h, 2).fill({ color: roof, alpha: 0.86 })
        .rect(x + ox + 4, y + oy + 5, Math.max(5, w - 8), 3).fill({ color: RENT0_THEME.cyan, alpha: 0.48 });
      for (let wx = x + ox + 5; wx < x + ox + w - 3; wx += 8) {
        g.rect(wx, y + oy + h - 6, 2, 2).fill({ color: RENT0_THEME.gold, alpha: 0.7 });
      }
    });
    this.buildings.addChild(g);
  }

  private drawTile(
    layout: BoardTileLayout,
    tile: BoardTileView | undefined,
    properties: Map<string, PropertyView>,
    index: number,
  ): void {
    const data = tile ?? { id: `tile-${layout.index}`, label: 'CITY', kind: 'event' as const };
    const property = data.propertyId ? properties.get(data.propertyId) : undefined;
    // Unowned property cells stay neutral: player colour is earned by purchase.
    const neutralProperty = 0x627483;
    const specialAccent = data.kind === 'event' || data.kind === 'fortune' || data.kind === 'wheel'
      ? RENT0_THEME.gold
      : data.kind === 'tax' || data.kind === 'teleport'
        ? RENT0_THEME.cyan
        : RENT0_THEME.goldDark;
    const accent = property ? (data.ownerColor ?? neutralProperty) : specialAccent;
    const g = new Graphics()
      .roundRect(layout.x + 3, layout.y + 5, 48, 48, 5).fill({ color: 0x000407, alpha: 0.75 })
      .roundRect(layout.x + 1, layout.y + 1, 48, 48, 5).fill({ color: 0x0d1b27 })
      .roundRect(layout.x + 1, layout.y + 1, 48, 48, 5).stroke({ color: accent, width: data.ownerColor ? 2.2 : 1.2, alpha: 0.95 })
      .roundRect(layout.x + 5, layout.y + 5, 40, 40, 3).fill({ color: property ? 0x162b38 : 0x102330, alpha: 0.98 });

    this.tiles.addChild(g);
    if (property) this.drawPropertyTile(g, layout, property, accent, index);
    else this.drawSpecialTile(g, layout, data.kind as Exclude<BoardTileView['kind'], 'property'>, accent, data.label);

    if (data.ownerColor !== undefined) {
      g.poly([layout.x + 38, layout.y + 5, layout.x + 45, layout.y + 5, layout.x + 45, layout.y + 14])
        .fill({ color: data.ownerColor });
    }
  }

  private drawPropertyTile(g: Graphics, layout: BoardTileLayout, property: PropertyView, accent: number, variant: number): void {
    const x = layout.x; const y = layout.y;
    g.roundRect(x + 5, y + 5, 40, 6, 2).fill({ color: accent, alpha: property.ownerId == null ? 0.55 : 1 });
    this.drawBuildingIcon(g, x + 17, y + 14, accent, variant, property.level ?? 1);
    const name = new Text({
      text: compactLabel(property.name),
      style: { ...RENT0_TEXT.tiny, fontFamily: 'Arial Black, sans-serif', fontSize: 4.9, lineHeight: 5.2, fill: RENT0_THEME.ink, align: 'center' },
    });
    name.anchor.set(0.5, 0);
    name.position.set(x + 34, y + 29);
    const value = new Text({ text: `$${Math.round(property.price / 10) * 10}`, style: { ...RENT0_TEXT.tiny, fontSize: 4.6, fill: RENT0_THEME.gold } });
    value.anchor.set(0.5, 0); value.position.set(x + 25, y + 42);
    this.tiles.addChild(name, value);
    const level = Math.min(5, property.level ?? 1);
    for (let i = 0; i < level; i++) g.circle(x + 39 - i * 4, y + 43, 1.25).fill({ color: RENT0_THEME.gold });
    if (property.mortgaged) {
      g.roundRect(x + 8, y + 23, 34, 8, 2).fill({ color: RENT0_THEME.danger, alpha: 0.9 });
      const locked = new Text({ text: 'MORTGAGE', style: { ...RENT0_TEXT.tiny, fontSize: 4.1, fill: RENT0_THEME.ink } });
      locked.anchor.set(0.5); locked.position.set(x + 25, y + 27); this.tiles.addChild(locked);
    }
  }

  private drawBuildingIcon(g: Graphics, x: number, y: number, color: number, variant: number, level: number): void {
    const w = 16 + (variant % 3) * 2;
    const h = 10 + level * 2;
    g.roundRect(x + 2, y + 3, w, h, 2).fill({ color: 0x010509, alpha: 0.62 })
      .roundRect(x, y, w, h, 2).fill({ color, alpha: 0.92 })
      .poly([x - 2, y, x + w / 2, y - 5, x + w + 2, y]).fill({ color: RENT0_THEME.goldDark });
    for (let row = y + 4; row < y + h - 2; row += 5) {
      g.rect(x + 3, row, 3, 2).fill({ color: RENT0_THEME.gold, alpha: 0.85 });
      g.rect(x + w - 6, row, 3, 2).fill({ color: RENT0_THEME.cyan, alpha: 0.78 });
    }
  }

  private drawSpecialTile(g: Graphics, layout: BoardTileLayout, kind: Exclude<BoardTileView['kind'], 'property'>, accent: number, label: string): void {
    const cx = layout.center.x; const cy = layout.center.y;
    g.circle(cx, cy - 5, 12).fill({ color: 0x07131e }).stroke({ color: accent, width: 1.2, alpha: 0.95 });
    const symbol = new Text({ text: SPECIAL_SYMBOL[kind], style: { ...RENT0_TEXT.heading, fontSize: 14, fill: accent } });
    symbol.anchor.set(0.5); symbol.position.set(cx, cy - 5);
    const name = new Text({ text: compactLabel(label), style: { ...RENT0_TEXT.tiny, fontFamily: 'Arial Black, sans-serif', fontSize: 4.9, lineHeight: 5.2, fill: RENT0_THEME.ink, align: 'center' } });
    name.anchor.set(0.5, 0); name.position.set(cx, layout.y + 35);
    this.tiles.addChild(symbol, name);
  }

  private drawToken(token: TokenView): void {
    const position = token.x == null || token.y == null
      ? tokenPosition(token.tileIndex, token.slot, token.total)
      : { x: token.x, y: token.y };
    const color = token.color ?? RENT0_THEME.players[token.playerId % RENT0_THEME.players.length];
    const facing = token.facing ?? 1;
    const bob = token.moving ? Math.sin(token.playerId * 3 + position.x * 0.2) * 2.5 : 0;
    const pawn = new Container({ x: position.x, y: position.y + bob });
    pawn.zIndex = Math.round(position.y + 60);
    const shadow = new Graphics().ellipse(0, 2, 15, 4).fill({ color: 0x000000, alpha: 0.55 });
    const ring = new Graphics().ellipse(0, 0, 12, 4).fill({ color, alpha: 0.82 }).stroke({ color: RENT0_THEME.gold, width: 1, alpha: 0.85 });
    pawn.addChild(shadow, ring);

    const avatar = this.avatarTextures[(token.playerId - 1) % this.avatarTextures.length];
    if (avatar) {
      const sprite = new Sprite({ texture: avatar, anchor: { x: 0.5, y: 0.95 } });
      sprite.width = 34; sprite.height = 52;
      sprite.scale.x = Math.abs(sprite.scale.x) * facing;
      pawn.addChild(sprite);
    } else {
      const fallback = new Graphics()
        .roundRect(-10, -31, 20, 29, 7).fill({ color })
        .circle(0, -38, 10).fill({ color: 0xf1b98b })
        .rect(-7, -11, 5, 12).fill({ color: 0x172330 })
        .rect(2, -11, 5, 12).fill({ color: 0x172330 });
      pawn.addChild(fallback);
    }
    const badge = new Graphics().circle(-14, -43, 7).fill({ color: RENT0_THEME.night }).circle(-14, -43, 6).stroke({ color, width: 1.8 });
    const id = new Text({ text: String(token.playerId), style: { ...RENT0_TEXT.tiny, fontSize: 6.5, fill: RENT0_THEME.ink } });
    id.anchor.set(0.5); id.position.set(-14, -43);
    const plate = new Graphics().roundRect(-17, 6, 34, 10, 4).fill({ color: RENT0_THEME.night, alpha: 0.9 }).stroke({ color, width: 1, alpha: 0.7 });
    const label = new Text({ text: (token.label ?? `P${token.playerId}`).slice(0, 8).toUpperCase(), style: { ...RENT0_TEXT.tiny, fontSize: 4.8, fill: RENT0_THEME.ink } });
    label.anchor.set(0.5); label.position.set(0, 8);
    pawn.addChild(badge, id, plate, label);
    this.tokenLayer.addChild(pawn);
  }
}
