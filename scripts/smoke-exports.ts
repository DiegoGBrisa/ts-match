export {}

const root = await import('@diegogbrisa/ts-match')
const matchModule = await import('@diegogbrisa/ts-match/match')
const matchByModule = await import('@diegogbrisa/ts-match/match-by')
const patternsModule = await import('@diegogbrisa/ts-match/patterns')
const assertionsModule = await import('@diegogbrisa/ts-match/assertions')
const errorsModule = await import('@diegogbrisa/ts-match/errors')
const groupModule = await import('@diegogbrisa/ts-match/group')

if (
  root
    .match('x')
    .with('x', () => 1)
    .exhaustive() !== 1
)
  throw new Error('root match export failed')
if (
  matchModule
    .match('x')
    .with('x', () => 1)
    .exhaustive() !== 1
)
  throw new Error('match subpath failed')
if (matchByModule.matchBy({ type: 'a' as const, value: 2 }, 'type').cases({ a: (value) => value.value }) !== 2) {
  throw new Error('match-by subpath failed')
}
if (!patternsModule.P.string) {
  throw new Error('patterns subpath failed')
}
if (!patternsModule.P.regex(/\d/)) {
  throw new Error('patterns regex helper export failed')
}
if (!patternsModule.pTemporalInstant) {
  throw new Error('patterns temporal named helper export failed')
}
if (!assertionsModule.isMatching(patternsModule.P.string, 'x')) throw new Error('assertions subpath failed')
if (!assertionsModule.isMatching(root.pNullish, null)) throw new Error('root named helper export failed')
if (!(new errorsModule.NonExhaustiveMatchError('x') instanceof Error)) throw new Error('errors subpath failed')
if (groupModule.group('a', () => 1).tags[0] !== 'a') throw new Error('group subpath failed')

console.log('package exports smoke ok')
