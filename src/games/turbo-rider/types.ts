export interface BikeStats {
  horsepower: number;
  torque: number;
  weight: number;
  topSpeed: number;
  acceleration: number;
  cornerGrip: number;
  braking: number;
  leanAngle: number;
  traction: number;
  throttleResponse: number;
}

export interface TuningSetup {
  gearRatios: number;          // 0 (Short/Accel) to 1 (Long/TopSpeed)
  brakeBias: number;           // 0 (Rear/Drift) to 1 (Front/Stopping)
  suspensionStiffness: number; // 0 (Soft/Comfort) to 1 (Stiff/Cornering)
  tractionControl: number;     // 0 (Off/PowerSlide) to 1 (High/Safe)
  tyrePressure: number;        // 0 (Low/Grip) to 1 (High/Speed)
}

export interface BikeCustomization {
  // Visual Styles
  primaryPaint: string;
  secondaryPaint: string;
  rimColor: string;
  helmetColor: string;
  suitColor: string;
  underglowLed: string;
  exhaustFlame: string;

  // Parts Upgrade Levels (0 to 3)
  engineLevel: number;
  ecuLevel: number;
  transmissionLevel: number;
  suspensionLevel: number;
  tyresLevel: number;
  brakesLevel: number;
  exhaustLevel: number;
  aeroLevel: number;
}

export interface Point3D {
  worldX: number;
  worldY: number;
  worldZ: number;
  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;
  screenX?: number;
  screenY?: number;
  scale?: number;
  projectedWidth?: number;
}

export interface TrackSprite {
  sourceX: number;
  sourceY: number;
  width: number;
  height: number;
  offsetX: number;
  type: 'AI_CAR' | 'SEMI_TRUCK' | 'HAZARD' | 'PALM_TREE' | 'PINE_TREE' | 'TUNNEL_LIGHT' | 'FINISH_ARCH';
  speed?: number;
}

export interface TrackSegment {
  index: number;
  p1: Point3D;
  p2: Point3D;
  curve: number;     // Lateral curve (-4 to 4)
  elevation: number; // Height offset (-120 to 120)
  color: {
    grass: number;
    rumble: number;
    road: number;
    lane: number;
  };
  phaseName: string;
  phaseIndex: number;
  sprites: TrackSprite[];
}
