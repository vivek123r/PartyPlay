import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import RunAndGunGame from './index';

function stubAudio() {
  const noop = () => undefined;
  return {
    startMusic: noop, stopAllLoops: noop, playTone: noop, playSweep: noop,
    playNoiseBurst: noop, playArpeggio: noop,
  } as any;
}

function stubContext(playerCount: number) {
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: i + 1, color: i === 0 ? '#ff2e63' : '#08d9d6', name: `P${i + 1}`,
  }));
  return {
    renderer: { viewport: { width: 480, height: 270 }, stage: new Container() },
    input: { getPlayer: () => ({ isActive: () => false, isJustPressed: () => false }) },
    audio: stubAudio(),
    events: { emit: () => undefined },
    modifiers: {},
    players,
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
  } as any;
}

describe('Blazing Fury co-op camera and respawn rules', () => {
  it('initialises and simulates frames for 1 and 2 players', async () => {
    for (const count of [1, 2]) {
      const game = new RunAndGunGame();
      await game.init(stubContext(count));
      game.start();
      for (let i = 0; i < 240; i++) game.update(1 / 60);
      expect(game.state).toBe('Playing');
      game.destroy();
    }
  });

  it('keeps both players inside the viewport when one runs ahead', async () => {
    const game = new RunAndGunGame() as any;
    await game.init(stubContext(2));
    game.start();

    // Shove player 1 far down the level; player 2 stays put.
    game.players[0].x = 1200;
    for (let i = 0; i < 60; i++) game.update(1 / 60);

    for (const p of game.players) {
      expect(p.x).toBeGreaterThanOrEqual(game.cameraX);
      expect(p.x + p.width).toBeLessThanOrEqual(game.cameraX + 480);
    }
    game.destroy();
  });

  it('respawns a dead player next to the survivor, not at the level start', async () => {
    const game = new RunAndGunGame() as any;
    await game.init(stubContext(2));
    game.start();

    game.players[0].x = 900;
    game.update(1 / 60);
    game.killPlayer(game.players[1]);
    for (let i = 0; i < 90; i++) game.update(1 / 60);

    expect(game.players[1].isDead).toBe(false);
    expect(Math.abs(game.players[1].x - game.players[0].x)).toBeLessThan(200);
    expect(game.players[1].x).toBeGreaterThan(game.cameraX);
    game.destroy();
  });
});
