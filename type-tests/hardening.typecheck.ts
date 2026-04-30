import {
  assertMatching,
  isMatching,
  match,
  matchBy,
  P,
  pArray,
  pNumber,
  pSelect,
  pString,
  pUnion,
} from '../src/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

type DeepReadonlyEvent =
  | { readonly type: 'open'; readonly payload: { readonly count: 1 }; readonly meta: { readonly phase: 'start' } }
  | { readonly type: 'close'; readonly payload: { readonly reason: 'done' }; readonly meta: { readonly phase: 'end' } }
  | { readonly type: 'idle'; readonly meta?: undefined }

declare const event: DeepReadonlyEvent

const _handlerNarrowing = match(event)
  .with({ type: 'open' }, (value) => {
    type _value = Expect<Equal<typeof value, Extract<DeepReadonlyEvent, { readonly type: 'open' }>>>
    const count: 1 = value.payload.count
    return count
  })
  .with({ type: 'close' }, (value) => {
    type _value = Expect<Equal<typeof value, Extract<DeepReadonlyEvent, { readonly type: 'close' }>>>
    return value.payload.reason
  })
  .with({ type: 'idle' }, (value) => {
    type _value = Expect<Equal<typeof value, Extract<DeepReadonlyEvent, { readonly type: 'idle' }>>>
    return value.type
  })
  .exhaustive()
type _handlerNarrowingReturn = Expect<Equal<typeof _handlerNarrowing, 1 | 'done' | 'idle'>>

const _remainingNarrowing = match(event)
  .with({ type: 'open' }, () => 'open')
  .otherwise((remaining) => {
    type _remaining = Expect<Equal<typeof remaining, Exclude<DeepReadonlyEvent, { readonly type: 'open' }>>>
    return remaining.type
  })
type _remainingNarrowingReturn = Expect<Equal<typeof _remainingNarrowing, 'open' | 'close' | 'idle'>>

const readonlyTuple = ['tag', 1] as const
const _readonlyTupleResult = match(readonlyTuple)
  .with([P.string, P.number], (value) => {
    type _value = Expect<Equal<typeof value, readonly ['tag', 1]>>
    return value[1]
  })
  .exhaustive()
type _readonlyTupleReturn = Expect<Equal<typeof _readonlyTupleResult, 1>>

const _selectionPayload = match(event)
  .with({ type: P.select('type'), meta: { phase: P.select('phase') } }, (selection) => {
    const selectedType: 'open' | 'close' = selection.type
    const selectedPhase: 'start' | 'end' = selection.phase
    if (selectedPhase === 'start') return selectedType
    return selectedType
  })
  .otherwise(() => 'idle')
type _selectionPayloadReturn = Expect<Equal<typeof _selectionPayload, 'open' | 'close' | 'idle'>>

const helperLiteralUnion = ((): 'a' | 'b' => 'a')()
const _pHelperInference = match(helperLiteralUnion)
  .with(pUnion('a'), () => 'a')
  .with(pString, (value) => {
    type _value = Expect<Equal<typeof value, 'b'>>
    return value
  })
  .exhaustive()
type _pHelperInferenceReturn = Expect<Equal<typeof _pHelperInference, 'a' | 'b'>>

const _pArrayInference = match([1, 2] as const)
  .with(pArray(pNumber), (value) => {
    type _value = Expect<Equal<typeof value, readonly [1, 2]>>
    return value[0]
  })
  .exhaustive()
type _pArrayInferenceReturn = Expect<Equal<typeof _pArrayInference, 1>>

const _matchByWith = matchBy(event, 'type')
  .with('open', (value) => {
    const count: 1 = value.payload.count
    return count
  })
  .with('close', 'idle', (value) => {
    const type: 'close' | 'idle' = value.type
    return type
  })
  .exhaustive()
type _matchByWithReturn = Expect<Equal<typeof _matchByWith, 1 | 'close' | 'idle'>>

const _matchByNestedMap = matchBy(event, 'meta.phase').cases([
  ['start', (value: Extract<DeepReadonlyEvent, { readonly meta: { readonly phase: 'start' } }>) => value.payload.count],
  ['end', (value: Extract<DeepReadonlyEvent, { readonly meta: { readonly phase: 'end' } }>) => value.payload.reason],
  [undefined, (value: Extract<DeepReadonlyEvent, { readonly type: 'idle' }>) => value.type],
])
type _matchByNestedMapReturn = Expect<Equal<typeof _matchByNestedMap, 1 | 'done' | 'idle'>>

