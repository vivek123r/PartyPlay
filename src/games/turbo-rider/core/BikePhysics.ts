import type { BikeCustomization, BikeStats, TuningSetup } from '../types';
import { TuningSystem } from './TuningSystem';

export class BikePhysics {
  public id: number;
  public playerColor: string;
  public customization: BikeCustomization;
  public tuning: TuningSetup;
  public stats: BikeStats;

  // Track & Physics Position
  public x = 0;             // Lateral position (-1.8 left edge, 0 center, 1.8 right edge)
  public z = 0;             // Distance along track (meters)
  public speed = 0;         // Current speed (km/h)

  // Weight Transfer & Lean Physics
  public leanAngle = 0;     // Centrifugal lean (-1.0 left to 1.0 right)
  public pitchAngle = 0;    // Wheelie (+1.0) or Brake Dive (-1.0)

  // Nitro & Slipstream Drafting
  public nitroGauge = 100;
  public isNitroActive = false;
  public slipstreamBonus = 0; // +0.25 when drafting
  public isDrafting = false;

  // Crash & Off-Road State
  public isCrashed = false;
  public crashTimer = 0;
  public invulnerabilityTimer = 0.0; // 3.5s immunity after crash
  public isOffRoad = false;
  public lives = 3;
  public eliminated = false;
  public shieldTimer = 0;
  public coinsCollected = 0;

  constructor(id: number, playerColor: string) {
    this.id = id;
    this.playerColor = playerColor;
    this.tuning = TuningSystem.createDefaultSetup();
    this.customization = TuningSystem.createDefaultCustomization(playerColor);
    this.stats = TuningSystem.calculateStats(this.customization, this.tuning);
  }

  public updateStats(): void {
    this.stats = TuningSystem.calculateStats(this.customization, this.tuning);
  }

  public triggerCrash(): void {
    if (this.isCrashed || this.eliminated) return;

    // Shield absorbs crash
    if (this.shieldTimer > 0) {
      this.shieldTimer = 0;
      this.invulnerabilityTimer = 2.0;
      return;
    }

    if (this.invulnerabilityTimer > 0) return;
    this.lives--;
    this.isCrashed = true;
    this.crashTimer = 1.8;
    this.invulnerabilityTimer = 3.5;
    this.speed = Math.floor(this.speed * 0.4);
    this.pitchAngle = -0.8;
    if (this.lives <= 0) {
      this.eliminated = true;
      this.isCrashed = true;
      this.crashTimer = 1.8;
      this.invulnerabilityTimer = 999;
    }
  }

  public update(
    dt: number,
    moveLeft: boolean,
    moveRight: boolean,
    accelerate: boolean,
    brake: boolean,
    triggerNitro: boolean,
    currentCurve: number
  ): void {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt);
    }
    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    }

    if (this.isCrashed) {
      this.crashTimer -= dt;
      if (this.crashTimer <= 0) {
        this.isCrashed = false;
        this.crashTimer = 0;
        this.x = 0;
        this.speed = Math.max(60, this.speed);
      }
      this.speed = Math.max(0, this.speed - 110 * dt);
      this.pitchAngle += (0 - this.pitchAngle) * 6 * dt;
      return;
    }

    if (this.eliminated && !this.isCrashed) {
      this.speed = Math.max(0, this.speed - 30 * dt);
      this.pitchAngle += (0 - this.pitchAngle) * 5 * dt;
      this.z += (this.speed * 1000 / 3600) * 0.5 * dt;
      return;
    }

    // 1. Off-Road Check (|x| > 1.0)
    this.isOffRoad = Math.abs(this.x) > 1.0;

    // 2. Nitro Activation (continuous holding supported)
    if (triggerNitro && this.nitroGauge > 0) {
      this.isNitroActive = true;
      this.nitroGauge = Math.max(0, this.nitroGauge - 35 * dt);
    } else {
      this.isNitroActive = false;
      const rechargeRate = this.isDrafting ? 15 : 5;
      this.nitroGauge = Math.min(100, this.nitroGauge + rechargeRate * dt);
    }

    // 3. Top Speed & Acceleration Calculation
    let effectiveMax = this.stats.topSpeed;
    if (this.isNitroActive) effectiveMax *= 1.45; // Nitro Burst 1.45x
    if (this.slipstreamBonus > 0) effectiveMax *= (1.0 + this.slipstreamBonus);
    if (this.isOffRoad) effectiveMax *= 0.45; // Off-road speed reduction

    const accelRate = this.stats.acceleration;

    if (accelerate) {
      this.speed = Math.min(effectiveMax, this.speed + accelRate * dt);
      const accelFactor = (this.speed / Math.max(1, effectiveMax));
      this.pitchAngle = Math.min(0.6, this.pitchAngle + accelFactor * 2 * dt);
    } else if (brake) {
      const brakeForce = this.stats.braking * 1.8;
      this.speed = Math.max(0, this.speed - brakeForce * dt);
      this.pitchAngle = Math.max(-0.7, this.pitchAngle - 4 * dt);
    } else {
      // Natural rolling drag
      const drag = 25 + (this.isOffRoad ? 80 : 0);
      this.speed = Math.max(0, this.speed - drag * dt);
      this.pitchAngle += (0 - this.pitchAngle) * 5 * dt;
    }

    // 4. Steering with speed-scaled responsiveness
    const baseTurn = this.stats.cornerGrip / 40;
    const turnSpeed = baseTurn * (this.isOffRoad ? 0.4 : 1.0);
    const speedFactor = Math.min(1.0, Math.max(0.15, this.speed / 120));

    if (moveLeft && !brake) {
      this.x = Math.max(-1.8, this.x - turnSpeed * speedFactor * dt);
      this.leanAngle = Math.max(-1.0, this.leanAngle - 5 * dt);
    } else if (moveRight && !brake) {
      this.x = Math.min(1.8, this.x + turnSpeed * speedFactor * dt);
      this.leanAngle = Math.min(1.0, this.leanAngle + 5 * dt);
    } else {
      this.leanAngle += (0 - this.leanAngle) * 6 * dt;
    }

    // Curve centrifugal force — gentler push, doesn't fight steering
    if (currentCurve !== 0 && this.speed > 40) {
      const centForce = currentCurve * (this.speed / 150) * 0.12;
      this.x -= centForce * dt;
      this.x = Math.max(-1.8, Math.min(1.8, this.x));
    }

    // 5. Advance Z position — VELOCITY_SCALE must match TrafficManager's, since both
    // operate on the same metric world (see render/ProjectionEngine.ts's CAMERA_* constants).
    const VELOCITY_SCALE = 1.0;
    this.z += (this.speed * 1000 / 3600) * VELOCITY_SCALE * dt;
  }
}
