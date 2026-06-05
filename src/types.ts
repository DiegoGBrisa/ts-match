import type { GROUP_TOKEN, PATTERN_TOKEN } from './tokens.js'

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
interface PatternBase<TKind extends PatternKind> {
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
export interface NonEmptyArrayPattern<TPattern> extends PatternBase<'non-empty-array'> {
  readonly item: TPattern
}

/**
 * Type of `P.tuple(...)`, which matches positional array patterns.
 *
 * @typeParam TPatterns - Ordered tuple item patterns.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
export interface TuplePattern<TPatterns extends readonly unknown[]> extends PatternBase<'tuple'> {
  readonly items: TPatterns
}

/**
 * Type of `P.rest(...)`, valid as the final item of a tuple pattern.
 *
 * @typeParam TPattern - Pattern required for each remaining tuple item.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
export interface RestPattern<TPattern> extends PatternBase<'rest'> {
  readonly item: TPattern
}

/**
 * Type of `P.exact(...)`, which rejects additional enumerable object keys and
 * extra required Map/Set entries or values.
 *
 * @typeParam TPattern - Nested pattern to match exactly.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
export interface ExactPattern<TPattern> extends PatternBase<'exact'> {
  readonly pattern: TPattern
}

/**
 * Type of `P.when(...)`, which delegates matching to a predicate or type guard.
 *
 * @typeParam TGuarded - Type produced by a type guard or accepted by a predicate.
 * @typeParam TNarrows - Whether the predicate is a TypeScript type guard.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export interface GuardPattern<TGuarded, TNarrows extends boolean> extends PatternBase<'when'> {
  readonly predicate: (value: unknown) => boolean
  readonly narrows: TNarrows
  readonly guarded?: TGuarded
}

/**
 * Type of `P.instanceOf(...)`, which matches values with `instanceof`.
 *
 * @typeParam TConstructor - Constructor used for the runtime check.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export interface InstanceOfPattern<TConstructor extends AbstractConstructor> extends PatternBase<'instance-of'> {
  readonly constructor: TConstructor
}

/**
 * Type of anonymous `P.select()`, which passes one capture directly to the handler.
 *
 * @typeParam TPattern - Nested pattern that must match before capture.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
export interface AnonymousSelectPattern<TPattern> extends PatternBase<'select'> {
  readonly name: undefined
  readonly pattern: TPattern
}

/**
 * Type of named `P.select(name, pattern?)`, which adds a property to the handler payload.
 *
 * @typeParam TName - Capture key.
 * @typeParam TPattern - Nested pattern that must match before capture.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
export interface NamedSelectPattern<TName extends PropertyKey, TPattern> extends PatternBase<'select'> {
  readonly name: TName
  readonly pattern: TPattern
}

/**
 * Conditional selection pattern type for named and anonymous captures.
 *
 * @typeParam TName - Capture key, or `undefined` for an anonymous capture.
 * @typeParam TPattern - Nested pattern that must match before capture.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
export type SelectPattern<TName extends PropertyKey | undefined, TPattern> = TName extends PropertyKey
  ? NamedSelectPattern<TName, TPattern>
  : AnonymousSelectPattern<TPattern>

/**
 * Type of `P.record(...)`, which matches plain records by key and value patterns.
 *
 * @typeParam TKeyPattern - Pattern required for every enumerable key.
 * @typeParam TValuePattern - Pattern required for every enumerable value.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export interface RecordPattern<TKeyPattern, TValuePattern> extends PatternBase<'record'> {
  readonly key: TKeyPattern
  readonly value: TValuePattern
}

/**
 * Type of `P.nonEmptyRecord(...)`, which rejects empty records.
 *
 * @typeParam TKeyPattern - Pattern required for every enumerable key.
 * @typeParam TValuePattern - Pattern required for every enumerable value.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export interface NonEmptyRecordPattern<TKeyPattern, TValuePattern> extends PatternBase<'non-empty-record'> {
  readonly key: TKeyPattern
  readonly value: TValuePattern
}

/** Tuple entry clause accepted by required-entry `P.map(...)` mode. */
export type MapEntryPattern<TKeyPattern = unknown, TValuePattern = unknown> = readonly [TKeyPattern, TValuePattern]

/**
 * Type of `P.map(...)`, which matches actual `Map` instances.
 *
 * Homogeneous mode stores `key` and `value` patterns. Required-entry mode stores
 * entry clauses in `entries` and intentionally infers only a broad Map shape for
 * unknown inputs because TypeScript cannot represent required Map contents.
 *
 * @typeParam TKeyPattern - Homogeneous key pattern.
 * @typeParam TValuePattern - Homogeneous value pattern.
 * @typeParam TEntries - Required-entry clauses, or `undefined` for homogeneous mode.
 */
export interface HomogeneousMapPattern<TKeyPattern = unknown, TValuePattern = unknown> extends PatternBase<'map'> {
  readonly mode: 'homogeneous'
  readonly key: TKeyPattern
  readonly value: TValuePattern
  readonly entries: undefined
}

export interface EntryMapPattern<TEntries = readonly MapEntryPattern[]> extends PatternBase<'map'> {
  readonly mode: 'entries'
  readonly key: undefined
  readonly value: undefined
  readonly entries: TEntries
}

export type MapPattern<
  TKeyPattern = unknown,
  TValuePattern = unknown,
  TEntries extends readonly MapEntryPattern[] | undefined = undefined,
> = [TEntries] extends [readonly MapEntryPattern[]]
  ? EntryMapPattern<TEntries>
  : HomogeneousMapPattern<TKeyPattern, TValuePattern>

/**
 * Type of `P.set(...)`, which matches actual `Set` instances.
 *
 * Homogeneous mode uses one stored value pattern. Required-value mode uses two or
 * more value clauses and is partial at runtime unless wrapped in `P.exact(...)`.
 *
 * @typeParam TPatterns - Value pattern list.
 * @typeParam TMode - Homogeneous or required-value mode.
 */
export interface SetPattern<
  TPatterns extends readonly unknown[] = readonly unknown[],
  TMode extends 'homogeneous' | 'values' = TPatterns extends readonly [unknown] ? 'homogeneous' : 'values',
> extends PatternBase<'set'> {
  readonly mode: TMode
  readonly values: TPatterns
}

/**
 * Union of every built-in `P.*` helper object type.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export type BuiltInPattern =
  | WildcardPattern
  | PrimitivePattern<Primitive>
  | NanPattern
  | FinitePattern
  | IntegerPattern
  | RegexPattern
  | DatePattern
  | ErrorPattern
  | RegexpPattern
  | NullishPattern
  | FalsyPattern
  | TruthyPattern
  | TemporalPattern<TemporalPatternKind>
  | LiteralPattern<unknown>
  | UnionPattern<readonly unknown[]>
  | ExcludePattern<unknown>
  | OptionalPattern<unknown>
  | ArrayPattern<unknown>
  | NonEmptyArrayPattern<unknown>
  | TuplePattern<readonly unknown[]>
  | RestPattern<unknown>
  | ExactPattern<unknown>
  | GuardPattern<unknown, boolean>
  | InstanceOfPattern<AbstractConstructor>
  | SelectPattern<PropertyKey | undefined, unknown>
  | RecordPattern<unknown, unknown>
  | NonEmptyRecordPattern<unknown, unknown>
  | HomogeneousMapPattern<unknown, unknown>
  | EntryMapPattern<readonly MapEntryPattern[]>
  | SetPattern<readonly unknown[], 'homogeneous' | 'values'>

type PatternKey<TValue> = TValue extends unknown ? keyof TValue : never

type PatternValueAtKey<TValue, TKey extends PropertyKey> = TValue extends unknown
  ? TKey extends keyof TValue
    ? TValue[TKey]
    : never
  : never

type ObjectPatternSuggestion<TValue> = {
  readonly [K in PatternKey<TValue>]?: MatchPatternSuggestion<PatternValueAtKey<TValue, K>>
}

type ArrayPatternSuggestion<TValue> = TValue extends readonly (infer TItem)[]
  ? readonly MatchPatternSuggestion<TItem>[]
  : never

/**
 * Autocomplete-friendly structural pattern shape accepted by `match(...).with(...)`.
 *
 * This excludes `P.*` helper object internals so object-literal completions show
 * user value keys instead of helper implementation fields. The public matcher
 * overloads still accept helpers through the normal validation fallback.
 *
 * @typeParam TValue - Value type currently remaining in a match chain.
 * @see https://github.com/DiegoGBrisa/ts-match#withpattern-handler
 */
export type MatchPatternSuggestion<TValue> =
  IsUnsafe<TValue> extends true
    ? never
    :
        | Extract<TValue, Primitive>
        | ArrayPatternSuggestion<TValue>
        | (TValue extends object ? ObjectPatternSuggestion<TValue> : never)

/**
 * Constructor shape accepted by `P.instanceOf(...)`.
 *
 * @typeParam T - Instance type produced by the constructor.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export type AbstractConstructor<T = object> = abstract new (...args: never[]) => T

/**
 * Runtime primitive helper name associated with a primitive TypeScript type.
 *
 * @typeParam TPrimitive - Primitive type to name.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export type PrimitiveName<TPrimitive extends Primitive> = TPrimitive extends string
  ? 'string'
  : TPrimitive extends number
    ? 'number'
    : TPrimitive extends boolean
      ? 'boolean'
      : TPrimitive extends bigint
        ? 'bigint'
        : TPrimitive extends symbol
          ? 'symbol'
          : TPrimitive extends null
            ? 'null'
            : 'undefined'

/**
 * Object entry created by `group(...)` for grouped `matchBy(...).cases(...)` handling.
 *
 * @typeParam TTags - Tags covered by the grouped handler.
 * @typeParam THandler - Handler invoked when one of the grouped tags matches.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
export interface GroupEntry<TTags extends readonly Discriminant[], THandler> {
  readonly [GROUP_TOKEN]: true
  readonly tags: TTags
  readonly handler: THandler
}

/** Tuple entry form `[tag, handler]` accepted by `matchBy(...).cases(...)`. */
export type CaseEntry<TTag extends Discriminant, THandler> = readonly [TTag, THandler]
/** Tuple entry form `[[tags], handler]` accepted by `matchBy(...).cases(...)`. */
export type GroupedCaseEntry<TTags extends readonly Discriminant[], THandler> = readonly [TTags, THandler]
/** Any grouped-case entry shape accepted by `matchBy(...).cases(...)`. */
export type CasesEntry<THandler> =
  | CaseEntry<Discriminant, THandler>
  | GroupedCaseEntry<readonly Discriminant[], THandler>
  | GroupEntry<readonly Discriminant[], THandler>

type IsAny<T> = 0 extends 1 & T ? true : false
type IsUnknown<T> =
  IsAny<T> extends true ? false : unknown extends T ? ([keyof T] extends [never] ? true : false) : false
type IsUnsafe<T> = IsAny<T> extends true ? true : IsUnknown<T>

type Simplify<T> = T extends Primitive ? T : T extends object ? { [K in keyof T]: T[K] } : T

type NumericLiteral<TValue> =
  Extract<TValue, number> extends infer TNumber
    ? TNumber extends number
      ? number extends TNumber
        ? never
        : TNumber
      : never
    : never

type IntegerLiteral<TValue> =
  NumericLiteral<TValue> extends infer TNumber
    ? TNumber extends number
      ? `${TNumber}` extends `${bigint}`
        ? TNumber
        : never
      : never
    : never

type MatchedNan<TValue> = number extends Extract<TValue, number> ? number : never
type MatchedFinite<TValue> = Extract<TValue, number>
type MatchedInteger<TValue> = number extends Extract<TValue, number> ? number : IntegerLiteral<TValue>
type StaticFalsy = false | 0 | 0n | '' | null | undefined
type InferFalsy = StaticFalsy | number
type MatchedFalsy<TValue> =
  | Extract<TValue, StaticFalsy>
  | (string extends Extract<TValue, string> ? string : never)
  | (number extends Extract<TValue, number> ? number : never)
  | (bigint extends Extract<TValue, bigint> ? bigint : never)
type MatchedTruthy<TValue> = SafeExclude<TValue, StaticFalsy>
type CoveredNan<_TValue> = never
type CoveredFinite<TValue> = number extends Extract<TValue, number> ? never : NumericLiteral<TValue>
type CoveredInteger<TValue> = number extends Extract<TValue, number> ? never : IntegerLiteral<TValue>
type CoveredFalsy<TValue> = Extract<TValue, StaticFalsy>
type CoveredTruthy<TValue> = TValue extends unknown
  ? IsUnsafe<TValue> extends true
    ? never
    : TValue extends Primitive
      ? IsBroad<TValue> extends true
        ? never
        : TValue extends StaticFalsy
          ? never
          : TValue
      : Extract<TValue, Primitive> extends never
        ? TValue
        : never
  : never

type UnionToIntersection<T> = [T] extends [never]
  ? never
  : (T extends unknown ? (value: T) => void : never) extends (value: infer TIntersection) => void
    ? TIntersection
    : never

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type IsUnion<T, TAll = T> = [T] extends [never]
  ? false
  : T extends unknown
    ? [TAll] extends [T]
      ? false
      : true
    : false

type IsBroad<T> = string extends T
  ? true
  : number extends T
    ? true
    : boolean extends T
      ? true
      : bigint extends T
        ? true
        : symbol extends T
          ? true
          : false

type LiteralMatch<TValue, TPattern> = Extract<TValue, TPattern> | (TPattern extends TValue ? TPattern : never)

type AllItemsCovered<TValue, TPattern> = [TValue] extends [CoveredValue<TValue, TPattern>] ? true : false

type RequiredPatternKeys<TPattern extends object> = {
  [K in keyof TPattern]-?: TPattern[K] extends OptionalPattern<unknown> ? never : K
}[keyof TPattern]

type OptionalPatternKeys<TPattern extends object> = {
  [K in keyof TPattern]-?: TPattern[K] extends OptionalPattern<unknown> ? K : never
}[keyof TPattern]

/**
 * Infers the runtime value type described by a pattern structure.
 *
 * This is useful for helper APIs that accept reusable patterns and need to expose
 * the value type those patterns validate.
 *
 * @typeParam TPattern - Pattern structure to infer from.
 * @see https://github.com/DiegoGBrisa/ts-match#root-type-only-exports
 */
export type InferPattern<TPattern> = TPattern extends WildcardPattern
  ? unknown
  : TPattern extends PrimitivePattern<infer TPrimitive>
    ? TPrimitive
    : TPattern extends NanPattern | FinitePattern | IntegerPattern
      ? number
      : TPattern extends RegexPattern
        ? string
        : TPattern extends DatePattern
          ? Date
          : TPattern extends ErrorPattern
            ? Error
            : TPattern extends RegexpPattern
              ? RegExp
              : TPattern extends NullishPattern
                ? null | undefined
                : TPattern extends FalsyPattern
                  ? InferFalsy
                  : TPattern extends TruthyPattern
                    ? unknown
                    : TPattern extends TemporalPattern<infer TTemporalKind>
                      ? TemporalValueForKind<TTemporalKind>
                      : TPattern extends LiteralPattern<infer TLiteral>
                        ? TLiteral
                        : TPattern extends UnionPattern<infer TPatterns>
                          ? InferPattern<TPatterns[number]>
                          : TPattern extends ExcludePattern<unknown>
                            ? unknown
                            : TPattern extends OptionalPattern<infer TInner>
                              ? InferPattern<TInner> | undefined
                              : TPattern extends ArrayPattern<infer TItem>
                                ? InferPattern<TItem>[]
                                : TPattern extends NonEmptyArrayPattern<infer TItem>
                                  ? [InferPattern<TItem>, ...InferPattern<TItem>[]]
                                  : TPattern extends TuplePattern<infer TItems>
                                    ? InferTuplePattern<TItems>
                                    : TPattern extends RestPattern<infer TItem>
                                      ? InferPattern<TItem>[]
                                      : TPattern extends ExactPattern<infer TInner>
                                        ? InferPattern<TInner>
                                        : TPattern extends GuardPattern<infer TGuarded, true>
                                          ? TGuarded
                                          : TPattern extends GuardPattern<infer TInput, false>
                                            ? TInput
                                            : TPattern extends InstanceOfPattern<infer TConstructor>
                                              ? InstanceType<TConstructor>
                                              : TPattern extends AnonymousSelectPattern<infer TInner>
                                                ? InferPattern<TInner>
                                                : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
                                                  ? InferPattern<TInner>
                                                  : TPattern extends RecordPattern<infer TKey, infer TValue>
                                                    ? InferRecordPattern<TKey, TValue>
                                                    : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                                                      ? InferRecordPattern<TKey, TValue>
                                                      : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                                                        ? Map<InferPattern<TKey>, InferPattern<TValue>>
                                                        : TPattern extends EntryMapPattern<unknown>
                                                          ? Map<unknown, unknown>
                                                          : TPattern extends SetPattern<infer TPatterns, infer TMode>
                                                            ? InferSetPattern<TPatterns, TMode>
                                                            : TPattern extends readonly unknown[]
                                                              ? InferTuplePattern<TPattern>
                                                              : TPattern extends Primitive
                                                                ? TPattern
                                                                : TPattern extends object
                                                                  ? InferObjectPattern<TPattern>
                                                                  : never

type TemporalValueForKind<TTemporalKind extends TemporalPatternKind> = TTemporalKind extends 'any'
  ? TemporalValue
  : TTemporalKind extends 'Instant'
    ? TemporalInstantValue
    : TTemporalKind extends 'PlainDate'
      ? TemporalPlainDateValue
      : TTemporalKind extends 'PlainTime'
        ? TemporalPlainTimeValue
        : TTemporalKind extends 'PlainDateTime'
          ? TemporalPlainDateTimeValue
          : TTemporalKind extends 'ZonedDateTime'
            ? TemporalZonedDateTimeValue
            : TTemporalKind extends 'Duration'
              ? TemporalDurationValue
              : TTemporalKind extends 'PlainYearMonth'
                ? TemporalPlainYearMonthValue
                : TemporalPlainMonthDayValue

type InferObjectPattern<TPattern extends object> = Simplify<
  { [K in RequiredPatternKeys<TPattern>]: InferPattern<TPattern[K]> } & {
    [K in OptionalPatternKeys<TPattern>]?: TPattern[K] extends OptionalPattern<infer TInner>
      ? InferPattern<TInner> | undefined
      : never
  }
>

type InferTuplePattern<TPatterns extends readonly unknown[]> = TPatterns extends readonly [infer THead, ...infer TTail]
  ? THead extends RestPattern<infer TRest>
    ? InferPattern<TRest>[]
    : TTail extends readonly []
      ? [InferPattern<THead>]
      : TTail extends readonly [RestPattern<infer TRest>]
        ? [InferPattern<THead>, ...InferPattern<TRest>[]]
        : [InferPattern<THead>, ...InferTuplePattern<TTail>]
  : []

type InferRecordPattern<TKeyPattern, TValuePattern> =
  InferPattern<TKeyPattern> extends infer TKey
    ? Extract<TKey, PropertyKey> extends never
      ? Record<PropertyKey, InferPattern<TValuePattern>>
      : Record<Extract<TKey, PropertyKey>, InferPattern<TValuePattern>>
    : never

type InferSetPattern<
  TPatterns extends readonly unknown[],
  TMode extends 'homogeneous' | 'values',
> = TMode extends 'homogeneous'
  ? TPatterns extends readonly [infer TPattern]
    ? Set<InferPattern<TPattern>>
    : Set<unknown>
  : Set<unknown>

/**
 * Narrows an input value type by a specific pattern.
 *
 * `match` uses this to type handler parameters. Selection patterns can still
 * transform the handler payload through `HandlerInput`.
 *
 * @typeParam TValue - Original candidate value type.
 * @typeParam TPattern - Pattern used for narrowing.
 * @see https://github.com/DiegoGBrisa/ts-match#handler-parameters-are-narrowed
 */
export type MatchedValue<TValue, TPattern> =
  TPattern extends RestPattern<unknown>
    ? never
    : TPattern extends GuardPattern<infer TGuarded, true>
      ? IsUnsafe<TValue> extends true
        ? TGuarded
        : Extract<TValue, TGuarded>
      : TPattern extends GuardPattern<infer TInput, false>
        ? IsUnsafe<TValue> extends true
          ? TInput
          : Extract<TValue, TInput>
        : IsUnsafe<TValue> extends true
          ? InferPattern<TPattern>
          : TPattern extends WildcardPattern
            ? TValue
            : TPattern extends PrimitivePattern<infer TPrimitive>
              ? Extract<TValue, TPrimitive>
              : TPattern extends NanPattern
                ? MatchedNan<TValue>
                : TPattern extends FinitePattern
                  ? MatchedFinite<TValue>
                  : TPattern extends IntegerPattern
                    ? MatchedInteger<TValue>
                    : TPattern extends RegexPattern
                      ? Extract<TValue, string>
                      : TPattern extends DatePattern
                        ? Extract<TValue, Date>
                        : TPattern extends ErrorPattern
                          ? Extract<TValue, Error>
                          : TPattern extends RegexpPattern
                            ? Extract<TValue, RegExp>
                            : TPattern extends NullishPattern
                              ? Extract<TValue, null | undefined>
                              : TPattern extends FalsyPattern
                                ? MatchedFalsy<TValue>
                                : TPattern extends TruthyPattern
                                  ? MatchedTruthy<TValue>
                                  : TPattern extends TemporalPattern<infer TTemporalKind>
                                    ? Extract<TValue, TemporalValueForKind<TTemporalKind>>
                                    : TPattern extends LiteralPattern<infer TLiteral>
                                      ? LiteralMatch<TValue, TLiteral>
                                      : TPattern extends UnionPattern<infer TPatterns>
                                        ? MatchedValue<TValue, TPatterns[number]>
                                        : TPattern extends ExcludePattern<infer TInner>
                                          ? SafeExclude<TValue, CoveredValue<TValue, TInner>>
                                          : TPattern extends OptionalPattern<infer TInner>
                                            ? MatchedValue<TValue, TInner> | Extract<TValue, undefined>
                                            : TPattern extends ArrayPattern<infer TItem>
                                              ? MatchedArray<TValue, TItem>
                                              : TPattern extends NonEmptyArrayPattern<infer TItem>
                                                ? MatchedNonEmptyArray<TValue, TItem>
                                                : TPattern extends TuplePattern<infer TItems>
                                                  ? MatchedTuple<TValue, TItems>
                                                  : TPattern extends ExactPattern<infer TInner>
                                                    ? MatchedExactValue<TValue, TInner>
                                                    : TPattern extends InstanceOfPattern<infer TConstructor>
                                                      ? Extract<TValue, InstanceType<TConstructor>>
                                                      : TPattern extends AnonymousSelectPattern<infer TInner>
                                                        ? MatchedValue<TValue, TInner>
                                                        : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
                                                          ? MatchedValue<TValue, TInner>
                                                          : TPattern extends RecordPattern<
                                                                infer TKey,
                                                                infer TRecordValue
                                                              >
                                                            ? MatchedRecord<TValue, TKey, TRecordValue, false>
                                                            : TPattern extends NonEmptyRecordPattern<
                                                                  infer TKey,
                                                                  infer TRecordValue
                                                                >
                                                              ? MatchedRecord<TValue, TKey, TRecordValue, true>
                                                              : TPattern extends HomogeneousMapPattern<
                                                                    infer TKey,
                                                                    infer TMapValue
                                                                  >
                                                                ? MatchedHomogeneousMap<TValue, TKey, TMapValue>
                                                                : TPattern extends EntryMapPattern<infer TEntries>
                                                                  ? MatchedEntryMap<TValue, TEntries>
                                                                  : TPattern extends SetPattern<
                                                                        infer TPatterns,
                                                                        infer TMode
                                                                      >
                                                                    ? MatchedSet<TValue, TPatterns, TMode>
                                                                    : TPattern extends readonly unknown[]
                                                                      ? MatchedTuple<TValue, TPattern>
                                                                      : TPattern extends Primitive
                                                                        ? LiteralMatch<TValue, TPattern>
                                                                        : TPattern extends object
                                                                          ? MatchedObject<TValue, TPattern>
                                                                          : never

type CoveredVariant<TValue, TPattern> = TPattern extends unknown
  ? TPattern extends ExactPattern<infer TInner>
    ? CoveredExactValue<TValue, TInner>
    : CoveredValue<TValue, TPattern>
  : never

/**
 * Removes cases covered by one pattern from an input union for exhaustiveness checks.
 *
 * @typeParam TValue - Union before the branch.
 * @typeParam TPattern - Pattern handled by the branch.
 * @see https://github.com/DiegoGBrisa/ts-match#exhaustiveness-catches-missing-cases
 */
export type RemainingAfterPattern<TValue, TPattern> = TValue extends unknown
  ? [TValue] extends [CoveredVariant<TValue, TPattern>]
    ? never
    : RemainingAfterUncoveredPattern<TValue, TPattern>
  : never

type RemainingAfterUncoveredPattern<TValue, TPattern> = TPattern extends BuiltInPattern
  ? TValue
  : TPattern extends readonly unknown[]
    ? TValue
    : TPattern extends object
      ? RemainingAfterObjectPattern<TValue, TPattern>
      : TValue

/**
 * Removes cases covered by multiple alternative patterns from an input union.
 *
 * @typeParam TValue - Union before the branch.
 * @typeParam TPatterns - Pattern union handled by the branch.
 * @see https://github.com/DiegoGBrisa/ts-match#exhaustiveness-catches-missing-cases
 */
export type RemainingAfterPatterns<TValue, TPatterns> = RemainingAfterPattern<TValue, TPatterns>

type CoveredValue<TValue, TPattern> =
  TPattern extends GuardPattern<unknown, false>
    ? never
    : TPattern extends RestPattern<unknown>
      ? never
      : TPattern extends NanPattern
        ? CoveredNan<TValue>
        : TPattern extends FinitePattern
          ? CoveredFinite<TValue>
          : TPattern extends IntegerPattern
            ? CoveredInteger<TValue>
            : TPattern extends RegexPattern
              ? never
              : TPattern extends DatePattern
                ? never
                : TPattern extends TemporalPattern<TemporalPatternKind>
                  ? never
                  : TPattern extends LiteralPattern<infer TLiteral>
                    ? CoveredLiteral<TValue, TLiteral>
                    : TPattern extends UnionPattern<infer TPatterns>
                      ? CoveredValue<TValue, TPatterns[number]>
                      : TPattern extends ExcludePattern<infer TInner>
                        ? CoveredExclude<TValue, TInner>
                        : TPattern extends OptionalPattern<infer TInner>
                          ? CoveredValue<TValue, TInner> | Extract<TValue, undefined>
                          : TPattern extends FalsyPattern
                            ? CoveredFalsy<TValue>
                            : TPattern extends TruthyPattern
                              ? CoveredTruthy<TValue>
                              : TPattern extends ArrayPattern<infer TItem>
                                ? CoveredArray<TValue, TItem>
                                : TPattern extends NonEmptyArrayPattern<infer TItem>
                                  ? CoveredNonEmptyArray<TValue, TItem>
                                  : TPattern extends TuplePattern<infer TItems>
                                    ? MatchedTuple<TValue, TItems>
                                    : TPattern extends ExactPattern<infer TInner>
                                      ? CoveredExactValue<TValue, TInner>
                                      : TPattern extends RecordPattern<infer TKey, infer TValuePattern>
                                        ? CoveredRecord<TValue, TKey, TValuePattern>
                                        : TPattern extends NonEmptyRecordPattern<unknown, unknown>
                                          ? never
                                          : TPattern extends HomogeneousMapPattern<infer TKey, infer TMapValue>
                                            ? CoveredHomogeneousMap<TValue, TKey, TMapValue>
                                            : TPattern extends EntryMapPattern<unknown>
                                              ? never
                                              : TPattern extends SetPattern<infer TPatterns, infer TMode>
                                                ? CoveredSet<TValue, TPatterns, TMode>
                                                : TPattern extends readonly unknown[]
                                                  ? MatchedTuple<TValue, TPattern>
                                                  : TPattern extends BuiltInPattern
                                                    ? MatchedValue<TValue, TPattern>
                                                    : TPattern extends object
                                                      ? CoveredObject<TValue, TPattern>
                                                      : MatchedValue<TValue, TPattern>

type CoveredExclude<TValue, TPattern> = TValue extends unknown
  ? [MatchedValue<TValue, TPattern>] extends [never]
    ? TValue
    : [TValue] extends [CoveredValue<TValue, TPattern>]
      ? never
      : never
  : never

type SafeExclude<TValue, TExcluded> = TValue extends string
  ? string extends TValue
    ? TExcluded extends string
      ? string extends TExcluded
        ? never
        : TValue
      : Exclude<TValue, TExcluded>
    : Exclude<TValue, TExcluded>
  : TValue extends number
    ? number extends TValue
      ? TExcluded extends number
        ? number extends TExcluded
          ? never
          : TValue
        : Exclude<TValue, TExcluded>
      : Exclude<TValue, TExcluded>
    : TValue extends bigint
      ? bigint extends TValue
        ? TExcluded extends bigint
          ? bigint extends TExcluded
            ? never
            : TValue
          : Exclude<TValue, TExcluded>
        : Exclude<TValue, TExcluded>
      : TValue extends symbol
        ? symbol extends TValue
          ? TExcluded extends symbol
            ? symbol extends TExcluded
              ? never
              : TValue
            : Exclude<TValue, TExcluded>
          : Exclude<TValue, TExcluded>
        : Exclude<TValue, TExcluded>

type MutableArray<T> = T[]
type ReadonlyArrayOf<T> = readonly T[]

type ArrayOutput<TValue, TItem> = TValue extends unknown[] ? MutableArray<TItem> : ReadonlyArrayOf<TItem>

type NonEmptyArrayOutput<TValue, TItem> = TValue extends unknown[] ? [TItem, ...TItem[]] : readonly [TItem, ...TItem[]]

type EveryKnownArrayItemMatches<TArray extends readonly unknown[], TItemPattern> = TArray extends readonly [
  infer THead,
  ...infer TTail,
]
  ? [MatchedValue<THead, TItemPattern>] extends [never]
    ? false
    : EveryKnownArrayItemMatches<TTail, TItemPattern>
  : true

type MatchedArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly (infer TItem)[]
      ? number extends TArray['length']
        ? [MatchedValue<TItem, TItemPattern>] extends [never]
          ? never
          : ArrayOutput<TArray, MatchedValue<TItem, TItemPattern>>
        : EveryKnownArrayItemMatches<TArray, TItemPattern> extends true
          ? TArray
          : never
      : never
    : never

type MatchedNonEmptyArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly []
      ? never
      : TArray extends readonly (infer TItem)[]
        ? number extends TArray['length']
          ? [MatchedValue<TItem, TItemPattern>] extends [never]
            ? never
            : NonEmptyArrayOutput<TArray, MatchedValue<TItem, TItemPattern>>
          : EveryKnownArrayItemMatches<TArray, TItemPattern> extends true
            ? TArray
            : never
        : never
    : never

type CoveredArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly (infer TItem)[]
      ? number extends TArray['length']
        ? AllItemsCovered<TItem, TItemPattern> extends true
          ? TArray
          : never
        : EveryKnownArrayItemMatches<TArray, TItemPattern> extends true
          ? TArray
          : never
      : never
    : never

type CoveredNonEmptyArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly unknown[]
      ? TArray extends readonly []
        ? never
        : number extends TArray['length']
          ? never
          : TArray extends readonly (infer TItem)[]
            ? AllItemsCovered<TItem, TItemPattern> extends true
              ? TArray
              : never
            : never
      : never
    : never

type MatchedTuple<TValue, TPatterns extends readonly unknown[]> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly unknown[]
      ? TupleCompatible<TArray, TPatterns> extends true
        ? TArray
        : IsUnsafe<TArray> extends true
          ? InferTuplePattern<TPatterns>
          : never
      : never
    : never

type TupleCompatible<
  TArray extends readonly unknown[],
  TPatterns extends readonly unknown[],
> = TPatterns extends readonly [infer THead, ...infer TTail]
  ? THead extends RestPattern<infer TRest>
    ? TTail extends readonly []
      ? EveryTupleItemMatches<TArray, TRest>
      : false
    : TArray extends readonly [infer VHead, ...infer VTail]
      ? [MatchedValue<VHead, THead>] extends [never]
        ? false
        : TTail extends readonly [RestPattern<infer TRestTail>]
          ? EveryTupleItemMatches<VTail, TRestTail>
          : TupleCompatible<VTail, TTail>
      : number extends TArray['length']
        ? BroadArrayTupleCompatible<TArray[number], TPatterns>
        : false
  : TArray extends readonly []
    ? true
    : false

type BroadArrayTupleCompatible<TItem, TPatterns extends readonly unknown[]> = TPatterns extends readonly [
  infer THead,
  ...infer TTail,
]
  ? THead extends RestPattern<infer TRest>
    ? TTail extends readonly []
      ? [MatchedValue<TItem, TRest>] extends [never]
        ? false
        : true
      : false
    : [MatchedValue<TItem, THead>] extends [never]
      ? false
      : BroadArrayTupleCompatible<TItem, TTail>
  : true

type EveryTupleItemMatches<TArray extends readonly unknown[], TPattern> = TArray extends readonly [
  infer THead,
  ...infer TTail,
]
  ? [MatchedValue<THead, TPattern>] extends [never]
    ? false
    : EveryTupleItemMatches<TTail, TPattern>
  : true

type NonRecordObject =
  | readonly unknown[]
  | ((...args: never[]) => unknown)
  | Date
  | RegExp
  | Map<unknown, unknown>
  | Set<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | PromiseLike<unknown>
  | Error

type KnownKeyCount<TValue> = keyof TValue extends never ? 0 : 1

type RuntimeComparableKey<TKey> = TKey extends string
  ? TKey | (TKey extends `${number}` ? number : never)
  : TKey extends number
    ? TKey | `${TKey}`
    : TKey

type RecordKeyCompatible<TKey, TKeyPattern> = [MatchedValue<RuntimeComparableKey<TKey>, TKeyPattern>] extends [never]
  ? false
  : true

type RecordObjectCompatible<TValue extends object, TKeyPattern, TValuePattern> = false extends {
  [K in keyof TValue]-?: RecordKeyCompatible<K, TKeyPattern> extends true
    ? [MatchedValue<Exclude<TValue[K], undefined>, TValuePattern>] extends [never]
      ? undefined extends TValue[K]
        ? true
        : false
      : true
    : false
}[keyof TValue]
  ? false
  : true

type MatchedRecord<
  TValue,
  TKeyPattern,
  TValuePattern,
  TRequireNonEmpty extends boolean,
> = TValue extends NonRecordObject
  ? never
  : TValue extends object
    ? TRequireNonEmpty extends true
      ? KnownKeyCount<TValue> extends 0
        ? never
        : RecordObjectCompatible<TValue, TKeyPattern, TValuePattern> extends true
          ? TValue
          : never
      : RecordObjectCompatible<TValue, TKeyPattern, TValuePattern> extends true
        ? TValue
        : never
    : never

type CoveredRecord<TValue, _TKeyPattern, TValuePattern> = TValue extends NonRecordObject
  ? never
  : TValue extends Record<PropertyKey, infer TRecordValue>
    ? AllItemsCovered<TRecordValue, TValuePattern> extends true
      ? TValue
      : never
    : never

type IsSingletonLiteral<TValue> = [TValue] extends [Primitive]
  ? IsUnion<TValue> extends true
    ? false
    : IsBroad<TValue> extends true
      ? false
      : true
  : false

type CoveredLiteral<TValue, TLiteral> =
  IsSingletonLiteral<TLiteral> extends true ? LiteralMatch<TValue, TLiteral> : never

type MapEntryCompatible<TMapKey, TMapValue, TEntry extends MapEntryPattern> = TEntry extends readonly [
  infer TKeyPattern,
  infer TValuePattern,
]
  ? [MatchedValue<TMapKey, TKeyPattern>] extends [never]
    ? false
    : [MatchedValue<TMapValue, TValuePattern>] extends [never]
      ? false
      : true
  : false

type MapEntriesCompatible<TMapKey, TMapValue, TEntries extends readonly MapEntryPattern[]> = false extends {
  [K in keyof TEntries]: TEntries[K] extends MapEntryPattern
    ? MapEntryCompatible<TMapKey, TMapValue, TEntries[K]>
    : false
}[number]
  ? false
  : true

type MatchedHomogeneousMap<TValue, TKeyPattern, TValuePattern> =
  Extract<TValue, Map<unknown, unknown>> extends infer TMap
    ? TMap extends Map<infer TKey, infer TMapValue>
      ? [MatchedValue<TKey, TKeyPattern>] extends [never]
        ? never
        : [MatchedValue<TMapValue, TValuePattern>] extends [never]
          ? never
          : Map<MatchedValue<TKey, TKeyPattern>, MatchedValue<TMapValue, TValuePattern>>
      : never
    : never

type MatchedEntryMap<TValue, TEntries> = TEntries extends readonly MapEntryPattern[]
  ? Extract<TValue, Map<unknown, unknown>> extends infer TMap
    ? TMap extends Map<infer TKey, infer TMapValue>
      ? MapEntriesCompatible<TKey, TMapValue, TEntries> extends true
        ? TMap
        : never
      : never
    : never
  : never

type CoveredHomogeneousMap<TValue, TKeyPattern, TValuePattern> =
  Extract<TValue, Map<unknown, unknown>> extends infer TMap
    ? TMap extends Map<infer TKey, infer TMapValue>
      ? AllItemsCovered<TKey, TKeyPattern> extends true
        ? AllItemsCovered<TMapValue, TValuePattern> extends true
          ? TMap
          : never
        : never
      : never
    : never

type SetValuesCompatible<TItem, TPatterns extends readonly unknown[]> = false extends {
  [K in keyof TPatterns]: [MatchedValue<TItem, TPatterns[K]>] extends [never] ? false : true
}[number]
  ? false
  : true

type MatchedSet<TValue, TPatterns extends readonly unknown[], TMode extends 'homogeneous' | 'values'> =
  Extract<TValue, Set<unknown>> extends infer TSet
    ? TSet extends Set<infer TItem>
      ? TMode extends 'homogeneous'
        ? TPatterns extends readonly [infer TPattern]
          ? [MatchedValue<TItem, TPattern>] extends [never]
            ? never
            : Set<MatchedValue<TItem, TPattern>>
          : never
        : SetValuesCompatible<TItem, TPatterns> extends true
          ? TSet
          : never
      : never
    : never

type CoveredSet<
  TValue,
  TPatterns extends readonly unknown[],
  TMode extends 'homogeneous' | 'values',
> = TMode extends 'values'
  ? never
  : TPatterns extends readonly [infer TPattern]
    ? Extract<TValue, Set<unknown>> extends infer TSet
      ? TSet extends Set<infer TItem>
        ? AllItemsCovered<TItem, TPattern> extends true
          ? TSet
          : never
        : never
      : never
    : never

type MatchedObject<TValue, TPattern extends object> = TValue extends unknown
  ? TValue extends object
    ? ObjectPatternCompatible<TValue, TPattern> extends true
      ? RefineObject<TValue, TPattern>
      : never
    : never
  : never

type ObjectPatternCompatible<TValue extends object, TPattern extends object> = false extends {
  [K in keyof TPattern]: K extends keyof TValue
    ? [MatchedValue<TValue[K], TPattern[K]>] extends [never]
      ? false
      : true
    : TPattern[K] extends OptionalPattern<unknown>
      ? true
      : false
}[keyof TPattern]
  ? false
  : true

type OptionalObjectKey<TValue extends object, TKey extends keyof TValue> =
  Partial<Pick<TValue, TKey>> extends Pick<TValue, TKey> ? true : false

type ObjectPatternKeyHasAbsentHole<
  TValue extends object,
  TPattern extends object,
  TKey extends keyof TPattern,
> = TKey extends keyof TValue
  ? TPattern[TKey] extends OptionalPattern<unknown>
    ? false
    : OptionalObjectKey<TValue, TKey> extends true
      ? true
      : false
  : false

type ObjectPatternHasAbsentHole<TValue extends object, TPattern extends object> = true extends {
  [K in keyof TPattern]: ObjectPatternKeyHasAbsentHole<TValue, TPattern, K>
}[keyof TPattern]
  ? true
  : false

type CoveredObject<TValue, TPattern extends object> = TValue extends unknown
  ? TValue extends object
    ? ObjectPatternCompatible<TValue, TPattern> extends true
      ? ObjectPatternHasAbsentHole<TValue, TPattern> extends true
        ? never
        : CoveredRefineObject<TValue, TPattern>
      : never
    : never
  : never

type RefineObject<TValue extends object, TPattern extends object> = Simplify<{
  [K in keyof TValue]: K extends keyof TPattern ? MatchedValue<TValue[K], TPattern[K]> : TValue[K]
}>

type CoveredRefineObject<TValue extends object, TPattern extends object> = Simplify<{
  [K in keyof TValue]: K extends keyof TPattern ? CoveredValue<TValue[K], TPattern[K]> : TValue[K]
}>

type RemainingAfterObjectPattern<TValue, TPattern extends object> = TValue extends unknown
  ? TValue extends object
    ? ObjectPatternCompatible<TValue, TPattern> extends true
      ? ObjectPatternFailureUnion<TValue, TPattern>
      : TValue
    : TValue
  : never

type ObjectPatternFailureUnion<TValue extends object, TPattern extends object> = {
  [K in keyof TPattern]: ObjectPatternKeyFailure<TValue, TPattern, K>
}[keyof TPattern]

type ObjectPatternKeyFailure<
  TValue extends object,
  TPattern extends object,
  TKey extends keyof TPattern,
> = TKey extends keyof TValue
  ? TPattern[TKey] extends OptionalPattern<infer TInner>
    ? PresentOptionalObjectKeyFailure<TValue, TKey, TInner>
    : MissingRequiredObjectKey<TValue, TKey> | PresentRequiredObjectKeyFailure<TValue, TPattern, TKey>
  : TPattern[TKey] extends OptionalPattern<unknown>
    ? never
    : TValue

type PresentOptionalObjectKeyFailure<TValue extends object, TKey extends keyof TValue, TPattern> =
  RemainingAfterPattern<Exclude<TValue[TKey], undefined>, TPattern> extends infer TRemaining
    ? [TRemaining] extends [never]
      ? never
      : RequireObjectKey<TValue, TKey, TRemaining>
    : never

type PresentRequiredObjectKeyFailure<
  TValue extends object,
  TPattern extends object,
  TKey extends keyof TPattern,
> = TKey extends keyof TValue
  ? RemainingAfterPattern<TValue[TKey], TPattern[TKey]> extends infer TRemaining
    ? [TRemaining] extends [never]
      ? never
      : RequireObjectKey<TValue, TKey, TRemaining>
    : never
  : never

type MissingRequiredObjectKey<TValue extends object, TKey extends keyof TValue> =
  OptionalObjectKey<TValue, TKey> extends true ? AbsentObjectKey<TValue, TKey> : never

type RequireObjectKey<TValue extends object, TKey extends keyof TValue, TProperty> = Simplify<
  Omit<TValue, TKey> & { [K in keyof Pick<TValue, TKey>]-?: TProperty }
>

type AbsentObjectKey<TValue extends object, TKey extends keyof TValue> = Simplify<
  Omit<TValue, TKey> & { [K in keyof Pick<TValue, TKey>]?: never }
>

type CoveredExactValue<TValue, TPattern> = TPattern extends WildcardPattern
  ? TValue
  : TPattern extends
        | PrimitivePattern<Primitive>
        | NanPattern
        | FinitePattern
        | IntegerPattern
        | RegexPattern
        | DatePattern
        | ErrorPattern
        | RegexpPattern
        | NullishPattern
        | FalsyPattern
        | TruthyPattern
        | TemporalPattern<TemporalPatternKind>
    ? CoveredValue<TValue, TPattern>
    : TPattern extends LiteralPattern<infer TLiteral>
      ? CoveredLiteral<TValue, TLiteral>
      : TPattern extends UnionPattern<infer TPatterns>
        ? CoveredExactValue<TValue, TPatterns[number]>
        : TPattern extends ExcludePattern<infer TInner>
          ? CoveredExactExclude<TValue, TInner>
          : TPattern extends OptionalPattern<infer TInner>
            ? CoveredExactValue<TValue, TInner> | Extract<TValue, undefined>
            : TPattern extends ArrayPattern<infer TItem>
              ? CoveredArray<TValue, TItem>
              : TPattern extends NonEmptyArrayPattern<infer TItem>
                ? CoveredNonEmptyArray<TValue, TItem>
                : TPattern extends TuplePattern<infer TItems>
                  ? MatchedTuple<TValue, TItems>
                  : TPattern extends RestPattern<unknown>
                    ? never
                    : TPattern extends RecordPattern<infer TKey, infer TRecordValue>
                      ? CoveredRecord<TValue, TKey, TRecordValue>
                      : TPattern extends NonEmptyRecordPattern<unknown, unknown>
                        ? never
                        : TPattern extends HomogeneousMapPattern<infer TKey, infer TMapValue>
                          ? CoveredHomogeneousMap<TValue, TKey, TMapValue>
                          : TPattern extends EntryMapPattern<unknown>
                            ? never
                            : TPattern extends SetPattern<infer TPatterns, infer TMode>
                              ? CoveredSet<TValue, TPatterns, TMode>
                              : TPattern extends readonly unknown[]
                                ? MatchedTuple<TValue, TPattern>
                                : TPattern extends object
                                  ? CoveredExactObject<TValue, TPattern>
                                  : CoveredValue<TValue, TPattern>

type CoveredExactObject<TValue, TPattern extends object> = TValue extends unknown
  ? TValue extends object
    ? ExactObjectCompatible<TValue, TPattern> extends true
      ? ObjectPatternHasAbsentHole<TValue, TPattern> extends true
        ? never
        : CoveredRefineExactObject<TValue, TPattern>
      : never
    : never
  : never

type CoveredRefineExactObject<TValue extends object, TPattern extends object> = Simplify<{
  [K in keyof TValue]: K extends keyof TPattern ? CoveredExactValue<TValue[K], TPattern[K]> : TValue[K]
}>

type CoveredExactExclude<TValue, TPattern> = TValue extends unknown
  ? [MatchedExactValue<TValue, TPattern>] extends [never]
    ? TValue
    : [TValue] extends [CoveredExactValue<TValue, TPattern>]
      ? never
      : never
  : never

type MatchedExactValue<TValue, TPattern> = TPattern extends WildcardPattern
  ? TValue
  : TPattern extends PrimitivePattern<Primitive>
    ? MatchedValue<TValue, TPattern>
    : TPattern extends
          | NanPattern
          | FinitePattern
          | IntegerPattern
          | RegexPattern
          | DatePattern
          | ErrorPattern
          | RegexpPattern
          | NullishPattern
          | FalsyPattern
          | TruthyPattern
          | TemporalPattern<TemporalPatternKind>
      ? MatchedValue<TValue, TPattern>
      : TPattern extends LiteralPattern<infer TLiteral>
        ? LiteralMatch<TValue, TLiteral>
        : TPattern extends UnionPattern<infer TPatterns>
          ? MatchedExactValue<TValue, TPatterns[number]>
          : TPattern extends ExcludePattern<infer TInner>
            ? SafeExclude<TValue, CoveredValue<TValue, TInner>>
            : TPattern extends OptionalPattern<infer TInner>
              ? MatchedExactValue<TValue, TInner> | Extract<TValue, undefined>
              : TPattern extends ArrayPattern<infer TItem>
                ? MatchedArray<TValue, TItem>
                : TPattern extends NonEmptyArrayPattern<infer TItem>
                  ? MatchedNonEmptyArray<TValue, TItem>
                  : TPattern extends TuplePattern<infer TItems>
                    ? MatchedTuple<TValue, TItems>
                    : TPattern extends RestPattern<unknown>
                      ? never
                      : TPattern extends GuardPattern<infer TGuarded, true>
                        ? IsUnsafe<TValue> extends true
                          ? TGuarded
                          : Extract<TValue, TGuarded>
                        : TPattern extends GuardPattern<infer TInput, false>
                          ? IsUnsafe<TValue> extends true
                            ? TInput
                            : Extract<TValue, TInput>
                          : TPattern extends InstanceOfPattern<infer TConstructor>
                            ? Extract<TValue, InstanceType<TConstructor>>
                            : TPattern extends AnonymousSelectPattern<infer TInner>
                              ? MatchedExactValue<TValue, TInner>
                              : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
                                ? MatchedExactValue<TValue, TInner>
                                : TPattern extends RecordPattern<infer TKey, infer TRecordValue>
                                  ? MatchedRecord<TValue, TKey, TRecordValue, false>
                                  : TPattern extends NonEmptyRecordPattern<infer TKey, infer TRecordValue>
                                    ? MatchedRecord<TValue, TKey, TRecordValue, true>
                                    : TPattern extends HomogeneousMapPattern<infer TKey, infer TMapValue>
                                      ? MatchedHomogeneousMap<TValue, TKey, TMapValue>
                                      : TPattern extends EntryMapPattern<infer TEntries>
                                        ? MatchedEntryMap<TValue, TEntries>
                                        : TPattern extends SetPattern<infer TPatterns, infer TMode>
                                          ? MatchedSet<TValue, TPatterns, TMode>
                                          : TPattern extends readonly unknown[]
                                            ? MatchedTuple<TValue, TPattern>
                                            : TPattern extends Primitive
                                              ? LiteralMatch<TValue, TPattern>
                                              : TPattern extends object
                                                ? MatchedExactObject<TValue, TPattern>
                                                : never

type MatchedExactObject<TValue, TPattern extends object> = TValue extends unknown
  ? TValue extends object
    ? ExactObjectCompatible<TValue, TPattern> extends true
      ? RefineExactObject<TValue, TPattern>
      : never
    : never
  : never

type ExactObjectCompatible<TValue extends object, TPattern extends object> =
  Exclude<keyof TValue, keyof TPattern> extends never ? ObjectPatternCompatible<TValue, TPattern> : false

type RefineExactObject<TValue extends object, TPattern extends object> = Simplify<{
  [K in keyof TValue]: K extends keyof TPattern ? MatchedExactValue<TValue[K], TPattern[K]> : TValue[K]
}>

type SelectionMode = 'none' | 'anonymous' | 'named' | 'invalid'

type MergeSelectionModes<TLeft extends SelectionMode, TRight extends SelectionMode> = TLeft extends 'invalid'
  ? 'invalid'
  : TRight extends 'invalid'
    ? 'invalid'
    : TLeft extends 'none'
      ? TRight
      : TRight extends 'none'
        ? TLeft
        : TLeft extends 'anonymous'
          ? 'invalid'
          : TRight extends 'anonymous'
            ? 'invalid'
            : 'named'

type SelectionModeFromTuple<
  TPatterns extends readonly unknown[],
  TMode extends SelectionMode = 'none',
> = TPatterns extends readonly [infer THead, ...infer TTail]
  ? SelectionModeFromTuple<TTail, MergeSelectionModes<TMode, SelectionModeOf<THead>>>
  : TMode

type ObjectSelectionKeys<TPattern extends object, TMode extends SelectionMode> = {
  [K in keyof TPattern]: SelectionModeOf<TPattern[K]> extends TMode ? K : never
}[keyof TPattern]

type ObjectSelectionMode<TPattern extends object> = keyof TPattern extends never
  ? 'none'
  : ObjectSelectionKeys<TPattern, 'invalid'> extends never
    ? ObjectSelectionKeys<TPattern, 'anonymous'> extends infer TAnonymousKeys
      ? [TAnonymousKeys] extends [never]
        ? ObjectSelectionKeys<TPattern, 'named'> extends never
          ? 'none'
          : 'named'
        : ObjectSelectionKeys<TPattern, 'named'> extends never
          ? IsUnion<TAnonymousKeys> extends true
            ? 'invalid'
            : 'anonymous'
          : 'invalid'
      : 'none'
    : 'invalid'

type SelectionModeOf<TPattern> = TPattern extends
  | WildcardPattern
  | PrimitivePattern<Primitive>
  | NanPattern
  | FinitePattern
  | IntegerPattern
  | RegexPattern
  | DatePattern
  | ErrorPattern
  | RegexpPattern
  | NullishPattern
  | FalsyPattern
  | TruthyPattern
  | TemporalPattern<TemporalPatternKind>
  | LiteralPattern<unknown>
  | GuardPattern<unknown, boolean>
  | InstanceOfPattern<AbstractConstructor>
  ? 'none'
  : TPattern extends AnonymousSelectPattern<unknown>
    ? 'anonymous'
    : TPattern extends NamedSelectPattern<PropertyKey, unknown>
      ? 'named'
      : TPattern extends ExcludePattern<infer TInner>
        ? SelectionModeOf<TInner> extends 'none'
          ? 'none'
          : 'invalid'
        : TPattern extends UnionPattern<infer TPatterns>
          ? true extends (SelectionModeOf<TPatterns[number]> extends 'invalid' ? true : false)
            ? 'invalid'
            : 'none'
          : TPattern extends OptionalPattern<infer TInner>
            ? SelectionModeOf<TInner>
            : TPattern extends ArrayPattern<infer TInner>
              ? SelectionModeOf<TInner> extends 'none'
                ? 'none'
                : 'invalid'
              : TPattern extends NonEmptyArrayPattern<infer TInner>
                ? SelectionModeOf<TInner> extends 'none'
                  ? 'none'
                  : 'invalid'
                : TPattern extends TuplePattern<infer TItems>
                  ? SelectionModeFromTuple<TItems>
                  : TPattern extends RestPattern<infer TInner>
                    ? SelectionModeOf<TInner>
                    : TPattern extends ExactPattern<infer TInner>
                      ? SelectionModeOf<TInner>
                      : TPattern extends RecordPattern<infer TKey, infer TValue>
                        ? MergeSelectionModes<SelectionModeOf<TKey>, SelectionModeOf<TValue>> extends 'none'
                          ? 'none'
                          : 'invalid'
                        : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                          ? MergeSelectionModes<SelectionModeOf<TKey>, SelectionModeOf<TValue>> extends 'none'
                            ? 'none'
                            : 'invalid'
                          : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                            ? MergeSelectionModes<SelectionModeOf<TKey>, SelectionModeOf<TValue>> extends 'none'
                              ? 'none'
                              : 'invalid'
                            : TPattern extends EntryMapPattern<infer TEntries>
                              ? TEntries extends readonly MapEntryPattern[]
                                ? MergeSelectionModes<
                                    SelectionModeOf<TEntries[number][0]>,
                                    SelectionModeOf<TEntries[number][1]>
                                  > extends 'none'
                                  ? 'none'
                                  : 'invalid'
                                : 'none'
                              : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                                ? SelectionModeOf<TPatterns[number]> extends 'none'
                                  ? 'none'
                                  : 'invalid'
                                : TPattern extends readonly unknown[]
                                  ? SelectionModeFromTuple<TPattern>
                                  : TPattern extends object
                                    ? ObjectSelectionMode<TPattern>
                                    : 'none'

type ContainsSelection<TPattern> = TPattern extends
  | AnonymousSelectPattern<unknown>
  | NamedSelectPattern<PropertyKey, unknown>
  ? true
  : TPattern extends
        | WildcardPattern
        | PrimitivePattern<Primitive>
        | NanPattern
        | FinitePattern
        | IntegerPattern
        | RegexPattern
        | DatePattern
        | ErrorPattern
        | RegexpPattern
        | NullishPattern
        | FalsyPattern
        | TruthyPattern
        | TemporalPattern<TemporalPatternKind>
        | LiteralPattern<unknown>
        | GuardPattern<unknown, boolean>
        | InstanceOfPattern<AbstractConstructor>
    ? false
    : TPattern extends UnionPattern<infer TPatterns>
      ? true extends (TPatterns[number] extends unknown ? ContainsSelection<TPatterns[number]> : never)
        ? true
        : false
      : TPattern extends ExcludePattern<infer TInner>
        ? ContainsSelection<TInner>
        : TPattern extends OptionalPattern<infer TInner>
          ? ContainsSelection<TInner>
          : TPattern extends ArrayPattern<infer TInner>
            ? ContainsSelection<TInner>
            : TPattern extends NonEmptyArrayPattern<infer TInner>
              ? ContainsSelection<TInner>
              : TPattern extends TuplePattern<infer TItems>
                ? ContainsSelection<TItems>
                : TPattern extends RestPattern<infer TInner>
                  ? ContainsSelection<TInner>
                  : TPattern extends ExactPattern<infer TInner>
                    ? ContainsSelection<TInner>
                    : TPattern extends RecordPattern<infer TKey, infer TValue>
                      ? ContainsSelection<TKey> extends true
                        ? true
                        : ContainsSelection<TValue>
                      : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                        ? ContainsSelection<TKey> extends true
                          ? true
                          : ContainsSelection<TValue>
                        : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                          ? ContainsSelection<TKey> extends true
                            ? true
                            : ContainsSelection<TValue>
                          : TPattern extends EntryMapPattern<infer TEntries>
                            ? TEntries extends readonly MapEntryPattern[]
                              ? true extends (
                                  TEntries[number] extends readonly [infer TEntryKey, infer TEntryValue]
                                    ? ContainsSelection<TEntryKey> extends true
                                      ? true
                                      : ContainsSelection<TEntryValue>
                                    : false
                                )
                                ? true
                                : false
                              : false
                            : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                              ? true extends (
                                  TPatterns[number] extends unknown ? ContainsSelection<TPatterns[number]> : never
                                )
                                ? true
                                : false
                              : TPattern extends readonly unknown[]
                                ? true extends (
                                    TPattern[number] extends unknown ? ContainsSelection<TPattern[number]> : never
                                  )
                                  ? true
                                  : false
                                : TPattern extends object
                                  ? true extends {
                                      [K in keyof TPattern]: ContainsSelection<TPattern[K]>
                                    }[keyof TPattern]
                                    ? true
                                    : false
                                  : false

type RestUsageValid<TPattern> =
  TPattern extends RestPattern<unknown>
    ? false
    : TPattern extends
          | WildcardPattern
          | PrimitivePattern<Primitive>
          | NanPattern
          | FinitePattern
          | IntegerPattern
          | RegexPattern
          | DatePattern
          | ErrorPattern
          | RegexpPattern
          | NullishPattern
          | FalsyPattern
          | TruthyPattern
          | TemporalPattern<TemporalPatternKind>
          | LiteralPattern<unknown>
          | GuardPattern<unknown, boolean>
          | InstanceOfPattern<AbstractConstructor>
      ? true
      : TPattern extends UnionPattern<infer TPatterns>
        ? false extends (TPatterns[number] extends unknown ? RestUsageValid<TPatterns[number]> : never)
          ? false
          : true
        : TPattern extends ExcludePattern<infer TInner>
          ? RestUsageValid<TInner>
          : TPattern extends OptionalPattern<infer TInner>
            ? RestUsageValid<TInner>
            : TPattern extends ArrayPattern<infer TInner>
              ? RestUsageValid<TInner>
              : TPattern extends NonEmptyArrayPattern<infer TInner>
                ? RestUsageValid<TInner>
                : TPattern extends TuplePattern<infer TItems>
                  ? TupleRestUsageValid<TItems>
                  : TPattern extends ExactPattern<infer TInner>
                    ? RestUsageValid<TInner>
                    : TPattern extends RecordPattern<infer TKey, infer TValue>
                      ? RestUsageValid<TKey> extends true
                        ? RestUsageValid<TValue>
                        : false
                      : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                        ? RestUsageValid<TKey> extends true
                          ? RestUsageValid<TValue>
                          : false
                        : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                          ? RestUsageValid<TKey> extends true
                            ? RestUsageValid<TValue>
                            : false
                          : TPattern extends EntryMapPattern<infer TEntries>
                            ? TEntries extends readonly MapEntryPattern[]
                              ? false extends (
                                  TEntries[number] extends readonly [infer TEntryKey, infer TEntryValue]
                                    ? RestUsageValid<TEntryKey> extends true
                                      ? RestUsageValid<TEntryValue>
                                      : false
                                    : false
                                )
                                ? false
                                : true
                              : true
                            : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                              ? false extends (
                                  TPatterns[number] extends unknown ? RestUsageValid<TPatterns[number]> : never
                                )
                                ? false
                                : true
                              : TPattern extends readonly unknown[]
                                ? TupleRestUsageValid<TPattern>
                                : TPattern extends object
                                  ? false extends {
                                      [K in keyof TPattern]: RestUsageValid<TPattern[K]>
                                    }[keyof TPattern]
                                    ? false
                                    : true
                                  : true

type TupleRestUsageValid<TPatterns extends readonly unknown[]> = TPatterns extends readonly []
  ? true
  : TPatterns extends readonly [infer TOnly]
    ? TOnly extends RestPattern<infer TInner>
      ? RestUsageValid<TInner>
      : RestUsageValid<TOnly>
    : TPatterns extends readonly [infer THead, ...infer TTail]
      ? THead extends RestPattern<unknown>
        ? false
        : RestUsageValid<THead> extends true
          ? TupleRestUsageValid<TTail>
          : false
      : true

type TsMatchTypeError<TMessage extends string, TDetails = unknown> = {
  readonly [K in TMessage]: TDetails
} & {
  readonly 'ts-match: diagnostic': true
}

/**
 * Turns a diagnostic gate into an optional rest argument.
 *
 * Valid inputs produce no extra argument. Invalid inputs require one diagnostic
 * argument whose type carries the readable ts-match error message, which keeps
 * primary API arguments autocomplete-friendly while preserving compile failures.
 *
 * @typeParam TDiagnostic - Diagnostic gate result, usually `unknown` or `TsMatchTypeError`.
 * @see https://github.com/DiegoGBrisa/ts-match#typescript-diagnostics-and-troubleshooting
 */
export type DiagnosticArgs<TDiagnostic> = unknown extends TDiagnostic ? readonly [] : readonly [diagnostic: TDiagnostic]

type InvalidRestUsageError<TPattern> = TsMatchTypeError<
  'ts-match: invalid P.rest(...) usage. P.rest(...) can only appear as the final item of a tuple pattern; move it to the end of P.tuple([...]) or remove it.',
  { readonly pattern: TPattern }
>

type InvalidSelectionUsageError<TPattern> = TsMatchTypeError<
  'ts-match: invalid P.select(...) usage. Use one anonymous selection, do not mix anonymous and named selections, and do not place selections inside repeated/negative containers such as P.array(...), P.record(...), P.map(...), P.set(...), or P.exclude(...).',
  { readonly pattern: TPattern }
>

/**
 * Compile-time diagnostic gate for pattern helper placement.
 *
 * Public pattern-building APIs intersect their pattern argument with this type so
 * invalid `P.rest(...)` or `P.select(...)` placement produces readable TypeScript
 * diagnostics before runtime.
 *
 * @typeParam TPattern - Pattern structure being validated.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export type PatternStructureArgument<TPattern> =
  RestUsageValid<TPattern> extends false
    ? InvalidRestUsageError<TPattern>
    : SelectionModeOf<TPattern> extends 'invalid'
      ? InvalidSelectionUsageError<TPattern>
      : unknown

/**
 * Compile-time diagnostic gate for a `match(...).with(...)` pattern.
 *
 * This validates helper placement and reports impossible patterns that cannot
 * match the current input type.
 *
 * @typeParam TValue - Current remaining input type.
 * @typeParam TPattern - Pattern supplied to `.with(...)`.
 * @see https://github.com/DiegoGBrisa/ts-match#impossible-cases
 */
export type MatchPatternArgument<TValue, TPattern> =
  PatternStructureArgument<TPattern> extends infer TDiagnostic
    ? TDiagnostic extends TsMatchTypeError<string, unknown>
      ? TDiagnostic
      : [MatchedValue<TValue, TPattern>] extends [never]
        ? TsMatchTypeError<
            'ts-match: this pattern cannot match the current input type. Remove the impossible .with(...) case, fix the pattern, or narrow/widen the input before matching.',
            { readonly input: TValue; readonly pattern: TPattern }
          >
        : unknown
    : unknown

/**
 * Compile-time diagnostic gate for repeated container item patterns.
 *
 * Repeated arrays and records reject selections because multiple runtime items
 * would make one handler payload ambiguous.
 *
 * @typeParam TPattern - Repeated item or entry pattern.
 * @typeParam TApi - Public helper name used in diagnostics.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export type RepeatedPatternArgument<TPattern, TApi extends string> = PatternStructureArgument<TPattern> &
  (ContainsSelection<TPattern> extends true
    ? TsMatchTypeError<
        'ts-match: repeated container patterns cannot contain P.select(...). Move the selection outside the repeated pattern or match a single item first.',
        { readonly api: TApi; readonly pattern: TPattern }
      >
    : unknown)

/**
 * Compile-time diagnostic gate for `P.exclude(...)` patterns.
 *
 * Negative patterns reject selections because there is no positive matched value
 * to capture when the exclusion succeeds.
 *
 * @typeParam TPattern - Excluded pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export type ExcludePatternArgument<TPattern> = PatternStructureArgument<TPattern> &
  (ContainsSelection<TPattern> extends true
    ? TsMatchTypeError<
        'ts-match: P.exclude(pattern) cannot contain P.select(...). Remove P.select(...) or move the selection outside P.exclude(...).',
        { readonly pattern: TPattern }
      >
    : unknown)

/**
 * Compile-time diagnostic gate for `P.tuple(...)` item arrays.
 *
 * @typeParam TPatterns - Tuple item pattern list.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
export type TuplePatternArgument<TPatterns extends readonly unknown[]> = PatternStructureArgument<TPatterns>

/**
 * Compile-time diagnostic gate for record key patterns.
 *
 * Key patterns must be able to match JavaScript property keys and cannot contain
 * selections because record matching repeats over every key.
 *
 * @typeParam TKeyPattern - Pattern supplied for record keys.
 * @typeParam TApi - Public helper name used in diagnostics.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export type RecordKeyPatternArgument<TKeyPattern, TApi extends string> = PatternStructureArgument<TKeyPattern> &
  (ContainsSelection<TKeyPattern> extends true
    ? TsMatchTypeError<
        'ts-match: record key patterns cannot contain P.select(...). Record patterns repeat across keys, so selections would be ambiguous.',
        { readonly api: TApi; readonly keyPattern: TKeyPattern }
      >
    : unknown) &
  ([Extract<InferPattern<TKeyPattern>, PropertyKey>] extends [never]
    ? TsMatchTypeError<
        'ts-match: record key pattern cannot match JavaScript property keys. Use a string, number, or symbol-compatible key pattern.',
        { readonly api: TApi; readonly keyPattern: TKeyPattern; readonly inferredKey: InferPattern<TKeyPattern> }
      >
    : unknown)

/**
 * Compile-time diagnostic gate for record value patterns.
 *
 * Value patterns cannot contain selections because record matching repeats over
 * every enumerable value.
 *
 * @typeParam TValuePattern - Pattern supplied for record values.
 * @typeParam TApi - Public helper name used in diagnostics.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export type RecordValuePatternArgument<TValuePattern, TApi extends string> = PatternStructureArgument<TValuePattern> &
  (ContainsSelection<TValuePattern> extends true
    ? TsMatchTypeError<
        'ts-match: record value patterns cannot contain P.select(...). Record patterns repeat across values, so selections would be ambiguous.',
        { readonly api: TApi; readonly valuePattern: TValuePattern }
      >
    : unknown)

/**
 * Compile-time diagnostic gate for `match(...).exhaustive()`.
 *
 * When remaining cases are not `never`, this type produces the readable
 * non-exhaustive diagnostic shown in editor and CI output.
 *
 * @typeParam TRemaining - Cases not yet covered by the match chain.
 * @typeParam TApi - Public API name used in diagnostics.
 * @see https://github.com/DiegoGBrisa/ts-match#missing-exhaustive-cases
 */
export type NonExhaustiveMatchArgument<TRemaining, TApi extends string> = [TRemaining] extends [never]
  ? unknown
  : TsMatchTypeError<
      'ts-match: match is not exhaustive. Add handlers for the remaining case(s), or use .otherwise(...) when a fallback is intentional.',
      { readonly api: TApi; readonly remaining: TRemaining }
    >

type TrueInUnion<TValue> = true extends TValue ? true : false

type TuplePathExists<TValue, TPath extends readonly PropertyKey[]> = TPath extends readonly []
  ? true
  : TPath extends readonly [infer THead extends PropertyKey, ...infer TTail extends PropertyKey[]]
    ? TrueInUnion<
        TValue extends unknown
          ? TValue extends null | undefined
            ? false
            : THead extends keyof TValue
              ? TuplePathExists<TValue[THead], TTail>
              : false
          : false
      >
    : true

type DotPathExists<TValue, TPath extends string> = TPath extends `${infer THead}.${infer TTail}`
  ? TrueInUnion<
      TValue extends unknown
        ? TValue extends null | undefined
          ? false
          : THead extends keyof TValue
            ? DotPathExists<TValue[THead], TTail>
            : false
        : false
    >
  : TrueInUnion<
      TValue extends unknown
        ? TValue extends null | undefined
          ? false
          : TPath extends keyof TValue
            ? true
            : false
        : false
    >

type MatchByPathExists<TValue, TPath extends PropertyPath> =
  IsUnsafe<TValue> extends true
    ? true
    : TPath extends readonly PropertyKey[]
      ? TuplePathExists<TValue, TPath>
      : TPath extends string
        ? string extends TPath
          ? false
          : DotPathExists<TValue, TPath>
        : false

/**
 * Compile-time diagnostic gate for `matchBy(value, path)` paths.
 *
 * The path must exist on the input type and resolve to a usable discriminant tag.
 * Dot paths are checked by segment; tuple paths support symbol keys and keys that
 * contain dots.
 *
 * @typeParam TValue - Value type being matched.
 * @typeParam TPath - Direct key, dot path, or tuple path.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-paths
 */
export type MatchByPathArgument<TValue, TPath extends PropertyPath> =
  MatchByPathExists<TValue, TPath> extends true
    ? [Extract<PathValue<TValue, TPath>, Discriminant>] extends [never]
      ? TsMatchTypeError<
          'ts-match: matchBy path resolves to a value that cannot be used as a tag. Use a path whose value is a string, number, symbol, boolean, null, or undefined.',
          { readonly path: TPath; readonly pathValue: PathValue<TValue, TPath> }
        >
      : unknown
    : TsMatchTypeError<
        'ts-match: invalid matchBy path. Use an existing direct key, valid dot path, or tuple path. Use tuple paths for symbol keys or keys that contain dots.',
        { readonly path: TPath; readonly value: TValue }
      >

/**
 * Compile-time diagnostic gate for one `matchBy(...).with(tag, handler)` tag.
 *
 * Tags must be JavaScript discriminants and must be possible values at the
 * selected path.
 *
 * @typeParam TValue - Value type being matched.
 * @typeParam TPath - Selected path.
 * @typeParam TTag - Candidate tag.
 * @see https://github.com/DiegoGBrisa/ts-match#impossible-cases
 */
export type MatchByTagArgument<TValue, TPath extends PropertyPath, TTag> = TTag extends Discriminant
  ? TTag extends PathValue<TValue, TPath>
    ? unknown
    : TsMatchTypeError<
        'ts-match: this matchBy tag cannot occur at the selected path. Remove the impossible tag or fix the matchBy path.',
        { readonly path: TPath; readonly tag: TTag; readonly expected: PathValue<TValue, TPath> }
      >
  : TsMatchTypeError<
      'ts-match: matchBy tags must be JavaScript discriminants. Use string, number, symbol, boolean, null, or undefined tags.',
      { readonly path: TPath; readonly tag: TTag }
    >

/**
 * Maps every variadic `matchBy(...).with(...tags, handler)` tag through diagnostics.
 *
 * @typeParam TValue - Value type being matched.
 * @typeParam TPath - Selected path.
 * @typeParam TTags - Variadic tag tuple.
 * @see https://github.com/DiegoGBrisa/ts-match#withtags-handler
 */
export type MatchByTagsArgument<TValue, TPath extends PropertyPath, TTags extends readonly unknown[]> = {
  readonly [K in keyof TTags]: TTags[K] & MatchByTagArgument<TValue, TPath, TTags[K]>
}

/**
 * Compile-time diagnostic gate for `matchBy(...).exhaustive()`.
 *
 * When remaining tag cases are not fully handled, this type reports the remaining
 * tag/value information in a readable diagnostic.
 *
 * @typeParam TRemaining - Value union not yet handled by the chain.
 * @typeParam TPath - Selected path used to compute remaining tags.
 * @see https://github.com/DiegoGBrisa/ts-match#missing-exhaustive-cases
 */
export type NonExhaustiveMatchByArgument<TRemaining, TPath extends PropertyPath> = [TRemaining] extends [never]
  ? unknown
  : TsMatchTypeError<
      'ts-match: matchBy is not exhaustive for the selected path. Add handlers for the remaining tag(s), or use .otherwise(...) when a fallback is intentional.',
      { readonly path: TPath; readonly remaining: PathValue<TRemaining, TPath>; readonly remainingValue: TRemaining }
    >

export type ObjectCaseMapSupportArgument<TTags> =
  IsFiniteCaseUnion<TTags> extends true
    ? Extract<TTags, null | undefined> extends never
      ? HasNormalizedCaseKeyCollisions<TTags> extends true
        ? TsMatchTypeError<
            'ts-match: object-map case keys collide after JavaScript key normalization. Use tuple-entry cases or grouped callback cases instead.',
            { readonly tags: TTags }
          >
        : unknown
      : TsMatchTypeError<
          'ts-match: object-map cases cannot represent null or undefined tags. Use tuple-entry cases or grouped callback cases instead.',
          { readonly tags: TTags }
        >
    : TsMatchTypeError<
        'ts-match: object-map cases require a finite literal tag union. Use .with(...).exhaustive(), .partial(...).otherwise(...), or tuple-entry cases for broad tags.',
        { readonly tags: TTags }
      >

type MissingObjectCaseTag<THandlers, TTag> = Extract<keyof THandlers, ObjectCaseKeys<TTag>> extends never ? TTag : never

type MissingObjectCaseTags<THandlers, TTags> = TTags extends unknown ? MissingObjectCaseTag<THandlers, TTags> : never

type MissingObjectCaseKeysArgument<THandlers, TTags> =
  MissingObjectCaseTags<THandlers, TTags> extends infer TMissing
    ? [TMissing] extends [never]
      ? unknown
      : TsMatchTypeError<
          'ts-match: object-map cases are missing required key(s). Add handlers for the missing keys or use .partial(...).otherwise(...).',
          { readonly missing: TMissing; readonly expected: TTags }
        >
    : unknown

/**
 * Compile-time diagnostic gate for exhaustive object-map `.cases({...})` inputs.
 *
 * Object maps require finite literal tags, no nullish tags, no key-normalization
 * collisions, and no missing required keys.
 *
 * @typeParam TTags - Expected tag union at the selected path.
 * @typeParam THandlers - Handler object supplied by the caller.
 * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
 */
export type ObjectCaseMapArgument<TTags, THandlers> = ObjectCaseMapSupportArgument<TTags> &
  MissingObjectCaseKeysArgument<THandlers, TTags>

type ExtraCaseTagsArgument<TAllowedTags, TActualTags> =
  Exclude<TActualTags, TAllowedTags> extends infer TExtra
    ? [TExtra] extends [never]
      ? unknown
      : TsMatchTypeError<
          'ts-match: grouped case contains tag(s) that cannot occur at this matchBy path. Remove the impossible tag(s) or fix the path.',
          { readonly extra: TExtra; readonly expected: TAllowedTags }
        >
    : unknown

type MissingCaseTagsArgument<TExpectedTags, THandledTags> =
  IsFiniteCaseUnion<TExpectedTags> extends true
    ? Exclude<TExpectedTags, THandledTags> extends infer TMissing
      ? [TMissing] extends [never]
        ? unknown
        : TsMatchTypeError<
            'ts-match: cases are not exhaustive. Add handlers for the missing tag(s), or use .partial(...).otherwise(...).',
            { readonly missing: TMissing; readonly expected: TExpectedTags }
          >
      : unknown
    : TsMatchTypeError<
        'ts-match: exhaustive cases require a finite literal tag union. Use .partial(...).otherwise(...) or .with(...).otherwise(...) for broad tags.',
        { readonly expected: TExpectedTags }
      >

/**
 * Compile-time diagnostic gate for exhaustive tuple/grouped case entries.
 *
 * Ensures grouped entries do not include impossible tags and do include every
 * expected finite tag.
 *
 * @typeParam TExpectedTags - Tag union that must be handled.
 * @typeParam THandledTags - Tags covered by the supplied entries.
 * @see https://github.com/DiegoGBrisa/ts-match#grouped-case-inference
 */
export type ExhaustiveEntriesArgument<TExpectedTags, THandledTags> = ExtraCaseTagsArgument<
  TExpectedTags,
  THandledTags
> &
  MissingCaseTagsArgument<TExpectedTags, THandledTags>

/**
 * Compile-time diagnostic gate for partial tuple/grouped case entries.
 *
 * Partial entries may omit tags but still cannot include tags that are impossible
 * at the selected path.
 *
 * @typeParam TExpectedTags - Tag union that may be handled.
 * @typeParam THandledTags - Tags covered by the supplied entries.
 * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
 */
export type PartialEntriesArgument<TExpectedTags, THandledTags> = ExtraCaseTagsArgument<TExpectedTags, THandledTags>

type OptionalSelectionPayload<TPayload> = [TPayload] extends [never]
  ? never
  : TPayload extends object
    ? { [K in keyof TPayload]: TPayload[K] | undefined }
    : TPayload | undefined

type SelectPayload<TValue, TPattern> =
  TPattern extends AnonymousSelectPattern<infer TInner>
    ? MatchedValue<TValue, TInner>
    : TPattern extends NamedSelectPattern<infer TName, infer TInner>
      ? { [K in TName]: MatchedValue<TValue, TInner> }
      : TPattern extends UnionPattern<infer TPatterns>
        ? SelectPayload<TValue, TPatterns[number]>
        : TPattern extends OptionalPattern<infer TInner>
          ? OptionalSelectionPayload<SelectPayload<Exclude<TValue, undefined>, TInner>>
          : TPattern extends ArrayPattern<infer TInner>
            ? TValue extends readonly (infer TItem)[]
              ? SelectPayload<TItem, TInner>
              : never
            : TPattern extends NonEmptyArrayPattern<infer TInner>
              ? TValue extends readonly (infer TItem)[]
                ? SelectPayload<TItem, TInner>
                : never
              : TPattern extends TuplePattern<infer TItems>
                ? SelectPayloadFromTuple<TValue, TItems>
                : TPattern extends readonly unknown[]
                  ? SelectPayloadFromTuple<TValue, TPattern>
                  : TPattern extends ExactPattern<infer TInner>
                    ? SelectPayload<TValue, TInner>
                    : TPattern extends object
                      ? SelectPayloadFromObject<TValue, TPattern>
                      : never

type ObjectSelectPayloadUnion<TValue, TPattern extends object> = {
  [K in keyof TPattern]-?: K extends keyof TValue ? SelectPayload<TValue[K], TPattern[K]> : never
}[keyof TPattern]

type SelectPayloadFromObject<TValue, TPattern extends object> = UnionToIntersection<
  ObjectSelectPayloadUnion<TValue, TPattern>
>

type SelectPayloadFromTuple<TValue, TPatterns extends readonly unknown[]> = UnionToIntersection<
  SelectPayloadFromTupleUnion<TValue, TPatterns>
>

type SelectPayloadFromTupleUnion<TValue, TPatterns extends readonly unknown[]> = TValue extends readonly [
  infer THead,
  ...infer TTail,
]
  ? TPatterns extends readonly [infer PHead, ...infer PTail]
    ? PHead extends RestPattern<infer TRest>
      ? SelectPayload<TValue[number], TRest>
      : SelectPayload<THead, PHead> | SelectPayloadFromTupleUnion<TTail, PTail>
    : never
  : never

/**
 * Computes the value passed to a `match(...).with(...)` handler.
 *
 * Patterns without selections pass the narrowed matched value. Anonymous
 * selections pass the selected value. Named selections pass an object of captures.
 *
 * @typeParam TValue - Candidate value type before the branch.
 * @typeParam TPattern - Pattern used by the branch.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
export type HandlerInput<TValue, TPattern> = TPattern extends unknown
  ? Simplify<HandlerInputForPattern<TValue, TPattern>>
  : never

type HandlerInputForPattern<TValue, TPattern> =
  TPattern extends UnionPattern<infer TPatterns>
    ? HandlerInput<TValue, TPatterns[number]>
    : TPattern extends OptionalPattern<infer TInner>
      ? Extract<TValue, undefined> | HandlerInput<Exclude<TValue, undefined>, TInner>
      : SelectPayload<MatchedValue<TValue, TPattern>, TPattern> extends infer TSelect
        ? [TSelect] extends [never]
          ? MatchedValue<TValue, TPattern>
          : Simplify<TSelect>
        : never

/**
 * Value type produced by `isMatching` and `assertMatching` after a successful check.
 *
 * @typeParam TValue - Original value type.
 * @typeParam TPattern - Pattern used for validation.
 * @see https://github.com/DiegoGBrisa/ts-match#ismatching
 */
export type GuardedValue<TValue, TPattern> = TValue & MatchedValue<TValue, TPattern>

type DotPathLeaf =
  | Primitive
  | readonly unknown[]
  | ((...args: never[]) => unknown)
  | Date
  | RegExp
  | Map<unknown, unknown>
  | Set<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | PromiseLike<unknown>

type DotPathKey<TKey extends string> = TKey extends `${string}.${string}` ? never : TKey

type DotPathChild<TValue, TKey extends string> =
  NonNullable<TValue> extends DotPathLeaf
    ? never
    : NonNullable<TValue> extends object
      ? DotPath<NonNullable<TValue>> extends infer TChild extends string
        ? `${TKey}.${TChild}`
        : never
      : never

type DotPath<TValue> = TValue extends unknown
  ? TValue extends object
    ? {
        [K in Extract<keyof TValue, string>]: DotPathKey<K> | DotPathChild<TValue[K], DotPathKey<K>>
      }[Extract<keyof TValue, string>]
    : never
  : never

type TuplePathKey<TKey extends PropertyKey> = string extends TKey
  ? never
  : number extends TKey
    ? never
    : symbol extends TKey
      ? never
      : TKey

type TuplePathChild<TValue, TKey extends PropertyKey> =
  NonNullable<TValue> extends DotPathLeaf
    ? never
    : NonNullable<TValue> extends object
      ? TuplePath<NonNullable<TValue>> extends infer TChild extends readonly PropertyKey[]
        ? readonly [TKey, ...TChild]
        : never
      : never

type TuplePath<TValue> = TValue extends unknown
  ? TValue extends object
    ? {
        [K in TuplePathKey<keyof TValue>]: readonly [K] | TuplePathChild<TValue[K], K>
      }[TuplePathKey<keyof TValue>]
    : never
  : never

type SuggestedMatchByPath<TValue, TPath extends PropertyPath> =
  Extract<PathValue<TValue, TPath>, Discriminant> extends infer TTags
    ? IsFiniteCaseUnion<TTags> extends true
      ? [Exclude<TTags, undefined>] extends [never]
        ? never
        : TPath
      : never
    : never

type DotDiscriminantPath<TValue> =
  DotPath<TValue> extends infer TPath ? (TPath extends string ? SuggestedMatchByPath<TValue, TPath> : never) : never

type TupleDiscriminantPath<TValue> =
  TuplePath<TValue> extends infer TPath
    ? TPath extends readonly PropertyKey[]
      ? SuggestedMatchByPath<TValue, TPath>
      : never
    : never

type MatchByStringPath<TValue> = IsUnsafe<TValue> extends true ? string : DotDiscriminantPath<TValue>
type MatchByTuplePath<TValue> = IsUnsafe<TValue> extends true ? readonly PropertyKey[] : TupleDiscriminantPath<TValue>

/**
 * Autocomplete-friendly path type accepted by `matchBy(value, path)`.
 *
 * For known object inputs, string paths are narrowed to common direct keys and
 * nested dot paths whose resolved value can act as a discriminant tag. Tuple
 * paths provide the same autocomplete-friendly traversal for symbols and literal
 * keys that contain dots.
 *
 * @typeParam TValue - Root value type passed to `matchBy`.
 * @see https://github.com/DiegoGBrisa/ts-match#nested-dot-path-and-tuple-path
 */
export type MatchByPath<TValue> = MatchByStringPath<TValue> | MatchByTuplePath<TValue>

/**
 * Resolves the TypeScript value type at a `matchBy` property path.
 *
 * Missing or nullable path segments contribute `undefined`, matching runtime path
 * traversal behavior.
 *
 * @typeParam TValue - Root value type.
 * @typeParam TPath - Direct key, dot path, or tuple path.
 * @see https://github.com/DiegoGBrisa/ts-match#nested-dot-path-and-tuple-path
 */
export type PathValue<TValue, TPath extends PropertyPath> = TPath extends readonly PropertyKey[]
  ? PathValueFromTuple<TValue, TPath>
  : TPath extends string
    ? PathValueFromDot<TValue, TPath>
    : never

type PathValueFromDot<TValue, TPath extends string> = TPath extends `${infer THead}.${infer TTail}`
  ? PathValueStep<TValue, THead, TTail>
  : TValue extends unknown
    ? TValue extends null | undefined
      ? undefined
      : TPath extends keyof TValue
        ? TValue[TPath]
        : undefined
    : never

type PathValueStep<TValue, THead extends string, TTail extends string> = TValue extends unknown
  ? TValue extends null | undefined
    ? undefined
    : THead extends keyof TValue
      ? PathValueFromDot<TValue[THead], TTail>
      : undefined
  : never

type PathValueFromTuple<TValue, TPath extends readonly PropertyKey[]> = TPath extends readonly [
  infer THead extends PropertyKey,
  ...infer TTail extends PropertyKey[],
]
  ? TValue extends unknown
    ? TValue extends null | undefined
      ? undefined
      : THead extends keyof TValue
        ? PathValueFromTuple<TValue[THead], TTail>
        : undefined
    : never
  : TValue

/**
 * Narrows a value union to members whose selected path can match a tag.
 *
 * @typeParam TValue - Root value union.
 * @typeParam TPath - Selected path.
 * @typeParam TTag - Tag used for narrowing.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
export type ExtractByPath<TValue, TPath extends PropertyPath, TTag> = TValue extends unknown
  ? TagOverlaps<PathValue<TValue, TPath>, TTag> extends true
    ? RefineByPath<TValue, TPath, TTag>
    : never
  : never

/**
 * Extracts value union members fully covered by a `matchBy` tag branch.
 *
 * @typeParam TValue - Root value union.
 * @typeParam TPath - Selected path.
 * @typeParam TTag - Tag handled by the branch.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
export type CoveredByPath<TValue, TPath extends PropertyPath, TTag> = TValue extends unknown
  ? TagFullyCovers<PathValue<TValue, TPath>, TTag> extends true
    ? TValue
    : never
  : never

type TagOverlaps<TPathValue, TTag> = [LiteralMatch<TPathValue, TTag>] extends [never]
  ? [TTag] extends [undefined]
    ? undefined extends TPathValue
      ? true
      : false
    : false
  : true

type TagFullyCovers<TPathValue, TTag> = [TPathValue] extends [TTag]
  ? true
  : [TTag] extends [undefined]
    ? undefined extends TPathValue
      ? true
      : false
    : false

type RefineByPath<TValue, TPath extends PropertyPath, TTag> = TPath extends readonly PropertyKey[]
  ? RefineByTuplePath<TValue, TPath, TTag>
  : TPath extends string
    ? RefineByDotPath<TValue, TPath, TTag>
    : TValue

type RefineByDotPath<TValue, TPath extends string, TTag> = TPath extends `${infer THead}.${infer TTail}`
  ? TValue extends object
    ? THead extends keyof TValue
      ? Simplify<Omit<TValue, THead> & { [K in THead]: RefineByDotPath<TValue[K], TTail, TTag> }>
      : TValue
    : TValue
  : TValue extends object
    ? TPath extends keyof TValue
      ? Simplify<Omit<TValue, TPath> & { [K in TPath]: LiteralMatch<TValue[K], TTag> }>
      : TValue
    : TValue

type RefineByTuplePath<TValue, TPath extends readonly PropertyKey[], TTag> = TPath extends readonly [
  infer THead extends PropertyKey,
  ...infer TTail extends PropertyKey[],
]
  ? TValue extends object
    ? THead extends keyof TValue
      ? Simplify<Omit<TValue, THead> & { [K in THead]: RefineByTuplePath<TValue[K], TTail, TTag> }>
      : TValue
    : TValue
  : LiteralMatch<TValue, TTag>

type NormalizedCaseKey<TTag> = TTag extends true
  ? 'true'
  : TTag extends false
    ? 'false'
    : TTag extends number
      ? `${TTag}`
      : TTag extends string | symbol
        ? TTag
        : never

type ObjectCaseTags<TTags> = Exclude<TTags, null | undefined>
/**
 * Property keys an object case map can use for a tag union.
 *
 * @typeParam TTags - Tag union to normalize into object keys.
 * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
 */
export type ObjectCaseKeys<TTags> =
  | NormalizedCaseKey<ObjectCaseTags<TTags>>
  | Extract<ObjectCaseTags<TTags>, string | number | symbol>

type CollidingTags<TAll, TTag> = TAll extends unknown
  ? Equal<TAll, TTag> extends true
    ? never
    : NormalizedCaseKey<TAll> extends NormalizedCaseKey<TTag>
      ? TAll
      : never
  : never

type HasCollisionForTag<TAll, TTag = TAll> = TTag extends unknown
  ? [CollidingTags<TAll, TTag>] extends [never]
    ? false
    : true
  : never

type HasNormalizedCaseKeyCollisions<TTags> = true extends HasCollisionForTag<TTags> ? true : false

type IsFiniteCaseUnion<TTags> = [TTags] extends [never]
  ? false
  : true extends (TTags extends unknown ? IsBroad<TTags> : never)
    ? false
    : true

/**
 * Object-map handler shape for `matchBy(...).cases({...})`.
 *
 * @typeParam TValue - Root value type.
 * @typeParam TPath - Selected path.
 * @typeParam TTags - Tags represented by the map.
 * @see https://github.com/DiegoGBrisa/ts-match#cases
 */
export type CaseMap<TValue, TPath extends PropertyPath, TTags> = {
  [K in ObjectCaseKeys<TTags>]: (value: ExtractByNormalizedKey<TValue, TPath, TTags, K>) => unknown
}

type CaseKeyMatches<TTag, TKey> = NormalizedCaseKey<TTag> extends TKey ? true : TTag extends TKey ? true : false

type ExtractByNormalizedKey<TValue, TPath extends PropertyPath, TTags, TKey> = ExtractByPath<
  TValue,
  TPath,
  TTags extends unknown ? (CaseKeyMatches<TTags, TKey> extends true ? TTags : never) : never
>

/**
 * Compile-time diagnostic gate that rejects extra object-map keys.
 *
 * @typeParam TActual - User-supplied object map.
 * @typeParam TAllowedKeys - Keys allowed for the selected tag union.
 * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
 */
export type NoExtraKeys<TActual, TAllowedKeys extends PropertyKey> =
  Exclude<keyof TActual, TAllowedKeys> extends infer TExtra
    ? [TExtra] extends [never]
      ? unknown
      : {
          readonly [K in Extract<TExtra, PropertyKey>]: TsMatchTypeError<
            'ts-match: object-map case contains an extra key that is not a possible tag. Remove the key, fix the matchBy path, or use tuple-entry cases when object keys are not enough.',
            { readonly key: K; readonly expected: TAllowedKeys }
          >
        }
    : unknown

/**
 * Result object returned by promise matcher safe terminals.
 *
 * The object is intentionally mutable and uses `ok` as the discriminant so
 * callers get straightforward control-flow narrowing without annotations.
 *
 * @typeParam T - Successful resolved output value.
 * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
 */
export type MatchPromiseResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

/**
 * Recursively unwraps promise-like return types from promise match handlers.
 *
 * @typeParam T - Handler return type to unwrap.
 * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
 */
export type AwaitedReturn<T> = T extends PromiseLike<infer TResult> ? AwaitedReturn<TResult> : T
