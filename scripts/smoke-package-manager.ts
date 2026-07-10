import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  CLI_ARGUMENT_OFFSET,
  environmentVariable,
  findSinglePackedTarball,
  JSON_INDENT_SPACES,
  runCommand,
} from './script-utils.js'

const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const
const DEFAULT_YARN_VERSION = '4.5.3'

type PackageManager = (typeof PACKAGE_MANAGERS)[number]

const smokeSource = `
import { matchBy, P } from '@diegogbrisa/ts-match'
import { match } from '@diegogbrisa/ts-match/match'

type Event =
  | { type: 'ok'; value: number }
  | { type: 'skip'; reason: string }

function eventValue(): Event {
  return { type: 'ok', value: 1 }
}

const result = matchBy(eventValue(), 'type')
  .with('ok', (value) => value.value)
  .with('skip', () => 0)
  .exhaustive()

const label = match('ready')
  .with(P.string, (value) => value)
  .exhaustive()

if (result !== 1) throw new Error('matchBy smoke failed')
if (label !== 'ready') throw new Error('match subpath smoke failed')

console.log('package-manager smoke ok')
`

/**
 * Validates the package-manager argument accepted by this smoke test.
 *
 * CI calls the script once per package manager. This guard keeps accidental
 * misspellings or unsupported package managers from creating misleading temp
 * projects.
 *
 * @param value - CLI argument after `pnpm smoke:package-manager --`.
 * @returns `true` when `value` is one of the supported package-manager names.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#local-preflight
 */
function isPackageManager(value: string | undefined): value is PackageManager {
  return value !== undefined && PACKAGE_MANAGERS.some((packageManager) => packageManager === value)
}

function installedTypescriptPackage() {
  const packageJson: unknown = JSON.parse(
    readFileSync(join(process.cwd(), 'node_modules/typescript/package.json'), 'utf8'),
  )
  if (
    typeof packageJson !== 'object' ||
    packageJson === null ||
    !('version' in packageJson) ||
    typeof packageJson.version !== 'string'
  ) {
    throw new Error('Installed TypeScript package metadata does not contain a version.')
  }
  return `typescript@${packageJson.version}`
}

/**
 * Installs the packed library tarball with the requested package manager.
 *
 * The temporary project installs the repository's locked TypeScript version so
 * registry releases cannot change the package-manager matrix mid-run. npm uses
 * `--ignore-scripts` to avoid lifecycle scripts during this compatibility check.
 *
 * @param packageManager - Supported client to use for installation.
 * @param directory - Temporary project directory.
 * @param tarball - Packed library tarball produced by `pnpm pack`.
 * @param typescriptPackage - Exact installed TypeScript package specifier.
 * @throws When installation fails.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#local-preflight
 */
function installWithPackageManager(
  packageManager: PackageManager,
  directory: string,
  tarball: string,
  typescriptPackage: string,
) {
  if (packageManager === 'npm') {
    runCommand('npm', ['install', '--ignore-scripts', tarball, typescriptPackage], directory)
    return
  }

  if (packageManager === 'pnpm') {
    runCommand('pnpm', ['add', tarball, typescriptPackage], directory)
    return
  }

  if (packageManager === 'yarn') {
    runCommand('corepack', ['yarn', 'add', tarball, typescriptPackage], directory)
    return
  }

  runCommand('bun', ['add', tarball, typescriptPackage], directory)
}

const [packageManager] = process.argv.slice(CLI_ARGUMENT_OFFSET).filter((argument) => argument !== '--')
if (!isPackageManager(packageManager)) {
  throw new Error(`Expected package manager argument: ${PACKAGE_MANAGERS.join(', ')}`)
}

const tarball = findSinglePackedTarball()
const typescriptPackage = installedTypescriptPackage()
const directory = mkdtempSync(join(tmpdir(), `ts-match-${packageManager}-smoke-`))

try {
  mkdirSync(join(directory, 'src'))
  const packageJson =
    packageManager === 'yarn'
      ? {
          type: 'module',
          private: true,
          packageManager: `yarn@${environmentVariable('YARN_VERSION') ?? DEFAULT_YARN_VERSION}`,
        }
      : { type: 'module', private: true }
  writeFileSync(join(directory, 'package.json'), `${JSON.stringify(packageJson, null, JSON_INDENT_SPACES)}\n`)
  writeFileSync(
    join(directory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          skipLibCheck: false,
          rootDir: 'src',
          outDir: 'dist',
        },
        include: ['src'],
      },
      null,
      JSON_INDENT_SPACES,
    )}\n`,
  )
  writeFileSync(join(directory, 'src/smoke.ts'), smokeSource.trimStart())
  if (packageManager === 'yarn') writeFileSync(join(directory, '.yarnrc.yml'), 'nodeLinker: node-modules\n')

  installWithPackageManager(packageManager, directory, tarball, typescriptPackage)
  runCommand('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], directory)
  runCommand('node', ['dist/smoke.js'], directory)
} finally {
  rmSync(directory, { recursive: true, force: true })
}
