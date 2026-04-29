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

function isPackageManager(value: string | undefined): value is PackageManager {
  return value !== undefined && PACKAGE_MANAGERS.some((packageManager) => packageManager === value)
}

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
