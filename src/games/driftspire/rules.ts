import {
  AMBITIONS,
  COMMISSIONS,
  DISTRICTS,
  GUILDS,
  ORDINANCES,
  SHOWCASES,
  SPOTLIGHTS,
  ambitionById,
  commissionById,
  districtById,
  guildById,
  ordinanceById,
} from './content';
import {
  DRIFTSPIRE_SCHEMA_VERSION,
  type ActRules,
  type BoardTileState,
  type CommissionMetric,
  type CreateMatchOptions,
  type DriftspireMatchState,
  type DriftspirePlayerState,
  type PactProposal,
  type SiteAction,
  type VentureState,
  type VentureTag,
} from './types';

const defaultActRules = (): ActRules => ({
  discountedTags: [],
  routeBonus: 0,
  commissionCoinBonus: 0,
  dividendBonusTags: [],
  acceptedPactFavorBonus: 0,
  gatherBonus: 0,
  upgradeCoinBonus: 0,
});

const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const deterministicShuffle = <T>(items: readonly T[], seed: number): T[] => {
  const result = [...items];
  const random = createRandom(seed);
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
};

const metricValue = (player: DriftspirePlayerState, metric: CommissionMetric): number =>
  player.stats[metric] as number;

const pushLog = (state: DriftspireMatchState, message: string): void => {
  state.log.unshift(message);
  state.log = state.log.slice(0, 7);
};

const createStats = (startingDistrictId: string): DriftspirePlayerState['stats'] => ({
  districts: 1,
  investments: 0,
  pacts: 0,
  landmarks: 0,
  commissions: 0,
  favorSpent: 0,
  stewardships: 0,
  ventureTags: 0,
  visitedDistrictIds: [startingDistrictId],
  fundedTags: [],
});

const createDiceDeck = (seed: number): number[] => {
  const random = createRandom(seed ^ 0xd1ce);
  return Array.from({ length: 128 }, () => 1 + Math.floor(random() * 6));
};

export const buildBoardTiles = (districtOrder: string[]): BoardTileState[] => {
  const tiles: BoardTileState[] = [
    { id: 'grand-gate', districtId: districtOrder[0], kind: 'start' },
  ];
  districtOrder.forEach((districtId, districtIndex) => {
    const rewardKind = districtIndex % 2 === 0 ? 'coin' : 'favor';
    tiles.push(
      { id: `${districtId}-venture`, districtId, kind: 'venture' },
      { id: `${districtId}-landmark`, districtId, kind: 'landmark' },
      { id: `${districtId}-${rewardKind}`, districtId, kind: rewardKind },
      { id: `${districtId}-commission`, districtId, kind: 'commission' },
    );
  });
  return tiles;
};

const drawCommission = (state: DriftspireMatchState): string | undefined => {
  if (state.commissionCursor >= state.commissionDeck.length) {
    state.commissionDeck = deterministicShuffle(
      state.commissionDeck,
      state.seed ^ (state.round * 65537) ^ state.commissionCursor,
    );
    state.commissionCursor = 0;
  }
  return state.commissionDeck[state.commissionCursor++];
};

const refillCommissions = (state: DriftspireMatchState): void => {
  const target = state.players.length === 2 ? 2 : 3;
  while (state.commissionRow.length < target) {
    const next = drawCommission(state);
    if (!next) break;
    state.commissionRow.push(next);
  }
};

const drawSpotlight = (state: DriftspireMatchState): VentureTag[] => {
  if (state.spotlightCursor >= state.spotlightDeck.length) {
    state.spotlightDeck = deterministicShuffle(
      SPOTLIGHTS,
      state.seed ^ (state.act * 8191) ^ (state.round * 131071),
    );
    state.spotlightCursor = 0;
  }
  return [...state.spotlightDeck[state.spotlightCursor++]];
};

const drawOrdinance = (state: DriftspireMatchState): string => {
  if (state.ordinanceCursor >= state.ordinanceDeck.length) {
    state.ordinanceDeck = deterministicShuffle(
      ORDINANCES.map((item) => item.id),
      state.seed ^ (state.act * 31337),
    );
    state.ordinanceCursor = 0;
  }
  return state.ordinanceDeck[state.ordinanceCursor++];
};

const drawShowcase = (state: DriftspireMatchState): string => {
  if (state.showcaseCursor >= state.showcaseDeck.length) {
    state.showcaseDeck = deterministicShuffle(
      SHOWCASES.map((item) => item.id),
      state.seed ^ (state.act * 524287),
    );
    state.showcaseCursor = 0;
  }
  return state.showcaseDeck[state.showcaseCursor++];
};

