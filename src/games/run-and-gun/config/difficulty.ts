import type { DifficultyConfig } from '../types';

export const DIFFICULTY: Record<1 | 2, DifficultyConfig> = {
  1: {
    label: 'NORMAL',
    enemyCountMultiplier: 1.0,
    enemyHealthMultiplier: 1.0,
    bossHealthMultiplier: 1.0,
    description: [
      'Standard enemy forces',
      'Normal enemy patrols',
      'Standard boss encounters',
    ],
  },
  2: {
    label: 'HARD',
    enemyCountMultiplier: 1.5,
    enemyHealthMultiplier: 1.3,
    bossHealthMultiplier: 1.8,
    description: [
      'Increased enemy forces',
      'Reinforced enemy patrols',
      'Elite boss encounters',
    ],
  },
};
