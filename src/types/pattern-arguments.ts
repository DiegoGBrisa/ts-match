declare global {
  namespace TsMatchTypes {
    export type CollectPlacementValid<
      TPattern,
      TAllowCollect extends boolean,
      TInsideExclude extends boolean = false,
    > = [unknown] extends [TPattern]
      ? true
      : TPattern extends NonCaptureLeafPattern
        ? true
        : TPattern extends CollectPattern<PropertyKey, infer TInner>
          ? TInsideExclude extends true
            ? false
            : TAllowCollect extends true
              ? CollectPlacementValid<TInner, true, false>
              : false
          : TPattern extends AnonymousSelectPattern<infer TInner>
            ? CollectPlacementValid<TInner, TAllowCollect, TInsideExclude>
            : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
              ? CollectPlacementValid<TInner, TAllowCollect, TInsideExclude>
              : TPattern extends ExcludePattern<infer TInner>
                ? CollectPlacementValid<TInner, TAllowCollect, true>
                : TPattern extends UnionPattern<infer TPatterns>
                  ? AllTrue<
                      TPatterns[number] extends unknown
                        ? CollectPlacementValid<TPatterns[number], TAllowCollect>
                        : never
                    >
                  : TPattern extends OptionalPattern<infer TInner>
                    ? CollectPlacementValid<TInner, TAllowCollect, TInsideExclude>
                    : TPattern extends ArrayPattern<unknown>
                      ? true
                      : TPattern extends NonEmptyArrayPattern<unknown>
                        ? true
                        : TPattern extends TuplePattern<infer TItems>
                          ? AllTrue<
                              TItems[number] extends unknown
                                ? CollectPlacementValid<TItems[number], TAllowCollect>
                                : never
                            >
                          : TPattern extends RestPattern<infer TInner>
                            ? CollectPlacementValid<TInner, TAllowCollect, TInsideExclude>
                            : TPattern extends ExactPattern<infer TInner>
                              ? CollectPlacementValid<TInner, TAllowCollect, TInsideExclude>
                              : TPattern extends
                                    | RecordPattern<unknown, unknown>
                                    | NonEmptyRecordPattern<unknown, unknown>
                                    | HomogeneousMapPattern<unknown, unknown>
                                    | EntryMapPattern<readonly MapEntryPattern[]>
                                    | SetPattern<readonly unknown[], 'homogeneous' | 'values'>
                                ? true
                                : TPattern extends readonly unknown[]
                                  ? AllTrue<
                                      TPattern[number] extends unknown
                                        ? CollectPlacementValid<TPattern[number], TAllowCollect, TInsideExclude>
                                        : never
                                    >
                                  : TPattern extends object
                                    ? AllTrue<
                                        {
                                          [K in keyof TPattern]: CollectPlacementValid<
                                            TPattern[K],
                                            TAllowCollect,
                                            TInsideExclude
                                          >
                                        }[keyof TPattern]
                                      >
                                    : true

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
    export type PatternStructureArgument<TPattern, TAllowCollect extends boolean = false> =
      RestUsageValid<TPattern> extends false
        ? InvalidRestUsageError<TPattern>
        : SelectionModeOf<TPattern> extends 'invalid'
          ? InvalidSelectionUsageError<TPattern>
          : CollectPlacementValid<TPattern, TAllowCollect> extends false
            ? InvalidCollectUsageError<TPattern>
            : CollectCaptureCompatible<TPattern> extends false
              ? InvalidCollectUsageError<TPattern>
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
    export type RepeatedPatternArgument<TPattern, TApi extends string> = PatternStructureArgument<TPattern, true> &
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
        : ContainsCollect<TPattern> extends true
          ? TsMatchTypeError<
              'ts-match: P.exclude(pattern) cannot contain P.collect(...). Remove P.collect(...) or move the capture outside P.exclude(...).',
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
    export type RecordKeyPatternArgument<TKeyPattern, TApi extends string> = PatternStructureArgument<
      TKeyPattern,
      true
    > &
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
    export type RecordValuePatternArgument<TValuePattern, TApi extends string> = PatternStructureArgument<
      TValuePattern,
      true
    > &
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

    export type TrueInUnion<TValue> = true extends TValue ? true : false

    export type TuplePathExists<TValue, TPath extends readonly PropertyKey[]> = TPath extends readonly []
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
  }
}

export {}
