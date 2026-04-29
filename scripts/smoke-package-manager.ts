import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findSinglePackedTarball, runCommand } from './script-utils.js'

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

/**
 * Installs the packed library tarball with the requested package manager.
 *
 * The temporary project also installs TypeScript so the smoke test can compile a
 * real consumer file after installation. npm uses `--ignore-scripts` to avoid
 * running package lifecycle scripts during this install-only compatibility check.
 *
 * @param packageManager - Supported client to use for installation.
 * @param directory - Temporary project directory.
 * @param tarball - Packed library tarball produced by `pnpm pack`.
 * @throws When installation fails.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#local-preflight
 */
function installWithPackageManager(packageManager: PackageManager, directory: string, tarball: string): void {
  if (packageManager === 'npm') {
    runCommand('npm', ['install', '--ignore-scripts', tarball, 'typescript'], directory)
    return
  }

  if (packageManager === 'pnpm') {
    runCommand('pnpm', ['add', tarball, 'typescript'], directory)
    return
  }

  if (packageManager === 'yarn') {
    runCommand('corepack', ['yarn', 'add', tarball, 'typescript'], directory)
    return
  }

  runCommand('bun', ['add', tarball, 'typescript'], directory)
}

const [packageManager] = process.argv.slice(2).filter((argument) => argument !== '--')
if (!isPackageManager(packageManager)) {
  throw new Error(`Expected package manager argument: ${PACKAGE_MANAGERS.join(', ')}`)
}

const tarball = findSinglePackedTarball()
const directory = mkdtempSync(join(tmpdir(), `ts-match-${packageManager}-smoke-`))

try {
  mkdirSync(join(directory, 'src'))
  const packageJson =
    packageManager === 'yarn'
      ? { type: 'module', private: true, packageManager: `yarn@${process.env.YARN_VERSION ?? DEFAULT_YARN_VERSION}` }
      : { type: 'module', private: true }
  writeFileSync(join(directory, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
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
      2,
    )}\n`,
  )
  writeFileSync(join(directory, 'src/smoke.ts'), smokeSource.trimStart())
  if (packageManager === 'yarn') writeFileSync(join(directory, '.yarnrc.yml'), 'nodeLinker: node-modules\n')

  installWithPackageManager(packageManager, directory, tarball)
  runCommand('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], directory)
  runCommand('node', ['dist/smoke.js'], directory)
} finally {
  rmSync(directory, { recursive: true, force: true })
}
