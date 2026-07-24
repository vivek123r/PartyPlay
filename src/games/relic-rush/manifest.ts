import type { GameManifest } from '@runtime/types';

export const manifest: GameManifest = {
  id: 'relic-rush',
  title: 'Relic Rush: Cross-Chamber Chaos',
  description: 'Cross-lane 2-4 player adventure race! Pull levers, activate bridges, drop boulders, and sabotage your rivals across 8 ancient worlds.',
  version: '1.0.0',
  author: 'PartyPlay Studios',
  category: 'Party',
  thumbnail: '/assets/relic-rush-thumb.png',
  tags: ['Co-Op', 'Race', 'Traps', 'Adventure', 'Cross-Lane'],
  difficulty: 'Medium',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '60-90s',
  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: true,
    supportsSeed: true,
    supportsGamepad: true,
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
        jump: ['Space', 'KeyW'],
        action: ['ShiftLeft', 'KeyE'],
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
        jump: ['ArrowUp', 'KeyN'],
        action: ['ShiftRight', 'KeyM'],
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
        jump: ['KeyI', 'Space'],
        action: ['KeyU'],
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
        jump: ['Numpad8', 'Numpad0'],
        action: ['NumpadEnter'],
      },
    },
  ],
  defaultModifiers: {
    speedMultiplier: 1.0,
    trapFrequency: 1.0,
    gravityMultiplier: 1.0,
  },
};

export default manifest;
