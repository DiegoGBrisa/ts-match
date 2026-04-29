import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

export function commandOutput(command: string, args: readonly string[]): string {
  return execFileSync(command, [...args], { encoding: 'utf8', stdio: 'pipe' }).trim()
}

export function findSinglePackedTarball(): string {
  const packFiles = readdirSync('.pack').filter((file) => file.endsWith('.tgz'))
  if (packFiles.length !== 1) throw new Error(`Expected exactly one tarball in .pack, found ${packFiles.length}.`)

  const [packFile] = packFiles
  if (packFile === undefined) throw new Error('Expected a tarball file in .pack.')
  return join(process.cwd(), '.pack', packFile)
}

export function isRecord(value: unknown): value is { readonly [key: string]: unknown } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function runCommand(command: string, args: readonly string[], cwd: string): void {
  console.log(`$ ${command} ${args.join(' ')}`)
  execFileSync(command, [...args], { cwd, stdio: 'inherit' })
}
