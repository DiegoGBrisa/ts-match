declare global {
  namespace TsMatchTypes {
    export type DotPathExists<TValue, TPath extends string> = TPath extends `${infer THead}.${infer TTail}`
      ? TrueInUnion<
          TValue extends unknown
            ? TValue extends null | undefined
              ? false
              : THead extends keyof TValue
                ? DotPathExists<TValue[THead], TTail>
                : false
            : false
        >
      : TrueInUnion<
          TValue extends unknown
            ? TValue extends null | undefined
              ? false
              : TPath extends keyof TValue
                ? true
                : false
            : false
        >

    export type MatchByPathExists<TValue, TPath extends PropertyPath> =
      IsUnsafe<TValue> extends true
        ? true
        : TPath extends readonly PropertyKey[]
          ? TuplePathExists<TValue, TPath>
          : TPath extends string
            ? string extends TPath
              ? false
              : DotPathExists<TValue, TPath>
            : false

    /**
     * Compile-time diagnostic gate for `matchBy(value, path)` paths.
     *
     * The path must exist on the input type and resolve to a usable discriminant tag.
     * Dot paths are checked by segment; tuple paths support symbol keys and keys that
     * contain dots.
     *
     * @typeParam TValue - Value type being matched.
     * @typeParam TPath - Direct key, dot path, or tuple path.
     * @see https://github.com/DiegoGBrisa/ts-match#invalid-paths
     */
    export type MatchByPathArgument<TValue, TPath extends PropertyPath> =
      MatchByPathExists<TValue, TPath> extends true
        ? [Extract<PathValue<TValue, TPath>, Discriminant>] extends [never]
          ? TsMatchTypeError<
              'ts-match: matchBy path resolves to a value that cannot be used as a tag. Use a path whose value is a string, number, symbol, boolean, null, or undefined.',
              { readonly path: TPath; readonly pathValue: PathValue<TValue, TPath> }
            >
          : unknown
        : TsMatchTypeError<
            'ts-match: invalid matchBy path. Use an existing direct key, valid dot path, or tuple path. Use tuple paths for symbol keys or keys that contain dots.',
            { readonly path: TPath; readonly value: TValue }
          >

    /**
     * Compile-time diagnostic gate for one `matchBy(...).with(tag, handler)` tag.
     *
     * Tags must be JavaScript discriminants and must be possible values at the
     * selected path.
     *
     * @typeParam TValue - Value type being matched.
     * @typeParam TPath - Selected path.
     * @typeParam TTag - Candidate tag.
     * @see https://github.com/DiegoGBrisa/ts-match#impossible-cases
     */
    export type MatchByTagArgument<TValue, TPath extends PropertyPath, TTag> = TTag extends Discriminant
      ? TTag extends PathValue<TValue, TPath>
        ? unknown
        : TsMatchTypeError<
            'ts-match: this matchBy tag cannot occur at the selected path. Remove the impossible tag or fix the matchBy path.',
            { readonly path: TPath; readonly tag: TTag; readonly expected: PathValue<TValue, TPath> }
          >
      : TsMatchTypeError<
          'ts-match: matchBy tags must be JavaScript discriminants. Use string, number, symbol, boolean, null, or undefined tags.',
          { readonly path: TPath; readonly tag: TTag }
        >

    /**
     * Maps every variadic `matchBy(...).with(...tags, handler)` tag through diagnostics.
     *
     * @typeParam TValue - Value type being matched.
     * @typeParam TPath - Selected path.
     * @typeParam TTags - Variadic tag tuple.
     * @see https://github.com/DiegoGBrisa/ts-match#withtags-handler
     */
    export type MatchByTagsArgument<TValue, TPath extends PropertyPath, TTags extends readonly unknown[]> = {
      readonly [K in keyof TTags]: TTags[K] & MatchByTagArgument<TValue, TPath, TTags[K]>
    }

    /**
     * Compile-time diagnostic gate for `matchBy(...).exhaustive()`.
     *
     * When remaining tag cases are not fully handled, this type reports the remaining
     * tag/value information in a readable diagnostic.
     *
     * @typeParam TRemaining - Value union not yet handled by the chain.
     * @typeParam TPath - Selected path used to compute remaining tags.
     * @see https://github.com/DiegoGBrisa/ts-match#missing-exhaustive-cases
     */
    export type NonExhaustiveMatchByArgument<TRemaining, TPath extends PropertyPath> = [TRemaining] extends [never]
      ? unknown
      : TsMatchTypeError<
          'ts-match: matchBy is not exhaustive for the selected path. Add handlers for the remaining tag(s), or use .otherwise(...) when a fallback is intentional.',
          {
            readonly path: TPath
            readonly remaining: PathValue<TRemaining, TPath>
            readonly remainingValue: TRemaining
          }
        >

    export type ObjectCaseMapSupportArgument<TTags> =
      IsFiniteCaseUnion<TTags> extends true
        ? Extract<TTags, null | undefined> extends never
          ? HasNormalizedCaseKeyCollisions<TTags> extends true
            ? TsMatchTypeError<
                'ts-match: object-map case keys collide after JavaScript key normalization. Use tuple-entry cases or grouped callback cases instead.',
                { readonly tags: TTags }
              >
            : unknown
          : TsMatchTypeError<
              'ts-match: object-map cases cannot represent null or undefined tags. Use tuple-entry cases or grouped callback cases instead.',
              { readonly tags: TTags }
            >
        : TsMatchTypeError<
            'ts-match: object-map cases require a finite literal tag union. Use .with(...).exhaustive(), .partial(...).otherwise(...), or tuple-entry cases for broad tags.',
            { readonly tags: TTags }
          >

    export type MissingObjectCaseTag<THandlers, TTag> =
      Extract<keyof THandlers, ObjectCaseKeys<TTag>> extends never ? TTag : never

    export type MissingObjectCaseTags<THandlers, TTags> = TTags extends unknown
      ? MissingObjectCaseTag<THandlers, TTags>
      : never

    export type MissingObjectCaseKeysArgument<THandlers, TTags> =
      MissingObjectCaseTags<THandlers, TTags> extends infer TMissing
        ? [TMissing] extends [never]
          ? unknown
          : TsMatchTypeError<
              'ts-match: object-map cases are missing required key(s). Add handlers for the missing keys or use .partial(...).otherwise(...).',
              { readonly missing: TMissing; readonly expected: TTags }
            >
        : unknown

    /**
     * Compile-time diagnostic gate for exhaustive object-map `.cases({...})` inputs.
     *
     * Object maps require finite literal tags, no nullish tags, no key-normalization
     * collisions, and no missing required keys.
     *
     * @typeParam TTags - Expected tag union at the selected path.
     * @typeParam THandlers - Handler object supplied by the caller.
     * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
     */
    export type ObjectCaseMapArgument<TTags, THandlers> = ObjectCaseMapSupportArgument<TTags> &
      MissingObjectCaseKeysArgument<THandlers, TTags>

    export type ExtraCaseTagsArgument<TAllowedTags, TActualTags> =
      Exclude<TActualTags, TAllowedTags> extends infer TExtra
        ? [TExtra] extends [never]
          ? unknown
          : TsMatchTypeError<
              'ts-match: grouped case contains tag(s) that cannot occur at this matchBy path. Remove the impossible tag(s) or fix the path.',
              { readonly extra: TExtra; readonly expected: TAllowedTags }
            >
        : unknown

    export type MissingCaseTagsArgument<TExpectedTags, THandledTags> =
      IsFiniteCaseUnion<TExpectedTags> extends true
        ? Exclude<TExpectedTags, THandledTags> extends infer TMissing
          ? [TMissing] extends [never]
            ? unknown
            : TsMatchTypeError<
                'ts-match: cases are not exhaustive. Add handlers for the missing tag(s), or use .partial(...).otherwise(...).',
                { readonly missing: TMissing; readonly expected: TExpectedTags }
              >
          : unknown
        : TsMatchTypeError<
            'ts-match: exhaustive cases require a finite literal tag union. Use .partial(...).otherwise(...) or .with(...).otherwise(...) for broad tags.',
            { readonly expected: TExpectedTags }
          >

    /**
     * Compile-time diagnostic gate for exhaustive tuple/grouped case entries.
     *
     * Ensures grouped entries do not include impossible tags and do include every
     * expected finite tag.
     *
     * @typeParam TExpectedTags - Tag union that must be handled.
     * @typeParam THandledTags - Tags covered by the supplied entries.
     * @see https://github.com/DiegoGBrisa/ts-match#grouped-case-inference
     */
    export type ExhaustiveEntriesArgument<TExpectedTags, THandledTags> = ExtraCaseTagsArgument<
      TExpectedTags,
      THandledTags
    > &
      MissingCaseTagsArgument<TExpectedTags, THandledTags>

    /**
     * Compile-time diagnostic gate for partial tuple/grouped case entries.
     *
     * Partial entries may omit tags but still cannot include tags that are impossible
     * at the selected path.
     *
     * @typeParam TExpectedTags - Tag union that may be handled.
     * @typeParam THandledTags - Tags covered by the supplied entries.
     * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
     */
    export type PartialEntriesArgument<TExpectedTags, THandledTags> = ExtraCaseTagsArgument<TExpectedTags, THandledTags>

    export type OptionalSelectionPayload<TPayload> = [TPayload] extends [never]
      ? never
      : TPayload extends object
        ? { [K in keyof TPayload]: TPayload[K] | undefined }
        : TPayload | undefined
  }
}

export {}
