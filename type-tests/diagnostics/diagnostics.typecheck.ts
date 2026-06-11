import { assertMatching, isMatching, match, matchBy, P } from '../../src/index.js'

type Expect<T extends true> = T
type Includes<THaystack extends string, TNeedle extends string> = THaystack extends `${string}${TNeedle}${string}`
  ? true
  : false

type Action =
  | { readonly type: 'start'; readonly payload: string }
  | { readonly type: 'stop'; readonly code: number }
  | { readonly type: 'reset' }

declare const action: Action

// @ts-expect-error ts-match: match is not exhaustive
match(action)
  .with({ type: 'start' }, (value) => value.payload)
  .exhaustive()

match(action)
  // @ts-expect-error ts-match: this pattern cannot match the current input type
  .with({ type: 'missing' }, () => 'missing')
  .otherwise(() => 'fallback')

// @ts-expect-error ts-match: invalid matchBy path
matchBy(action, 'missing')

matchBy(action, 'type')
  // @ts-expect-error ts-match: this matchBy tag cannot occur at the selected path
  .with('missing', () => 'missing')
  .otherwise(() => 'fallback')

// @ts-expect-error ts-match: matchBy is not exhaustive
matchBy(action, 'type')
  .with('start', (value) => value.payload)
  .exhaustive()

// @ts-expect-error ts-match: object-map cases are missing required key(s)
matchBy(action, 'type').cases({ start: (value) => value.payload })

matchBy(action, 'type').cases({
  start: (value) => value.payload,
  stop: (value) => value.code,
  reset: () => 'reset',
  // @ts-expect-error ts-match: object-map case contains an extra key
  extra: () => 'extra',
})

// @ts-expect-error ts-match: repeated container patterns cannot contain P.select
P.array(P.select('item'))

// @ts-expect-error ts-match: invalid P.collect usage
match(action).with(P.collect('items', P.string), () => 'bad')

// @ts-expect-error ts-match: invalid P.collect usage
match({ item: 'x' }).with({ item: P.collect('items', P.string) }, () => 'bad')

// @ts-expect-error ts-match: invalid P.collect usage
P.tuple([P.collect('items', P.string)])

// @ts-expect-error ts-match: invalid P.collect usage
P.tuple([P.rest(P.collect('items', P.string))])

match({ selected: 'x', items: ['a'] }).with(
  // @ts-expect-error ts-match: invalid P.collect usage
  { selected: P.select(), items: P.array(P.collect('items', P.string)) },
  () => 'bad',
)

// @ts-expect-error ts-match: P.exclude(pattern) cannot contain P.collect
P.exclude(P.collect('items', P.string))

// @ts-expect-error ts-match: P.exclude(pattern) cannot contain P.select
P.exclude(P.select('x'))

// @ts-expect-error ts-match: invalid P.rest usage
P.tuple([P.rest(P.string), P.number])

// @ts-expect-error ts-match: invalid P.rest usage
P.map(P.rest(P.string), P.number)

// @ts-expect-error ts-match: invalid P.rest usage
P.set(P.rest(P.string))

// @ts-expect-error ts-match: invalid P.select usage
isMatching(P.array(P.select('item')))

// @ts-expect-error ts-match: invalid P.select usage
assertMatching({ a: P.select(), b: P.select() }, action)

type _diagnosticTextHasPrefix = Expect<Includes<'ts-match: match is not exhaustive', 'ts-match:'>>
