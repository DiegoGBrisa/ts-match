declare global {
  namespace TsMatchTypes {
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
     * Type of named `P.collect(name, pattern)`, which gathers repeated captures into
     * a named array on the handler payload.
     *
     * @typeParam TName - Collection capture key.
     * @typeParam TPattern - Nested pattern that must match before capture.
     * @see https://github.com/DiegoGBrisa/ts-match#collection-captures
     */
    export interface CollectPattern<TName extends PropertyKey, TPattern> extends PatternBase<'collect'> {
      readonly name: TName
      readonly pattern: TPattern
    }

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
      | CollectPattern<PropertyKey, unknown>
      | RecordPattern<unknown, unknown>
      | NonEmptyRecordPattern<unknown, unknown>
      | HomogeneousMapPattern<unknown, unknown>
      | EntryMapPattern<readonly MapEntryPattern[]>
      | SetPattern<readonly unknown[], 'homogeneous' | 'values'>

    export type PatternKey<TValue> = TValue extends unknown ? keyof TValue : never

    export type PatternValueAtKey<TValue, TKey extends PropertyKey> = TValue extends unknown
      ? TKey extends keyof TValue
        ? TValue[TKey]
        : never
      : never
  }
}

export {}
