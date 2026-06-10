declare global {
  namespace TsMatchTypes {
    export type ExtractByNormalizedKey<TValue, TPath extends PropertyPath, TTags, TKey> = ExtractByPath<
      TValue,
      TPath,
      TTags extends unknown ? (CaseKeyMatches<TTags, TKey> extends true ? TTags : never) : never
    >

    /**
     * Compile-time diagnostic gate that rejects extra object-map keys.
     *
     * @typeParam TActual - User-supplied object map.
     * @typeParam TAllowedKeys - Keys allowed for the selected tag union.
     * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
     */
    export type NoExtraKeys<TActual, TAllowedKeys extends PropertyKey> =
      Exclude<keyof TActual, TAllowedKeys> extends infer TExtra
        ? [TExtra] extends [never]
          ? unknown
          : {
              readonly [K in Extract<TExtra, PropertyKey>]: TsMatchTypeError<
                'ts-match: object-map case contains an extra key that is not a possible tag. Remove the key, fix the matchBy path, or use tuple-entry cases when object keys are not enough.',
                { readonly key: K; readonly expected: TAllowedKeys }
              >
            }
        : unknown

    /**
     * Result object returned by promise matcher safe terminals.
     *
     * The object is intentionally mutable and uses `ok` as the discriminant so
     * callers get straightforward control-flow narrowing without annotations.
     *
     * @typeParam T - Successful resolved output value.
     * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
     */
    export type MatchPromiseResult<T> = { ok: true; value: T } | { ok: false; error: unknown }

    /**
     * Recursively unwraps promise-like return types from promise match handlers.
     *
     * @typeParam T - Handler return type to unwrap.
     * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
     */
    export type AwaitedReturn<T> = T extends PromiseLike<infer TResult> ? AwaitedReturn<TResult> : T
  }
}

export {}
