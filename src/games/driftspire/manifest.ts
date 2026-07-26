import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'driftspire',
  title: 'DRIFTSPIRE',
  description:
    'Roll the dice and travel tile by tile through a floating city of shifting districts, shared ventures, friendly pacts, and festival showdowns.',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Strategy',
  thumbnail: '',
  tags: ['Board Game', 'Strategy', 'Party', 'Negotiation', 'Economy', 'Local Multiplayer'],
  difficulty: 'Medium',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '30-45 min',
  logicalWidth: 960,
  logicalHeight: 540,

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
        moveUp: ['KeyW'],
        moveDown: ['KeyS'],
        moveLeft: ['KeyA'],
        moveRight: ['KeyD'],
        action: ['Space', 'KeyF'],
        alternate: ['KeyE'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 2,
      deviceId: 'keyboard-main',
      bindings: {
        moveUp: ['ArrowUp'],
        moveDown: ['ArrowDown'],
        moveLeft: ['ArrowLeft'],
        moveRight: ['ArrowRight'],
        action: ['Enter', 'Slash'],
        alternate: ['Period'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 3,
      deviceId: 'keyboard-main',
      bindings: {
        moveUp: ['KeyI'],
        moveDown: ['KeyK'],
        moveLeft: ['KeyJ'],
        moveRight: ['KeyL'],
        action: ['KeyU'],
        alternate: ['KeyO'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 4,
      deviceId: 'keyboard-main',
      bindings: {
        moveUp: ['Numpad8'],
        moveDown: ['Numpad5'],
        moveLeft: ['Numpad4'],
        moveRight: ['Numpad6'],
        action: ['Numpad0'],
        alternate: ['NumpadEnter'],
        pause: ['Escape'],
      },
    },
  ],

  defaultModifiers: {
    turnTimerSeconds: 35,
    animationSpeed: 1,
  },
};

export default manifest;
