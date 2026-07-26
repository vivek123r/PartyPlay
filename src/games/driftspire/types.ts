import type { PlayerConfig } from '@runtime/types';

export const DRIFTSPIRE_SAVE_KEY = 'match-v1';
export const DRIFTSPIRE_SCHEMA_VERSION = 2;

export type VentureTag = 'Arts' | 'Travel' | 'Craft' | 'Civic' | 'Nature' | 'Discovery';
export type CommissionMetric =
  | 'districts'
  | 'investments'
  | 'pacts'
  | 'landmarks'
  | 'commissions'
  | 'favorSpent'
  | 'stewardships'
  | 'ventureTags';

export type MatchPhase =
  | 'roll'
  | 'moving'
  | 'tileAction'
  | 'pactResponse'
  | 'council'
  | 'showcase'
  | 'spotlightChoice'
  | 'finished';

export type PactType = 'jointVenture' | 'endorsement' | 'commissionAlliance';
export type SiteAction = 'fund' | 'claim' | 'landmark' | 'gather';
export type BoardTileKind = 'start' | 'venture' | 'coin' | 'favor' | 'commission' | 'landmark';

export interface GuildDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: number;
}

export interface DistrictDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: number;
  branches: [VentureTag, VentureTag];
}

export interface CommissionDefinition {
  id: string;
  title: string;
  description: string;
  metric: CommissionMetric;
  target: number;
  unique: boolean;
  reward: 'coin' | 'favor';
}

export interface AmbitionDefinition {
  id: string;
  title: string;
  description: string;
  metric: CommissionMetric;
  thresholds: [number, number, number];
}

export interface OrdinanceDefinition {
  id: string;
  title: string;
  description: string;
  effect:
    | 'craftGrant'
    | 'artsGrant'
    | 'tailwind'
    | 'openArchives'
    | 'civicDividend'
    | 'natureDividend'
    | 'pactFestival'
    | 'marketHoliday'
    | 'sharedStages'
    | 'brightRoutes'
    | 'favorFair'
    | 'grandCommissions';
}

export interface ShowcaseDefinition {
  id: string;
  title: string;
  instruction: string;
  speed: number;
  target: number;
  color: number;
}

export interface PlayerStats {
  districts: number;
  investments: number;
  pacts: number;
  landmarks: number;
  commissions: number;
  favorSpent: number;
  stewardships: number;
  ventureTags: number;
  visitedDistrictIds: string[];
  fundedTags: VentureTag[];
}

export interface ActiveCommission {
  id: string;
  progress: number;
  seenKeys: string[];
  allyPlayerId?: number;
}

export interface DriftspirePlayerState {
  id: number;
  name: string;
  color: string;
  guildId: string;
  coin: number;
  favor: number;
  renown: number;
  positionDistrictId: string;
  positionTileIndex: number;
  crestsAvailable: number;
  nextRollBonus: number;
  activeCommissions: ActiveCommission[];
  ambitionId: string;
  endorsementProposalIndex?: number;
  endorsementSponsorId?: number;
  guildPowerActUsed: boolean;
  fundDiscount: number;
  stats: PlayerStats;
}

export interface VentureState {
  branch: VentureTag | null;
  contributions: Record<number, number>;
  level: number;
}

export interface DistrictState {
  id: string;
  venture: VentureState;
}

export interface BoardTileState {
  id: string;
  districtId: string;
  kind: BoardTileKind;
}

export interface PendingPact {
  id: string;
  type: PactType;
  proposerId: number;
  partnerId: number;
  districtId: string;
  proposalIndex?: number;
}

export interface CouncilVote {
  playerId: number;
  proposalIndex: number;
  favorSpent: number;
}

export interface ActRules {
  discountedTags: VentureTag[];
  routeBonus: number;
  commissionCoinBonus: number;
  dividendBonusTags: VentureTag[];
  acceptedPactFavorBonus: number;
  gatherBonus: number;
  upgradeCoinBonus: number;
}

export interface DriftspireMatchState {
  schemaVersion: number;
  seed: number;
  phase: MatchPhase;
  act: number;
  round: number;
  roundInAct: number;
  players: DriftspirePlayerState[];
  districtOrder: string[];
  districts: Record<string, DistrictState>;
  boardTiles: BoardTileState[];
  turnOrder: number[];
  turnCursor: number;
  lastDiceRoll: number;
  movementRemaining: number;
  diceDeck: number[];
  diceCursor: number;
  pactUsedThisTurn: boolean;
  pendingPact: PendingPact | null;
  commissionDeck: string[];
  commissionCursor: number;
  commissionRow: string[];
  spotlightDeck: VentureTag[][];
  spotlightCursor: number;
  currentSpotlight: VentureTag[];
  nextSpotlight: VentureTag[];
  spotlightChoices: [VentureTag[], VentureTag[]] | null;
  ordinanceDeck: string[];
  ordinanceCursor: number;
  ordinanceOptions: [string, string];
  councilVotes: CouncilVote[];
  councilVoterCursor: number;
  showcaseDeck: string[];
  showcaseCursor: number;
  currentShowcaseId: string;
  showcaseWinnerId?: number;
  actRules: ActRules;
  log: string[];
}

export interface CreateMatchOptions {
  seed: number;
  players: PlayerConfig[];
  guildIds: string[];
}

export interface PactProposal {
  type: PactType;
  partnerId: number;
  proposalIndex?: number;
}

export interface SaveEnvelope {
  schemaVersion: number;
  savedAt: number;
  state: DriftspireMatchState;
}
