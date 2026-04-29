import type { GROUP_TOKEN, PATTERN_TOKEN } from './tokens.js'

export type Primitive = string | number | boolean | bigint | symbol | null | undefined
export type Discriminant = PropertyKey | boolean | null | undefined
export type PropertyPath = string | readonly PropertyKey[]

export type PatternKind =
  | 'wildcard'
  | 'primitive'
  | 'nan'
  | 'finite'
  | 'integer'
  | 'union'
  | 'exclude'
  | 'optional'
  | 'array'
  | 'non-empty-array'
  | 'tuple'
  | 'rest'
  | 'exact'
  | 'when'
  | 'instance-of'
  | 'select'
  | 'record'
  | 'non-empty-record'

interface PatternBase<TKind extends PatternKind> {
  readonly [PATTERN_TOKEN]: TKind
}

export type WildcardPattern = PatternBase<'wildcard'>

export interface PrimitivePattern<TPrimitive extends Primitive> extends PatternBase<'primitive'> {
  readonly primitive: PrimitiveName<TPrimitive>
}

export type NanPattern = PatternBase<'nan'>
export type FinitePattern = PatternBase<'finite'>
export type IntegerPattern = PatternBase<'integer'>

export interface UnionPattern<TPatterns extends readonly unknown[]> extends PatternBase<'union'> {
  readonly patterns: TPatterns
}

export interface ExcludePattern<TPattern> extends PatternBase<'exclude'> {
  readonly pattern: TPattern
}

export interface OptionalPattern<TPattern> extends PatternBase<'optional'> {
  readonly pattern: TPattern
}

export interface ArrayPattern<TPattern> extends PatternBase<'array'> {
  readonly item: TPattern
}

export interface NonEmptyArrayPattern<TPattern> extends PatternBase<'non-empty-array'> {
  readonly item: TPattern
}

export interface TuplePattern<TPatterns extends readonly unknown[]> extends PatternBase<'tuple'> {
  readonly items: TPatterns
}

export interface RestPattern<TPattern> extends PatternBase<'rest'> {
  readonly item: TPattern
}

export interface ExactPattern<TPattern> extends PatternBase<'exact'> {
  readonly pattern: TPattern
}

export interface GuardPattern<TGuarded, TNarrows extends boolean> extends PatternBase<'when'> {
  readonly predicate: (value: unknown) => boolean
  readonly narrows: TNarrows
  readonly guarded?: TGuarded
}

export interface InstanceOfPattern<TConstructor extends AbstractConstructor> extends PatternBase<'instance-of'> {
  readonly constructor: TConstructor
}

export interface AnonymousSelectPattern<TPattern> extends PatternBase<'select'> {
  readonly name: undefined
  readonly pattern: TPattern
}

export interface NamedSelectPattern<TName extends PropertyKey, TPattern> extends PatternBase<'select'> {
  readonly name: TName
  readonly pattern: TPattern
}

export type SelectPattern<TName extends PropertyKey | undefined, TPattern> = TName extends PropertyKey
  ? NamedSelectPattern<TName, TPattern>
  : AnonymousSelectPattern<TPattern>

export interface RecordPattern<TKeyPattern, TValuePattern> extends PatternBase<'record'> {
  readonly key: TKeyPattern
  readonly value: TValuePattern
}

export interface NonEmptyRecordPattern<TKeyPattern, TValuePattern> extends PatternBase<'non-empty-record'> {
  readonly key: TKeyPattern
  readonly value: TValuePattern
}

export type BuiltInPattern =
  | WildcardPattern
  | PrimitivePattern<Primitive>
  | NanPattern
  | FinitePattern
  | IntegerPattern
  | UnionPattern<readonly unknown[]>
  | ExcludePattern<unknown>
  | OptionalPattern<unknown>
  | ArrayPattern<unknown>
  | NonEmptyArrayPattern<unknown>
  | TuplePattern<readonly unknown[]>
  | RestPattern<unknown>
  | ExactPattern<unknown>
  | GuardPattern<unknown, boolean>
  | InstanceOfPattern<AbstractConstructor>
  | SelectPattern<PropertyKey | undefined, unknown>
  | RecordPattern<unknown, unknown>
  | NonEmptyRecordPattern<unknown, unknown>

export type AbstractConstructor<T = object> = abstract new (...args: never[]) => T

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

export interface GroupEntry<TTags extends readonly Discriminant[], THandler> {
  readonly [GROUP_TOKEN]: true
  readonly tags: TTags
  readonly handler: THandler
}

export type CaseEntry<TTag extends Discriminant, THandler> = readonly [TTag, THandler]
export type GroupedCaseEntry<TTags extends readonly Discriminant[], THandler> = readonly [TTags, THandler]
export type CasesEntry<THandler> =
  | CaseEntry<Discriminant, THandler>
  | GroupedCaseEntry<readonly Discriminant[], THandler>
  | GroupEntry<readonly Discriminant[], THandler>

