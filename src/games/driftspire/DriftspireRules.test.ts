import { describe, expect, test } from 'vitest';
import type { PlayerConfig } from '@runtime/types';
import { DriftspireRules, isValidDriftspireState } from './rules';

const players: PlayerConfig[] = [
  { id: 1, name: 'Ari', color: '#ff2e63' },
  { id: 2, name: 'Bo', color: '#08d9d6' },
  { id: 3, name: 'Cy', color: '#2af598' },
  { id: 4, name: 'Dee', color: '#ffde7d' },
];

const createRules = (count = 4, seed = 12345): DriftspireRules =>
  DriftspireRules.create({
    seed,
    players: players.slice(0, count),
    guildIds: ['windrunners', 'lanternmakers', 'chorus-envoys', 'gearwright-union'],
  });

const playGatherTurn = (rules: DriftspireRules): void => {
  const active = rules.activePlayer;
  rules.rollDice(active.id);
  while (rules.state.phase === 'moving') rules.advanceMovementStep();
  if (rules.state.phase === 'tileAction') rules.performAction(active.id, 'gather');
};

describe('Driftspire deterministic rules', () => {
  test('creates byte-equivalent matches from the same seed', () => {
    const first = createRules(4, 991);
    const second = createRules(4, 991);
    expect(first.state).toEqual(second.state);
  });

  test('creates a full 25-tile board and valid player resources', () => {
    expect(createRules(2).state.districtOrder).toHaveLength(6);
    const fourPlayer = createRules(4);
    expect(fourPlayer.state.districtOrder).toHaveLength(6);
    expect(fourPlayer.state.boardTiles).toHaveLength(25);
    expect(fourPlayer.state.boardTiles[0].kind).toBe('start');
    expect(new Set(fourPlayer.state.districtOrder).size).toBe(6);
    fourPlayer.state.players.forEach((player) => {
      expect(player.coin).toBe(6);
      expect(player.favor).toBe(2);
      expect(player.positionTileIndex).toBe(0);
      expect(player.crestsAvailable).toBe(7);
    });
  });

  test('rolls a die and traverses the path one tile at a time', () => {
    const rules = createRules(2, 42);
    const active = rules.activePlayer;
    const roll = rules.rollDice(active.id);
    expect(roll).toBeGreaterThanOrEqual(1);
    expect(roll).toBeLessThanOrEqual(6);
    expect(rules.state.phase).toBe('moving');
    const movement = rules.state.movementRemaining;
    for (let step = 0; step < movement; step++) {
      const before = active.positionTileIndex;
      rules.advanceMovementStep();
      expect(active.positionTileIndex).toBe((before + 1) % rules.state.boardTiles.length);
    }
    expect(rules.state.phase).not.toBe('moving');
  });

  test('supports a friendly Joint Venture without rent or resource loss', () => {
    const rules = createRules(2);
    const ventureIndex = rules.state.boardTiles.findIndex((tile) => tile.kind === 'venture');
    const districtId = rules.state.boardTiles[ventureIndex].districtId;
    rules.state.players.forEach((player) => {
      player.positionDistrictId = districtId;
      player.positionTileIndex = ventureIndex;
    });
    rules.state.phase = 'tileAction';

    rules.proposePact(1, { type: 'jointVenture', partnerId: 2 });
    expect(rules.state.phase).toBe('pactResponse');
    rules.respondToPact(2, true);

    const venture = rules.state.districts[districtId].venture;
    expect(venture.contributions[1]).toBe(1);
    expect(venture.contributions[2]).toBe(1);
    expect(rules.player(1).coin).toBe(5);
    expect(rules.player(2).coin).toBe(5);
    expect(rules.player(1).stats.pacts).toBe(1);
    expect(rules.player(2).stats.pacts).toBe(1);
    expect(rules.state.phase).toBe('tileAction');
  });

  test('resolves six rounds, three Councils, and three Showcases into standings', () => {
    const rules = createRules(4, 707);
    let safety = 0;
    while (rules.state.phase !== 'finished' && safety++ < 200) {
      if (rules.state.phase === 'roll') {
        playGatherTurn(rules);
      } else if (rules.state.phase === 'council') {
        const voter = rules.currentCouncilVoter;
        rules.castCouncilVote(voter.id, voter.id % 2, Math.min(1, voter.favor));
      } else if (rules.state.phase === 'showcase') {
        rules.resolveShowcase({ 1: 100, 2: 75, 3: 50, 4: 25 });
      } else if (rules.state.phase === 'spotlightChoice') {
        rules.chooseSpotlight(rules.state.showcaseWinnerId!, 0);
      } else {
        throw new Error(`Unexpected phase ${rules.state.phase}`);
      }
    }
    expect(safety).toBeLessThan(200);
    expect(rules.state.phase).toBe('finished');
    expect(rules.state.round).toBe(6);
    expect(rules.standings()).toHaveLength(4);
    expect(rules.standings()[0].score).toBeGreaterThanOrEqual(3);
  });

  test('keeps every resource and score non-negative during a full match', () => {
    const rules = createRules(3, 8181);
    let safety = 0;
    while (rules.state.phase !== 'finished' && safety++ < 160) {
      if (rules.state.phase === 'roll') {
        const active = rules.activePlayer;
        rules.rollDice(active.id);
        while (String(rules.state.phase) === 'moving') rules.advanceMovementStep();
        if (String(rules.state.phase) === 'tileAction') {
          const legal = rules.legalActions(active.id);
          rules.performAction(active.id, legal.includes('fund') ? 'fund' : 'gather', 0);
        }
      } else if (rules.state.phase === 'council') {
        const voter = rules.currentCouncilVoter;
        rules.castCouncilVote(voter.id, 0, 0);
      } else if (rules.state.phase === 'showcase') {
        rules.resolveShowcase({ 1: 80, 2: 60, 3: 40 });
      } else if (rules.state.phase === 'spotlightChoice') {
        rules.chooseSpotlight(rules.state.showcaseWinnerId!, 1);
      }
      rules.state.players.forEach((player) => {
        expect(player.coin).toBeGreaterThanOrEqual(0);
        expect(player.favor).toBeGreaterThanOrEqual(0);
        expect(player.renown).toBeGreaterThanOrEqual(0);
        expect(player.crestsAvailable).toBeGreaterThanOrEqual(0);
      });
    }
    expect(rules.state.phase).toBe('finished');
  });

  test('recognizes versioned serializable saves', () => {
    const state = structuredClone(createRules(3).state);
    expect(isValidDriftspireState(state)).toBe(true);
    expect(isValidDriftspireState({ ...state, schemaVersion: 99 })).toBe(false);
    expect(new DriftspireRules(state).state).toEqual(state);
  });
});
