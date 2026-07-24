import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'platform', pattern: 'src/platform/*' },
        { type: 'runtime', pattern: 'src/runtime/*' },
        { type: 'services', pattern: 'src/services/*' },
        { type: 'game', pattern: 'src/games/*' },
        { type: 'shared', pattern: 'src/shared/*' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: { type: 'shared' }, allow: ['shared'] },
            { from: { type: 'services' }, allow: ['services', 'shared'] },
            { from: { type: 'runtime' }, allow: ['runtime', 'services', 'shared'] },
            { from: { type: 'game' }, allow: ['runtime', 'shared', 'game'] },
            { from: { type: 'platform' }, allow: ['platform', 'runtime', 'services', 'shared', 'game'] },
          ],
        },
      ],
    },
  },
];
