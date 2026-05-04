import { assertMatching, isMatching } from '../src/assertions.js'
import { NonExhaustiveMatchError, PatternMismatchError, preview } from '../src/errors.js'
import { group } from '../src/group.js'
import { match } from '../src/match.js'
import type {
  MatchFunction,
  MatchPromiseResult,
  MatchedValue,
  PromiseMatchBuilder,
  SyncMatchBuilder,
} from '../src/match.js'
import { matchBy } from '../src/match-by.js'
import type {
  MatchByBuilder,
  MatchByFunction,
  MatchByPath,
  PromiseMatchByBuilder,
  SyncMatchByBuilder,
} from '../src/match-by.js'
import {
  P,
  pAny,
  pArray,
  pBigint,
  pBoolean,
  pExact,
  pExclude,
  pFinite,
  pInstanceOf,
  pInteger,
  pNan,
  pNonEmptyArray,
  pNonEmptyRecord,
  pNull,
  pNumber,
  pOptional,
  pRecord,
  pRest,
  pSelect,
  pString,
  pSymbol,
  pTuple,
  pUndefined,
  pUnion,
  pWhen,
  pWildcard,
} from '../src/patterns.js'
import type { InferPattern } from '../src/types.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Expect<T extends true> = T

class DomainError extends Error {
  readonly code = 'domain-error'
}

type Payment =
  | { readonly kind: 'card'; readonly last4: string; readonly amountCents: number }
  | { readonly kind: 'cash'; readonly receivedCents: number }
  | { readonly kind: 'coupon'; readonly code: string }

declare const payment: Payment
declare const paymentPromise: Promise<Payment>
declare const unknownInput: unknown
declare const candidateRecord: unknown

const _matchFunction: MatchFunction = match
const _matchByFunction: MatchByFunction = matchBy
const _syncBuilder: SyncMatchBuilder<Payment, Payment, never> = match(payment)
const _promiseBuilder: PromiseMatchBuilder<Promise<Payment>, Payment, never> = match.promise(paymentPromise)
const _syncMatchByBuilder: SyncMatchByBuilder<Payment, 'kind', Payment, never> = matchBy(payment, 'kind')
const _promiseMatchByBuilder: PromiseMatchByBuilder<Promise<Payment>, 'kind', Payment, never> = matchBy.promise(
  paymentPromise,
  'kind',
)
const _matchByBuilder: MatchByBuilder<Payment, 'kind', Payment, never, false> = matchBy(payment, 'kind')

type _paymentPath = Expect<Equal<Extract<MatchByPath<Payment>, string>, 'kind'>>
const _matchedCard: MatchedValue<Payment, { readonly kind: 'card' }> = {
  kind: 'card',
  last4: '4242',
  amountCents: 1200,
}
const _inferredPattern: InferPattern<{ readonly id: typeof pString }> = { id: 'user-1' }

const _promiseWhenValue = match
  .promise(paymentPromise)
  .when(
    (value): value is Extract<Payment, { kind: 'card' }> => value.kind === 'card',
    (card) => card.last4,
  )
  .otherwise((remaining) => (remaining.kind === 'cash' ? remaining.receivedCents : remaining.code.length))
type _promiseWhen = Expect<Equal<typeof _promiseWhenValue, Promise<string | number>>>

const _promiseMultiPatternValue = match
  .promise(paymentPromise)
  .with({ kind: 'card' }, { kind: 'coupon' }, (value) => (value.kind === 'card' ? value.last4 : value.code))
  .with({ kind: 'cash' }, (value) => value.receivedCents)
  .exhaustive()
type _promiseMultiPattern = Expect<Equal<typeof _promiseMultiPatternValue, Promise<string | number>>>

type UserProfileResponse = { readonly type: 'user'; readonly profile: { readonly name: string; readonly age: number } }
const _promiseSelectValue = match
  .promise(Promise.resolve<UserProfileResponse>({ type: 'user', profile: { name: 'Ada', age: 36 } }))
  .with(
    { type: 'user', profile: { name: P.select('name', pString), age: P.select('age', pNumber) } },
    ({ age, name }) => `${name}:${String(age)}`,
  )
  .exhaustive()
const _promiseSelectAssignable: Promise<string> = _promiseSelectValue

const _matchByPromiseMultiTagValue = matchBy
  .promise(paymentPromise, 'kind')
  .with('card', 'coupon', (value) => (value.kind === 'card' ? value.last4 : value.code))
  .with('cash', (value) => value.receivedCents)
  .exhaustive()
type _matchByPromiseMultiTag = Expect<Equal<typeof _matchByPromiseMultiTagValue, Promise<string | number>>>

const _matchByPromiseGroupedArrayValue = matchBy
  .promise(paymentPromise, 'kind')
  .cases((group) => [
    group(['card', 'coupon'], (value) => (value.kind === 'card' ? value.last4 : value.code)),
    group('cash', (value) => value.receivedCents),
  ])
type _matchByPromiseGroupedArray = Expect<Equal<typeof _matchByPromiseGroupedArrayValue, Promise<string | number>>>

declare const nestedPromise: Promise<
  | { readonly meta: { readonly kind: 'ready'; readonly id: string } }
  | { readonly meta: { readonly kind: 'failed'; readonly reason: string } }
>
const _matchByPromiseNestedPathValue = matchBy.promise(nestedPromise, 'meta.kind').cases({
  ready: (value) => value.meta.id,
  failed: (value) => value.meta.reason,
})
type _matchByPromiseNestedPath = Expect<Equal<typeof _matchByPromiseNestedPathValue, Promise<string>>>

