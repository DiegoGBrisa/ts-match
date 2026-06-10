import { group, matchBy } from '../../index.js'
import type { MatchByPath } from '../../index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T
type IsAny<T> = 0 extends 1 & T ? true : false
type NotAny<T> = IsAny<T> extends true ? false : true

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