type IsAny<T> = 0 extends 1 & T ? true : false
type IsUnknown<T> =
  IsAny<T> extends true ? false : unknown extends T ? ([keyof T] extends [never] ? true : false) : false
type IsUnsafe<T> = IsAny<T> extends true ? true : IsUnknown<T>

type Simplify<T> = T extends Primitive ? T : T extends object ? { [K in keyof T]: T[K] } : T

type NumericLiteral<TValue> =
  Extract<TValue, number> extends infer TNumber
    ? TNumber extends number
      ? number extends TNumber
        ? never
        : TNumber
      : never
    : never

type IntegerLiteral<TValue> =
  NumericLiteral<TValue> extends infer TNumber
    ? TNumber extends number
      ? `${TNumber}` extends `${bigint}`
        ? TNumber
        : never
      : never
    : never

type MatchedNan<TValue> = number extends Extract<TValue, number> ? number : never
type MatchedFinite<TValue> = Extract<TValue, number>
type MatchedInteger<TValue> = number extends Extract<TValue, number> ? number : IntegerLiteral<TValue>
type CoveredNan<_TValue> = never
type CoveredFinite<TValue> = number extends Extract<TValue, number> ? never : NumericLiteral<TValue>
type CoveredInteger<TValue> = number extends Extract<TValue, number> ? never : IntegerLiteral<TValue>

type UnionToIntersection<T> = [T] extends [never]
  ? never
  : (T extends unknown ? (value: T) => void : never) extends (value: infer TIntersection) => void
    ? TIntersection
    : never

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type IsUnion<T, TAll = T> = [T] extends [never]
  ? false
  : T extends unknown
    ? [TAll] extends [T]
      ? false
      : true
    : false

type IsBroad<T> = string extends T
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

type LiteralMatch<TValue, TPattern> = Extract<TValue, TPattern> | (TPattern extends TValue ? TPattern : never)

type AllItemsCovered<TValue, TPattern> = [TValue] extends [CoveredValue<TValue, TPattern>] ? true : false

type RequiredPatternKeys<TPattern extends object> = {
  [K in keyof TPattern]-?: TPattern[K] extends OptionalPattern<unknown> ? never : K
}[keyof TPattern]

type OptionalPatternKeys<TPattern extends object> = {
  [K in keyof TPattern]-?: TPattern[K] extends OptionalPattern<unknown> ? K : never
}[keyof TPattern]

export type InferPattern<TPattern> = TPattern extends WildcardPattern
  ? unknown
  : TPattern extends PrimitivePattern<infer TPrimitive>
    ? TPrimitive
    : TPattern extends NanPattern | FinitePattern | IntegerPattern
      ? number
      : TPattern extends UnionPattern<infer TPatterns>
        ? InferPattern<TPatterns[number]>
        : TPattern extends ExcludePattern<unknown>
          ? unknown
          : TPattern extends OptionalPattern<infer TInner>
            ? InferPattern<TInner> | undefined
            : TPattern extends ArrayPattern<infer TItem>
              ? InferPattern<TItem>[]
              : TPattern extends NonEmptyArrayPattern<infer TItem>
                ? [InferPattern<TItem>, ...InferPattern<TItem>[]]
                : TPattern extends TuplePattern<infer TItems>
                  ? InferTuplePattern<TItems>
                  : TPattern extends RestPattern<infer TItem>
                    ? InferPattern<TItem>[]
                    : TPattern extends ExactPattern<infer TInner>
                      ? InferPattern<TInner>
                      : TPattern extends GuardPattern<infer TGuarded, true>
                        ? TGuarded
                        : TPattern extends GuardPattern<infer TInput, false>
                          ? TInput
                          : TPattern extends InstanceOfPattern<infer TConstructor>
                            ? InstanceType<TConstructor>
                            : TPattern extends AnonymousSelectPattern<infer TInner>
                              ? InferPattern<TInner>
                              : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
                                ? InferPattern<TInner>
                                : TPattern extends RecordPattern<infer TKey, infer TValue>
                                  ? InferRecordPattern<TKey, TValue>
                                  : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                                    ? InferRecordPattern<TKey, TValue>
                                    : TPattern extends readonly unknown[]
                                      ? InferTuplePattern<TPattern>
                                      : TPattern extends Primitive
                                        ? TPattern
                                        : TPattern extends object
                                          ? InferObjectPattern<TPattern>
                                          : never

type InferObjectPattern<TPattern extends object> = Simplify<
  { [K in RequiredPatternKeys<TPattern>]: InferPattern<TPattern[K]> } & {
    [K in OptionalPatternKeys<TPattern>]?: TPattern[K] extends OptionalPattern<infer TInner>
      ? InferPattern<TInner> | undefined
      : never
  }
>

