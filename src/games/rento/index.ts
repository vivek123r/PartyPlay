import { Container, Graphics } from 'pixi.js';
import type { GameContext, GameModule, InternalGameState, PlayerConfig } from '@runtime/types';
import { remoteControllerService } from '@services/remote/RemoteControllerService';
import { selectAiIntent } from './ai';
import {
  BOARD_TILES,
  DISTRICTS,
  INVESTMENTS,
  PROPERTIES,
  districtById,
  eventById,
  missionById,
  propertyById,
} from './content';
import { createSaveEnvelope, parseSaveEnvelope } from './persistence';
import { RentoRules, createEmptyTradeAssets } from './rules';
import {
  RENTO_SAVE_KEY,
  type DiceType,
  type RentoIntent,
  type RentoMatchState,
  type RentoPlayerState,
} from './types';
import {
  RentoBoardView,
  RentoDiceConsole,
  RentoEffects,
  RentoHud,
  RentoModal,
  RENT0_THEME,
  type BoardTileView,
  type OverlayAction,
  type PropertyView,
  type RentoOverlayModel,
  type TokenView,
} from './ui';

type BootMode = 'resumePrompt' | 'match';
type ViewMode =
  | 'board'
  | 'manage'
  | 'properties'
  | 'propertyMore'
  | 'investments'
  | 'market'
  | 'bank'
  | 'trade'
  | 'dice'
  | 'rivals';

interface UiAction {
  id: string;
  label: string;
  enabled?: boolean;
  accent?: number;
}

interface MovementAnimation {
  playerId: number;
  from: number;
  path: number[];
  cursor: number;
  progress: number;
}