const totalCrests = (venture: VentureState): number =>
  Object.values(venture.contributions).reduce((sum, count) => sum + count, 0);

export class DriftspireRules {
  public readonly state: DriftspireMatchState;

  public constructor(state: DriftspireMatchState) {
    if (state.schemaVersion !== DRIFTSPIRE_SCHEMA_VERSION) {
      throw new Error(`Unsupported Driftspire save schema: ${state.schemaVersion}`);
    }
    this.state = state;
  }

  public static create(options: CreateMatchOptions): DriftspireRules {
    if (options.players.length < 2 || options.players.length > 4) {
      throw new Error('Driftspire requires two to four players.');
    }
    const districtCount = 6;
    const districtOrder = deterministicShuffle(
      DISTRICTS.map((district) => district.id),
      options.seed ^ 0x51a7,
    ).slice(0, districtCount);
    const commissionDeck = deterministicShuffle(
      COMMISSIONS.map((item) => item.id),
      options.seed ^ 0xc011,
    );
    const spotlightDeck = deterministicShuffle(SPOTLIGHTS, options.seed ^ 0x5f07);
    const ordinanceDeck = deterministicShuffle(
      ORDINANCES.map((item) => item.id),
      options.seed ^ 0x0ad1,
    );
    const showcaseDeck = deterministicShuffle(
      SHOWCASES.map((item) => item.id),
      options.seed ^ 0x5ca5,
    );
    const ambitionDeck = deterministicShuffle(
      AMBITIONS.map((item) => item.id),
      options.seed ^ 0xa8b1,
    );
    const players: DriftspirePlayerState[] = options.players.map((config, index) => {
      const startingDistrictId = districtOrder[0];
      const player: DriftspirePlayerState = {
        id: config.id,
        name: config.name,
        color: config.color,
        guildId: options.guildIds[index] ?? GUILDS[index % GUILDS.length].id,
        coin: 6,
        favor: 2,
        renown: 0,
        positionDistrictId: startingDistrictId,
        positionTileIndex: 0,
        crestsAvailable: 7,
        nextRollBonus: 0,
        activeCommissions: [],
        ambitionId: ambitionDeck[index],
        guildPowerActUsed: false,
        fundDiscount: 0,
        stats: createStats(startingDistrictId),
      };
      return player;
    });

    const state: DriftspireMatchState = {
      schemaVersion: DRIFTSPIRE_SCHEMA_VERSION,
      seed: options.seed,
      phase: 'roll',
      act: 1,
      round: 1,
      roundInAct: 1,
      players,
      districtOrder,
      districts: Object.fromEntries(
        districtOrder.map((id) => [
          id,
          { id, venture: { branch: null, contributions: {}, level: 0 } },
        ]),
      ),
      boardTiles: buildBoardTiles(districtOrder),
      turnOrder: players.map((player) => player.id),
      turnCursor: 0,
      lastDiceRoll: 1,
      movementRemaining: 0,
      diceDeck: createDiceDeck(options.seed),
      diceCursor: 0,
      pactUsedThisTurn: false,
      pendingPact: null,
      commissionDeck,
      commissionCursor: 0,
      commissionRow: [],
      spotlightDeck,
      spotlightCursor: 2,
      currentSpotlight: [...spotlightDeck[0]],
      nextSpotlight: [...spotlightDeck[1]],
      spotlightChoices: null,
      ordinanceDeck,
      ordinanceCursor: 2,
      ordinanceOptions: [ordinanceDeck[0], ordinanceDeck[1]],
      councilVotes: [],
      councilVoterCursor: 0,
      showcaseDeck,
      showcaseCursor: 0,
      currentShowcaseId: showcaseDeck[0],
      actRules: defaultActRules(),
      log: ['The Grand Festival begins!'],
    };
    const rules = new DriftspireRules(state);
    refillCommissions(state);
    return rules;
  }

  public get activePlayer(): DriftspirePlayerState {
    if (this.state.phase === 'council') {
      return this.player(this.state.players[this.state.councilVoterCursor]?.id);
    }
    return this.player(this.state.turnOrder[this.state.turnCursor]);
  }

  public get currentCouncilVoter(): DriftspirePlayerState {
    return this.player(this.state.players[this.state.councilVoterCursor]?.id);
  }

  public player(playerId: number): DriftspirePlayerState {
    const player = this.state.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new Error(`Unknown Driftspire player ${playerId}.`);
    return player;
  }

