import type { Container, Ticker } from 'pixi.js';
import type { InputService } from '@services/input/InputService';
import type { AudioService } from '@services/audio/AudioService';
import type { StorageService } from '@services/storage/StorageService';
import type { EventService } from '@services/events/EventService';
import type { AssetService } from '@services/asset/AssetService';
import type { LoggerService } from '@services/logger/LoggerService';
import type { PRNG } from '@shared/utils/random';

/** PixiJS Abstraction interface — games NEVER see PixiJS Application directly */
export interface RendererContext {
  readonly canvas: HTMLCanvasElement;
  readonly stage: Container;
  readonly viewport: { width: number; height: number };
  readonly ticker: Ticker;
  resize(): void;
}

export type GameCategory = 'Party' | 'Arcade' | 'Puzzle' | 'Sports' | 'Strategy' | 'Survival';

export interface GameManifest {
  id: string;
  title: string;
  description: string;
  version: string;
  author: string;
  category: GameCategory;
  thumbnail: string;
  banner?: string;
  tags: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  minPlayers: number;
  maxPlayers: number;
  estimatedRoundTime: string;

  capabilities: {
    supportsPause: boolean;
    supportsRestart: boolean;
    supportsModifiers: boolean;
    supportsSeed: boolean;
    supportsGamepad: boolean;
    supportsTouch: boolean;
  };

  defaultControls: Array<{
    playerId: number;
    deviceId: string;
    bindings: Record<string, string[]>;
  }>;
  defaultModifiers: Record<string, any>;
}

export interface GameModifiers {
  speedMultiplier?: number;
  obstacleDensity?: number;
  playerRadiusMultiplier?: number;
  seed?: number;
  [key: string]: any;
}

export interface PlayerConfig {
  id: number;
  color: string;
  name: string;
  inputDeviceId?: string;
}

/** Pure Dependency Injection Container passed to games */
export interface GameContext {
  renderer: RendererContext;
  input: InputService;
  audio: AudioService;
  storage: StorageService;
  events: EventService;
  random: PRNG;
  asset: AssetService;
  logger: LoggerService;
  modifiers: GameModifiers;
  players: PlayerConfig[];
}

export type InternalGameState =
  | 'Initializing'
  | 'Loading'
  | 'Ready'
  | 'Playing'
  | 'Paused'
  | 'Finished'
  | 'Destroyed';

export interface GameModule {
  readonly state: InternalGameState;
  init(context: GameContext): Promise<void>;
  start(): void;
  update(dt: number): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
