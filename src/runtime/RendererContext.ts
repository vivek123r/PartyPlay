import type { Application, Container, Ticker } from 'pixi.js';
import type { RendererContext } from './types';

export class PixiRendererContext implements RendererContext {
  public static readonly VIRTUAL_WIDTH = 480;
  public static readonly VIRTUAL_HEIGHT = 270;

  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public get integerScale(): number {
    const scaleX = Math.floor(window.innerWidth / PixiRendererContext.VIRTUAL_WIDTH);
    const scaleY = Math.floor(window.innerHeight / PixiRendererContext.VIRTUAL_HEIGHT);
    return Math.max(1, Math.min(scaleX, scaleY));
  }

  public get canvas(): HTMLCanvasElement {
    return (this.app.canvas || (this.app.renderer && (this.app.renderer as any).canvas)) as HTMLCanvasElement;
  }

  public get stage(): Container {
    return this.app.stage;
  }

  public get viewport(): { width: number; height: number } {
    return { width: PixiRendererContext.VIRTUAL_WIDTH, height: PixiRendererContext.VIRTUAL_HEIGHT };
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
