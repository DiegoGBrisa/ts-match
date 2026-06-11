import { PATTERN_TOKEN } from './token.js'
import { freezePattern } from './base.js'
import type {
  DatePattern,
  ErrorPattern,
  FalsyPattern,
  FinitePattern,
  IntegerPattern,
  LiteralPattern,
  NanPattern,
  NullishPattern,
  Primitive,
  PrimitiveName,
  PrimitivePattern,
  RegexPattern,
  RegexpPattern,
  TemporalPattern,
  TemporalPatternKind,
  TruthyPattern,
  WildcardPattern,
} from '../types/index.js'

function primitive<TPrimitive extends Primitive>(name: PrimitiveName<TPrimitive>): PrimitivePattern<TPrimitive> {
  return freezePattern({
    [PATTERN_TOKEN]: 'primitive',
    primitive: name,
  })
}

/**
 * Matches any value without narrowing it.
 *
 * Use this as a wildcard branch when a value should be accepted regardless of
 * runtime shape. Prefer more specific patterns for exhaustiveness when possible;
 * a wildcard branch intentionally covers all remaining cases.
 *
 * @example
 * ```ts
 * match(value).with(P._, () => 'fallback').exhaustive()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pWildcard: WildcardPattern = freezePattern({ [PATTERN_TOKEN]: 'wildcard' })

/**
 * Alias for {@link pWildcard}.
 *
 * Use `P.any` when that reads better than `P._` in user-facing code. It has the
 * same runtime behavior and type behavior as the wildcard helper.
 *
 * @example
 * ```ts
 * match(value).with(P.any, () => 'accepted').exhaustive()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pAny: WildcardPattern = pWildcard

/**
 * Matches values whose JavaScript type is `string`.
 *
 * Use this for structural patterns, selected payloads, assertions, and direct
 * `match` branches where any string should match.
 *
 * @example
 * ```ts
 * match(value).with(P.string, (text) => text.toUpperCase()).otherwise(() => '')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pString: PrimitivePattern<string> = primitive('string')

/**
 * Matches values whose JavaScript type is `number`.
 *
 * This accepts all numbers, including `NaN`, `Infinity`, and `-Infinity`. Use
 * `P.finite`, `P.integer`, or `P.nan` when those distinctions matter.
 *
 * @example
 * ```ts
 * match(value).with(P.number, (amount) => amount.toString()).otherwise(() => 'n/a')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pNumber: PrimitivePattern<number> = primitive('number')

/**
 * Matches values whose JavaScript type is `boolean`.
 *
 * Use this when either `true` or `false` is acceptable. Use literal `true` or
 * `false` patterns for branch-specific boolean handling.
 *
 * @example
 * ```ts
 * match(value).with(P.boolean, (flag) => String(flag)).otherwise(() => 'unknown')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pBoolean: PrimitivePattern<boolean> = primitive('boolean')

/**
 * Matches values whose JavaScript type is `bigint`.
 *
 * Use this for bigint payloads and runtime-boundary assertions that should
 * accept any bigint value.
 *
 * @example
 * ```ts
 * match(value).with(P.bigint, (id) => id.toString()).otherwise(() => '')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pBigint: PrimitivePattern<bigint> = primitive('bigint')

/**
 * Matches values whose JavaScript type is `symbol`.
 *
 * Use this for symbol payloads or record-key checks where any symbol is valid.
 *
 * @example
 * ```ts
 * match(value).with(P.symbol, (key) => key.description).otherwise(() => undefined)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pSymbol: PrimitivePattern<symbol> = primitive('symbol')

/**
 * Matches exactly `null`.
 *
 * Use this in unions such as `P.union(P.null, P.string)` when null is a valid
 * case that should be handled explicitly.
 *
 * @example
 * ```ts
 * match(value).with(P.null, () => 'empty').otherwise(() => 'present')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pNull: PrimitivePattern<null> = primitive('null')

/**
 * Matches exactly `undefined`.
 *
 * Use this for direct values that may be undefined. For optional object
 * properties, prefer `P.optional(pattern)` so missing keys also match.
 *
 * @example
 * ```ts
 * match(value).with(P.undefined, () => 'missing').otherwise(() => 'present')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pUndefined: PrimitivePattern<undefined> = primitive('undefined')

/**
 * Matches `NaN` using `Number.isNaN`.
 *
 * `NaN` cannot be matched with ordinary literal equality. Use this helper when
 * a branch should specifically handle invalid numeric computations.
 *
 * @example
 * ```ts
 * match(value).with(P.nan, () => 'not a number').otherwise(() => 'number-like')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pNan: NanPattern = freezePattern({ [PATTERN_TOKEN]: 'nan' })

/**
 * Matches finite numbers using `Number.isFinite`.
 *
 * Use this when `Infinity`, `-Infinity`, and `NaN` should be rejected while
 * ordinary finite numbers should match.
 *
 * @example
 * ```ts
 * match(value).with(P.finite, (amount) => amount.toFixed(2)).otherwise(() => 'n/a')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pFinite: FinitePattern = freezePattern({ [PATTERN_TOKEN]: 'finite' })

/**
 * Matches integer numbers using `Number.isInteger`.
 *
 * Use this for numeric identifiers, counts, and array-like indexes that must be
 * whole numbers at runtime.
 *
 * @example
 * ```ts
 * match(value).with(P.integer, (index) => index + 1).otherwise(() => 0)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const pInteger: IntegerPattern = freezePattern({ [PATTERN_TOKEN]: 'integer' })

/**
 * Matches strings accepted by a regular expression.
 *
 * The helper is string-only and does not coerce non-string values. Runtime
 * matching starts from `lastIndex = 0` and restores the caller's original
 * `lastIndex` so reused stateful regexes behave deterministically.
 *
 * @param regex - Regular expression used to match string values.
 * @returns A frozen regular-expression string pattern helper.
 * @throws {TypeError} When `regex` is not a `RegExp` instance.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pRegex(regex: RegExp): RegexPattern {
  if (!(regex instanceof RegExp)) throw new TypeError('P.regex(...) requires a RegExp instance.')
  return freezePattern({ [PATTERN_TOKEN]: 'regex', regex })
}

/** Matches valid `Date` instances. */
export const pDate: DatePattern = freezePattern({ [PATTERN_TOKEN]: 'date' })

