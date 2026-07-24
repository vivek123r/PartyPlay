export class DifficultyManager {
  private elapsedTime = 0;
  private baseModifier: number;

  constructor(baseModifier = 1.0) {
    this.baseModifier = baseModifier;
  }

  public update(dt: number): void {
    this.elapsedTime += dt;
  }

  public getSpeedMultiplier(): number {
    // 0s -> 1.0x, 20s -> 1.15x, 40s -> 1.30x, 60s -> 1.45x
    const timeFactor = 1.0 + (this.elapsedTime / 20) * 0.15;
    return this.baseModifier * timeFactor;
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public reset(): void {
    this.elapsedTime = 0;
  }
}
