import { assertMatching, isMatching } from '../../src/assertions/index.js'
import { NonExhaustiveMatchError, PatternMismatchError, preview } from '../../src/errors/index.js'
import { group } from '../../src/group/index.js'
import { match } from '../../src/match/index.js'
import type { MatchPromiseResult } from '../../src/match/index.js'
import { matchBy } from '../../src/match-by/index.js'
import type { PromiseMatchByBuilder } from '../../src/match-by/index.js'
import {
  P,
  pAny,
  pArray,
  pBigint,
  pCollect,
  pLiteral,
  pMap,
  pNan,
  pNumber,
  pSelect,
  pSet,
  pString,
  pSymbol,
  pTemporal,
  pTemporalDuration,
  pTemporalPlainDate,
  pTemporalPlainDateTime,
  pTemporalPlainMonthDay,
  pTemporalPlainTime,
  pTemporalPlainYearMonth,
  pTemporalZonedDateTime,
  pWildcard,
} from '../../src/patterns/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

type Payment =
  | { readonly kind: 'card'; readonly last4: string; readonly amountCents: number }
  | { readonly kind: 'cash'; readonly receivedCents: number }
  | { readonly kind: 'coupon'; readonly code: string }

declare const payment: Payment

declare const paymentPromise: Promise<Payment>

declare const unknownInput: unknown

declare const _promiseMatchByBuilder: PromiseMatchByBuilder<Promise<Payment>, 'kind', Payment, never>

const _collectionHelperInference = match(unknownInput)
  .with(pMap(pString, pNumber), (value) => {
    return value.get('count')
  })
  .with(pMap(['id', pString], ['count', pNumber]), (value) => {
    return value.entries().next().value
  })
  .with(pSet(pString), (value) => {
    return value.has('admin') ? value.size : 0
  })
  .with(pSet('admin', pNumber), (value) => {
    return value.has('admin') ? value.size : 0
  })
  .with(pLiteral('ready'), (value) => {
    return value
  })
  .with(P.array(pCollect('ids', pString)), (value) => {
    const ids: string[] = value.ids
    return ids
  })
  .otherwise(() => null)
type _collectionHelperResult = Expect<
  Equal<typeof _collectionHelperInference, number | [unknown, unknown] | 'ready' | string[] | null | undefined>
>

const _primitiveHelperResults = [
  isMatching(pWildcard, unknownInput),
  isMatching(pAny, unknownInput),
  isMatching(pArray(pNumber), [1, 2]),
  isMatching(pBigint, 1n),
  isMatching(pSymbol, Symbol('s')),
  isMatching(pNan, Number.NaN),
  isMatching(P.map(P.string, P.number), new Map([['count', 1]])),
  isMatching(pMap(pString, pNumber), new Map([['count', 1]])),
  isMatching(P.set(P.string), new Set(['admin'])),
  isMatching(pSet(pString), new Set(['admin'])),
  isMatching(P.literal('ready'), 'ready'),
  isMatching(pLiteral('ready'), 'ready'),
  isMatching(P.array(P.collect('ids', P.string)), ['a']),
  isMatching(P.array(pCollect('ids', pString)), ['a']),
  isMatching(P.temporal, unknownInput),
  isMatching(pTemporal, unknownInput),
  isMatching(pTemporalPlainDate, unknownInput),
  isMatching(pTemporalPlainTime, unknownInput),
  isMatching(pTemporalPlainDateTime, unknownInput),
  isMatching(pTemporalZonedDateTime, unknownInput),
  isMatching(pTemporalDuration, unknownInput),
  isMatching(pTemporalPlainYearMonth, unknownInput),
  isMatching(pTemporalPlainMonthDay, unknownInput),
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
