declare global {
  namespace TsMatchTypes {
    export type TupleCompatible<
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

    export type BroadArrayTupleCompatible<TItem, TPatterns extends readonly unknown[]> = TPatterns extends readonly [
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

    export type EveryTupleItemMatches<TArray extends readonly unknown[], TPattern> = TArray extends readonly [
      infer THead,
      ...infer TTail,
    ]
      ? [MatchedValue<THead, TPattern>] extends [never]
        ? false
        : EveryTupleItemMatches<TTail, TPattern>
      : true

    export type NonRecordObject =
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

    export type KnownKeyCount<TValue> = keyof TValue extends never ? 0 : 1

    export type RuntimeComparableKey<TKey> = TKey extends string
      ? TKey | (TKey extends `${number}` ? number : never)
      : TKey extends number
        ? TKey | `${TKey}`
        : TKey

    export type RecordKeyCompatible<TKey, TKeyPattern> = [
      MatchedValue<RuntimeComparableKey<TKey>, TKeyPattern>,
    ] extends [never]
      ? false
      : true

    export type RecordObjectCompatible<TValue extends object, TKeyPattern, TValuePattern> = false extends {
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

    export type MatchedRecord<
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

    export type CoveredRecord<TValue, _TKeyPattern, TValuePattern> = TValue extends NonRecordObject
      ? never
      : TValue extends Record<PropertyKey, infer TRecordValue>
        ? AllItemsCovered<TRecordValue, TValuePattern> extends true
          ? TValue
          : never
        : never

    export type IsSingletonLiteral<TValue> = [TValue] extends [Primitive]
      ? IsUnion<TValue> extends true
        ? false
        : IsBroad<TValue> extends true
          ? false
          : true
      : false

    export type CoveredLiteral<TValue, TLiteral> =
      IsSingletonLiteral<TLiteral> extends true ? LiteralMatch<TValue, TLiteral> : never

    export type MapEntryCompatible<TMapKey, TMapValue, TEntry extends MapEntryPattern> = TEntry extends readonly [
      infer TKeyPattern,
      infer TValuePattern,
    ]
      ? [MatchedValue<TMapKey, TKeyPattern>] extends [never]
        ? false
        : [MatchedValue<TMapValue, TValuePattern>] extends [never]
          ? false
          : true
      : false

    export type MapEntriesCompatible<TMapKey, TMapValue, TEntries extends readonly MapEntryPattern[]> = false extends {
      [K in keyof TEntries]: TEntries[K] extends MapEntryPattern
        ? MapEntryCompatible<TMapKey, TMapValue, TEntries[K]>
        : false
    }[number]
      ? false
      : true

    export type AnyMapLike = Map<unknown, unknown> | ReadonlyMap<unknown, unknown>

    export type MapMatchOutput<TSource, TKey, TValue> =
      TSource extends Map<unknown, unknown> ? Map<TKey, TValue> : ReadonlyMap<TKey, TValue>

    export type MatchedHomogeneousMap<TValue, TKeyPattern, TValuePattern> =
      Extract<TValue, AnyMapLike> extends infer TMap
        ? TMap extends ReadonlyMap<infer TKey, infer TMapValue>
          ? [MatchedValue<TKey, TKeyPattern>] extends [never]
            ? never
            : [MatchedValue<TMapValue, TValuePattern>] extends [never]
              ? never
              : MapMatchOutput<TMap, MatchedValue<TKey, TKeyPattern>, MatchedValue<TMapValue, TValuePattern>>
          : never
        : never

    export type MatchedEntryMap<TValue, TEntries> = TEntries extends readonly MapEntryPattern[]
      ? Extract<TValue, AnyMapLike> extends infer TMap
        ? TMap extends ReadonlyMap<infer TKey, infer TMapValue>
          ? MapEntriesCompatible<TKey, TMapValue, TEntries> extends true
            ? TMap
            : never
          : never
        : never
      : never

    export type CoveredHomogeneousMap<TValue, TKeyPattern, TValuePattern> =
      Extract<TValue, AnyMapLike> extends infer TMap
        ? TMap extends ReadonlyMap<infer TKey, infer TMapValue>
          ? AllItemsCovered<TKey, TKeyPattern> extends true
            ? AllItemsCovered<TMapValue, TValuePattern> extends true
              ? TMap
              : never
            : never
          : never
        : never

    export type SetValuesCompatible<TItem, TPatterns extends readonly unknown[]> = false extends {
      [K in keyof TPatterns]: [MatchedValue<TItem, TPatterns[K]>] extends [never] ? false : true
    }[number]
      ? false
      : true

    export type AnySetLike = Set<unknown> | ReadonlySet<unknown>

    export type SetMatchOutput<TSource, TItem> = TSource extends Set<unknown> ? Set<TItem> : ReadonlySet<TItem>

    export type MatchedSet<TValue, TPatterns extends readonly unknown[], TMode extends 'homogeneous' | 'values'> =
      Extract<TValue, AnySetLike> extends infer TSet
        ? TSet extends ReadonlySet<infer TItem>
          ? TMode extends 'homogeneous'
            ? TPatterns extends readonly [infer TPattern]
              ? [MatchedValue<TItem, TPattern>] extends [never]
                ? never
                : SetMatchOutput<TSet, MatchedValue<TItem, TPattern>>
              : never
            : SetValuesCompatible<TItem, TPatterns> extends true
              ? TSet
              : never
          : never
        : never

    export type CoveredSet<
      TValue,
      TPatterns extends readonly unknown[],
      TMode extends 'homogeneous' | 'values',
    > = TMode extends 'values'
      ? never
      : TPatterns extends readonly [infer TPattern]
        ? Extract<TValue, AnySetLike> extends infer TSet
          ? TSet extends ReadonlySet<infer TItem>
            ? AllItemsCovered<TItem, TPattern> extends true
              ? TSet
              : never
            : never
          : never
        : never

    export type MatchedObject<TValue, TPattern extends object> = TValue extends unknown
      ? TValue extends object
        ? ObjectPatternCompatible<TValue, TPattern> extends true
          ? RefineObject<TValue, TPattern>
          : never
        : never
      : never
  }
}

export {}