/** Matches `Error` instances, including subclasses. */
export const pError: ErrorPattern = freezePattern({ [PATTERN_TOKEN]: 'error' })

/** Matches `RegExp` instances. */
export const pRegexp: RegexpPattern = freezePattern({ [PATTERN_TOKEN]: 'regexp' })

/** Matches exactly `null | undefined`. */
export const pNullish: NullishPattern = freezePattern({ [PATTERN_TOKEN]: 'nullish' })

/** Matches values where JavaScript truthiness is false. */
export const pFalsy: FalsyPattern = freezePattern({ [PATTERN_TOKEN]: 'falsy' })

/** Matches values where JavaScript truthiness is true. */
export const pTruthy: TruthyPattern = freezePattern({ [PATTERN_TOKEN]: 'truthy' })

function temporal<TTemporalKind extends TemporalPatternKind>(
  temporalKind: TTemporalKind,
): TemporalPattern<TTemporalKind> {
  return freezePattern({ [PATTERN_TOKEN]: 'temporal', temporal: temporalKind })
}

/** Matches any recognized Temporal value object when Temporal is available. */
export const pTemporal: TemporalPattern<'any'> = temporal('any')
/** Matches `Temporal.Instant` instances when Temporal is available. */
export const pTemporalInstant: TemporalPattern<'Instant'> = temporal('Instant')
/** Matches `Temporal.PlainDate` instances when Temporal is available. */
export const pTemporalPlainDate: TemporalPattern<'PlainDate'> = temporal('PlainDate')
/** Matches `Temporal.PlainTime` instances when Temporal is available. */
export const pTemporalPlainTime: TemporalPattern<'PlainTime'> = temporal('PlainTime')
/** Matches `Temporal.PlainDateTime` instances when Temporal is available. */
export const pTemporalPlainDateTime: TemporalPattern<'PlainDateTime'> = temporal('PlainDateTime')
/** Matches `Temporal.ZonedDateTime` instances when Temporal is available. */
export const pTemporalZonedDateTime: TemporalPattern<'ZonedDateTime'> = temporal('ZonedDateTime')
/** Matches `Temporal.Duration` instances when Temporal is available. */
export const pTemporalDuration: TemporalPattern<'Duration'> = temporal('Duration')
/** Matches `Temporal.PlainYearMonth` instances when Temporal is available. */
export const pTemporalPlainYearMonth: TemporalPattern<'PlainYearMonth'> = temporal('PlainYearMonth')
/** Matches `Temporal.PlainMonthDay` instances when Temporal is available. */
export const pTemporalPlainMonthDay: TemporalPattern<'PlainMonthDay'> = temporal('PlainMonthDay')

/**
 * Matches one exact value with `Object.is`.
 *
 * Primitive values behave like an explicit literal pattern. Object, function,
 * and array values match by reference identity instead of structural shape.
 *
 * @param literal - Value or reference that must match exactly.
 * @returns A frozen exact literal pattern helper.
 * @example
 * ```ts
 * const key = { id: 1 }
 * match(value).with(P.literal(key), () => 'same reference').otherwise(() => 'other')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pLiteral<const TLiteral>(literal: TLiteral): LiteralPattern<TLiteral> {
  return freezePattern({ [PATTERN_TOKEN]: 'literal', literal })
}