  public rollDice(playerId: number): number {
    this.requirePhase('roll');
    const player = this.requireActivePlayer(playerId);
    if (this.state.diceCursor >= this.state.diceDeck.length) {
      this.state.diceDeck = createDiceDeck(this.state.seed ^ (this.state.round * 65537));
      this.state.diceCursor = 0;
    }
    const rolled = this.state.diceDeck[this.state.diceCursor++];
    let bonus = 0;
    if (player.guildId === 'windrunners' && !player.guildPowerActUsed) {
      bonus++;
      player.guildPowerActUsed = true;
    }
    bonus += player.nextRollBonus + this.state.actRules.routeBonus;
    player.nextRollBonus = 0;
    const movement = Math.max(1, Math.min(8, rolled + bonus));
    this.state.lastDiceRoll = rolled;
    this.state.movementRemaining = movement;
    this.state.phase = 'moving';
    pushLog(this.state, `${player.name} rolls ${rolled}${bonus > 0 ? ` + ${bonus} bonus` : ''}!`);
    return rolled;
  }

  public advanceMovementStep(): void {
    this.requirePhase('moving');
    const player = this.activePlayer;
    if (this.state.movementRemaining <= 0) throw new Error('No movement remains.');
    const previous = player.positionTileIndex;
    player.positionTileIndex = (player.positionTileIndex + 1) % this.state.boardTiles.length;
    if (player.positionTileIndex < previous) {
      player.coin += 2;
      pushLog(this.state, `${player.name} passes the Grand Gate and gains 2 Coin.`);
    }
    this.state.movementRemaining--;
    const tile = this.state.boardTiles[player.positionTileIndex];
    player.positionDistrictId = tile.districtId;
    if (this.state.movementRemaining > 0) return;

    this.recordEvent(player, 'districts', player.positionDistrictId);
    pushLog(this.state, `${player.name} lands on ${this.tileLabel(tile.kind)} in ${districtById(tile.districtId).name}.`);
    if (tile.kind === 'coin') {
      player.coin += 2;
      pushLog(this.state, `${player.name} collects 2 Coin.`);
      this.completeTurn();
    } else if (tile.kind === 'favor') {
      player.favor++;
      pushLog(this.state, `${player.name} gains 1 Favor.`);
      this.completeTurn();
    } else if (tile.kind === 'start') {
      player.favor++;
      pushLog(this.state, `${player.name} receives a Grand Gate welcome Favor.`);
      this.completeTurn();
    } else {
      this.state.phase = 'tileAction';
    }
  }

  public performAction(
    playerId: number,
    action: SiteAction,
    optionIndex = 0,
  ): void {
    this.requirePhase('tileAction');
    const player = this.requireActivePlayer(playerId);
    if (!this.legalActions(playerId).includes(action)) {
      throw new Error('That action is not available on this tile.');
    }
    const district = this.state.districts[player.positionDistrictId];
    if (action === 'fund') {
      const definition = districtById(district.id);
      const branch = definition.branches[Math.max(0, Math.min(1, optionIndex))];
      this.fundCrest(player, district, branch, 2);
    } else if (action === 'claim') {
      this.claimCommission(player, optionIndex);
    } else if (action === 'landmark') {
      this.useLandmark(player, district.id);
    } else {
      const amount = 2 + this.state.actRules.gatherBonus;
      player.coin += amount;
      pushLog(this.state, `${player.name} gathers ${amount} Coin.`);
    }
    this.completeTurn();
  }

  public proposePact(playerId: number, proposal: PactProposal): void {
    this.requirePhase('tileAction');
    const proposer = this.requireActivePlayer(playerId);
    if (this.state.pactUsedThisTurn) throw new Error('Only one Pact may be proposed each turn.');
    const partner = this.player(proposal.partnerId);
    if (partner.id === proposer.id) throw new Error('Choose another guild for the Pact.');
    if (
      proposal.type === 'jointVenture' &&
      partner.positionDistrictId !== proposer.positionDistrictId
    ) {
      throw new Error('Joint Venture partners must be in the same district.');
    }
    if (
      proposal.type === 'commissionAlliance' &&
      !proposer.activeCommissions.some((item) => item.allyPlayerId === undefined)
    ) {
      throw new Error('Claim an unallied Commission first.');
    }
    if (proposal.type === 'endorsement' && proposer.coin < 2) {
      throw new Error('An Endorsement requires two Coin.');
    }
    this.state.pendingPact = {
      id: `pact-${this.state.round}-${proposer.id}-${partner.id}`,
      type: proposal.type,
      proposerId: proposer.id,
      partnerId: partner.id,
      districtId: proposer.positionDistrictId,
      proposalIndex: proposal.proposalIndex ?? 0,
    };
    this.state.pactUsedThisTurn = true;
    this.state.phase = 'pactResponse';
    pushLog(this.state, `${proposer.name} offers ${partner.name} a ${this.pactLabel(proposal.type)}.`);
  }

