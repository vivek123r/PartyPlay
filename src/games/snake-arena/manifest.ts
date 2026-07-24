import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'snake-arena',
  title: 'Snake Arena',
  description: 'Multi-arena snake battle royale! Trap opponents, collect power-ups, dash to kill, and survive across 4 unique arenas!',
  version: '2.0.0',
  author: 'PartyPlay Studio',
  category: 'Arcade',
  thumbnail: '',
  tags: ['Classic', 'Grid', 'Multiplayer', 'Strategy', 'Arena', 'Power-Ups'],
  difficulty: 'Medium',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '45-90s',

  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: true,
    supportsSeed: true,
    supportsGamepad: false,
    supportsTouch: false,
  },

  defaultControls: [
    { playerId: 1, deviceId: 'keyboard-main', bindings: { moveLeft: ['KeyA'], moveRight: ['KeyD'], action: ['KeyW'], info: ['Tab'], pause: ['Escape'] } },
    { playerId: 2, deviceId: 'keyboard-main', bindings: { moveLeft: ['ArrowLeft'], moveRight: ['ArrowRight'], action: ['ArrowUp'], info: ['Tab'], pause: ['Escape'] } },
    { playerId: 3, deviceId: 'keyboard-main', bindings: { moveLeft: ['KeyJ'], moveRight: ['KeyL'], action: ['KeyI'], info: ['Tab'], pause: ['Escape'] } },
    { playerId: 4, deviceId: 'keyboard-main', bindings: { moveLeft: ['Numpad4'], moveRight: ['Numpad6'], action: ['Numpad8'], info: ['Tab'], pause: ['Escape'] } },
  ],

  defaultModifiers: {
    speedMultiplier: 1.0,
    arena: 'battle-pit',
  },
};

export default manifest;
