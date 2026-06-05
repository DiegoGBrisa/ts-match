import { PATTERN_TOKEN } from './tokens.js'
import type {
  AbstractConstructor,
  AnonymousSelectPattern,
  ArrayPattern,
  CollectPattern,
  DatePattern,
  EntryMapPattern,
  ErrorPattern,
  ExactPattern,
  ExcludePattern,
  FalsyPattern,
  FinitePattern,
  GuardPattern,
  HomogeneousMapPattern,
  InstanceOfPattern,
  IntegerPattern,
  LiteralPattern,
  MapEntryPattern,
  NamedSelectPattern,
  NanPattern,
  NonEmptyArrayPattern,
  NonEmptyRecordPattern,
  NullishPattern,
  OptionalPattern,
  PatternStructureArgument,
  PrimitivePattern,
  Primitive,
  PrimitiveName,
  RecordKeyPatternArgument,
  RecordPattern,
  RecordValuePatternArgument,
  RegexPattern,
  RegexpPattern,
  RepeatedPatternArgument,
  RestPattern,
  SelectPattern,
  SetPattern,
  TemporalPattern,
  TemporalPatternKind,
  TruthyPattern,
  TuplePattern,
  TuplePatternArgument,
  UnionPattern,
  WildcardPattern,
  ExcludePatternArgument,
} from './types.js'

/**
 * Freezes a pattern helper object before exposing it through the public API.
 *
 * Pattern helpers are immutable value objects. Freezing them prevents accidental
 * mutation after construction and keeps reused helpers safe across match calls.
 *
 * @param pattern - Newly constructed pattern helper object.
 * @returns The same pattern object, frozen.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#pattern-helpers
 */
function freezePattern<TPattern extends object>(pattern: TPattern): TPattern {
  return Object.freeze(pattern)
}

