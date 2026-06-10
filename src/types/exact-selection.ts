declare global {
  namespace TsMatchTypes {
    export type MatchedExactValue<TValue, TPattern> = TPattern extends WildcardPattern
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
                                    : TPattern extends CollectPattern<PropertyKey, infer TInner>
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

    export type MatchedExactObject<TValue, TPattern extends object> = TValue extends unknown
      ? TValue extends object
        ? ExactObjectCompatible<TValue, TPattern> extends true
          ? RefineExactObject<TValue, TPattern>
          : never
        : never
      : never

    export type ExactObjectCompatible<TValue extends object, TPattern extends object> =
      Exclude<keyof TValue, keyof TPattern> extends never ? ObjectPatternCompatible<TValue, TPattern> : false

    export type RefineExactObject<TValue extends object, TPattern extends object> = Simplify<{
      [K in keyof TValue]: K extends keyof TPattern ? MatchedExactValue<TValue[K], TPattern[K]> : TValue[K]
    }>

    export type SelectionMode = 'none' | 'anonymous' | 'named' | 'invalid'

    export type MergeSelectionModes<TLeft extends SelectionMode, TRight extends SelectionMode> = TLeft extends 'invalid'
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

    export type SelectionModeFromTuple<
      TPatterns extends readonly unknown[],
      TMode extends SelectionMode = 'none',
    > = TPatterns extends readonly [infer THead, ...infer TTail]
      ? SelectionModeFromTuple<TTail, MergeSelectionModes<TMode, SelectionModeOf<THead>>>
      : TMode

    export type ObjectSelectionKeys<TPattern extends object, TMode extends SelectionMode> = {
      [K in keyof TPattern]: SelectionModeOf<TPattern[K]> extends TMode ? K : never
    }[keyof TPattern]

    export type ObjectSelectionMode<TPattern extends object> = keyof TPattern extends never
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

    export type SelectionModeOf<TPattern> = TPattern extends
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
          : TPattern extends CollectPattern<PropertyKey, infer TInner>
            ? SelectionModeOf<TInner>
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
  }
}

export {}
