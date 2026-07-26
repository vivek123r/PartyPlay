import { Container, Graphics, Text } from 'pixi.js';
import type { GameContext, GameModule, InternalGameState } from '@runtime/types';
import {
  GUILDS,
  ambitionById,
  commissionById,
  districtById,
  guildById,
  ordinanceById,
  showcaseById,
} from './content';
import { DriftspireRules, isValidDriftspireState } from './rules';
import {
  DRIFTSPIRE_SAVE_KEY,
  DRIFTSPIRE_SCHEMA_VERSION,
  type DriftspireMatchState,
  type PactType,
  type SaveEnvelope,
  type SiteAction,
} from './types';

type BootMode = 'resumePrompt' | 'guildSelect' | 'match';
type ActionMenuItem = SiteAction | 'pact';

const BG = 0x090f25;
const PANEL = 0x121d38;
const PANEL_LIGHT = 0x1c2d50;
const INK = 0xeaf6ff;
const MUTED = 0x8ca4c7;
const GOLD = 0xffd166;
const CYAN = 0x52e5ff;
const PINK = 0xff668c;
const GREEN = 0x78e49b;

const parseColor = (color: string): number => {
  const parsed = Number.parseInt(color.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : 0xffffff;
};

const wrapIndex = (value: number, length: number): number =>
  length <= 0 ? 0 : (value + length * 8) % length;

export default class DriftspireGame implements GameModule {
  public state: InternalGameState = 'Initializing';

  private ctx!: GameContext;
  private root!: Container;
  private rules: DriftspireRules | null = null;
  private bootMode: BootMode = 'guildSelect';
  private pendingSave: DriftspireMatchState | null = null;
  private seed = 1;
  private draftCursor = 0;
  private draftGuildIndex = 0;
  private chosenGuildIds: string[] = [];
  private rollAnimationRemaining = 0;
  private displayedDie = 1;
  private movementStepTimer = 0;
  private actionIndex = 0;
  private actionOptionIndex = 0;
  private pactMenuOpen = false;
  private pactTypeIndex = 0;
  private pactPartnerIndex = 0;
  private pactProposalIndex = 0;
  private councilChoiceIndex = 0;
  private councilFavorSpend = 0;
  private spotlightChoiceIndex = 0;
  private turnElapsed = 0;
  private phaseKey = '';
  private errorMessage = '';
  private errorTime = 0;
  private showcaseElapsed = 0;
  private showcaseScores: Record<number, number> = {};
  private showcaseAttempts: Record<number, number> = {};
  private showcaseMarker = 0;
  private gameOverEmitted = false;
  private renderAccumulator = 0;

  public async init(context: GameContext): Promise<void> {
    this.state = 'Loading';
    this.ctx = context;
    this.root = new Container();
    this.root.scale.set(2);
    this.ctx.renderer.stage.addChild(this.root);
    this.seed =
      typeof this.ctx.modifiers.seed === 'number'
        ? this.ctx.modifiers.seed
        : Math.floor(this.ctx.random() * 0x7fffffff);

    const envelope = this.ctx.storage.get<SaveEnvelope | null>(DRIFTSPIRE_SAVE_KEY, null);
    if (
      envelope?.schemaVersion === DRIFTSPIRE_SCHEMA_VERSION &&
      isValidDriftspireState(envelope.state) &&
      envelope.state.phase !== 'finished' &&
      envelope.state.players.length === this.ctx.players.length &&
      envelope.state.players.every((saved, index) => saved.id === this.ctx.players[index]?.id)
    ) {
      this.pendingSave = envelope.state;
      this.bootMode = 'resumePrompt';
    }
    this.render();
    this.state = 'Ready';
  }

  public start(): void {
    this.state = 'Playing';
  }

  public update(dt: number): void {
    if (this.state !== 'Playing') return;
    this.errorTime = Math.max(0, this.errorTime - dt);
    this.renderAccumulator += dt;

    for (const player of this.ctx.players) {
      if (this.ctx.input.getPlayer(player.id).isJustPressed('pause')) {
        this.ctx.events.emit('game:pause', undefined);
        return;
      }
    }

    if (this.bootMode === 'resumePrompt') {
      this.updateResumePrompt();
      return;
    }
    if (this.bootMode === 'guildSelect') {
      this.updateGuildSelect();
      return;
    }
    if (!this.rules) return;

    const key = `${this.rules.state.phase}:${this.rules.state.turnCursor}:${this.rules.state.councilVoterCursor}`;
    if (key !== this.phaseKey) {
      this.phaseKey = key;
      this.turnElapsed = 0;
      this.actionIndex = 0;
      this.actionOptionIndex = 0;
      this.pactMenuOpen = false;
      this.resetShowcaseIfNeeded();
      this.render();
    }

    try {
      if (this.rules.state.phase === 'roll') this.updateRoll(dt);
      else if (this.rules.state.phase === 'moving') this.updateMoving(dt);
      else if (this.rules.state.phase === 'tileAction') this.updateAction(dt);
      else if (this.rules.state.phase === 'pactResponse') this.updatePactResponse();
      else if (this.rules.state.phase === 'council') this.updateCouncil();
      else if (this.rules.state.phase === 'showcase') this.updateShowcase(dt);
      else if (this.rules.state.phase === 'spotlightChoice') this.updateSpotlightChoice();
      else if (this.rules.state.phase === 'finished') this.finishMatch();
    } catch (error) {
      this.showError(error instanceof Error ? error.message : String(error));
    }

    if (this.renderAccumulator >= 0.2 && this.rules.state.phase !== 'showcase') {
      this.renderAccumulator = 0;
      this.render();
    }
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
    this.state = 'Destroyed';
    this.root.destroy({ children: true });
  }

  private updateResumePrompt(): void {
    const input = this.ctx.input.getPlayer(this.ctx.players[0].id);
    if (input.isJustPressed('action') && this.pendingSave) {
      this.rules = new DriftspireRules(structuredClone(this.pendingSave));
      this.bootMode = 'match';
      this.phaseKey = '';
      this.ctx.audio.playTone(620, 'sine', 0.08);
      this.render();
    } else if (input.isJustPressed('alternate')) {
      this.ctx.storage.remove(DRIFTSPIRE_SAVE_KEY);
      this.pendingSave = null;
      this.bootMode = 'guildSelect';
      this.render();
    }
  }

  private updateGuildSelect(): void {
    const player = this.ctx.players[this.draftCursor];
    const input = this.ctx.input.getPlayer(player.id);
    if (input.isJustPressed('moveLeft')) {
      this.cycleDraftGuild(-1);
      this.render();
    }
    if (input.isJustPressed('moveRight')) {
      this.cycleDraftGuild(1);
      this.render();
    }
    if (input.isJustPressed('action')) {
      const guild = GUILDS[this.draftGuildIndex];
      this.chosenGuildIds.push(guild.id);
      this.ctx.audio.playTone(420 + this.draftCursor * 80, 'triangle', 0.1);
      this.draftCursor++;
      if (this.draftCursor >= this.ctx.players.length) {
        this.rules = DriftspireRules.create({
          seed: this.seed,
          players: this.ctx.players,
          guildIds: this.chosenGuildIds,
        });
        this.bootMode = 'match';
        this.phaseKey = '';
        this.persist();
      } else {
        this.draftGuildIndex = 0;
        this.cycleDraftGuild(1);
      }
      this.render();
    }
  }

  private cycleDraftGuild(direction: number): void {
    for (let attempts = 0; attempts < GUILDS.length; attempts++) {
      this.draftGuildIndex = wrapIndex(this.draftGuildIndex + direction, GUILDS.length);
      if (!this.chosenGuildIds.includes(GUILDS[this.draftGuildIndex].id)) return;
    }
  }

  private updateRoll(dt: number): void {
    if (!this.rules) return;
    const player = this.rules.activePlayer;
    const input = this.ctx.input.getPlayer(player.id);
    if (input.isJustPressed('action')) {
      this.displayedDie = this.rules.rollDice(player.id);
      this.rollAnimationRemaining = 0.75;
      this.movementStepTimer = 0;
      this.onDecision();
      return;
    }
    this.turnElapsed += dt;
    if (this.turnElapsed >= this.turnTimerSeconds) {
      this.displayedDie = this.rules.rollDice(player.id);
      this.rollAnimationRemaining = 0.75;
      this.movementStepTimer = 0;
      this.onDecision();
    }
  }

  private updateMoving(dt: number): void {
    if (!this.rules) return;
    if (this.rollAnimationRemaining > 0) {
      this.rollAnimationRemaining = Math.max(0, this.rollAnimationRemaining - dt);
      this.displayedDie = this.rollAnimationRemaining > 0
        ? 1 + (Math.floor(this.rollAnimationRemaining * 30) % 6)
        : this.rules.state.lastDiceRoll;
      this.render();
      return;
    }
    this.movementStepTimer += dt * this.animationSpeed;
    if (this.movementStepTimer < 0.18) return;
    this.movementStepTimer = 0;
    this.rules.advanceMovementStep();
    this.ctx.audio.playTone(260 + this.rules.state.movementRemaining * 25, 'square', 0.04);
    if (this.rules.state.phase !== 'moving') this.onDecision();
    else {
      this.persist();
      this.render();
    }
  }

  private updateAction(dt: number): void {
    if (!this.rules) return;
    const player = this.rules.activePlayer;
    const input = this.ctx.input.getPlayer(player.id);
    if (this.pactMenuOpen) {
      this.updatePactMenu(player.id);
      return;
    }
    const actions = this.actionMenuItems();
    if (input.isJustPressed('moveUp')) {
      this.actionIndex = wrapIndex(this.actionIndex - 1, actions.length);
      this.actionOptionIndex = 0;
      this.render();
    }
    if (input.isJustPressed('moveDown')) {
      this.actionIndex = wrapIndex(this.actionIndex + 1, actions.length);
      this.actionOptionIndex = 0;
      this.render();
    }
    const selected = actions[this.actionIndex] ?? 'gather';
    if (input.isJustPressed('moveLeft')) {
      this.changeActionOption(selected, -1);
      this.render();
    }
    if (input.isJustPressed('moveRight')) {
      this.changeActionOption(selected, 1);
      this.render();
    }
    if (input.isJustPressed('action')) {
      if (selected === 'pact') {
        this.pactMenuOpen = true;
        this.render();
      } else {
        this.rules.performAction(player.id, selected, this.actionOptionIndex);
        this.onDecision();
      }
      return;
    }
    this.turnElapsed += dt;
    if (this.turnElapsed >= this.turnTimerSeconds) {
      this.rules.performAction(player.id, 'gather');
      this.onDecision();
    }
  }

  private updatePactMenu(playerId: number): void {
    if (!this.rules) return;
    const input = this.ctx.input.getPlayer(playerId);
    const partners = this.rules.state.players.filter((player) => player.id !== playerId);
    if (input.isJustPressed('moveUp')) {
      this.pactTypeIndex = wrapIndex(this.pactTypeIndex - 1, 3);
      this.render();
    }
    if (input.isJustPressed('moveDown')) {
      this.pactTypeIndex = wrapIndex(this.pactTypeIndex + 1, 3);
      this.render();
    }
    if (input.isJustPressed('moveLeft')) {
      this.pactPartnerIndex = wrapIndex(this.pactPartnerIndex - 1, partners.length);
      this.render();
    }
    if (input.isJustPressed('moveRight')) {
      this.pactPartnerIndex = wrapIndex(this.pactPartnerIndex + 1, partners.length);
      this.render();
    }
    if (input.isJustPressed('alternate')) {
      this.pactMenuOpen = false;
      this.render();
    }
    if (input.isJustPressed('action')) {
      const pactTypes: PactType[] = ['jointVenture', 'endorsement', 'commissionAlliance'];
      this.rules.proposePact(playerId, {
        type: pactTypes[this.pactTypeIndex],
        partnerId: partners[this.pactPartnerIndex].id,
        proposalIndex: this.pactProposalIndex,
      });
      this.pactMenuOpen = false;
      this.onDecision();
    }
  }

  private updatePactResponse(): void {
    if (!this.rules?.state.pendingPact) return;
    const partnerId = this.rules.state.pendingPact.partnerId;
    const input = this.ctx.input.getPlayer(partnerId);
    if (input.isJustPressed('action')) {
      this.rules.respondToPact(partnerId, true);
      this.onDecision();
    } else if (input.isJustPressed('alternate')) {
      this.rules.respondToPact(partnerId, false);
      this.onDecision();
    }
  }

  private updateCouncil(): void {
    if (!this.rules) return;
    const voter = this.rules.currentCouncilVoter;
    const input = this.ctx.input.getPlayer(voter.id);
    if (voter.endorsementProposalIndex === undefined) {
      if (input.isJustPressed('moveUp') || input.isJustPressed('moveDown')) {
        this.councilChoiceIndex = this.councilChoiceIndex === 0 ? 1 : 0;
        this.render();
      }
    } else {
      this.councilChoiceIndex = voter.endorsementProposalIndex;
    }
    if (input.isJustPressed('moveLeft')) {
      this.councilFavorSpend = Math.max(0, this.councilFavorSpend - 1);
      this.render();
    }
    if (input.isJustPressed('moveRight')) {
      this.councilFavorSpend = Math.min(2, voter.favor, this.councilFavorSpend + 1);
      this.render();
    }
    if (input.isJustPressed('action')) {
      this.rules.castCouncilVote(voter.id, this.councilChoiceIndex, this.councilFavorSpend);
      this.councilChoiceIndex = 0;
      this.councilFavorSpend = 0;
      this.onDecision();
    }
  }

  private updateShowcase(dt: number): void {
    if (!this.rules) return;
    const definition = showcaseById(this.rules.state.currentShowcaseId);
    this.showcaseElapsed += dt;
    this.showcaseMarker =
      (Math.sin(this.showcaseElapsed * definition.speed * this.animationSpeed * Math.PI) + 1) / 2;
    for (const player of this.rules.state.players) {
      const input = this.ctx.input.getPlayer(player.id);
      if (
        input.isJustPressed('action') &&
        (this.showcaseAttempts[player.id] ?? 0) < 3
      ) {
        const accuracy = Math.max(0, 100 - Math.abs(this.showcaseMarker - definition.target) * 220);
        this.showcaseScores[player.id] = (this.showcaseScores[player.id] ?? 0) + Math.round(accuracy);
        this.showcaseAttempts[player.id] = (this.showcaseAttempts[player.id] ?? 0) + 1;
        this.ctx.audio.playTone(300 + accuracy * 3, 'square', 0.06);
      }
    }
    const allFinished = this.rules.state.players.every(
      (player) => (this.showcaseAttempts[player.id] ?? 0) >= 3,
    );
    if (this.showcaseElapsed >= 12 || allFinished) {
      this.rules.resolveShowcase(this.showcaseScores);
      this.onDecision();
      return;
    }
    this.render();
  }

  private updateSpotlightChoice(): void {
    if (!this.rules?.state.showcaseWinnerId) return;
    const input = this.ctx.input.getPlayer(this.rules.state.showcaseWinnerId);
    if (input.isJustPressed('moveLeft')) {
      this.spotlightChoiceIndex = 0;
      this.render();
    }
    if (input.isJustPressed('moveRight')) {
      this.spotlightChoiceIndex = 1;
      this.render();
    }
    if (input.isJustPressed('action')) {
      this.rules.chooseSpotlight(this.rules.state.showcaseWinnerId, this.spotlightChoiceIndex);
      this.spotlightChoiceIndex = 0;
      this.onDecision();
    }
  }

  private finishMatch(): void {
    if (!this.rules || this.gameOverEmitted) return;
    this.gameOverEmitted = true;
    const standings = this.rules.standings();
    this.ctx.storage.remove(DRIFTSPIRE_SAVE_KEY);
    this.render();
    this.ctx.events.emit('game:over', {
      winnerId: standings[0]?.playerId,
      standings,
    });
  }

  private actionMenuItems(): ActionMenuItem[] {
    if (!this.rules) return ['gather'];
    const actions: ActionMenuItem[] = this.rules.legalActions(this.rules.activePlayer.id);
    if (!this.rules.state.pactUsedThisTurn) actions.push('pact');
    return actions;
  }

  private changeActionOption(action: ActionMenuItem, direction: number): void {
    if (!this.rules) return;
    if (action === 'fund') {
      this.actionOptionIndex = wrapIndex(this.actionOptionIndex + direction, 2);
    } else if (action === 'claim') {
      this.actionOptionIndex = wrapIndex(
        this.actionOptionIndex + direction,
        this.rules.state.commissionRow.length,
      );
    }
  }

  private resetShowcaseIfNeeded(): void {
    if (this.rules?.state.phase !== 'showcase') return;
    this.showcaseElapsed = 0;
    this.showcaseScores = {};
    this.showcaseAttempts = {};
    this.showcaseMarker = 0;
    this.rules.state.players.forEach((player) => {
      this.showcaseScores[player.id] = 0;
      this.showcaseAttempts[player.id] = 0;
    });
  }

  private onDecision(): void {
    this.turnElapsed = 0;
    this.ctx.audio.playTone(520, 'triangle', 0.06);
    this.persist();
    this.phaseKey = '';
    this.render();
  }

  private persist(): void {
    if (!this.rules || this.rules.state.phase === 'finished') return;
    const envelope: SaveEnvelope = {
      schemaVersion: DRIFTSPIRE_SCHEMA_VERSION,
      savedAt: Date.now(),
      state: structuredClone(this.rules.state),
    };
    this.ctx.storage.set(DRIFTSPIRE_SAVE_KEY, envelope);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.errorTime = 3;
    this.ctx.audio.playTone(150, 'sawtooth', 0.12);
    this.render();
  }

  private render(): void {
    if (!this.root) return;
    const removed = this.root.removeChildren();
    removed.forEach((child) => child.destroy({ children: true }));
    this.drawBackground();
    if (this.bootMode === 'resumePrompt') this.drawResumePrompt();
    else if (this.bootMode === 'guildSelect') this.drawGuildSelect();
    else if (this.rules) this.drawMatch();
    if (this.errorTime > 0) this.drawToast(this.errorMessage, PINK);
  }

  private drawBackground(): void {
    const background = new Graphics();
    background.rect(0, 0, 480, 270).fill({ color: BG });
    for (let index = 0; index < 18; index++) {
      const x = (index * 73 + 17) % 480;
      const y = (index * 41 + 29) % 220;
      background.circle(x, y, index % 3 === 0 ? 1.2 : 0.7).fill({ color: 0x5f82b8, alpha: 0.45 });
    }
    background
      .ellipse(90, 235, 130, 20)
      .fill({ color: 0x1a3159, alpha: 0.45 })
      .ellipse(380, 225, 170, 24)
      .fill({ color: 0x17294c, alpha: 0.5 });
    this.root.addChild(background);
  }

  private drawResumePrompt(): void {
    this.panel(72, 48, 336, 172, GOLD);
    this.label('DRIFTSPIRE', 240, 69, 22, GOLD, 0.5);
    this.label('A FESTIVAL IS STILL IN PROGRESS', 240, 98, 9, INK, 0.5);
    if (this.pendingSave) {
      this.label(
        `ACT ${this.pendingSave.act}  •  ROUND ${this.pendingSave.round}`,
        240,
        121,
        12,
        CYAN,
        0.5,
      );
    }
    this.label('P1 ACTION', 170, 164, 10, GREEN, 0.5);
    this.label('CONTINUE', 170, 181, 12, INK, 0.5);
    this.label('P1 ALT', 310, 164, 10, PINK, 0.5);
    this.label('NEW FESTIVAL', 310, 181, 12, INK, 0.5);
  }

  private drawGuildSelect(): void {
    const player = this.ctx.players[this.draftCursor];
    const guild = GUILDS[this.draftGuildIndex];
    this.label('DRIFTSPIRE // GUILD DRAFT', 12, 10, 13, GOLD);
    this.label(`P${player.id} ${player.name.toUpperCase()} — CHOOSE YOUR GUILD`, 12, 31, 10, parseColor(player.color));
    this.panel(62, 57, 356, 152, guild.color);
    const crest = new Graphics();
    crest
      .circle(126, 117, 31)
      .fill({ color: guild.color, alpha: 0.18 })
      .circle(126, 117, 22)
      .stroke({ color: guild.color, width: 4 })
      .poly([126, 95, 143, 129, 109, 129])
      .fill({ color: guild.color });
    this.root.addChild(crest);
    this.label(guild.name.toUpperCase(), 176, 80, 17, INK);
    this.label(guild.description, 176, 109, 10, MUTED, 0, 205);
    this.label('◀ / ▶  BROWSE', 176, 163, 9, CYAN);
    this.label('ACTION  CONFIRM', 176, 181, 9, GREEN);

    this.ctx.players.forEach((candidate, index) => {
      const selected = this.chosenGuildIds[index];
      this.label(
        `P${candidate.id}  ${selected ? guildById(selected).shortName : index === this.draftCursor ? 'CHOOSING…' : 'WAITING'}`,
        20 + index * 115,
        239,
        9,
        parseColor(candidate.color),
      );
    });
  }

  private drawMatch(): void {
    if (!this.rules) return;
    if (this.rules.state.phase === 'showcase') {
      this.drawShowcase();
      return;
    }
    this.drawHeader();
    this.drawScoreboard();
    this.drawBoard();
    this.drawCommandPanel();
    this.drawLog();
  }

  private drawHeader(): void {
    if (!this.rules) return;
    const graphics = new Graphics();
    graphics.rect(0, 0, 480, 27).fill({ color: 0x0e1830 }).rect(0, 26, 480, 1).fill({ color: 0x29436b });
    this.root.addChild(graphics);
    this.label('DRIFTSPIRE', 8, 6, 11, GOLD);
    this.label(`ACT ${this.rules.state.act}/3  •  ROUND ${this.rules.state.round}/6`, 111, 7, 8, INK);
    this.label('SPOTLIGHT', 257, 6, 7, MUTED);
    this.label(this.rules.state.currentSpotlight.join(' + ').toUpperCase(), 318, 6, 8, CYAN);
    this.label(`NEXT ${this.rules.state.nextSpotlight.join('+').toUpperCase()}`, 400, 16, 6, MUTED);
  }

  private drawScoreboard(): void {
    if (!this.rules) return;
    this.panel(5, 33, 106, 198, MUTED);
    this.label('GUILD ROSTER', 12, 39, 8, MUTED);
    this.rules.state.players.forEach((player, index) => {
      const y = 52 + index * 43;
      const color = parseColor(player.color);
      const card = new Graphics();
      card.roundRect(10, y, 96, 41, 3).fill({ color: PANEL_LIGHT, alpha: 0.92 });
      card.rect(10, y, 3, 41).fill({ color });
      this.root.addChild(card);
      this.label(`P${player.id} ${guildById(player.guildId).shortName}`, 17, y + 4, 8, color);
      this.label(`${player.renown} RENOWN`, 17, y + 15, 9, GOLD);
      this.label(`¢${player.coin} ◆${player.favor} C${player.crestsAvailable} JOB${player.activeCommissions.length}`, 17, y + 26, 6, INK);
      this.label(`AMB: ${ambitionById(player.ambitionId).title.toUpperCase()}`, 17, y + 34, 5, MUTED);
    });
  }

  private drawBoard(): void {
    if (!this.rules) return;
    const positions = this.boardTilePositions();
    const connections = new Graphics();
    positions.forEach((position, index) => {
      const next = positions[(index + 1) % positions.length];
      connections
        .moveTo(position.x, position.y)
        .lineTo(next.x, next.y);
    });
    connections.stroke({ color: 0x486b94, width: 4 });
    connections
      .roundRect(160, 85, 152, 101, 12)
      .fill({ color: 0x111f3c, alpha: 0.92 })
      .stroke({ color: GOLD, width: 2 })
      .ellipse(236, 118, 52, 23)
      .fill({ color: 0x263e68 })
      .poly([236, 84, 258, 121, 214, 121])
      .fill({ color: 0xffd166, alpha: 0.75 });
    this.root.addChild(connections);
    this.label('THE FLOATING CITY', 236, 133, 10, GOLD, 0.5);
    this.label('ROLL • TRAVEL • BUILD • BARGAIN', 236, 150, 6, MUTED, 0.5);
    this.label(`NEXT: ${this.rules.state.nextSpotlight.join(' + ').toUpperCase()}`, 236, 167, 6, CYAN, 0.5);

    this.rules.state.boardTiles.forEach((tile, index) => {
      const district = this.rules!.state.districts[tile.districtId];
      const definition = districtById(tile.districtId);
      const position = positions[index];
      const activeHere =
        this.rules!.activePlayer.positionTileIndex === index &&
        (this.rules!.state.phase === 'roll' ||
          this.rules!.state.phase === 'moving' ||
          this.rules!.state.phase === 'tileAction');
      const node = new Graphics();
      node
        .roundRect(position.x - 15, position.y - 12, 30, 24, 3)
        .fill({ color: tile.kind === 'start' ? 0x5d4779 : definition.color, alpha: 0.92 })
        .stroke({ color: activeHere ? GOLD : 0x9ab2d0, width: activeHere ? 2 : 1 });
      this.root.addChild(node);
      this.label(String(index), position.x - 12, position.y - 10, 4, 0xc8d8eb);
      this.label(this.tileTitle(tile.kind, district.venture.branch), position.x, position.y - 4, 5, INK, 0.5);
      this.label(definition.shortName.slice(0, 5), position.x, position.y + 4, 4, tile.kind === 'start' ? GOLD : 0xd6e6f5, 0.5);
      if (tile.kind === 'venture') {
        const crestCount = Object.values(district.venture.contributions).reduce((sum, count) => sum + count, 0);
        this.label(`${'◆'.repeat(Math.min(5, crestCount))}`, position.x, position.y + 8, 4, GOLD, 0.5);
      }
      const occupants = this.rules!.state.players.filter((player) => player.positionTileIndex === index);
      occupants.forEach((player, occupantIndex) => {
        const token = new Graphics();
        token
          .circle(position.x - 9 + occupantIndex * 6, position.y + 14, 4)
          .fill({ color: parseColor(player.color) })
          .stroke({ color: INK, width: 1 });
        this.root.addChild(token);
        this.label(String(player.id), position.x - 9 + occupantIndex * 6, position.y + 11.5, 4, BG, 0.5);
      });
    });
  }

  private boardTilePositions(): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    for (let column = 0; column < 8; column++) positions.push({ x: 124 + column * 32, y: 47 });
    for (let row = 1; row < 7; row++) positions.push({ x: 348, y: 47 + row * 30 });
    for (let column = 6; column >= 0; column--) positions.push({ x: 124 + column * 32, y: 227 });
    for (let row = 5; row >= 2; row--) positions.push({ x: 124, y: 47 + row * 30 });
    return positions;
  }

  private drawCommandPanel(): void {
    if (!this.rules) return;
    this.panel(365, 33, 110, 198, CYAN);
    const phase = this.rules.state.phase;
    if (phase === 'roll' || phase === 'moving') this.drawDicePanel();
    else if (phase === 'tileAction') this.drawActionPanel();
    else if (phase === 'pactResponse') this.drawPactResponsePanel();
    else if (phase === 'council') this.drawCouncilPanel();
    else if (phase === 'spotlightChoice') this.drawSpotlightPanel();
    else if (phase === 'finished') this.drawFinishedPanel();
  }

  private drawDicePanel(): void {
    if (!this.rules) return;
    const player = this.rules.activePlayer;
    const moving = this.rules.state.phase === 'moving';
    this.label(`P${player.id} TURN`, 372, 40, 9, parseColor(player.color));
    this.label(guildById(player.guildId).shortName, 372, 53, 7, MUTED);
    this.label(moving ? 'MOVING…' : 'ROLL THE DICE', 420, 72, 8, moving ? CYAN : GOLD, 0.5);
    this.drawDie(393, 84, 54, moving ? this.displayedDie : this.rules.state.lastDiceRoll);
    if (moving) {
      this.label(
        `${this.rules.state.movementRemaining} TILE${this.rules.state.movementRemaining === 1 ? '' : 'S'} LEFT`,
        420,
        146,
        9,
        GOLD,
        0.5,
      );
    } else {
      this.label('ACTION TO ROLL', 420, 146, 9, GREEN, 0.5);
    }
    const commission = player.activeCommissions[0];
    if (commission) {
      const definition = commissionById(commission.id);
      this.label(`JOB: ${definition.title.toUpperCase()}`, 372, 169, 5, INK);
      this.label(`${commission.progress}/${definition.target}`, 463, 169, 6, GOLD, 1);
    }
    this.label('MOVE CLOCKWISE', 420, 190, 7, MUTED, 0.5);
    this.label('ONE TILE AT A TIME', 420, 201, 7, MUTED, 0.5);
    if (!moving) this.drawTimer();
  }

  private drawActionPanel(): void {
    if (!this.rules) return;
    const player = this.rules.activePlayer;
    const actions = this.actionMenuItems();
    this.label(`P${player.id} DISTRICT`, 372, 40, 9, parseColor(player.color));
    this.label(districtById(player.positionDistrictId).shortName, 372, 53, 8, GOLD);
    if (this.pactMenuOpen) {
      this.drawPactMenuPanel();
      return;
    }
    actions.forEach((action, index) => {
      const y = 72 + index * 19;
      const selected = index === this.actionIndex;
      if (selected) {
        const highlight = new Graphics();
        highlight.roundRect(371, y - 2, 97, 16, 2).fill({ color: 0x294b67 });
        this.root.addChild(highlight);
      }
      this.label(`${selected ? '▶' : ' '} ${this.actionLabel(action)}`, 374, y, 7, selected ? INK : MUTED);
    });
    const selected = actions[this.actionIndex] ?? 'gather';
    this.drawActionDetail(selected);
    this.drawTimer();
  }

  private drawActionDetail(action: ActionMenuItem): void {
    if (!this.rules) return;
    const player = this.rules.activePlayer;
    const district = districtById(player.positionDistrictId);
    let detail = '';
    if (action === 'fund') {
      const branch = this.rules.state.districts[district.id].venture.branch ??
        district.branches[this.actionOptionIndex % 2];
      detail = `${branch} • COST ${this.rules.fundingCost(player.id, branch)} COIN\n←→ CHOOSE BRANCH`;
    } else if (action === 'claim') {
      const id = this.rules.state.commissionRow[this.actionOptionIndex];
      const item = id ? commissionById(id) : null;
      detail = item ? `${item.title}\n${item.description}\n←→ BROWSE` : 'NO COMMISSIONS';
    } else if (action === 'landmark') {
      detail = district.description;
    } else if (action === 'gather') {
      detail = 'Gain 2 Coin safely.';
    } else {
      detail = 'Offer a Joint Venture,\nEndorsement, or Alliance.';
    }
    this.label(detail, 373, 173, 6, INK, 0, 94);
  }

  private drawPactMenuPanel(): void {
    if (!this.rules) return;
    const activeId = this.rules.activePlayer.id;
    const partners = this.rules.state.players.filter((player) => player.id !== activeId);
    const types = ['JOINT VENTURE', 'ENDORSEMENT', 'COMMISSION ALLY'];
    this.label('PACT BUILDER', 372, 73, 8, GOLD);
    types.forEach((type, index) => {
      this.label(
        `${index === this.pactTypeIndex ? '▶' : ' '} ${type}`,
        372,
        90 + index * 15,
        6,
        index === this.pactTypeIndex ? INK : MUTED,
      );
    });
    const partner = partners[this.pactPartnerIndex];
    this.label('PARTNER', 372, 142, 6, MUTED);
    this.label(`← P${partner?.id ?? '?'} ${partner?.name ?? ''} →`, 372, 154, 7, partner ? parseColor(partner.color) : INK);
    this.label('ACTION SEND', 372, 184, 7, GREEN);
    this.label('ALT CANCEL', 372, 198, 7, PINK);
  }

  private drawPactResponsePanel(): void {
    if (!this.rules?.state.pendingPact) return;
    const pact = this.rules.state.pendingPact;
    const partner = this.rules.player(pact.partnerId);
    const proposer = this.rules.player(pact.proposerId);
    this.label(`P${partner.id} OFFER`, 372, 42, 9, parseColor(partner.color));
    this.label(`${proposer.name} proposes`, 372, 67, 7, MUTED);
    this.label(this.pactLabel(pact.type), 372, 82, 9, GOLD);
    const description =
      pact.type === 'jointVenture'
        ? 'Pay 1 Coin each and\nplace one Crest each.'
        : pact.type === 'endorsement'
          ? 'Receive 2 Coin and\ncommit your Council vote.'
          : 'Share 1 Renown when\nthe Commission finishes.';
    this.label(description, 372, 105, 7, INK, 0, 94);
    this.label('ACTION ACCEPT', 372, 177, 8, GREEN);
    this.label('ALT DECLINE', 372, 195, 8, PINK);
  }

  private drawCouncilPanel(): void {
    if (!this.rules) return;
    const voter = this.rules.currentCouncilVoter;
    this.label(`P${voter.id} COUNCIL`, 372, 41, 9, parseColor(voter.color));
    this.rules.state.ordinanceOptions.forEach((id, index) => {
      const item = ordinanceById(id);
      const y = 65 + index * 50;
      const selected = index === this.councilChoiceIndex;
      const box = new Graphics();
      box
        .roundRect(371, y, 98, 43, 3)
        .fill({ color: selected ? 0x294b67 : PANEL_LIGHT })
        .stroke({ color: selected ? GOLD : MUTED, width: 1 });
      this.root.addChild(box);
      this.label(item.title, 376, y + 5, 7, selected ? GOLD : INK);
      this.label(item.description, 376, y + 17, 5, MUTED, 0, 88);
    });
    if (voter.endorsementProposalIndex !== undefined) {
      this.label('PACT-COMMITTED VOTE', 372, 169, 6, PINK);
    }
    this.label(`FAVOR BID  ${this.councilFavorSpend}`, 372, 184, 8, CYAN);
    this.label('←→ BID • ACTION VOTE', 372, 203, 6, GREEN);
  }

  private drawSpotlightPanel(): void {
    if (!this.rules?.state.spotlightChoices || !this.rules.state.showcaseWinnerId) return;
    const winner = this.rules.player(this.rules.state.showcaseWinnerId);
    this.label(`P${winner.id} CHOOSES`, 372, 42, 9, parseColor(winner.color));
    this.label('NEXT SPOTLIGHT', 372, 56, 8, GOLD);
    this.rules.state.spotlightChoices.forEach((choice, index) => {
      const y = 82 + index * 43;
      const selected = index === this.spotlightChoiceIndex;
      const box = new Graphics();
      box
        .roundRect(372, y, 96, 32, 3)
        .fill({ color: selected ? 0x294b67 : PANEL_LIGHT })
        .stroke({ color: selected ? GOLD : MUTED, width: 1 });
      this.root.addChild(box);
      this.label(choice.join(' + ').toUpperCase(), 420, y + 11, 7, selected ? INK : MUTED, 0.5);
    });
    this.label('←→ CHOOSE', 372, 178, 7, MUTED);
    this.label('ACTION CONFIRM', 372, 196, 8, GREEN);
  }

  private drawFinishedPanel(): void {
    if (!this.rules) return;
    const standings = this.rules.standings();
    this.label('FESTIVAL COMPLETE', 372, 42, 8, GOLD);
    standings.forEach((standing, index) => {
      const player = this.rules!.player(standing.playerId);
      this.label(
        `${index + 1}. P${player.id}  ${standing.score}`,
        372,
        70 + index * 22,
        9,
        index === 0 ? GOLD : parseColor(player.color),
      );
    });
  }

  private drawShowcase(): void {
    if (!this.rules) return;
    const definition = showcaseById(this.rules.state.currentShowcaseId);
    this.label(`ACT ${this.rules.state.act} SHOWCASE`, 240, 17, 9, MUTED, 0.5);
    this.label(definition.title, 240, 38, 18, definition.color, 0.5);
    this.label(definition.instruction, 240, 66, 8, INK, 0.5, 360);
    const track = new Graphics();
    track
      .roundRect(50, 96, 380, 28, 8)
      .fill({ color: PANEL_LIGHT })
      .rect(50 + definition.target * 380 - 15, 96, 30, 28)
      .fill({ color: GREEN, alpha: 0.38 })
      .rect(50 + this.showcaseMarker * 380 - 2, 91, 4, 38)
      .fill({ color: GOLD });
    this.root.addChild(track);
    this.label('PERFECT', 50 + definition.target * 380, 105, 6, INK, 0.5);
    this.rules.state.players.forEach((player, index) => {
      const x = 45 + index * 108;
      this.panel(x, 150, 96, 65, parseColor(player.color));
      this.label(`P${player.id} ${guildById(player.guildId).shortName}`, x + 8, 158, 7, parseColor(player.color));
      this.label(`SCORE ${this.showcaseScores[player.id] ?? 0}`, x + 8, 174, 9, GOLD);
      this.label(`TRIES ${this.showcaseAttempts[player.id] ?? 0}/3`, x + 8, 190, 7, INK);
    });
    this.label(`TIME ${Math.max(0, 12 - this.showcaseElapsed).toFixed(1)}  •  EVERYONE: ACTION TO LOCK`, 240, 239, 8, CYAN, 0.5);
  }

  private drawLog(): void {
    if (!this.rules) return;
    const message = this.rules.state.log[0] ?? '';
    const graphics = new Graphics();
    graphics.roundRect(6, 238, 468, 25, 3).fill({ color: 0x0e1830, alpha: 0.96 });
    this.root.addChild(graphics);
    this.label(message, 13, 246, 7, INK, 0, 451);
  }

  private drawTimer(): void {
    const remaining = Math.max(0, Math.ceil(this.turnTimerSeconds - this.turnElapsed));
    const color = remaining <= 5 ? PINK : MUTED;
    this.label(`${remaining}s`, 460, 215, 7, color, 1);
  }

  private drawToast(message: string, color: number): void {
    const box = new Graphics();
    box.roundRect(78, 222, 324, 31, 4).fill({ color: 0x080d1c, alpha: 0.98 }).stroke({ color, width: 2 });
    this.root.addChild(box);
    this.label(message, 240, 232, 8, color, 0.5, 300);
  }

  private panel(x: number, y: number, width: number, height: number, border: number): void {
    const panel = new Graphics();
    panel
      .roundRect(x, y, width, height, 5)
      .fill({ color: PANEL, alpha: 0.96 })
      .stroke({ color: border, width: 1 });
    this.root.addChild(panel);
  }

  private drawDie(x: number, y: number, size: number, value: number): void {
    const die = new Graphics();
    die
      .roundRect(x, y, size, size, 7)
      .fill({ color: 0xf7f1dd })
      .stroke({ color: GOLD, width: 3 });
    const low = size * 0.25;
    const mid = size * 0.5;
    const high = size * 0.75;
    const patterns: Record<number, Array<[number, number]>> = {
      1: [[mid, mid]],
      2: [[low, low], [high, high]],
      3: [[low, low], [mid, mid], [high, high]],
      4: [[low, low], [high, low], [low, high], [high, high]],
      5: [[low, low], [high, low], [mid, mid], [low, high], [high, high]],
      6: [[low, low], [high, low], [low, mid], [high, mid], [low, high], [high, high]],
    };
    (patterns[Math.max(1, Math.min(6, value))] ?? patterns[1]).forEach(([pipX, pipY]) => {
      die.circle(x + pipX, y + pipY, 4).fill({ color: 0x18213a });
    });
    this.root.addChild(die);
  }

  private label(
    value: string,
    x: number,
    y: number,
    size: number,
    color: number,
    anchor = 0,
    wrapWidth = 0,
  ): Text {
    const text = new Text({
      text: value,
      style: {
        fontFamily: 'monospace',
        fontSize: size,
        fontWeight: 'bold',
        fill: color,
        align: anchor === 0.5 ? 'center' : 'left',
        wordWrap: wrapWidth > 0,
        wordWrapWidth: wrapWidth || undefined,
        lineHeight: Math.ceil(size * 1.25),
      },
    });
    text.x = x;
    text.y = y;
    text.anchor.set(anchor, 0);
    this.root.addChild(text);
    return text;
  }

  private actionLabel(action: ActionMenuItem): string {
    if (action === 'fund') return 'FUND VENTURE';
    if (action === 'claim') return 'CLAIM JOB';
    if (action === 'landmark') return 'LANDMARK';
    if (action === 'pact') return 'PROPOSE PACT';
    return 'GATHER COIN';
  }

  private pactLabel(type: PactType): string {
    if (type === 'jointVenture') return 'JOINT VENTURE';
    if (type === 'endorsement') return 'ENDORSEMENT';
    return 'COMMISSION ALLIANCE';
  }

  private tileTitle(kind: DriftspireMatchState['boardTiles'][number]['kind'], branch: string | null): string {
    if (kind === 'start') return '★ START';
    if (kind === 'venture') return branch ? branch.slice(0, 6).toUpperCase() : 'BUILD';
    if (kind === 'commission') return 'JOB';
    if (kind === 'landmark') return 'LAND';
    if (kind === 'coin') return '+2 COIN';
    return '+1 FAVOR';
  }

  private get turnTimerSeconds(): number {
    const configured = Number(this.ctx.modifiers.turnTimerSeconds ?? 35);
    return Math.max(20, Math.min(90, configured));
  }

  private get animationSpeed(): number {
    return Math.max(0.75, Math.min(1.5, Number(this.ctx.modifiers.animationSpeed ?? 1)));
  }
}
