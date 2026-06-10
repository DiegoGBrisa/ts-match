declare global {
  namespace TsMatchTypes {
    export type NonCaptureLeafPattern =
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

    export type CollectNames<TPattern> = [unknown] extends [TPattern]
      ? never
      : TPattern extends NonCaptureLeafPattern
        ? never
        : TPattern extends CollectPattern<infer TName, infer TInner>
          ? TName | CollectNames<TInner>
          : TPattern extends AnonymousSelectPattern<infer TInner>
            ? CollectNames<TInner>
            : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
              ? CollectNames<TInner>
              : TPattern extends UnionPattern<infer TPatterns>
                ? TPatterns[number] extends unknown
                  ? CollectNames<TPatterns[number]>
                  : never
                : TPattern extends ExcludePattern<infer TInner>
                  ? CollectNames<TInner>
                  : TPattern extends OptionalPattern<infer TInner>
                    ? CollectNames<TInner>
                    : TPattern extends ArrayPattern<infer TInner>
                      ? CollectNames<TInner>
                      : TPattern extends NonEmptyArrayPattern<infer TInner>
                        ? CollectNames<TInner>
                        : TPattern extends TuplePattern<infer TItems>
                          ? CollectNames<TItems[number]>
                          : TPattern extends RestPattern<infer TInner>
                            ? CollectNames<TInner>
                            : TPattern extends ExactPattern<infer TInner>
                              ? CollectNames<TInner>
                              : TPattern extends RecordPattern<infer TKey, infer TValue>
                                ? CollectNames<TKey> | CollectNames<TValue>
                                : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                                  ? CollectNames<TKey> | CollectNames<TValue>
                                  : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                                    ? CollectNames<TKey> | CollectNames<TValue>
                                    : TPattern extends EntryMapPattern<infer TEntries>
                                      ? TEntries extends readonly MapEntryPattern[]
                                        ? CollectNames<TEntries[number][0]> | CollectNames<TEntries[number][1]>
                                        : never
                                      : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                                        ? CollectNames<TPatterns[number]>
                                        : TPattern extends readonly unknown[]
                                          ? CollectNames<TPattern[number]>
                                          : TPattern extends object
                                            ? { [K in keyof TPattern]: CollectNames<TPattern[K]> }[keyof TPattern]
                                            : never

    export type ContainsCollect<TPattern> = [CollectNames<TPattern>] extends [never] ? false : true

    export type NamedSelectNames<TPattern> = [unknown] extends [TPattern]
      ? never
      : TPattern extends NonCaptureLeafPattern
        ? never
        : TPattern extends AnonymousSelectPattern<infer TInner>
          ? NamedSelectNames<TInner>
          : TPattern extends NamedSelectPattern<infer TName, infer TInner>
            ? TName | NamedSelectNames<TInner>
            : TPattern extends CollectPattern<PropertyKey, infer TInner>
              ? NamedSelectNames<TInner>
              : TPattern extends UnionPattern<infer TPatterns>
                ? TPatterns[number] extends unknown
                  ? NamedSelectNames<TPatterns[number]>
                  : never
                : TPattern extends ExcludePattern<infer TInner>
                  ? NamedSelectNames<TInner>
                  : TPattern extends OptionalPattern<infer TInner>
                    ? NamedSelectNames<TInner>
                    : TPattern extends ArrayPattern<infer TInner>
                      ? NamedSelectNames<TInner>
                      : TPattern extends NonEmptyArrayPattern<infer TInner>
                        ? NamedSelectNames<TInner>
                        : TPattern extends TuplePattern<infer TItems>
                          ? NamedSelectNames<TItems[number]>
                          : TPattern extends RestPattern<infer TInner>
                            ? NamedSelectNames<TInner>
                            : TPattern extends ExactPattern<infer TInner>
                              ? NamedSelectNames<TInner>
                              : TPattern extends RecordPattern<infer TKey, infer TValue>
                                ? NamedSelectNames<TKey> | NamedSelectNames<TValue>
                                : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                                  ? NamedSelectNames<TKey> | NamedSelectNames<TValue>
                                  : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                                    ? NamedSelectNames<TKey> | NamedSelectNames<TValue>
                                    : TPattern extends EntryMapPattern<infer TEntries>
                                      ? TEntries extends readonly MapEntryPattern[]
                                        ? NamedSelectNames<TEntries[number][0]> | NamedSelectNames<TEntries[number][1]>
                                        : never
                                      : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                                        ? NamedSelectNames<TPatterns[number]>
                                        : TPattern extends readonly unknown[]
                                          ? NamedSelectNames<TPattern[number]>
                                          : TPattern extends object
                                            ? { [K in keyof TPattern]: NamedSelectNames<TPattern[K]> }[keyof TPattern]
                                            : never

    export type ContainsAnonymousSelection<TPattern> = [unknown] extends [TPattern]
      ? false
      : TPattern extends NonCaptureLeafPattern
        ? false
        : TPattern extends AnonymousSelectPattern<unknown>
          ? true
          : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
            ? ContainsAnonymousSelection<TInner>
            : TPattern extends CollectPattern<PropertyKey, infer TInner>
              ? ContainsAnonymousSelection<TInner>
              : TPattern extends UnionPattern<infer TPatterns>
                ? true extends (
                    TPatterns[number] extends unknown ? ContainsAnonymousSelection<TPatterns[number]> : never
                  )
                  ? true
                  : false
                : TPattern extends ExcludePattern<infer TInner>
                  ? ContainsAnonymousSelection<TInner>
                  : TPattern extends OptionalPattern<infer TInner>
                    ? ContainsAnonymousSelection<TInner>
                    : TPattern extends ArrayPattern<infer TInner>
                      ? ContainsAnonymousSelection<TInner>
                      : TPattern extends NonEmptyArrayPattern<infer TInner>
                        ? ContainsAnonymousSelection<TInner>
                        : TPattern extends TuplePattern<infer TItems>
                          ? true extends (
                              TItems[number] extends unknown ? ContainsAnonymousSelection<TItems[number]> : never
                            )
                            ? true
                            : false
                          : TPattern extends RestPattern<infer TInner>
                            ? ContainsAnonymousSelection<TInner>
                            : TPattern extends ExactPattern<infer TInner>
                              ? ContainsAnonymousSelection<TInner>
                              : TPattern extends RecordPattern<infer TKey, infer TValue>
                                ? ContainsAnonymousSelection<TKey> extends true
                                  ? true
                                  : ContainsAnonymousSelection<TValue>
                                : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                                  ? ContainsAnonymousSelection<TKey> extends true
                                    ? true
                                    : ContainsAnonymousSelection<TValue>
                                  : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                                    ? ContainsAnonymousSelection<TKey> extends true
                                      ? true
                                      : ContainsAnonymousSelection<TValue>
                                    : TPattern extends EntryMapPattern<infer TEntries>
                                      ? TEntries extends readonly MapEntryPattern[]
                                        ? true extends (
                                            TEntries[number] extends readonly [infer TEntryKey, infer TEntryValue]
                                              ? ContainsAnonymousSelection<TEntryKey> extends true
                                                ? true
                                                : ContainsAnonymousSelection<TEntryValue>
                                              : false
                                          )
                                          ? true
                                          : false
                                        : false
                                      : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                                        ? true extends (
                                            TPatterns[number] extends unknown
                                              ? ContainsAnonymousSelection<TPatterns[number]>
                                              : never
                                          )
                                          ? true
                                          : false
                                        : TPattern extends readonly unknown[]
                                          ? true extends (
                                              TPattern[number] extends unknown
                                                ? ContainsAnonymousSelection<TPattern[number]>
                                                : never
                                            )
                                            ? true
                                            : false
                                          : TPattern extends object
                                            ? true extends {
                                                [K in keyof TPattern]: ContainsAnonymousSelection<TPattern[K]>
                                              }[keyof TPattern]
                                              ? true
                                              : false
                                            : false

    export type CollectCaptureCompatible<TPattern> =
      ContainsCollect<TPattern> extends true
        ? ContainsAnonymousSelection<TPattern> extends true
          ? false
          : [Extract<CollectNames<TPattern>, NamedSelectNames<TPattern>>] extends [never]
            ? true
            : false
        : true
  }
}

export {}
