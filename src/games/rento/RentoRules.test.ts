import { describe, expect, test } from 'vitest';
import { BOARD_TILES, DISTRICTS, EVENTS, PROPERTIES, propertyById } from './content';
import { createAiCandidates, selectAiIntent } from './ai';
import {
  createReplayEnvelope,
  createSaveEnvelope,
  parseSaveEnvelope,
  replayRentoCommands,
  restoreRentoRules,
} from './persistence';
import { RentoRules, createEmptyTradeAssets, isValidRentoState } from './rules';
import type { CreateRentoMatchOptions, RentoIntent, RentoPlayerSetup } from './types';

const players: RentoPlayerSetup[] = [
  { id: 1, name: 'Ari', color: '#ff2e63' },
  { id: 2, name: 'Bo', color: '#08d9d6' },
  { id: 3, name: 'Cy', color: '#2af598' },
  { id: 4, name: 'Dee', color: '#ffde7d' },
];

const createRules = (
  playerCount = 2,
  seed = 12_345,
  extra: Partial<CreateRentoMatchOptions> = {},
): RentoRules =>
  RentoRules.create({
    seed,
    players: players.slice(0, playerCount),
    winMode: 'netWorth',
    roundLimit: 20,
    ...extra,
  });

const forcePropertyDecision = (rules: RentoRules, propertyId: string): void => {
  rules.state.phase = 'propertyDecision';
  rules.state.pendingPropertyId = propertyId;
};

const giveProperty = (
  rules: RentoRules,
  playerId: number,
  propertyId: string,
  prestige: 1 | 2 | 3 | 4 | 5 = 1,
): void => {
  const property = rules.property(propertyId);
  property.ownerId = playerId;
  property.prestige = prestige;
  const player = rules.player(playerId);
  if (!player.propertiesOwned.includes(propertyId)) player.propertiesOwned.push(propertyId);
};

const forceLanding = (rules: RentoRules, tileIndex: number, playerId = rules.activePlayer.id): void => {
  const preview = new RentoRules(structuredClone(rules.state));
  preview.dispatch({ type: 'roll', playerId });
  const distance = preview.state.lastMove!.total;
  rules.player(playerId).position =
    (tileIndex - distance + BOARD_TILES.length) % BOARD_TILES.length;
  rules.dispatch({ type: 'roll', playerId });
};

const resolveToTurnActions = (rules: RentoRules): void => {
  let safety = 0;
  while (rules.state.phase !== 'turnActions' && rules.state.phase !== 'finished' && safety++ < 20) {
    if (rules.state.phase === 'propertyDecision') {
      const active = rules.activePlayer;
      const propertyId = rules.state.pendingPropertyId!;
      if (active.cash >= rules.propertyPurchasePrice(propertyId) + 2_000) {
        rules.dispatch({ type: 'purchaseProperty', playerId: active.id });
      } else {
        rules.dispatch({ type: 'declineProperty', playerId: active.id });
      }
    } else if (rules.state.phase === 'auction') {
      rules.dispatch({ type: 'passAuction', playerId: rules.state.auction!.activeBidderId });
    } else {
      throw new Error(`Unexpected phase ${rules.state.phase}.`);
    }
  }
  expect(safety).toBeLessThan(20);
};

const playAutomatedMatch = (rules: RentoRules, maxCommands = 2_000): void => {
  let commands = 0;
  while (rules.state.phase !== 'finished' && commands++ < maxCommands) {
    if (rules.state.phase === 'awaitingRoll') {
      rules.dispatch({ type: 'roll', playerId: rules.activePlayer.id });
    } else if (rules.state.phase === 'propertyDecision' || rules.state.phase === 'auction') {
      resolveToTurnActions(rules);
    } else if (rules.state.phase === 'turnActions') {
      rules.dispatch({ type: 'endTurn', playerId: rules.activePlayer.id });
    } else if (rules.state.phase === 'tradeResponse') {
      rules.dispatch({
        type: 'respondTrade',
        playerId: rules.state.trade!.recipientId,
        response: 'reject',
      });
    }
    for (const player of rules.state.players) {
      expect(player.cash).toBeGreaterThanOrEqual(0);
      expect(Object.values(player.investments).every((value) => value >= 0)).toBe(true);
    }
  }
  expect(commands).toBeLessThan(maxCommands);
};

