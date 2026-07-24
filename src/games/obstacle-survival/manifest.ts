import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'obstacle-survival',
  title: 'Obstacle Survival',
  description: 'Dodge downward scrolling obstacles, push your friends, and be the last player standing!',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Survival',
  thumbnail: '',
  tags: ['Action', 'Frantic', 'Multiplayer'],
  difficulty: 'Medium',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '30-90s',

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
        action: ['ShiftLeft', 'Space', 'KeyW'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 2,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['ArrowLeft'],
        moveRight: ['ArrowRight'],
        action: ['ShiftRight', 'Enter', 'ArrowUp'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 3,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['KeyJ'],
        moveRight: ['KeyL'],
        action: ['KeyI', 'Space'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 4,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['Numpad4'],
        moveRight: ['Numpad6'],
        action: ['Numpad8'],
        pause: ['Escape'],
      },
    },
  ],

  defaultModifiers: {
    speedMultiplier: 1.0,
    obstacleDensity: 1.0,
    playerRadiusMultiplier: 1.0,
  },
};

export default manifest;
