import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import node from 'eslint-plugin-n';

export default [
  {
    ignores: ['**/dist', '**/node_modules']
  },
  js.configs.recommended,
  prettierRecommended,
  node.configs['flat/recommended-script'],
  {
    languageOptions: {
      globals: globals.node,
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 'latest'
      }
    },
    rules: {
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'n/no-unpublished-import': 'off',
      'prettier/prettier': [
        'warn',
        {
          printWidth: 100,
          tabWidth: 2,
          singleQuote: true,
          endOfLine: 'auto',
          trailingComma: 'none',
          arrowParens: 'avoid'
        }
      ]
    }
  }
];
