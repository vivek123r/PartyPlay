import type {
  AmbitionDefinition,
  CommissionDefinition,
  DistrictDefinition,
  GuildDefinition,
  OrdinanceDefinition,
  ShowcaseDefinition,
  VentureTag,
} from './types';

export const GUILDS: GuildDefinition[] = [
  {
    id: 'windrunners',
    name: 'The Windrunners',
    shortName: 'WIND',
    description: 'Once per Act, add one to a dice roll.',
    color: 0x42d9ff,
  },
  {
    id: 'lanternmakers',
    name: 'The Lanternmakers',
    shortName: 'LANTERN',
    description: 'The first Crest funded each Act costs one less Coin.',
    color: 0xffbd45,
  },
  {
    id: 'chorus-envoys',
    name: 'The Chorus Envoys',
    shortName: 'CHORUS',
    description: 'The first accepted Pact each Act grants both players Favor.',
    color: 0xff70c6,
  },
  {
    id: 'verdant-circle',
    name: 'The Verdant Circle',
    shortName: 'VERDANT',
    description: 'Gain Favor after every city shift if you funded a venture.',
    color: 0x69e08b,
  },
  {
    id: 'star-scribes',
    name: 'The Star Scribes',
    shortName: 'SCRIBES',
    description: 'Claiming a Commission also earns one Coin.',
    color: 0xb797ff,
  },
  {
    id: 'gearwright-union',
    name: 'The Gearwright Union',
    shortName: 'GEARS',
    description: 'Triggering a venture upgrade earns one extra Coin.',
    color: 0xff7b54,
  },
];

export const DISTRICTS: DistrictDefinition[] = [
  {
    id: 'zephyr-docks',
    name: 'Zephyr Docks',
    shortName: 'DOCKS',
    description: 'Add one to your next dice roll.',
    color: 0x2785c7,
    branches: ['Travel', 'Craft'],
  },
  {
    id: 'lantern-row',
    name: 'Lantern Row',
    shortName: 'LANTERN',
    description: 'Trade two Coin for two Favor.',
    color: 0xc77d25,
    branches: ['Arts', 'Civic'],
  },
  {
    id: 'geargarden',
    name: 'Geargarden',
    shortName: 'GEARS',
    description: 'Discount your next venture investment.',
    color: 0x9b6240,
    branches: ['Craft', 'Nature'],
  },
  {
    id: 'cloud-conservatory',
    name: 'Cloud Conservatory',
    shortName: 'GARDEN',
    description: 'Earn Coin from your established ventures.',
    color: 0x3b9e68,
    branches: ['Nature', 'Discovery'],
  },
  {
    id: 'astral-archive',
    name: 'Astral Archive',
    shortName: 'ARCHIVE',
    description: 'Advance every active Commission.',
    color: 0x7655b5,
    branches: ['Discovery', 'Arts'],
  },
  {
    id: 'chorus-plaza',
    name: 'Chorus Plaza',
    shortName: 'PLAZA',
    description: 'Gain two Favor before the next Council.',
    color: 0xb94b87,
    branches: ['Civic', 'Arts'],
  },
  {
    id: 'ember-bazaar',
    name: 'Ember Bazaar',
    shortName: 'BAZAAR',
    description: 'Trade one Favor for three Coin.',
    color: 0xc34f3b,
    branches: ['Craft', 'Civic'],
  },
  {
    id: 'stormworks',
    name: 'Stormworks',
    shortName: 'STORM',
    description: 'Harness the storm for three Coin.',
    color: 0x3e568f,
    branches: ['Travel', 'Discovery'],
  },
];

const commission = (
  id: string,
  title: string,
  description: string,
  metric: CommissionDefinition['metric'],
  target: number,
  reward: CommissionDefinition['reward'],
  unique = false,
): CommissionDefinition => ({ id, title, description, metric, target, reward, unique });

