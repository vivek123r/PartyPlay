import { describe, expect, it } from 'vitest';
import { boardFit, createBoardLayout, tokenPosition } from './layout';

describe('Rento board layout', () => {
  it('creates a stable clockwise 32-tile perimeter', () => {
    const tiles = createBoardLayout();
    expect(tiles).toHaveLength(32);
    expect(tiles[0].side).toBe('bottom');
    expect(tiles[10].side).toBe('right');
    expect(tiles[16].side).toBe('top');
    expect(tiles[26].side).toBe('left');
    expect(new Set(tiles.map((tile) => `${tile.x}:${tile.y}`)).size).toBe(32);
    expect(tiles.every((tile) => tile.width === 50 && tile.height === 50)).toBe(true);
  });
  it('keeps tokens on their indexed tile and fits a letterboxed view', () => {
    expect(tokenPosition(32)).toEqual(tokenPosition(0));
    expect(boardFit(1920, 1080)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(boardFit(960, 270)).toEqual({ scale: 0.5, x: 240, y: 0 });
  });
});
