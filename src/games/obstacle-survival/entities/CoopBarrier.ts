import { Graphics, Container } from 'pixi.js';

export class CoopBarrier {
  public energy = 0; // 0% to 100%
  public activeTimer = 0;
  public isShieldActive = false;

  public minX = 0;
  public maxX = 0;
  public canopyY = 0;
  public width = 0;

  public container: Container;
  public graphics: Graphics;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  public chargeEnergy(dt: number): void {
    if (this.isShieldActive) return;
    // Charge ~33.3% per second of co-op movement (3 seconds to reach 100%)
    this.energy = Math.min(100, this.energy + 33.3 * dt);
  }

  public activate(): boolean {
    if (this.energy >= 99 && !this.isShieldActive) {
      this.energy = 0; // Consume energy
      this.isShieldActive = true;
      this.activeTimer = 5.0; // 5 Full Seconds Canopy Shield Duration
      this.container.visible = true;
      return true;
    }
    return false;
  }

  public updatePosition(minPlayerX: number, maxPlayerX: number, playerTopY: number, playerRadius: number): void {
    this.minX = minPlayerX - playerRadius - 6;
    this.maxX = maxPlayerX + playerRadius + 6;
    this.width = this.maxX - this.minX;
    this.canopyY = playerTopY - playerRadius - 10;
  }

  public update(dt: number): void {
    if (this.isShieldActive) {
      this.activeTimer -= dt;
      if (this.activeTimer <= 0) {
        this.isShieldActive = false;
        this.activeTimer = 0;
        this.container.visible = false;
      }
    }
  }

  public destroy(): void {
    this.graphics.destroy();
    this.container.destroy();
  }
}
