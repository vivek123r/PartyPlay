import type {
  BoardTileDefinition,
  DiceDefinition,
  DistrictDefinition,
  DistrictId,
  EventDefinition,
  InvestmentDefinition,
  MissionDefinition,
  PropertyDefinition,
} from './types';

export const STARTING_CASH = 12_000;
export const PASS_START_INCOME = 1_200;

export const DISTRICTS: DistrictDefinition[] = [
  {
    id: 'downtown',
    name: 'Downtown',
    color: 0xf6c344,
    propertyIds: ['meridian-tower', 'central-galleria', 'grand-exchange', 'civic-crown'],
    landmarkId: 'skyline-spire',
    landmarkName: 'Skyline Spire',
    landmarkDescription: 'Adds 15% rent to every Downtown property.',
  },
  {
    id: 'waterfront',
    name: 'Waterfront',
    color: 0x39b9ff,
    propertyIds: ['azure-marina', 'coral-hotel', 'harbor-market', 'tideworks'],
    landmarkId: 'oceanic-arch',
    landmarkName: 'Oceanic Arch',
    landmarkDescription: 'Pays its owner $250 whenever any player passes Start.',
  },
  {
    id: 'technology',
    name: 'Technology',
    color: 0x5fe2d0,
    propertyIds: ['neon-labs', 'quantum-campus', 'circuit-mall', 'data-vault'],
    landmarkId: 'innovation-core',
    landmarkName: 'Innovation Core',
    landmarkDescription: 'Reduces all property upgrades by 10%.',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    color: 0xc976ff,
    propertyIds: ['starlight-casino', 'grand-theatre', 'festival-plaza', 'broadcast-tower'],
    landmarkId: 'aurora-wheel',
    landmarkName: 'Aurora Wheel',
    landmarkDescription: 'Grants a Lucky Die at the start of every fifth round.',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    color: 0xff8754,
    propertyIds: ['ironworks', 'cargo-terminal', 'power-foundry', 'maker-yard'],
    landmarkId: 'titan-foundry',
    landmarkName: 'Titan Foundry',
    landmarkDescription: 'Factory passive income is increased by 25%.',
  },
  {
    id: 'luxury',
    name: 'Luxury',
    color: 0xff5b98,
    propertyIds: ['crown-estates', 'sky-palace', 'royal-arcade', 'aurum-bank'],
    landmarkId: 'crown-promenade',
    landmarkName: 'Crown Promenade',
    landmarkDescription: 'Raises the owner’s Bank Reputation each completed round.',
  },
];

const property = (
  id: string,
  districtId: DistrictId,
  name: string,
  basePrice: number,
  baseRent: number,
  allowedSpecializations: PropertyDefinition['allowedSpecializations'],
): PropertyDefinition => ({
  id,
  districtId,
  name,
  basePrice,
  baseRent,
  upgradeCost: Math.round(basePrice * 0.3 / 50) * 50,
  mortgageValue: Math.round(basePrice * 0.5 / 50) * 50,
  allowedSpecializations,
});

