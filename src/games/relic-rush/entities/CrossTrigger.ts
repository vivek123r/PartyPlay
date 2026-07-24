import { Container, Graphics } from 'pixi.js';
import { CrossLaneMatrix } from '../systems/CrossLaneMatrix';
import type { CrossActionType } from '../systems/CrossLaneMatrix';

export class CrossTrigger {
  public id: string;
  public laneIndex: number;
  public targetLaneIndex: number | 'all';
  public actionType: CrossActionType;
  public x: number;
  public y: number;
  public width = 16;
  public height = 16;
  public isActivated = false;

  public container: Container;
  public graphics: Graphics;
  public promptGraphics: Graphics;
  public showPrompt = false;

  constructor(
    id: string,
    laneIndex: number,
    targetLaneIndex: number | 'all',
    actionType: CrossActionType,
    x: number,
    y: number
  ) {
    this.id = id;
    this.laneIndex = laneIndex;
    this.targetLaneIndex = targetLaneIndex;
    this.actionType = actionType;
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.graphics = new Graphics();
    this.promptGraphics = new Graphics();

    this.container.addChild(this.graphics);
    this.container.addChild(this.promptGraphics);

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public setPromptVisible(visible: boolean): void {
    if (this.showPrompt !== visible) {
      this.showPrompt = visible;
      this.renderPrompt();
    }
  }

  public activate(sourcePlayerId: number, matrix: CrossLaneMatrix): void {
    if (this.isActivated) return;

    this.isActivated = true;
    this.showPrompt = false;
    this.render();

    let msg = 'SABOTAGE TRIGGERED!';
    if (this.actionType === 'drop_boulder') msg = `BOULDER DROPPED ON P${(this.targetLaneIndex as number) + 1}!`;
    else if (this.actionType === 'trigger_flame') msg = `FLAME JET BLASTED P${(this.targetLaneIndex as number) + 1}!`;
    else if (this.actionType === 'close_exit') msg = `EXIT SHUT FOR P${(this.targetLaneIndex as number) + 1}!`;

    matrix.emit({
      sourcePlayerId,
      sourceLaneIndex: this.laneIndex,
      targetLaneIndex: this.targetLaneIndex,
      actionType: this.actionType,
      message: msg,
    });
  }

  private renderPrompt(): void {
    this.promptGraphics.clear();
    if (!this.showPrompt || this.isActivated) return;

    // Glowing Badge Box above lever
    const targetLabel = typeof this.targetLaneIndex === 'number' ? `P${this.targetLaneIndex + 1}` : 'ALL';
    const text = `[E] SABOTAGE ${targetLabel}!`;

    this.promptGraphics.rect(-24, -18, 64, 11).fill({ color: 0x0f0e17, alpha: 0.9 });
    this.promptGraphics.rect(-24, -18, 64, 1).fill({ color: 0xf4d160 });
    this.promptGraphics.rect(-24, -8, 64, 1).fill({ color: 0xf4d160 });
  }

  private render(): void {
    this.graphics.clear();
    this.renderPrompt();

    // 16-bit Animated Lever Switch
    const leverColor = this.isActivated ? 0x08d9d6 : 0xffde7d;
    this.graphics.rect(2, 10, 12, 6).fill({ color: 0x3d2314 });
    this.graphics.rect(4, 11, 8, 4).fill({ color: 0x0f0e17 });

    // Handle Stick (flips from left to right)
    if (this.isActivated) {
      this.graphics.rect(10, 2, 3, 10).fill({ color: leverColor });
      this.graphics.rect(9, 0, 5, 4).fill({ color: 0xfffffe });
    } else {
      this.graphics.rect(3, 2, 3, 10).fill({ color: leverColor });
      this.graphics.rect(2, 0, 5, 4).fill({ color: 0xfffffe });
    }
  }

  public destroy(): void {
    this.promptGraphics.destroy();
    this.graphics.destroy();
    this.container.destroy();
  }
}

export class GateDoor {
  public laneIndex: number;
  public x: number;
  public y: number;
  public width = 12;
  public height = 40;
  public isOpen = false;

  public container: Container;
  public graphics: Graphics;

  constructor(laneIndex: number, x: number, y: number) {
    this.laneIndex = laneIndex;
    this.x = x;
    this.y = y;

    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.render();
    this.container.x = Math.round(this.x);
    this.container.y = Math.round(this.y);
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;
    this.render();
  }

  private render(): void {
    this.graphics.clear();
    if (this.isOpen) {
      // Open Door indicator (raised)
      this.graphics.rect(0, -32, this.width, 8).fill({ color: 0xf4d160 });
      this.graphics.rect(2, -30, this.width - 4, 4).fill({ color: 0xfffffe });
    } else {
      // Closed Iron Portcullis Door
      this.graphics.rect(0, 0, this.width, this.height).fill({ color: 0x2d3436 });
      this.graphics.rect(2, 2, this.width - 4, this.height - 4).fill({ color: 0x636e72 });
      this.graphics.rect(0, 0, this.width, 2).fill({ color: 0xfffffe });
      // Spikes at bottom
      for (let i = 0; i < this.width; i += 4) {
        this.graphics.rect(i, this.height, 2, 4).fill({ color: 0xd63031 });
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
