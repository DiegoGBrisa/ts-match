import tseslint from 'typescript-eslint'
import noNonConstAssertions from './eslint-rules/no-non-const-assertions.mjs'

export default tseslint.config(
  {
    ignores: ['dist/**', '.pack/**', 'node_modules/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'SwitchStatement',
          message: 'Avoid source switch statements unless benchmark evidence justifies one.',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      local: {
        rules: {
          'no-non-const-assertions': noNonConstAssertions,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'local/no-non-const-assertions': 'error',
    },
  },
)
