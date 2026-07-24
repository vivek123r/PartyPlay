export type LavaGamePhase =
  | 'intro'
  | 'countdown'
  | 'playing'
  | 'level-results'
  | 'level-retry'
  | 'match-results';

export type PlatformKind = 'stone' | 'metal' | 'moving-x' | 'moving-y' | 'crumble';
export type HazardKind = 'spikes' | 'rock' | 'crusher' | 'fire' | 'rotor';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformData extends Rect {
  id: string;
  kind: PlatformKind;
  originX: number;
  originY: number;
  range?: number;
  speed?: number;
  phase?: number;
  crumbleTimer?: number;
  disabled?: boolean;
  dx?: number;
  dy?: number;
}

export interface HazardData extends Rect {
  id: string;
  kind: HazardKind;
  originX: number;
  originY: number;
  phase?: number;
  speed?: number;
  range?: number;
  active?: boolean;
  triggered?: boolean;
  vx?: number;
  vy?: number;
}

export interface SpringData extends Rect {
  id: string;
}

export interface WindZone extends Rect {
  force: number;
}

export interface TrapSwitchData extends Rect {
  id: string;
  targetHazardId: string;
  triggered: boolean;
}

export interface EnemyData extends Rect {
  id: string;
  originX: number;
  range: number;
  speed: number;
  direction: number;
}

export interface LavaLevel {
  index: number;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  floorY: number;
  safeX: number;
  lavaSpeed: number;
  backgroundAsset?: string;
  palette: {
    sky: number;
    far: number;
    near: number;
    stone: number;
    stoneLight: number;
    metal: number;
    accent: number;
  };
  platforms: PlatformData[];
  hazards: HazardData[];
  springs: SpringData[];
  windZones: WindZone[];
  switches: TrapSwitchData[];
  enemies: EnemyData[];
  chunkIds: string[];
}

export interface MatchRecord {
  playerId: number;
  score: number;
  firstPlaces: number;
  levelsSurvived: number;
  cumulativeTime: number;
  finishPosition: number | null;
  lastProgress: number;
}

export interface LevelFinish {
  playerId: number;
  position: number;
  points: number;
  time: number;
}
