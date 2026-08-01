import {
  BOARD_TILES,
  DICE,
  DISTRICTS,
  EVENTS,
  INVESTMENTS,
  MISSIONS,
  PASS_START_INCOME,
  PROPERTIES,
  STARTING_CASH,
  districtById,
  eventById,
  investmentById,
  missionById,
  propertyById,
} from './content';
import {
  RENTO_SCHEMA_VERSION,
  type AuctionKind,
  type CreateRentoMatchOptions,
  type DealTier,
  type DiceType,
  type DistrictId,
  type EndAwardId,
  type InvestmentType,
  type MissionMetric,
  type PlayerId,
  type PropertySpecialization,
  type RentoActionKind,
  type RentoAuctionState,
  type RentoCommandResult,
  type RentoIntent,
  type RentoMatchState,
  type RentoPlayerState,
  type RentoPropertyState,
  type RentoStanding,
  type TradeAssets,
} from './types';

const PRESTIGE_RENT_MULTIPLIER = [0, 1, 1.6, 2.35, 3.35, 4.6] as const;
const EMPTY_INVESTMENTS: Record<InvestmentType, number> = {
  fixedDeposit: 0,
  mutualFund: 0,
  stockMarket: 0,
  cryptoFund: 0,
};
const EMPTY_DICE: Record<DiceType, number> = {
  normal: -1,
  lucky: 1,
  heavy: 0,
  chaos: 0,
  golden: 0,
};

const clone = <T>(value: T): T => structuredClone(value);
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.max(minimum, Math.min(maximum, value));
const money = (value: number): number => Math.max(0, Math.round(value / 10) * 10);