declare const ROUTE_KIND: unique symbol
declare const routePromise: Promise<
  | { readonly meta: { readonly [ROUTE_KIND]: 'internal'; readonly service: string } }
  | { readonly meta: { readonly [ROUTE_KIND]: 'external'; readonly host: string } }
>
const _matchByPromiseTuplePathValue = matchBy.promise(routePromise, ['meta', ROUTE_KIND]).cases({
  internal: (value) => value.meta.service,
  external: (value) => value.meta.host,
})
type _matchByPromiseTuplePath = Expect<Equal<typeof _matchByPromiseTuplePathValue, Promise<string>>>

const _namedHelperInference = match(candidateRecord)
  .with(
    {
      id: pString,
      enabled: pBoolean,
      retries: pInteger,
      tags: pNonEmptyArray(pString),
      score: pOptional(pFinite),
      meta: pRecord(pString, pNumber),
    },
    (value) => {
      const id: string = value.id
      const enabled: boolean = value.enabled
      const retries: number = value.retries
      const firstTag: string = value.tags[0]
      const score: number | undefined = value.score
      const metaValue: number | undefined = value.meta.rank
      return `${id}:${String(enabled)}:${String(retries)}:${firstTag}:${String(score)}:${String(metaValue)}`
    },
  )
  .otherwise(() => 'invalid')
const _namedHelperAssignable: string = _namedHelperInference

const _tupleHelperInference = match(unknownInput)
  .with(pTuple([pString, pRest(pNumber)]), (value) => {
    const command: string = value[0]
    const firstAmount: number | undefined = value[1]
    return command.length + (firstAmount ?? 0)
  })
  .otherwise(() => 0)
type _tupleHelperResult = Expect<Equal<typeof _tupleHelperInference, number>>

const _advancedHelperInference = match(unknownInput)
  .with(pExact({ error: pInstanceOf(DomainError) }), (value) => {
    const code: string = value.error.code
    return code
  })
  .with(pUnion(pNull, pUndefined), () => 'empty')
  .otherwise(() => 'unknown')
type _advancedHelperResult = Expect<Equal<typeof _advancedHelperInference, string>>

const _whenHelperInference = match(unknownInput)
  .with(
    pWhen((value: unknown): value is string => typeof value === 'string'),
    (value) => String(value),
  )
  .otherwise(() => 'not-order')
type _whenHelper = Expect<Equal<typeof _whenHelperInference, string>>

declare const publishStatus: 'draft' | 'published'
const _excludeHelperInference = match(publishStatus)
  .with(pExclude('draft'), (value) => {
    const published: 'published' = value
    return published
  })
  .with('draft', () => 'draft')
  .exhaustive()
type _excludeHelper = Expect<Equal<typeof _excludeHelperInference, 'draft' | 'published'>>

const _recordHelperGuard = isMatching(pNonEmptyRecord(pString, pBoolean))
if (_recordHelperGuard(unknownInput)) {
  const flags: Record<string, boolean> = unknownInput
  void flags
}

const _primitiveHelperResults = [
  isMatching(pWildcard, unknownInput),
  isMatching(pAny, unknownInput),
  isMatching(pArray(pNumber), [1, 2]),
  isMatching(pBigint, 1n),
  isMatching(pSymbol, Symbol('s')),
  isMatching(pNan, Number.NaN),
]

const selectedPayload: unknown = { id: 'user-1' }
assertMatching({ id: pSelect('id', pString) }, selectedPayload)

const _groupEntry = group('card', 'coupon', (value: Extract<Payment, { kind: 'card' | 'coupon' }>) => value.kind)
const _groupedResult = matchBy(payment, 'kind').cases([
  _groupEntry,
  group('cash', (value: Extract<Payment, { kind: 'cash' }>) => value.receivedCents),
])
type _groupedResult = Expect<Equal<typeof _groupedResult, 'card' | 'coupon' | number>>

const _safeOtherwiseResult = match.promise(paymentPromise).safeOtherwise(() => 1)
const _safeOtherwiseAssignable: Promise<MatchPromiseResult<number>> = _safeOtherwiseResult

declare const safeNumberResult: MatchPromiseResult<number>
if (safeNumberResult.ok === false) {
  const error: unknown = safeNumberResult.error
  void error
  // @ts-expect-error failed safe results do not expose value
  void safeNumberResult.value
} else {
  const value: number = safeNumberResult.value
  void value
  // @ts-expect-error successful safe results do not expose error
  void safeNumberResult.error
}

declare const matchBySafeResult: Awaited<ReturnType<typeof _promiseMatchByBuilder.safeOtherwise>>
if (!matchBySafeResult.ok) {
  const error: unknown = matchBySafeResult.error
  void error
}

const _previewText: string = preview({ ok: true })
const _metadata = { matcher: 'matchBy', path: 'kind', tag: 'card' } satisfies ConstructorParameters<
  typeof NonExhaustiveMatchError
>[1]
const _nonExhaustive = new NonExhaustiveMatchError(payment, _metadata)
const _patternMismatch = new PatternMismatchError(pString, 1)
void _nonExhaustive
void _patternMismatch
void _primitiveHelperResults
void _matchFunction
void _syncBuilder
void _promiseBuilder
void _syncMatchByBuilder
void _matchByBuilder
