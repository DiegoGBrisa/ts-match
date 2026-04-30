import { assertMatching, group, isMatching, match, matchBy, P } from '../src/index.js'
import type { MatchByPath } from '../src/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Expect<T extends true> = T

type Result =
  | { readonly type: 'success'; readonly data: string; readonly count: number }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'idle' }

declare const result: Result

const _exhaustiveResult = match(result)
  .with({ type: 'success' }, (value) => value.data)
  .with({ type: 'error' }, (value) => value.message)
  .with({ type: 'idle' }, () => 'idle')
  .exhaustive()

type _exhaustive = Expect<Equal<typeof _exhaustiveResult, string>>

const selected = match(result)
  .with({ type: 'success', data: P.select('data'), count: P.select('count') }, (value) => {
    const data: string = value.data
    const count: number = value.count
    return `${data}:${String(count)}`
  })
  .otherwise(() => 'fallback')

const _selectedAssignable: string = selected

const _anonymousResult = match(result)
  .with({ type: 'success', data: P.select() }, (data) => data.toUpperCase())
  .otherwise(() => 'fallback')

type _anonymous = Expect<Equal<typeof _anonymousResult, string>>

const incomplete = match(result).with({ type: 'success' }, (value) => value.data)
// @ts-expect-error exhaustive requires every remaining variant to be handled
incomplete.exhaustive()

match(result)
  // @ts-expect-error impossible property should fail for known object types
  .with({ typo: 'success' }, () => 'bad')
  .otherwise(() => 'ok')

declare const unknownValue: unknown
const _fromUnknownResult = match(unknownValue)
  .with({ type: 'user', id: P.string }, (value) => {
    const id: string = value.id
    const type: 'user' = value.type
    // @ts-expect-error inferred shape should not allow arbitrary keys
    const _missing = value.missing
    return id + type
  })
  .otherwise(() => null)

type _fromUnknown = Expect<Equal<typeof _fromUnknownResult, string | null>>

type UserId = string & { readonly __brand: 'UserId' }
declare const userId: UserId
const _brandedResult = match(userId)
  .with(P.string, (value) => value)
  .exhaustive()
type _branded = Expect<Equal<typeof _brandedResult, UserId>>

type Action =
  | { type: 'clear' }
  | { type: 'load-success'; fileDiffs: readonly string[] }
  | { type: 'load-failure'; error: string }

declare const action: Action

const _byWithResult = matchBy(action, 'type')
  .with('clear', () => 0)
  .with('load-success', (value) => {
    const files: readonly string[] = value.fileDiffs
    // @ts-expect-error handler should be narrowed to the load-success variant
    const error = value.error
    void error
    return files.length
  })
  .with('load-failure', (value) => value.error.length)
  .exhaustive()

type _byWith = Expect<Equal<typeof _byWithResult, number>>

const _byMapResult = matchBy(action, 'type').cases({
  clear: () => 0,
  'load-success': (value) => value.fileDiffs.length,
  'load-failure': (value) => value.error.length,
})

type _byMap = Expect<Equal<typeof _byMapResult, number>>

matchBy(action, 'type').cases({
  clear: () => 0,
  'load-success': (value) => value.fileDiffs.length,
  // @ts-expect-error extra keys should be rejected
  nope: () => 1,
  'load-failure': (value) => value.error.length,
})

// @ts-expect-error missing load-failure should be rejected
matchBy(action, 'type').cases({
  clear: () => 0,
  'load-success': (value: Extract<Action, { type: 'load-success' }>) => value.fileDiffs.length,
})

const _byGroupedResult = matchBy(action, 'type').cases((group) => [
  group('clear', 'load-failure', (value) => ('error' in value ? value.error.length : 0)),
  group('load-success', (value) => value.fileDiffs.length),
])

type _byGrouped = Expect<Equal<typeof _byGroupedResult, number>>

const _byGroupHelperResult = matchBy(action, 'type').cases((group) => [
  group(['clear', 'load-failure'], (value) => ('error' in value ? value.error.length : 0)),
  group('load-success', (value) => value.fileDiffs.length),
])

type _byGroupHelper = Expect<Equal<typeof _byGroupHelperResult, number>>

const reusableActionTags = ['clear', 'load-failure'] as const
const _byReusableGroupHelperResult = matchBy(action, 'type').cases((group) => [
  group(reusableActionTags, (value) => ('error' in value ? value.error.length : 0)),
  group('load-success', (value) => value.fileDiffs.length),
])

type _byReusableGroupHelper = Expect<Equal<typeof _byReusableGroupHelperResult, number>>

const runtimeActionTags: readonly ('clear' | 'load-failure')[] = ['clear']

// @ts-expect-error runtime arrays cannot prove exhaustive grouped-case coverage
matchBy(action, 'type').cases((group) => [
  group(runtimeActionTags, (value) => ('error' in value ? value.error.length : 0)),
  group('load-success', (value) => value.fileDiffs.length),
])