/**
 * Creates a primitive helper object for one JavaScript primitive category.
 *
 * @param name - Runtime primitive category stored on the helper.
 * @returns Frozen primitive pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
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

type PatternListArgument<TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: TPatterns[K] & PatternStructureArgument<TPatterns[K], true>
}

type PatternHelperArgumentError<TMessage extends string, TDetails = unknown> = {
  readonly [K in TMessage]: TDetails
} & {
  readonly 'ts-match: diagnostic': true
}

type TsMatchDiagnostic = {
  readonly 'ts-match: diagnostic': true
}

type PatternStructureDiagnostic<TPattern, TAllowCollect extends boolean = false> =
  PatternStructureArgument<TPattern, TAllowCollect> extends infer TDiagnostic
    ? TDiagnostic extends TsMatchDiagnostic
      ? TDiagnostic
      : never
    : never

type PatternStructureArgumentFromDiagnostic<TDiagnostic> = [TDiagnostic] extends [never] ? unknown : TDiagnostic

type PatternListStructureArgument<
  TPatterns extends readonly unknown[],
  TAllowCollect extends boolean = false,
> = PatternStructureArgumentFromDiagnostic<
  TPatterns[number] extends unknown ? PatternStructureDiagnostic<TPatterns[number], TAllowCollect> : never
>

type AnyPatternContainsSelection<TPatterns extends readonly unknown[]> = true extends (
  TPatterns[number] extends unknown ? PatternContainsSelection<TPatterns[number]> : never
)
  ? true
  : false

type ObjectPatternContainsSelection<TPattern extends object> = true extends {
  readonly [K in keyof TPattern]: PatternContainsSelection<TPattern[K]>
}[keyof TPattern]
  ? true
  : false

type PatternContainsSelection<TPattern> = [unknown] extends [TPattern]
  ? false
  : TPattern extends AnonymousSelectPattern<unknown> | NamedSelectPattern<PropertyKey, unknown>
    ? true
    : TPattern extends CollectPattern<PropertyKey, infer TInner>
      ? PatternContainsSelection<TInner>
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
          ? AnyPatternContainsSelection<TPatterns>
          : TPattern extends ExcludePattern<infer TInner>
            ? PatternContainsSelection<TInner>
            : TPattern extends OptionalPattern<infer TInner>
              ? PatternContainsSelection<TInner>
              : TPattern extends ArrayPattern<infer TInner>
                ? PatternContainsSelection<TInner>
                : TPattern extends NonEmptyArrayPattern<infer TInner>
                  ? PatternContainsSelection<TInner>
                  : TPattern extends TuplePattern<infer TItems>
                    ? AnyPatternContainsSelection<TItems>
                    : TPattern extends RestPattern<infer TInner>
                      ? PatternContainsSelection<TInner>
                      : TPattern extends ExactPattern<infer TInner>
                        ? PatternContainsSelection<TInner>
                        : TPattern extends RecordPattern<infer TKey, infer TValue>
                          ? PatternContainsSelection<TKey> extends true
                            ? true
                            : PatternContainsSelection<TValue>
                          : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                            ? PatternContainsSelection<TKey> extends true
                              ? true
                              : PatternContainsSelection<TValue>
                            : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                              ? PatternContainsSelection<TKey> extends true
                                ? true
                                : PatternContainsSelection<TValue>
                              : TPattern extends EntryMapPattern<infer TEntries>
                                ? TEntries extends readonly MapEntryPattern[]
                                  ? MapEntriesContainSelection<TEntries>
                                  : false
                                : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                                  ? AnyPatternContainsSelection<TPatterns>
                                  : TPattern extends readonly unknown[]
                                    ? AnyPatternContainsSelection<TPattern>
                                    : TPattern extends object
                                      ? ObjectPatternContainsSelection<TPattern>
                                      : false

type MapEntryArgs<TArgs extends readonly unknown[]> = TArgs extends readonly [
  infer THead extends MapEntryPattern,
  ...infer TTail extends readonly MapEntryPattern[],
]
  ? readonly [THead, ...TTail]
  : readonly MapEntryPattern[]

type AnyMapEntryArg<TArgs extends readonly unknown[]> = true extends {
  readonly [K in keyof TArgs]: TArgs[K] extends MapEntryPattern ? true : false
}[number]
  ? true
  : false

type AllMapEntryArgs<TArgs extends readonly unknown[]> = false extends {
  readonly [K in keyof TArgs]: TArgs[K] extends MapEntryPattern ? true : false
}[number]
  ? false
  : true

type MapPatternFromArgs<TArgs extends readonly unknown[]> = TArgs extends readonly []
  ? never
  : AllMapEntryArgs<TArgs> extends true
    ? EntryMapPattern<MapEntryArgs<TArgs>>
    : AnyMapEntryArg<TArgs> extends true
      ? never
      : TArgs extends readonly [infer TKeyPattern, infer TValuePattern]
        ? HomogeneousMapPattern<TKeyPattern, TValuePattern>
        : never

type MapSelectionArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: Map key/value patterns cannot contain P.select(...). Map patterns scan entries, so selections would be ambiguous.',
  { readonly api: 'P.map'; readonly args: TArgs }
>

type MapTopLevelArrayArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: P.map(keyPattern, valuePattern) cannot use top-level array patterns. Use P.tuple([...]) for tuple keys/values, or use P.map([keyPattern, valuePattern], ...) for required entries.',
  { readonly api: 'P.map'; readonly args: TArgs }
>

type MapArityArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: P.map(...) expects either P.map(keyPattern, valuePattern) or P.map([keyPattern, valuePattern], ...).',
  { readonly api: 'P.map'; readonly args: TArgs }
>

type MapEntryContainsSelection<TEntry> = TEntry extends readonly [infer TKeyPattern, infer TValuePattern]
  ? PatternContainsSelection<TKeyPattern> extends true
    ? true
    : PatternContainsSelection<TValuePattern>
  : false

type MapEntriesContainSelection<TEntries extends readonly unknown[]> = true extends (
  TEntries[number] extends unknown ? MapEntryContainsSelection<TEntries[number]> : never
)
  ? true
  : false

type MapPairContainsSelection<TKeyPattern, TValuePattern> =
  PatternContainsSelection<TKeyPattern> extends true ? true : PatternContainsSelection<TValuePattern>

type MapEntryStructureDiagnostic<TEntry> = TEntry extends readonly [infer TKeyPattern, infer TValuePattern]
  ? PatternStructureDiagnostic<TKeyPattern, true> | PatternStructureDiagnostic<TValuePattern, true>
  : never

type MapEntriesStructureArgument<TEntries extends readonly unknown[]> = PatternStructureArgumentFromDiagnostic<
  TEntries[number] extends unknown ? MapEntryStructureDiagnostic<TEntries[number]> : never
>

type MapPairStructureArgument<TKeyPattern, TValuePattern> = PatternStructureArgumentFromDiagnostic<
  PatternStructureDiagnostic<TKeyPattern, true> | PatternStructureDiagnostic<TValuePattern, true>
>

type MapPatternArgument<TArgs extends readonly unknown[]> =
  AllMapEntryArgs<TArgs> extends true
    ? MapEntriesContainSelection<TArgs> extends true
      ? MapSelectionArgumentError<TArgs>
      : MapEntriesStructureArgument<TArgs>
    : AnyMapEntryArg<TArgs> extends true
      ? MapTopLevelArrayArgumentError<TArgs>
      : TArgs extends readonly [infer TKeyPattern, infer TValuePattern]
        ? MapPairContainsSelection<TKeyPattern, TValuePattern> extends true
          ? MapSelectionArgumentError<TArgs>
          : TKeyPattern extends readonly unknown[]
            ? MapTopLevelArrayArgumentError<TArgs>
            : TValuePattern extends readonly unknown[]
              ? MapTopLevelArrayArgumentError<TArgs>
              : MapPairStructureArgument<TKeyPattern, TValuePattern>
        : MapArityArgumentError<TArgs>

type SetPatternFromArgs<TArgs extends readonly unknown[]> = TArgs extends readonly []
  ? never
  : TArgs extends readonly [infer TPattern]
    ? SetPattern<readonly [TPattern], 'homogeneous'>
    : TArgs extends readonly [unknown, unknown, ...unknown[]]
      ? SetPattern<TArgs, 'values'>
      : never

type SetSelectionArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: Set value patterns cannot contain P.select(...). Set patterns scan values, so selections would be ambiguous.',
  { readonly api: 'P.set'; readonly args: TArgs }
>

type SetPatternArgument<TArgs extends readonly unknown[]> =
  AnyPatternContainsSelection<TArgs> extends true
    ? SetSelectionArgumentError<TArgs>
    : PatternListStructureArgument<TArgs, true>

/**
 * Matches when any supplied pattern matches.
 *
 * Use `P.union(...)` to express one or more alternatives inside a single
 * structural pattern rather than adding separate branches. Each argument must be
 * a valid public pattern, literal pattern, object pattern, array pattern, or
 * tuple pattern.
 *
 * @param patterns - One or more alternative patterns tested from left to right.
 * @returns A frozen union pattern helper.
 * @example
 * ```ts
 * match(value).with(P.union('draft', 'queued'), () => 'pending').otherwise(() => 'done')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#pattern-helpers
 */
