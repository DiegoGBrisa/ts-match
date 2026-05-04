import { assertMatching, group, isMatching, match, matchBy, P } from '../src/index.js'
import type { MatchByPath, MatchPromiseResult } from '../src/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Expect<T extends true> = T
type IsAny<T> = 0 extends 1 & T ? true : false
type NotAny<T> = IsAny<T> extends true ? false : true

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
    type _value = Expect<Equal<typeof value, Extract<Action, { type: 'load-success' }>>>
    type _notAny = Expect<NotAny<typeof value>>
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
  ['click', (value) => value.meta.x],
  ['submit', (value) => value.meta.form.length],
  [undefined, (value) => Number(value.empty)],
])

type _nestedResult = Expect<Equal<typeof _nestedResultValue, number>>

const _tupleEntryPartialValue = matchBy(nested, 'meta.type')
  .partial([
    ['click', (value) => value.meta.x],
    [['submit'], (value) => value.meta.form.length],
  ])
  .otherwise((value) => {
    const empty: Extract<Nested, { readonly empty: true }> = value
    return Number(empty.empty)
  })
type _tupleEntryPartial = Expect<Equal<typeof _tupleEntryPartialValue, number>>

const _groupedTuplePartialValue = matchBy(action, 'type')
  .partial([
    [
      ['load-success', 'load-failure'],
      (value) => {
        type _value = Expect<Equal<typeof value, Extract<Action, { readonly type: 'load-success' | 'load-failure' }>>>
        type _notAny = Expect<NotAny<typeof value>>
        return 'fileDiffs' in value ? value.fileDiffs.length : value.error.length
      },
    ],
  ])
  .otherwise((value) => {
    const clear: Extract<Action, { readonly type: 'clear' }> = value
    return clear.type.length
  })
type _groupedTuplePartial = Expect<Equal<typeof _groupedTuplePartialValue, number>>

const _callbackGroupedPartialValue = matchBy(action, 'type')
  .partial((group) => [
    group(['load-success', 'load-failure'], (value) => {
      type _value = Expect<Equal<typeof value, Extract<Action, { readonly type: 'load-success' | 'load-failure' }>>>
      type _notAny = Expect<NotAny<typeof value>>
      return 'fileDiffs' in value ? value.fileDiffs.length : value.error.length
    }),
  ])
  .otherwise((value) => {
    const clear: Extract<Action, { readonly type: 'clear' }> = value
    return clear.type.length
  })
type _callbackGroupedPartial = Expect<Equal<typeof _callbackGroupedPartialValue, number>>

const _exportedGroupPartialValue = matchBy(action, 'type')
  .partial([
    group(
      ['load-success', 'load-failure'],
      (value: Extract<Action, { readonly type: 'load-success' | 'load-failure' }>) => {
        type _value = Expect<Equal<typeof value, Extract<Action, { readonly type: 'load-success' | 'load-failure' }>>>
        type _notAny = Expect<NotAny<typeof value>>
        return 'fileDiffs' in value ? value.fileDiffs.length : value.error.length
      },
    ),
  ])
  .otherwise((value) => {
    const clear: Extract<Action, { readonly type: 'clear' }> = value
    return clear.type.length
  })
type _exportedGroupPartial = Expect<Equal<typeof _exportedGroupPartialValue, number>>

// @ts-expect-error tuple-entry partial tags must be possible for the selected path
matchBy(action, 'type').partial([['missing', () => 0]])

// @ts-expect-error tuple-entry partials cannot keep an empty completion placeholder as a handled tag
matchBy(action, 'type').partial([['', () => 0]])

// @ts-expect-error grouped tuple-entry partials cannot keep an empty completion placeholder as a handled tag
matchBy(action, 'type').partial([[[''], () => 0]])

// @ts-expect-error tuple-entry cases must be exhaustive
matchBy(action, 'type').cases([['clear', () => 0]])

// @ts-expect-error grouped tuple-entry cases must be exhaustive
matchBy(action, 'type').cases([[['clear', 'load-success'], () => 0]])

// @ts-expect-error grouped tuple-entry cases cannot keep an empty completion placeholder as a handled tag
matchBy(action, 'type').cases([
  [[''], () => 0],
  ['clear', () => 0],
  ['load-success', () => 0],
])

