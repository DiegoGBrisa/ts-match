declare global {
  namespace TsMatchTypes {
    export type SelectPayload<TValue, TPattern> =
      TPattern extends AnonymousSelectPattern<infer TInner>
        ? MatchedValue<TValue, TInner>
        : TPattern extends NamedSelectPattern<infer TName, infer TInner>
          ? { [K in TName]: MatchedValue<TValue, TInner> }
          : TPattern extends CollectPattern<PropertyKey, infer TInner>
            ? SelectPayload<TValue, TInner>
            : TPattern extends UnionPattern<infer TPatterns>
              ? SelectPayload<TValue, TPatterns[number]>
              : TPattern extends OptionalPattern<infer TInner>
                ? OptionalSelectionPayload<SelectPayload<Exclude<TValue, undefined>, TInner>>
                : TPattern extends ArrayPattern<infer TInner>
                  ? TValue extends readonly (infer TItem)[]
                    ? SelectPayload<TItem, TInner>
                    : never
                  : TPattern extends NonEmptyArrayPattern<infer TInner>
                    ? TValue extends readonly (infer TItem)[]
                      ? SelectPayload<TItem, TInner>
                      : never
                    : TPattern extends TuplePattern<infer TItems>
                      ? SelectPayloadFromTuple<TValue, TItems>
                      : TPattern extends readonly unknown[]
                        ? SelectPayloadFromTuple<TValue, TPattern>
                        : TPattern extends ExactPattern<infer TInner>
                          ? SelectPayload<TValue, TInner>
                          : TPattern extends object
                            ? SelectPayloadFromObject<TValue, TPattern>
                            : never

    export type ObjectSelectPayloadUnion<TValue, TPattern extends object> = {
      [K in keyof TPattern]-?: K extends keyof TValue ? SelectPayload<TValue[K], TPattern[K]> : never
    }[keyof TPattern]

    export type SelectPayloadFromObject<TValue, TPattern extends object> = UnionToIntersection<
      ObjectSelectPayloadUnion<TValue, TPattern>
    >

    export type SelectPayloadFromTuple<TValue, TPatterns extends readonly unknown[]> = UnionToIntersection<
      SelectPayloadFromTupleUnion<TValue, TPatterns>
    >

    export type SelectPayloadFromTupleUnion<TValue, TPatterns extends readonly unknown[]> = TValue extends readonly [
      infer THead,
      ...infer TTail,
    ]
      ? TPatterns extends readonly [infer PHead, ...infer PTail]
        ? PHead extends RestPattern<infer TRest>
          ? SelectPayload<TValue[number], TRest>
          : SelectPayload<THead, PHead> | SelectPayloadFromTupleUnion<TTail, PTail>
        : never
      : never

    export type OptionalCollectValue<TValue, TPattern, TName extends PropertyKey> =
      | CollectValueForName<Exclude<TValue, undefined>, TPattern, TName>
      | (TName extends CollectNames<TPattern> ? undefined : never)

    export type RecordKeyForCollect<TValue> = TValue extends object ? RuntimeComparableKey<keyof TValue> : PropertyKey
    export type RecordValueForCollect<TValue> = TValue extends object ? TValue[keyof TValue] : unknown
    export type MapKeyForCollect<TValue> = TValue extends ReadonlyMap<infer TKey, unknown> ? TKey : unknown
    export type MapValueForCollect<TValue> = TValue extends ReadonlyMap<unknown, infer TMapValue> ? TMapValue : unknown
    export type SetValueForCollect<TValue> = TValue extends ReadonlySet<infer TItem> ? TItem : unknown
    export type ArrayValueForCollect<TValue> = TValue extends readonly (infer TItem)[] ? TItem : unknown

    export type CollectValueForName<TValue, TPattern, TName extends PropertyKey> =
      TPattern extends CollectPattern<infer TCollectName, infer TInner>
        ?
            | (TName extends TCollectName ? MatchedValue<TValue, TInner> : never)
            | CollectValueForName<MatchedValue<TValue, TInner>, TInner, TName>
        : TPattern extends AnonymousSelectPattern<infer TInner>
          ? CollectValueForName<TValue, TInner, TName>
          : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
            ? CollectValueForName<TValue, TInner, TName>
            : TPattern extends UnionPattern<infer TPatterns>
              ? TPatterns[number] extends unknown
                ? CollectValueForName<TValue, TPatterns[number], TName>
                : never
              : TPattern extends ExcludePattern<infer TInner>
                ? CollectValueForName<TValue, TInner, TName>
                : TPattern extends OptionalPattern<infer TInner>
                  ? OptionalCollectValue<TValue, TInner, TName>
                  : TPattern extends ArrayPattern<infer TInner>
                    ? CollectValueForName<ArrayValueForCollect<TValue>, TInner, TName>
                    : TPattern extends NonEmptyArrayPattern<infer TInner>
                      ? CollectValueForName<ArrayValueForCollect<TValue>, TInner, TName>
                      : TPattern extends TuplePattern<infer TItems>
                        ? CollectValueForName<ArrayValueForCollect<TValue>, TItems[number], TName>
                        : TPattern extends RestPattern<infer TInner>
                          ? CollectValueForName<ArrayValueForCollect<TValue>, TInner, TName>
                          : TPattern extends ExactPattern<infer TInner>
                            ? CollectValueForName<TValue, TInner, TName>
                            : TPattern extends RecordPattern<infer TKey, infer TRecordValue>
                              ?
                                  | CollectValueForName<RecordKeyForCollect<TValue>, TKey, TName>
                                  | CollectValueForName<RecordValueForCollect<TValue>, TRecordValue, TName>
                              : TPattern extends NonEmptyRecordPattern<infer TKey, infer TRecordValue>
                                ?
                                    | CollectValueForName<RecordKeyForCollect<TValue>, TKey, TName>
                                    | CollectValueForName<RecordValueForCollect<TValue>, TRecordValue, TName>
                                : TPattern extends HomogeneousMapPattern<infer TKey, infer TValuePattern>
                                  ?
                                      | CollectValueForName<MapKeyForCollect<TValue>, TKey, TName>
                                      | CollectValueForName<MapValueForCollect<TValue>, TValuePattern, TName>
                                  : TPattern extends EntryMapPattern<infer TEntries>
                                    ? TEntries extends readonly MapEntryPattern[]
                                      ? TEntries[number] extends readonly [infer TKey, infer TValuePattern]
                                        ?
                                            | CollectValueForName<MapKeyForCollect<TValue>, TKey, TName>
                                            | CollectValueForName<MapValueForCollect<TValue>, TValuePattern, TName>
                                        : never
                                      : never
                                    : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                                      ? TPatterns[number] extends unknown
                                        ? CollectValueForName<SetValueForCollect<TValue>, TPatterns[number], TName>
                                        : never
                                      : TPattern extends readonly unknown[]
                                        ? CollectValueForName<ArrayValueForCollect<TValue>, TPattern[number], TName>
                                        : TPattern extends object
                                          ? {
                                              [K in keyof TPattern]-?: K extends keyof TValue
                                                ? CollectValueForName<TValue[K], TPattern[K], TName>
                                                : CollectValueForName<unknown, TPattern[K], TName>
                                            }[keyof TPattern]
                                          : never

    export type CollectPayloadNames<TPattern> =
      CollectNames<TPattern> extends infer TName ? (TName extends PropertyKey ? TName : never) : never

    export type CollectPayload<TValue, TPattern> = [CollectPayloadNames<TPattern>] extends [never]
      ? never
      : Simplify<{
          [K in CollectPayloadNames<TPattern>]: CollectValueForName<TValue, TPattern, K>[]
        }>

    export type MergeCapturePayload<TSelect, TCollect> = [TSelect] extends [never]
      ? TCollect
      : [TCollect] extends [never]
        ? TSelect
        : TSelect extends object
          ? TCollect extends object
            ? TSelect & TCollect
            : TSelect
          : TSelect

    /**
     * Computes the value passed to a `match(...).with(...)` handler.
     *
     * Patterns without selections pass the narrowed matched value. Anonymous
     * selections pass the selected value. Named selections pass an object of captures.
     *
     * @typeParam TValue - Candidate value type before the branch.
     * @typeParam TPattern - Pattern used by the branch.
     * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
     */
    export type HandlerInput<TValue, TPattern> = TPattern extends unknown
      ? Simplify<HandlerInputForPattern<TValue, TPattern>>
      : never

    export type HandlerInputForPattern<TValue, TPattern> =
      TPattern extends UnionPattern<infer TPatterns>
        ? HandlerInput<TValue, TPatterns[number]>
        : TPattern extends OptionalPattern<infer TInner>
          ? Extract<TValue, undefined> | HandlerInput<Exclude<TValue, undefined>, TInner>
          : MergeCapturePayload<
                SelectPayload<MatchedValue<TValue, TPattern>, TPattern>,
                CollectPayload<MatchedValue<TValue, TPattern>, TPattern>
              > extends infer TCapture
            ? [TCapture] extends [never]
              ? MatchedValue<TValue, TPattern>
              : Simplify<TCapture>
            : never

    /**
     * Value type produced by `isMatching` and `assertMatching` after a successful check.
     *
     * @typeParam TValue - Original value type.
     * @typeParam TPattern - Pattern used for validation.
     * @see https://github.com/DiegoGBrisa/ts-match#ismatching
     */
    export type GuardedValue<TValue, TPattern> = TValue & MatchedValue<TValue, TPattern>

    export type DotPathLeaf =
      | Primitive
      | readonly unknown[]
      | ((...args: never[]) => unknown)
      | Date
      | RegExp
      | Map<unknown, unknown>
      | Set<unknown>
      | WeakMap<object, unknown>
      | WeakSet<object>
      | PromiseLike<unknown>

    export type DotPathKey<TKey extends string> = TKey extends `${string}.${string}` ? never : TKey

    export type DotPathChild<TValue, TKey extends string> =
      NonNullable<TValue> extends DotPathLeaf
        ? never
        : NonNullable<TValue> extends object
          ? DotPath<NonNullable<TValue>> extends infer TChild extends string
            ? `${TKey}.${TChild}`
            : never
          : never

    export type DotPath<TValue> = TValue extends unknown
      ? TValue extends object
        ? {
            [K in Extract<keyof TValue, string>]: DotPathKey<K> | DotPathChild<TValue[K], DotPathKey<K>>
          }[Extract<keyof TValue, string>]
        : never
      : never

    export type TuplePathKey<TKey extends PropertyKey> = string extends TKey
      ? never
      : number extends TKey
        ? never
        : symbol extends TKey
          ? never
          : TKey

    export type TuplePathChild<TValue, TKey extends PropertyKey> =
      NonNullable<TValue> extends DotPathLeaf
        ? never
        : NonNullable<TValue> extends object
          ? TuplePath<NonNullable<TValue>> extends infer TChild extends readonly PropertyKey[]
            ? readonly [TKey, ...TChild]
            : never
          : never
  }
}

export {}