type InferTuplePattern<TPatterns extends readonly unknown[]> = TPatterns extends readonly [infer THead, ...infer TTail]
  ? THead extends RestPattern<infer TRest>
    ? InferPattern<TRest>[]
    : TTail extends readonly []
      ? [InferPattern<THead>]
      : TTail extends readonly [RestPattern<infer TRest>]
        ? [InferPattern<THead>, ...InferPattern<TRest>[]]
        : [InferPattern<THead>, ...InferTuplePattern<TTail>]
  : []

type InferRecordPattern<TKeyPattern, TValuePattern> =
  InferPattern<TKeyPattern> extends infer TKey
    ? Extract<TKey, PropertyKey> extends never
      ? Record<PropertyKey, InferPattern<TValuePattern>>
      : Record<Extract<TKey, PropertyKey>, InferPattern<TValuePattern>>
    : never

export type MatchedValue<TValue, TPattern> =
  TPattern extends RestPattern<unknown>
    ? never
    : TPattern extends GuardPattern<infer TGuarded, true>
      ? IsUnsafe<TValue> extends true
        ? TGuarded
        : Extract<TValue, TGuarded>
      : TPattern extends GuardPattern<infer TInput, false>
        ? IsUnsafe<TValue> extends true
          ? TInput
          : Extract<TValue, TInput>
        : IsUnsafe<TValue> extends true
          ? InferPattern<TPattern>
          : TPattern extends WildcardPattern
            ? TValue
            : TPattern extends PrimitivePattern<infer TPrimitive>
              ? Extract<TValue, TPrimitive>
              : TPattern extends NanPattern
                ? MatchedNan<TValue>
                : TPattern extends FinitePattern
                  ? MatchedFinite<TValue>
                  : TPattern extends IntegerPattern
                    ? MatchedInteger<TValue>
                    : TPattern extends UnionPattern<infer TPatterns>
                      ? MatchedValue<TValue, TPatterns[number]>
                      : TPattern extends ExcludePattern<infer TInner>
                        ? SafeExclude<TValue, CoveredValue<TValue, TInner>>
                        : TPattern extends OptionalPattern<infer TInner>
                          ? MatchedValue<TValue, TInner> | Extract<TValue, undefined>
                          : TPattern extends ArrayPattern<infer TItem>
                            ? MatchedArray<TValue, TItem>
                            : TPattern extends NonEmptyArrayPattern<infer TItem>
                              ? MatchedNonEmptyArray<TValue, TItem>
                              : TPattern extends TuplePattern<infer TItems>
                                ? MatchedTuple<TValue, TItems>
                                : TPattern extends ExactPattern<infer TInner>
                                  ? MatchedExactValue<TValue, TInner>
                                  : TPattern extends InstanceOfPattern<infer TConstructor>
                                    ? Extract<TValue, InstanceType<TConstructor>>
                                    : TPattern extends AnonymousSelectPattern<infer TInner>
                                      ? MatchedValue<TValue, TInner>
                                      : TPattern extends NamedSelectPattern<PropertyKey, infer TInner>
                                        ? MatchedValue<TValue, TInner>
                                        : TPattern extends RecordPattern<infer TKey, infer TRecordValue>
                                          ? MatchedRecord<TValue, TKey, TRecordValue, false>
                                          : TPattern extends NonEmptyRecordPattern<infer TKey, infer TRecordValue>
                                            ? MatchedRecord<TValue, TKey, TRecordValue, true>
                                            : TPattern extends readonly unknown[]
                                              ? MatchedTuple<TValue, TPattern>
                                              : TPattern extends Primitive
                                                ? LiteralMatch<TValue, TPattern>
                                                : TPattern extends object
                                                  ? MatchedObject<TValue, TPattern>
                                                  : never

type CoveredVariant<TValue, TPattern> = TPattern extends unknown
  ? TPattern extends ExactPattern<infer TInner>
    ? MatchedExactValue<TValue, TInner>
    : CoveredValue<TValue, TPattern>
  : never

export type RemainingAfterPattern<TValue, TPattern> = TValue extends unknown
  ? [TValue] extends [CoveredVariant<TValue, TPattern>]
    ? never
    : TValue
  : never

export type RemainingAfterPatterns<TValue, TPatterns> = RemainingAfterPattern<TValue, TPatterns>

type CoveredValue<TValue, TPattern> =
  TPattern extends GuardPattern<unknown, false>
    ? never
    : TPattern extends RestPattern<unknown>
      ? never
      : TPattern extends NanPattern
        ? CoveredNan<TValue>
        : TPattern extends FinitePattern
          ? CoveredFinite<TValue>
          : TPattern extends IntegerPattern
            ? CoveredInteger<TValue>
            : TPattern extends ArrayPattern<infer TItem>
              ? CoveredArray<TValue, TItem>
              : TPattern extends NonEmptyArrayPattern<infer TItem>
                ? CoveredNonEmptyArray<TValue, TItem>
                : TPattern extends TuplePattern<infer TItems>
                  ? MatchedTuple<TValue, TItems>
                  : TPattern extends ExactPattern<infer TInner>
                    ? MatchedExactValue<TValue, TInner>
                    : TPattern extends RecordPattern<infer TKey, infer TValuePattern>
                      ? CoveredRecord<TValue, TKey, TValuePattern>
                      : TPattern extends NonEmptyRecordPattern<unknown, unknown>
                        ? never
                        : MatchedValue<TValue, TPattern>