const _matchByPartial = matchBy(event, 'type')
  .partial({ open: (value) => value.payload.count })
  .otherwise((remaining) => {
    type _remaining = Expect<Equal<typeof remaining, Exclude<DeepReadonlyEvent, { readonly type: 'open' }>>>
    return remaining.type
  })
type _matchByPartialReturn = Expect<Equal<typeof _matchByPartial, 1 | 'close' | 'idle'>>

const _promiseReturn = match
  .promise(Promise.resolve(event))
  .with({ type: 'open' }, async (value) => value.payload.count)
  .with({ type: 'close' }, (value) => value.payload.reason)
  .with({ type: 'idle' }, () => 'idle')
  .exhaustive()
type _promiseReturnType = Expect<Equal<typeof _promiseReturn, Promise<1 | 'done' | 'idle'>>>

const _predicateNarrowing = match(event)
  .when(
    (value): value is Extract<DeepReadonlyEvent, { readonly type: 'open' }> => value.type === 'open',
    (value) => {
      type _value = Expect<Equal<typeof value, Extract<DeepReadonlyEvent, { readonly type: 'open' }>>>
      return value.payload.count
    },
  )
  .otherwise((remaining) => {
    type _remaining = Expect<Equal<typeof remaining, Exclude<DeepReadonlyEvent, { readonly type: 'open' }>>>
    return remaining.type
  })
type _predicateNarrowingReturn = Expect<Equal<typeof _predicateNarrowing, 1 | 'close' | 'idle'>>

declare const unknownValue: unknown
if (isMatching({ type: 'user', id: P.string }, unknownValue)) {
  type _unknownNarrowed = Expect<Equal<typeof unknownValue, { type: 'user'; id: string }>>
}

const unknownPayload: unknown = { type: 'user', id: '1' }
assertMatching({ type: 'user', id: P.string }, unknownPayload)
type _assertedUnknown = Expect<Equal<typeof unknownPayload, { type: 'user'; id: string }>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional type regression for documented any-input refinement behavior
declare const anyValue: any
const _anyInput = match(anyValue)
  .with({ type: 'user', id: P.string }, (value) => {
    const id: string = value.id
    // @ts-expect-error any input should still be refined by the pattern
    const _missing = value.missing
    return id
  })
  .otherwise(() => null)
type _anyInputReturn = Expect<Equal<typeof _anyInput, string | null>>

declare const neverValue: never
const _neverResult = match(neverValue).exhaustive()
type _neverResultType = Expect<Equal<typeof _neverResult, never>>

declare const impossibleLiteralUnion: 'a' | 'b'
// @ts-expect-error impossible literal should be rejected
match(impossibleLiteralUnion).with('c', () => 'bad')

// @ts-expect-error invalid selector placement should be rejected
match(['x']).with(P.array(pSelect()), () => 'bad')

// @ts-expect-error invalid dot path should be rejected
matchBy(event, 'payload.missing')

// @ts-expect-error tuple path segments must be property keys
matchBy(event, [{}] as const)

declare const broadTag: string
// @ts-expect-error broad discriminants cannot use exhaustive object maps
matchBy({ type: broadTag }, 'type').cases({ x: () => 1 })

declare const collisionKind: true | 'true'
// @ts-expect-error normalized object keys collide
matchBy({ kind: collisionKind }, 'kind').cases({ true: () => 1 })

matchBy(event, 'type').cases({
  // @ts-expect-error wrong handler for case map key should fail
  open: (value: Extract<DeepReadonlyEvent, { readonly type: 'close' }>) => value.payload.reason,
  close: () => 'close',
  idle: () => 'idle',
})

match(event)
  .with({ type: 'open' }, () => 'open')
  // @ts-expect-error exhaustive cannot be bypassed by an argument
  .exhaustive(event)

const _callbackGrouped = matchBy(event, 'type').cases((group) => [
  group(['open', 'close'], (value) => {
    const type: 'open' | 'close' = value.type
    return type
  }),
  group('idle', (value) => value.type),
])
type _callbackGroupedReturn = Expect<Equal<typeof _callbackGrouped, 'open' | 'close' | 'idle'>>
