import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'lava-escape',
  title: 'Lava Escape',
  description: 'Outrun a living wall of lava across five chaotic pixel-platforming gauntlets!',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Survival',
  thumbnail: '',
  tags: ['Platformer', 'Race', 'Survival', 'Pixel Art', 'Flagship'],
  difficulty: 'Medium',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '5-8 min',

  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: true,
    supportsSeed: true,
    supportsGamepad: false,
    supportsTouch: false,
  },

  defaultControls: [
    { playerId: 1, deviceId: 'keyboard-main', bindings: { moveLeft: ['KeyA'], moveRight: ['KeyD'], action: ['KeyW', 'Space'], pause: ['Escape'] } },
    { playerId: 2, deviceId: 'keyboard-main', bindings: { moveLeft: ['ArrowLeft'], moveRight: ['ArrowRight'], action: ['ArrowUp', 'Enter'], pause: ['Escape'] } },
    { playerId: 3, deviceId: 'keyboard-main', bindings: { moveLeft: ['KeyJ'], moveRight: ['KeyL'], action: ['KeyI'], pause: ['Escape'] } },
    { playerId: 4, deviceId: 'keyboard-main', bindings: { moveLeft: ['Numpad4'], moveRight: ['Numpad6'], action: ['Numpad8'], pause: ['Escape'] } },
  ],

  defaultModifiers: {
    speedMultiplier: 1,
  },
};

export default manifest;
