import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const packFiles = readdirSync('.pack').filter((file) => file.endsWith('.tgz'))
if (packFiles.length !== 1) throw new Error(`Expected exactly one tarball in .pack, found ${packFiles.length}.`)

const tarball = join(process.cwd(), '.pack', packFiles[0] ?? '')
const esmDirectory = mkdtempSync(join(tmpdir(), 'ts-match-pack-smoke-esm-'))
const scriptDirectory = mkdtempSync(join(tmpdir(), 'ts-match-pack-smoke-script-'))

try {
  writeFileSync(join(esmDirectory, 'package.json'), '{"type":"module","private":true}\n')
  execFileSync('pnpm', ['add', tarball], { cwd: esmDirectory, stdio: 'pipe' })

  execFileSync(
    'node',
    [
      '--input-type=module',
      '--eval',
      `
import { createRequire } from 'node:module'

const require = createRequire(process.cwd() + '/smoke.cjs')
const root = await import('@diegogbrisa/ts-match')
const matchModule = await import('@diegogbrisa/ts-match/match')
const matchByModule = await import('@diegogbrisa/ts-match/match-by')
const patternsModule = await import('@diegogbrisa/ts-match/patterns')
const assertionsModule = await import('@diegogbrisa/ts-match/assertions')
const errorsModule = await import('@diegogbrisa/ts-match/errors')
const groupModule = await import('@diegogbrisa/ts-match/group')
const cjsRoot = require('@diegogbrisa/ts-match')
const cjsGroupModule = require('@diegogbrisa/ts-match/group')
if (root.match('x').with('x', () => 1).exhaustive() !== 1) throw new Error('root failed')
if (matchModule.match('x').with('x', () => 2).exhaustive() !== 2) throw new Error('match failed')
if (matchByModule.matchBy({ type: 'a', value: 3 }, 'type').cases({ a: (value) => value.value }) !== 3) throw new Error('match-by failed')
if (!patternsModule.P.string) throw new Error('patterns failed')
if (!assertionsModule.isMatching(patternsModule.P.string, 'x')) throw new Error('assertions failed')
if (!(new errorsModule.NonExhaustiveMatchError('x') instanceof Error)) throw new Error('errors failed')
if (groupModule.group('a', () => 1).tags[0] !== 'a') throw new Error('group failed')
if (root.match('x').with(cjsRoot.P.string, () => 'matched').exhaustive() !== 'matched') {
  throw new Error('mixed esm match with commonjs pattern failed')
}
if (cjsRoot.match('x').with(patternsModule.P.string, () => 'matched').exhaustive() !== 'matched') {
  throw new Error('mixed commonjs match with esm pattern failed')
}
if (matchByModule.matchBy({ type: 'a', value: 4 }, 'type').cases([cjsGroupModule.group('a', (value) => value.value)]) !== 4) {
  throw new Error('mixed esm matchBy with commonjs group failed')
}
if (cjsRoot.matchBy({ type: 'a', value: 5 }, 'type').cases([groupModule.group('a', (value) => value.value)]) !== 5) {
  throw new Error('mixed commonjs matchBy with esm group failed')
}
console.log('tarball exports smoke ok')
`,
    ],
    { cwd: esmDirectory, stdio: 'inherit' },
  )

  writeFileSync(join(scriptDirectory, 'package.json'), '{"private":true}\n')
  writeFileSync(
    join(scriptDirectory, 'tsconfig.json'),
    `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": false
  },
  "include": ["script.ts"]
}
`,
  )
  writeFileSync(
    join(scriptDirectory, 'script.ts'),
    `
import { assertMatching, group, isMatching, matchBy, NonExhaustiveMatchError, P } from '@diegogbrisa/ts-match'
import { assertMatching as assertMatchingSubpath } from '@diegogbrisa/ts-match/assertions'
import { NonExhaustiveMatchError as NonExhaustiveMatchErrorSubpath } from '@diegogbrisa/ts-match/errors'
import { group as groupSubpath } from '@diegogbrisa/ts-match/group'
import { match } from '@diegogbrisa/ts-match/match'
import { matchBy as matchBySubpath } from '@diegogbrisa/ts-match/match-by'
import { P as patternsSubpath } from '@diegogbrisa/ts-match/patterns'

const result = matchBy({ type: 'a' as const, value: 1 }, 'type')
  .with('a', (value) => value.value)
  .exhaustive()
const label = match('ready')
  .with(P.string, (value) => value)
  .exhaustive()
const subpathResult = matchBySubpath({ type: 'b' as const, value: 2 }, 'type').cases({ b: (value) => value.value })

if (result !== 1) throw new Error('tsx script root export failed')
if (label !== 'ready') throw new Error('tsx script subpath export failed')
if (subpathResult !== 2) throw new Error('tsx script match-by subpath failed')
if (!isMatching(patternsSubpath.string, 'x')) throw new Error('tsx script patterns/assertions failed')
assertMatching(patternsSubpath.string, 'x')
assertMatchingSubpath(patternsSubpath.string, 'x')
if (!(new NonExhaustiveMatchError('x') instanceof NonExhaustiveMatchErrorSubpath)) {
  throw new Error('tsx script errors subpath failed')
}
if (group('a', () => 1).tags[0] !== groupSubpath('a', () => 1).tags[0]) {
  throw new Error('tsx script group subpath failed')
}
console.log('tarball tsx script smoke ok')
`.trimStart(),
  )
  execFileSync('pnpm', ['add', tarball, 'tsx', 'typescript'], { cwd: scriptDirectory, stdio: 'pipe' })
  execFileSync(
    'node',
    [
      '--eval',
      `
const root = require('@diegogbrisa/ts-match')
const assertionsModule = require('@diegogbrisa/ts-match/assertions')
const errorsModule = require('@diegogbrisa/ts-match/errors')
const groupModule = require('@diegogbrisa/ts-match/group')
const { match } = require('@diegogbrisa/ts-match/match')
const matchByModule = require('@diegogbrisa/ts-match/match-by')
const patternsModule = require('@diegogbrisa/ts-match/patterns')

if (root.matchBy({ type: 'a', value: 1 }, 'type').cases({ a: (value) => value.value }) !== 1) {
  throw new Error('commonjs root export failed')
}
if (match('ready').with('ready', () => 'ok').exhaustive() !== 'ok') {
  throw new Error('commonjs match subpath failed')
}
if (matchByModule.matchBy({ type: 'b', value: 2 }, 'type').cases({ b: (value) => value.value }) !== 2) {
  throw new Error('commonjs match-by subpath failed')
}
if (!assertionsModule.isMatching(patternsModule.P.string, 'x')) {
  throw new Error('commonjs assertions/patterns subpath failed')
}
if (!(new errorsModule.NonExhaustiveMatchError('x') instanceof Error)) {
  throw new Error('commonjs errors subpath failed')
}
if (groupModule.group('a', () => 1).tags[0] !== 'a') {
  throw new Error('commonjs group subpath failed')
}
console.log('tarball commonjs smoke ok')
`,
    ],
    { cwd: scriptDirectory, stdio: 'inherit' },
  )
  execFileSync('node', ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit'], {
    cwd: scriptDirectory,
    stdio: 'inherit',
  })
  execFileSync('pnpm', ['exec', 'tsx', 'script.ts'], { cwd: scriptDirectory, stdio: 'inherit' })
} finally {
  rmSync(esmDirectory, { recursive: true, force: true })
  rmSync(scriptDirectory, { recursive: true, force: true })
}