export function pUnion<const TPattern extends Primitive>(
  ...patterns: readonly [TPattern, ...TPattern[]]
): UnionPattern<readonly [TPattern, ...TPattern[]]>
export function pUnion<const TPatterns extends readonly [unknown, ...unknown[]]>(
  ...patterns: PatternListArgument<TPatterns>
): UnionPattern<TPatterns>
export function pUnion(...patterns: readonly [unknown, ...unknown[]]): UnionPattern<readonly [unknown, ...unknown[]]> {
  if (patterns.length === 0) throw new TypeError('P.union(...) requires at least one pattern.')
  return freezePattern({ [PATTERN_TOKEN]: 'union', patterns })
}

/**
 * Matches values that do not match the supplied pattern.
 *
 * Use this for exclusion branches such as "anything except archived". Selection
 * helpers are not allowed inside exclusions because no positive match payload is
 * available to capture.
 *
 * @param pattern - Pattern to reject.
 * @returns A frozen exclusion pattern helper.
 * @example
 * ```ts
 * match(status).with(P.exclude('archived'), () => 'active').otherwise(() => 'archived')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#pattern-helpers
 */
export function pExclude<const TPattern>(
  pattern: TPattern & ExcludePatternArgument<TPattern>,
): ExcludePattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'exclude', pattern })
}