describe('Rento deterministic core', () => {
  test('creates the same complete match from the same seed', () => {
    const first = createRules(4, 777);
    const second = createRules(4, 777);
    expect(first.state).toEqual(second.state);
    expect(isValidRentoState(first.state)).toBe(true);
    expect(first.state.players).toHaveLength(4);
    expect(first.state.players.every((player) => player.cash === 12_000)).toBe(true);
  });

  test('defines a 32-tile board with six four-property districts', () => {
    expect(BOARD_TILES).toHaveLength(32);
    expect(PROPERTIES).toHaveLength(24);
    expect(DISTRICTS).toHaveLength(6);
    expect(DISTRICTS.every((district) => district.propertyIds.length === 4)).toBe(true);
    expect(new Set(BOARD_TILES.map((tile) => tile.id)).size).toBe(32);
    expect(
      BOARD_TILES.filter((tile) => tile.kind === 'property').map((tile) => tile.propertyId),
    ).toEqual(expect.arrayContaining(PROPERTIES.map((property) => property.id)));
  });

  test('records a deterministic movement path and consumes special dice', () => {
    const first = createRules(2, 99);
    const second = createRules(2, 99);
    first.player(1).diceInventory.lucky = 2;
    second.player(1).diceInventory.lucky = 2;
    first.dispatch({ type: 'roll', playerId: 1, diceType: 'lucky' });
    second.dispatch({ type: 'roll', playerId: 1, diceType: 'lucky' });
    expect(first.state.lastMove).toEqual(second.state.lastMove);
    expect(first.state.lastMove!.total).toBeGreaterThanOrEqual(4);
    expect(first.state.lastMove!.path).toHaveLength(first.state.lastMove!.total);
    expect(first.player(1).diceInventory.lucky).toBe(1);
    expect(first.player(1).stats.specialDiceUsed).toBe(1);
  });

  test('purchases, upgrades, specializes, mortgages, and redeems a property', () => {
    const rules = createRules();
    forcePropertyDecision(rules, 'meridian-tower');
    const before = rules.player(1).cash;
    rules.dispatch({ type: 'purchaseProperty', playerId: 1 });
    expect(rules.property('meridian-tower').prestige).toBe(1);
    expect(rules.property('meridian-tower').ownerId).toBe(1);
    expect(rules.player(1).cash).toBeLessThan(before);

    rules.dispatch({ type: 'upgradeProperty', playerId: 1, propertyId: 'meridian-tower' });
    rules.dispatch({
      type: 'specializeProperty',
      playerId: 1,
      propertyId: 'meridian-tower',
      specialization: 'hotel',
    });
    expect(rules.property('meridian-tower').prestige).toBe(2);
    expect(rules.property('meridian-tower').specialization).toBe('hotel');
    const cashBeforeMortgage = rules.player(1).cash;
    rules.dispatch({ type: 'mortgageProperty', playerId: 1, propertyId: 'meridian-tower' });
    expect(rules.rentFor('meridian-tower')).toBe(0);
    expect(rules.player(1).cash).toBeGreaterThan(cashBeforeMortgage);
    rules.dispatch({ type: 'redeemProperty', playerId: 1, propertyId: 'meridian-tower' });
    expect(rules.property('meridian-tower').mortgaged).toBe(false);
  });

  test('requires a complete Prestige 2 district for its unique landmark', () => {
    const rules = createRules();
    const district = DISTRICTS[0];
    district.propertyIds.forEach((propertyId) => giveProperty(rules, 1, propertyId, 2));
    rules.dispatch({ type: 'buildLandmark', playerId: 1, districtId: district.id });
    expect(rules.state.landmarkOwners[district.id]).toBe(1);
    expect(() =>
      rules.dispatch({ type: 'buildLandmark', playerId: 1, districtId: district.id }),
    ).toThrow(/already has a landmark/);
  });

  test('security blocks one sabotage before entering cooldown', () => {
    const rules = createRules();
    giveProperty(rules, 2, 'coral-hotel');
    rules.property('coral-hotel').securityCharges = 1;
    rules.dispatch({ type: 'sabotageProperty', playerId: 1, propertyId: 'coral-hotel' });
    expect(rules.property('coral-hotel').disabledRounds).toBe(0);
    expect(rules.property('coral-hotel').securityCharges).toBe(0);
    expect(rules.property('coral-hotel').securityCooldown).toBe(2);
    rules.dispatch({ type: 'sabotageProperty', playerId: 1, propertyId: 'coral-hotel' });
    expect(rules.property('coral-hotel').disabledRounds).toBe(2);
  });

  test('resolves a standard auction through legal minimum bids and passes', () => {
    const rules = createRules();
    forcePropertyDecision(rules, 'azure-marina');
    rules.dispatch({ type: 'declineProperty', playerId: 1 });
    expect(rules.state.phase).toBe('auction');
    const minimum = rules.state.auction!.minimumBid;
    const firstBidder = rules.state.auction!.activeBidderId;
    rules.dispatch({ type: 'bidAuction', playerId: firstBidder, amount: minimum });
    const secondBidder = rules.state.auction!.activeBidderId;
    rules.dispatch({ type: 'passAuction', playerId: secondBidder });
    expect(rules.state.phase).toBe('turnActions');
    expect(rules.property('azure-marina').ownerId).toBe(firstBidder);
    expect(rules.player(firstBidder).stats.auctionsWon).toBe(1);
  });

  test('validates and atomically transfers a private trade', () => {
    const rules = createRules();
    rules.player(2).vouchers = 1;
    const offered = { ...createEmptyTradeAssets(), cash: 600 };
    const requested = { ...createEmptyTradeAssets(), vouchers: 1 };
    rules.dispatch({ type: 'proposeTrade', playerId: 1, recipientId: 2, offered, requested });
    expect(rules.state.phase).toBe('tradeResponse');
    rules.dispatch({ type: 'respondTrade', playerId: 2, response: 'accept' });
    expect(rules.state.phase).toBe('awaitingRoll');
    expect(rules.player(1).vouchers).toBe(1);
    expect(rules.player(2).vouchers).toBe(0);
    expect(rules.player(1).cash).toBe(11_400);
    expect(rules.player(2).cash).toBe(12_600);
  });

  test('supports investment risk, loans, repayment, credit, and reputation', () => {
    const rules = createRules();
    rules.dispatch({ type: 'invest', playerId: 1, investment: 'mutualFund', amount: 1_000 });
    expect(rules.player(1).investments.mutualFund).toBe(1_000);
    giveProperty(rules, 1, 'ironworks');
    rules.dispatch({
      type: 'takeLoan',
      playerId: 1,
      amount: 1_000,
      collateralPropertyIds: ['ironworks'],
      termRounds: 5,
    });
    const loan = rules.player(1).loans[0];
    const credit = rules.player(1).creditScore;
    rules.dispatch({ type: 'repayLoan', playerId: 1, loanId: loan.id, amount: loan.balance });
    expect(rules.player(1).loans).toHaveLength(0);
    expect(rules.player(1).creditScore).toBeGreaterThan(credit);
    expect(rules.player(1).bankReputation).toBeGreaterThan(25);
  });

  test('refreshes the real-estate market and enforces one purchase per cycle', () => {
    const rules = createRules();
    const listing = rules.state.market.listings[0];
    rules.dispatch({ type: 'buyMarketListing', playerId: 1, listingId: listing.id });
    expect(rules.property(listing.propertyId).ownerId).toBe(1);
    expect(rules.player(1).marketPurchasesCycle).toBe(rules.state.market.cycle);
    const nextListing = rules.state.market.listings[0];
    if (nextListing) {
      expect(() =>
        rules.dispatch({ type: 'buyMarketListing', playerId: 1, listingId: nextListing.id }),
      ).toThrow(/Only one market purchase/);
    }
  });

  test('resolves every bundled world event without invalidating the economy', () => {
    for (const event of EVENTS) {
      const rules = createRules(2, 800 + EVENTS.indexOf(event));
      giveProperty(rules, 1, 'ironworks');
      rules.property('ironworks').insuredCharges = 1;
      rules.player(1).investments.stockMarket = 1_000;
      rules.player(1).investments.cryptoFund = 1_000;
      rules.state.eventDeck = [event.id];
      rules.state.eventCursor = 0;
      const eventTile = BOARD_TILES.findIndex((tile) => tile.kind === 'event');
      forceLanding(rules, eventTile);
      expect(rules.state.currentEventId).toBe(event.id);
      expect(rules.state.economyIndex).toBeGreaterThanOrEqual(-25);
      expect(rules.state.economyIndex).toBeLessThanOrEqual(25);
      expect(rules.player(1).cash).toBeGreaterThanOrEqual(0);
    }
  });

  test('awards hidden mission rewards exactly once', () => {
    const rules = createRules();
    rules.player(1).mission = {
      missionId: 'mission-property-mogul',
      progress: 0,
      completed: false,
      claimed: false,
    };
    PROPERTIES.slice(0, 5).forEach((property) => giveProperty(rules, 1, property.id));
    const cash = rules.player(1).cash;
    rules.dispatch({ type: 'invest', playerId: 1, investment: 'fixedDeposit', amount: 500 });
    expect(rules.player(1).mission.completed).toBe(true);
    expect(rules.player(1).mission.claimed).toBe(true);
    expect(rules.player(1).cash).toBe(cash - 500 + 900);
    rules.dispatch({ type: 'withdrawInvestment', playerId: 1, investment: 'fixedDeposit', amount: 500 });
    expect(rules.player(1).cash).toBe(cash - 10 + 900);
  });

  test('replays the same intent stream into byte-equivalent deterministic state', () => {
    const rules = createRules(2, 4_242);
    rules.dispatch({ type: 'invest', playerId: 1, investment: 'fixedDeposit', amount: 500 });
    rules.dispatch({ type: 'roll', playerId: 1 });
    resolveToTurnActions(rules);
    rules.dispatch({ type: 'endTurn', playerId: 1 });
    rules.dispatch({ type: 'roll', playerId: 2 });
    resolveToTurnActions(rules);
    const replayed = replayRentoCommands(createReplayEnvelope(rules.state));
    expect(replayed.state).toEqual(rules.state);
  });

  test('round-trips versioned saves and rejects incompatible data', () => {
    const rules = createRules(3);
    const envelope = createSaveEnvelope(rules.state, 123);
    expect(parseSaveEnvelope(JSON.stringify(envelope))).toEqual(envelope);
    expect(restoreRentoRules(envelope).state).toEqual(rules.state);
    expect(parseSaveEnvelope({ ...envelope, schemaVersion: 99 })).toBeNull();
    expect(parseSaveEnvelope('{broken')).toBeNull();
  });

  test('AI hooks return only executable deterministic intents', () => {
    const rules = createRules(2, 515);
    const candidates = createAiCandidates(rules, 1);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.intent.playerId === 1)).toBe(true);
    const first = selectAiIntent(rules, 1, 'hard');
    const second = selectAiIntent(rules, 1, 'hard');
    expect(first).toEqual(second);
    expect(() => rules.dispatch(first as RentoIntent)).not.toThrow();
  });

  test('invalid intents roll back every partial mutation', () => {
    const rules = createRules();
    const before = structuredClone(rules.state);
    expect(() =>
      rules.dispatch({ type: 'invest', playerId: 1, investment: 'cryptoFund', amount: 99_999 }),
    ).toThrow();
    expect(rules.state).toEqual(before);
  });

  test('finishes a seeded 20-round economy match with standings and awards', () => {
    const rules = createRules(4, 9_001, { economyVolatility: 'wild' });
    playAutomatedMatch(rules);
    expect(rules.state.phase).toBe('finished');
    expect(rules.state.completedRounds).toBe(20);
    expect(rules.state.standings).toHaveLength(4);
    expect(rules.state.awards).toHaveLength(7);
    expect(rules.state.winnerIds.length).toBeGreaterThan(0);
    expect(rules.state.market.cycle).toBeGreaterThanOrEqual(5);
    expect(rules.state.eventCursor).toBeGreaterThan(0);
  });

  test('terminates safely across player counts and a matrix of seeds', () => {
    for (let playerCount = 1; playerCount <= 4; playerCount++) {
      for (let seed = 1; seed <= 8; seed++) {
        const rules = createRules(playerCount, seed * 7_919);
        playAutomatedMatch(rules);
        expect(rules.state.phase).toBe('finished');
        expect(rules.state.standings).toHaveLength(playerCount);
        expect(rules.state.commandLog.length).toBeGreaterThan(0);
      }
    }
  });

  test('classic bankruptcy liquidates an insolvent player and declares the survivor', () => {
    const rules = createRules(2, 31, { winMode: 'bankruptcy' });
    rules.player(1).cash = 0;
    giveProperty(rules, 2, 'aurum-bank', 5);
    const target = BOARD_TILES.findIndex((tile) => tile.propertyId === 'aurum-bank');
    forceLanding(rules, target, 1);
    expect(rules.player(1).bankrupt).toBe(true);
    expect(rules.state.phase).toBe('finished');
    expect(rules.state.winnerIds).toEqual([2]);
    expect(propertyById('aurum-bank').baseRent).toBeGreaterThan(0);
  });
});
