import type { GameManifest } from '@runtime/types';

const manifest: GameManifest = {
  id: 'knight-lab',
  title: 'ANIMATION LAB',
  description: 'A reusable developer lab for previewing character animation modules. Start with the supplied HD Knight.',
  version: '1.0.0',
  author: 'PartyPlay Studio',
  category: 'Arcade',
  thumbnail: '',
  tags: ['Developer Tool', 'Animation', 'Knight', 'Sprite Test'],
  difficulty: 'Easy',
  minPlayers: 1,
  maxPlayers: 1,
  estimatedRoundTime: 'Open-ended',
  capabilities: { supportsPause: true, supportsRestart: true, supportsModifiers: true, supportsSeed: false, supportsGamepad: false, supportsTouch: false },
  defaultControls: [{
    playerId: 1,
    deviceId: 'keyboard-main',
    bindings: {
      moveUp: ['KeyW'], moveDown: ['KeyS'], moveLeft: ['KeyA'], moveRight: ['KeyD'],
      action: ['Space'], alternate: ['KeyF'], block: ['KeyQ'], skill: ['KeyE'], spell: ['KeyR'],
      roll: ['ShiftLeft'], crouch: ['KeyC'], slide: ['KeyV'], flip: ['KeyB'],
      showcase: ['Tab'], damage: ['KeyH'], reset: ['KeyK'], selectKnight: ['Digit1', 'Enter', 'Space'], pause: ['Escape'],
    },
  }],
  defaultModifiers: { animationSpeed: 1 },
};

export default manifest;
