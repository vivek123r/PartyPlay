import { create } from 'zustand';
import type { GameManifest, GameModifiers, PlayerConfig } from '@runtime/types';

export type ScreenState =
  | 'loading'
  | 'menu'
  | 'browser'
  | 'setup'
  | 'play'
  | 'results'
  | 'settings'
  | 'crash';

export interface StandingsResult {
  winnerId?: number;
  isTeamLoss?: boolean;
  standings: Array<{ playerId: number; score: number }>;
}

interface PlatformStoreState {
  currentScreen: ScreenState;
  selectedGame: GameManifest | null;
  players: PlayerConfig[];
  modifiers: GameModifiers;
  lastResults: StandingsResult | null;
  crashError: Error | null;

  setScreen: (screen: ScreenState) => void;
  setSelectedGame: (game: GameManifest | null) => void;
  setPlayers: (players: PlayerConfig[]) => void;
  setModifiers: (modifiers: GameModifiers) => void;
  setResults: (results: StandingsResult) => void;
  setCrash: (err: Error) => void;
}

export const usePlatformStore = create<PlatformStoreState>((set) => ({
  currentScreen: 'loading',
  selectedGame: null,
  players: [
    { id: 1, name: 'Player 1', color: '#ff2e63' },
    { id: 2, name: 'Player 2', color: '#08d9d6' },
  ],
  modifiers: { speedMultiplier: 1.0 },
  lastResults: null,
  crashError: null,

  setScreen: (screen) => set({ currentScreen: screen }),
  setSelectedGame: (game) => set({ selectedGame: game }),
  setPlayers: (players) => set({ players }),
  setModifiers: (modifiers) => set({ modifiers }),
  setResults: (results) => set({ lastResults: results }),
  setCrash: (err) => set({ crashError: err, currentScreen: 'crash' }),
}));