export const PROPERTIES: PropertyDefinition[] = [
  property('meridian-tower', 'downtown', 'Meridian Tower', 1_200, 150, ['hotel', 'bank']),
  property('central-galleria', 'downtown', 'Central Galleria', 1_300, 165, ['mall', 'casino']),
  property('grand-exchange', 'downtown', 'Grand Exchange', 1_450, 185, ['bank', 'mall']),
  property('civic-crown', 'downtown', 'Civic Crown', 1_550, 205, ['hotel', 'bank']),
  property('azure-marina', 'waterfront', 'Azure Marina', 1_050, 125, ['hotel', 'mall']),
  property('coral-hotel', 'waterfront', 'Coral Hotel', 1_150, 140, ['hotel', 'casino']),
  property('harbor-market', 'waterfront', 'Harbor Market', 1_250, 155, ['mall', 'factory']),
  property('tideworks', 'waterfront', 'Tideworks', 1_350, 170, ['factory', 'bank']),
  property('neon-labs', 'technology', 'Neon Labs', 1_350, 165, ['factory', 'bank']),
  property('quantum-campus', 'technology', 'Quantum Campus', 1_500, 190, ['factory', 'hotel']),
  property('circuit-mall', 'technology', 'Circuit Mall', 1_650, 215, ['mall', 'casino']),
  property('data-vault', 'technology', 'Data Vault', 1_800, 240, ['bank', 'factory']),
  property('starlight-casino', 'entertainment', 'Starlight Casino', 1_500, 190, ['casino', 'hotel']),
  property('grand-theatre', 'entertainment', 'Grand Theatre', 1_600, 210, ['hotel', 'mall']),
  property('festival-plaza', 'entertainment', 'Festival Plaza', 1_750, 235, ['mall', 'casino']),
  property('broadcast-tower', 'entertainment', 'Broadcast Tower', 1_900, 265, ['casino', 'bank']),
  property('ironworks', 'industrial', 'Ironworks', 900, 100, ['factory', 'bank']),
  property('cargo-terminal', 'industrial', 'Cargo Terminal', 1_000, 115, ['factory', 'mall']),
  property('power-foundry', 'industrial', 'Power Foundry', 1_150, 135, ['factory', 'casino']),
  property('maker-yard', 'industrial', 'Maker Yard', 1_250, 150, ['factory', 'mall']),
  property('crown-estates', 'luxury', 'Crown Estates', 1_750, 230, ['hotel', 'bank']),
  property('sky-palace', 'luxury', 'Sky Palace', 1_950, 270, ['hotel', 'casino']),
  property('royal-arcade', 'luxury', 'Royal Arcade', 2_150, 310, ['mall', 'casino']),
  property('aurum-bank', 'luxury', 'Aurum Bank', 2_350, 350, ['bank', 'hotel']),
];

const p = (propertyId: string): BoardTileDefinition => ({
  id: `tile-${propertyId}`,
  kind: 'property',
  label: PROPERTIES.find((candidate) => candidate.id === propertyId)?.name ?? propertyId,
  propertyId,
});

export const BOARD_TILES: BoardTileDefinition[] = [
  { id: 'start', kind: 'start', label: 'Rento Central' },
  p('meridian-tower'),
  p('central-galleria'),
  { id: 'bank', kind: 'bank', label: 'Rento Bank' },
  p('grand-exchange'),
  p('civic-crown'),
  { id: 'fortune', kind: 'fortune', label: 'Fortune Wheel' },
  p('azure-marina'),
  p('coral-hotel'),
  { id: 'market', kind: 'market', label: 'Real Estate Market' },
  p('harbor-market'),
  p('tideworks'),
  { id: 'event', kind: 'event', label: 'World Event' },
  p('neon-labs'),
  p('quantum-campus'),
  p('circuit-mall'),
  { id: 'auction', kind: 'auction', label: 'Premium Auction' },
  p('data-vault'),
  p('starlight-casino'),
  p('grand-theatre'),
  { id: 'tax', kind: 'tax', label: 'City Tax' },
  p('festival-plaza'),
  p('broadcast-tower'),
  p('ironworks'),
  { id: 'teleport', kind: 'teleport', label: 'Metro Teleport' },
  p('cargo-terminal'),
  p('power-foundry'),
  p('maker-yard'),
  p('crown-estates'),
  p('sky-palace'),
  p('royal-arcade'),
  p('aurum-bank'),
];

export const DICE: DiceDefinition[] = [
  { id: 'normal', name: 'Normal Dice', description: 'Roll one fair six-sided die.', consumable: false },
  { id: 'lucky', name: 'Lucky Dice', description: 'Roll between four and six.', consumable: true },
  { id: 'heavy', name: 'Heavy Dice', description: 'Roll two dice and travel farther.', consumable: true },
  { id: 'chaos', name: 'Chaos Dice', description: 'Roll anywhere from one to twelve.', consumable: true },
  { id: 'golden', name: 'Golden Dice', description: 'Roll six and collect a cash bonus.', consumable: true },
];