export const COMMISSIONS: CommissionDefinition[] = [
  commission('district-tour-2', 'Whistle-Stop Tour', 'Visit two new districts.', 'districts', 2, 'coin', true),
  commission('district-tour-3', 'Grand City Tour', 'Visit three new districts.', 'districts', 3, 'favor', true),
  commission('district-tour-4', 'Every Windway', 'Visit four new districts.', 'districts', 4, 'coin', true),
  commission('fund-2', 'Lay Foundations', 'Fund two Guild Crests.', 'investments', 2, 'coin'),
  commission('fund-3', 'Master Builder', 'Fund three Guild Crests.', 'investments', 3, 'favor'),
  commission('fund-4', 'City Shaper', 'Fund four Guild Crests.', 'investments', 4, 'coin'),
  commission('pact-1', 'Open Hand', 'Complete one Pact.', 'pacts', 1, 'favor'),
  commission('pact-2', 'Guild Network', 'Complete two Pacts.', 'pacts', 2, 'coin'),
  commission('pact-3', 'Everyone Knows You', 'Complete three Pacts.', 'pacts', 3, 'favor'),
  commission('landmark-2', 'Local Expert', 'Use two district Landmarks.', 'landmarks', 2, 'coin'),
  commission('landmark-3', 'City Whisperer', 'Use three district Landmarks.', 'landmarks', 3, 'favor'),
  commission('landmark-4', 'Keys to the City', 'Use four district Landmarks.', 'landmarks', 4, 'coin'),
  commission('commission-1', 'Reliable Hands', 'Complete another Commission.', 'commissions', 1, 'favor'),
  commission('commission-2', 'Double Booking', 'Complete two other Commissions.', 'commissions', 2, 'coin'),
  commission('favor-2', 'Council Regular', 'Spend two Favor in Council.', 'favorSpent', 2, 'coin'),
  commission('favor-3', 'Persuasive Voice', 'Spend three Favor in Council.', 'favorSpent', 3, 'favor'),
  commission('steward-1', 'First Among Friends', 'Steward one Spotlight venture.', 'stewardships', 1, 'coin'),
  commission('steward-2', 'Festival Steward', 'Steward two Spotlight ventures.', 'stewardships', 2, 'favor'),
  commission('tags-2', 'Curious Investor', 'Fund two venture types.', 'ventureTags', 2, 'coin', true),
  commission('tags-3', 'Balanced Portfolio', 'Fund three venture types.', 'ventureTags', 3, 'favor', true),
  commission('tags-4', 'Guild of Everything', 'Fund four venture types.', 'ventureTags', 4, 'coin', true),
  commission('quick-build', 'Raise the Banners', 'Fund one Crest.', 'investments', 1, 'favor'),
  commission('quick-trip', 'Courier Run', 'Visit one new district.', 'districts', 1, 'coin', true),
  commission('quick-landmark', 'Ask a Local', 'Use one Landmark.', 'landmarks', 1, 'favor'),
];

const ambition = (
  id: string,
  title: string,
  description: string,
  metric: AmbitionDefinition['metric'],
  thresholds: [number, number, number],
): AmbitionDefinition => ({ id, title, description, metric, thresholds });

export const AMBITIONS: AmbitionDefinition[] = [
  ambition('amb-city-soul', 'Soul of the City', 'Explore as many districts as possible.', 'districts', [3, 4, 6]),
  ambition('amb-trailblazer', 'Trailblazer', 'Keep moving into unfamiliar districts.', 'districts', [2, 4, 5]),
  ambition('amb-builder', 'Skyline Builder', 'Place Crests across the city.', 'investments', [2, 4, 6]),
  ambition('amb-patron', 'Grand Patron', 'Fund an ambitious venture network.', 'investments', [3, 5, 7]),
  ambition('amb-diplomat', 'Beloved Diplomat', 'Complete Pacts with rival guilds.', 'pacts', [1, 2, 3]),
  ambition('amb-host', 'Perfect Host', 'Create reasons for guilds to cooperate.', 'pacts', [2, 3, 4]),
  ambition('amb-local', 'City Whisperer', 'Use district Landmarks.', 'landmarks', [2, 3, 5]),
  ambition('amb-scholar', 'Living Atlas', 'Learn the city through its Landmarks.', 'landmarks', [1, 3, 4]),
  ambition('amb-closer', 'Commission Closer', 'Finish public Commissions.', 'commissions', [1, 2, 4]),
  ambition('amb-legend', 'Guild Legend', 'Build a reputation for reliable work.', 'commissions', [2, 3, 5]),
  ambition('amb-orator', 'Silver Voice', 'Spend Favor shaping Council outcomes.', 'favorSpent', [2, 4, 6]),
  ambition('amb-civic', 'Civic Champion', 'Make your Favor count.', 'favorSpent', [1, 3, 5]),
  ambition('amb-steward', 'Steward of Stewards', 'Lead active ventures.', 'stewardships', [1, 3, 5]),
  ambition('amb-crown', 'Quiet Crown', 'Earn Stewardship repeatedly.', 'stewardships', [2, 4, 6]),
  ambition('amb-variety', 'Many-Colored Crest', 'Fund different venture types.', 'ventureTags', [2, 3, 5]),
  ambition('amb-renaissance', 'Renaissance Guild', 'Support a broad venture portfolio.', 'ventureTags', [3, 4, 6]),
  ambition('amb-neighbor', 'Good Neighbor', 'Mix exploration with cooperation.', 'pacts', [1, 3, 4]),
  ambition('amb-wayfinder', 'Wayfinder', 'Map the drifting districts.', 'districts', [3, 5, 6]),
];

