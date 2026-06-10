declare global {
  namespace TsMatchTypes {
    export type TuplePath<TValue> = TValue extends unknown
      ? TValue extends object
        ? {
            [K in TuplePathKey<keyof TValue>]: readonly [K] | TuplePathChild<TValue[K], K>
          }[TuplePathKey<keyof TValue>]
        : never
      : never

    export type SuggestedMatchByPath<TValue, TPath extends PropertyPath> =
      Extract<PathValue<TValue, TPath>, Discriminant> extends infer TTags
        ? IsFiniteCaseUnion<TTags> extends true
          ? [Exclude<TTags, undefined>] extends [never]
            ? never
            : TPath
          : never
        : never

    export type DotDiscriminantPath<TValue> =
      DotPath<TValue> extends infer TPath ? (TPath extends string ? SuggestedMatchByPath<TValue, TPath> : never) : never

    export type TupleDiscriminantPath<TValue> =
      TuplePath<TValue> extends infer TPath
        ? TPath extends readonly PropertyKey[]
          ? SuggestedMatchByPath<TValue, TPath>
          : never
        : never

    export type MatchByStringPath<TValue> = IsUnsafe<TValue> extends true ? string : DotDiscriminantPath<TValue>
    export type MatchByTuplePath<TValue> =
      IsUnsafe<TValue> extends true ? readonly PropertyKey[] : TupleDiscriminantPath<TValue>

    /**
     * Autocomplete-friendly path type accepted by `matchBy(value, path)`.
     *
     * For known object inputs, string paths are narrowed to common direct keys and
     * nested dot paths whose resolved value can act as a discriminant tag. Tuple
     * paths provide the same autocomplete-friendly traversal for symbols and literal
     * keys that contain dots.
     *
     * @typeParam TValue - Root value type passed to `matchBy`.
     * @see https://github.com/DiegoGBrisa/ts-match#nested-dot-path-and-tuple-path
     */
    export type MatchByPath<TValue> = MatchByStringPath<TValue> | MatchByTuplePath<TValue>

    /**
     * Resolves the TypeScript value type at a `matchBy` property path.
     *
     * Missing or nullable path segments contribute `undefined`, matching runtime path
     * traversal behavior.
     *
     * @typeParam TValue - Root value type.
     * @typeParam TPath - Direct key, dot path, or tuple path.
     * @see https://github.com/DiegoGBrisa/ts-match#nested-dot-path-and-tuple-path
     */
    export type PathValue<TValue, TPath extends PropertyPath> = TPath extends readonly PropertyKey[]
      ? PathValueFromTuple<TValue, TPath>
      : TPath extends string
        ? PathValueFromDot<TValue, TPath>
        : never

    export type PathValueFromDot<TValue, TPath extends string> = TPath extends `${infer THead}.${infer TTail}`
      ? PathValueStep<TValue, THead, TTail>
      : TValue extends unknown
        ? TValue extends null | undefined
          ? undefined
          : TPath extends keyof TValue
            ? TValue[TPath]
            : undefined
        : never

    export type PathValueStep<TValue, THead extends string, TTail extends string> = TValue extends unknown
      ? TValue extends null | undefined
        ? undefined
        : THead extends keyof TValue
          ? PathValueFromDot<TValue[THead], TTail>
          : undefined
      : never

    export type PathValueFromTuple<TValue, TPath extends readonly PropertyKey[]> = TPath extends readonly [
      infer THead extends PropertyKey,
      ...infer TTail extends PropertyKey[],
    ]
      ? TValue extends unknown
        ? TValue extends null | undefined
          ? undefined
          : THead extends keyof TValue
            ? PathValueFromTuple<TValue[THead], TTail>
            : undefined
        : never
      : TValue

    /**
     * Narrows a value union to members whose selected path can match a tag.
     *
     * @typeParam TValue - Root value union.
     * @typeParam TPath - Selected path.
     * @typeParam TTag - Tag used for narrowing.
     * @see https://github.com/DiegoGBrisa/ts-match#matchby
     */
    export type ExtractByPath<TValue, TPath extends PropertyPath, TTag> = TValue extends unknown
      ? TagOverlaps<PathValue<TValue, TPath>, TTag> extends true
        ? RefineByPath<TValue, TPath, TTag>
        : never
      : never

    /**
     * Extracts value union members fully covered by a `matchBy` tag branch.
     *
     * @typeParam TValue - Root value union.
     * @typeParam TPath - Selected path.
     * @typeParam TTag - Tag handled by the branch.
     * @see https://github.com/DiegoGBrisa/ts-match#matchby
     */
    export type CoveredByPath<TValue, TPath extends PropertyPath, TTag> = TValue extends unknown
      ? TagFullyCovers<PathValue<TValue, TPath>, TTag> extends true
        ? TValue
        : never
      : never

    export type TagOverlaps<TPathValue, TTag> = [LiteralMatch<TPathValue, TTag>] extends [never]
      ? [TTag] extends [undefined]
        ? undefined extends TPathValue
          ? true
          : false
        : false
      : true

    export type TagFullyCovers<TPathValue, TTag> = [TPathValue] extends [TTag]
      ? true
      : [TTag] extends [undefined]
        ? undefined extends TPathValue
          ? true
          : false
        : false

    export type RefineByPath<TValue, TPath extends PropertyPath, TTag> = TPath extends readonly PropertyKey[]
      ? RefineByTuplePath<TValue, TPath, TTag>
      : TPath extends string
        ? RefineByDotPath<TValue, TPath, TTag>
        : TValue

    export type RefineByDotPath<TValue, TPath extends string, TTag> = TPath extends `${infer THead}.${infer TTail}`
      ? TValue extends object
        ? THead extends keyof TValue
          ? Simplify<Omit<TValue, THead> & { [K in THead]: RefineByDotPath<TValue[K], TTail, TTag> }>
          : TValue
        : TValue
      : TValue extends object
        ? TPath extends keyof TValue
          ? Simplify<Omit<TValue, TPath> & { [K in TPath]: LiteralMatch<TValue[K], TTag> }>
          : TValue
        : TValue

    export type RefineByTuplePath<TValue, TPath extends readonly PropertyKey[], TTag> = TPath extends readonly [
      infer THead extends PropertyKey,
      ...infer TTail extends PropertyKey[],
    ]
      ? TValue extends object
        ? THead extends keyof TValue
          ? Simplify<Omit<TValue, THead> & { [K in THead]: RefineByTuplePath<TValue[K], TTail, TTag> }>
          : TValue
        : TValue
      : LiteralMatch<TValue, TTag>

    export type NormalizedCaseKey<TTag> = TTag extends true
      ? 'true'
      : TTag extends false
        ? 'false'
        : TTag extends number
          ? `${TTag}`
          : TTag extends string | symbol
            ? TTag
            : never

    export type ObjectCaseTags<TTags> = Exclude<TTags, null | undefined>
    /**
     * Property keys an object case map can use for a tag union.
     *
     * @typeParam TTags - Tag union to normalize into object keys.
     * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
     */
    export type ObjectCaseKeys<TTags> =
      | NormalizedCaseKey<ObjectCaseTags<TTags>>
      | Extract<ObjectCaseTags<TTags>, string | number | symbol>

    export type CollidingTags<TAll, TTag> = TAll extends unknown
      ? Equal<TAll, TTag> extends true
        ? never
        : NormalizedCaseKey<TAll> extends NormalizedCaseKey<TTag>
          ? TAll
          : never
      : never

    export type HasCollisionForTag<TAll, TTag = TAll> = TTag extends unknown
      ? [CollidingTags<TAll, TTag>] extends [never]
        ? false
        : true
      : never

    export type HasNormalizedCaseKeyCollisions<TTags> = true extends HasCollisionForTag<TTags> ? true : false

    export type IsFiniteCaseUnion<TTags> = [TTags] extends [never]
      ? false
      : true extends (TTags extends unknown ? IsBroad<TTags> : never)
        ? false
        : true

    /**
     * Object-map handler shape for `matchBy(...).cases({...})`.
     *
     * @typeParam TValue - Root value type.
     * @typeParam TPath - Selected path.
     * @typeParam TTags - Tags represented by the map.
     * @see https://github.com/DiegoGBrisa/ts-match#cases
     */
    export type CaseMap<TValue, TPath extends PropertyPath, TTags> = {
      [K in ObjectCaseKeys<TTags>]: (value: ExtractByNormalizedKey<TValue, TPath, TTags, K>) => unknown
    }

    export type CaseKeyMatches<TTag, TKey> =
      NormalizedCaseKey<TTag> extends TKey ? true : TTag extends TKey ? true : false
  }
}

export {}