const seededShuffle = <T>(items: readonly T[], seed: number): T[] => {
  const result = [...items];
  let value = seed >>> 0 || 0x9e3779b9;
  const random = (): number => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const emptyTradeAssets = (): TradeAssets => ({
  cash: 0,
  propertyIds: [],
  investments: {},
  dice: {},
  vouchers: 0,
});

const createPlayer = (
  setup: CreateRentoMatchOptions['players'][number],
  missionId: string,
): RentoPlayerState => ({
  id: setup.id,
  name: setup.name,
  color: setup.color,
  kind: setup.kind ?? 'human',
  aiDifficulty: setup.aiDifficulty ?? 'normal',
  position: 0,
  cash: STARTING_CASH,
  distressDebt: 0,
  bankrupt: false,
  creditScore: 650,
  bankReputation: 25,
  propertiesOwned: [],
  investments: clone(EMPTY_INVESTMENTS),
  diceInventory: clone(EMPTY_DICE),
  loans: [],
  vouchers: 0,
  marketPurchasesCycle: -1,
  mission: { missionId, progress: 0, completed: false, claimed: false },
  stats: {
    propertiesBought: 0,
    maxPropertiesOwned: 0,
    districtsCompleted: 0,
    prestigeBuilt: 0,
    totalInvested: 0,
    peakInvested: 0,
    tradesAccepted: 0,
    tradesProposed: 0,
    auctionsWon: 0,
    auctionSavings: 0,
    specialDiceUsed: 0,
    luckyRolls: 0,
    riskyReturns: 0,
    debtRepaid: 0,
    lowestCash: STARTING_CASH,
    comebackGain: 0,
  },
});

const createProperty = (id: string): RentoPropertyState => ({
  id,
  ownerId: null,
  prestige: 0,
  specialization: null,
  mortgaged: false,
  insuredCharges: 0,
  securityCharges: 0,
  securityCooldown: 0,
  disabledRounds: 0,
  skinId: 'default',
});

export class RentoRules {
  public state: RentoMatchState;

  public constructor(state: RentoMatchState) {
    if (!isValidRentoState(state)) throw new Error('Cannot construct RentoRules from an invalid state.');
    this.state = state;
  }

  public static create(options: CreateRentoMatchOptions): RentoRules {
    if (options.players.length < 1 || options.players.length > 4) {
      throw new Error('Rento requires between one and four players.');
    }
    if (new Set(options.players.map((player) => player.id)).size !== options.players.length) {
      throw new Error('Every Rento player must have a unique id.');
    }
    const normalized: CreateRentoMatchOptions = {
      seed: options.seed >>> 0,
      players: clone(options.players),
      winMode: options.winMode ?? 'netWorth',
      roundLimit: options.roundLimit ?? 30,
      economyVolatility: options.economyVolatility ?? 'dynamic',
    };
    const missionDeck = seededShuffle(MISSIONS.map((mission) => mission.id), normalized.seed ^ 0x45ab12);
    const properties = Object.fromEntries(
      PROPERTIES.map((definition) => [definition.id, createProperty(definition.id)]),
    );
    const state: RentoMatchState = {
      schemaVersion: RENTO_SCHEMA_VERSION,
      seed: normalized.seed,
      rngState: normalized.seed || 0xa341316c,
      rngCalls: 0,
      initialOptions: normalized,
      phase: 'awaitingRoll',
      winMode: normalized.winMode!,
      roundLimit: normalized.roundLimit!,
      economyVolatility: normalized.economyVolatility!,
      round: 1,
      completedRounds: 0,
      turn: 1,
      turnOrder: normalized.players.map((player) => player.id),
      turnCursor: 0,
      players: normalized.players.map((player, index) =>
        createPlayer(player, missionDeck[index % missionDeck.length]),
      ),
      properties,
      landmarkOwners: {},
      economyIndex: 0,
      activeEffects: [],
      eventDeck: seededShuffle(
        EVENTS.map((event) => event.id),
        normalized.seed ^ 0xc0ffee,
      ),
      eventCursor: 0,
      currentEventId: null,
      market: {
        cycle: 0,
        lastRefreshRound: 0,
        listings: [],
        news: 'The Rento market opens with fresh opportunities.',
      },
      pendingPropertyId: null,
      auction: null,
      trade: null,
      lastMove: null,
      commandSequence: 0,
      commandLog: [],
      activityLog: ['Welcome to Rento. Build, invest, and dominate.'],
      standings: [],
      awards: [],
      winnerIds: [],
    };
    const rules = new RentoRules(state);
    rules.refreshMarket();
    return rules;
  }

  public get activePlayer(): RentoPlayerState {
    return this.player(this.state.turnOrder[this.state.turnCursor]);
  }

  public get currentTile() {
    return BOARD_TILES[this.activePlayer.position];
  }

  public player(playerId: PlayerId): RentoPlayerState {
    const player = this.state.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new Error(`Unknown Rento player ${playerId}.`);
    return player;
  }

  public property(propertyId: string): RentoPropertyState {
    const property = this.state.properties[propertyId];
    if (!property) throw new Error(`Unknown Rento property "${propertyId}".`);
    return property;
  }

  public propertyPurchasePrice(propertyId: string): number {
    const definition = propertyById(propertyId);
    return money(definition.basePrice * (100 + this.state.economyIndex) / 100);
  }

  public propertyUpgradeCost(propertyId: string): number {
    const property = this.property(propertyId);
    const definition = propertyById(propertyId);
    let multiplier = 1 + Math.max(0, property.prestige - 1) * 0.3;
    if (this.hasEffect('construction-week')) multiplier *= 0.75;
    if (property.specialization === 'factory') multiplier *= 0.85;
    if (this.state.landmarkOwners.technology === property.ownerId) multiplier *= 0.9;
    return money(definition.upgradeCost * multiplier);
  }

  public rentFor(propertyId: string): number {
    const property = this.property(propertyId);
    if (
      property.ownerId === null ||
      property.mortgaged ||
      property.disabledRounds > 0 ||
      property.prestige === 0
    ) {
      return 0;
    }
    const definition = propertyById(propertyId);
    let rent = definition.baseRent * PRESTIGE_RENT_MULTIPLIER[property.prestige];
    if (property.specialization === 'hotel') rent *= 1.25;
    if (property.specialization === 'casino') rent *= 1.15;
    if (this.ownsCompleteDistrict(property.ownerId, definition.districtId)) rent *= 1.2;
    if (this.state.landmarkOwners.downtown === property.ownerId && definition.districtId === 'downtown') {
      rent *= 1.15;
    }
    if (
      (this.hasEffect('tourist-season') || this.hasEffect('festival')) &&
      property.specialization === 'hotel'
    ) {
      rent *= 1.3;
    }
    rent *= (100 + Math.round(this.state.economyIndex / 2)) / 100;
    return money(rent);
  }

  public netWorth(playerId: PlayerId): number {
    const player = this.player(playerId);
    let worth =
      player.cash +
      Object.values(player.investments).reduce((total, value) => total + value, 0) -
      player.distressDebt -
      player.loans.reduce((total, loan) => total + loan.balance, 0);
    for (const propertyId of player.propertiesOwned) {
      const property = this.property(propertyId);
      const definition = propertyById(propertyId);
      const marketValue = this.propertyPurchasePrice(propertyId);
      const improvements = property.prestige > 1
        ? definition.upgradeCost * (property.prestige - 1) * 0.7
        : 0;
      const specializationValue = property.specialization ? 350 : 0;
      const equity = marketValue + improvements + specializationValue;
      worth += property.mortgaged ? Math.max(0, equity - definition.mortgageValue * 1.1) : equity;
    }
    for (const ownerId of Object.values(this.state.landmarkOwners)) {
      if (ownerId === playerId) worth += 1_500;
    }
    return Math.round(worth);
  }

  public standings(): RentoStanding[] {
    return [...this.state.players]
      .map((player) => ({
        playerId: player.id,
        rank: 0,
        netWorth: this.netWorth(player.id),
        cash: player.cash,
        bankrupt: player.bankrupt,
      }))
      .sort((left, right) => {
        if (left.bankrupt !== right.bankrupt) return left.bankrupt ? 1 : -1;
        return right.netWorth - left.netWorth || right.cash - left.cash || left.playerId - right.playerId;
      })
      .map((standing, index) => ({ ...standing, rank: index + 1 }));
  }

  public winnerIds(): PlayerId[] {
    if (this.state.phase === 'finished') return [...this.state.winnerIds];
    const standings = this.standings();
    return standings.length ? [standings[0].playerId] : [];
  }

  public legalActionKinds(playerId = this.activePlayer.id): RentoActionKind[] {
    if (this.state.phase === 'finished') return [];
    if (this.state.phase === 'auction') {
      return this.state.auction?.activeBidderId === playerId ? ['bidAuction', 'passAuction'] : [];
    }
    if (this.state.phase === 'tradeResponse') {
      return this.state.trade?.recipientId === playerId
        ? ['respondTrade', 'counterTrade']
        : [];
    }
    if (playerId !== this.activePlayer.id || this.player(playerId).bankrupt) return [];
    if (this.state.phase === 'propertyDecision') {
      const pending = this.state.pendingPropertyId;
      const actions: RentoActionKind[] = ['declineProperty'];
      if (pending && this.player(playerId).cash >= this.propertyPurchasePrice(pending)) {
        actions.unshift('purchaseProperty');
      }
      return actions;
    }
    const actions: RentoActionKind[] = [];
    if (this.state.phase === 'awaitingRoll') actions.push('roll');
    if (this.state.phase === 'turnActions') actions.push('endTurn');
    if (this.player(playerId).cash >= 100) actions.push('invest');
    if (Object.values(this.player(playerId).investments).some((value) => value > 0)) {
      actions.push('withdrawInvestment');
    }
    if (this.player(playerId).propertiesOwned.length) {
      actions.push(
        'upgradeProperty',
        'specializeProperty',
        'buyInsurance',
        'buySecurity',
        'mortgageProperty',
        'redeemProperty',
        'buildLandmark',
      );
    }
    if (this.state.players.some((player) => player.id !== playerId && !player.bankrupt)) {
      actions.push('proposeTrade', 'sabotageProperty');
    }
    actions.push('takeLoan');
    if (this.player(playerId).loans.length) actions.push('repayLoan');
    if (
      this.state.market.listings.length &&
      this.player(playerId).marketPurchasesCycle !== this.state.market.cycle
    ) {
      actions.push('buyMarketListing');
    }
    if (this.player(playerId).vouchers > 0) actions.push('useVoucher');
    return [...new Set(actions)];
  }

  public dispatch(intent: RentoIntent): RentoCommandResult {
    if (this.state.phase === 'finished') throw new Error('This Rento match is already finished.');
    const previousState = clone(this.state);
    const previousLogLength = this.state.activityLog.length;
    try {
      this.applyIntent(intent);
      this.updateAllMissions();
      this.assertInvariants();
      const sequence = ++this.state.commandSequence;
      this.state.commandLog.push({
        sequence,
        round: this.state.round,
        turn: this.state.turn,
        intent: clone(intent),
      });
      return {
        sequence,
        phase: this.state.phase,
        messages: this.state.activityLog.slice(0, this.state.activityLog.length - previousLogLength),
      };
    } catch (error) {
      this.state = previousState;
      throw error;
    }
  }

  private applyIntent(intent: RentoIntent): void {
    switch (intent.type) {
      case 'roll':
        this.roll(intent.playerId, intent.diceType ?? 'normal');
        break;
      case 'purchaseProperty':
        this.purchasePendingProperty(intent.playerId);
        break;
      case 'declineProperty':
        this.declinePendingProperty(intent.playerId);
        break;
      case 'upgradeProperty':
        this.upgradeProperty(intent.playerId, intent.propertyId);
        break;
      case 'specializeProperty':
        this.specializeProperty(intent.playerId, intent.propertyId, intent.specialization);
        break;
      case 'buyInsurance':
        this.buyInsurance(intent.playerId, intent.propertyId);
        break;
      case 'buySecurity':
        this.buySecurity(intent.playerId, intent.propertyId);
        break;
      case 'sabotageProperty':
        this.sabotageProperty(intent.playerId, intent.propertyId);
        break;
      case 'buildLandmark':
        this.buildLandmark(intent.playerId, intent.districtId);
        break;
      case 'mortgageProperty':
        this.mortgageProperty(intent.playerId, intent.propertyId);
        break;
      case 'redeemProperty':
        this.redeemProperty(intent.playerId, intent.propertyId);
        break;
      case 'invest':
        this.invest(intent.playerId, intent.investment, intent.amount);
        break;
      case 'withdrawInvestment':
        this.withdrawInvestment(intent.playerId, intent.investment, intent.amount);
        break;
      case 'takeLoan':
        this.takeLoan(
          intent.playerId,
          intent.amount,
          intent.collateralPropertyIds,
          intent.termRounds ?? 5,
        );
        break;
      case 'repayLoan':
        this.repayLoan(intent.playerId, intent.loanId, intent.amount);
        break;
      case 'buyMarketListing':
        this.buyMarketListing(intent.playerId, intent.listingId);
        break;
      case 'useVoucher':
        this.useVoucher(intent.playerId, intent.propertyId);
        break;
      case 'bidAuction':
        this.bidAuction(intent.playerId, intent.amount);
        break;
      case 'passAuction':
        this.passAuction(intent.playerId);
        break;
      case 'proposeTrade':
        this.proposeTrade(intent);
        break;
      case 'respondTrade':
        this.respondTrade(intent.playerId, intent.response);
        break;
      case 'counterTrade':
        this.counterTrade(intent.playerId, intent.offered, intent.requested);
        break;
      case 'endTurn':
        this.endTurn(intent.playerId);
        break;
    }
  }

  private roll(playerId: PlayerId, diceType: DiceType): void {
    this.requirePhase('awaitingRoll');
    const player = this.requireActive(playerId);
    if (!DICE.some((die) => die.id === diceType)) throw new Error('Unknown dice type.');
    if (diceType !== 'normal' && player.diceInventory[diceType] <= 0) {
      throw new Error(`${player.name} does not own that die.`);
    }
    let dice: number[];
    if (diceType === 'normal') dice = [this.randomInt(1, 6)];
    else if (diceType === 'lucky') dice = [this.randomInt(4, 6)];
    else if (diceType === 'heavy') dice = [this.randomInt(1, 6), this.randomInt(1, 6)];
    else if (diceType === 'chaos') dice = [this.randomInt(1, 12)];
    else dice = [6];
    if (diceType !== 'normal') {
      player.diceInventory[diceType]--;
      player.stats.specialDiceUsed++;
    }
    if (dice.some((die) => die === 6)) player.stats.luckyRolls++;
    if (diceType === 'golden') {
      player.cash += 600;
      this.log(`${player.name}'s Golden Die pays a $600 bonus.`);
    }
    const total = dice.reduce((sum, die) => sum + die, 0);
    const from = player.position;
    const path = Array.from({ length: total }, (_, step) => (from + step + 1) % BOARD_TILES.length);
    const passedStart = path.filter((position) => position === 0).length;
    if (passedStart) {
      const waterfrontOwner = this.state.landmarkOwners.waterfront;
      player.cash += PASS_START_INCOME * passedStart;
      if (waterfrontOwner !== undefined && waterfrontOwner !== player.id) {
        this.player(waterfrontOwner).cash += 250 * passedStart;
      }
      this.log(`${player.name} passes Start and receives $${PASS_START_INCOME * passedStart}.`);
    }
    player.position = path[path.length - 1] ?? from;
    this.state.lastMove = {
      playerId,
      diceType,
      dice,
      total,
      from,
      to: player.position,
      path,
    };
    this.log(`${player.name} rolls ${total} with the ${diceType} die.`);
    this.resolveLanding(player, 0);
    if (player.bankrupt) {
      this.advanceCompletedTurn();
    }
  }

  private resolveLanding(player: RentoPlayerState, teleportDepth: number): void {
    const tile = BOARD_TILES[player.position];
    this.state.phase = 'turnActions';
    if (tile.kind === 'property') {
      const property = this.property(tile.propertyId!);
      if (property.ownerId === null) {
        this.state.pendingPropertyId = property.id;
        this.state.phase = 'propertyDecision';
      } else if (property.ownerId !== player.id) {
        const rent = this.rentFor(property.id);
        if (rent > 0) {
          this.settlePayment(player, this.player(property.ownerId), rent, `rent at ${tile.label}`);
        }
      }
    } else if (tile.kind === 'fortune') {
      this.resolveFortune(player);
    } else if (tile.kind === 'event') {
      this.triggerNextEvent();
    } else if (tile.kind === 'tax' && !this.hasEffect('tax-holiday')) {
      const tax = money(350 + player.propertiesOwned.length * 60);
      this.settlePayment(player, null, tax, 'City Tax');
    } else if (tile.kind === 'auction') {
      const propertyId = this.pickRandomUnownedProperty();
      if (propertyId) this.startAuction('premium', propertyId, player.id);
    } else if (tile.kind === 'teleport' && teleportDepth === 0) {
      const propertyTiles = BOARD_TILES
        .map((candidate, index) => ({ candidate, index }))
        .filter(({ candidate }) => candidate.kind === 'property');
      player.position = propertyTiles[this.randomInt(0, propertyTiles.length - 1)].index;
      this.log(`${player.name} teleports to ${BOARD_TILES[player.position].label}.`);
      this.resolveLanding(player, 1);
    }
  }

  private purchasePendingProperty(playerId: PlayerId): void {
    this.requirePhase('propertyDecision');
    const player = this.requireActive(playerId);
    const propertyId = this.state.pendingPropertyId;
    if (!propertyId || this.property(propertyId).ownerId !== null) {
      throw new Error('There is no available property to purchase.');
    }
    const price = this.propertyPurchasePrice(propertyId);
    this.requireCash(player, price);
    player.cash -= price;
    this.assignProperty(propertyId, player.id);
    player.stats.propertiesBought++;
    this.state.pendingPropertyId = null;
    this.state.phase = 'turnActions';
    this.log(`${player.name} buys ${propertyById(propertyId).name} for $${price}.`);
  }

  private declinePendingProperty(playerId: PlayerId): void {
    this.requirePhase('propertyDecision');
    const player = this.requireActive(playerId);
    const propertyId = this.state.pendingPropertyId;
    if (!propertyId) throw new Error('There is no property to decline.');
    this.state.pendingPropertyId = null;
    this.startAuction('standard', propertyId, player.id);
  }

  private upgradeProperty(playerId: PlayerId, propertyId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const property = this.requireOwnedProperty(player, propertyId);
    if (property.mortgaged) throw new Error('Redeem this property before upgrading it.');
    if (property.prestige >= 5) throw new Error('This property is already Prestige 5.');
    const cost = this.propertyUpgradeCost(propertyId);
    this.requireCash(player, cost);
    player.cash -= cost;
    property.prestige = (property.prestige + 1) as RentoPropertyState['prestige'];
    player.stats.prestigeBuilt++;
    this.log(`${propertyById(propertyId).name} reaches Prestige ${property.prestige}.`);
  }

  private specializeProperty(
    playerId: PlayerId,
    propertyId: string,
    specialization: PropertySpecialization,
  ): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const property = this.requireOwnedProperty(player, propertyId);
    const definition = propertyById(propertyId);
    if (property.mortgaged || property.prestige < 2) {
      throw new Error('Specialization requires an active Prestige 2 property.');
    }
    if (property.specialization) throw new Error('This property already has a specialization.');
    if (!definition.allowedSpecializations.includes(specialization)) {
      throw new Error(`${specialization} is not legal for ${definition.name}.`);
    }
    const cost = 500;
    this.requireCash(player, cost);
    player.cash -= cost;
    property.specialization = specialization;
    this.log(`${definition.name} specializes as a ${specialization}.`);
  }

  private buyInsurance(playerId: PlayerId, propertyId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const property = this.requireOwnedProperty(player, propertyId);
    const cost = money(propertyById(propertyId).basePrice * 0.1);
    this.requireCash(player, cost);
    player.cash -= cost;
    property.insuredCharges = Math.min(2, property.insuredCharges + 1);
    this.log(`${propertyById(propertyId).name} receives one insurance charge.`);
  }

  private buySecurity(playerId: PlayerId, propertyId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const property = this.requireOwnedProperty(player, propertyId);
    if (property.securityCooldown > 0) throw new Error('Security is currently recharging.');
    const cost = money(propertyById(propertyId).basePrice * 0.12);
    this.requireCash(player, cost);
    player.cash -= cost;
    property.securityCharges = Math.min(2, property.securityCharges + 1);
    this.log(`${propertyById(propertyId).name} receives one security charge.`);
  }

  private sabotageProperty(playerId: PlayerId, propertyId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const target = this.property(propertyId);
    if (target.ownerId === null || target.ownerId === playerId) {
      throw new Error('Sabotage must target a rival property.');
    }
    const cost = 500;
    this.requireCash(player, cost);
    player.cash -= cost;
    if (target.securityCharges > 0) {
      target.securityCharges--;
      target.securityCooldown = 2;
      this.log(`${propertyById(propertyId).name}'s security blocks sabotage.`);
      return;
    }
    target.disabledRounds = Math.max(target.disabledRounds, 2);
    this.log(`${propertyById(propertyId).name} is disabled for two rounds.`);
  }

  private buildLandmark(playerId: PlayerId, districtId: DistrictId): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const district = districtById(districtId);
    if (this.state.landmarkOwners[districtId] !== undefined) {
      throw new Error('This district already has a landmark.');
    }
    if (!this.ownsCompleteDistrict(playerId, districtId)) {
      throw new Error('Own the complete district before building its landmark.');
    }
    if (district.propertyIds.some((id) => this.property(id).prestige < 2 || this.property(id).mortgaged)) {
      throw new Error('Every district property must be active and Prestige 2.');
    }
    const cost = 2_000;
    this.requireCash(player, cost);
    player.cash -= cost;
    this.state.landmarkOwners[districtId] = playerId;
    this.log(`${player.name} completes ${district.landmarkName}.`);
  }

  private mortgageProperty(playerId: PlayerId, propertyId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const property = this.requireOwnedProperty(player, propertyId);
    if (property.mortgaged) throw new Error('This property is already mortgaged.');
    if (this.isCollateral(propertyId)) throw new Error('Loan collateral cannot be mortgaged.');
    property.mortgaged = true;
    const value = propertyById(propertyId).mortgageValue;
    player.cash += value;
    this.log(`${player.name} mortgages ${propertyById(propertyId).name} for $${value}.`);
  }

  private redeemProperty(playerId: PlayerId, propertyId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const property = this.requireOwnedProperty(player, propertyId);
    if (!property.mortgaged) throw new Error('This property is not mortgaged.');
    const cost = money(propertyById(propertyId).mortgageValue * 1.1);
    this.requireCash(player, cost);
    player.cash -= cost;
    property.mortgaged = false;
    this.log(`${player.name} redeems ${propertyById(propertyId).name} for $${cost}.`);
  }

  private invest(playerId: PlayerId, investment: InvestmentType, amount: number): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const definition = investmentById(investment);
    this.requireWholePositiveAmount(amount);
    if (amount < definition.minimum) throw new Error(`Minimum investment is $${definition.minimum}.`);
    this.requireCash(player, amount);
    player.cash -= amount;
    player.investments[investment] += amount;
    player.stats.totalInvested += amount;
    player.stats.peakInvested = Math.max(
      player.stats.peakInvested,
      Object.values(player.investments).reduce((sum, value) => sum + value, 0),
    );
    this.log(`${player.name} invests $${amount} in ${definition.name}.`);
  }

  private withdrawInvestment(playerId: PlayerId, investment: InvestmentType, amount: number): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    this.requireWholePositiveAmount(amount);
    if (player.investments[investment] < amount) throw new Error('Investment balance is too low.');
    const penalty = investment === 'fixedDeposit' ? money(amount * 0.02) : 0;
    player.investments[investment] -= amount;
    player.cash += amount - penalty;
    this.log(`${player.name} withdraws $${amount}${penalty ? ` with a $${penalty} fee` : ''}.`);
  }

  private takeLoan(
    playerId: PlayerId,
    amount: number,
    collateralPropertyIds: string[],
    termRounds: number,
  ): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    this.requireWholePositiveAmount(amount);
    if (amount < 500 || amount % 100 !== 0) throw new Error('Loans start at $500 in $100 increments.');
    if (termRounds < 3 || termRounds > 10 || !Number.isInteger(termRounds)) {
      throw new Error('Loan terms must be between three and ten rounds.');
    }
    const uniqueCollateral = [...new Set(collateralPropertyIds)];
    for (const propertyId of uniqueCollateral) {
      const property = this.requireOwnedProperty(player, propertyId);
      if (property.mortgaged || this.isCollateral(propertyId)) {
        throw new Error('Collateral must be active and unencumbered.');
      }
    }
    const collateralValue = uniqueCollateral.reduce(
      (sum, id) => sum + propertyById(id).mortgageValue,
      0,
    );
    const maximum = 1_000 + player.bankReputation * 30 + collateralValue;
    if (amount > maximum) throw new Error(`This borrower qualifies for at most $${maximum}.`);
    const interestBps = clamp(
      Math.round(1_500 - (player.creditScore - 500) * 2.2 - player.bankReputation * 4 - termRounds * 25),
      400,
      1_800,
    );
    const balance = money(amount * (10_000 + interestBps) / 10_000);
    player.loans.push({
      id: `loan-${this.state.commandSequence + 1}-${playerId}`,
      principal: amount,
      balance,
      interestBps,
      roundsRemaining: termRounds,
      collateralPropertyIds: uniqueCollateral,
      missedPayments: 0,
    });
    player.cash += amount;
    this.log(`${player.name} borrows $${amount} at ${(interestBps / 100).toFixed(1)}%.`);
  }

  private repayLoan(playerId: PlayerId, loanId: string, amount: number): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    const loan = player.loans.find((candidate) => candidate.id === loanId);
    if (!loan) throw new Error('Unknown loan.');
    this.requireWholePositiveAmount(amount);
    const payment = Math.min(amount, loan.balance);
    this.requireCash(player, payment);
    player.cash -= payment;
    loan.balance -= payment;
    player.stats.debtRepaid += payment;
    if (loan.balance <= 0) {
      player.loans = player.loans.filter((candidate) => candidate.id !== loan.id);
      player.creditScore = clamp(player.creditScore + 20, 300, 850);
      player.bankReputation = clamp(player.bankReputation + 8, 0, 100);
      this.log(`${player.name} repays ${loan.id} in full.`);
    } else {
      this.log(`${player.name} pays $${payment} toward ${loan.id}.`);
    }
  }

  private buyMarketListing(playerId: PlayerId, listingId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    if (player.marketPurchasesCycle === this.state.market.cycle) {
      throw new Error('Only one market purchase is allowed per cycle.');
    }
    const listing = this.state.market.listings.find((candidate) => candidate.id === listingId);
    if (!listing) throw new Error('That market listing is no longer available.');
    if (this.property(listing.propertyId).ownerId !== null) throw new Error('That property has been sold.');
    this.requireCash(player, listing.price);
    player.cash -= listing.price;
    this.assignProperty(listing.propertyId, player.id);
    player.marketPurchasesCycle = this.state.market.cycle;
    player.stats.propertiesBought++;
    this.state.market.listings = this.state.market.listings.filter((candidate) => candidate.id !== listingId);
    this.log(`${player.name} buys the ${listing.tier} deal ${propertyById(listing.propertyId).name}.`);
  }

  private useVoucher(playerId: PlayerId, propertyId: string): void {
    this.requireManagementPhase();
    const player = this.requireActive(playerId);
    if (player.vouchers < 1) throw new Error('No Property Voucher is available.');
    if (this.property(propertyId).ownerId !== null) throw new Error('A voucher requires an unowned property.');
    const price = propertyById(propertyId).basePrice;
    this.requireCash(player, price);
    player.cash -= price;
    player.vouchers--;
    this.assignProperty(propertyId, player.id);
    player.stats.propertiesBought++;
    this.state.market.listings = this.state.market.listings.filter(
      (listing) => listing.propertyId !== propertyId,
    );
    this.log(`${player.name} redeems a voucher for ${propertyById(propertyId).name}.`);
  }

  private startAuction(kind: AuctionKind, propertyId: string, initiatedByPlayerId: PlayerId): void {
    if (this.property(propertyId).ownerId !== null) {
      this.state.phase = 'turnActions';
      return;
    }
    const basePrice = this.propertyPurchasePrice(propertyId);
    const minimumBid = money(basePrice * (kind === 'premium' ? 0.8 : 0.5));
    const participantIds = this.state.turnOrder.filter(
      (id) => !this.player(id).bankrupt && this.player(id).cash >= minimumBid,
    );
    if (!participantIds.length) {
      this.state.phase = 'turnActions';
      this.log(`No bidder qualifies for ${propertyById(propertyId).name}.`);
      return;
    }
    const startIndex = participantIds.indexOf(initiatedByPlayerId);
    const activeBidderId = participantIds[startIndex >= 0 ? startIndex : 0];
    const auction: RentoAuctionState = {
      id: `auction-${this.state.round}-${this.state.turn}-${propertyId}`,
      kind,
      propertyId,
      sellerId: null,
      initiatedByPlayerId,
      participantIds,
      activeBidderId,
      highestBidderId: null,
      highestBid: 0,
      minimumBid,
      minimumIncrement: 100,
      passedPlayerIds: [],
    };
    this.state.auction = auction;
    this.state.phase = 'auction';
    this.log(`${kind === 'premium' ? 'Premium' : 'Standard'} auction opens for ${propertyById(propertyId).name}.`);
  }

  private bidAuction(playerId: PlayerId, amount: number): void {
    this.requirePhase('auction');
    const auction = this.requireAuctionBidder(playerId);
    const minimum = auction.highestBid ? auction.highestBid + auction.minimumIncrement : auction.minimumBid;
    if (!Number.isInteger(amount) || amount < minimum) throw new Error(`The minimum bid is $${minimum}.`);
    this.requireCash(this.player(playerId), amount);
    auction.highestBid = amount;
    auction.highestBidderId = playerId;
    this.log(`${this.player(playerId).name} bids $${amount}.`);
    this.advanceAuction();
  }

  private passAuction(playerId: PlayerId): void {
    this.requirePhase('auction');
    const auction = this.requireAuctionBidder(playerId);
    auction.passedPlayerIds.push(playerId);
    this.log(`${this.player(playerId).name} passes.`);
    this.advanceAuction();
  }

  private advanceAuction(): void {
    const auction = this.state.auction!;
    const next = this.nextAuctionBidder(auction);
    if (next !== null) {
      auction.activeBidderId = next;
      return;
    }
    if (auction.highestBidderId !== null) {
      const winner = this.player(auction.highestBidderId);
      winner.cash -= auction.highestBid;
      this.assignProperty(auction.propertyId, winner.id);
      winner.stats.propertiesBought++;
      winner.stats.auctionsWon++;
      winner.stats.auctionSavings += Math.max(
        0,
        this.propertyPurchasePrice(auction.propertyId) - auction.highestBid,
      );
      this.log(`${winner.name} wins ${propertyById(auction.propertyId).name} for $${auction.highestBid}.`);
    } else {
      this.log(`${propertyById(auction.propertyId).name} receives no bids.`);
    }
    this.state.auction = null;
    this.state.phase = 'turnActions';
  }

  private nextAuctionBidder(auction: RentoAuctionState): PlayerId | null {
    const candidates = auction.participantIds.filter(
      (id) => !auction.passedPlayerIds.includes(id) && id !== auction.highestBidderId,
    );
    if (!candidates.length) return null;
    const currentIndex = auction.participantIds.indexOf(auction.activeBidderId);
    for (let offset = 1; offset <= auction.participantIds.length; offset++) {
      const id = auction.participantIds[(currentIndex + offset) % auction.participantIds.length];
      if (candidates.includes(id)) return id;
    }
    return candidates[0];
  }

  private proposeTrade(intent: Extract<RentoIntent, { type: 'proposeTrade' }>): void {
    this.requireManagementPhase();
    const proposer = this.requireActive(intent.playerId);
    const recipient = this.player(intent.recipientId);
    if (recipient.id === proposer.id || recipient.bankrupt) throw new Error('Choose an active rival.');
    this.validateTradeAssets(proposer, intent.offered);
    this.validateTradeAssets(recipient, intent.requested);
    proposer.stats.tradesProposed++;
    this.state.trade = {
      id: `trade-${this.state.commandSequence + 1}`,
      proposerId: proposer.id,
      recipientId: recipient.id,
      offered: clone(intent.offered),
      requested: clone(intent.requested),
      counterDepth: 0,
      returnPhase: this.state.phase as 'awaitingRoll' | 'turnActions',
    };
    this.state.phase = 'tradeResponse';
    this.log(`${proposer.name} sends a private deal to ${recipient.name}.`);
  }

  private respondTrade(playerId: PlayerId, response: 'accept' | 'reject'): void {
    this.requirePhase('tradeResponse');
    const trade = this.state.trade;
    if (!trade || trade.recipientId !== playerId) throw new Error('This trade belongs to another player.');
    if (response === 'accept') {
      const proposer = this.player(trade.proposerId);
      const recipient = this.player(trade.recipientId);
      this.validateTradeAssets(proposer, trade.offered);
      this.validateTradeAssets(recipient, trade.requested);
      this.transferAssets(proposer, recipient, trade.offered);
      this.transferAssets(recipient, proposer, trade.requested);
      proposer.stats.tradesAccepted++;
      recipient.stats.tradesAccepted++;
      this.log(`${recipient.name} accepts ${proposer.name}'s deal.`);
    } else {
      this.log(`${this.player(playerId).name} rejects the deal.`);
    }
    const returnPhase = trade.returnPhase;
    this.state.trade = null;
    this.state.phase = returnPhase;
  }

  private counterTrade(playerId: PlayerId, offered: TradeAssets, requested: TradeAssets): void {
    this.requirePhase('tradeResponse');
    const previous = this.state.trade;
    if (!previous || previous.recipientId !== playerId) throw new Error('This trade belongs to another player.');
    if (previous.counterDepth >= 4) throw new Error('This negotiation reached its counteroffer limit.');
    const proposer = this.player(playerId);
    const recipient = this.player(previous.proposerId);
    this.validateTradeAssets(proposer, offered);
    this.validateTradeAssets(recipient, requested);
    this.state.trade = {
      id: `${previous.id}-counter-${previous.counterDepth + 1}`,
      proposerId: proposer.id,
      recipientId: recipient.id,
      offered: clone(offered),
      requested: clone(requested),
      counterDepth: previous.counterDepth + 1,
      returnPhase: previous.returnPhase,
    };
    proposer.stats.tradesProposed++;
    this.log(`${proposer.name} sends counteroffer ${previous.counterDepth + 1}.`);
  }

  private endTurn(playerId: PlayerId): void {
    this.requirePhase('turnActions');
    this.requireActive(playerId);
    this.state.pendingPropertyId = null;
    this.state.lastMove = null;
    this.advanceCompletedTurn();
  }

  private advanceCompletedTurn(): void {
    const previousCursor = this.state.turnCursor;
    this.advanceTurnCursor();
    const wrapped = this.state.turnCursor <= previousCursor;
    this.state.turn++;
    if (wrapped) {
      this.state.completedRounds++;
      this.state.round =
        this.state.winMode === 'netWorth' && this.state.completedRounds >= this.state.roundLimit
          ? this.state.roundLimit
          : this.state.completedRounds + 1;
      this.processCompletedRound();
    }
    if (this.activePlayer.bankrupt) this.advanceTurnCursor();
    this.checkEndCondition();
    if (this.state.phase !== 'finished') this.state.phase = 'awaitingRoll';
  }

  private advanceTurnCursor(): void {
    const size = this.state.turnOrder.length;
    for (let offset = 1; offset <= size; offset++) {
      const next = (this.state.turnCursor + offset) % size;
      if (!this.player(this.state.turnOrder[next]).bankrupt) {
        this.state.turnCursor = next;
        return;
      }
    }
  }

  private processCompletedRound(): void {
    this.payPassiveIncome();
    this.resolveInvestmentReturns();
    this.processLoans();
    for (const property of Object.values(this.state.properties)) {
      property.disabledRounds = Math.max(0, property.disabledRounds - 1);
      property.securityCooldown = Math.max(0, property.securityCooldown - 1);
    }
    for (const player of this.state.players) {
      player.stats.lowestCash = Math.min(player.stats.lowestCash, player.cash);
      player.stats.comebackGain = Math.max(player.stats.comebackGain, player.cash - player.stats.lowestCash);
      if (this.state.landmarkOwners.luxury === player.id) {
        player.bankReputation = clamp(player.bankReputation + 2, 0, 100);
      }
      if (this.state.landmarkOwners.entertainment === player.id && this.state.completedRounds % 5 === 0) {
        player.diceInventory.lucky++;
      }
    }
    this.tickEffects();
    this.shiftEconomy();
    if (this.state.completedRounds % 3 === 0) this.triggerNextEvent();
    if (this.state.completedRounds % 5 === 0) this.refreshMarket();
  }

  private payPassiveIncome(): void {
    if (this.hasEffect('power-outage')) return;
    for (const property of Object.values(this.state.properties)) {
      if (
        property.ownerId === null ||
        property.mortgaged ||
        property.disabledRounds > 0 ||
        !property.specialization
      ) {
        continue;
      }
      let income = 0;
      if (property.specialization === 'mall') income = 90 * property.prestige;
      else if (property.specialization === 'bank') income = 75 * property.prestige;
      else if (property.specialization === 'factory') income = 110 * property.prestige;
      else if (property.specialization === 'casino') {
        income = this.randomInt(-50, 180) * property.prestige;
      } else income = 45 * property.prestige;
      if (
        property.specialization === 'factory' &&
        this.state.landmarkOwners.industrial === property.ownerId
      ) {
        income *= 1.25;
      }
      const owner = this.player(property.ownerId);
      owner.cash = Math.max(0, owner.cash + money(income));
    }
  }

  private resolveInvestmentReturns(): void {
    for (const player of this.state.players.filter((candidate) => !candidate.bankrupt)) {
      for (const definition of INVESTMENTS) {
        const current = player.investments[definition.id];
        if (current <= 0) continue;
        let basisPoints = this.randomInt(definition.minReturnBps, definition.maxReturnBps);
        if (definition.id === 'mutualFund') basisPoints += this.state.economyIndex * 3;
        if (definition.id === 'stockMarket') basisPoints += this.state.economyIndex * 9;
        if (definition.id === 'cryptoFund') basisPoints += this.state.economyIndex * 14;
        const delta = Math.round(current * basisPoints / 10_000);
        player.investments[definition.id] = Math.max(0, current + delta);
        if (
          delta > 0 &&
          (definition.id === 'stockMarket' || definition.id === 'cryptoFund')
        ) {
          player.stats.riskyReturns += delta;
        }
      }
    }
  }

  private processLoans(): void {
    for (const player of this.state.players.filter((candidate) => !candidate.bankrupt)) {
      for (const loan of [...player.loans]) {
        loan.roundsRemaining--;
        if (loan.roundsRemaining > 0) continue;
        if (player.cash >= loan.balance) {
          player.cash -= loan.balance;
          player.stats.debtRepaid += loan.balance;
          player.loans = player.loans.filter((candidate) => candidate.id !== loan.id);
          player.creditScore = clamp(player.creditScore + 25, 300, 850);
          player.bankReputation = clamp(player.bankReputation + 10, 0, 100);
          this.log(`${player.name} repays a matured loan on time.`);
        } else {
          this.defaultLoan(player, loan.id);
        }
      }
    }
  }

  private defaultLoan(player: RentoPlayerState, loanId: string): void {
    const loan = player.loans.find((candidate) => candidate.id === loanId)!;
    let remaining = loan.balance;
    const cashPayment = Math.min(player.cash, remaining);
    player.cash -= cashPayment;
    remaining -= cashPayment;
    for (const propertyId of loan.collateralPropertyIds) {
      if (remaining <= 0) break;
      const property = this.property(propertyId);
      if (property.ownerId !== player.id) continue;
      remaining -= propertyById(propertyId).mortgageValue;
      this.releaseProperty(propertyId);
    }
    player.loans = player.loans.filter((candidate) => candidate.id !== loan.id);
    player.creditScore = clamp(player.creditScore - 90, 300, 850);
    player.bankReputation = clamp(player.bankReputation - 25, 0, 100);
    if (remaining > 0) {
      if (this.state.winMode === 'bankruptcy') this.eliminatePlayer(player);
      else player.distressDebt += remaining;
    }
    this.log(`${player.name} defaults on ${loan.id}; the bank claims collateral.`);
  }

  private triggerNextEvent(): void {
    if (this.state.eventCursor >= this.state.eventDeck.length) {
      this.state.eventDeck = seededShuffle(
        EVENTS.map((event) => event.id),
        this.state.seed ^ this.state.round ^ this.state.rngCalls,
      );
      this.state.eventCursor = 0;
    }
    const eventId = this.state.eventDeck[this.state.eventCursor++];
    const event = eventById(eventId);
    this.state.currentEventId = event.id;
    this.state.economyIndex = clamp(this.state.economyIndex + event.economyDelta, -25, 25);
    const existing = this.state.activeEffects.find((effect) => effect.eventId === event.id);
    if (existing) existing.roundsRemaining = Math.max(existing.roundsRemaining, event.durationRounds);
    else this.state.activeEffects.push({ eventId: event.id, roundsRemaining: event.durationRounds });
    if (event.id === 'stock-crash') {
      for (const player of this.state.players) {
        player.investments.stockMarket = money(player.investments.stockMarket * 0.8);
        player.investments.cryptoFund = money(player.investments.cryptoFund * 0.65);
      }
    } else if (event.id === 'lucky-day') {
      this.state.players.filter((player) => !player.bankrupt).forEach((player) => player.diceInventory.lucky++);
    } else if (event.id === 'government-grant') {
      this.state.players.filter((player) => !player.bankrupt).forEach((player) => player.cash += 600);
    } else if (event.id === 'power-outage') {
      for (const property of Object.values(this.state.properties)) {
        if (property.ownerId === null) continue;
        if (property.insuredCharges > 0) property.insuredCharges--;
        else property.disabledRounds = Math.max(property.disabledRounds, 1);
      }
    }
    this.log(`World Event: ${event.title}. ${event.description}`);
  }

  private tickEffects(): void {
    for (const effect of this.state.activeEffects) effect.roundsRemaining--;
    this.state.activeEffects = this.state.activeEffects.filter((effect) => effect.roundsRemaining > 0);
  }

  private shiftEconomy(): void {
    const range = this.state.economyVolatility === 'stable'
      ? 2
      : this.state.economyVolatility === 'wild'
        ? 8
        : 4;
    const drift = this.randomInt(-range, range) - Math.sign(this.state.economyIndex);
    this.state.economyIndex = clamp(this.state.economyIndex + drift, -25, 25);
  }

  private refreshMarket(): void {
    const unowned = seededShuffle(
      PROPERTIES.filter((definition) => this.property(definition.id).ownerId === null),
      this.state.seed ^ this.state.round ^ this.state.rngState,
    ).slice(0, 3);
    this.state.market.cycle++;
    this.state.market.lastRefreshRound = this.state.completedRounds;
    this.state.market.listings = unowned.map((definition, index) => {
      const roll = this.random();
      let tier: DealTier;
      if (roll < 0.08) tier = 'legendary';
      else if (roll < 0.27) tier = 'flashSale';
      else if (roll < 0.55) tier = 'featured';
      else tier = 'normal';
      const discount = tier === 'legendary'
        ? 0.7
        : tier === 'flashSale'
          ? 0.78
          : tier === 'featured'
            ? 0.9
            : 1;
      const blackFriday = this.hasEffect('black-friday') ? 0.85 : 1;
      return {
        id: `market-${this.state.market.cycle}-${index}`,
        propertyId: definition.id,
        tier,
        price: money(this.propertyPurchasePrice(definition.id) * discount * blackFriday),
        expiresAtRound: this.state.completedRounds + 5,
      };
    });
    const direction = this.state.economyIndex > 5
      ? 'Demand is climbing across the city.'
      : this.state.economyIndex < -5
        ? 'Buyers find bargains in a cooling market.'
        : 'Property prices remain balanced.';
    this.state.market.news = direction;
    this.log(`The Real Estate Market refreshes with ${unowned.length} deals.`);
  }

  private resolveFortune(player: RentoPlayerState): void {
    const reward = this.randomInt(0, 5);
    if (reward === 0) {
      player.cash += 700;
      this.log(`${player.name} wins $700 from the Fortune Wheel.`);
    } else if (reward === 1) {
      player.diceInventory.lucky++;
      this.log(`${player.name} wins a Lucky Die.`);
    } else if (reward === 2) {
      player.diceInventory.heavy++;
      this.log(`${player.name} wins a Heavy Die.`);
    } else if (reward === 3) {
      player.diceInventory.chaos++;
      this.log(`${player.name} wins a Chaos Die.`);
    } else if (reward === 4) {
      player.vouchers++;
      this.log(`${player.name} wins a rare Property Voucher.`);
    } else {
      player.creditScore = clamp(player.creditScore + 30, 300, 850);
      this.log(`${player.name} wins a 30-point credit boost.`);
    }
  }

  private settlePayment(
    payer: RentoPlayerState,
    recipient: RentoPlayerState | null,
    amount: number,
    reason: string,
  ): void {
    let remaining = amount;
    const paidCash = Math.min(payer.cash, remaining);
    payer.cash -= paidCash;
    remaining -= paidCash;
    let paid = paidCash;
    for (const investment of ['cryptoFund', 'stockMarket', 'mutualFund', 'fixedDeposit'] as InvestmentType[]) {
      if (remaining <= 0) break;
      const liquidation = Math.min(payer.investments[investment], remaining);
      payer.investments[investment] -= liquidation;
      remaining -= liquidation;
      paid += liquidation;
    }
    for (const propertyId of payer.propertiesOwned) {
      if (remaining <= 0) break;
      const property = this.property(propertyId);
      if (property.mortgaged || this.isCollateral(propertyId)) continue;
      property.mortgaged = true;
      const value = propertyById(propertyId).mortgageValue;
      const applied = Math.min(value, remaining);
      remaining -= applied;
      paid += applied;
      payer.cash += Math.max(0, value - applied);
    }
    if (recipient) recipient.cash += paid;
    if (remaining > 0) {
      if (this.state.winMode === 'bankruptcy') this.eliminatePlayer(payer);
      else payer.distressDebt += remaining;
    }
    this.log(`${payer.name} pays $${paid} for ${reason}${remaining > 0 ? ` and restructures $${remaining}` : ''}.`);
  }

  private eliminatePlayer(player: RentoPlayerState): void {
    if (player.bankrupt) return;
    player.bankrupt = true;
    for (const propertyId of [...player.propertiesOwned]) this.releaseProperty(propertyId);
    player.investments = clone(EMPTY_INVESTMENTS);
    player.loans = [];
    player.cash = 0;
    this.log(`${player.name} is bankrupt and leaves the market.`);
  }

  private checkEndCondition(): void {
    const active = this.state.players.filter((player) => !player.bankrupt);
    const netWorthFinished =
      this.state.winMode === 'netWorth' && this.state.completedRounds >= this.state.roundLimit;
    const bankruptcyFinished =
      this.state.winMode === 'bankruptcy' && this.state.players.length > 1 && active.length <= 1;
    if (netWorthFinished || bankruptcyFinished) this.finishMatch();
  }

  private finishMatch(): void {
    this.state.phase = 'finished';
    this.state.standings = this.standings();
    const best = this.state.standings[0]?.netWorth;
    this.state.winnerIds = this.state.standings
      .filter((standing) => !standing.bankrupt && standing.netWorth === best)
      .map((standing) => standing.playerId);
    this.state.awards = this.calculateAwards();
    this.log(`Match complete. ${this.state.winnerIds.map((id) => this.player(id).name).join(' & ')} wins.`);
  }

  private calculateAwards() {
    const award = (
      id: EndAwardId,
      value: (player: RentoPlayerState) => number,
    ) => {
      const ranked = [...this.state.players].sort(
        (left, right) => value(right) - value(left) || left.id - right.id,
      );
      return { id, playerId: ranked[0].id, value: value(ranked[0]) };
    };
    return [
      award('richest-investor', (player) => Object.values(player.investments).reduce((a, b) => a + b, 0)),
      award('master-trader', (player) => player.stats.tradesAccepted),
      award('property-mogul', (player) => player.stats.maxPropertiesOwned),
      award('biggest-risk-taker', (player) => player.stats.totalInvested + player.stats.specialDiceUsed * 250),
      award('luckiest-player', (player) => player.stats.luckyRolls),
      award('best-negotiator', (player) => player.stats.tradesAccepted * 2 + player.stats.tradesProposed),
      award('comeback-king', (player) => player.stats.comebackGain),
    ];
  }

  private updateAllMissions(): void {
    for (const player of this.state.players) {
      const mission = missionById(player.mission.missionId);
      player.mission.progress = this.missionMetric(player, mission.metric);
      if (!player.mission.completed && player.mission.progress >= mission.target) {
        player.mission.completed = true;
        player.mission.claimed = true;
        player.cash += mission.reward;
        this.log(`${player.name} completes a hidden mission and earns $${mission.reward}.`);
      }
    }
  }

  private missionMetric(player: RentoPlayerState, metric: MissionMetric): number {
    if (metric === 'properties') return player.propertiesOwned.length;
    if (metric === 'districts') return this.completedDistrictCount(player.id);
    if (metric === 'prestige') {
      return player.propertiesOwned.reduce((sum, id) => sum + this.property(id).prestige, 0);
    }
    if (metric === 'invested') return player.stats.peakInvested;
    if (metric === 'trades') return player.stats.tradesAccepted;
    if (metric === 'auctions') return player.stats.auctionsWon;
    if (metric === 'specialDice') return player.stats.specialDiceUsed;
    return player.creditScore;
  }

  private assignProperty(propertyId: string, playerId: PlayerId): void {
    const property = this.property(propertyId);
    if (property.ownerId !== null) this.releaseProperty(propertyId);
    const player = this.player(playerId);
    property.ownerId = playerId;
    property.prestige = 1;
    property.mortgaged = false;
    property.disabledRounds = 0;
    if (!player.propertiesOwned.includes(propertyId)) player.propertiesOwned.push(propertyId);
    player.stats.maxPropertiesOwned = Math.max(player.stats.maxPropertiesOwned, player.propertiesOwned.length);
    player.stats.districtsCompleted = this.completedDistrictCount(playerId);
    this.state.market.listings = this.state.market.listings.filter(
      (listing) => listing.propertyId !== propertyId,
    );
  }

  private releaseProperty(propertyId: string): void {
    const property = this.property(propertyId);
    if (property.ownerId !== null) {
      const owner = this.player(property.ownerId);
      owner.propertiesOwned = owner.propertiesOwned.filter((id) => id !== propertyId);
    }
    property.ownerId = null;
    property.prestige = 0;
    property.specialization = null;
    property.mortgaged = false;
    property.insuredCharges = 0;
    property.securityCharges = 0;
    property.disabledRounds = 0;
    const districtId = propertyById(propertyId).districtId;
    if (this.state.landmarkOwners[districtId] !== undefined) {
      delete this.state.landmarkOwners[districtId];
    }
  }

  private validateTradeAssets(player: RentoPlayerState, assets: TradeAssets): void {
    if (!Number.isInteger(assets.cash) || assets.cash < 0 || player.cash < assets.cash) {
      throw new Error('Trade cash is invalid.');
    }
    if (!Number.isInteger(assets.vouchers) || assets.vouchers < 0 || player.vouchers < assets.vouchers) {
      throw new Error('Trade vouchers are invalid.');
    }
    if (new Set(assets.propertyIds).size !== assets.propertyIds.length) {
      throw new Error('A property can appear only once in a trade.');
    }
    for (const propertyId of assets.propertyIds) {
      const property = this.requireOwnedProperty(player, propertyId);
      if (property.mortgaged || this.isCollateral(propertyId)) {
        throw new Error('Mortgaged property and loan collateral cannot be traded.');
      }
    }
    for (const [id, amount] of Object.entries(assets.investments)) {
      if (!INVESTMENTS.some((definition) => definition.id === id)) throw new Error('Unknown trade investment.');
      if (!Number.isInteger(amount) || amount < 0 || player.investments[id as InvestmentType] < amount) {
        throw new Error('Trade investment balance is invalid.');
      }
    }
    for (const [id, amount] of Object.entries(assets.dice)) {
      if (id === 'normal' || !DICE.some((definition) => definition.id === id)) {
        throw new Error('That die cannot be traded.');
      }
      if (!Number.isInteger(amount) || amount < 0 || player.diceInventory[id as DiceType] < amount) {
        throw new Error('Trade dice balance is invalid.');
      }
    }
    const totalAssets =
      assets.cash +
      assets.vouchers +
      assets.propertyIds.length +
      Object.values(assets.investments).reduce((sum, value) => sum + (value ?? 0), 0) +
      Object.values(assets.dice).reduce((sum, value) => sum + (value ?? 0), 0);
    if (totalAssets <= 0) throw new Error('A trade side cannot be empty.');
  }

  private transferAssets(from: RentoPlayerState, to: RentoPlayerState, assets: TradeAssets): void {
    from.cash -= assets.cash;
    to.cash += assets.cash;
    from.vouchers -= assets.vouchers;
    to.vouchers += assets.vouchers;
    for (const propertyId of assets.propertyIds) {
      from.propertiesOwned = from.propertiesOwned.filter((id) => id !== propertyId);
      to.propertiesOwned.push(propertyId);
      this.property(propertyId).ownerId = to.id;
    }
    for (const [id, amount = 0] of Object.entries(assets.investments)) {
      from.investments[id as InvestmentType] -= amount;
      to.investments[id as InvestmentType] += amount;
    }
    for (const [id, amount = 0] of Object.entries(assets.dice)) {
      from.diceInventory[id as DiceType] -= amount;
      to.diceInventory[id as DiceType] += amount;
    }
  }

  private ownsCompleteDistrict(playerId: PlayerId, districtId: DistrictId): boolean {
    return districtById(districtId).propertyIds.every(
      (propertyId) => this.property(propertyId).ownerId === playerId,
    );
  }

  private completedDistrictCount(playerId: PlayerId): number {
    return DISTRICTS.filter((district) => this.ownsCompleteDistrict(playerId, district.id)).length;
  }

  private hasEffect(eventId: RentoMatchState['activeEffects'][number]['eventId']): boolean {
    return this.state.activeEffects.some(
      (effect) => effect.eventId === eventId && effect.roundsRemaining > 0,
    );
  }

  private pickRandomUnownedProperty(): string | null {
    const unowned = PROPERTIES.filter((definition) => this.property(definition.id).ownerId === null);
    return unowned.length ? unowned[this.randomInt(0, unowned.length - 1)].id : null;
  }

  private isCollateral(propertyId: string): boolean {
    return this.state.players.some((player) =>
      player.loans.some((loan) => loan.collateralPropertyIds.includes(propertyId)),
    );
  }

  private requireActive(playerId: PlayerId): RentoPlayerState {
    const player = this.player(playerId);
    if (player.id !== this.activePlayer.id) throw new Error('It is another player’s turn.');
    if (player.bankrupt) throw new Error('A bankrupt player cannot act.');
    return player;
  }

  private requireOwnedProperty(player: RentoPlayerState, propertyId: string): RentoPropertyState {
    const property = this.property(propertyId);
    if (property.ownerId !== player.id) throw new Error(`${player.name} does not own this property.`);
    return property;
  }

  private requireAuctionBidder(playerId: PlayerId): RentoAuctionState {
    const auction = this.state.auction;
    if (!auction || auction.activeBidderId !== playerId) throw new Error('It is another bidder’s decision.');
    return auction;
  }

  private requireCash(player: RentoPlayerState, amount: number): void {
    if (player.cash < amount) throw new Error(`${player.name} needs $${amount}.`);
  }

  private requireWholePositiveAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Enter a positive whole-dollar amount.');
  }

  private requirePhase(phase: RentoMatchState['phase']): void {
    if (this.state.phase !== phase) throw new Error(`Expected ${phase}, found ${this.state.phase}.`);
  }

  private requireManagementPhase(): void {
    if (this.state.phase !== 'awaitingRoll' && this.state.phase !== 'turnActions') {
      throw new Error('Financial actions are unavailable during this decision.');
    }
  }

  private random(): number {
    let value = this.state.rngState >>> 0 || 0xa341316c;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state.rngState = value >>> 0;
    this.state.rngCalls++;
    return this.state.rngState / 0x1_0000_0000;
  }

  private randomInt(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.random() * (maximum - minimum + 1));
  }

  private log(message: string): void {
    this.state.activityLog.unshift(message);
    this.state.activityLog = this.state.activityLog.slice(0, 80);
  }

  private assertInvariants(): void {
    if (this.state.players.length < 1 || this.state.players.length > 4) {
      throw new Error('Invalid player count.');
    }
    for (const player of this.state.players) {
      if (player.cash < 0 || player.position < 0 || player.position >= BOARD_TILES.length) {
        throw new Error(`Invalid state for player ${player.id}.`);
      }
      if (new Set(player.propertiesOwned).size !== player.propertiesOwned.length) {
        throw new Error(`Player ${player.id} has duplicate properties.`);
      }
      for (const propertyId of player.propertiesOwned) {
        if (this.property(propertyId).ownerId !== player.id) throw new Error('Property ownership is inconsistent.');
      }
    }
    for (const property of Object.values(this.state.properties)) {
      if (property.prestige < 0 || property.prestige > 5) throw new Error('Invalid Prestige level.');
      if (
        property.ownerId !== null &&
        !this.player(property.ownerId).propertiesOwned.includes(property.id)
      ) {
        throw new Error('Property owner does not reference the property.');
      }
    }
  }
}

export const isValidRentoState = (value: unknown): value is RentoMatchState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<RentoMatchState>;
  return (
    state.schemaVersion === RENTO_SCHEMA_VERSION &&
    typeof state.seed === 'number' &&
    typeof state.rngState === 'number' &&
    Array.isArray(state.players) &&
    state.players.length >= 1 &&
    state.players.length <= 4 &&
    Array.isArray(state.turnOrder) &&
    state.turnOrder.length === state.players.length &&
    !!state.properties &&
    typeof state.properties === 'object' &&
    PROPERTIES.every((definition) => definition.id in (state.properties as object)) &&
    typeof state.phase === 'string' &&
    ['awaitingRoll', 'propertyDecision', 'turnActions', 'auction', 'tradeResponse', 'finished'].includes(
      state.phase,
    ) &&
    Array.isArray(state.commandLog)
  );
};

export const createEmptyTradeAssets = emptyTradeAssets;