export const ORDINANCES: OrdinanceDefinition[] = [
  { id: 'craft-grant', title: 'MAKERS GRANT', description: 'Craft ventures cost one less Coin.', effect: 'craftGrant' },
  { id: 'arts-grant', title: 'LANTERN FUND', description: 'Arts ventures cost one less Coin.', effect: 'artsGrant' },
  { id: 'tailwind', title: 'PUBLIC TAILWINDS', description: 'Every dice roll gains one movement step.', effect: 'tailwind' },
  { id: 'open-archives', title: 'OPEN ARCHIVES', description: 'Commissions pay one extra Coin.', effect: 'openArchives' },
  { id: 'civic-dividend', title: 'CIVIC DIVIDEND', description: 'Civic ventures pay one extra Coin.', effect: 'civicDividend' },
  { id: 'nature-dividend', title: 'GREEN DIVIDEND', description: 'Nature ventures pay one extra Coin.', effect: 'natureDividend' },
  { id: 'pact-festival', title: 'OPEN TABLES', description: 'Accepted Pacts grant both guilds Favor.', effect: 'pactFestival' },
  { id: 'market-holiday', title: 'MARKET HOLIDAY', description: 'Gathering grants one extra Coin.', effect: 'marketHoliday' },
  { id: 'shared-stages', title: 'SHARED STAGES', description: 'Venture upgrades pay one extra Coin.', effect: 'sharedStages' },
  { id: 'bright-routes', title: 'BRIGHT ROUTES', description: 'Every dice roll gains one movement step.', effect: 'brightRoutes' },
  { id: 'favor-fair', title: 'FAVOR FAIR', description: 'Every guild gains one Favor now.', effect: 'favorFair' },
  { id: 'grand-commissions', title: 'GRAND COMMISSIONS', description: 'Completed Commissions pay one extra Coin.', effect: 'grandCommissions' },
];

export const SHOWCASES: ShowcaseDefinition[] = [
  { id: 'windwake', title: 'WINDWAKE REGATTA', instruction: 'Press ACTION as the skiff crosses the beacon!', speed: 1.7, target: 0.72, color: 0x42d9ff },
  { id: 'lantern-pattern', title: 'LANTERN PATTERN', instruction: 'Catch the pulse at the brightest point!', speed: 1.25, target: 0.5, color: 0xffbd45 },
  { id: 'gear-relay', title: 'GEAR RELAY', instruction: 'Strike when the teeth align!', speed: 2.05, target: 0.34, color: 0xff7b54 },
  { id: 'cloud-cart', title: 'CLOUD CART SCRAMBLE', instruction: 'Leap at the edge of the skyrail!', speed: 1.9, target: 0.8, color: 0xe8f6ff },
  { id: 'chorus-call', title: 'CHORUS CALL', instruction: 'Land your note inside the chorus!', speed: 1.45, target: 0.6, color: 0xff70c6 },
  { id: 'garden-gust', title: 'GARDEN GUST', instruction: 'Release your seed into the green current!', speed: 1.15, target: 0.42, color: 0x69e08b },
  { id: 'archive-auction', title: 'ARCHIVE AUCTION', instruction: 'Ring the bell on the hidden value!', speed: 1.6, target: 0.66, color: 0xb797ff },
  { id: 'stormline', title: 'STORMLINE DASH', instruction: 'Commit as lightning reaches the mast!', speed: 2.35, target: 0.25, color: 0x778dff },
];

export const SPOTLIGHTS: VentureTag[][] = [
  ['Arts', 'Travel'],
  ['Craft', 'Civic'],
  ['Nature', 'Discovery'],
  ['Arts', 'Civic'],
  ['Travel', 'Discovery'],
  ['Craft', 'Nature'],
  ['Arts', 'Craft'],
  ['Civic', 'Nature'],
  ['Travel', 'Craft'],
  ['Discovery', 'Arts'],
  ['Nature', 'Travel'],
  ['Civic', 'Discovery'],
];

export const guildById = (id: string): GuildDefinition =>
  GUILDS.find((guild) => guild.id === id) ?? GUILDS[0];

export const districtById = (id: string): DistrictDefinition =>
  DISTRICTS.find((district) => district.id === id) ?? DISTRICTS[0];

export const commissionById = (id: string): CommissionDefinition =>
  COMMISSIONS.find((item) => item.id === id) ?? COMMISSIONS[0];

export const ambitionById = (id: string): AmbitionDefinition =>
  AMBITIONS.find((item) => item.id === id) ?? AMBITIONS[0];

export const ordinanceById = (id: string): OrdinanceDefinition =>
  ORDINANCES.find((item) => item.id === id) ?? ORDINANCES[0];

export const showcaseById = (id: string): ShowcaseDefinition =>
  SHOWCASES.find((item) => item.id === id) ?? SHOWCASES[0];
