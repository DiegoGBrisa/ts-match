import { match } from '../../src/match/index.js'
import type { MatchFunction, MatchedValue, PromiseMatchBuilder, SyncMatchBuilder } from '../../src/match/index.js'
import { matchBy } from '../../src/match-by/index.js'
import type {
  MatchByBuilder,
  MatchByFunction,
  MatchByPath,
  PromiseMatchByBuilder,
  SyncMatchByBuilder,
} from '../../src/match-by/index.js'
import { P, pNumber, pString } from '../../src/patterns/index.js'
import type { InferPattern } from '../../src/types/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

type Payment =
  | { readonly kind: 'card'; readonly last4: string; readonly amountCents: number }
  | { readonly kind: 'cash'; readonly receivedCents: number }
  | { readonly kind: 'coupon'; readonly code: string }

declare const payment: Payment

declare const paymentPromise: Promise<Payment>

const matchFunction: MatchFunction = match
const matchByFunction: MatchByFunction = matchBy
const _syncBuilder: SyncMatchBuilder<Payment, Payment, never> = match(payment)
const _promiseBuilder: PromiseMatchBuilder<Promise<Payment>, Payment, never> = match.promise(paymentPromise)
const _syncMatchByBuilder: SyncMatchByBuilder<Payment, 'kind', Payment, never> = matchBy(payment, 'kind')
const _promiseMatchByBuilder: PromiseMatchByBuilder<Promise<Payment>, 'kind', Payment, never> = matchBy.promise(
  paymentPromise,
  'kind',
)
const _matchByBuilder: MatchByBuilder<Payment, 'kind', Payment, never, false> = matchBy(payment, 'kind')
void matchFunction
void matchByFunction

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