/**
 * Accepts `undefined` values and missing object properties for a nested pattern.
 *
 * Use this inside object patterns when a property is optional, or as a direct
 * value pattern when `undefined` should be accepted in addition to the nested
 * pattern. When the property is absent, nested selections capture `undefined`.
 *
 * @param pattern - Pattern to apply when the value or property is present.
 * @returns A frozen optional pattern helper.
 * @example
 * ```ts
 * match(value).with({ name: P.optional(P.string) }, (user) => user.name).otherwise(() => undefined)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pOptional<const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): OptionalPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'optional', pattern })
}

/**
 * Matches arrays whose every item matches the supplied pattern.
 *
 * The value must be an array. Empty arrays match because every item satisfies the
 * item pattern vacuously. `P.select(...)` is intentionally not supported inside
 * repeated array item patterns because multiple captures would be ambiguous.
 *
 * @param item - Pattern required for every array item.
 * @returns A frozen repeated-array pattern helper.
 * @example
 * ```ts
 * match(value).with(P.array(P.string), (items) => items.join(',')).otherwise(() => '')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pArray<const TPattern>(
  item: TPattern & RepeatedPatternArgument<TPattern, 'P.array'>,
): ArrayPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'array', item })
}

/**
 * Matches non-empty arrays whose every item matches the supplied pattern.
 *
 * Use this when at least one item is required. Like `P.array`, selections inside
 * the repeated item pattern are rejected to avoid ambiguous multi-item captures.
 *
 * @param item - Pattern required for every array item.
 * @returns A frozen non-empty-array pattern helper.
 * @example
 * ```ts
 * match(value).with(P.nonEmptyArray(P.number), ([first]) => first).otherwise(() => 0)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pNonEmptyArray<const TPattern>(
  item: TPattern & RepeatedPatternArgument<TPattern, 'P.nonEmptyArray'>,
): NonEmptyArrayPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'non-empty-array', item })
}

/**
 * Matches actual `Map` instances.
 *
 * Use `P.map(keyPattern, valuePattern)` for homogeneous maps where every entry
 * must match the same key and value patterns. Use `P.map([key, value], ...)` for
 * required-entry mode, where distinct Map entries satisfy each clause and extra
 * entries are allowed unless wrapped in `P.exact(...)`.
 *
 * @param key - Homogeneous key pattern.
 * @param value - Homogeneous value pattern.
 * @returns A frozen Map pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#map-and-set-patterns
 */
export function pMap<const TArgs extends readonly [unknown, ...unknown[]]>(
  ...args: TArgs & MapPatternArgument<TArgs>
): MapPatternFromArgs<TArgs>
export function pMap(
  ...args: readonly unknown[]
): HomogeneousMapPattern<unknown, unknown> | EntryMapPattern<readonly MapEntryPattern[]> {
  if (args.length === 0) throw new TypeError('P.map(...) requires map patterns.')

  const topLevelArrays = args.filter(Array.isArray)
  const entryClauses = args.filter(isMapEntryClause)
  if (entryClauses.length === args.length) {
    return freezePattern({
      [PATTERN_TOKEN]: 'map',
      mode: 'entries',
      key: undefined,
      value: undefined,
      entries: entryClauses,
    })
  }

  if (entryClauses.length > 0) {
    throw new TypeError('P.map(...) cannot mix entry clauses with homogeneous key/value patterns.')
  }

  if (topLevelArrays.length > 0) {
    throw new TypeError(
      'P.map(keyPattern, valuePattern) cannot use top-level array patterns. Use P.tuple([...]) for tuple keys or values.',
    )
  }

  if (args.length !== 2) {
    throw new TypeError('P.map(keyPattern, valuePattern) requires exactly two patterns.')
  }

  return freezePattern({
    [PATTERN_TOKEN]: 'map',
    mode: 'homogeneous',
    key: args[0],
    value: args[1],
    entries: undefined,
  })
}

function isMapEntryClause(value: unknown): value is MapEntryPattern {
  return Array.isArray(value) && value.length === 2
}

