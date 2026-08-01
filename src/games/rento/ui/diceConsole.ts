import { Container, Graphics, Text } from 'pixi.js';
import { createLabel } from './components';
import { RENT0_TEXT, RENT0_THEME } from './theme';

export type DiceConsoleKind = 'normal' | 'lucky' | 'heavy' | 'chaos' | 'golden';

export interface DiceConsoleInventoryItem {
  id: DiceConsoleKind;
  label: string;
  count: number | '∞';
  enabled: boolean;
}

export interface DiceConsoleView {
  playerName: string;
  playerColor: number;
  selected: DiceConsoleKind;
  inventory: DiceConsoleInventoryItem[];
  values: number[];
  rolling: boolean;
  canRoll: boolean;
  animationFrame?: number;
}

const destroyChildren = (container: Container): void => {
  container.removeChildren().forEach((child) => child.destroy({ children: true }));
};

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.23], [0.72, 0.23], [0.28, 0.5], [0.72, 0.5], [0.28, 0.77], [0.72, 0.77]],
};

const DICE_COLORS: Record<DiceConsoleKind, number> = {
  normal: 0xe9f2f3,
  lucky: RENT0_THEME.emerald,
  heavy: RENT0_THEME.cyan,
  chaos: RENT0_THEME.violet,
  golden: RENT0_THEME.gold,
};

const DICE_ICONS: Record<DiceConsoleKind, string> = {
  normal: 'N',
  lucky: 'L',
  heavy: '2X',
  chaos: '12',
  golden: 'G',
};

/** The board's central physical interaction: inventory selector, animated dice and roll plate. */
export class RentoDiceConsole extends Container {
  public readonly actionBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
  private readonly consoleX = 332;
  private readonly consoleY = 148;
  private readonly consoleWidth = 296;
  private readonly consoleHeight = 198;

