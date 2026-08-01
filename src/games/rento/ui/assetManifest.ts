import { publicAsset } from '@shared/assetUrl';

/** All optional art is local. Procedural renderers remain available when an image cannot load. */
export const RENT0_ASSETS = {
  crest: publicAsset('/assets/rento/rento-crest.svg'),
  skyline: publicAsset('/assets/rento/metropolis-skyline.svg'),
  boardTexture: publicAsset('/assets/rento/board-grid.svg'),
  boardConcept: publicAsset('/assets/rento/metropolis-board-concept.png'),
  tycoonAvatars: publicAsset('/assets/rento/premium/tycoon-avatars.png'),
} as const;

export type RentoAssetKey = keyof typeof RENT0_ASSETS;