/**
 * Matches actual `Set` instances.
 *
 * Use `P.set(valuePattern)` for homogeneous sets where every value must match
 * one pattern. Use `P.set(valuePattern, ...moreValuePatterns)` for required-value
 * mode, where distinct Set values satisfy each clause and extra values are
 * allowed unless wrapped in `P.exact(...)`.
 *
 * @param value - Homogeneous value pattern or first required-value clause.
 * @param moreValues - Additional required-value clauses.
 * @returns A frozen Set pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#map-and-set-patterns
 */
export function pSet<const TArgs extends readonly [unknown, ...unknown[]]>(
  ...values: TArgs & SetPatternArgument<TArgs>
): SetPatternFromArgs<TArgs>
export function pSet(...values: readonly unknown[]): SetPattern<readonly unknown[], 'homogeneous' | 'values'> {
  if (values.length === 0) throw new TypeError('P.set(...) requires at least one value pattern.')
  if (values.length === 1) return freezePattern({ [PATTERN_TOKEN]: 'set', mode: 'homogeneous', values })
  return freezePattern({ [PATTERN_TOKEN]: 'set', mode: 'values', values })
}

/**
 * Matches arrays against positional tuple item patterns.
 *
 * Pass a readonly tuple of item patterns. Use `P.rest(pattern)` only as the final
 * tuple item to match a variable-length suffix. The runtime value must satisfy
 * every positional pattern and the tuple length rules.
 *
 * @param items - Ordered tuple item patterns.
 * @returns A frozen tuple pattern helper.
 * @example
 * ```ts
 * match(value).with(P.tuple([P.string, P.number]), ([name, count]) => count)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pTuple<const TPatterns extends readonly unknown[]>(
  items: TPatterns & TuplePatternArgument<TPatterns>,
): TuplePattern<TPatterns> {
  return freezePattern({ [PATTERN_TOKEN]: 'tuple', items })
}

/**
 * Matches the remaining items in a tuple pattern.
 *
 * `P.rest(pattern)` is valid only as the final item inside `P.tuple([...])`. It
 * requires every remaining runtime array item to match the supplied pattern.
 *
 * @param item - Pattern required for each remaining tuple item.
 * @returns A frozen tuple-rest pattern helper.
 * @throws {TypeError} When used outside a tuple or before the final tuple item.
 * @example
 * ```ts
 * match(value).with(P.tuple([P.string, P.rest(P.number)]), ([head]) => head)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pRest<const TPattern>(
  item: TPattern & PatternStructureArgument<TPattern, true>,
): RestPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'rest', item })
}

/**
 * Matches a pattern while rejecting supported extra object keys or collection
 * entries.
 *
 * Use `P.exact(...)` when a branch should accept only the keys listed in a
 * nested object pattern or only the entries/values consumed by required
 * `P.map(...)` / `P.set(...)` patterns. Homogeneous Map/Set patterns already
 * check every runtime entry/value, so exactness adds no extra constraint there.
 *
 * @param pattern - Object, collection, or pattern structure to match exactly.
 * @returns A frozen exact pattern helper.
 * @example
 * ```ts
 * match(value).with(P.exact({ type: 'ready' }), () => 'ready').otherwise(() => 'other')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 * @see https://github.com/DiegoGBrisa/ts-match#map-and-set-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pExact<const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): ExactPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'exact', pattern })
}

/**
 * Matches values accepted by a predicate or type guard.
 *
 * Use a type guard when you want handler parameters to narrow to a custom type,
 * or a boolean predicate when runtime filtering is enough. The predicate receives
 * the candidate value and must return `true` for a match.
 *
 * @param predicate - Boolean predicate or TypeScript type guard.
 * @returns A frozen predicate pattern helper.
 * @example
 * ```ts
 * match(value).with(P.when((n: number): n is 1 => n === 1), () => 'one').otherwise(() => 'other')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match#boundary-assertions
 */
export function pWhen<TInput, TGuarded extends TInput>(
  predicate: (value: TInput) => value is TGuarded,
): GuardPattern<TGuarded, true>