type SafeExclude<TValue, TExcluded> = TValue extends string
  ? string extends TValue
    ? TExcluded extends string
      ? string extends TExcluded
        ? never
        : TValue
      : Exclude<TValue, TExcluded>
    : Exclude<TValue, TExcluded>
  : TValue extends number
    ? number extends TValue
      ? TExcluded extends number
        ? number extends TExcluded
          ? never
          : TValue
        : Exclude<TValue, TExcluded>
      : Exclude<TValue, TExcluded>
    : TValue extends bigint
      ? bigint extends TValue
        ? TExcluded extends bigint
          ? bigint extends TExcluded
            ? never
            : TValue
          : Exclude<TValue, TExcluded>
        : Exclude<TValue, TExcluded>
      : TValue extends symbol
        ? symbol extends TValue
          ? TExcluded extends symbol
            ? symbol extends TExcluded
              ? never
              : TValue
            : Exclude<TValue, TExcluded>
          : Exclude<TValue, TExcluded>
        : Exclude<TValue, TExcluded>

type MutableArray<T> = T[]
type ReadonlyArrayOf<T> = readonly T[]

type ArrayOutput<TValue, TItem> = TValue extends unknown[] ? MutableArray<TItem> : ReadonlyArrayOf<TItem>

type NonEmptyArrayOutput<TValue, TItem> = TValue extends unknown[] ? [TItem, ...TItem[]] : readonly [TItem, ...TItem[]]

type EveryKnownArrayItemMatches<TArray extends readonly unknown[], TItemPattern> = TArray extends readonly [
  infer THead,
  ...infer TTail,
]
  ? [MatchedValue<THead, TItemPattern>] extends [never]
    ? false
    : EveryKnownArrayItemMatches<TTail, TItemPattern>
  : true

type MatchedArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly (infer TItem)[]
      ? number extends TArray['length']
        ? [MatchedValue<TItem, TItemPattern>] extends [never]
          ? never
          : ArrayOutput<TArray, MatchedValue<TItem, TItemPattern>>
        : EveryKnownArrayItemMatches<TArray, TItemPattern> extends true
          ? TArray
          : never
      : never
    : never

type MatchedNonEmptyArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly []
      ? never
      : TArray extends readonly (infer TItem)[]
        ? number extends TArray['length']
          ? [MatchedValue<TItem, TItemPattern>] extends [never]
            ? never
            : NonEmptyArrayOutput<TArray, MatchedValue<TItem, TItemPattern>>
          : EveryKnownArrayItemMatches<TArray, TItemPattern> extends true
            ? TArray
            : never
        : never
    : never

type CoveredArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly (infer TItem)[]
      ? number extends TArray['length']
        ? AllItemsCovered<TItem, TItemPattern> extends true
          ? TArray
          : never
        : EveryKnownArrayItemMatches<TArray, TItemPattern> extends true
          ? TArray
          : never
      : never
    : never

type CoveredNonEmptyArray<TValue, TItemPattern> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly unknown[]
      ? TArray extends readonly []
        ? never
        : number extends TArray['length']
          ? never
          : TArray extends readonly (infer TItem)[]
            ? AllItemsCovered<TItem, TItemPattern> extends true
              ? TArray
              : never
            : never
      : never
    : never

type MatchedTuple<TValue, TPatterns extends readonly unknown[]> =
  Extract<TValue, readonly unknown[]> extends infer TArray
    ? TArray extends readonly unknown[]
      ? TupleCompatible<TArray, TPatterns> extends true
        ? TArray
        : IsUnsafe<TArray> extends true
          ? InferTuplePattern<TPatterns>
          : never
      : never
    : never

type TupleCompatible<
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

