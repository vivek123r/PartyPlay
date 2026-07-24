import type { BikeCustomization, BikeStats, TuningSetup } from '../types';

export class TuningSystem {
  public static createDefaultSetup(): TuningSetup {
    return {
      gearRatios: 0.5,
      brakeBias: 0.5,
      suspensionStiffness: 0.5,
      tractionControl: 0.5,
      tyrePressure: 0.5,
    };
  }

  public static createDefaultCustomization(playerColor: string): BikeCustomization {
    return {
      primaryPaint: playerColor,
      secondaryPaint: '#1f170f',
      rimColor: '#f4d160',
      helmetColor: playerColor,
      suitColor: '#2d3436',
      underglowLed: '#00f0ff',
      exhaustFlame: '#ff7675',
      engineLevel: 0,
      ecuLevel: 0,
      transmissionLevel: 0,
      suspensionLevel: 0,
      tyresLevel: 0,
      brakesLevel: 0,
      exhaustLevel: 0,
      aeroLevel: 0,
    };
  }

  public static calculateStats(c: BikeCustomization, t: TuningSetup): BikeStats {
    // Base stats + part levels + interactive tuning slider trade-offs
    const hp = 100 + c.engineLevel * 25 + c.exhaustLevel * 15 + c.ecuLevel * 10;
    const torque = 90 + c.ecuLevel * 20 + c.exhaustLevel * 12;
    const weight = Math.max(140, 210 - c.aeroLevel * 8 - c.engineLevel * 4);

    // High-Speed Arcade Top Speed & Explosive Acceleration Formulas
    const rawTopSpeed = 220 + (hp / 1.5) + (t.gearRatios * 25) + (t.tyrePressure * 10);
    const rawAccel = 100 + (torque / 1.5) + ((1 - t.gearRatios) * 30) - (weight * 0.05);

    const cornerGrip = 50 + c.tyresLevel * 15 + c.suspensionLevel * 10 + (t.suspensionStiffness * 15) - (t.tyrePressure * 10);
    const braking = 60 + c.brakesLevel * 20 + (t.brakeBias * 15);
    const leanAngle = Math.min(55, 42 + c.suspensionLevel * 3 + (t.suspensionStiffness * 5));
    const traction = 55 + c.tyresLevel * 12 + (t.tractionControl * 25);
    const throttleResponse = Math.min(100, 60 + c.ecuLevel * 12 + ((1 - t.tractionControl) * 15));

    return {
      horsepower: Math.round(hp),
      torque: Math.round(torque),
      weight: Math.round(weight),
      topSpeed: Math.round(rawTopSpeed),
      acceleration: Math.round(rawAccel),
      cornerGrip: Math.round(cornerGrip),
      braking: Math.round(braking),
      leanAngle: Math.round(leanAngle),
      traction: Math.round(traction),
      throttleResponse: Math.round(throttleResponse),
    };
  }
}
