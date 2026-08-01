import { Container, Graphics } from 'pixi.js';
import { createActionButton, createLabel, createPanel, type PropertyView } from './components';
import { RENT0_THEME } from './theme';

export interface OverlayAction { id: string; label: string; accent?: number; }
export interface RentoOverlayModel { title: string; subtitle?: string; body?: string; properties?: PropertyView[]; actions: OverlayAction[]; }

const destroyChildren = (container: Container): void => {
  container.removeChildren().forEach((child) => child.destroy({ children: true }));
};

/** Generic modal suitable for Market, Bank, Auction, Event and Property actions. */
export class RentoModal extends Container {
  public readonly actionBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
  public render(model: RentoOverlayModel): void {
    destroyChildren(this); this.actionBounds.clear();
    const shade = new Graphics().rect(0, 0, 960, 540).fill({ color: 0x01060b, alpha: 0.72 });
    const panelY = 86;
    const panel = createPanel({ x: 190, y: panelY, width: 580, height: 368, accent: RENT0_THEME.gold });
    panel.addChild(createLabel(model.title.toUpperCase(), 26, 22, 'title'));
    if (model.subtitle) { const sub = createLabel(model.subtitle, 27, 53, 'body'); sub.style.fill = RENT0_THEME.cyan; panel.addChild(sub); }
    if (model.body) { const body = createLabel(model.body, 27, 84, 'body'); body.style.wordWrap = true; body.style.wordWrapWidth = 523; body.style.lineHeight = 16; panel.addChild(body); }
    const displayedProperties = model.properties?.slice(0, 3) ?? [];
    const gap = 10;
    const cardWidth = displayedProperties.length === 1 ? 526 : displayedProperties.length === 2 ? 258 : 168;
    displayedProperties.forEach((property, index) => {
      const card = createPanel({ x: 25 + index * (cardWidth + gap), y: 138, width: cardWidth, height: 132, accent: RENT0_THEME.districts[property.districtIndex % 6] });
      card.addChild(createLabel(property.name.toUpperCase(), 10, 12, 'heading'));
      const value = createLabel(`$${Math.round(property.price).toLocaleString()}`, 10, 38, 'heading'); value.style.fill = RENT0_THEME.gold; card.addChild(value);
      const detail = createLabel(property.specialty ?? 'UNDEVELOPED', 10, 65, 'tiny'); detail.style.fill = RENT0_THEME.muted; card.addChild(detail);
      const status = createLabel(
        property.mortgaged ? 'MORTGAGED' : property.ownerId == null ? 'AVAILABLE' : `PRESTIGE ${property.level ?? 1}`,
        10,
        88,
        'body',
      );
      status.style.fill = property.mortgaged ? RENT0_THEME.danger : RENT0_THEME.emerald;
      card.addChild(status);
      panel.addChild(card);
    });
    const totalActionWidth = model.actions.length * 125 + Math.max(0, model.actions.length - 1) * 9;
    let x = (580 - totalActionWidth) / 2;
    for (const action of model.actions) {
      const button = createActionButton(action.label, 125, action.accent ?? RENT0_THEME.gold);
      button.position.set(x, 318);
      panel.addChild(button);
      this.actionBounds.set(action.id, { x: 190 + x, y: panelY + 318, width: 125, height: 31 });
      x += 134;
    }
    this.addChild(shade, panel);
  }
}
