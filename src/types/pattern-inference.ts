declare global {
  namespace TsMatchTypes {
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
                                                      : TPattern extends CollectPattern<PropertyKey, infer TInner>
                                                        ? InferPattern<TInner>
                                                        : TPattern extends RecordPattern<infer TKey, infer TValue>
                                                          ? InferRecordPattern<TKey, TValue>
                                                          : TPattern extends NonEmptyRecordPattern<
                                                                infer TKey,
                                                                infer TValue
                                                              >
                                                            ? InferRecordPattern<TKey, TValue>
                                                            : TPattern extends HomogeneousMapPattern<
                                                                  infer TKey,
                                                                  infer TValue
                                                                >
                                                              ? Map<InferPattern<TKey>, InferPattern<TValue>>
                                                              : TPattern extends EntryMapPattern<unknown>
                                                                ? Map<unknown, unknown>
                                                                : TPattern extends SetPattern<
                                                                      infer TPatterns,
                                                                      infer TMode
                                                                    >
                                                                  ? InferSetPattern<TPatterns, TMode>
                                                                  : TPattern extends readonly unknown[]
                                                                    ? InferTuplePattern<TPattern>
                                                                    : TPattern extends Primitive
                                                                      ? TPattern
                                                                      : TPattern extends object
                                                                        ? InferObjectPattern<TPattern>
                                                                        : never

    export type TemporalValueForKind<TTemporalKind extends TemporalPatternKind> = TTemporalKind extends 'any'
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

    export type InferObjectPattern<TPattern extends object> = Simplify<
      { [K in RequiredPatternKeys<TPattern>]: InferPattern<TPattern[K]> } & {
        [K in OptionalPatternKeys<TPattern>]?: TPattern[K] extends OptionalPattern<infer TInner>
          ? InferPattern<TInner> | undefined
          : never
      }
    >

    export type InferTuplePattern<TPatterns extends readonly unknown[]> = TPatterns extends readonly [
      infer THead,
      ...infer TTail,
    ]
      ? THead extends RestPattern<infer TRest>
        ? InferPattern<TRest>[]
        : TTail extends readonly []
          ? [InferPattern<THead>]
          : TTail extends readonly [RestPattern<infer TRest>]
            ? [InferPattern<THead>, ...InferPattern<TRest>[]]
            : [InferPattern<THead>, ...InferTuplePattern<TTail>]
      : []

    export type InferRecordPattern<TKeyPattern, TValuePattern> =
      InferPattern<TKeyPattern> extends infer TKey
        ? Extract<TKey, PropertyKey> extends never
          ? Record<PropertyKey, InferPattern<TValuePattern>>
          : Record<Extract<TKey, PropertyKey>, InferPattern<TValuePattern>>
        : never

    export type InferSetPattern<
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
                                                            : TPattern extends NamedSelectPattern<
                                                                  PropertyKey,
                                                                  infer TInner
                                                                >
                                                              ? MatchedValue<TValue, TInner>
                                                              : TPattern extends CollectPattern<
                                                                    PropertyKey,
                                                                    infer TInner
                                                                  >
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
  }
}

export {}