const exportedRuntimeGroup = group(runtimeActionTags, (value: Action) => ('error' in value ? value.error.length : 0))

// @ts-expect-error runtime arrays cannot prove exhaustive exported-group coverage
matchBy(action, 'type').cases([exportedRuntimeGroup, group('load-success', (value: Action) => value.fileDiffs.length)])

type Nested =
  | { meta: { type: 'click'; x: number } }
  | { meta: { type: 'submit'; form: string } }
  | { meta?: undefined; empty: true }

declare const nested: Nested

type UiEventPathAutocomplete =
  | {
      readonly type: 'click'
      readonly value: { readonly meta: { readonly form: string; readonly kind: 'primary' }; readonly x: number }
    }
  | {
      readonly type: 'submit'
      readonly value: { readonly meta: { readonly form: string; readonly kind: 'secondary' }; readonly y: number }
    }

type _matchByStringPathCompletions = Expect<
  Equal<Extract<MatchByPath<UiEventPathAutocomplete>, string>, 'type' | 'value.meta.kind'>
>

type _matchByTuplePathCompletions = Expect<
  Equal<
    Extract<MatchByPath<UiEventPathAutocomplete>, readonly PropertyKey[]>,
    readonly ['type'] | readonly ['value', 'meta', 'kind']
  >
>

declare const broadPoint: { readonly type: 'point'; readonly x: number; readonly y: number }
const _broadNumericPathStillWorks = matchBy(broadPoint, 'x')
  .with(1, (value) => value.y)
  .otherwise((value) => value.x)

type _broadNumericPath = Expect<Equal<typeof _broadNumericPathStillWorks, number>>

type OptionalNestedPath = { readonly meta: { readonly kind: 'ready' } } | { readonly meta?: undefined }
type _optionalNestedPathAutocomplete = Expect<Equal<Extract<MatchByPath<OptionalNestedPath>, string>, 'meta.kind'>>

declare const EVENT_KIND: unique symbol
type SymbolPathEvent =
  | { readonly meta: { readonly [EVENT_KIND]: 'user'; readonly code: number } }
  | { readonly meta: { readonly [EVENT_KIND]: 'system'; readonly code: number } }
type _symbolTuplePathAutocomplete = Expect<
  Equal<Extract<MatchByPath<SymbolPathEvent>, readonly PropertyKey[]>, readonly ['meta', typeof EVENT_KIND]>
>
declare const symbolPathEvent: SymbolPathEvent
const _symbolTuplePathValue = matchBy(symbolPathEvent, ['meta', EVENT_KIND])
  .with('user', (value) => value.meta.code)
  .with('system', (value) => value.meta.code)
  .exhaustive()
type _symbolTuplePath = Expect<Equal<typeof _symbolTuplePathValue, number>>

type DottedKeyPathEvent =
  | { readonly 'meta.type': 'click'; readonly x: number }
  | { readonly 'meta.type': 'submit'; readonly y: number }
type _dottedKeyStringPathAutocomplete = Expect<Equal<Extract<MatchByPath<DottedKeyPathEvent>, string>, never>>
type _dottedKeyTuplePathAutocomplete = Expect<
  Equal<Extract<MatchByPath<DottedKeyPathEvent>, readonly PropertyKey[]>, readonly ['meta.type']>
>

const _nestedResultValue = matchBy(nested, 'meta.type').cases([
  ['click', (value: Extract<Nested, { meta: { type: 'click' } }>) => value.meta.x],
  ['submit', (value: Extract<Nested, { meta: { type: 'submit' } }>) => value.meta.form.length],
  [undefined, (value: Extract<Nested, { empty: true }>) => Number(value.empty)],
])

type _nestedResult = Expect<Equal<typeof _nestedResultValue, number>>

const filterSource: unknown[] = [
  { type: 'user', id: '1' },
  { type: 'post', id: 1 },
]
const _filteredResult = filterSource.filter(isMatching({ type: 'user', id: P.string }))

type _filtered = Expect<Equal<typeof _filteredResult, { type: 'user'; id: string }[]>>

const payload: unknown = { type: 'user', id: '1' }
assertMatching({ type: 'user', id: P.string }, payload)
const _payloadId: string = payload.id

const _asyncMatchResultValue = match
  .async(result)
  .with({ type: 'success' }, async (value) => value.data)
  .with({ type: 'error' }, (value) => value.message)
  .with({ type: 'idle' }, () => 'idle')
  .exhaustive()
type _asyncMatchResult = Expect<Equal<typeof _asyncMatchResultValue, Promise<string>>>

const _asyncMatchByResultValue = matchBy.async(action, 'type').cases({
  clear: async () => 0,
  'load-success': (value) => value.fileDiffs.length,
  'load-failure': (value) => value.error.length,
})
type _asyncMatchByResult = Expect<Equal<typeof _asyncMatchByResultValue, Promise<number>>>
