import js from '@eslint/js';

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.js'],
    languageOptions: {
      ...(js.configs.recommended.languageOptions || {}),
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...(js.configs.recommended.languageOptions?.globals || {}),
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-console': 'off',
      eqeqeq: 'off',
      'no-redeclare': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-var': 'off',
      'prefer-const': 'off',
    },
  },
];
