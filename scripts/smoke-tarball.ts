import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const packFiles = readdirSync('.pack').filter((file) => file.endsWith('.tgz'))
if (packFiles.length !== 1) throw new Error(`Expected exactly one tarball in .pack, found ${packFiles.length}.`)

const tarball = join(process.cwd(), '.pack', packFiles[0] ?? '')
const directory = mkdtempSync(join(tmpdir(), 'ts-match-pack-smoke-'))

try {
  writeFileSync(join(directory, 'package.json'), '{"type":"module","private":true}\n')
  execFileSync('pnpm', ['add', tarball], { cwd: directory, stdio: 'pipe' })

  execFileSync(
    'node',
    [
      '--input-type=module',
      '--eval',
      `
const root = await import('@diegogbrisa/ts-match')
const matchModule = await import('@diegogbrisa/ts-match/match')
const matchByModule = await import('@diegogbrisa/ts-match/match-by')
const patternsModule = await import('@diegogbrisa/ts-match/patterns')
const assertionsModule = await import('@diegogbrisa/ts-match/assertions')
const errorsModule = await import('@diegogbrisa/ts-match/errors')
const groupModule = await import('@diegogbrisa/ts-match/group')
if (root.match('x').with('x', () => 1).exhaustive() !== 1) throw new Error('root failed')
if (matchModule.match('x').with('x', () => 2).exhaustive() !== 2) throw new Error('match failed')
if (matchByModule.matchBy({ type: 'a', value: 3 }, 'type').cases({ a: (value) => value.value }) !== 3) throw new Error('match-by failed')
if (!patternsModule.P.string) throw new Error('patterns failed')
if (!assertionsModule.isMatching(patternsModule.P.string, 'x')) throw new Error('assertions failed')
if (!(new errorsModule.NonExhaustiveMatchError('x') instanceof Error)) throw new Error('errors failed')
if (groupModule.group('a', () => 1).tags[0] !== 'a') throw new Error('group failed')
console.log('tarball exports smoke ok')
`,
    ],
    { cwd: directory, stdio: 'inherit' },
  )
} finally {
  rmSync(directory, { recursive: true, force: true })
}