  public respondToPact(playerId: number, accepted: boolean): void {
    this.requirePhase('pactResponse');
    const pact = this.state.pendingPact;
    if (!pact || pact.partnerId !== playerId) throw new Error('This Pact belongs to another guild.');
    const proposer = this.player(pact.proposerId);
    const partner = this.player(pact.partnerId);
    let completed = false;
    if (accepted) {
      if (pact.type === 'jointVenture') {
        const district = this.state.districts[pact.districtId];
        const capacity = this.ventureCapacity;
        const enoughSpace = totalCrests(district.venture) <= capacity - 2;
        const proposerCount = district.venture.contributions[proposer.id] ?? 0;
        const partnerCount = district.venture.contributions[partner.id] ?? 0;
        if (
          proposer.coin >= 1 &&
          partner.coin >= 1 &&
          proposer.crestsAvailable > 0 &&
          partner.crestsAvailable > 0 &&
          proposerCount < 3 &&
          partnerCount < 3 &&
          enoughSpace
        ) {
          const branch = district.venture.branch ?? districtById(district.id).branches[0];
          this.fundCrest(proposer, district, branch, 1, false);
          this.fundCrest(partner, district, branch, 1, false);
          completed = true;
        }
      } else if (pact.type === 'endorsement' && proposer.coin >= 2) {
        proposer.coin -= 2;
        partner.coin += 2;
        partner.endorsementProposalIndex = pact.proposalIndex ?? 0;
        partner.endorsementSponsorId = proposer.id;
        completed = true;
      } else if (pact.type === 'commissionAlliance') {
        const commission = proposer.activeCommissions.find(
          (item) => item.allyPlayerId === undefined,
        );
        if (commission) {
          commission.allyPlayerId = partner.id;
          completed = true;
        }
      }
    }
    if (completed) {
      this.recordEvent(proposer, 'pacts');
      this.recordEvent(partner, 'pacts');
      const chorusBonus =
        proposer.guildId === 'chorus-envoys' && !proposer.guildPowerActUsed ? 1 : 0;
      const partnerChorusBonus =
        partner.guildId === 'chorus-envoys' && !partner.guildPowerActUsed ? 1 : 0;
      const bonus = this.state.actRules.acceptedPactFavorBonus + chorusBonus + partnerChorusBonus;
      if (bonus > 0) {
        proposer.favor += bonus;
        partner.favor += bonus;
      }
      if (chorusBonus > 0) proposer.guildPowerActUsed = true;
      if (partnerChorusBonus > 0) partner.guildPowerActUsed = true;
      pushLog(this.state, `${partner.name} accepts. The Pact is sealed!`);
    } else {
      pushLog(this.state, accepted ? 'The Pact could not be completed.' : `${partner.name} politely declines.`);
    }
    this.state.pendingPact = null;
    this.state.phase = 'tileAction';
  }

  public castCouncilVote(playerId: number, proposalIndex: number, favorSpent: number): void {
    this.requirePhase('council');
    const player = this.currentCouncilVoter;
    if (player.id !== playerId) throw new Error('Another guild is voting.');
    const committedChoice = player.endorsementProposalIndex;
    const choice = committedChoice ?? Math.max(0, Math.min(1, proposalIndex));
    const spend = Math.max(0, Math.min(2, Math.floor(favorSpent), player.favor));
    player.favor -= spend;
    this.recordEvent(player, 'favorSpent', undefined, spend);
    this.state.councilVotes.push({ playerId, proposalIndex: choice, favorSpent: spend });
    this.state.councilVoterCursor++;
    if (this.state.councilVoterCursor >= this.state.players.length) this.resolveCouncil();
  }

