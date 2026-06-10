import type {
  AbstractConstructor,
  AnonymousSelectPattern,
  ArrayPattern,
  CollectPattern,
  DatePattern,
  EntryMapPattern,
  ErrorPattern,
  ExactPattern,
  ExcludePattern,
  FalsyPattern,
  FinitePattern,
  GuardPattern,
  HomogeneousMapPattern,
  InstanceOfPattern,
  IntegerPattern,
  LiteralPattern,
  MapEntryPattern,
  NanPattern,
  NamedSelectPattern,
  NonEmptyArrayPattern,
  NonEmptyRecordPattern,
  NullishPattern,
  OptionalPattern,
  PatternStructureArgument,
  Primitive,
  PrimitivePattern,
  RecordPattern,
  RegexPattern,
  RegexpPattern,
  RestPattern,
  SetPattern,
  TemporalPattern,
  TemporalPatternKind,
  TruthyPattern,
  TuplePattern,
  UnionPattern,
  WildcardPattern,
} from '../types/index.js'

export type PatternListArgument<TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: TPatterns[K] & PatternStructureArgument<TPatterns[K], true>
}

export type PatternHelperArgumentError<TMessage extends string, TDetails = unknown> = {
  readonly [K in TMessage]: TDetails
} & {
  readonly 'ts-match: diagnostic': true
}

export type TsMatchDiagnostic = {
  readonly 'ts-match: diagnostic': true
}

export type PatternStructureDiagnostic<TPattern, TAllowCollect extends boolean = false> =
  PatternStructureArgument<TPattern, TAllowCollect> extends infer TDiagnostic
    ? TDiagnostic extends TsMatchDiagnostic
      ? TDiagnostic
      : never
    : never

export type PatternStructureArgumentFromDiagnostic<TDiagnostic> = [TDiagnostic] extends [never] ? unknown : TDiagnostic

export type PatternListStructureArgument<
  TPatterns extends readonly unknown[],
  TAllowCollect extends boolean = false,
> = PatternStructureArgumentFromDiagnostic<
  TPatterns[number] extends unknown ? PatternStructureDiagnostic<TPatterns[number], TAllowCollect> : never
>

export type AnyPatternContainsSelection<TPatterns extends readonly unknown[]> = true extends (
  TPatterns[number] extends unknown ? PatternContainsSelection<TPatterns[number]> : never
)
  ? true
  : false

export type ObjectPatternContainsSelection<TPattern extends object> = true extends {
  readonly [K in keyof TPattern]: PatternContainsSelection<TPattern[K]>
}[keyof TPattern]
  ? true
  : false

export type PatternContainsSelection<TPattern> = [unknown] extends [TPattern]
  ? false
  : TPattern extends AnonymousSelectPattern<unknown> | NamedSelectPattern<PropertyKey, unknown>
    ? true
    : TPattern extends CollectPattern<PropertyKey, infer TInner>
      ? PatternContainsSelection<TInner>
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
          ? AnyPatternContainsSelection<TPatterns>
          : TPattern extends ExcludePattern<infer TInner>
            ? PatternContainsSelection<TInner>
            : TPattern extends OptionalPattern<infer TInner>
              ? PatternContainsSelection<TInner>
              : TPattern extends ArrayPattern<infer TInner>
                ? PatternContainsSelection<TInner>
                : TPattern extends NonEmptyArrayPattern<infer TInner>
                  ? PatternContainsSelection<TInner>
                  : TPattern extends TuplePattern<infer TItems>
                    ? AnyPatternContainsSelection<TItems>
                    : TPattern extends RestPattern<infer TInner>
                      ? PatternContainsSelection<TInner>
                      : TPattern extends ExactPattern<infer TInner>
                        ? PatternContainsSelection<TInner>
                        : TPattern extends RecordPattern<infer TKey, infer TValue>
                          ? PatternContainsSelection<TKey> extends true
                            ? true
                            : PatternContainsSelection<TValue>
                          : TPattern extends NonEmptyRecordPattern<infer TKey, infer TValue>
                            ? PatternContainsSelection<TKey> extends true
                              ? true
                              : PatternContainsSelection<TValue>
                            : TPattern extends HomogeneousMapPattern<infer TKey, infer TValue>
                              ? PatternContainsSelection<TKey> extends true
                                ? true
                                : PatternContainsSelection<TValue>
                              : TPattern extends EntryMapPattern<infer TEntries>
                                ? TEntries extends readonly MapEntryPattern[]
                                  ? MapEntriesContainSelection<TEntries>
                                  : false
                                : TPattern extends SetPattern<infer TPatterns, 'homogeneous' | 'values'>
                                  ? AnyPatternContainsSelection<TPatterns>
                                  : TPattern extends readonly unknown[]
                                    ? AnyPatternContainsSelection<TPattern>
                                    : TPattern extends object
                                      ? ObjectPatternContainsSelection<TPattern>
                                      : false

