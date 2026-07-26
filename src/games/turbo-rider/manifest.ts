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

  // Native high-res render space — see RenderScale.ts / GAME_REFERENCE.md.
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
        moveLeft: ['KeyA'],
        moveRight: ['KeyD'],
        action: ['KeyW'],
        nitro: ['ShiftLeft'],
        brake: ['KeyS'],
        pause: ['Escape'],
      },
    },
    {
      playerId: 2,
      deviceId: 'keyboard-main',
      bindings: {
        moveLeft: ['ArrowLeft'],
        moveRight: ['ArrowRight'],
        action: ['ArrowUp'],
        nitro: ['ShiftRight'],
        brake: ['ArrowDown'],
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
        nitro: ['KeyK'],
        brake: ['KeyU'],
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
        nitro: ['Numpad0'],
        brake: ['Numpad5'],
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
