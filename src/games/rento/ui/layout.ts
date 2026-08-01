export const RENT0_VIEWPORT = { width: 960, height: 540 } as const;
/**
 * A deliberately square-cell board: 10 cells along the long sides and 8 along
 * the short sides gives 32 cells once shared corners are counted once.
 */
export const RENT0_BOARD = { x: 230, y: 62, width: 500, height: 400, tile: 50 } as const;

export type Point = { x: number; y: number };
export type BoardSide = 'top' | 'right' | 'bottom' | 'left';

export interface BoardTileLayout {
  index: number;
  side: BoardSide;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  center: Point;
  /** Inner track point. Pawns travel here so they never cover a tile's text. */
  pawn: Point;
}

/** 32 tiles around the inner city. Indices advance clockwise from the lower-left Start tile. */
export function createBoardLayout(): BoardTileLayout[] {
  const { x, y, width, height, tile } = RENT0_BOARD;
  const horizontalSlots = width / tile;
  const verticalSlots = height / tile;
  const tiles: BoardTileLayout[] = [];
  const center = { x: x + width / 2, y: y + height / 2 };
  const push = (side: BoardSide, px: number, py: number, rotation: number) => {
    const tileCenter = { x: px + tile / 2, y: py + tile / 2 };
    const dx = tileCenter.x - center.x;
    const dy = tileCenter.y - center.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    tiles.push({
      index: tiles.length,
      side,
      x: px,
      y: py,
      width: tile,
      height: tile,
      rotation,
      center: tileCenter,
      pawn: { x: tileCenter.x - dx / length * 14, y: tileCenter.y - dy / length * 14 },
    });
  };

  // Start is the lower-left corner and movement proceeds clockwise.
  for (let i = 0; i < horizontalSlots; i++) push('bottom', x + i * tile, y + height - tile, 0);
  for (let i = 1; i < verticalSlots - 1; i++) push('right', x + width - tile, y + height - tile - i * tile, -Math.PI / 2);
  for (let i = 0; i < horizontalSlots; i++) push('top', x + width - tile - i * tile, y, Math.PI);
  for (let i = 1; i < verticalSlots - 1; i++) push('left', x, y + i * tile, Math.PI / 2);
  return tiles;
}

export function tokenPosition(tileIndex: number, playerSlot = 0, totalPlayers = 1): Point {
  const tile = createBoardLayout()[((tileIndex % 32) + 32) % 32];
  const spread = totalPlayers <= 1 ? 0 : 7;
  const angle = (Math.PI * 2 * playerSlot) / Math.max(1, totalPlayers);
  return { x: tile.pawn.x + Math.cos(angle) * spread, y: tile.pawn.y + Math.sin(angle) * spread };
}

export function boardFit(viewportWidth: number, viewportHeight: number): { scale: number; x: number; y: number } {
  const scale = Math.min(viewportWidth / RENT0_VIEWPORT.width, viewportHeight / RENT0_VIEWPORT.height);
  return { scale, x: (viewportWidth - RENT0_VIEWPORT.width * scale) / 2, y: (viewportHeight - RENT0_VIEWPORT.height * scale) / 2 };
}