/**
 * Matches values accepted by a boolean predicate without claiming exhaustiveness coverage.
 *
 * @param predicate - Function that returns `true` when the candidate should match.
 * @returns A frozen predicate pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pWhen<TInput>(predicate: (value: TInput) => boolean): GuardPattern<TInput, false>

/**
 * Creates the runtime predicate pattern used by the public `P.when(...)` overloads.
 *
 * @param predicate - Runtime predicate supplied by the caller.
 * @returns A frozen predicate pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pWhen(predicate: (value: unknown) => boolean): GuardPattern<unknown, boolean> {
  return freezePattern({ [PATTERN_TOKEN]: 'when', predicate, narrows: false })
}

/**
 * Matches values that are instances of a constructor.
 *
 * Use this for class instances and built-in constructors that should be checked
 * with JavaScript's `instanceof` operator.
 *
 * @param constructor - Constructor function used on the right-hand side of `instanceof`.
 * @returns A frozen instance-of pattern helper.
 * @example
 * ```ts
 * match(value).with(P.instanceOf(Error), (error) => error.message).otherwise(() => '')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pInstanceOf<TConstructor extends AbstractConstructor>(
  constructor: TConstructor,
): InstanceOfPattern<TConstructor> {
  return freezePattern({ [PATTERN_TOKEN]: 'instance-of', constructor })
}

/**
 * Captures a matched value and passes that capture to the handler.
 *
 * Use anonymous `P.select()` when the handler should receive one captured value.
 * Use named `P.select(name, pattern?)` when the handler should receive an object
 * of captures. Anonymous and named selections cannot be mixed in one successful
 * pattern, and repeated containers such as `P.array(...)` reject selections.
 *
 * @returns A frozen anonymous selection pattern over the wildcard pattern.
 * @example
 * ```ts
 * match(value).with({ payload: P.select() }, (payload) => payload).otherwise(() => undefined)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#handler-parameters-are-narrowed
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pSelect(): AnonymousSelectPattern<WildcardPattern>

/**
 * Captures a matched value under a property key and passes all named captures to the handler.
 *
 * @param name - Capture key that will appear on the handler payload object.
 * @returns A frozen named selection pattern over the wildcard pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
export function pSelect<const TName extends PropertyKey>(name: TName): NamedSelectPattern<TName, WildcardPattern>

/**
 * Captures a nested pattern match under a property key.
 *
 * @param name - Capture key that will appear on the handler payload object.
 * @param pattern - Pattern that must match before the value is captured.
 * @returns A frozen named selection pattern over `pattern`.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pSelect<const TName extends PropertyKey, const TPattern>(
  name: TName,
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): NamedSelectPattern<TName, TPattern>

/**
 * Creates the runtime selection pattern used by the public `P.select(...)` overloads.
 *
 * @param name - Optional named capture key. Omit it for an anonymous capture.
 * @param pattern - Pattern that must match before the value is captured.
 * @returns A frozen selection pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pSelect(
  name?: PropertyKey,
  pattern: unknown = pWildcard,
): SelectPattern<PropertyKey | undefined, unknown> {
  return freezePattern({ [PATTERN_TOKEN]: 'select', name, pattern })
}

/**
 * Captures every repeated value matched by a nested pattern into a named array.
 *
 * `P.collect(name, pattern)` is valid only inside repeated containers such as
 * `P.array(...)`, `P.record(...)`, `P.map(...)`, and `P.set(...)`. It behaves
 * like a normal matching wrapper: the inner pattern must match before the value
 * is appended to the handler payload array.
 *
 * @param name - Capture key that will appear on the handler payload object.
 * @param pattern - Pattern that must match before the value is collected.
 * @returns A frozen collection capture pattern over `pattern`.
 * @see https://github.com/DiegoGBrisa/ts-match#collection-captures
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pCollect<const TName extends PropertyKey, const TPattern>(
  name: TName,
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): CollectPattern<TName, TPattern>
export function pCollect(name: PropertyKey, pattern: unknown): CollectPattern<PropertyKey, unknown> {
  if (arguments.length < 2) {
    throw new TypeError('P.collect(name, pattern) requires a capture name and pattern.')
  }
  const nameType = typeof name
  if (nameType !== 'string' && nameType !== 'number' && nameType !== 'symbol') {
    throw new TypeError('P.collect(name, pattern) requires a string, number, or symbol capture name.')
  }
  return freezePattern({ [PATTERN_TOKEN]: 'collect', name, pattern })
}

/**
 * Matches plain records whose enumerable keys and values match supplied patterns.
 *
 * The runtime value must be a plain object, not an array, class instance, map,
 * set, or function. String keys that represent canonical numbers can also match
 * number key patterns, mirroring JavaScript object-key coercion.
 *
 * @param key - Pattern required for every enumerable key.
 * @param value - Pattern required for every enumerable value.
 * @returns A frozen record pattern helper.
 * @example
 * ```ts
 * match(value).with(P.record(P.string, P.number), (scores) => scores).otherwise(() => ({}))
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pRecord<const TKeyPattern, const TValuePattern>(
  key: TKeyPattern & RecordKeyPatternArgument<TKeyPattern, 'P.record'>,
  value: TValuePattern & RecordValuePatternArgument<TValuePattern, 'P.record'>,
): RecordPattern<TKeyPattern, TValuePattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'record', key, value })
}

/**
 * Matches non-empty plain records whose keys and values match supplied patterns.
 *
 * Use this when an empty object should be rejected. The same plain-record and
 * selection restrictions as `P.record(...)` apply.
 *
 * @param key - Pattern required for every enumerable key.
 * @param value - Pattern required for every enumerable value.
 * @returns A frozen non-empty record pattern helper.
 * @example
 * ```ts
 * match(value).with(P.nonEmptyRecord(P.string, P.number), (scores) => scores).otherwise(() => ({}))
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pNonEmptyRecord<const TKeyPattern, const TValuePattern>(
  key: TKeyPattern & RecordKeyPatternArgument<TKeyPattern, 'P.nonEmptyRecord'>,
  value: TValuePattern & RecordValuePatternArgument<TValuePattern, 'P.nonEmptyRecord'>,
): NonEmptyRecordPattern<TKeyPattern, TValuePattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'non-empty-record', key, value })
}

/**
 * Namespace-style collection of every public pattern helper.
 *
 * Import `P` for the default documented API shape, then use helpers inside
 * `match`, `matchBy`, `isMatching`, and `assertMatching` patterns. The named
 * `p*` exports are equivalent tree-shakable aliases for consumers that prefer
 * direct imports.
 *
 * @example
 * ```ts
 * import { match, P } from '@diegogbrisa/ts-match'
 * match(value).with({ type: 'ready', payload: P.string }, ({ payload }) => payload).exhaustive()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match#named-p-helper-exports
 */
