import type { GROUP_TOKEN } from '../group/token.js'

declare global {
  namespace TsMatchTypes {
    export type ObjectPatternSuggestion<TValue> = {
      readonly [K in PatternKey<TValue>]?: MatchPatternSuggestion<PatternValueAtKey<TValue, K>>
    }

    export type ArrayPatternSuggestion<TValue> = TValue extends readonly (infer TItem)[]
      ? readonly MatchPatternSuggestion<TItem>[]
      : never

    /**
     * Autocomplete-friendly structural pattern shape accepted by `match(...).with(...)`.
     *
     * This excludes `P.*` helper object internals so object-literal completions show
     * user value keys instead of helper implementation fields. The public matcher
     * overloads still accept helpers through the normal validation fallback.
     *
     * @typeParam TValue - Value type currently remaining in a match chain.
     * @see https://github.com/DiegoGBrisa/ts-match#withpattern-handler
     */
    export type MatchPatternSuggestion<TValue> =
      IsUnsafe<TValue> extends true
        ? never
        :
            | Extract<TValue, Primitive>
            | ArrayPatternSuggestion<TValue>
            | (TValue extends object ? ObjectPatternSuggestion<TValue> : never)

    /**
     * Constructor shape accepted by `P.instanceOf(...)`.
     *
     * @typeParam T - Instance type produced by the constructor.
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export type AbstractConstructor<T = object> = abstract new (...args: never[]) => T

    /**
     * Runtime primitive helper name associated with a primitive TypeScript type.
     *
     * @typeParam TPrimitive - Primitive type to name.
     * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
     */
    export type PrimitiveName<TPrimitive extends Primitive> = TPrimitive extends string
      ? 'string'
      : TPrimitive extends number
        ? 'number'
        : TPrimitive extends boolean
          ? 'boolean'
          : TPrimitive extends bigint
            ? 'bigint'
            : TPrimitive extends symbol
              ? 'symbol'
              : TPrimitive extends null
                ? 'null'
                : 'undefined'

    /**
     * Object entry created by `group(...)` for grouped `matchBy(...).cases(...)` handling.
     *
     * @typeParam TTags - Tags covered by the grouped handler.
     * @typeParam THandler - Handler invoked when one of the grouped tags matches.
     * @see https://github.com/DiegoGBrisa/ts-match#group
     */
    export interface GroupEntry<TTags extends readonly Discriminant[], THandler> {
      readonly [GROUP_TOKEN]: true
      readonly tags: TTags
      readonly handler: THandler
    }

    /** Tuple entry form `[tag, handler]` accepted by `matchBy(...).cases(...)`. */
    export type CaseEntry<TTag extends Discriminant, THandler> = readonly [TTag, THandler]
    /** Tuple entry form `[[tags], handler]` accepted by `matchBy(...).cases(...)`. */
    export type GroupedCaseEntry<TTags extends readonly Discriminant[], THandler> = readonly [TTags, THandler]
    /** Any grouped-case entry shape accepted by `matchBy(...).cases(...)`. */
    export type CasesEntry<THandler> =
      | CaseEntry<Discriminant, THandler>
      | GroupedCaseEntry<readonly Discriminant[], THandler>
      | GroupEntry<readonly Discriminant[], THandler>

    export type IsAny<T> = 0 extends 1 & T ? true : false
    export type IsUnknown<T> =
      IsAny<T> extends true ? false : unknown extends T ? ([keyof T] extends [never] ? true : false) : false
    export type IsUnsafe<T> = IsAny<T> extends true ? true : IsUnknown<T>

    export type Simplify<T> = T extends Primitive ? T : T extends object ? { [K in keyof T]: T[K] } : T

    export type NumericLiteral<TValue> =
      Extract<TValue, number> extends infer TNumber
        ? TNumber extends number
          ? number extends TNumber
            ? never
            : TNumber
          : never
        : never

    export type IntegerLiteral<TValue> =
      NumericLiteral<TValue> extends infer TNumber
        ? TNumber extends number
          ? `${TNumber}` extends `${bigint}`
            ? TNumber
            : never
          : never
        : never

    export type MatchedNan<TValue> = number extends Extract<TValue, number> ? number : never
    export type MatchedFinite<TValue> = Extract<TValue, number>
    export type MatchedInteger<TValue> = number extends Extract<TValue, number> ? number : IntegerLiteral<TValue>
    export type StaticFalsy = false | 0 | 0n | '' | null | undefined
    export type InferFalsy = StaticFalsy | number
    export type MatchedFalsy<TValue> =
      | Extract<TValue, StaticFalsy>
      | (string extends Extract<TValue, string> ? string : never)
      | (number extends Extract<TValue, number> ? number : never)
      | (bigint extends Extract<TValue, bigint> ? bigint : never)
    export type MatchedTruthy<TValue> = SafeExclude<TValue, StaticFalsy>
    export type CoveredNan<_TValue> = never
    export type CoveredFinite<TValue> = number extends Extract<TValue, number> ? never : NumericLiteral<TValue>
    export type CoveredInteger<TValue> = number extends Extract<TValue, number> ? never : IntegerLiteral<TValue>
    export type CoveredFalsy<TValue> = Extract<TValue, StaticFalsy>
    export type CoveredTruthy<TValue> = TValue extends unknown
      ? IsUnsafe<TValue> extends true
        ? never
        : TValue extends Primitive
          ? IsBroad<TValue> extends true
            ? never
            : TValue extends StaticFalsy
              ? never
              : TValue
          : Extract<TValue, Primitive> extends never
            ? TValue
            : never
      : never

    export type UnionToIntersection<T> = [T] extends [never]
      ? never
      : (T extends unknown ? (value: T) => void : never) extends (value: infer TIntersection) => void
        ? TIntersection
        : never

    export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

    export type IsUnion<T, TAll = T> = [T] extends [never]
      ? false
      : T extends unknown
        ? [TAll] extends [T]
          ? false
          : true
        : false

    export type IsBroad<T> = string extends T
      ? true
      : number extends T
        ? true
        : boolean extends T
          ? true
          : bigint extends T
            ? true
            : symbol extends T
              ? true
              : false

    export type LiteralMatch<TValue, TPattern> =
      | Extract<TValue, TPattern>
      | (TPattern extends TValue ? TPattern : never)

    export type AllItemsCovered<TValue, TPattern> = [TValue] extends [CoveredValue<TValue, TPattern>] ? true : false

    export type RequiredPatternKeys<TPattern extends object> = {
      [K in keyof TPattern]-?: TPattern[K] extends OptionalPattern<unknown> ? never : K
    }[keyof TPattern]

    export type OptionalPatternKeys<TPattern extends object> = {
      [K in keyof TPattern]-?: TPattern[K] extends OptionalPattern<unknown> ? K : never
    }[keyof TPattern]

    /**
     * Infers the runtime value type described by a pattern structure.
     *
     * This is useful for helper APIs that accept reusable patterns and need to expose
     * the value type those patterns validate.
     *
     * @typeParam TPattern - Pattern structure to infer from.
     * @see https://github.com/DiegoGBrisa/ts-match#root-type-only-exports
     */
  }
}

export {}
