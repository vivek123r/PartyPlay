import { Container } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
import type { RendererContext } from './types';

export class PixiRendererContext implements RendererContext {
  public static readonly VIRTUAL_WIDTH = 960;
  public static readonly VIRTUAL_HEIGHT = 540;

  private app: Application;
  private logicalWidth: number;
  private logicalHeight: number;
  /** Games add their content here, never to `app.stage` directly. Pre-scaled so a game authored
   * at `logicalWidth x logicalHeight` fills the (larger) physical canvas without touching any of
   * its own coordinate math. Kept as an integer scale (see constructor) so nearest-neighbour
   * upscaling stays pixel-exact. */
  private root: Container;

  constructor(app: Application, logicalWidth = 480, logicalHeight = 270) {
    this.app = app;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;

    const scaleX = PixiRendererContext.VIRTUAL_WIDTH / logicalWidth;
    const scaleY = PixiRendererContext.VIRTUAL_HEIGHT / logicalHeight;
    if (scaleX !== scaleY || !Number.isInteger(scaleX)) {
      // Non-integer or non-uniform scale would blur nearest-neighbour art — every game's logical
      // size must divide the virtual canvas evenly on both axes.
      console.warn(
        `[RendererContext] logical size ${logicalWidth}x${logicalHeight} does not scale evenly to ` +
          `${PixiRendererContext.VIRTUAL_WIDTH}x${PixiRendererContext.VIRTUAL_HEIGHT} (sx=${scaleX}, sy=${scaleY})`
      );
    }

    this.root = new Container();
    this.root.scale.set(scaleX, scaleY);
    this.app.stage.addChild(this.root);
  }

  public get integerScale(): number {
    const scaleX = Math.floor(window.innerWidth / PixiRendererContext.VIRTUAL_WIDTH);
    const scaleY = Math.floor(window.innerHeight / PixiRendererContext.VIRTUAL_HEIGHT);
    return Math.max(1, Math.min(scaleX, scaleY));
  }

  public get canvas(): HTMLCanvasElement {
    return (this.app.canvas || (this.app.renderer && (this.app.renderer as any).canvas)) as HTMLCanvasElement;
  }

  /** The game's own root container, pre-scaled from its logical size to the physical canvas.
   * Games must add all their content here (never to a raw Pixi Application stage). */
  public get stage(): Container {
    return this.root;
  }

  public get viewport(): { width: number; height: number } {
    return { width: this.logicalWidth, height: this.logicalHeight };
  }

  public get ticker(): Ticker {
    return this.app.ticker;
  }

  public resize(): void {
    const scale = this.integerScale;
    const canvas = this.canvas;
    if (canvas) {
      canvas.style.width = `${PixiRendererContext.VIRTUAL_WIDTH * scale}px`;
      canvas.style.height = `${PixiRendererContext.VIRTUAL_HEIGHT * scale}px`;
    }
  }
}
