import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Runs a command and returns trimmed standard output.
 *
 * Validation scripts use this for read-only command probes such as `git log` or
 * `git rev-list`. The command must be deterministic and must not require
 * interactive input because stdout is captured and stderr is hidden unless the
 * command fails.
 *
 * @param command - Executable to run, for example `git`.
 * @param args - Arguments passed to the executable without shell interpolation.
 * @returns Trimmed UTF-8 stdout.
 * @throws When the command exits non-zero or cannot be spawned.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#local-preflight
 */
export function commandOutput(command: string, args: readonly string[]): string {
  return execFileSync(command, [...args], { encoding: 'utf8', stdio: 'pipe' }).trim()
}

/**
 * Finds the tarball produced by `pnpm pack` for package smoke tests.
 *
 * Call this after `pnpm pack --pack-destination .pack --json`. The helper
 * requires exactly one `.tgz` file so stale tarballs cannot accidentally be used
 * during package-manager or contents validation.
 *
 * @returns Absolute path to the single packed tarball in `.pack`.
 * @throws When `.pack` contains zero or multiple tarballs.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#package-contents
 */
export function findSinglePackedTarball(): string {
  const packFiles = readdirSync('.pack').filter((file) => file.endsWith('.tgz'))
  if (packFiles.length !== 1) throw new Error(`Expected exactly one tarball in .pack, found ${packFiles.length}.`)

  const [packFile] = packFiles
  if (packFile === undefined) throw new Error('Expected a tarball file in .pack.')
  return join(process.cwd(), '.pack', packFile)
}

/**
 * Narrows unknown JSON-like values to plain non-array objects.
 *
 * Use this immediately after `JSON.parse` or external command output parsing
 * before reading object properties. It deliberately accepts any non-null object
 * except arrays because the validation scripts only need key-based access.
 *
 * @param value - Unknown value from a runtime boundary.
 * @returns `true` when `value` can be read with string keys.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#local-preflight
 */
export function isRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Runs a command inside a temporary smoke-test project and streams output.
 *
 * Package-manager smoke tests use this for install, typecheck, and runtime
 * verification steps where live stdout/stderr is useful for debugging failures.
 * Arguments are passed without a shell, so callers must provide each token as a
 * separate array item.
 *
 * @param command - Executable to run, for example `pnpm` or `node`.
 * @param args - Arguments passed to the executable without shell interpolation.
 * @param cwd - Working directory for the command.
 * @throws When the command exits non-zero or cannot be spawned.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#local-preflight
 */
export function runCommand(command: string, args: readonly string[], cwd: string): void {
  console.log(`$ ${command} ${args.join(' ')}`)
  execFileSync(command, [...args], { cwd, stdio: 'inherit' })
}