const parseColor = (color: string | undefined, fallback = 0xffffff): number => {
  if (!color) return fallback;
  const parsed = Number.parseInt(color.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const wrap = (value: number, length: number): number =>
  length <= 0 ? 0 : (value % length + length) % length;

const dollars = (value: number): string => `$${Math.round(value).toLocaleString()}`;

const isRoundLimit = (value: unknown): value is 20 | 30 | 40 =>
  value === 20 || value === 30 || value === 40;

export default class RentoGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private root!: Container;
  private board!: RentoBoardView;
  private diceConsole!: RentoDiceConsole;
  private hud!: RentoHud;
  private modal!: RentoModal;
  private effects!: RentoEffects;
  private rules!: RentoRules;
  private pendingSave: RentoMatchState | null = null;
  private bootMode: BootMode = 'match';
  private viewMode: ViewMode = 'board';
  private actionIndex = 0;
  private optionIndex = 0;
  private currentActions: UiAction[] = [];
  private movement: MovementAnimation | null = null;
  private pendingMovement: MovementAnimation | null = null;
  private readonly movingCoordinates = new Map<number, { x: number; y: number; facing: -1 | 1 }>();
  private displayedPositions = new Map<number, number>();
  private selectedDice: DiceType = 'normal';
  private lastDiceValues: number[] = [1];
  private diceRollRemaining = 0;
  private diceAnimationFrame = 0;
  private decisionKey = '';
  private turnElapsed = 0;
  private aiElapsed = 0;
  private aiManagementActions = 0;
  private aiTurnKey = '';
  private errorMessage = '';
  private errorRemaining = 0;
  private gameOverEmitted = false;
  private seed = 1;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.seed = typeof context.modifiers.seed === 'number'
      ? context.modifiers.seed
      : Math.floor(context.random() * 0x7fffffff);
    this.rules = this.createNewRules();

    const saved = parseSaveEnvelope(context.storage.get<unknown>(RENTO_SAVE_KEY, null));
    if (
      saved &&
      saved.state.phase !== 'finished' &&
      this.saveMatchesPlayers(saved.state, context.players)
    ) {
      this.pendingSave = saved.state;
      this.bootMode = 'resumePrompt';
    }

    this.root = new Container();
    const backdrop = new Graphics()
      .rect(0, 0, 960, 540)
      .fill({ color: RENT0_THEME.night })
      .rect(7, 7, 946, 526)
      .stroke({ color: RENT0_THEME.goldDark, width: 1, alpha: 0.5 });
    for (let x = 16; x < 960; x += 32) {
      backdrop.moveTo(x, 0).lineTo(x, 540).stroke({ color: 0x173148, width: 1, alpha: 0.12 });
    }
    for (let y = 16; y < 540; y += 32) {
      backdrop.moveTo(0, y).lineTo(960, y).stroke({ color: 0x173148, width: 1, alpha: 0.12 });
    }

    this.board = new RentoBoardView();
    await this.board.loadPremiumArt();
    this.diceConsole = new RentoDiceConsole();
    this.effects = new RentoEffects();
    this.hud = new RentoHud();
    this.modal = new RentoModal();
    this.root.addChild(backdrop, this.board, this.diceConsole, this.effects, this.hud, this.modal);
    this.ctx.renderer.stage.addChild(this.root);
    this.ctx.renderer.canvas.addEventListener('pointerup', this.onPointerUp);
    this.syncDisplayedPositions();
    this.render();
    this.state = 'Ready';
  }

  public start(): void {
    this.state = 'Playing';
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;
    this.effects.update(dt);
    this.errorRemaining = Math.max(0, this.errorRemaining - dt);

    for (const player of this.ctx.players) {
      if (this.ctx.input.getPlayer(player.id).isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
        return;
      }
    }

    if (this.diceRollRemaining > 0) {
      this.updateDiceRoll(dt);
      return;
    }

    if (this.movement) {
      this.updateMovement(dt);
      return;
    }

    const key = this.currentDecisionKey();
    if (key !== this.decisionKey) {
      this.decisionKey = key;
      this.turnElapsed = 0;
      this.actionIndex = 0;
      this.optionIndex = 0;
      if (this.rules.state.phase !== 'awaitingRoll' && this.rules.state.phase !== 'turnActions') {
        this.viewMode = 'board';
      }
      this.render();
    }

    const decisionPlayer = this.decisionPlayer();
    if (decisionPlayer?.kind === 'bot' && this.bootMode === 'match') {
      this.updateBot(dt, decisionPlayer);
      return;
    }

    if (decisionPlayer) this.updateHumanInput(decisionPlayer.id);
    this.turnElapsed += dt;
    if (this.bootMode === 'match' && this.turnTimerSeconds > 0 && this.turnElapsed >= this.turnTimerSeconds) {
      this.handleTimeout();
    }
    if (this.rules.state.phase === 'finished') this.finishMatch();
  }

  public pause(): void {
    this.persist();
    this.state = 'Paused';
  }

  public resume(): void {
    this.state = 'Playing';
  }

  public destroy(): void {
    this.persist();
    for (const player of this.ctx.players) {
      if (player.inputDeviceId?.startsWith('remote-player-')) {
        remoteControllerService.publishCompanionView(player.id, null);
      }
    }
    this.ctx.renderer.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.effects.clear();
    this.root.destroy({ children: true });
    this.state = 'Destroyed';
  }

  private createNewRules(): RentoRules {
    const winMode = this.ctx.modifiers.winMode === 'bankruptcy' ? 'bankruptcy' : 'netWorth';
    const roundLimit = isRoundLimit(this.ctx.modifiers.roundLimit)
      ? this.ctx.modifiers.roundLimit
      : 30;
    const volatility = this.ctx.modifiers.economyVolatility;
    const economyVolatility = volatility === 'stable' || volatility === 'wild'
      ? volatility
      : 'dynamic';
    return RentoRules.create({
      seed: this.seed,
      winMode,
      roundLimit,
      economyVolatility,
      players: this.ctx.players.map((player) => ({
        id: player.id,
        name: player.name,
        color: player.color,
        kind: player.type ?? 'human',
        aiDifficulty: player.aiDifficulty ?? 'normal',
      })),
    });
  }

  private saveMatchesPlayers(state: RentoMatchState, players: PlayerConfig[]): boolean {
    return state.players.length === players.length && state.players.every(
      (saved, index) => saved.id === players[index]?.id,
    );
  }

  private updateHumanInput(playerId: number): void {
    const input = this.ctx.input.getPlayer(playerId);
    if (input.isJustPressed('moveLeft')) {
      this.actionIndex = wrap(this.actionIndex - 1, this.currentActions.length);
      this.render();
    }
    if (input.isJustPressed('moveRight')) {
      this.actionIndex = wrap(this.actionIndex + 1, this.currentActions.length);
      this.render();
    }
    if (input.isJustPressed('moveUp')) {
      this.cycleOption(-1);
      this.render();
    }
    if (input.isJustPressed('moveDown')) {
      this.cycleOption(1);
      this.render();
    }
    if (input.isJustPressed('alternate')) {
      this.goBack();
      this.render();
    }
    if (input.isJustPressed('action')) {
      const action = this.currentActions[this.actionIndex];
      if (action?.enabled !== false) this.activate(action.id);
    }
  }

  private updateBot(dt: number, player: RentoPlayerState): void {
    const turnKey = `${this.rules.state.turn}:${player.id}`;
    if (turnKey !== this.aiTurnKey) {
      this.aiTurnKey = turnKey;
      this.aiManagementActions = 0;
      this.aiElapsed = 0;
    }
    this.aiElapsed += dt;
    const delay = player.aiDifficulty === 'hard' ? 0.25 : player.aiDifficulty === 'easy' ? 0.55 : 0.4;
    if (this.aiElapsed < delay) return;
    this.aiElapsed = 0;

    let intent = selectAiIntent(this.rules, player.id, player.aiDifficulty);
    if (
      this.aiManagementActions >= 2 &&
      this.rules.state.phase === 'awaitingRoll'
    ) {
      intent = { type: 'roll', playerId: player.id };
    } else if (
      this.aiManagementActions >= 2 &&
      this.rules.state.phase === 'turnActions'
    ) {
      intent = { type: 'endTurn', playerId: player.id };
    }
    if (!intent) return;
    if (intent.type !== 'roll' && intent.type !== 'endTurn') this.aiManagementActions++;
    this.dispatch(intent);
  }

  private updateMovement(dt: number): void {
    const movement = this.movement;
    if (!movement) return;
    const segmentDuration = 0.19 / this.animationSpeed;
    movement.progress += dt / segmentDuration;
    const fromIndex = movement.cursor === 0
      ? movement.from
      : movement.path[movement.cursor - 1] ?? movement.from;
    const toIndex = movement.path[movement.cursor];
    if (toIndex === undefined) {
      this.completeMovement(movement);
      return;
    }
    const from = this.board.getPawnPoint(fromIndex);
    const to = this.board.getPawnPoint(toIndex);
    const progress = Math.min(1, movement.progress);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    this.movingCoordinates.set(movement.playerId, {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
      facing: to.x < from.x ? -1 : 1,
    });
    this.board.renderTokens(this.tokenViews());
    if (movement.progress < 1) return;

    movement.progress -= 1;
    movement.cursor++;
    this.displayedPositions.set(movement.playerId, toIndex);
    this.effects.pulse(to.x, to.y, RENT0_THEME.cyan, 0.2);
    this.ctx.audio.playTone(245 + movement.cursor * 16, 'square', 0.03, 'sfx', 0.05);
    if (movement.cursor >= movement.path.length) {
      this.completeMovement(movement);
    }
  }

  private completeMovement(movement: MovementAnimation): void {
    const finalPosition = movement.path[movement.path.length - 1] ?? movement.from;
    this.displayedPositions.set(movement.playerId, finalPosition);
    this.movingCoordinates.delete(movement.playerId);
    this.movement = null;
    if (this.selectedDice !== 'normal' && this.rules.activePlayer.diceInventory[this.selectedDice] <= 0) {
      this.selectedDice = 'normal';
    }
    this.decisionKey = '';
    this.render();
  }

  private updateDiceRoll(dt: number): void {
    this.diceRollRemaining = Math.max(0, this.diceRollRemaining - dt);
    this.diceAnimationFrame += dt * 18;
    this.renderDiceConsole();
    if (this.diceRollRemaining > 0) return;
    this.movement = this.pendingMovement;
    this.pendingMovement = null;
    if (this.movement) this.render();
    else {
      this.decisionKey = '';
      this.render();
    }
  }

  private updateMovementFromRoll(): void {
    const move = this.rules.state.lastMove;
    if (!move) return;
    this.displayedPositions.set(move.playerId, move.from);
    this.selectedDice = move.diceType;
    this.lastDiceValues = [...move.dice];
    this.diceAnimationFrame = 0;
    this.diceRollRemaining = 0.82;
    this.pendingMovement = move.path.length ? {
      playerId: move.playerId,
      from: move.from,
      path: [...move.path],
      cursor: 0,
      progress: 0,
    } : null;
  }

  private currentDecisionKey(): string {
    if (this.bootMode === 'resumePrompt') return 'resume';
    const state = this.rules.state;
    return [
      state.phase,
      state.turn,
      state.turnCursor,
      state.auction?.activeBidderId ?? 0,
      state.trade?.recipientId ?? 0,
    ].join(':');
  }

  private decisionPlayer(): RentoPlayerState | null {
    if (this.bootMode === 'resumePrompt') {
      const firstHuman = this.rules.state.players.find((player) => player.kind === 'human');
      return firstHuman ?? this.rules.state.players[0] ?? null;
    }
    if (this.rules.state.phase === 'auction') {
      return this.rules.state.auction
        ? this.rules.player(this.rules.state.auction.activeBidderId)
        : null;
    }
    if (this.rules.state.phase === 'tradeResponse') {
      return this.rules.state.trade
        ? this.rules.player(this.rules.state.trade.recipientId)
        : null;
    }
    return this.rules.activePlayer;
  }

  private handleTimeout(): void {
    this.turnElapsed = 0;
    const player = this.decisionPlayer();
    if (!player) return;
    const phase = this.rules.state.phase;
    if (phase === 'awaitingRoll') this.dispatch({ type: 'roll', playerId: player.id });
    else if (phase === 'propertyDecision') this.dispatch({ type: 'declineProperty', playerId: player.id });
    else if (phase === 'auction') this.dispatch({ type: 'passAuction', playerId: player.id });
    else if (phase === 'tradeResponse') {
      this.dispatch({ type: 'respondTrade', playerId: player.id, response: 'reject' });
    } else if (phase === 'turnActions') {
      this.dispatch({ type: 'endTurn', playerId: player.id });
    }
  }

  private dispatch(intent: RentoIntent): void {
    try {
      this.rules.dispatch(intent);
      this.errorMessage = '';
      this.errorRemaining = 0;
      this.ctx.audio.playTone(
        intent.type === 'purchaseProperty' || intent.type === 'buyMarketListing' ? 660 : 460,
        intent.type === 'endTurn' ? 'sine' : 'triangle',
        0.09,
        'sfx',
        0.12,
      );
      if (intent.type === 'roll') this.updateMovementFromRoll();
      if (
        intent.type === 'roll' ||
        intent.type === 'purchaseProperty' ||
        intent.type === 'declineProperty' ||
        intent.type === 'respondTrade' ||
        intent.type === 'endTurn'
      ) {
        this.viewMode = 'board';
      }
      this.actionIndex = 0;
      this.persist();
      this.render();
      if (this.rules.state.phase === 'finished') this.finishMatch();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error);
      this.errorRemaining = 3;
      this.ctx.audio.playTone(130, 'sawtooth', 0.12, 'sfx', 0.09);
      this.render();
    }
  }

  private cycleOption(direction: number): void {
    let length = 0;
    if (this.viewMode === 'properties' || this.viewMode === 'propertyMore') {
      length = this.rules.activePlayer.propertiesOwned.length;
    } else if (this.viewMode === 'investments') {
      length = INVESTMENTS.length;
    } else if (this.viewMode === 'market') {
      length = this.rules.state.market.listings.length;
    } else if (this.viewMode === 'bank') {
      length = Math.max(1, this.rules.activePlayer.loans.length);
    } else if (this.viewMode === 'trade') {
      length = this.rivals().length;
    } else if (this.viewMode === 'dice') {
      length = this.availableDice().length;
    } else if (this.viewMode === 'rivals') {
      length = this.rivalProperties().length;
    }
    if (length) this.optionIndex = wrap(this.optionIndex + direction, length);
  }

  private goBack(): void {
    if (this.bootMode === 'resumePrompt') return;
    if (this.viewMode === 'propertyMore') this.viewMode = 'properties';
    else if (this.viewMode !== 'board') this.viewMode = 'board';
    this.actionIndex = 0;
    this.optionIndex = 0;
  }

  private activate(id: string): void {
    const player = this.decisionPlayer();
    if (!player) return;
    const activeId = player.id;

    if (id === 'resume-match' && this.pendingSave) {
      this.rules = new RentoRules(structuredClone(this.pendingSave));
      this.pendingSave = null;
      this.bootMode = 'match';
      this.syncDisplayedPositions();
      this.decisionKey = '';
      this.render();
      return;
    }
    if (id === 'new-match') {
      this.ctx.storage.remove(RENTO_SAVE_KEY);
      this.rules = this.createNewRules();
      this.pendingSave = null;
      this.bootMode = 'match';
      this.syncDisplayedPositions();
      this.decisionKey = '';
      this.render();
      return;
    }

    if (id === 'buy-property') this.dispatch({ type: 'purchaseProperty', playerId: activeId });
    else if (id === 'auction-property') this.dispatch({ type: 'declineProperty', playerId: activeId });
    else if (id === 'auction-bid') {
      const auction = this.rules.state.auction;
      if (auction) {
        const amount = auction.highestBid
          ? auction.highestBid + auction.minimumIncrement
          : auction.minimumBid;
        this.dispatch({ type: 'bidAuction', playerId: activeId, amount });
      }
    } else if (id === 'auction-pass') this.dispatch({ type: 'passAuction', playerId: activeId });
    else if (id === 'trade-accept') {
      this.dispatch({ type: 'respondTrade', playerId: activeId, response: 'accept' });
    } else if (id === 'trade-reject') {
      this.dispatch({ type: 'respondTrade', playerId: activeId, response: 'reject' });
    } else if (id === 'roll-selected' || id === 'dice-roll-center') {
      this.dispatch({ type: 'roll', playerId: activeId, diceType: this.selectedDice });
    } else if (id.startsWith('dice-select:')) {
      const diceType = id.slice('dice-select:'.length) as DiceType;
      if (
        this.rules.state.phase === 'awaitingRoll' &&
        (diceType === 'normal' || this.rules.activePlayer.diceInventory[diceType] > 0)
      ) {
        this.selectedDice = diceType;
        const availableIndex = this.availableDice().indexOf(diceType);
        if (availableIndex >= 0) this.optionIndex = availableIndex;
        this.render();
      }
    }
    else if (id === 'open-dice') this.openView('dice');
    else if (id === 'open-manage') this.openView('manage');
    else if (id === 'open-market') this.openView('market');
    else if (id === 'open-trade') this.openView('trade');
    else if (id === 'end-turn') {
      this.selectedDice = 'normal';
      this.dispatch({ type: 'endTurn', playerId: activeId });
    }
    else if (id === 'manage-properties') this.openView('properties');
    else if (id === 'manage-investments') this.openView('investments');
    else if (id === 'manage-bank') this.openView('bank');
    else if (id === 'manage-rivals') this.openView('rivals');
    else if (id === 'back') this.goBackAndRender();
    else if (id === 'property-upgrade') this.upgradeSelectedProperty(activeId);
    else if (id === 'property-specialize') this.specializeSelectedProperty(activeId);
    else if (id === 'property-insure') this.protectSelectedProperty(activeId, 'insurance');
    else if (id === 'property-more') this.openView('propertyMore', false);
    else if (id === 'property-security') this.protectSelectedProperty(activeId, 'security');
    else if (id === 'property-mortgage') this.toggleMortgage(activeId);
    else if (id === 'property-landmark') this.buildSelectedLandmark(activeId);
    else if (id === 'investment-add') this.investSelected(activeId);
    else if (id === 'investment-withdraw') this.withdrawSelected(activeId);
    else if (id === 'market-buy') this.buySelectedListing(activeId);
    else if (id === 'market-voucher') this.voucherSelectedListing(activeId);
    else if (id === 'bank-borrow') {
      this.dispatch({ type: 'takeLoan', playerId: activeId, amount: 1_000, collateralPropertyIds: [], termRounds: 5 });
    } else if (id === 'bank-repay') this.repaySelectedLoan(activeId);
    else if (id === 'trade-propose') this.proposeSelectedTrade(activeId);
    else if (id === 'dice-roll') this.rollSelectedDie(activeId);
    else if (id === 'rival-sabotage') this.sabotageSelected(activeId);
  }

  private openView(viewMode: ViewMode, resetOption = true): void {
    this.viewMode = viewMode;
    this.actionIndex = 0;
    if (resetOption) this.optionIndex = 0;
    this.render();
  }

  private goBackAndRender(): void {
    this.goBack();
    this.render();
  }

  private selectedPropertyId(): string | null {
    const ids = this.rules.activePlayer.propertiesOwned;
    return ids.length ? ids[wrap(this.optionIndex, ids.length)] : null;
  }

  private upgradeSelectedProperty(playerId: number): void {
    const propertyId = this.selectedPropertyId();
    if (propertyId) this.dispatch({ type: 'upgradeProperty', playerId, propertyId });
  }

  private specializeSelectedProperty(playerId: number): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    const definition = propertyById(propertyId);
    const specialization = definition.allowedSpecializations[
      this.rules.property(propertyId).prestige % definition.allowedSpecializations.length
    ];
    this.dispatch({ type: 'specializeProperty', playerId, propertyId, specialization });
  }

  private protectSelectedProperty(playerId: number, type: 'insurance' | 'security'): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    this.dispatch(type === 'insurance'
      ? { type: 'buyInsurance', playerId, propertyId }
      : { type: 'buySecurity', playerId, propertyId });
  }

  private toggleMortgage(playerId: number): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    this.dispatch(this.rules.property(propertyId).mortgaged
      ? { type: 'redeemProperty', playerId, propertyId }
      : { type: 'mortgageProperty', playerId, propertyId });
  }

  private buildSelectedLandmark(playerId: number): void {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) return;
    this.dispatch({
      type: 'buildLandmark',
      playerId,
      districtId: propertyById(propertyId).districtId,
    });
  }

  private investSelected(playerId: number): void {
    const investment = INVESTMENTS[wrap(this.optionIndex, INVESTMENTS.length)];
    this.dispatch({ type: 'invest', playerId, investment: investment.id, amount: 500 });
  }

  private withdrawSelected(playerId: number): void {
    const investment = INVESTMENTS[wrap(this.optionIndex, INVESTMENTS.length)];
    const balance = this.rules.player(playerId).investments[investment.id];
    if (balance > 0) {
      this.dispatch({
        type: 'withdrawInvestment',
        playerId,
        investment: investment.id,
        amount: Math.min(500, balance),
      });
    }
  }

  private buySelectedListing(playerId: number): void {
    const listings = this.rules.state.market.listings;
    const listing = listings[wrap(this.optionIndex, listings.length)];
    if (listing) this.dispatch({ type: 'buyMarketListing', playerId, listingId: listing.id });
  }

  private voucherSelectedListing(playerId: number): void {
    const listings = this.rules.state.market.listings;
    const listing = listings[wrap(this.optionIndex, listings.length)];
    if (listing) this.dispatch({ type: 'useVoucher', playerId, propertyId: listing.propertyId });
  }

  private repaySelectedLoan(playerId: number): void {
    const loans = this.rules.player(playerId).loans;
    const loan = loans[wrap(this.optionIndex, loans.length)];
    if (loan) {
      this.dispatch({
        type: 'repayLoan',
        playerId,
        loanId: loan.id,
        amount: Math.min(500, loan.balance),
      });
    }
  }

  private proposeSelectedTrade(playerId: number): void {
    const rivals = this.rivals();
    const rival = rivals[wrap(this.optionIndex, rivals.length)];
    const proposer = this.rules.player(playerId);
    if (!rival) return;
    const offered = createEmptyTradeAssets();
    const requested = createEmptyTradeAssets();
    const availableProperty = rival.propertiesOwned.find((propertyId) => {
      const property = this.rules.property(propertyId);
      return !property.mortgaged;
    });
    if (availableProperty && proposer.cash >= 500) {
      offered.cash = 500;
      requested.propertyIds = [availableProperty];
    } else {
      const amount = Math.min(500, proposer.cash, rival.cash);
      if (amount <= 0) {
        this.showError('Both players need cash or tradeable property for a quick deal.');
        return;
      }
      offered.cash = amount;
      requested.cash = Math.max(1, Math.min(rival.cash, Math.round(amount * 0.8)));
    }
    this.dispatch({
      type: 'proposeTrade',
      playerId,
      recipientId: rival.id,
      offered,
      requested,
    });
  }

  private rollSelectedDie(playerId: number): void {
    const dice = this.availableDice();
    const diceType = dice[wrap(this.optionIndex, dice.length)] ?? 'normal';
    this.selectedDice = diceType;
    this.dispatch({ type: 'roll', playerId, diceType });
  }

  private sabotageSelected(playerId: number): void {
    const properties = this.rivalProperties();
    const property = properties[wrap(this.optionIndex, properties.length)];
    if (property) this.dispatch({ type: 'sabotageProperty', playerId, propertyId: property.id });
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.errorRemaining = 3;
    this.render();
  }

  private rivals(): RentoPlayerState[] {
    return this.rules.state.players.filter(
      (player) => player.id !== this.rules.activePlayer.id && !player.bankrupt,
    );
  }

  private rivalProperties() {
    const activeId = this.rules.activePlayer.id;
    return PROPERTIES.filter((definition) => {
      const ownerId = this.rules.property(definition.id).ownerId;
      return ownerId !== null && ownerId !== activeId;
    });
  }

  private availableDice(): DiceType[] {
    const player = this.rules.activePlayer;
    return (['normal', 'lucky', 'heavy', 'chaos', 'golden'] as DiceType[]).filter(
      (type) => type === 'normal' || player.diceInventory[type] > 0,
    );
  }

  private render(): void {
    this.renderBoard();
    this.renderDiceConsole();
    const overlay = this.overlayModel();
    const animating = this.diceRollRemaining > 0 || Boolean(this.movement) || Boolean(this.pendingMovement);
    this.currentActions = overlay?.actions ?? (animating ? [] : this.boardActions());
    this.actionIndex = wrap(this.actionIndex, this.currentActions.length);

    const activePlayer = this.decisionPlayer() ?? this.rules.activePlayer;
    const message = this.errorRemaining > 0 && this.errorMessage
      ? `⚠ ${this.errorMessage}`
      : this.rules.state.activityLog[0];
    this.hud.render({
      players: this.rules.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        cash: player.cash,
        netWorth: this.rules.netWorth(player.id),
        credit: player.creditScore,
        color: parseColor(player.color),
      })),
      activePlayerId: activePlayer?.id,
      turn: this.rules.state.round,
      turnLimit: this.rules.state.roundLimit,
      phase: this.diceRollRemaining > 0 ? 'rolling' : this.movement ? 'moving' : this.rules.state.phase,
      economyIndex: this.rules.state.economyIndex,
      message,
      actions: overlay ? [] : this.withSelection(this.currentActions),
    });

    if (overlay) {
      this.modal.visible = true;
      this.modal.render({
        ...overlay,
        actions: this.withSelection(overlay.actions),
      });
    } else {
      this.modal.visible = false;
      this.modal.removeChildren().forEach((child) => child.destroy({ children: true }));
      this.modal.actionBounds.clear();
    }
    this.publishCompanionViews();
  }

  private publishCompanionViews(): void {
    for (const configuredPlayer of this.ctx.players) {
      if (!configuredPlayer.inputDeviceId?.startsWith('remote-player-')) continue;
      const player = this.rules.player(configuredPlayer.id);
      const mission = missionById(player.mission.missionId);
      const invested = Object.values(player.investments).reduce((sum, value) => sum + value, 0);
      const debt = player.distressDebt + player.loans.reduce((sum, loan) => sum + loan.balance, 0);
      const details = [
        `Hidden mission: ${mission.title}`,
        mission.description,
        `Progress ${player.mission.progress}/${mission.target} · Reward ${dollars(mission.reward)}`,
        `Market: ${this.rules.state.market.news}`,
      ];
      if (this.rules.state.currentEventId) {
        details.push(`World event: ${eventById(this.rules.state.currentEventId).title}`);
      }
      if (this.rules.state.trade?.recipientId === player.id) {
        details.push(`Private deal waiting from ${this.rules.player(this.rules.state.trade.proposerId).name}`);
      }
      remoteControllerService.publishCompanionView(player.id, {
        title: 'PRIVATE TYCOON BRIEF',
        subtitle: `ROUND ${this.rules.state.round}/${this.rules.state.roundLimit} · ${this.decisionPlayer()?.id === player.id ? 'YOUR DECISION' : 'WAITING'}`,
        metrics: [
          { label: 'CASH', value: dollars(player.cash), tone: 'positive' },
          { label: 'NET WORTH', value: dollars(this.rules.netWorth(player.id)), tone: 'positive' },
          { label: 'PORTFOLIO', value: dollars(invested) },
          { label: 'DEBT', value: dollars(debt), tone: debt > 0 ? 'warning' : 'neutral' },
          { label: 'CREDIT', value: String(player.creditScore) },
          { label: 'PROPERTIES', value: String(player.propertiesOwned.length) },
        ],
        details,
      });
    }
  }

  private renderBoard(): void {
    const playerColors = new Map(
      this.rules.state.players.map((player) => [player.id, parseColor(player.color)]),
    );
    const districtIndex = new Map(DISTRICTS.map((district, index) => [district.id, index]));
    const properties: PropertyView[] = PROPERTIES.map((definition) => {
      const property = this.rules.property(definition.id);
      return {
        id: definition.id,
        name: definition.name,
        price: this.rules.propertyPurchasePrice(definition.id),
        districtIndex: districtIndex.get(definition.districtId) ?? 0,
        ownerId: property.ownerId,
        level: property.prestige,
        specialty: property.specialization ?? undefined,
        mortgaged: property.mortgaged,
      };
    });
    const tiles: BoardTileView[] = BOARD_TILES.map((tile) => {
      const definition = tile.propertyId ? propertyById(tile.propertyId) : null;
      const ownerId = tile.propertyId ? this.rules.property(tile.propertyId).ownerId : null;
      return {
        id: tile.id,
        label: tile.label,
        kind: tile.kind,
        propertyId: tile.propertyId,
        districtIndex: definition ? districtIndex.get(definition.districtId) : undefined,
        ownerColor: ownerId === null || ownerId === undefined ? undefined : playerColors.get(ownerId),
      };
    });
    this.board.render(tiles, properties, this.tokenViews());
  }

  private tokenViews(): TokenView[] {
    return this.rules.state.players.map((player, index) => {
      const moving = this.movingCoordinates.get(player.id);
      return {
      playerId: player.id,
      tileIndex: this.displayedPositions.get(player.id) ?? player.position,
      slot: index,
      total: this.rules.state.players.length,
      color: parseColor(player.color),
      label: player.name,
        x: moving?.x,
        y: moving?.y,
        facing: moving?.facing,
        moving: Boolean(moving),
      };
    });
  }

  private renderDiceConsole(): void {
    const activePlayer = this.rules.state.lastMove && (this.diceRollRemaining > 0 || this.movement)
      ? this.rules.player(this.rules.state.lastMove.playerId)
      : this.rules.activePlayer;
    const rollingValues = this.lastDiceValues.map((_, index) => {
      const sides = this.selectedDice === 'chaos' ? 12 : 6;
      return (Math.floor(this.diceAnimationFrame * 2.7) + index * 3) % sides + 1;
    });
    this.diceConsole.render({
      playerName: activePlayer.name,
      playerColor: parseColor(activePlayer.color),
      selected: this.selectedDice,
      inventory: (['normal', 'lucky', 'heavy', 'chaos', 'golden'] as DiceType[]).map((type) => ({
        id: type,
        label: type === 'golden' ? 'GOLD' : type.toUpperCase(),
        count: type === 'normal' ? '∞' : activePlayer.diceInventory[type],
        enabled: type === 'normal' || activePlayer.diceInventory[type] > 0,
      })),
      values: this.diceRollRemaining > 0 ? rollingValues : this.lastDiceValues,
      rolling: this.diceRollRemaining > 0,
      canRoll:
        this.bootMode === 'match' &&
        this.rules.state.phase === 'awaitingRoll' &&
        this.diceRollRemaining <= 0 &&
        !this.movement,
      animationFrame: Math.floor(this.diceAnimationFrame),
    });
  }

  private boardActions(): UiAction[] {
    if (this.bootMode === 'resumePrompt') return [];
    if (this.rules.state.phase === 'awaitingRoll') {
      return [
        { id: 'roll-selected', label: `ROLL ${this.selectedDice.toUpperCase()}` },
        { id: 'open-dice', label: 'DICE DETAILS', accent: RENT0_THEME.cyan },
        { id: 'open-manage', label: 'MANAGE' },
        { id: 'open-market', label: 'MARKET', accent: RENT0_THEME.emerald },
      ];
    }
    if (this.rules.state.phase === 'turnActions') {
      return [
        { id: 'open-manage', label: 'MANAGE' },
        { id: 'open-market', label: 'MARKET', accent: RENT0_THEME.emerald },
        { id: 'open-trade', label: 'PRIVATE DEAL', accent: RENT0_THEME.cyan },
        { id: 'end-turn', label: 'END TURN' },
      ];
    }
    return [];
  }

  private overlayModel(): (Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] }) | null {
    if (this.bootMode === 'resumePrompt') {
      return {
        title: 'WELCOME BACK, TYCOON',
        subtitle: 'A local match is waiting on this device.',
        body: 'Resume the exact deterministic match state, or start a fresh city. No account or online service is involved.',
        actions: [
          { id: 'resume-match', label: 'RESUME', accent: RENT0_THEME.emerald },
          { id: 'new-match', label: 'NEW MATCH' },
        ],
      };
    }
    if (this.rules.state.phase === 'finished') {
      const winnerNames = this.rules.state.winnerIds.map((id) => this.rules.player(id).name).join(' & ');
      return {
        title: `${winnerNames} WINS`,
        subtitle: `Final economy index: ${this.rules.state.economyIndex >= 0 ? '+' : ''}${this.rules.state.economyIndex}`,
        body: this.rules.state.standings
          .map((standing) => `#${standing.rank} ${this.rules.player(standing.playerId).name}  ${dollars(standing.netWorth)}`)
          .join('\n'),
        actions: [],
      };
    }
    if (this.diceRollRemaining > 0 || this.movement || this.pendingMovement) return null;
    if (this.rules.state.phase === 'propertyDecision') return this.propertyDecisionOverlay();
    if (this.rules.state.phase === 'auction') return this.auctionOverlay();
    if (this.rules.state.phase === 'tradeResponse') return this.tradeResponseOverlay();

    if (this.viewMode === 'manage') {
      const mission = missionById(this.rules.activePlayer.mission.missionId);
      return {
        title: 'TYCOON OFFICE',
        subtitle: `${this.rules.activePlayer.name} · Net worth ${dollars(this.rules.netWorth(this.rules.activePlayer.id))}`,
        body: `PRIVATE OBJECTIVE: ${mission.title}\n${mission.description}  Progress ${this.rules.activePlayer.mission.progress}/${mission.target}.\n\nChoose a department. Use E / ALT to return to the board.`,
        actions: [
          { id: 'manage-properties', label: 'PROPERTIES' },
          { id: 'manage-investments', label: 'PORTFOLIO', accent: RENT0_THEME.emerald },
          { id: 'manage-bank', label: 'RENTO BANK', accent: RENT0_THEME.cyan },
          { id: 'manage-rivals', label: 'RIVALS', accent: RENT0_THEME.danger },
        ],
      };
    }
    if (this.viewMode === 'properties' || this.viewMode === 'propertyMore') {
      return this.propertyManagementOverlay();
    }
    if (this.viewMode === 'investments') return this.investmentOverlay();
    if (this.viewMode === 'market') return this.marketOverlay();
    if (this.viewMode === 'bank') return this.bankOverlay();
    if (this.viewMode === 'trade') return this.tradeOverlay();
    if (this.viewMode === 'dice') return this.diceOverlay();
    if (this.viewMode === 'rivals') return this.rivalsOverlay();
    return null;
  }

  private propertyDecisionOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const propertyId = this.rules.state.pendingPropertyId!;
    const definition = propertyById(propertyId);
    const price = this.rules.propertyPurchasePrice(propertyId);
    const property = this.propertyView(propertyId);
    return {
      title: 'PROPERTY OPPORTUNITY',
      subtitle: `${districtById(definition.districtId).name} district`,
      body: `${definition.name} is unowned. Buy it now for ${dollars(price)}, or send it to a city-wide auction.`,
      properties: [property],
      actions: [
        {
          id: 'buy-property',
          label: `BUY ${dollars(price)}`,
          enabled: this.rules.activePlayer.cash >= price,
          accent: RENT0_THEME.emerald,
        },
        { id: 'auction-property', label: 'AUCTION', accent: RENT0_THEME.gold },
      ],
    };
  }

  private auctionOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const auction = this.rules.state.auction!;
    const bidder = this.rules.player(auction.activeBidderId);
    const minimum = auction.highestBid
      ? auction.highestBid + auction.minimumIncrement
      : auction.minimumBid;
    return {
      title: auction.kind === 'premium' ? 'PREMIUM AUCTION' : 'CITY AUCTION',
      subtitle: `${bidder.name} is bidding · Current ${dollars(auction.highestBid)}`,
      body: `${propertyById(auction.propertyId).name}\nMinimum next bid: ${dollars(minimum)}. Passing removes this bidder from the auction.`,
      properties: [this.propertyView(auction.propertyId)],
      actions: [
        {
          id: 'auction-bid',
          label: `BID ${dollars(minimum)}`,
          enabled: bidder.cash >= minimum,
          accent: RENT0_THEME.gold,
        },
        { id: 'auction-pass', label: 'PASS', accent: RENT0_THEME.danger },
      ],
    };
  }

  private tradeResponseOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const trade = this.rules.state.trade!;
    const proposer = this.rules.player(trade.proposerId);
    const recipient = this.rules.player(trade.recipientId);
    const summarize = (cash: number, properties: string[]) => [
      cash ? dollars(cash) : '',
      ...properties.map((id) => propertyById(id).name),
    ].filter(Boolean).join(' + ') || 'other assets';
    return {
      title: 'PRIVATE DEAL',
      subtitle: `${proposer.name} → ${recipient.name}`,
      body: `You receive: ${summarize(trade.offered.cash, trade.offered.propertyIds)}\nYou surrender: ${summarize(trade.requested.cash, trade.requested.propertyIds)}`,
      actions: [
        { id: 'trade-accept', label: 'ACCEPT', accent: RENT0_THEME.emerald },
        { id: 'trade-reject', label: 'REJECT', accent: RENT0_THEME.danger },
      ],
    };
  }

  private propertyManagementOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const propertyId = this.selectedPropertyId();
    if (!propertyId) {
      return {
        title: 'PROPERTY PORTFOLIO',
        body: 'You do not own property yet. Roll, shop the Market, or win an auction to begin your empire.',
        actions: [{ id: 'back', label: 'BACK' }],
      };
    }
    const definition = propertyById(propertyId);
    const property = this.rules.property(propertyId);
    const body = [
      `Use ↑/↓ to inspect properties (${this.optionIndex + 1}/${this.rules.activePlayer.propertiesOwned.length}).`,
      `Rent ${dollars(this.rules.rentFor(propertyId))} · Upgrade ${dollars(this.rules.propertyUpgradeCost(propertyId))}.`,
      `Insurance ${property.insuredCharges} · Security ${property.securityCharges}${property.disabledRounds ? ` · Disabled ${property.disabledRounds} rounds` : ''}.`,
    ].join('\n');
    if (this.viewMode === 'propertyMore') {
      return {
        title: definition.name,
        subtitle: `${districtById(definition.districtId).name} · Advanced controls`,
        body,
        properties: [this.propertyView(propertyId)],
        actions: [
          { id: 'property-security', label: 'SECURITY', accent: RENT0_THEME.cyan },
          { id: 'property-mortgage', label: property.mortgaged ? 'REDEEM' : 'MORTGAGE' },
          { id: 'property-landmark', label: 'LANDMARK', accent: RENT0_THEME.gold },
          { id: 'back', label: 'BACK' },
        ],
      };
    }
    return {
      title: definition.name,
      subtitle: `${districtById(definition.districtId).name} · Prestige ${property.prestige}/5`,
      body,
      properties: [this.propertyView(propertyId)],
      actions: [
        { id: 'property-upgrade', label: 'UPGRADE', accent: RENT0_THEME.emerald },
        { id: 'property-specialize', label: property.specialization ?? 'SPECIALIZE', accent: RENT0_THEME.cyan },
        { id: 'property-insure', label: 'INSURE' },
        { id: 'property-more', label: 'MORE' },
      ],
    };
  }

  private investmentOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const investment = INVESTMENTS[wrap(this.optionIndex, INVESTMENTS.length)];
    const balance = this.rules.activePlayer.investments[investment.id];
    return {
      title: 'INVESTMENT PORTFOLIO',
      subtitle: `${investment.name} · ${investment.risk.toUpperCase()} RISK · Balance ${dollars(balance)}`,
      body: `${investment.minReturnBps / 100}% to ${investment.maxReturnBps / 100}% each round.\n\nUse ↑/↓ to compare all four funds. Returns are resolved by the local deterministic economy at the end of each round.`,
      actions: [
        { id: 'investment-add', label: 'INVEST $500', accent: RENT0_THEME.emerald },
        { id: 'investment-withdraw', label: 'WITHDRAW', enabled: balance > 0 },
        { id: 'back', label: 'BACK' },
      ],
    };
  }

  private marketOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const listings = this.rules.state.market.listings;
    const listing = listings[wrap(this.optionIndex, listings.length)];
    if (!listing) {
      return {
        title: 'REAL ESTATE MARKET',
        subtitle: this.rules.state.market.news,
        body: 'The current market cycle is sold out. New listings arrive every five completed rounds.',
        actions: [{ id: 'back', label: 'BACK' }],
      };
    }
    return {
      title: 'REAL ESTATE MARKET',
      subtitle: `${listing.tier.toUpperCase()} DEAL · ${this.optionIndex + 1}/${listings.length}`,
      body: `${this.rules.state.market.news}\nUse ↑/↓ to inspect the listings. Each player may buy one market property per cycle.`,
      properties: [this.propertyView(listing.propertyId, listing.price)],
      actions: [
        { id: 'market-buy', label: `BUY ${dollars(listing.price)}`, accent: RENT0_THEME.emerald },
        {
          id: 'market-voucher',
          label: 'USE VOUCHER',
          enabled: this.rules.activePlayer.vouchers > 0,
          accent: RENT0_THEME.gold,
        },
        { id: 'back', label: 'BACK' },
      ],
    };
  }

  private bankOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const player = this.rules.activePlayer;
    const loan = player.loans[wrap(this.optionIndex, player.loans.length)];
    const loanText = loan
      ? `${loan.id}: ${dollars(loan.balance)} due in ${loan.roundsRemaining} rounds.`
      : 'No active loans. A quick loan is $1,000 over five rounds.';
    return {
      title: 'RENTO BANK',
      subtitle: `Credit ${player.creditScore} · Bank reputation ${player.bankReputation}/100`,
      body: `${loanText}\nUse ↑/↓ to inspect loans. Timely repayment improves future borrowing terms; default risks collateral and credit.`,
      actions: [
        { id: 'bank-borrow', label: 'BORROW $1K', accent: RENT0_THEME.cyan },
        { id: 'bank-repay', label: 'REPAY $500', enabled: Boolean(loan), accent: RENT0_THEME.emerald },
        { id: 'back', label: 'BACK' },
      ],
    };
  }

  private tradeOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const rivals = this.rivals();
    const rival = rivals[wrap(this.optionIndex, rivals.length)];
    if (!rival) {
      return {
        title: 'PRIVATE DEALS',
        body: 'There is no active rival available for a trade.',
        actions: [{ id: 'back', label: 'BACK' }],
      };
    }
    return {
      title: 'PRIVATE DEALS',
      subtitle: `Negotiating with ${rival.name} · Net worth ${dollars(this.rules.netWorth(rival.id))}`,
      body: `Use ↑/↓ to select a rival. The quick proposal offers cash for one available rival property, or proposes a smaller cash exchange when no property is tradeable.`,
      actions: [
        { id: 'trade-propose', label: 'PROPOSE DEAL', accent: RENT0_THEME.cyan },
        { id: 'back', label: 'BACK' },
      ],
    };
  }

  private diceOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const dice = this.availableDice();
    const diceType = dice[wrap(this.optionIndex, dice.length)] ?? 'normal';
    const die = {
      normal: 'Fair 1–6. Always available.',
      lucky: 'Guaranteed 4–6.',
      heavy: 'Two dice for long-distance moves.',
      chaos: 'Unpredictable 1–12.',
      golden: 'Guaranteed 6 plus a $600 bonus.',
    }[diceType];
    const count = diceType === 'normal' ? '∞' : this.rules.activePlayer.diceInventory[diceType];
    return {
      title: 'DICE INVENTORY',
      subtitle: `${diceType.toUpperCase()} DIE · ${count} AVAILABLE`,
      body: `${die}\nUse ↑/↓ to inspect owned dice. Special dice are consumable and can be won from the Fortune Wheel and world events.`,
      actions: [
        { id: 'dice-roll', label: 'ROLL THIS DIE', accent: RENT0_THEME.gold },
        { id: 'back', label: 'BACK' },
      ],
    };
  }

  private rivalsOverlay(): Omit<RentoOverlayModel, 'actions'> & { actions: UiAction[] } {
    const properties = this.rivalProperties();
    const target = properties[wrap(this.optionIndex, properties.length)];
    if (!target) {
      return {
        title: 'RIVAL OPERATIONS',
        body: 'No rival property can be targeted yet.',
        actions: [{ id: 'back', label: 'BACK' }],
      };
    }
    const state = this.rules.property(target.id);
    const owner = state.ownerId === null ? null : this.rules.player(state.ownerId);
    return {
      title: 'RIVAL OPERATIONS',
      subtitle: `${target.name} · Owned by ${owner?.name ?? 'Unknown'}`,
      body: `Use ↑/↓ to choose a rival property. Sabotage costs $500 and disables income for two rounds, unless a Security charge blocks it.`,
      properties: [this.propertyView(target.id)],
      actions: [
        { id: 'rival-sabotage', label: 'SABOTAGE $500', accent: RENT0_THEME.danger },
        { id: 'back', label: 'BACK' },
      ],
    };
  }

  private propertyView(propertyId: string, price?: number): PropertyView {
    const definition = propertyById(propertyId);
    const property = this.rules.property(propertyId);
    return {
      id: propertyId,
      name: definition.name,
      price: price ?? this.rules.propertyPurchasePrice(propertyId),
      districtIndex: DISTRICTS.findIndex((district) => district.id === definition.districtId),
      ownerId: property.ownerId,
      level: property.prestige,
      specialty: property.specialization ?? undefined,
      mortgaged: property.mortgaged,
    };
  }

  private withSelection(actions: UiAction[]): OverlayAction[] {
    return actions.map((action, index) => ({
      id: action.id,
      label: action.label,
      enabled: action.enabled,
      accent: action.enabled === false
        ? RENT0_THEME.line
        : index === this.actionIndex
          ? RENT0_THEME.cyan
          : action.accent,
    }));
  }

  private syncDisplayedPositions(): void {
    this.displayedPositions.clear();
    this.movingCoordinates.clear();
    this.movement = null;
    this.pendingMovement = null;
    this.diceRollRemaining = 0;
    for (const player of this.rules.state.players) {
      this.displayedPositions.set(player.id, player.position);
    }
  }

  private persist(): void {
    if (!this.rules || this.rules.state.phase === 'finished') return;
    this.ctx.storage.set(RENTO_SAVE_KEY, createSaveEnvelope(this.rules.state));
  }

  private finishMatch(): void {
    if (this.gameOverEmitted || this.rules.state.phase !== 'finished') return;
    this.gameOverEmitted = true;
    this.ctx.storage.remove(RENTO_SAVE_KEY);
    this.state = 'Finished';
    const standings = this.rules.state.standings.length
      ? this.rules.state.standings
      : this.rules.standings();
    this.ctx.audio.playArpeggio([392, 523.25, 659.25, 783.99], 0.12, 'triangle', 0.16);
    this.ctx.events.emit('game:over', {
      winnerId: this.rules.state.winnerIds[0],
      standings: standings.map((standing) => ({
        playerId: standing.playerId,
        score: standing.netWorth,
      })),
    });
  }

  private get turnTimerSeconds(): number {
    const value = Number(this.ctx.modifiers.turnTimerSeconds ?? 45);
    return Number.isFinite(value) ? Math.max(0, value) : 45;
  }

  private get animationSpeed(): number {
    const value = Number(this.ctx.modifiers.animationSpeed ?? 1);
    return Number.isFinite(value) ? Math.max(0.5, value) : 1;
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.state !== 'Playing' || this.movement || this.diceRollRemaining > 0) return;
    const bounds = this.ctx.renderer.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const x = (event.clientX - bounds.left) * 960 / bounds.width;
    const y = (event.clientY - bounds.top) * 540 / bounds.height;
    if (!this.modal.visible) {
      for (const [id, hit] of this.diceConsole.actionBounds) {
        if (
          x >= hit.x &&
          x <= hit.x + hit.width &&
          y >= hit.y &&
          y <= hit.y + hit.height
        ) {
          if (id === 'dice-roll-center' && this.rules.state.phase !== 'awaitingRoll') return;
          this.activate(id);
          return;
        }
      }
    }
    const actionBounds = this.modal.visible ? this.modal.actionBounds : this.hud.actionBounds;
    for (const action of this.currentActions) {
      const hit = actionBounds.get(action.id);
      if (
        hit &&
        x >= hit.x &&
        x <= hit.x + hit.width &&
        y >= hit.y &&
        y <= hit.y + hit.height &&
        action.enabled !== false
      ) {
        this.actionIndex = this.currentActions.indexOf(action);
        this.activate(action.id);
        break;
      }
    }
  };
}
