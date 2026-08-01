import { Container, Text } from 'pixi.js';
import { createActionButton, createLabel, createPanel, createPlayerBadge, type PlayerView } from './components';
import { RENT0_TEXT, RENT0_THEME } from './theme';

const destroyChildren = (container: Container): void => {
  container.removeChildren().forEach((child) => child.destroy({ children: true }));
};

export interface RentoHudView {
  players: PlayerView[];
  activePlayerId?: number;
  turn: number;
  turnLimit: number;
  phase: string;
  economyIndex?: number;
  message?: string;
  actions?: Array<{ id: string; label: string; enabled?: boolean; accent?: number }>;
}

/** Screen furniture deliberately stays outside the physical board. */
export class RentoHud extends Container {
  private readonly titleLayer = new Container();
  private readonly sidebars = new Container();
  private readonly dock = new Container();
  public readonly actionBounds = new Map<string, { x: number; y: number; width: number; height: number }>();

  public constructor() {
    super();
    this.addChild(this.titleLayer, this.sidebars, this.dock);
  }

  public render(view: RentoHudView): void {
    destroyChildren(this.titleLayer);
    destroyChildren(this.sidebars);
    destroyChildren(this.dock);
    this.actionBounds.clear();

    const title = createPanel({ x: 322, y: 10, width: 316, height: 39, accent: RENT0_THEME.gold });
    const heading = createLabel('RENTO  •  CITY TYCOON', 158, 7, 'title');
    heading.anchor.set(0.5, 0); heading.scale.set(0.69);
    const phase = view.phase.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
    const economy = view.economyIndex ?? 0;
    const sub = createLabel(`TURN ${view.turn}/${view.turnLimit}  •  ${phase}  •  ECO ${economy >= 0 ? '+' : ''}${economy}`, 158, 27, 'tiny');
    sub.anchor.set(0.5, 0); sub.style.fill = RENT0_THEME.cyan;
    title.addChild(heading, sub);
    this.titleLayer.addChild(title);

    const playerPositions = [[12, 12], [758, 12], [12, 72], [758, 72]] as const;
    view.players.slice(0, 4).forEach((player, index) => {
      const badge = createPlayerBadge({ ...player, isActive: player.id === view.activePlayerId }, 190);
      badge.position.set(...playerPositions[index]);
      this.sidebars.addChild(badge);
    });

    const pulse = createPanel({ x: 12, y: 142, width: 198, height: 61, accent: RENT0_THEME.goldDark, alpha: 0.9 });
    const pulseHeading = createLabel('CITY PULSE', 11, 8, 'tiny'); pulseHeading.style.fill = RENT0_THEME.gold;
    const active = view.players.find((player) => player.id === view.activePlayerId);
    const pulseBody = createLabel(`${active?.name ?? 'CITY'} IN CONTROL\nECONOMY ${economy >= 0 ? '+' : ''}${economy}  •  ROUND ${view.turn}`, 11, 24, 'tiny');
    pulseBody.style.fontSize = 7; pulseBody.style.fill = RENT0_THEME.ink;
    pulse.addChild(pulseHeading, pulseBody);
    this.sidebars.addChild(pulse);

    const news = createPanel({ x: 750, y: 142, width: 198, height: 61, accent: RENT0_THEME.cyan, alpha: 0.9 });
    const newsHeading = createLabel('CITY NEWS', 11, 8, 'tiny'); newsHeading.style.fill = RENT0_THEME.cyan;
    const message = new Text({
      text: view.message || 'The market is watching.',
      style: { ...RENT0_TEXT.tiny, fontSize: 6.5, fill: RENT0_THEME.ink, wordWrap: true, wordWrapWidth: 174, lineHeight: 8 },
    });
    message.position.set(11, 23);
    news.addChild(newsHeading, message);
    this.sidebars.addChild(news);

    const actions = view.actions ?? [];
    const width = 112; const gap = 10;
    let x = (960 - (actions.length * width + Math.max(0, actions.length - 1) * gap)) / 2;
    for (const action of actions) {
      const button = createActionButton(action.label, width, action.enabled === false ? RENT0_THEME.line : action.accent ?? RENT0_THEME.gold);
      button.position.set(x, 495);
      button.alpha = action.enabled === false ? 0.42 : 1;
      this.dock.addChild(button);
      this.actionBounds.set(action.id, { x, y: 495, width, height: 31 });
      x += width + gap;
    }
  }
}
