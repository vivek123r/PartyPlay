export const RENTO_SCHEMA_VERSION = 1;
export const RENTO_REPLAY_VERSION = 1;
export const RENTO_SAVE_KEY = 'rento-match-v1';

export type PlayerId = number;
export type RentoWinMode = 'netWorth' | 'bankruptcy';
export type RentoPhase =
  | 'awaitingRoll'
  | 'propertyDecision'
  | 'turnActions'
  | 'auction'
  | 'tradeResponse'
  | 'finished';
export type RentoActionKind = RentoIntent['type'];
export type DistrictId =
  | 'downtown'
  | 'waterfront'
  | 'technology'
  | 'entertainment'
  | 'industrial'
  | 'luxury';
export type PropertySpecialization = 'hotel' | 'mall' | 'bank' | 'factory' | 'casino';
export type DiceType = 'normal' | 'lucky' | 'heavy' | 'chaos' | 'golden';
export type InvestmentType = 'fixedDeposit' | 'mutualFund' | 'stockMarket' | 'cryptoFund';
export type DealTier = 'normal' | 'featured' | 'legendary' | 'flashSale';
export type AuctionKind = 'standard' | 'premium';
export type RentoTileKind =
  | 'start'
  | 'property'
  | 'bank'
  | 'market'
  | 'auction'
  | 'fortune'
  | 'event'
  | 'tax'
  | 'teleport';
export type RentoEventId =
  | 'property-boom'
  | 'stock-crash'
  | 'festival'
  | 'inflation'
  | 'tax-holiday'
  | 'lucky-day'
  | 'black-friday'
  | 'tourist-season'
  | 'construction-week'
  | 'power-outage'
  | 'government-grant';
export type MissionMetric =
  | 'properties'
  | 'districts'
  | 'prestige'
  | 'invested'
  | 'trades'
  | 'auctions'
  | 'specialDice'
  | 'credit';
export type EndAwardId =
  | 'richest-investor'
  | 'master-trader'
  | 'property-mogul'
  | 'biggest-risk-taker'
  | 'luckiest-player'
  | 'best-negotiator'
  | 'comeback-king';

export interface RentoPlayerSetup {
  id: PlayerId;
  name: string;
  color: string;
  kind?: 'human' | 'bot';
  aiDifficulty?: 'easy' | 'normal' | 'hard';
}

export interface CreateRentoMatchOptions {
  seed: number;
  players: RentoPlayerSetup[];
  winMode?: RentoWinMode;
  roundLimit?: 20 | 30 | 40;
  economyVolatility?: 'stable' | 'dynamic' | 'wild';
}

export interface DistrictDefinition {
  id: DistrictId;
  name: string;
  color: number;
  propertyIds: [string, string, string, string];
  landmarkId: string;
  landmarkName: string;
  landmarkDescription: string;
}

export interface PropertyDefinition {
  id: string;
  districtId: DistrictId;
  name: string;
  basePrice: number;
  baseRent: number;
  upgradeCost: number;
  mortgageValue: number;
  allowedSpecializations: PropertySpecialization[];
}

export interface BoardTileDefinition {
  id: string;
  kind: RentoTileKind;
  label: string;
  propertyId?: string;
}

export interface DiceDefinition {
  id: DiceType;
  name: string;
  description: string;
  consumable: boolean;
}

export interface InvestmentDefinition {
  id: InvestmentType;
  name: string;
  minimum: number;
  risk: 'low' | 'medium' | 'high' | 'extreme';
  minReturnBps: number;
  maxReturnBps: number;
}

export interface EventDefinition {
  id: RentoEventId;
  title: string;
  description: string;
  durationRounds: number;
  economyDelta: number;
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  metric: MissionMetric;
  target: number;
  reward: number;
}

export interface RentoPropertyState {
  id: string;
  ownerId: PlayerId | null;
  prestige: 0 | 1 | 2 | 3 | 4 | 5;
  specialization: PropertySpecialization | null;
  mortgaged: boolean;
  insuredCharges: number;
  securityCharges: number;
  securityCooldown: number;
  disabledRounds: number;
  skinId: string;
}

export interface RentoLoan {
  id: string;
  principal: number;
  balance: number;
  interestBps: number;
  roundsRemaining: number;
  collateralPropertyIds: string[];
  missedPayments: number;
}

export interface RentoPlayerStats {
  propertiesBought: number;
  maxPropertiesOwned: number;
  districtsCompleted: number;
  prestigeBuilt: number;
  totalInvested: number;
  peakInvested: number;
  tradesAccepted: number;
  tradesProposed: number;
  auctionsWon: number;
  auctionSavings: number;
  specialDiceUsed: number;
  luckyRolls: number;
  riskyReturns: number;
  debtRepaid: number;
  lowestCash: number;
  comebackGain: number;
}

