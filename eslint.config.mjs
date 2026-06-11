import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import importPlugin from 'eslint-plugin-import-x'
import { tsImport } from 'tsx/esm/api'
import tseslint from 'typescript-eslint'

const ROOT_DIR = dirname(fileURLToPath(import.meta.url))
const { localPlugin } = await tsImport('./eslint-rules/local-plugin.ts', {
  parentURL: import.meta.url,
  tsconfig: './tsconfig.eslint.json',
})

export default tseslint.config(
  {
    ignores: ['dist/**', '.pack/**', 'node_modules/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        sourceType: 'module',
        tsconfigRootDir: ROOT_DIR,
      },
    },
    plugins: {
      'import-x': importPlugin,
      local: localPlugin,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: ['./tsconfig.eslint.json'],
        }),
      ],
    },
    rules: {
      complexity: ['error', { max: 15 }],
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: false }],
      'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: false }],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Do not read process.env. Model environment access behind an explicit boundary.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'SwitchStatement',
          message: 'Avoid source switch statements unless benchmark evidence justifies one.',
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="forEach"]',
          message: 'Avoid `.forEach(...)`; use `for...of` or an array combinator that returns a value.',
        },
        {
          selector: 'ForStatement[init=null][test=null][update=null]',
          message:
            'Do not use `for (;;)` loops. Use an explicit loop condition or a named helper so termination is reviewable.',
        },
        {
          selector: 'TSImportType',
          message: 'Inline import() types are disallowed; import named types at the top of the file.',
        },
      ],
      'no-undef': 'off',
      'prefer-const': ['error', { destructuring: 'any', ignoreReadBeforeAssign: false }],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
          custom: {
            regex: '^.{1,55}$',
            match: true,
          },
        },
        {
          selector: 'variable',
          types: ['function'],
          format: ['camelCase', 'PascalCase'],
          custom: {
            regex: '^.{1,55}$',
            match: true,
          },
        },
      ],
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-invalid-void-type': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'local/no-inline-magic-numbers': 'error',
      'local/no-non-const-assertions': 'error',
      'local/no-rule-bypass-comments': 'error',
      'local/prefer-inferred-internal-return-types': 'error',
    },
  },
  {
    files: [
      'diagnostics/**/*.ts',
      'tests/**/*.ts',
      'type-tests/**/*.ts',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.typecheck.ts',
    ],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: false }],
      'max-lines-per-function': 'off',
    },
  },
  {
    files: ['benchmarks/**/*.ts'],
    rules: {
      complexity: 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="forEach"]',
          message: 'Avoid `.forEach(...)`; use `for...of` or an array combinator that returns a value.',
        },
        {
          selector: 'ForStatement[init=null][test=null][update=null]',
          message:
            'Do not use `for (;;)` loops. Use an explicit loop condition or a named helper so termination is reviewable.',
        },
        {
          selector: 'TSImportType',
          message: 'Inline import() types are disallowed; import named types at the top of the file.',
        },
      ],
    },
  },
  {
    files: ['scripts/script-utils.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['src/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
)
