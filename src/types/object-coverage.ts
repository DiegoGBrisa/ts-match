declare global {
  namespace TsMatchTypes {
    export type ObjectPatternCompatible<TValue extends object, TPattern extends object> = false extends {
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

    export type OptionalObjectKey<TValue extends object, TKey extends keyof TValue> =
      Partial<Pick<TValue, TKey>> extends Pick<TValue, TKey> ? true : false

    export type ObjectPatternKeyHasAbsentHole<
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

    export type ObjectPatternHasAbsentHole<TValue extends object, TPattern extends object> = true extends {
      [K in keyof TPattern]: ObjectPatternKeyHasAbsentHole<TValue, TPattern, K>
    }[keyof TPattern]
      ? true
      : false

    export type CoveredObject<TValue, TPattern extends object> = TValue extends unknown
      ? TValue extends object
        ? ObjectPatternCompatible<TValue, TPattern> extends true
          ? ObjectPatternHasAbsentHole<TValue, TPattern> extends true
            ? never
            : CoveredRefineObject<TValue, TPattern>
          : never
        : never
      : never

    export type RefineObject<TValue extends object, TPattern extends object> = Simplify<{
      [K in keyof TValue]: K extends keyof TPattern ? MatchedValue<TValue[K], TPattern[K]> : TValue[K]
    }>

    export type CoveredRefineObject<TValue extends object, TPattern extends object> = Simplify<{
      [K in keyof TValue]: K extends keyof TPattern ? CoveredValue<TValue[K], TPattern[K]> : TValue[K]
    }>

    export type RemainingAfterObjectPattern<TValue, TPattern extends object> = TValue extends unknown
      ? TValue extends object
        ? ObjectPatternCompatible<TValue, TPattern> extends true
          ? ObjectPatternFailureUnion<TValue, TPattern>
          : TValue
        : TValue
      : never

    export type ObjectPatternFailureUnion<TValue extends object, TPattern extends object> = {
      [K in keyof TPattern]: ObjectPatternKeyFailure<TValue, TPattern, K>
    }[keyof TPattern]

    export type ObjectPatternKeyFailure<
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

    export type PresentOptionalObjectKeyFailure<TValue extends object, TKey extends keyof TValue, TPattern> =
      RemainingAfterPattern<Exclude<TValue[TKey], undefined>, TPattern> extends infer TRemaining
        ? [TRemaining] extends [never]
          ? never
          : RequireObjectKey<TValue, TKey, TRemaining>
        : never

    export type PresentRequiredObjectKeyFailure<
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

    export type MissingRequiredObjectKey<TValue extends object, TKey extends keyof TValue> =
      OptionalObjectKey<TValue, TKey> extends true ? AbsentObjectKey<TValue, TKey> : never

    export type RequireObjectKey<TValue extends object, TKey extends keyof TValue, TProperty> = Simplify<
      Omit<TValue, TKey> & { [K in keyof Pick<TValue, TKey>]-?: TProperty }
    >

    export type AbsentObjectKey<TValue extends object, TKey extends keyof TValue> = Simplify<
      Omit<TValue, TKey> & { [K in keyof Pick<TValue, TKey>]?: never }
    >

    export type CoveredExactValue<TValue, TPattern> = TPattern extends WildcardPattern
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
                                  : TPattern extends CollectPattern<PropertyKey, infer TInner>
                                    ? CoveredExactValue<TValue, TInner>
                                    : TPattern extends readonly unknown[]
                                      ? MatchedTuple<TValue, TPattern>
                                      : TPattern extends object
                                        ? CoveredExactObject<TValue, TPattern>
                                        : CoveredValue<TValue, TPattern>

    export type CoveredExactObject<TValue, TPattern extends object> = TValue extends unknown
      ? TValue extends object
        ? ExactObjectCompatible<TValue, TPattern> extends true
          ? ObjectPatternHasAbsentHole<TValue, TPattern> extends true
            ? never
            : CoveredRefineExactObject<TValue, TPattern>
          : never
        : never
      : never

    export type CoveredRefineExactObject<TValue extends object, TPattern extends object> = Simplify<{
      [K in keyof TValue]: K extends keyof TPattern ? CoveredExactValue<TValue[K], TPattern[K]> : TValue[K]
    }>

    export type CoveredExactExclude<TValue, TPattern> = TValue extends unknown
      ? [MatchedExactValue<TValue, TPattern>] extends [never]
        ? TValue
        : [TValue] extends [CoveredExactValue<TValue, TPattern>]
          ? never
          : never
      : never
  }
}

export {}