  public render(view: DiceConsoleView): void {
    destroyChildren(this);
    this.actionBounds.clear();
    const root = new Container({ x: this.consoleX, y: this.consoleY });

    const casework = new Graphics()
      .roundRect(5, 7, this.consoleWidth, this.consoleHeight, 14)
      .fill({ color: 0x01070c, alpha: 0.62 })
      .roundRect(0, 0, this.consoleWidth, this.consoleHeight, 14)
      .fill({ color: 0x0a1b2a, alpha: 0.98 })
      .roundRect(1, 1, this.consoleWidth - 2, this.consoleHeight - 2, 13)
      .stroke({ color: RENT0_THEME.gold, width: 2 })
      .roundRect(7, 7, this.consoleWidth - 14, this.consoleHeight - 14, 10)
      .stroke({ color: view.playerColor, width: 1, alpha: 0.55 })
      .rect(14, 32, this.consoleWidth - 28, 1)
      .fill({ color: RENT0_THEME.line, alpha: 0.62 });
    root.addChild(casework);

    const title = createLabel('CENTRAL DICE VAULT', 15, 10, 'heading');
    title.style.fill = RENT0_THEME.gold;
    const player = createLabel(view.playerName.toUpperCase(), this.consoleWidth - 15, 13, 'tiny');
    player.anchor.set(1, 0);
    player.style.fill = view.playerColor;
    root.addChild(title, player);

    const chipWidth = 49;
    const chipGap = 5;
    const chipStart = 15;
    view.inventory.slice(0, 5).forEach((item, index) => {
      const x = chipStart + index * (chipWidth + chipGap);
      const selected = item.id === view.selected;
      const color = DICE_COLORS[item.id];
      const chip = new Graphics()
        .roundRect(x + 2, 39, chipWidth, 37, 5)
        .fill({ color: 0x01060a, alpha: 0.6 })
        .roundRect(x, 37, chipWidth, 37, 5)
        .fill({ color: selected ? color : 0x102638, alpha: item.enabled ? 0.96 : 0.46 })
        .roundRect(x + 1, 38, chipWidth - 2, 35, 4)
        .stroke({ color: selected ? RENT0_THEME.ink : color, width: selected ? 2 : 1, alpha: item.enabled ? 1 : 0.35 });
      const icon = createLabel(DICE_ICONS[item.id], x + 12, 45, 'heading');
      icon.anchor.set(0.5, 0);
      icon.x = x + 15;
      icon.style.fill = selected ? RENT0_THEME.night : color;
      const count = createLabel(String(item.count), x + chipWidth - 7, 49, 'body');
      count.anchor.set(0.5, 0);
      count.style.fill = selected ? RENT0_THEME.night : RENT0_THEME.ink;
      const name = createLabel(item.label, x + chipWidth / 2, 64, 'tiny');
      name.anchor.set(0.5, 0);
      name.style.fontSize = 6;
      name.style.fill = selected ? RENT0_THEME.night : RENT0_THEME.muted;
      root.addChild(chip, icon, count, name);
      this.actionBounds.set(`dice-select:${item.id}`, {
        x: this.consoleX + x,
        y: this.consoleY + 37,
        width: chipWidth,
        height: 37,
      });
    });

    const tray = new Graphics()
      .roundRect(13, 84, 90, 90, 9)
      .fill({ color: 0x02080e })
      .roundRect(16, 87, 84, 83, 7)
      .stroke({ color: DICE_COLORS[view.selected], width: 1.5, alpha: 0.75 });
    root.addChild(tray);

    const values = view.values.length ? view.values : [1];
    if (values.length === 1) {
      const die = this.createDie(values[0], 54, DICE_COLORS[view.selected], view.rolling, view.animationFrame ?? 0);
      die.position.set(58, 129);
      root.addChild(die);
    } else {
      values.slice(0, 2).forEach((value, index) => {
        const die = this.createDie(value, 38, DICE_COLORS[view.selected], view.rolling, (view.animationFrame ?? 0) + index * 2);
        die.position.set(39 + index * 35, 129 + (index ? 7 : -6));
        root.addChild(die);
      });
    }

    const selectedName = view.inventory.find((item) => item.id === view.selected)?.label ?? 'DIE';
    const status = createLabel(view.rolling ? 'ROLLING…' : `${selectedName.toUpperCase()} READY`, 119, 94, 'heading');
    status.style.fill = view.rolling ? RENT0_THEME.cyan : DICE_COLORS[view.selected];
    const hint = createLabel(
      view.rolling ? 'THE VAULT IS CALCULATING YOUR MOVE' : 'CHOOSE A DIE ABOVE, THEN LAUNCH',
      119,
      114,
      'tiny',
    );
    hint.style.fontSize = 6;
    root.addChild(status, hint);

    const buttonColor = view.canRoll ? DICE_COLORS[view.selected] : RENT0_THEME.line;
    const rollPlate = new Graphics()
      .roundRect(119, 134, 162, 38, 8)
      .fill({ color: 0x01060a, alpha: 0.7 })
      .roundRect(117, 131, 162, 38, 8)
      .fill({ color: buttonColor, alpha: view.canRoll ? 0.96 : 0.4 })
      .roundRect(120, 134, 156, 32, 6)
      .stroke({ color: RENT0_THEME.ink, width: 1.5, alpha: view.canRoll ? 0.9 : 0.25 });
    const rollText = createLabel(view.rolling ? 'ROLLING' : 'ROLL DICE', 198, 143, 'heading');
    rollText.anchor.set(0.5, 0);
    rollText.style.fill = RENT0_THEME.night;
    root.addChild(rollPlate, rollText);
    this.actionBounds.set('dice-roll-center', {
      x: this.consoleX + 117,
      y: this.consoleY + 131,
      width: 162,
      height: 38,
    });

    this.addChild(root);
  }

  private createDie(value: number, size: number, color: number, rolling: boolean, frame: number): Container {
    const die = new Container();
    const half = size / 2;
    const rotation = rolling ? Math.sin(frame * 1.7) * 0.2 : 0;
    die.rotation = rotation;
    const graphics = new Graphics()
      .roundRect(-half + 3, -half + 5, size, size, Math.max(6, size * 0.14))
      .fill({ color: 0x000000, alpha: 0.5 })
      .roundRect(-half, -half, size, size, Math.max(6, size * 0.14))
      .fill({ color })
      .roundRect(-half + 3, -half + 3, size - 6, size - 6, Math.max(4, size * 0.1))
      .stroke({ color: RENT0_THEME.ink, width: 1.5, alpha: 0.82 });
    die.addChild(graphics);
    if (value <= 6) {
      for (const [px, py] of PIPS[Math.max(1, value)] ?? PIPS[1]) {
        graphics.circle(-half + px * size, -half + py * size, Math.max(2.3, size * 0.065))
          .fill({ color: RENT0_THEME.night });
      }
    } else {
      const number = new Text({
        text: String(value),
        style: { ...RENT0_TEXT.title, fontSize: size * 0.45, fill: RENT0_THEME.night },
      });
      number.anchor.set(0.5);
      die.addChild(number);
    }
    return die;
  }
}