  public resolveShowcase(scores: Record<number, number>): number[] {
    this.requirePhase('showcase');
    const ranked = [...this.state.players]
      .sort((left, right) => (scores[right.id] ?? 0) - (scores[left.id] ?? 0) || left.id - right.id)
      .map((player) => player.id);
    this.state.players.forEach((player) => {
      player.coin += 1;
    });
    const runnerUp = this.player(ranked[1] ?? ranked[0]);
    runnerUp.favor += 1;
    const winner = this.player(ranked[0]);
    this.state.showcaseWinnerId = winner.id;
    pushLog(this.state, `${winner.name} wins ${this.currentShowcase.title}!`);
    if (this.state.act < 3) {
      this.state.spotlightChoices = [drawSpotlight(this.state), drawSpotlight(this.state)];
      this.state.phase = 'spotlightChoice';
    } else {
      const awards = [3, 2, 1, 0];
      ranked.forEach((playerId, index) => {
        this.player(playerId).renown += awards[index] ?? 0;
      });
      this.scoreAmbitions();
      this.state.phase = 'finished';
    }
    return ranked;
  }

  public chooseSpotlight(playerId: number, choiceIndex: number): void {
    this.requirePhase('spotlightChoice');
    if (playerId !== this.state.showcaseWinnerId) throw new Error('Only the Showcase winner chooses.');
    const choices = this.state.spotlightChoices;
    if (!choices) throw new Error('No Spotlight choice is available.');
    const selected = choices[Math.max(0, Math.min(1, choiceIndex))];
    this.state.act++;
    this.state.round++;
    this.state.roundInAct = 1;
    this.state.currentSpotlight = [...selected];
    this.state.nextSpotlight = drawSpotlight(this.state);
    this.state.spotlightChoices = null;
    this.state.showcaseWinnerId = undefined;
    this.state.players.forEach((player) => {
      player.guildPowerActUsed = false;
      player.fundDiscount = 0;
    });
    this.beginRound();
  }

  public getAmbitionScore(playerId: number): number {
    const player = this.player(playerId);
    const definition = ambitionById(player.ambitionId);
    const value = metricValue(player, definition.metric);
    if (value >= definition.thresholds[2]) return 6;
    if (value >= definition.thresholds[1]) return 4;
    if (value >= definition.thresholds[0]) return 2;
    return 0;
  }

  public standings(): Array<{ playerId: number; score: number }> {
    return [...this.state.players]
      .sort(
        (left, right) =>
          right.renown - left.renown ||
          right.stats.commissions - left.stats.commissions ||
          right.favor - left.favor ||
          left.id - right.id,
      )
      .map((player) => ({ playerId: player.id, score: player.renown }));
  }

  public fundingCost(playerId: number, branch: VentureTag): number {
    const player = this.player(playerId);
    let cost = 2 - player.fundDiscount;
    if (this.state.actRules.discountedTags.includes(branch)) cost--;
    if (player.guildId === 'lanternmakers' && !player.guildPowerActUsed) cost--;
    return Math.max(1, cost);
  }

  public legalActions(playerId: number): SiteAction[] {
    const player = this.player(playerId);
    const tile = this.state.boardTiles[player.positionTileIndex];
    const district = this.state.districts[player.positionDistrictId];
    const definition = districtById(district.id);
    const possibleBranches = district.venture.branch
      ? [district.venture.branch]
      : definition.branches;
    const canAffordVenture = possibleBranches.some(
      (branch) => player.coin >= this.fundingCost(player.id, branch),
    );
    const actions: SiteAction[] = ['gather'];
    if (
      tile.kind === 'venture' &&
      player.crestsAvailable > 0 &&
      totalCrests(district.venture) < this.ventureCapacity &&
      (district.venture.contributions[player.id] ?? 0) < 3 &&
      canAffordVenture
    ) {
      actions.unshift('fund');
    }
    if (
      tile.kind === 'commission' &&
      player.activeCommissions.length < 2 &&
      this.state.commissionRow.length > 0
    ) {
      actions.splice(Math.min(1, actions.length), 0, 'claim');
    }
    if (tile.kind === 'landmark') actions.unshift('landmark');
    return actions;
  }

  private get ventureCapacity(): number {
    return this.state.players.length === 2 ? 4 : 5;
  }

  private get currentShowcase() {
    return SHOWCASES.find((item) => item.id === this.state.currentShowcaseId) ?? SHOWCASES[0];
  }

  private requirePhase(phase: DriftspireMatchState['phase']): void {
    if (this.state.phase !== phase) {
      throw new Error(`Expected Driftspire phase "${phase}", received "${this.state.phase}".`);
    }
  }

  private requireActivePlayer(playerId: number): DriftspirePlayerState {
    const player = this.activePlayer;
    if (player.id !== playerId) throw new Error(`It is ${player.name}'s turn.`);
    return player;
  }

