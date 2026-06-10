declare global {
  namespace TsMatchTypes {
    export type ContainsSelection<TPattern> = TPattern extends
      | AnonymousSelectPattern<unknown>
      | NamedSelectPattern<PropertyKey, unknown>
      ? true
      : TPattern extends CollectPattern<PropertyKey, infer TInner>
        ? ContainsSelection<TInner>
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

    export type RestUsageValid<TPattern> =
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
                : TPattern extends CollectPattern<PropertyKey, infer TInner>
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

    export type TupleRestUsageValid<TPatterns extends readonly unknown[]> = TPatterns extends readonly []
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

    export type TsMatchTypeError<TMessage extends string, TDetails = unknown> = {
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
    export type DiagnosticArgs<TDiagnostic> = unknown extends TDiagnostic
      ? readonly []
      : readonly [diagnostic: TDiagnostic]

    export type InvalidRestUsageError<TPattern> = TsMatchTypeError<
      'ts-match: invalid P.rest(...) usage. P.rest(...) can only appear as the final item of a tuple pattern; move it to the end of P.tuple([...]) or remove it.',
      { readonly pattern: TPattern }
    >

    export type InvalidSelectionUsageError<TPattern> = TsMatchTypeError<
      'ts-match: invalid P.select(...) usage. Use one anonymous selection, do not mix anonymous and named selections, and do not place selections inside repeated/negative containers such as P.array(...), P.record(...), P.map(...), P.set(...), or P.exclude(...).',
      { readonly pattern: TPattern }
    >

    export type InvalidCollectUsageError<TPattern> = TsMatchTypeError<
      'ts-match: invalid P.collect(...) usage. Use P.collect(name, pattern) only inside repeated containers such as P.array(...), P.record(...), P.map(...), or P.set(...); do not place it inside P.exclude(...), mix it with anonymous P.select(), or reuse a named P.select(...) name.',
      { readonly pattern: TPattern }
    >

    export type AllTrue<TBoolean> = false extends TBoolean ? false : true
  }
}

export {}
