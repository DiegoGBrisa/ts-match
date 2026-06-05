import { execFileSync } from 'node:child_process'
import { assertPackageRepositoryUrl, findSinglePackedTarball } from './script-utils.js'

const DIST_MODULES = [
  'assertions',
  'errors',
  'group',
  'index',
  'keys',
  'match',
  'match-by',
  'patterns',
  'promise-runtime',
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
  '03-match-promise.ts',
  '04-match-by-direct-key.ts',
  '05-match-by-nested-path.ts',
  '06-match-by-promise.ts',
  '07-grouped-cases.ts',
  '08-pattern-helpers.ts',
  '09-named-helper-imports.ts',
  '10-is-matching.ts',
  '11-assert-matching.ts',
  '12-error-handling.ts',
  '13-real-world-events.ts',
  '14-performance-friendly-hoisting.ts',
  '15-match-by-with-partial.ts',
  '16-convenience-helpers.ts',
  '17-collection-helpers.ts',
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

/**
 * Lists normalized file paths from a packed npm tarball.
 *
 * Run this after `pnpm pack --pack-destination .pack --json`. The package
 * contents check compares the returned paths against a strict allowlist so
 * releases include the intended docs/examples and exclude accidental local files.
 *
 * @param tarball - Path to the `.tgz` package archive produced by `pnpm pack`.
 * @returns Sorted package-relative tarball entries such as `package/dist/index.js`.
 * @throws When the `tar` command cannot read the archive.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#package-contents
 */
function listTarballFiles(tarball: string): readonly string[] {
  return execFileSync('tar', ['-tf', tarball], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort()
}

/**
 * Reads package metadata from the packed npm tarball.
 *
 * npm validates `package/package.json` during publication, not the repository
 * checkout's root `package.json`. Reading the archived file catches provenance
 * metadata mismatches before `npm publish` reaches the registry.
 *
 * @param tarball - Path to the `.tgz` package archive produced by `pnpm pack`.
 * @returns Parsed package metadata from `package/package.json`.
 * @throws When the archive cannot be read or contains invalid JSON.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#automated-npm-publishing
 */
function readTarballPackageJson(tarball: string): unknown {
  return JSON.parse(execFileSync('tar', ['-xOf', tarball, 'package/package.json'], { encoding: 'utf8' }))
}

const expectedFiles = new Set<string>(expectedPackageFiles)
const tarball = findSinglePackedTarball()
const actualFiles = listTarballFiles(tarball)
assertPackageRepositoryUrl(readTarballPackageJson(tarball), 'packed package.json')
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