  private fundCrest(
    player: DriftspirePlayerState,
    district: DriftspireMatchState['districts'][string],
    branch: VentureTag,
    baseCost: number,
    useDiscounts = true,
  ): void {
    const definition = districtById(district.id);
    if (!definition.branches.includes(branch)) throw new Error('That venture branch is unavailable here.');
    if (district.venture.branch && district.venture.branch !== branch) {
      throw new Error('This venture already has a different branch.');
    }
    if (totalCrests(district.venture) >= this.ventureCapacity) throw new Error('This venture is complete.');
    if ((district.venture.contributions[player.id] ?? 0) >= 3) {
      throw new Error('A guild may place at most three Crests in one venture.');
    }
    if (player.crestsAvailable < 1) throw new Error('No Guild Crests remain.');

    const usedLanternPower =
      useDiscounts && player.guildId === 'lanternmakers' && !player.guildPowerActUsed;
    const cost = useDiscounts ? this.fundingCost(player.id, branch) : Math.max(1, baseCost);
    if (player.coin < cost) throw new Error(`Funding requires ${cost} Coin.`);
    if (usedLanternPower) player.guildPowerActUsed = true;
    player.coin -= cost;
    player.fundDiscount = 0;
    player.crestsAvailable--;
    district.venture.branch = district.venture.branch ?? branch;
    district.venture.contributions[player.id] =
      (district.venture.contributions[player.id] ?? 0) + 1;
    this.recordEvent(player, 'investments');
    this.recordEvent(player, 'ventureTags', branch);

    const crestCount = totalCrests(district.venture);
    const nextLevel = crestCount >= this.ventureCapacity ? 2 : crestCount >= 3 ? 1 : 0;
    if (nextLevel > district.venture.level) {
      district.venture.level = nextLevel;
      const upgradePayout = 1 + this.state.actRules.upgradeCoinBonus;
      Object.keys(district.venture.contributions).forEach((id) => {
        this.player(Number(id)).coin += upgradePayout;
      });
      if (player.guildId === 'gearwright-union') player.coin++;
      pushLog(this.state, `${definition.name} reaches venture level ${nextLevel + 1}!`);
    } else {
      pushLog(this.state, `${player.name} funds ${definition.name}'s ${branch} venture.`);
    }
  }

  private claimCommission(player: DriftspirePlayerState, rowIndex: number): void {
    if (player.activeCommissions.length >= 2) throw new Error('Complete a Commission before claiming another.');
    const boundedIndex = Math.max(0, Math.min(this.state.commissionRow.length - 1, rowIndex));
    const id = this.state.commissionRow.splice(boundedIndex, 1)[0];
    if (!id) throw new Error('No Commission is available.');
    player.activeCommissions.push({ id, progress: 0, seenKeys: [] });
    if (player.guildId === 'star-scribes') player.coin++;
    refillCommissions(this.state);
    pushLog(this.state, `${player.name} claims "${commissionById(id).title}".`);
  }

  private useLandmark(player: DriftspirePlayerState, districtId: string): void {
    if (districtId === 'zephyr-docks') {
      player.nextRollBonus = Math.max(player.nextRollBonus, 1);
    } else if (districtId === 'lantern-row') {
      if (player.coin >= 2) {
        player.coin -= 2;
        player.favor += 2;
      } else {
        player.favor++;
      }
    } else if (districtId === 'geargarden') {
      player.fundDiscount = Math.max(player.fundDiscount, 1);
    } else if (districtId === 'cloud-conservatory') {
      const established = Object.values(this.state.districts).filter(
        (district) => (district.venture.contributions[player.id] ?? 0) > 0,
      ).length;
      player.coin += Math.max(1, Math.min(2, established));
    } else if (districtId === 'astral-archive') {
      this.advanceCommissions(player);
    } else if (districtId === 'chorus-plaza') {
      player.favor += 2;
    } else if (districtId === 'ember-bazaar') {
      if (player.favor > 0) {
        player.favor--;
        player.coin += 3;
      } else {
        player.coin += 2;
      }
    } else if (districtId === 'stormworks') {
      player.coin += 3;
    }
    this.recordEvent(player, 'landmarks');
    pushLog(this.state, `${player.name} visits the ${districtById(districtId).name} Landmark.`);
  }

  private advanceCommissions(player: DriftspirePlayerState): void {
    const completed: string[] = [];
    player.activeCommissions.forEach((active) => {
      active.progress++;
      if (active.progress >= commissionById(active.id).target) completed.push(active.id);
    });
    completed.forEach((id) => this.completeCommission(player, id));
  }

