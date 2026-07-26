import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'dungeon-brawl',
  title: 'DUNGEON BRAWL',
  description: 'A fully animated 2–4 player co-op dungeon gauntlet. Master four visually distinct class kits, defeat three wardens, claim party blessings, revive allies, and bring down the Horned King.',
  version: '3.1.0',
  author: 'PartyPlay Studio',
  category: 'Arcade',
  thumbnail: '',
  tags: ['Action', 'Co-Op', 'Fantasy', 'Boss Fight', 'Multiplayer'],
  difficulty: 'Hard',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '7-9 min',

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
        skill: ['KeyE'],
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
        skill: ['Period'],
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
        skill: ['KeyO'],
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
        skill: ['NumpadEnter'],
        pause: ['Escape'],
      },
    },
  ],

  defaultModifiers: {
    enemyHealthMultiplier: 1.0,
    bossDifficulty: 1.0,
  },
};

export default manifest;