type BroadArrayTupleCompatible<TItem, TPatterns extends readonly unknown[]> = TPatterns extends readonly [
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

type EveryTupleItemMatches<TArray extends readonly unknown[], TPattern> = TArray extends readonly [
  infer THead,
  ...infer TTail,
]
  ? [MatchedValue<THead, TPattern>] extends [never]
    ? false
    : EveryTupleItemMatches<TTail, TPattern>
  : true

type NonRecordObject =
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

type KnownKeyCount<TValue> = keyof TValue extends never ? 0 : 1

type RuntimeComparableKey<TKey> = TKey extends string
  ? TKey | (TKey extends `${number}` ? number : never)
  : TKey extends number
    ? TKey | `${TKey}`
    : TKey

type RecordKeyCompatible<TKey, TKeyPattern> = [MatchedValue<RuntimeComparableKey<TKey>, TKeyPattern>] extends [never]
  ? false
  : true

type RecordObjectCompatible<TValue extends object, TKeyPattern, TValuePattern> = false extends {
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

type MatchedRecord<
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

type CoveredRecord<TValue, _TKeyPattern, TValuePattern> = TValue extends NonRecordObject
  ? never
  : TValue extends Record<PropertyKey, infer TRecordValue>
    ? AllItemsCovered<TRecordValue, TValuePattern> extends true
      ? TValue
      : never
    : never

type MatchedObject<TValue, TPattern extends object> = TValue extends unknown
  ? TValue extends object
    ? ObjectPatternCompatible<TValue, TPattern> extends true
      ? RefineObject<TValue, TPattern>
      : never
    : never
  : never

type ObjectPatternCompatible<TValue extends object, TPattern extends object> = false extends {
  [K in keyof TPattern]: K extends keyof TValue
    ? [MatchedValue<TValue[K], TPattern[K]>] extends [never]
      ? false
      : true
    : TPattern[K] extends OptionalPattern<unknown>
      ? true
      : false
}[keyof TPattern]
  ? false
  : true

type RefineObject<TValue extends object, TPattern extends object> = Simplify<{
  [K in keyof TValue]: K extends keyof TPattern ? MatchedValue<TValue[K], TPattern[K]> : TValue[K]
}>

type MatchedExactValue<TValue, TPattern> = TPattern extends WildcardPattern
  ? TValue
  : TPattern extends PrimitivePattern<Primitive>
    ? MatchedValue<TValue, TPattern>
    : TPattern extends NanPattern | FinitePattern | IntegerPattern
      ? MatchedValue<TValue, TPattern>
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
                              : TPattern extends RecordPattern<infer TKey, infer TRecordValue>
                                ? MatchedRecord<TValue, TKey, TRecordValue, false>
                                : TPattern extends NonEmptyRecordPattern<infer TKey, infer TRecordValue>
                                  ? MatchedRecord<TValue, TKey, TRecordValue, true>
                                  : TPattern extends readonly unknown[]
                                    ? MatchedTuple<TValue, TPattern>
                                    : TPattern extends Primitive
                                      ? LiteralMatch<TValue, TPattern>
                                      : TPattern extends object
                                        ? MatchedExactObject<TValue, TPattern>
                                        : never

type MatchedExactObject<TValue, TPattern extends object> = TValue extends unknown
  ? TValue extends object
    ? ExactObjectCompatible<TValue, TPattern> extends true
      ? RefineExactObject<TValue, TPattern>
      : never
    : never
  : never

type ExactObjectCompatible<TValue extends object, TPattern extends object> =
  Exclude<keyof TValue, keyof TPattern> extends never ? ObjectPatternCompatible<TValue, TPattern> : false

type RefineExactObject<TValue extends object, TPattern extends object> = Simplify<{
  [K in keyof TValue]: K extends keyof TPattern ? MatchedExactValue<TValue[K], TPattern[K]> : TValue[K]
}>

type SelectionMode = 'none' | 'anonymous' | 'named' | 'invalid'

type MergeSelectionModes<TLeft extends SelectionMode, TRight extends SelectionMode> = TLeft extends 'invalid'
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

type SelectionModeFromTuple<
  TPatterns extends readonly unknown[],
  TMode extends SelectionMode = 'none',
> = TPatterns extends readonly [infer THead, ...infer TTail]
  ? SelectionModeFromTuple<TTail, MergeSelectionModes<TMode, SelectionModeOf<THead>>>
  : TMode

type ObjectSelectionKeys<TPattern extends object, TMode extends SelectionMode> = {
  [K in keyof TPattern]: SelectionModeOf<TPattern[K]> extends TMode ? K : never
}[keyof TPattern]

type ObjectSelectionMode<TPattern extends object> = keyof TPattern extends never
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

type SelectionModeOf<TPattern> = TPattern extends
  | WildcardPattern
  | PrimitivePattern<Primitive>
  | NanPattern
  | FinitePattern
  | IntegerPattern
  | GuardPattern<unknown, boolean>
  | InstanceOfPattern<AbstractConstructor>
  ? 'none'
  : TPattern extends AnonymousSelectPattern<unknown>
    ? 'anonymous'
    : TPattern extends NamedSelectPattern<PropertyKey, unknown>
      ? 'named'
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
                          : TPattern extends readonly unknown[]
                            ? SelectionModeFromTuple<TPattern>
                            : TPattern extends object
                              ? ObjectSelectionMode<TPattern>
                              : 'none'

type ContainsSelection<TPattern> = TPattern extends
  | AnonymousSelectPattern<unknown>
  | NamedSelectPattern<PropertyKey, unknown>
  ? true
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
                      : TPattern extends readonly unknown[]
                        ? true extends (TPattern[number] extends unknown ? ContainsSelection<TPattern[number]> : never)
                          ? true
                          : false
                        : TPattern extends object
                          ? true extends {
                              [K in keyof TPattern]: ContainsSelection<TPattern[K]>
                            }[keyof TPattern]
                            ? true
                            : false
                          : false

type RestUsageValid<TPattern> =
  TPattern extends RestPattern<unknown>
    ? false
    : TPattern extends UnionPattern<infer TPatterns>
      ? false extends (TPatterns[number] extends unknown ? RestUsageValid<TPatterns[number]> : never)
        ? false
        : true
      : TPattern extends ExcludePattern<infer TInner>
        ? RestUsageValid<TInner>
        : TPattern extends OptionalPattern<infer TInner>
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
                      : TPattern extends readonly unknown[]
                        ? TupleRestUsageValid<TPattern>
                        : TPattern extends object
                          ? false extends {
                              [K in keyof TPattern]: RestUsageValid<TPattern[K]>
                            }[keyof TPattern]
                            ? false
                            : true
                          : true

type TupleRestUsageValid<TPatterns extends readonly unknown[]> = TPatterns extends readonly []
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

type TsMatchTypeError<TMessage extends string, TDetails = unknown> = {
  readonly [K in TMessage]: TDetails
} & {
  readonly 'ts-match: diagnostic': true
}

type InvalidRestUsageError<TPattern> = TsMatchTypeError<
  'ts-match: invalid P.rest(...) usage. P.rest(...) can only appear as the final item of a tuple pattern; move it to the end of P.tuple([...]) or remove it.',
  { readonly pattern: TPattern }
>

type InvalidSelectionUsageError<TPattern> = TsMatchTypeError<
  'ts-match: invalid P.select(...) usage. Use one anonymous selection, do not mix anonymous and named selections, and do not place selections inside repeated/negative containers such as P.array(...), P.record(...), or P.exclude(...).',
  { readonly pattern: TPattern }
>

export type PatternStructureArgument<TPattern> =
  RestUsageValid<TPattern> extends false
    ? InvalidRestUsageError<TPattern>
    : SelectionModeOf<TPattern> extends 'invalid'
      ? InvalidSelectionUsageError<TPattern>
      : unknown

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

export type RepeatedPatternArgument<TPattern, TApi extends string> = PatternStructureArgument<TPattern> &
  (ContainsSelection<TPattern> extends true
    ? TsMatchTypeError<
        'ts-match: repeated container patterns cannot contain P.select(...). Move the selection outside the repeated pattern or match a single item first.',
        { readonly api: TApi; readonly pattern: TPattern }
      >
    : unknown)

export type ExcludePatternArgument<TPattern> = PatternStructureArgument<TPattern> &
  (ContainsSelection<TPattern> extends true
    ? TsMatchTypeError<
        'ts-match: P.exclude(pattern) cannot contain P.select(...). Remove P.select(...) or move the selection outside P.exclude(...).',
        { readonly pattern: TPattern }
      >
    : unknown)

export type TuplePatternArgument<TPatterns extends readonly unknown[]> = PatternStructureArgument<TPatterns>

export type RecordKeyPatternArgument<TKeyPattern, TApi extends string> = PatternStructureArgument<TKeyPattern> &
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

export type RecordValuePatternArgument<TValuePattern, TApi extends string> = PatternStructureArgument<TValuePattern> &
  (ContainsSelection<TValuePattern> extends true
    ? TsMatchTypeError<
        'ts-match: record value patterns cannot contain P.select(...). Record patterns repeat across values, so selections would be ambiguous.',
        { readonly api: TApi; readonly valuePattern: TValuePattern }
      >
    : unknown)

export type NonExhaustiveMatchArgument<TRemaining, TApi extends string> = [TRemaining] extends [never]
  ? unknown
  : TsMatchTypeError<
      'ts-match: match is not exhaustive. Add handlers for the remaining case(s), or use .otherwise(...) when a fallback is intentional.',
      { readonly api: TApi; readonly remaining: TRemaining }
    >

type TrueInUnion<TValue> = true extends TValue ? true : false

type TuplePathExists<TValue, TPath extends readonly PropertyKey[]> = TPath extends readonly []
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

type DotPathExists<TValue, TPath extends string> = TPath extends `${infer THead}.${infer TTail}`
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

type MatchByPathExists<TValue, TPath extends PropertyPath> =
  IsUnsafe<TValue> extends true
    ? true
    : TPath extends readonly PropertyKey[]
      ? TuplePathExists<TValue, TPath>
      : TPath extends string
        ? string extends TPath
          ? false
          : DotPathExists<TValue, TPath>
        : false

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

export type MatchByTagsArgument<TValue, TPath extends PropertyPath, TTags extends readonly unknown[]> = {
  readonly [K in keyof TTags]: TTags[K] & MatchByTagArgument<TValue, TPath, TTags[K]>
}

export type NonExhaustiveMatchByArgument<TRemaining, TPath extends PropertyPath> = [TRemaining] extends [never]
  ? unknown
  : TsMatchTypeError<
      'ts-match: matchBy is not exhaustive for the selected path. Add handlers for the remaining tag(s), or use .otherwise(...) when a fallback is intentional.',
      { readonly path: TPath; readonly remaining: PathValue<TRemaining, TPath>; readonly remainingValue: TRemaining }
    >

type ObjectCaseMapSupportArgument<TTags> =
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

type MissingObjectCaseTag<THandlers, TTag> = Extract<keyof THandlers, ObjectCaseKeys<TTag>> extends never ? TTag : never

type MissingObjectCaseTags<THandlers, TTags> = TTags extends unknown ? MissingObjectCaseTag<THandlers, TTags> : never

type MissingObjectCaseKeysArgument<THandlers, TTags> =
  MissingObjectCaseTags<THandlers, TTags> extends infer TMissing
    ? [TMissing] extends [never]
      ? unknown
      : TsMatchTypeError<
          'ts-match: object-map cases are missing required key(s). Add handlers for the missing keys or use .partial(...).otherwise(...).',
          { readonly missing: TMissing; readonly expected: TTags }
        >
    : unknown

export type ObjectCaseMapArgument<TTags, THandlers> = ObjectCaseMapSupportArgument<TTags> &
  MissingObjectCaseKeysArgument<THandlers, TTags>

type ExtraCaseTagsArgument<TAllowedTags, TActualTags> =
  Exclude<TActualTags, TAllowedTags> extends infer TExtra
    ? [TExtra] extends [never]
      ? unknown
      : TsMatchTypeError<
          'ts-match: grouped case contains tag(s) that cannot occur at this matchBy path. Remove the impossible tag(s) or fix the path.',
          { readonly extra: TExtra; readonly expected: TAllowedTags }
        >
    : unknown

type MissingCaseTagsArgument<TExpectedTags, THandledTags> =
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

export type ExhaustiveEntriesArgument<TExpectedTags, THandledTags> = ExtraCaseTagsArgument<
  TExpectedTags,
  THandledTags
> &
  MissingCaseTagsArgument<TExpectedTags, THandledTags>

export type PartialEntriesArgument<TExpectedTags, THandledTags> = ExtraCaseTagsArgument<TExpectedTags, THandledTags>

type OptionalSelectionPayload<TPayload> = [TPayload] extends [never]
  ? never
  : TPayload extends object
    ? { [K in keyof TPayload]: TPayload[K] | undefined }
    : TPayload | undefined

type SelectPayload<TValue, TPattern> =
  TPattern extends AnonymousSelectPattern<infer TInner>
    ? MatchedValue<TValue, TInner>
    : TPattern extends NamedSelectPattern<infer TName, infer TInner>
      ? { [K in TName]: MatchedValue<TValue, TInner> }
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

type ObjectSelectPayloadUnion<TValue, TPattern extends object> = {
  [K in keyof TPattern]: K extends keyof TValue ? SelectPayload<TValue[K], TPattern[K]> : never
}[keyof TPattern]

type SelectPayloadFromObject<TValue, TPattern extends object> = UnionToIntersection<
  ObjectSelectPayloadUnion<TValue, TPattern>
>

type SelectPayloadFromTuple<TValue, TPatterns extends readonly unknown[]> = UnionToIntersection<
  SelectPayloadFromTupleUnion<TValue, TPatterns>
>

type SelectPayloadFromTupleUnion<TValue, TPatterns extends readonly unknown[]> = TValue extends readonly [
  infer THead,
  ...infer TTail,
]
  ? TPatterns extends readonly [infer PHead, ...infer PTail]
    ? PHead extends RestPattern<infer TRest>
      ? SelectPayload<TValue[number], TRest>
      : SelectPayload<THead, PHead> | SelectPayloadFromTupleUnion<TTail, PTail>
    : never
  : never

export type HandlerInput<TValue, TPattern> = TPattern extends unknown
  ? Simplify<HandlerInputForPattern<TValue, TPattern>>
  : never

type HandlerInputForPattern<TValue, TPattern> =
  TPattern extends UnionPattern<infer TPatterns>
    ? HandlerInput<TValue, TPatterns[number]>
    : TPattern extends OptionalPattern<infer TInner>
      ? Extract<TValue, undefined> | HandlerInput<Exclude<TValue, undefined>, TInner>
      : SelectPayload<MatchedValue<TValue, TPattern>, TPattern> extends infer TSelect
        ? [TSelect] extends [never]
          ? MatchedValue<TValue, TPattern>
          : Simplify<TSelect>
        : never

export type GuardedValue<TValue, TPattern> = TValue & MatchedValue<TValue, TPattern>

type DotPathLeaf =
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

type DotPathKey<TKey extends string> = TKey extends `${string}.${string}` ? never : TKey

type DotPathChild<TValue, TKey extends string> =
  NonNullable<TValue> extends DotPathLeaf
    ? never
    : NonNullable<TValue> extends object
      ? DotPath<NonNullable<TValue>> extends infer TChild extends string
        ? `${TKey}.${TChild}`
        : never
      : never

type DotPath<TValue> = TValue extends unknown
  ? TValue extends object
    ? {
        [K in Extract<keyof TValue, string>]: DotPathKey<K> | DotPathChild<TValue[K], DotPathKey<K>>
      }[Extract<keyof TValue, string>]
    : never
  : never

export type PathValue<TValue, TPath extends PropertyPath> = TPath extends readonly PropertyKey[]
  ? PathValueFromTuple<TValue, TPath>
  : TPath extends string
    ? PathValueFromDot<TValue, TPath>
    : never

type PathValueFromDot<TValue, TPath extends string> = TPath extends `${infer THead}.${infer TTail}`
  ? PathValueStep<TValue, THead, TTail>
  : TValue extends unknown
    ? TValue extends null | undefined
      ? undefined
      : TPath extends keyof TValue
        ? TValue[TPath]
        : undefined
    : never

type PathValueStep<TValue, THead extends string, TTail extends string> = TValue extends unknown
  ? TValue extends null | undefined
    ? undefined
    : THead extends keyof TValue
      ? PathValueFromDot<TValue[THead], TTail>
      : undefined
  : never

type PathValueFromTuple<TValue, TPath extends readonly PropertyKey[]> = TPath extends readonly [
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

export type ExtractByPath<TValue, TPath extends PropertyPath, TTag> = TValue extends unknown
  ? TagOverlaps<PathValue<TValue, TPath>, TTag> extends true
    ? RefineByPath<TValue, TPath, TTag>
    : never
  : never

export type CoveredByPath<TValue, TPath extends PropertyPath, TTag> = TValue extends unknown
  ? TagFullyCovers<PathValue<TValue, TPath>, TTag> extends true
    ? TValue
    : never
  : never

type TagOverlaps<TPathValue, TTag> = [LiteralMatch<TPathValue, TTag>] extends [never]
  ? [TTag] extends [undefined]
    ? undefined extends TPathValue
      ? true
      : false
    : false
  : true

type TagFullyCovers<TPathValue, TTag> = [TPathValue] extends [TTag]
  ? true
  : [TTag] extends [undefined]
    ? undefined extends TPathValue
      ? true
      : false
    : false

type RefineByPath<TValue, TPath extends PropertyPath, TTag> = TPath extends readonly PropertyKey[]
  ? RefineByTuplePath<TValue, TPath, TTag>
  : TPath extends string
    ? RefineByDotPath<TValue, TPath, TTag>
    : TValue

type RefineByDotPath<TValue, TPath extends string, TTag> = TPath extends `${infer THead}.${infer TTail}`
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

type RefineByTuplePath<TValue, TPath extends readonly PropertyKey[], TTag> = TPath extends readonly [
  infer THead extends PropertyKey,
  ...infer TTail extends PropertyKey[],
]
  ? TValue extends object
    ? THead extends keyof TValue
      ? Simplify<Omit<TValue, THead> & { [K in THead]: RefineByTuplePath<TValue[K], TTail, TTag> }>
      : TValue
    : TValue
  : LiteralMatch<TValue, TTag>

type NormalizedCaseKey<TTag> = TTag extends true
  ? 'true'
  : TTag extends false
    ? 'false'
    : TTag extends number
      ? `${TTag}`
      : TTag extends string | symbol
        ? TTag
        : never

type ObjectCaseTags<TTags> = Exclude<TTags, null | undefined>
export type ObjectCaseKeys<TTags> =
  | NormalizedCaseKey<ObjectCaseTags<TTags>>
  | Extract<ObjectCaseTags<TTags>, string | number | symbol>

type CollidingTags<TAll, TTag> = TAll extends unknown
  ? Equal<TAll, TTag> extends true
    ? never
    : NormalizedCaseKey<TAll> extends NormalizedCaseKey<TTag>
      ? TAll
      : never
  : never

type HasCollisionForTag<TAll, TTag = TAll> = TTag extends unknown
  ? [CollidingTags<TAll, TTag>] extends [never]
    ? false
    : true
  : never

type HasNormalizedCaseKeyCollisions<TTags> = true extends HasCollisionForTag<TTags> ? true : false

type IsFiniteCaseUnion<TTags> = [TTags] extends [never]
  ? false
  : true extends (TTags extends unknown ? IsBroad<TTags> : never)
    ? false
    : true

export type CaseMap<TValue, TPath extends PropertyPath, TTags> = {
  [K in ObjectCaseKeys<TTags>]: (value: ExtractByNormalizedKey<TValue, TPath, TTags, K>) => unknown
}

type CaseKeyMatches<TTag, TKey> = NormalizedCaseKey<TTag> extends TKey ? true : TTag extends TKey ? true : false

type ExtractByNormalizedKey<TValue, TPath extends PropertyPath, TTags, TKey> = ExtractByPath<
  TValue,
  TPath,
  TTags extends unknown ? (CaseKeyMatches<TTags, TKey> extends true ? TTags : never) : never
>

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

export type AwaitedReturn<T> = T extends PromiseLike<infer TResult> ? AwaitedReturn<TResult> : T
