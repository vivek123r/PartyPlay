import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'mythic-farm',
  title: 'MYTHIC FARM: MAGIC ORCHARD',
  description:
    'An insane, vibrant 2D single-player farming simulation featuring multi-stage crops, mythical livestock, automated harvesting machinery, processing workshops, and dynamic market economy!',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Strategy',
  thumbnail: '',
  tags: ['Farming', 'Simulation', 'Single-Player', 'Automation', 'Economy', 'Crafting'],
  difficulty: 'Medium',
  minPlayers: 1,
  maxPlayers: 1,
  estimatedRoundTime: 'Endless',

  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: true,
    supportsSeed: true,
    supportsGamepad: false,
    supportsTouch: true,
  },

  defaultControls: [
    {
      playerId: 1,
      deviceId: 'keyboard-main',
      bindings: {
        moveUp: ['KeyW', 'ArrowUp'],
        moveDown: ['KeyS', 'ArrowDown'],
        moveLeft: ['KeyA', 'ArrowLeft'],
        moveRight: ['KeyD', 'ArrowRight'],
        action: ['Space', 'KeyE'],       // Tool usage / interact
        secondary: ['KeyF'],              // Open market / interaction menu
        slot1: ['Digit1'],
        slot2: ['Digit2'],
        slot3: ['Digit3'],
        slot4: ['Digit4'],
        slot5: ['Digit5'],
        slot6: ['Digit6'],
        pause: ['Escape'],
      },
    },
  ],

  defaultModifiers: {
    initialCoins: 500,
    growthSpeedMultiplier: 1.0,
    energyDecayMultiplier: 1.0,
  },
};

export default manifest;