// @ts-expect-error grouped tuple-entry cases cannot include impossible tags
matchBy(action, 'type').cases([
  [['missing'], () => 0],
  ['clear', () => 0],
  ['load-success', () => 0],
  ['load-failure', () => 0],
])

// @ts-expect-error exported grouped entries cannot include impossible tags
matchBy(action, 'type').cases([
  group(['clear', 'missing'], () => 0),
  ['load-success', () => 0],
  ['load-failure', () => 0],
])

type ScalableTupleState =
  | { readonly type: 's0'; readonly v0: number }
  | { readonly type: 's1'; readonly v1: number }
  | { readonly type: 's2'; readonly v2: number }
  | { readonly type: 's3'; readonly v3: number }
  | { readonly type: 's4'; readonly v4: number }
  | { readonly type: 's5'; readonly v5: number }
  | { readonly type: 's6'; readonly v6: number }
  | { readonly type: 's7'; readonly v7: number }
  | { readonly type: 's8'; readonly v8: number }
  | { readonly type: 's9'; readonly v9: number }
  | { readonly type: 's10'; readonly v10: number }
  | { readonly type: 's11'; readonly v11: number }
  | { readonly type: 's12'; readonly v12: number }
  | { readonly type: 's13'; readonly v13: number }
  | { readonly type: 's14'; readonly v14: number }
  | { readonly type: 's15'; readonly v15: number }
  | { readonly type: 's16'; readonly v16: number }
declare const scalableTupleState: ScalableTupleState
const _scalableTupleEntryInferenceValue = matchBy(scalableTupleState, 'type').cases([
  ['s0', (value) => value.v0],
  ['s1', (value) => value.v1],
  ['s2', (value) => value.v2],
  ['s3', (value) => value.v3],
  ['s4', (value) => value.v4],
  ['s5', (value) => value.v5],
  ['s6', (value) => value.v6],
  ['s7', (value) => value.v7],
  ['s8', (value) => value.v8],
  ['s9', (value) => value.v9],
  ['s10', (value) => value.v10],
  ['s11', (value) => value.v11],
  ['s12', (value) => value.v12],
  ['s13', (value) => value.v13],
  ['s14', (value) => value.v14],
  ['s15', (value) => value.v15],
  ['s16', (value) => value.v16],
])
type _scalableTupleEntryInference = Expect<Equal<typeof _scalableTupleEntryInferenceValue, number>>

const filterSource: unknown[] = [
  { type: 'user', id: '1' },
  { type: 'post', id: 1 },
]
const _filteredResult = filterSource.filter(isMatching({ type: 'user', id: P.string }))

type _filtered = Expect<Equal<typeof _filteredResult, { type: 'user'; id: string }[]>>

const payload: unknown = { type: 'user', id: '1' }
assertMatching({ type: 'user', id: P.string }, payload)
const _payloadId: string = payload.id

declare const resultPromise: Promise<Result>
declare const nestedResultPromise: Promise<Promise<Result>>
declare const maybeResultPromise: Result | PromiseLike<Result>
declare const resultThenable: PromiseLike<Result>

const _promiseMatchResultValue = match
  .promise(resultPromise)
  .with({ type: 'success' }, async (value) => value.data)
  .with({ type: 'error' }, (value) => value.message)
  .with({ type: 'idle' }, () => 'idle')
  .exhaustive()
type _promiseMatchResult = Expect<Equal<typeof _promiseMatchResultValue, Promise<string>>>

const _promiseMatchMaybeValue = match
  .promise(maybeResultPromise)
  .with({ type: 'success' }, (value) => value.count)
  .otherwise(() => Promise.resolve(0))
type _promiseMatchMaybe = Expect<Equal<typeof _promiseMatchMaybeValue, Promise<number>>>

const _promiseMatchNestedValue = match
  .promise(nestedResultPromise)
  .with({ type: 'success' }, (value) => value.count)
  .otherwise(() => 0)
type _promiseMatchNested = Expect<Equal<typeof _promiseMatchNestedValue, Promise<number>>>

const _promiseMatchThenableValue = match
  .promise(resultThenable)
  .with({ type: 'success' }, (value) => value.data)
  .otherwise(() => 'fallback')
