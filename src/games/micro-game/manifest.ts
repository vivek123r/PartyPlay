import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'micro-game',
  title: 'Micro Test Game',
  description: 'Minimal validation game testing 60 FPS loop, input, audio, events, and crash safety.',
  version: '1.0.0',
  author: 'PartyPlay Core',
  category: 'Arcade',
  thumbnail: '',
  tags: ['Test', 'Validation'],
  difficulty: 'Easy',
  minPlayers: 2,
  maxPlayers: 4,
  estimatedRoundTime: '10-30s',

  capabilities: {
    supportsPause: true,
    supportsRestart: true,
    supportsModifiers: true,
    supportsSeed: true,
    supportsGamepad: false,
    supportsTouch: false,
  },

  defaultControls: [
    { playerId: 1, deviceId: 'keyboard-main', bindings: { moveLeft: ['KeyA'], moveRight: ['KeyD'], pause: ['Escape'] } },
    { playerId: 2, deviceId: 'keyboard-main', bindings: { moveLeft: ['ArrowLeft'], moveRight: ['ArrowRight'], pause: ['Escape'] } },
    { playerId: 3, deviceId: 'keyboard-main', bindings: { moveLeft: ['KeyJ'], moveRight: ['KeyL'], pause: ['Escape'] } },
    { playerId: 4, deviceId: 'keyboard-main', bindings: { moveLeft: ['Numpad4'], moveRight: ['Numpad6'], pause: ['Escape'] } },
  ],


  defaultModifiers: {
    speedMultiplier: 1.0,
  },
};

export default manifest;
