import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'turbo-rider',
  title: 'TURBO RIDER 3D',
  description: 'High-speed 3D Arcade Highway Bike Racing! Customize bike stats in the pre-race garage, weave through highway traffic, draft behind semi-trucks, and hit nitro boosts on winding hills!',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Sports',
  thumbnail: '',
  tags: ['3D', 'Racing', 'Customization', 'Multiplayer', 'Retro Arcade'],
  difficulty: 'Medium',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '60-120s',

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
        action: ['KeyW', 'Space'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 2,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['ArrowLeft'],
        moveRight: ['ArrowRight'],
        action: ['ArrowUp', 'Enter'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 3,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['KeyJ'],
        moveRight: ['KeyL'],
        action: ['KeyI'],
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
    trafficDensity: 1.0,
    speedMultiplier: 1.0,
  },
};

export default manifest;
