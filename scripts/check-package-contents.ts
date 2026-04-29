import { execFileSync } from 'node:child_process'
import { findSinglePackedTarball } from './script-utils.js'

const DIST_MODULES = [
  'assertions',
  'errors',
  'group',
  'index',
  'keys',
  'match',
  'match-by',
  'patterns',
  'runtime',
  'tokens',
  'types',
] as const

const DIAGNOSTIC_FILES = [
  'assertions.errors.ts',
  'match-by.errors.ts',
  'match.errors.ts',
  'pattern-helpers.errors.ts',
] as const

const EXAMPLE_FILES = [
  '01-basic-match.ts',
  '02-exhaustive-discriminated-union.ts',
  '03-match-async.ts',
  '04-match-by-direct-key.ts',
  '05-match-by-nested-path.ts',
  '06-match-by-async.ts',
  '07-grouped-cases.ts',
  '08-pattern-helpers.ts',
  '09-named-helper-imports.ts',
  '10-is-matching.ts',
  '11-assert-matching.ts',
  '12-error-handling.ts',
  '13-real-world-events.ts',
  '14-performance-friendly-hoisting.ts',
  '15-match-by-with-partial.ts',
] as const

const expectedPackageFiles = [
  'package/package.json',
  'package/README.md',
  'package/SKILL.md',
  'package/CHANGELOG.md',
  'package/LICENSE',
  'package/docs/design.md',
  'package/docs/release.md',
  'package/benchmarks/native.ts',
  ...DIST_MODULES.flatMap((moduleName) => [`package/dist/${moduleName}.d.ts`, `package/dist/${moduleName}.js`]),
  ...DIAGNOSTIC_FILES.map((fileName) => `package/diagnostics/${fileName}`),
  ...EXAMPLE_FILES.map((fileName) => `package/examples/${fileName}`),
] as const

function listTarballFiles(tarball: string): readonly string[] {
  return execFileSync('tar', ['-tf', tarball], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort()
}

const expectedFiles = new Set<string>(expectedPackageFiles)
const actualFiles = listTarballFiles(findSinglePackedTarball())
const actualFileSet = new Set(actualFiles)

const missingFiles = expectedPackageFiles.filter((file) => !actualFileSet.has(file))
const unexpectedFiles = actualFiles.filter((file) => !expectedFiles.has(file))

if (missingFiles.length > 0 || unexpectedFiles.length > 0) {
  const details = [
    missingFiles.length > 0 ? `Missing files:\n${missingFiles.map((file) => `  - ${file}`).join('\n')}` : '',
    unexpectedFiles.length > 0 ? `Unexpected files:\n${unexpectedFiles.map((file) => `  - ${file}`).join('\n')}` : '',
  ]
    .filter((section) => section.length > 0)
    .join('\n\n')

  throw new Error(`Package contents do not match the allowlist.\n${details}`)
}

console.log(`package contents allowlist ok (${actualFiles.length} files)`)
