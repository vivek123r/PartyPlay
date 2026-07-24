import type { Ticker } from 'pixi.js';
import type { GameModule } from './types';
import type { InputService } from '@services/input/InputService';

const FIXED_DT = 1 / 60; // 16.67ms
const MAX_STEPS = 5;

export class GameLoop {
  private ticker: Ticker;
  private inputService: InputService;
  private game: GameModule | null = null;
  private accumulator = 0;
  private running = false;
  private onErrorCallback?: (err: Error) => void;

  constructor(ticker: Ticker, inputService: InputService) {
    this.ticker = ticker;
    this.inputService = inputService;
  }

  public start(game: GameModule, onError?: (err: Error) => void): void {
    this.game = game;
    this.onErrorCallback = onError;
    this.accumulator = 0;
    this.running = true;
    this.ticker.add(this.frame, this);
  }

  private frame(ticker: Ticker): void {
    if (!this.running || !this.game || this.game.state !== 'Playing') return;

    try {
      this.accumulator += ticker.deltaMS / 1000;
      let steps = 0;

      while (this.accumulator >= FIXED_DT && steps < MAX_STEPS) {
        this.inputService.tick();
        this.game.update(FIXED_DT);
        this.accumulator -= FIXED_DT;
        steps++;
      }
    } catch (err) {
      this.stop();
      if (this.onErrorCallback) {
        this.onErrorCallback(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  public stop(): void {
    this.running = false;
    this.ticker.remove(this.frame, this);
    this.game = null;
  }

  public pause(): void {
    this.running = false;
  }

  public resume(): void {
    this.running = true;
  }
}
