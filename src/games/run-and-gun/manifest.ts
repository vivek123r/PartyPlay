import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'run-and-gun',
  title: 'BLAZING FURY',
  description:
    'Classic side-scrolling run-and-gun action. Battle through enemy forces solo or with a friend.',
  version: '1.0.0',
  author: 'PartyPlay',
  category: 'Arcade',
  thumbnail: '/games/run-and-gun/thumbnail.svg',
  tags: ['action', 'run-and-gun', 'co-op', 'shooter'],
  difficulty: 'Medium',
  minPlayers: 1,
  maxPlayers: 2,
  estimatedRoundTime: '5–15 min',
  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: false,
    supportsSeed: false,
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
        shoot: ['KeyF'],
        jump: ['KeyG'],
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
        shoot: ['KeyK'],
        jump: ['KeyL'],
        pause: ['Escape'],
      },
    },
  ],
  defaultModifiers: {},
};

export default manifest;
