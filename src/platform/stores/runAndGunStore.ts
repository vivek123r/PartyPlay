import { create } from 'zustand';
import type {
  DifficultyConfig,
  GameMode,
  MenuScreen,
  PlayerSelection,
} from '@games/run-and-gun/types';
import { CHARACTERS } from '@games/run-and-gun/config/characters';
import { DIFFICULTY } from '@games/run-and-gun/config/difficulty';

const DEFAULT_CHARACTER = CHARACTERS[0];

interface RunAndGunState {
  screen: MenuScreen;
  gameMode: GameMode | null;
  player1: PlayerSelection;
  player2: PlayerSelection;
  difficulty: DifficultyConfig;

  setScreen: (screen: MenuScreen) => void;
  selectGameMode: (mode: GameMode) => void;
  selectCharacter: (
    player: 1 | 2,
    selection: PlayerSelection,
  ) => void;
  resetGameMode: () => void;
}

export const useRunAndGunStore = create<RunAndGunState>((set) => ({
  screen: 'title',
  gameMode: null,
  player1: {
    characterId: DEFAULT_CHARACTER.id,
    color: DEFAULT_CHARACTER.color,
  },
  player2: {
    characterId: CHARACTERS[1].id,
    color: CHARACTERS[1].color,
  },
  difficulty: DIFFICULTY[1],

  setScreen: (screen) => set({ screen }),

  selectGameMode: (mode) => {
    const playerCount = mode === '1-player' ? 1 : 2;
    set({
      gameMode: mode,
      difficulty: DIFFICULTY[playerCount],
    });
  },

  selectCharacter: (player, selection) => {
    if (player === 1) {
      set({ player1: selection });
    } else {
      set({ player2: selection });
    }
  },

  resetGameMode: () =>
    set({
      gameMode: null,
      player1: {
        characterId: DEFAULT_CHARACTER.id,
        color: DEFAULT_CHARACTER.color,
      },
      player2: {
        characterId: CHARACTERS[1].id,
        color: CHARACTERS[1].color,
      },
      difficulty: DIFFICULTY[1],
    }),
}));
