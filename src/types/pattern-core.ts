import type { PATTERN_TOKEN } from '../patterns/token.js'

declare global {
  namespace TsMatchTypes {
    /**
     * Primitive literal values that can be matched directly or through primitive helpers.
     *
     * @see https://github.com/DiegoGBrisa/ts-match#literal-patterns
     */
    export type Primitive = string | number | boolean | bigint | symbol | null | undefined
    /**
     * Values supported as `matchBy` discriminant tags.
     *
     * Tags can be object keys, booleans, `null`, or `undefined`; object case maps are
     * limited to property-key-compatible representations while grouped entries can
     * represent every discriminant value.
     *
     * @see https://github.com/DiegoGBrisa/ts-match#matchby
     */
    export type Discriminant = PropertyKey | boolean | null | undefined
    /**
     * Path accepted by `matchBy` for reading a discriminant tag.
     *
     * Use a direct key, dot-separated string path, or readonly tuple path.
     *
     * @see https://github.com/DiegoGBrisa/ts-match#nested-dot-path-and-tuple-path
     */
    export type PropertyPath = string | readonly PropertyKey[]

    /**
     * Internal kind names for built-in `P.*` pattern helper objects.
     *
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export type PatternKind =
      | 'wildcard'
      | 'primitive'
      | 'nan'
      | 'finite'
      | 'integer'
      | 'regex'
      | 'date'
      | 'error'
      | 'regexp'
      | 'nullish'
      | 'falsy'
      | 'truthy'
      | 'temporal'
      | 'literal'
      | 'union'
      | 'exclude'
      | 'optional'
      | 'array'
      | 'non-empty-array'
      | 'tuple'
      | 'rest'
      | 'exact'
      | 'when'
      | 'instance-of'
      | 'select'
      | 'collect'
      | 'record'
      | 'non-empty-record'
      | 'map'
      | 'set'

    /**
     * Shared internal token field carried by every built-in pattern helper object.
     *
     * @typeParam TKind - Concrete pattern-helper kind.
     * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#pattern-helpers
     */
    export interface PatternBase<TKind extends PatternKind> {
      readonly [PATTERN_TOKEN]: TKind
    }

    /**
     * Type of `P._` and `P.any`, which match every value.
     *
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export type WildcardPattern = PatternBase<'wildcard'>

    /**
     * Type of primitive helpers such as `P.string`, `P.number`, and `P.undefined`.
     *
     * @typeParam TPrimitive - Primitive value type matched by the helper.
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export interface PrimitivePattern<TPrimitive extends Primitive> extends PatternBase<'primitive'> {
      readonly primitive: PrimitiveName<TPrimitive>
    }

    /** Type of `P.nan`, which matches `NaN`. */
    export type NanPattern = PatternBase<'nan'>
    /** Type of `P.finite`, which matches finite numbers. */
    export type FinitePattern = PatternBase<'finite'>
    /** Type of `P.integer`, which matches integer numbers. */
    export type IntegerPattern = PatternBase<'integer'>

    /** Type of `P.regex(regex)`, which matches strings accepted by a regular expression. */
    export interface RegexPattern extends PatternBase<'regex'> {
      readonly regex: RegExp
    }

    /** Type of `P.date`, which matches valid Date instances. */
    export type DatePattern = PatternBase<'date'>
    /** Type of `P.error`, which matches Error instances and subclasses. */
    export type ErrorPattern = PatternBase<'error'>
    /** Type of `P.regexp`, which matches RegExp instances. */
    export type RegexpPattern = PatternBase<'regexp'>
    /** Type of `P.nullish`, which matches null or undefined. */
    export type NullishPattern = PatternBase<'nullish'>
    /** Type of `P.falsy`, which matches values using JavaScript falsiness. */
    export type FalsyPattern = PatternBase<'falsy'>
    /** Type of `P.truthy`, which matches values using JavaScript truthiness. */
    export type TruthyPattern = PatternBase<'truthy'>

    export type TemporalPatternKind =
      | 'any'
      | 'Instant'
      | 'PlainDate'
      | 'PlainTime'
      | 'PlainDateTime'
      | 'ZonedDateTime'
      | 'Duration'
      | 'PlainYearMonth'
      | 'PlainMonthDay'

    /**
     * Type of Temporal helpers. Public types intentionally avoid depending on
     * TypeScript's `ESNext.Temporal` global declarations.
     */
    export interface TemporalPattern<TTemporalKind extends TemporalPatternKind> extends PatternBase<'temporal'> {
      readonly temporal: TTemporalKind
    }

    /**
     * Type of `P.literal(value)`, which matches primitives by value and
     * object/function/array values by reference identity.
     *
     * @typeParam TLiteral - Literal or reference value that must match with `Object.is`.
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export interface LiteralPattern<TLiteral> extends PatternBase<'literal'> {
      readonly literal: TLiteral
    }

    export interface TemporalInstantValue {
      readonly [Symbol.toStringTag]: 'Temporal.Instant'
    }
    export interface TemporalPlainDateValue {
      readonly [Symbol.toStringTag]: 'Temporal.PlainDate'
    }
    export interface TemporalPlainTimeValue {
      readonly [Symbol.toStringTag]: 'Temporal.PlainTime'
    }
    export interface TemporalPlainDateTimeValue {
      readonly [Symbol.toStringTag]: 'Temporal.PlainDateTime'
    }
    export interface TemporalZonedDateTimeValue {
      readonly [Symbol.toStringTag]: 'Temporal.ZonedDateTime'
    }
    export interface TemporalDurationValue {
      readonly [Symbol.toStringTag]: 'Temporal.Duration'
    }
    export interface TemporalPlainYearMonthValue {
      readonly [Symbol.toStringTag]: 'Temporal.PlainYearMonth'
    }
    export interface TemporalPlainMonthDayValue {
      readonly [Symbol.toStringTag]: 'Temporal.PlainMonthDay'
    }

    export type TemporalValue =
      | TemporalInstantValue
      | TemporalPlainDateValue
      | TemporalPlainTimeValue
      | TemporalPlainDateTimeValue
      | TemporalZonedDateTimeValue
      | TemporalDurationValue
      | TemporalPlainYearMonthValue
      | TemporalPlainMonthDayValue

    /**
     * Type of `P.union(...)`, which matches any one of several patterns.
     *
     * @typeParam TPatterns - Ordered alternative patterns.
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export interface UnionPattern<TPatterns extends readonly unknown[]> extends PatternBase<'union'> {
      readonly patterns: TPatterns
    }

    /**
     * Type of `P.exclude(...)`, which matches values rejected by the nested pattern.
     *
     * @typeParam TPattern - Pattern to reject.
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export interface ExcludePattern<TPattern> extends PatternBase<'exclude'> {
      readonly pattern: TPattern
    }

    /**
     * Type of `P.optional(...)`, which accepts undefined or absent object properties.
     *
     * @typeParam TPattern - Pattern required when the value is present.
     * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
     */
    export interface OptionalPattern<TPattern> extends PatternBase<'optional'> {
      readonly pattern: TPattern
    }

    /**
     * Type of `P.array(...)`, which matches arrays where every item matches.
     *
     * @typeParam TPattern - Item pattern.
     * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
     */
    export interface ArrayPattern<TPattern> extends PatternBase<'array'> {
      readonly item: TPattern
    }

    /**
     * Type of `P.nonEmptyArray(...)`, which matches arrays with at least one item.
     *
     * @typeParam TPattern - Item pattern.
     * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
     */
  }
}

export {}
