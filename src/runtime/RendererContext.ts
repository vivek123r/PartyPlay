import { Container } from 'pixi.js';
import type { Application, Ticker } from 'pixi.js';
import type { RendererContext } from './types';

export class PixiRendererContext implements RendererContext {
  public static readonly VIRTUAL_WIDTH = 960;
  public static readonly VIRTUAL_HEIGHT = 540;

  private app: Application;
  private logicalWidth: number;
  private logicalHeight: number;
  private displayScale: 'integer' | 'fit';
  /** Games add their content here, never to `app.stage` directly. Integer-scaled games are mapped
   * onto the shared virtual canvas; fitted games render directly in their own logical space. */
  private root: Container;

  constructor(
    app: Application,
    logicalWidth = 480,
    logicalHeight = 270,
    displayScale: 'integer' | 'fit' = 'integer',
  ) {
    this.app = app;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this.displayScale = displayScale;

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
    const canvas = this.canvas;
    if (canvas) {
      if (this.displayScale === 'fit') {
        const parent = canvas.parentElement;
        const availableWidth = parent?.clientWidth || window.innerWidth;
        const availableHeight = parent?.clientHeight || window.innerHeight;
        const scale = Math.max(
          0.25,
          Math.min(
            availableWidth / this.logicalWidth,
            availableHeight / this.logicalHeight,
          ),
        );

        // Keep game coordinates at their authored size and use renderer resolution for the fit.
        // The resulting backing-buffer pixels are then presented 1:1 as CSS pixels, keeping Pixi
        // text and vector graphics sharp without stretching a low-resolution bitmap.
        this.app.renderer.resize(this.logicalWidth, this.logicalHeight, scale);
        this.root.scale.set(1);
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';
        return;
      }
      const scale = this.integerScale;
      canvas.style.width = `${PixiRendererContext.VIRTUAL_WIDTH * scale}px`;
      canvas.style.height = `${PixiRendererContext.VIRTUAL_HEIGHT * scale}px`;
    }
  }
}
