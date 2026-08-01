export interface ControlBinding {
  label: string;
  keys: string;
}

export interface PlayerControls {
  playerLabel: string;
  color: string;
  bindings: ControlBinding[];
}

export const PLAYER_CONTROLS: Record<1 | 2, PlayerControls> = {
  1: {
    playerLabel: 'PLAYER 1',
    color: '#ff2e63',
    bindings: [
      { label: 'MOVE', keys: 'W A S D' },
      { label: 'SHOOT', keys: 'F' },
      { label: 'JUMP', keys: 'G' },
    ],
  },
  2: {
    playerLabel: 'PLAYER 2',
    color: '#08d9d6',
    bindings: [
      { label: 'MOVE', keys: 'ARROWS' },
      { label: 'SHOOT', keys: 'K' },
      { label: 'JUMP', keys: 'L' },
    ],
  },
};