export const P = Object.freeze({
  _: pWildcard,
  any: pAny,
  string: pString,
  number: pNumber,
  boolean: pBoolean,
  bigint: pBigint,
  symbol: pSymbol,
  null: pNull,
  undefined: pUndefined,
  nan: pNan,
  finite: pFinite,
  integer: pInteger,
  regex: pRegex,
  date: pDate,
  error: pError,
  regexp: pRegexp,
  nullish: pNullish,
  falsy: pFalsy,
  truthy: pTruthy,
  temporal: pTemporal,
  temporalInstant: pTemporalInstant,
  temporalPlainDate: pTemporalPlainDate,
  temporalPlainTime: pTemporalPlainTime,
  temporalPlainDateTime: pTemporalPlainDateTime,
  temporalZonedDateTime: pTemporalZonedDateTime,
  temporalDuration: pTemporalDuration,
  temporalPlainYearMonth: pTemporalPlainYearMonth,
  temporalPlainMonthDay: pTemporalPlainMonthDay,
  literal: pLiteral,
  union: pUnion,
  exclude: pExclude,
  optional: pOptional,
  array: pArray,
  nonEmptyArray: pNonEmptyArray,
  map: pMap,
  set: pSet,
  tuple: pTuple,
  rest: pRest,
  exact: pExact,
  when: pWhen,
  instanceOf: pInstanceOf,
  select: pSelect,
  collect: pCollect,
  record: pRecord,
  nonEmptyRecord: pNonEmptyRecord,
})