  private recordEvent(
    player: DriftspirePlayerState,
    metric: CommissionMetric,
    uniqueKey?: string,
    amount = 1,
  ): void {
    if (metric === 'districts' && uniqueKey) {
      if (!player.stats.visitedDistrictIds.includes(uniqueKey)) {
        player.stats.visitedDistrictIds.push(uniqueKey);
        player.stats.districts = player.stats.visitedDistrictIds.length;
      }
    } else if (metric === 'ventureTags' && uniqueKey) {
      const tag = uniqueKey as VentureTag;
      if (!player.stats.fundedTags.includes(tag)) {
        player.stats.fundedTags.push(tag);
        player.stats.ventureTags = player.stats.fundedTags.length;
      }
    } else {
      const current = player.stats[metric];
      if (typeof current === 'number') player.stats[metric] = current + amount;
    }

    const completed: string[] = [];
    player.activeCommissions.forEach((active) => {
      const definition = commissionById(active.id);
      if (definition.metric !== metric) return;
      if (definition.unique && uniqueKey) {
        if (active.seenKeys.includes(uniqueKey)) return;
        active.seenKeys.push(uniqueKey);
        active.progress = active.seenKeys.length;
      } else {
        active.progress += amount;
      }
      if (active.progress >= definition.target) completed.push(active.id);
    });
    completed.forEach((id) => this.completeCommission(player, id));
  }

  private completeCommission(player: DriftspirePlayerState, id: string): void {
    const index = player.activeCommissions.findIndex((active) => active.id === id);
    if (index < 0) return;
    const active = player.activeCommissions[index];
    player.activeCommissions.splice(index, 1);
    const definition = commissionById(id);
    player.renown += 3;
    if (definition.reward === 'favor') player.favor++;
    else player.coin += 2 + this.state.actRules.commissionCoinBonus;
    if (active.allyPlayerId !== undefined) {
      player.coin++;
      this.player(active.allyPlayerId).renown++;
    }
    pushLog(this.state, `${player.name} completes "${definition.title}" for 3 Renown.`);
    this.recordEvent(player, 'commissions');
  }

  private completeTurn(): void {
    if (this.state.turnCursor < this.state.turnOrder.length - 1) {
      this.state.turnCursor++;
      this.state.pactUsedThisTurn = false;
      this.state.phase = 'roll';
      return;
    }
    this.resolveRound();
  }

  private resolveRound(): void {
    pushLog(this.state, `Round ${this.state.round} Spotlight pays out.`);
    Object.values(this.state.districts).forEach((district) => {
      const venture = district.venture;
      if (!venture.branch || !this.state.currentSpotlight.includes(venture.branch)) return;
      const entries = Object.entries(venture.contributions).filter(([, count]) => count > 0);
      entries.forEach(([id, count]) => {
        const bonus = this.state.actRules.dividendBonusTags.includes(venture.branch!) ? 1 : 0;
        this.player(Number(id)).coin += count + bonus;
      });
      const maximum = Math.max(0, ...entries.map(([, count]) => count));
      const leaders = entries.filter(([, count]) => count === maximum);
      if (leaders.length === 1 && maximum > 0) {
        const steward = this.player(Number(leaders[0][0]));
        steward.renown++;
        this.recordEvent(steward, 'stewardships');
      }
    });
    if (this.state.roundInAct === 1) {
      this.state.round++;
      this.state.roundInAct = 2;
      this.state.currentSpotlight = [...this.state.nextSpotlight];
      this.state.nextSpotlight = drawSpotlight(this.state);
      this.beginRound();
    } else {
      this.state.phase = 'council';
      this.state.councilVotes = [];
      this.state.councilVoterCursor = 0;
    }
  }

  private beginRound(): void {
    this.state.turnOrder = [...this.state.players]
      .sort(
        (left, right) =>
          left.renown - right.renown || left.coin - right.coin || left.id - right.id,
      )
      .map((player) => player.id);
    const trailing = this.player(this.state.turnOrder[0]);
    if (this.state.roundInAct === 1) trailing.favor++;
    this.state.turnCursor = 0;
    this.state.pactUsedThisTurn = false;
    this.state.phase = 'roll';
  }

