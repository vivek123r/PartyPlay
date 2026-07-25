import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'hollow-clash',
  title: 'HOLLOW CLASH',
  description: '2 to 4 Player Co-Op Side-Scrolling Action Metroidvania Platformer! Explore dark bioluminescent caverns, execute double jumps, wall slides, downward pogo strikes, shadow dashes, and unleash Soul Spells against the Moss Knight Boss!',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Arcade',
  thumbnail: '',
  tags: ['Metroidvania', 'Platformer', 'Co-Op', 'Action', 'Hollow Knight'],
  difficulty: 'Hard',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '120-180s',

  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: true,
    supportsSeed: true,
    supportsGamepad: false,
    supportsTouch: false,
  },

  defaultControls: [
    {
      playerId: 1,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['KeyA'],
        moveRight: ['KeyD'],
        moveUp: ['KeyW'],
        moveDown: ['KeyS'],
        action: ['ControlLeft'],
        skill: ['ShiftLeft'],
        focus: ['ShiftLeft'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 2,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['ArrowLeft'],
        moveRight: ['ArrowRight'],
        moveUp: ['ArrowUp'],
        moveDown: ['ArrowDown'],
        action: ['ControlRight'],
        skill: ['ShiftRight'],
        focus: ['ShiftRight'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 3,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['KeyJ'],
        moveRight: ['KeyL'],
        moveUp: ['KeyI'],
        moveDown: ['KeyK'],
        moveLeftAlt: ['KeyJ'],
        action: ['KeyU'],
        skill: ['KeyO'],
        focus: ['KeyP'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 4,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['Numpad4'],
        moveRight: ['Numpad6'],
        moveUp: ['Numpad8'],
        moveDown: ['Numpad5'],
        action: ['Numpad0'],
        skill: ['NumpadEnter'],
        focus: ['NumpadPlus'],
        pause: ['Escape'],
      },
    },
  ],

  defaultModifiers: {
    enemyHealthMultiplier: 1.0,
    gravityMultiplier: 1.0,
  },
};

export default manifest;
