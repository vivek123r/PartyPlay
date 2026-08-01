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

/** Input ownership is deliberately separate from the input device. Existing games treat an
 * omitted value as a local human, so adding bots does not change their behaviour. */
export type PlayerType = 'human' | 'bot';
export type AIDifficulty = 'easy' | 'normal' | 'hard';

export type GameSetupOptionValue = string | number | boolean;

interface GameSetupOptionBase {
  /** Key written to GameContext.modifiers when the match starts. */
  key: string;
  label: string;
  description?: string;
}

export interface GameSetupSelectOption extends GameSetupOptionBase {
  type: 'select';
  options: Array<{ value: string | number; label: string }>;
  defaultValue: string | number;
}

export interface GameSetupToggleOption extends GameSetupOptionBase {
  type: 'toggle';
  defaultValue: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
}

export interface GameSetupRangeOption extends GameSetupOptionBase {
  type: 'range';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  lowLabel: string;
  highLabel: string;
  valueFormat?: 'multiplier' | 'seconds' | 'percent' | 'integer';
}

/** Manifest-authored controls rendered by the shared Ready Room. */
export type GameSetupOption = GameSetupSelectOption | GameSetupToggleOption | GameSetupRangeOption;

export interface GamePlayerSetup {
  /** Enables per-slot human/bot selection in the shared Ready Room. */
  supportsBots?: boolean;
  defaultPlayerType?: PlayerType;
  aiDifficultyOptions?: AIDifficulty[];
  defaultAIDifficulty?: AIDifficulty;
}

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

  /** Authoring resolution. The game draws in this coordinate space and the runtime scales it to
   * fill the canvas (see PixiRendererContext). Omit for the legacy 480x270 space — games that opt
   * into a higher logical size must keep the canvas/logical ratio an exact integer on both axes,
   * or nearest-neighbour upscaling stops being pixel-exact. */
  logicalWidth?: number;
  logicalHeight?: number;
  /** CSS presentation scaling. `integer` preserves exact pixel multiples; `fit` expands the
   * 16:9 canvas to the largest size available inside the gameplay viewport. */
  displayScale?: 'integer' | 'fit';

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
  /** Optional game-specific Ready Room configuration. Omitted manifests retain legacy setup. */
  setup?: {
    options?: GameSetupOption[];
    players?: GamePlayerSetup;
  };
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
  /** Undefined remains a local human for backwards compatibility. */
  type?: PlayerType;
  /** Used only when type is `bot`. */
  aiDifficulty?: AIDifficulty;
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