type _promiseMatchThenable = Expect<Equal<typeof _promiseMatchThenableValue, Promise<string>>>

const _promiseSafeExhaustiveValue = match
  .promise(resultPromise)
  .with({ type: 'success' }, (value) => Promise.resolve(value.data))
  .with({ type: 'error' }, (value) => value.message)
  .with({ type: 'idle' }, () => 'idle')
  .safeExhaustive()
type _promiseSafeExhaustive = Expect<Equal<typeof _promiseSafeExhaustiveValue, Promise<MatchPromiseResult<string>>>>

const _promiseSafeOtherwiseValue = match
  .promise(resultPromise)
  .with({ type: 'success' }, (value) => value.count)
  .safeOtherwise(() => Promise.resolve(0))
type _promiseSafeOtherwise = Expect<Equal<typeof _promiseSafeOtherwiseValue, Promise<MatchPromiseResult<number>>>>

const _promiseIncomplete = match.promise(resultPromise).with({ type: 'success' }, (value) => value.data)
// @ts-expect-error safeExhaustive requires every remaining variant to be handled
_promiseIncomplete.safeExhaustive()

// @ts-expect-error safeOtherwise requires a fallback handler
match.promise(resultPromise).safeOtherwise()

// @ts-expect-error sync match builders do not expose safe terminals
match(result).safeExhaustive()

// @ts-expect-error the legacy async-named member was removed in favor of match.promise
match['async'](result)

declare const actionPromise: Promise<Action>

const _promiseMatchByResultValue = matchBy.promise(actionPromise, 'type').cases({
  clear: async () => 0,
  'load-success': (value) => value.fileDiffs.length,
  'load-failure': (value) => value.error.length,
})
type _promiseMatchByResult = Expect<Equal<typeof _promiseMatchByResultValue, Promise<number>>>

declare const maybeActionPromise: Action | PromiseLike<Action>
const _promiseMatchByMaybeValue = matchBy
  .promise(maybeActionPromise, 'type')
  .with('clear', () => 0)
  .with('load-success', (value) => value.fileDiffs.length)
  .otherwise((value) => Promise.resolve(value.error.length))
type _promiseMatchByMaybe = Expect<Equal<typeof _promiseMatchByMaybeValue, Promise<number>>>

const _promiseMatchByPartialValue = matchBy
  .promise(actionPromise, 'type')
  .partial({ clear: () => 0 })
  .otherwise((value) => ('fileDiffs' in value ? value.fileDiffs.length : value.error.length))
type _promiseMatchByPartial = Expect<Equal<typeof _promiseMatchByPartialValue, Promise<number>>>

const _promiseMatchByGroupedValue = matchBy
  .promise(actionPromise, 'type')
  .cases((group) => [
    group('clear', 'load-failure', (value) => ('error' in value ? value.error.length : 0)),
    group('load-success', (value) => value.fileDiffs.length),
  ])
type _promiseMatchByGrouped = Expect<Equal<typeof _promiseMatchByGroupedValue, Promise<number>>>

const _promiseMatchByTupleEntriesValue = matchBy.promise(actionPromise, 'type').cases([
  ['clear', () => 0],
  ['load-success', (value) => value.fileDiffs.length],
  [['load-failure'], (value) => value.error.length],
])
type _promiseMatchByTupleEntries = Expect<Equal<typeof _promiseMatchByTupleEntriesValue, Promise<number>>>

const _promiseMatchByGroupedTupleEntriesValue = matchBy.promise(actionPromise, 'type').cases([
  ['clear', () => 0],
  [['load-success', 'load-failure'], (value) => ('fileDiffs' in value ? value.fileDiffs.length : value.error.length)],
])
type _promiseMatchByGroupedTupleEntries = Expect<Equal<typeof _promiseMatchByGroupedTupleEntriesValue, Promise<number>>>

const _promiseMatchByTuplePartialValue = matchBy
  .promise(actionPromise, 'type')
  .partial([
    ['clear', () => 0],
    [['load-success'], (value) => value.fileDiffs.length],
  ])
  .otherwise((value) => value.error.length)
type _promiseMatchByTuplePartial = Expect<Equal<typeof _promiseMatchByTuplePartialValue, Promise<number>>>