export type MapEntryArgs<TArgs extends readonly unknown[]> = TArgs extends readonly [
  infer THead extends MapEntryPattern,
  ...infer TTail extends readonly MapEntryPattern[],
]
  ? readonly [THead, ...TTail]
  : readonly MapEntryPattern[]

export type AnyMapEntryArg<TArgs extends readonly unknown[]> = true extends {
  readonly [K in keyof TArgs]: TArgs[K] extends MapEntryPattern ? true : false
}[number]
  ? true
  : false

export type AllMapEntryArgs<TArgs extends readonly unknown[]> = false extends {
  readonly [K in keyof TArgs]: TArgs[K] extends MapEntryPattern ? true : false
}[number]
  ? false
  : true

export type MapPatternFromArgs<TArgs extends readonly unknown[]> = TArgs extends readonly []
  ? never
  : AllMapEntryArgs<TArgs> extends true
    ? EntryMapPattern<MapEntryArgs<TArgs>>
    : AnyMapEntryArg<TArgs> extends true
      ? never
      : TArgs extends readonly [infer TKeyPattern, infer TValuePattern]
        ? HomogeneousMapPattern<TKeyPattern, TValuePattern>
        : never

export type MapSelectionArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: Map key/value patterns cannot contain P.select(...). Map patterns scan entries, so selections would be ambiguous.',
  { readonly api: 'P.map'; readonly args: TArgs }
>

export type MapTopLevelArrayArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: P.map(keyPattern, valuePattern) cannot use top-level array patterns. Use P.tuple([...]) for tuple keys/values, or use P.map([keyPattern, valuePattern], ...) for required entries.',
  { readonly api: 'P.map'; readonly args: TArgs }
>

export type MapArityArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: P.map(...) expects either P.map(keyPattern, valuePattern) or P.map([keyPattern, valuePattern], ...).',
  { readonly api: 'P.map'; readonly args: TArgs }
>

export type MapEntryContainsSelection<TEntry> = TEntry extends readonly [infer TKeyPattern, infer TValuePattern]
  ? PatternContainsSelection<TKeyPattern> extends true
    ? true
    : PatternContainsSelection<TValuePattern>
  : false

export type MapEntriesContainSelection<TEntries extends readonly unknown[]> = true extends (
  TEntries[number] extends unknown ? MapEntryContainsSelection<TEntries[number]> : never
)
  ? true
  : false

export type MapPairContainsSelection<TKeyPattern, TValuePattern> =
  PatternContainsSelection<TKeyPattern> extends true ? true : PatternContainsSelection<TValuePattern>

export type MapEntryStructureDiagnostic<TEntry> = TEntry extends readonly [infer TKeyPattern, infer TValuePattern]
  ? PatternStructureDiagnostic<TKeyPattern, true> | PatternStructureDiagnostic<TValuePattern, true>
  : never

export type MapEntriesStructureArgument<TEntries extends readonly unknown[]> = PatternStructureArgumentFromDiagnostic<
  TEntries[number] extends unknown ? MapEntryStructureDiagnostic<TEntries[number]> : never
>

export type MapPairStructureArgument<TKeyPattern, TValuePattern> = PatternStructureArgumentFromDiagnostic<
  PatternStructureDiagnostic<TKeyPattern, true> | PatternStructureDiagnostic<TValuePattern, true>
>

export type MapPatternArgument<TArgs extends readonly unknown[]> =
  AllMapEntryArgs<TArgs> extends true
    ? MapEntriesContainSelection<TArgs> extends true
      ? MapSelectionArgumentError<TArgs>
      : MapEntriesStructureArgument<TArgs>
    : AnyMapEntryArg<TArgs> extends true
      ? MapTopLevelArrayArgumentError<TArgs>
      : TArgs extends readonly [infer TKeyPattern, infer TValuePattern]
        ? MapPairContainsSelection<TKeyPattern, TValuePattern> extends true
          ? MapSelectionArgumentError<TArgs>
          : TKeyPattern extends readonly unknown[]
            ? MapTopLevelArrayArgumentError<TArgs>
            : TValuePattern extends readonly unknown[]
              ? MapTopLevelArrayArgumentError<TArgs>
              : MapPairStructureArgument<TKeyPattern, TValuePattern>
        : MapArityArgumentError<TArgs>

export type SetPatternFromArgs<TArgs extends readonly unknown[]> = TArgs extends readonly []
  ? never
  : TArgs extends readonly [infer TPattern]
    ? SetPattern<readonly [TPattern], 'homogeneous'>
    : TArgs extends readonly [unknown, unknown, ...unknown[]]
      ? SetPattern<TArgs, 'values'>
      : never

export type SetSelectionArgumentError<TArgs extends readonly unknown[]> = PatternHelperArgumentError<
  'ts-match: Set value patterns cannot contain P.select(...). Set patterns scan values, so selections would be ambiguous.',
  { readonly api: 'P.set'; readonly args: TArgs }
>

export type SetPatternArgument<TArgs extends readonly unknown[]> =
  AnyPatternContainsSelection<TArgs> extends true
    ? SetSelectionArgumentError<TArgs>
    : PatternListStructureArgument<TArgs, true>