export const INVESTMENTS: InvestmentDefinition[] = [
  { id: 'fixedDeposit', name: 'Fixed Deposit', minimum: 500, risk: 'low', minReturnBps: 125, maxReturnBps: 125 },
  { id: 'mutualFund', name: 'Mutual Fund', minimum: 500, risk: 'medium', minReturnBps: -100, maxReturnBps: 350 },
  { id: 'stockMarket', name: 'Stock Market', minimum: 500, risk: 'high', minReturnBps: -450, maxReturnBps: 750 },
  { id: 'cryptoFund', name: 'Crypto Fund', minimum: 500, risk: 'extreme', minReturnBps: -1_200, maxReturnBps: 1_800 },
];

export const EVENTS: EventDefinition[] = [
  { id: 'property-boom', title: 'Property Boom', description: 'Property values and rents surge.', durationRounds: 2, economyDelta: 10 },
  { id: 'stock-crash', title: 'Stock Crash', description: 'Stocks and crypto immediately lose value.', durationRounds: 1, economyDelta: -12 },
  { id: 'festival', title: 'Festival', description: 'Hotel and casino districts fill with visitors.', durationRounds: 2, economyDelta: 4 },
  { id: 'inflation', title: 'Inflation', description: 'Construction and tax costs rise.', durationRounds: 2, economyDelta: -4 },
  { id: 'tax-holiday', title: 'Tax Holiday', description: 'The City Tax tile is free.', durationRounds: 2, economyDelta: 3 },
  { id: 'lucky-day', title: 'Lucky Day', description: 'Every active player receives a Lucky Die.', durationRounds: 1, economyDelta: 2 },
  { id: 'black-friday', title: 'Black Friday', description: 'Market listings receive deeper discounts.', durationRounds: 1, economyDelta: 1 },
  { id: 'tourist-season', title: 'Tourist Season', description: 'Hotels collect enhanced rent.', durationRounds: 2, economyDelta: 5 },
  { id: 'construction-week', title: 'Construction Week', description: 'Property upgrades cost less.', durationRounds: 2, economyDelta: 2 },
  { id: 'power-outage', title: 'Power Outage', description: 'Passive building income pauses.', durationRounds: 1, economyDelta: -5 },
  { id: 'government-grant', title: 'Government Grant', description: 'Each active player receives development cash.', durationRounds: 1, economyDelta: 4 },
];

export const MISSIONS: MissionDefinition[] = [
  { id: 'mission-property-mogul', title: 'Quiet Acquisition', description: 'Own five properties.', metric: 'properties', target: 5, reward: 900 },
  { id: 'mission-district-crown', title: 'District Crown', description: 'Complete one district.', metric: 'districts', target: 1, reward: 1_100 },
  { id: 'mission-skyline', title: 'Skyline Architect', description: 'Build six Prestige levels.', metric: 'prestige', target: 6, reward: 800 },
  { id: 'mission-portfolio', title: 'Balanced Portfolio', description: 'Invest $3,000.', metric: 'invested', target: 3_000, reward: 750 },
  { id: 'mission-dealmaker', title: 'Private Dealmaker', description: 'Complete two trades.', metric: 'trades', target: 2, reward: 850 },
  { id: 'mission-auctioneer', title: 'Auction Hunter', description: 'Win two auctions.', metric: 'auctions', target: 2, reward: 850 },
  { id: 'mission-dice-collector', title: 'Loaded Pocket', description: 'Use three special dice.', metric: 'specialDice', target: 3, reward: 700 },
  { id: 'mission-perfect-credit', title: 'Perfect Credit', description: 'Reach a credit score of 760.', metric: 'credit', target: 760, reward: 1_000 },
];

export const propertyById = (id: string): PropertyDefinition => {
  const definition = PROPERTIES.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown Rento property "${id}".`);
  return definition;
};

export const districtById = (id: DistrictId): DistrictDefinition => {
  const definition = DISTRICTS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown Rento district "${id}".`);
  return definition;
};

export const investmentById = (id: InvestmentDefinition['id']): InvestmentDefinition => {
  const definition = INVESTMENTS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown Rento investment "${id}".`);
  return definition;
};

export const eventById = (id: EventDefinition['id']): EventDefinition => {
  const definition = EVENTS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown Rento event "${id}".`);
  return definition;
};

export const missionById = (id: string): MissionDefinition => {
  const definition = MISSIONS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown Rento mission "${id}".`);
  return definition;
};