  private resolveCouncil(): void {
    const totals = [0, 0];
    this.state.councilVotes.forEach((vote) => {
      totals[vote.proposalIndex] += 1 + vote.favorSpent;
    });
    let winnerIndex = totals[1] > totals[0] ? 1 : 0;
    if (totals[0] === totals[1]) {
      const lowest = [...this.state.players].sort(
        (left, right) => left.renown - right.renown || left.id - right.id,
      )[0];
      winnerIndex =
        this.state.councilVotes.find((vote) => vote.playerId === lowest.id)?.proposalIndex ?? 0;
    }
    const ordinance = ordinanceById(this.state.ordinanceOptions[winnerIndex]);
    this.state.actRules = defaultActRules();
    if (ordinance.effect === 'craftGrant') this.state.actRules.discountedTags.push('Craft');
    else if (ordinance.effect === 'artsGrant') this.state.actRules.discountedTags.push('Arts');
    else if (ordinance.effect === 'tailwind' || ordinance.effect === 'brightRoutes') {
      this.state.actRules.routeBonus = 1;
    } else if (ordinance.effect === 'openArchives' || ordinance.effect === 'grandCommissions') {
      this.state.actRules.commissionCoinBonus = 1;
    } else if (ordinance.effect === 'civicDividend') {
      this.state.actRules.dividendBonusTags.push('Civic');
    } else if (ordinance.effect === 'natureDividend') {
      this.state.actRules.dividendBonusTags.push('Nature');
    } else if (ordinance.effect === 'pactFestival') {
      this.state.actRules.acceptedPactFavorBonus = 1;
    } else if (ordinance.effect === 'marketHoliday') {
      this.state.actRules.gatherBonus = 1;
    } else if (ordinance.effect === 'sharedStages') {
      this.state.actRules.upgradeCoinBonus = 1;
    } else if (ordinance.effect === 'favorFair') {
      this.state.players.forEach((player) => player.favor++);
    }
    this.rotateCity(winnerIndex);
    this.state.players.forEach((player) => {
      if (player.guildId === 'verdant-circle' && player.stats.investments > 0) player.favor++;
      player.endorsementProposalIndex = undefined;
      player.endorsementSponsorId = undefined;
    });
    this.state.ordinanceOptions = [drawOrdinance(this.state), drawOrdinance(this.state)];
    this.state.currentShowcaseId = drawShowcase(this.state);
    this.state.phase = 'showcase';
    pushLog(this.state, `Council passes ${ordinance.title}. The city shifts!`);
  }

  private rotateCity(winnerIndex: number): void {
    const length = this.state.districtOrder.length;
    const first = (this.state.act + winnerIndex) % length;
    const second = (first + 2 + winnerIndex) % length;
    [this.state.districtOrder[first], this.state.districtOrder[second]] = [
      this.state.districtOrder[second],
      this.state.districtOrder[first],
    ];
    this.state.boardTiles = buildBoardTiles(this.state.districtOrder);
    this.state.players.forEach((player) => {
      player.positionDistrictId =
        this.state.boardTiles[player.positionTileIndex]?.districtId ?? this.state.districtOrder[0];
    });
  }

  private scoreAmbitions(): void {
    this.state.players.forEach((player) => {
      const points = this.getAmbitionScore(player.id);
      player.renown += points;
      pushLog(this.state, `${player.name}'s ${ambitionById(player.ambitionId).title} earns ${points} Renown.`);
    });
  }

  private pactLabel(type: PactProposal['type']): string {
    if (type === 'jointVenture') return 'Joint Venture';
    if (type === 'endorsement') return 'Council Endorsement';
    return 'Commission Alliance';
  }

  private tileLabel(kind: BoardTileState['kind']): string {
    if (kind === 'venture') return 'a Venture tile';
    if (kind === 'commission') return 'a Commission tile';
    if (kind === 'landmark') return 'a Landmark tile';
    if (kind === 'coin') return 'a Coin tile';
    if (kind === 'favor') return 'a Favor tile';
    return 'the Grand Gate';
  }
}

export const isValidDriftspireState = (value: unknown): value is DriftspireMatchState => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DriftspireMatchState>;
  return (
    candidate.schemaVersion === DRIFTSPIRE_SCHEMA_VERSION &&
    Array.isArray(candidate.players) &&
    candidate.players.length >= 2 &&
    candidate.players.length <= 4 &&
    Array.isArray(candidate.districtOrder) &&
    Array.isArray(candidate.boardTiles) &&
    candidate.boardTiles.length === 25 &&
    typeof candidate.seed === 'number'
  );
};

export const guildPowerSummary = (player: DriftspirePlayerState): string =>
  guildById(player.guildId).description;
