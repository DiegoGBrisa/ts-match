declare global {
  namespace TsMatchTypes {
    export type CoveredVariant<TValue, TPattern> = TPattern extends unknown
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

    export type RemainingAfterUncoveredPattern<TValue, TPattern> = TPattern extends BuiltInPattern
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

    export type CoveredValue<TValue, TPattern> =
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
                                                    : TPattern extends CollectPattern<PropertyKey, infer TInner>
                                                      ? CoveredValue<TValue, TInner>
                                                      : TPattern extends readonly unknown[]
                                                        ? MatchedTuple<TValue, TPattern>
                                                        : TPattern extends BuiltInPattern
                                                          ? MatchedValue<TValue, TPattern>
                                                          : TPattern extends object
                                                            ? CoveredObject<TValue, TPattern>
                                                            : MatchedValue<TValue, TPattern>

    export type CoveredExclude<TValue, TPattern> = TValue extends unknown
      ? [MatchedValue<TValue, TPattern>] extends [never]
        ? TValue
        : [TValue] extends [CoveredValue<TValue, TPattern>]
          ? never
          : never
      : never

    export type SafeExclude<TValue, TExcluded> = TValue extends string
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

    export type MutableArray<T> = T[]
    export type ReadonlyArrayOf<T> = readonly T[]

    export type ArrayOutput<TValue, TItem> = TValue extends unknown[] ? MutableArray<TItem> : ReadonlyArrayOf<TItem>

    export type NonEmptyArrayOutput<TValue, TItem> = TValue extends unknown[]
      ? [TItem, ...TItem[]]
      : readonly [TItem, ...TItem[]]

    export type EveryKnownArrayItemMatches<TArray extends readonly unknown[], TItemPattern> = TArray extends readonly [
      infer THead,
      ...infer TTail,
    ]
      ? [MatchedValue<THead, TItemPattern>] extends [never]
        ? false
        : EveryKnownArrayItemMatches<TTail, TItemPattern>
      : true

    export type MatchedArray<TValue, TItemPattern> =
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

    export type MatchedNonEmptyArray<TValue, TItemPattern> =
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

    export type CoveredArray<TValue, TItemPattern> =
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

    export type CoveredNonEmptyArray<TValue, TItemPattern> =
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

    export type MatchedTuple<TValue, TPatterns extends readonly unknown[]> =
      Extract<TValue, readonly unknown[]> extends infer TArray
        ? TArray extends readonly unknown[]
          ? TupleCompatible<TArray, TPatterns> extends true
            ? TArray
            : IsUnsafe<TArray> extends true
              ? InferTuplePattern<TPatterns>
              : never
          : never
        : never
  }
}

export {}