export interface RentoMissionProgress {
  missionId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface RentoPlayerState {
  id: PlayerId;
  name: string;
  color: string;
  kind: 'human' | 'bot';
  aiDifficulty: 'easy' | 'normal' | 'hard';
  position: number;
  cash: number;
  distressDebt: number;
  bankrupt: boolean;
  creditScore: number;
  bankReputation: number;
  propertiesOwned: string[];
  investments: Record<InvestmentType, number>;
  diceInventory: Record<DiceType, number>;
  loans: RentoLoan[];
  vouchers: number;
  marketPurchasesCycle: number;
  mission: RentoMissionProgress;
  stats: RentoPlayerStats;
}

export interface ActiveEconomyEffect {
  eventId: RentoEventId;
  roundsRemaining: number;
}

export interface RentoMarketListing {
  id: string;
  propertyId: string;
  tier: DealTier;
  price: number;
  expiresAtRound: number;
}

export interface RentoMarketState {
  cycle: number;
  lastRefreshRound: number;
  listings: RentoMarketListing[];
  news: string;
}

export interface RentoAuctionState {
  id: string;
  kind: AuctionKind;
  propertyId: string;
  sellerId: PlayerId | null;
  initiatedByPlayerId: PlayerId;
  participantIds: PlayerId[];
  activeBidderId: PlayerId;
  highestBidderId: PlayerId | null;
  highestBid: number;
  minimumBid: number;
  minimumIncrement: number;
  passedPlayerIds: PlayerId[];
}

export interface TradeAssets {
  cash: number;
  propertyIds: string[];
  investments: Partial<Record<InvestmentType, number>>;
  dice: Partial<Record<DiceType, number>>;
  vouchers: number;
}

export interface RentoTradeOffer {
  id: string;
  proposerId: PlayerId;
  recipientId: PlayerId;
  offered: TradeAssets;
  requested: TradeAssets;
  counterDepth: number;
  returnPhase: 'awaitingRoll' | 'turnActions';
}

export interface RentoMoveRecord {
  playerId: PlayerId;
  diceType: DiceType;
  dice: number[];
  total: number;
  from: number;
  to: number;
  path: number[];
}

export interface RentoAward {
  id: EndAwardId;
  playerId: PlayerId;
  value: number;
}

export interface RentoStanding {
  playerId: PlayerId;
  rank: number;
  netWorth: number;
  cash: number;
  bankrupt: boolean;
}

export interface RentoCommandRecord {
  sequence: number;
  round: number;
  turn: number;
  intent: RentoIntent;
}

export interface RentoMatchState {
  schemaVersion: number;
  seed: number;
  rngState: number;
  rngCalls: number;
  initialOptions: CreateRentoMatchOptions;
  phase: RentoPhase;
  winMode: RentoWinMode;
  roundLimit: number;
  economyVolatility: 'stable' | 'dynamic' | 'wild';
  round: number;
  completedRounds: number;
  turn: number;
  turnOrder: PlayerId[];
  turnCursor: number;
  players: RentoPlayerState[];
  properties: Record<string, RentoPropertyState>;
  landmarkOwners: Partial<Record<DistrictId, PlayerId>>;
  economyIndex: number;
  activeEffects: ActiveEconomyEffect[];
  eventDeck: RentoEventId[];
  eventCursor: number;
  currentEventId: RentoEventId | null;
  market: RentoMarketState;
  pendingPropertyId: string | null;
  auction: RentoAuctionState | null;
  trade: RentoTradeOffer | null;
  lastMove: RentoMoveRecord | null;
  commandSequence: number;
  commandLog: RentoCommandRecord[];
  activityLog: string[];
  standings: RentoStanding[];
  awards: RentoAward[];
  winnerIds: PlayerId[];
}

export type RentoIntent =
  | { type: 'roll'; playerId: PlayerId; diceType?: DiceType }
  | { type: 'purchaseProperty'; playerId: PlayerId }
  | { type: 'declineProperty'; playerId: PlayerId }
  | { type: 'upgradeProperty'; playerId: PlayerId; propertyId: string }
  | {
      type: 'specializeProperty';
      playerId: PlayerId;
      propertyId: string;
      specialization: PropertySpecialization;
    }
  | { type: 'buyInsurance'; playerId: PlayerId; propertyId: string }
  | { type: 'buySecurity'; playerId: PlayerId; propertyId: string }
  | { type: 'sabotageProperty'; playerId: PlayerId; propertyId: string }
  | { type: 'buildLandmark'; playerId: PlayerId; districtId: DistrictId }
  | { type: 'mortgageProperty'; playerId: PlayerId; propertyId: string }
  | { type: 'redeemProperty'; playerId: PlayerId; propertyId: string }
  | { type: 'invest'; playerId: PlayerId; investment: InvestmentType; amount: number }
  | { type: 'withdrawInvestment'; playerId: PlayerId; investment: InvestmentType; amount: number }
  | {
      type: 'takeLoan';
      playerId: PlayerId;
      amount: number;
      collateralPropertyIds: string[];
      termRounds?: number;
    }
  | { type: 'repayLoan'; playerId: PlayerId; loanId: string; amount: number }
  | { type: 'buyMarketListing'; playerId: PlayerId; listingId: string }
  | { type: 'useVoucher'; playerId: PlayerId; propertyId: string }
  | { type: 'bidAuction'; playerId: PlayerId; amount: number }
  | { type: 'passAuction'; playerId: PlayerId }
  | {
      type: 'proposeTrade';
      playerId: PlayerId;
      recipientId: PlayerId;
      offered: TradeAssets;
      requested: TradeAssets;
    }
  | { type: 'respondTrade'; playerId: PlayerId; response: 'accept' | 'reject' }
  | {
      type: 'counterTrade';
      playerId: PlayerId;
      offered: TradeAssets;
      requested: TradeAssets;
    }
  | { type: 'endTurn'; playerId: PlayerId };

export interface RentoCommandResult {
  sequence: number;
  phase: RentoPhase;
  messages: string[];
}

export interface RentoSaveEnvelope {
  schemaVersion: number;
  savedAt: number;
  state: RentoMatchState;
}

export interface RentoReplayEnvelope {
  replayVersion: number;
  options: CreateRentoMatchOptions;
  commands: RentoCommandRecord[];
}
