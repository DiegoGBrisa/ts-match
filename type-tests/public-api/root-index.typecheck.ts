import { match, P } from '../../src/index.js'
import type { TemporalInstantValue } from '../../src/index.js'

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

declare const convenienceValue:
  | 'text'
  | 0
  | 1
  | 0n
  | 1n
  | ''
  | false
  | true
  | null
  | undefined
  | Date
  | Error
  | RegExp
  | TemporalInstantValue

const _convenienceResult = match(convenienceValue)
  .with(P.nullish, (value) => {
    const nullish: null | undefined = value
    return nullish
  })
  .with(P.falsy, (value) => {
    const falsy: 0 | 0n | '' | false = value
    return falsy
  })
  .with(P.truthy, (value) => {
    const truthy: string | 1 | 1n | true | Date | Error | RegExp | TemporalInstantValue = value
    return truthy
  })
  .exhaustive()
type _convenience = Expect<
  Equal<
    typeof _convenienceResult,
    string | 0 | 1 | 0n | 1n | false | true | null | undefined | Date | Error | RegExp | TemporalInstantValue
  >
>

declare const unknownTruthyValue: unknown
const _truthyUnknown = match(unknownTruthyValue).with(P.truthy, () => 'truthy')
// @ts-expect-error P.truthy cannot prove exhaustiveness for unknown because falsy values remain possible
_truthyUnknown.exhaustive()

declare const maybeInvalidDate: Date
const _validDateOnly = match(maybeInvalidDate).with(P.date, () => 'valid-date')
// @ts-expect-error P.date rejects Invalid Date at runtime; use P.instanceOf(Date) or a fallback for any Date
_validDateOnly.exhaustive()

type RegexObjectValue =
  | { readonly kind: 'user'; readonly id: string }
  | { readonly kind: 'other'; readonly other: string }
declare const regexObjectValue: RegexObjectValue

const _regexObjectCoverage = match(regexObjectValue)
  .with({ kind: 'user', id: P.regex(/^user-/) }, () => 'user')
  .with({ kind: 'other', other: P.string }, () => 'other')
// @ts-expect-error P.regex narrows strings but does not cover every possible string
_regexObjectCoverage.exhaustive()

type DateObjectValue =
  | { readonly kind: 'dated'; readonly createdAt: Date }
  | { readonly kind: 'other'; readonly other: string }
declare const dateObjectValue: DateObjectValue

const _dateObjectCoverage = match(dateObjectValue)
  .with({ kind: 'dated', createdAt: P.date }, () => 'dated')
  .with({ kind: 'other', other: P.string }, () => 'other')
// @ts-expect-error P.date narrows to valid Date but cannot cover every Date instance
_dateObjectCoverage.exhaustive()

declare const dateOrErrorValue: Date | Error
const _dateUnionCoverage = match(dateOrErrorValue).with(P.union(P.date, P.error), () => 'handled')
// @ts-expect-error P.union cannot make P.date exhaustive for Date because Invalid Date remains possible
_dateUnionCoverage.exhaustive()

declare const optionalRegexValue: string | undefined
const _optionalRegexCoverage = match(optionalRegexValue).with(P.optional(P.regex(/^user-/)), () => 'maybe-user')
// @ts-expect-error P.optional cannot make P.regex exhaustive for every possible string
_optionalRegexCoverage.exhaustive()

const _excludeDateCoverage = match(dateOrErrorValue).with(P.exclude(P.date), () => 'not-valid-date')
// @ts-expect-error P.exclude(P.date) cannot cover valid Date instances
_excludeDateCoverage.exhaustive()

type ExactDateObjectValue = { readonly createdAt: Date }
declare const exactDateObjectValue: ExactDateObjectValue
const _exactDateObjectCoverage = match(exactDateObjectValue).with(P.exact({ createdAt: P.date }), () => 'dated')
// @ts-expect-error P.exact preserves P.date valid-date-only coverage
_exactDateObjectCoverage.exhaustive()

const _exactExcludeDateCoverage = match(dateOrErrorValue).with(P.exact(P.exclude(P.date)), () => 'not-valid-date')
// @ts-expect-error P.exact(P.exclude(P.date)) still cannot cover valid Date instances
_exactExcludeDateCoverage.exhaustive()

type OptionalNullishValue =
  | { readonly kind: 'nullable'; readonly value?: null }
  | { readonly kind: 'other'; readonly other: string }
declare const optionalNullishValue: OptionalNullishValue

const _requiredNullishProperty = match(optionalNullishValue)
  .with({ kind: 'nullable', value: P.nullish }, () => 'nullish')
  .with({ kind: 'other', other: P.string }, () => 'other')
// @ts-expect-error P.nullish does not cover absent object properties; use P.optional(P.nullish)
_requiredNullishProperty.exhaustive()

const _optionalNullishProperty = match(optionalNullishValue)
  .with({ kind: 'nullable', value: P.optional(P.nullish) }, () => 'nullish-or-absent')
  .with({ kind: 'other', other: P.string }, () => 'other')
  .exhaustive()
type _optionalNullishProperty = Expect<Equal<typeof _optionalNullishProperty, 'nullish-or-absent' | 'other'>>

type OptionalTruthyValue =
  | { readonly kind: 'present'; readonly value?: true }
  | { readonly kind: 'other'; readonly other: string }
declare const optionalTruthyValue: OptionalTruthyValue

const _requiredTruthyProperty = match(optionalTruthyValue)
  .with({ kind: 'present', value: P.truthy }, () => 'truthy')
  .with({ kind: 'other', other: P.string }, () => 'other')
// @ts-expect-error required object patterns do not cover absent optional properties
_requiredTruthyProperty.exhaustive()

const _optionalTruthyProperty = match(optionalTruthyValue)
  .with({ kind: 'present', value: P.optional(P.truthy) }, () => 'truthy-or-absent')
  .with({ kind: 'other', other: P.string }, () => 'other')
  .exhaustive()
type _optionalTruthyProperty = Expect<Equal<typeof _optionalTruthyProperty, 'truthy-or-absent' | 'other'>>

declare const builtInObjectValue: unknown
const _builtInObjectResult = match(builtInObjectValue)
  .with(P.regex(/^user-/), (value) => {
    const text: string = value
    return text
  })
  .with(P.date, (value) => {
    const date: Date = value
    return date
  })
  .with(P.error, (value) => {
    const error: Error = value
    return error
  })
  .with(P.regexp, (value) => {
    const regexp: RegExp = value
    return regexp
  })
  .with(P.temporalInstant, (value) => {
    const tag: 'Temporal.Instant' = value[Symbol.toStringTag]
    return tag
  })
  .otherwise(() => null)
type _builtInObject = Expect<
  Equal<typeof _builtInObjectResult, string | Date | Error | RegExp | 'Temporal.Instant' | null>
>

declare const unknownFalsyValue: unknown
const _unknownFalsyResult = match(unknownFalsyValue)
  .with(P.falsy, (value) => {
    const falsy: number | false | 0n | '' | null | undefined = value
    return falsy
  })
  .otherwise(() => 'other')
type _unknownFalsy = Expect<Equal<typeof _unknownFalsyResult, number | false | 0n | '' | null | undefined | 'other'>>
