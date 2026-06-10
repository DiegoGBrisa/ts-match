export const architecturePolicy = {
  sourceRoot: 'src',
  runtimeTestRoot: 'tests',
  typeTestRoot: 'type-tests',
  sourceIndex: 'index.ts',
  typescriptExtension: '.ts',
  javascriptModuleTestExtension: '.test.mjs',
  testExtension: '.test.ts',
  typecheckExtension: '.typecheck.ts',
  testDirectory: '__tests__',
  typecheckDirectory: '__typecheck__',
  forbiddenInternalDirectory: '_internal',

  featureFolders: ['assertions', 'errors', 'group', 'match', 'match-by', 'patterns', 'promise', 'runtime', 'types'],

  deepFeatureFolders: ['match', 'match-by', 'patterns', 'runtime', 'types'],

  publicSubpaths: ['assertions', 'errors', 'group', 'match', 'match-by', 'patterns'],

  crossRuntimeTestFolders: ['adversarial', 'integration'],

  crossTypecheckFolders: ['adversarial', 'diagnostics', 'hardening', 'integration', 'performance', 'public-api'],

  typeEngineFiles: {
    'capture-detection.ts': 'Selection and collection-capture detection for handler payload inference.',
    'collection-inference.ts': 'Collection pattern inference for arrays, maps, sets, and records.',
    'exact-selection.ts': 'Exact object-pattern coverage and selection utilities.',
    'index.ts': 'Public type seam re-exporting the type engine.',
    'match-by-arguments.ts': 'matchBy argument diagnostics and accepted path argument shapes.',
    'match-by-paths.ts': 'Property path inference for matchBy direct, dot, and tuple paths.',
    'object-coverage.ts': 'Object-pattern coverage and remaining-value calculations.',
    'pattern-arguments.ts': 'Pattern helper argument validation diagnostics.',
    'pattern-collections.ts': 'Public Map, Set, and collection pattern model types.',
    'pattern-core.ts': 'Core public Pattern helper model and primitive pattern types.',
    'pattern-coverage.ts': 'Pattern coverage and remaining-union type engine.',
    'pattern-diagnostics.ts': 'Readable ts-match diagnostic type payloads.',
    'pattern-inference.ts': 'Pattern-to-value inference for structural match branches.',
    'pattern-utilities.ts': 'Shared type-level utilities used by the type engine.',
    'result-utilities.ts': 'Promise builder result and awaited-value type helpers.',
    'selection-payloads.ts': 'Selection and collection-capture handler payload construction.',
  },

  sharedFiles: {
    'keys.ts': 'Concept-neutral object-key reflection primitive used by runtime readers.',
  },

  typeEngineImportExceptions: {
    'src/types/pattern-core.ts': ['src/patterns/token.ts'],
    'src/types/pattern-utilities.ts': ['src/group/token.ts'],
  },
} as const
