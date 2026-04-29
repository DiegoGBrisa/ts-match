import { isMatching, match, P } from '@diegogbrisa/ts-match'

class AppError extends Error {
  readonly code = 'app-error'
}

function classifyStatus(status: 'draft' | 'published'): string {
  return match(status)
    .with(P.exclude('draft'), () => 'not-draft')
    .with('draft', () => 'draft')
    .exhaustive()
}

const checks = [
  isMatching(P._, 'anything'),
  isMatching(P.any, 123),
  isMatching(P.string, 'text'),
  isMatching(P.number, 42),
  isMatching(P.boolean, false),
  isMatching(P.bigint, 1n),
  isMatching(P.symbol, Symbol('s')),
  isMatching(P.null, null),
  isMatching(P.undefined, undefined),
  isMatching(P.nan, Number.NaN),
  isMatching(P.finite, 10),
  isMatching(P.integer, 10),
  isMatching(P.union('draft', 'published'), 'draft'),
  isMatching(P.array(P.number), [1, 2, 3]),
  isMatching(P.nonEmptyArray(P.string), ['a']),
  isMatching(P.tuple([P.string, P.rest(P.number)]), ['sum', 1, 2]),
  isMatching(P.exact({ user: { name: P.string } }), { user: { name: 'Ada' } }),
  isMatching(
    P.when((value: number) => value > 5),
    8,
  ),
  isMatching(P.instanceOf(AppError), new AppError('boom')),
  isMatching(P.record(P.string, P.number), { a: 1, b: 2 }),
  isMatching(P.nonEmptyRecord(P.string, P.boolean), { enabled: true }),
]

if (checks.some((check) => !check)) throw new Error('Expected every helper check to pass')

const optionalResult = match({})
  .with({ name: P.optional(P.string) }, () => 'optional')
  .exhaustive()

const excluded = classifyStatus('published')

const selected = match({ type: 'user', profile: { name: 'Ada', age: 36 } })
  .with(
    { type: 'user', profile: { name: P.select('name', P.string), age: P.select('age', P.number) } },
    ({ age, name }) => `${name}:${String(age)}`,
  )
  .otherwise(() => 'missing')

if (optionalResult !== 'optional') throw new Error('P.optional failed')
if (excluded !== 'not-draft') throw new Error('P.exclude failed')
if (selected !== 'Ada:36') throw new Error('P.select failed')
