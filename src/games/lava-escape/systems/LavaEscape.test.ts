import { describe, expect, it } from 'vitest';
import { Container } from 'pixi.js';
import { createPRNG } from '@shared/utils/random';
import type { GameContext } from '@runtime/types';
import LavaEscapeGame from '../index';
import { generateLevel, validateLevel } from './LevelGenerator';
import { compareMatchRecords, pointsForPosition, rankMatchRecords } from './Scoring';
import type { MatchRecord } from '../types';

function record(overrides: Partial<MatchRecord>): MatchRecord {
  return {
    playerId: 1,
    score: 0,
    firstPlaces: 0,
    levelsSurvived: 0,
    cumulativeTime: 0,
    finishPosition: null,
    lastProgress: 0,
    ...overrides,
  };
}

describe('Lava Escape scoring', () => {
  it('awards the configured finish points', () => {
    expect([1, 2, 3, 4, 5].map(pointsForPosition)).toEqual([10, 9, 8, 7, 0]);
  });

  it('applies every tie breaker in the documented order', () => {
    const records = [
      record({ playerId: 1, score: 20, firstPlaces: 1, levelsSurvived: 3, cumulativeTime: 80 }),
      record({ playerId: 2, score: 21 }),
      record({ playerId: 3, score: 20, firstPlaces: 2 }),
      record({ playerId: 4, score: 20, firstPlaces: 1, levelsSurvived: 4 }),
    ];
    expect(rankMatchRecords(records).map((item) => item.playerId)).toEqual([2, 3, 4, 1]);
  });

  it('uses progress and player slot only as deterministic final fallbacks', () => {
    const ahead = record({ playerId: 3, lastProgress: 900 });
    const behind = record({ playerId: 1, lastProgress: 700 });
    expect(compareMatchRecords(ahead, behind)).toBeLessThan(0);
    expect(compareMatchRecords(record({ playerId: 2 }), record({ playerId: 4 }))).toBeLessThan(0);
  });
});

describe('Lava Escape seeded levels', () => {
  it('reproduces the same campaign for the same seed', () => {
    const firstRandom = createPRNG(481516);
    const secondRandom = createPRNG(481516);
    const first = Array.from({ length: 5 }, (_, stage) => generateLevel(stage, firstRandom));
    const second = Array.from({ length: 5 }, (_, stage) => generateLevel(stage, secondRandom));

    expect(first.map((level) => level.chunkIds)).toEqual(second.map((level) => level.chunkIds));
  });

  it('generates valid five-stage campaigns over a broad seed sample', () => {
    for (let seed = 0; seed < 250; seed++) {
      const random = createPRNG(seed);
      for (let stage = 0; stage < 5; stage++) {
        const level = generateLevel(stage, random);
        expect(validateLevel(level)).toBe(true);
        expect(level.safeX).toBeLessThan(level.width);
        expect(level.platforms.some((platform) => platform.id === 'start-floor')).toBe(true);
        expect(level.platforms.some((platform) => platform.id === 'finish-floor')).toBe(true);

        const entityIds = [
          ...level.platforms.map((item) => item.id),
          ...level.hazards.map((item) => item.id),
          ...level.springs.map((item) => item.id),
          ...level.switches.map((item) => item.id),
          ...level.enemies.map((item) => item.id),
        ];
        expect(new Set(entityIds).size).toBe(entityIds.length);
      }
    }
  });

  it('avoids immediately repeating a challenge chunk', () => {
    for (let seed = 0; seed < 100; seed++) {
      const random = createPRNG(seed);
      for (let stage = 0; stage < 5; stage++) {
        const chunks = generateLevel(stage, random).chunkIds;
        for (let index = 1; index < chunks.length; index++) {
          expect(chunks[index]).not.toBe(chunks[index - 1]);
        }
      }
    }
  });
});

describe('Lava Escape runtime smoke test', () => {
  it('retries the current level after a complete wipeout', async () => {
    const emitted: Array<{ event: string; data: unknown }> = [];
    const context = {
      renderer: {
        stage: new Container(),
        viewport: { width: 480, height: 270 },
      },
      input: {
        getPlayer: (playerId: number) => ({
          playerId,
          isActive: () => false,
          isJustPressed: () => false,
          isJustReleased: () => false,
        }),
      },
      audio: { playTone: () => undefined },
      events: {
        emit: (event: string, data: unknown) => emitted.push({ event, data }),
      },
      random: createPRNG(2026),
      modifiers: { speedMultiplier: 1 },
      players: [
        { id: 1, name: 'Red', color: '#ff2e63' },
        { id: 2, name: 'Blue', color: '#08d9d6' },
      ],
      logger: { info: () => undefined },
    } as unknown as GameContext;

    const game = new LavaEscapeGame();
    await game.init(context);
    game.start();
    for (let frame = 0; frame < 1_400 && game.state === 'Playing'; frame++) {
      game.update(1 / 60);
    }

    expect(emitted.find((item) => item.event === 'game:over')).toBeUndefined();
    expect(game.state).toBe('Playing');
    game.destroy();
    expect(game.state).toBe('Destroyed');
  });

  it('advances after one player is safe and the other is eliminated', async () => {
    const context = {
      renderer: {
        stage: new Container(),
        viewport: { width: 480, height: 270 },
      },
      input: {
        getPlayer: (playerId: number) => ({
          playerId,
          isActive: () => false,
          isJustPressed: () => false,
          isJustReleased: () => false,
        }),
      },
      audio: { playTone: () => undefined },
      events: { emit: () => undefined },
      random: createPRNG(2027),
      modifiers: { speedMultiplier: 1 },
      players: [
        { id: 1, name: 'Red', color: '#ff2e63' },
        { id: 2, name: 'Blue', color: '#08d9d6' },
      ],
      logger: { info: () => undefined },
    } as unknown as GameContext;

    const game = new LavaEscapeGame();
    await game.init(context);
    const internals = game as any;
    const winner = internals.runners[0];
    const eliminated = internals.runners[1];
    internals.finishRunner(winner);
    eliminated.kill();
    internals.levelDead.add(eliminated.id);
    internals.phase = 'playing';

    internals.evaluateRaceState();

    expect(internals.phase).toBe('level-results');
    expect(internals.stageIndex).toBe(0);
    expect(internals.records.get(winner.id).score).toBe(10);
    expect(internals.records.get(eliminated.id).score).toBe(0);

    internals.loadLevel(1);
    expect(internals.runners.every((runner: any) => runner.isAlive)).toBe(true);
    game.destroy();
  });
});