const _promiseMatchByGroupedTuplePartialValue = matchBy
  .promise(actionPromise, 'type')
  .partial([
    [
      ['load-success', 'load-failure'],
      (value) => {
        type _value = Expect<Equal<typeof value, Extract<Action, { readonly type: 'load-success' | 'load-failure' }>>>
        type _notAny = Expect<NotAny<typeof value>>
        return 'fileDiffs' in value ? value.fileDiffs.length : value.error.length
      },
    ],
  ])
  .otherwise((value) => {
    const clear: Extract<Action, { readonly type: 'clear' }> = value
    return clear.type.length
  })
type _promiseMatchByGroupedTuplePartial = Expect<Equal<typeof _promiseMatchByGroupedTuplePartialValue, Promise<number>>>

const _promiseMatchByCallbackGroupedPartialValue = matchBy
  .promise(actionPromise, 'type')
  .partial((group) => [
    group(['load-success', 'load-failure'], (value) => {
      type _value = Expect<Equal<typeof value, Extract<Action, { readonly type: 'load-success' | 'load-failure' }>>>
      type _notAny = Expect<NotAny<typeof value>>
      return 'fileDiffs' in value ? value.fileDiffs.length : value.error.length
    }),
  ])
  .otherwise((value) => {
    const clear: Extract<Action, { readonly type: 'clear' }> = value
    return clear.type.length
  })
type _promiseMatchByCallbackGroupedPartial = Expect<
  Equal<typeof _promiseMatchByCallbackGroupedPartialValue, Promise<number>>
>

// @ts-expect-error promise tuple-entry cases must be exhaustive
matchBy.promise(actionPromise, 'type').cases([['clear', () => 0]])

// @ts-expect-error promise grouped tuple-entry cases must be exhaustive
matchBy.promise(actionPromise, 'type').cases([[['clear', 'load-success'], () => 0]])

// @ts-expect-error promise grouped tuple-entry cases cannot keep an empty completion placeholder as a handled tag
matchBy.promise(actionPromise, 'type').cases([
  [[''], () => 0],
  ['clear', () => 0],
  ['load-success', () => 0],
])

// @ts-expect-error promise tuple-entry partial tags must be possible for the selected path
matchBy.promise(actionPromise, 'type').partial([['missing', () => 0]])

// @ts-expect-error promise tuple-entry partials cannot keep an empty completion placeholder as a handled tag
matchBy.promise(actionPromise, 'type').partial([['', () => 0]])

// @ts-expect-error promise grouped tuple-entry partials cannot keep an empty completion placeholder as a handled tag
matchBy.promise(actionPromise, 'type').partial([[[''], () => 0]])

const _promiseMatchBySafeValue = matchBy
  .promise(actionPromise, 'type')
  .with('clear', () => 0)
  .with('load-success', (value) => value.fileDiffs.length)
  .with('load-failure', (value) => Promise.resolve(value.error.length))
  .safeExhaustive()
type _promiseMatchBySafe = Expect<Equal<typeof _promiseMatchBySafeValue, Promise<MatchPromiseResult<number>>>>

const _promiseMatchBySafeOtherwiseValue = matchBy
  .promise(actionPromise, 'type')
  .with('clear', () => 0)
  .safeOtherwise((value) => ('fileDiffs' in value ? value.fileDiffs.length : value.error.length))
type _promiseMatchBySafeOtherwise = Expect<
  Equal<typeof _promiseMatchBySafeOtherwiseValue, Promise<MatchPromiseResult<number>>>
>

// @ts-expect-error the legacy async-named member was removed in favor of matchBy.promise
matchBy['async'](action, 'type')

declare const promiseSafeResult: Awaited<typeof _promiseSafeExhaustiveValue>
if (promiseSafeResult.ok) {
  const value: string = promiseSafeResult.value
  void value
} else {
  const error: unknown = promiseSafeResult.error
  void error
  // @ts-expect-error failed safe results do not expose a value
  void promiseSafeResult.value
}

const annotatedPromiseResult: MatchPromiseResult<number> = { ok: true, value: 1 }
if (annotatedPromiseResult.ok) {
  annotatedPromiseResult.value = 2
}
