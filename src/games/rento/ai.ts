import { INVESTMENTS } from './content';
import { RentoRules, createEmptyTradeAssets } from './rules';
import type {
  DiceType,
  RentoIntent,
  RentoPlayerState,
  TradeAssets,
} from './types';

export interface RentoAiCandidate {
  intent: RentoIntent;
  score: number;
  reason: string;
}

const assetValue = (rules: RentoRules, assets: TradeAssets): number =>
  assets.cash +
  assets.vouchers * 1_000 +
  assets.propertyIds.reduce((sum, propertyId) => sum + rules.propertyPurchasePrice(propertyId), 0) +
  Object.values(assets.investments).reduce((sum, amount) => sum + (amount ?? 0), 0) +
  Object.entries(assets.dice).reduce(
    (sum, [type, amount]) =>
      sum + (type === 'golden' ? 700 : type === 'chaos' ? 400 : 250) * (amount ?? 0),
    0,
  );

const chooseDiceCandidates = (player: RentoPlayerState): RentoAiCandidate[] => {
  const dice: DiceType[] = ['normal', 'lucky', 'heavy', 'chaos', 'golden'];
  return dice
    .filter((type) => type === 'normal' || player.diceInventory[type] > 0)
    .map((type) => ({
      intent: { type: 'roll', playerId: player.id, diceType: type },
      score: type === 'normal' ? 50 : type === 'lucky' ? 58 : type === 'heavy' ? 62 : type === 'chaos' ? 52 : 68,
      reason: `Roll the ${type} die.`,
    }));
};

/**
 * Produces legal, side-effect-free command candidates. UI and bot schedulers may inspect the
 * reasons/scores, replace the scoring layer, or pass the candidates to `selectAiIntent`.
 */
export const createAiCandidates = (
  rules: RentoRules,
  playerId: number,
): RentoAiCandidate[] => {
  const player = rules.player(playerId);
  const state = rules.state;
  if (state.phase === 'finished' || player.bankrupt) return [];
  if (state.phase === 'auction') {
    const auction = state.auction;
    if (!auction || auction.activeBidderId !== playerId) return [];
    const minimum = auction.highestBid
      ? auction.highestBid + auction.minimumIncrement
      : auction.minimumBid;
    const value = rules.propertyPurchasePrice(auction.propertyId);
    const candidates: RentoAiCandidate[] = [
      { intent: { type: 'passAuction', playerId }, score: 35, reason: 'Leave an overpriced auction.' },
    ];
    if (player.cash >= minimum) {
      candidates.push({
        intent: { type: 'bidAuction', playerId, amount: minimum },
        score: minimum <= value * 0.88 ? 78 : minimum <= value ? 52 : 20,
        reason: `Bid the legal minimum of $${minimum}.`,
      });
    }
    return candidates;
  }
  if (state.phase === 'tradeResponse') {
    const trade = state.trade;
    if (!trade || trade.recipientId !== playerId) return [];
    const received = assetValue(rules, trade.offered);
    const surrendered = assetValue(rules, trade.requested);
    const reject: RentoAiCandidate = {
      intent: { type: 'respondTrade', playerId, response: 'reject' },
      score: received < surrendered ? 80 : 25,
      reason: 'Reject a deal that does not improve estimated value.',
    };
    const accept: RentoAiCandidate = {
      intent: { type: 'respondTrade', playerId, response: 'accept' },
      score: received >= surrendered * 0.95 ? 82 : 20,
      reason: 'Accept a favorable exchange.',
    };
    return [reject, accept];
  }
  if (rules.activePlayer.id !== playerId) return [];
  if (state.phase === 'propertyDecision') {
    const propertyId = state.pendingPropertyId!;
    const price = rules.propertyPurchasePrice(propertyId);
    const reserve = 1_500 + player.loans.reduce((sum, loan) => sum + loan.balance, 0) * 0.2;
    const candidates: RentoAiCandidate[] = [
      { intent: { type: 'declineProperty', playerId }, score: 38, reason: 'Preserve liquidity.' },
    ];
    if (player.cash >= price) {
      candidates.push({
        intent: { type: 'purchaseProperty', playerId },
        score: player.cash - price >= reserve ? 82 : 45,
        reason: 'Acquire an affordable unowned property.',
      });
    }
    return candidates;
  }
  const candidates: RentoAiCandidate[] = [];
  if (state.phase === 'awaitingRoll') candidates.push(...chooseDiceCandidates(player));
  if (state.phase === 'turnActions') {
    candidates.push({ intent: { type: 'endTurn', playerId }, score: 42, reason: 'Finish the turn.' });
  }
  if (state.phase !== 'awaitingRoll' && state.phase !== 'turnActions') return candidates;
  const affordableUpgrade = player.propertiesOwned
    .map((propertyId) => ({ propertyId, property: rules.property(propertyId) }))
    .filter(({ property }) => !property.mortgaged && property.prestige > 0 && property.prestige < 5)
    .sort((left, right) => rules.propertyUpgradeCost(left.propertyId) - rules.propertyUpgradeCost(right.propertyId))[0];
  if (affordableUpgrade) {
    const cost = rules.propertyUpgradeCost(affordableUpgrade.propertyId);
    if (player.cash - cost >= 1_500) {
      candidates.push({
        intent: { type: 'upgradeProperty', playerId, propertyId: affordableUpgrade.propertyId },
        score: 70,
        reason: 'Improve the most affordable property.',
      });
    }
  }
  const listing = state.market.listings
    .filter((candidate) => candidate.price <= player.cash - 1_500)
    .sort((left, right) => left.price - right.price)[0];
  if (listing && player.marketPurchasesCycle !== state.market.cycle) {
    candidates.push({
      intent: { type: 'buyMarketListing', playerId, listingId: listing.id },
      score: listing.tier === 'legendary' ? 95 : listing.tier === 'flashSale' ? 88 : 68,
      reason: `Purchase a ${listing.tier} market listing.`,
    });
  }
  if (player.cash >= 5_000) {
    const investment = INVESTMENTS[
      player.aiDifficulty === 'hard' ? 2 : player.aiDifficulty === 'normal' ? 1 : 0
    ];
    candidates.push({
      intent: { type: 'invest', playerId, investment: investment.id, amount: 500 },
      score: 57,
      reason: 'Put excess cash to work.',
    });
  }
  return candidates;
};

/**
 * Selects a deterministic candidate. Difficulty changes decision quality, never legality:
 * easy chooses among the lower half, normal among the upper three, and hard chooses the best.
 */
export const selectAiIntent = (
  rules: RentoRules,
  playerId: number,
  difficulty = rules.player(playerId).aiDifficulty,
): RentoIntent | null => {
  const candidates = createAiCandidates(rules, playerId).sort(
    (left, right) => right.score - left.score,
  );
  if (!candidates.length) return null;
  if (difficulty === 'hard') return candidates[0].intent;
  const deterministicIndex = (
    rules.state.seed +
    rules.state.commandSequence * 17 +
    playerId * 31
  ) >>> 0;
  if (difficulty === 'normal') {
    return candidates[deterministicIndex % Math.min(3, candidates.length)].intent;
  }
  const lowerStart = Math.floor(candidates.length / 2);
  return candidates[lowerStart + deterministicIndex % (candidates.length - lowerStart)].intent;
};

export const makeCashTrade = (cash: number): TradeAssets => ({
  ...createEmptyTradeAssets(),
  cash,
});
