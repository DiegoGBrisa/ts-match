import type {
  CaseMap,
  CoveredByPath,
  DiagnosticArgs,
  Discriminant,
  ExhaustiveEntriesArgument,
  ExtractByPath,
  GroupEntry,
  MatchByTagsArgument,
  NoExtraKeys,
  NonExhaustiveMatchByArgument,
  ObjectCaseKeys,
  ObjectCaseMapArgument,
  ObjectCaseMapSupportArgument,
  PartialEntriesArgument,
  PathValue,
  PropertyPath,
} from '../types/index.js'
import type {
  AnyCaseHandler,
  AnyTupleCaseList,
  CaseBuilder,
  CompletionTupleCaseList,
  DiagnosticTupleEntryArguments,
  DiagnosticTupleEntryTag,
  EntryReturn,
  EntryTags,
  PathTagTuple,
  RemainingAfterMap,
  StaticGroupedTupleEntry,
  TupleEntryArgument,
  TupleEntryArguments,
  TupleEntryListTags,
  TupleEntryTag,
} from './types.js'

export interface SyncMatchByBuilder<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
  with<const TTags extends PathTagTuple<TRemaining, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult]
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >

  with<const TTags extends readonly [Discriminant, ...Discriminant[]], const TResult>(
    ...args: [
      ...tags: MatchByTagsArgument<TRemaining, TPath, TTags>,
      handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult,
    ]
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >

  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapSupportArgument<PathValue<TRemaining, TPath>> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>

  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): TOutput | EntryReturn<TEntries>

  cases<
    const TTags extends PathTagTuple<TRemaining, TPath>,
    const R0,
    const TRest extends AnyTupleCaseList<TRemaining, TPath>,
  >(
    entries: readonly [StaticGroupedTupleEntry<TRemaining, TPath, TTags, R0>, ...TRest] &
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TTags[number] | EntryTags<TRest>>,
  ): TOutput | R0 | EntryReturn<TRest>

  cases<const T0 extends TupleEntryTag<TRemaining, TPath>, const R0>(
    entries: readonly [TupleEntryArgument<TRemaining, TPath, T0, R0>],
    ...diagnostic: DiagnosticArgs<
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<readonly [T0]>>
    >
  ): TOutput | R0

  cases<
    const TTagEntries extends readonly TupleEntryTag<TRemaining, TPath>[],
    const TEntries extends TupleEntryArguments<TRemaining, TPath, TTagEntries>,
  >(
    entries: TEntries & TupleEntryArguments<TRemaining, TPath, TTagEntries>,
    ...diagnostic: DiagnosticArgs<
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<TTagEntries>>
    >
  ): TOutput | EntryReturn<TEntries>

  cases<
    const TTagEntries extends readonly DiagnosticTupleEntryTag[],
    const TEntries extends DiagnosticTupleEntryArguments<TRemaining, TPath, TTagEntries>,
  >(
    entries: TEntries &
      DiagnosticTupleEntryArguments<TRemaining, TPath, TTagEntries> &
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<TTagEntries>>,
  ): TOutput | EntryReturn<TEntries>

  cases<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): TOutput | EntryReturn<TEntries>

  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapArgument<PathValue<TRemaining, TPath>, THandlers> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): never

  partial<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<
    TTags = PathValue<TRemaining, TPath>,
    THandlers extends Partial<CaseMap<TRemaining, TPath, TTags>> = Partial<CaseMap<TRemaining, TPath, TTags>>,
  >(
    handlers: THandlers & NoExtraKeys<THandlers, ObjectCaseKeys<TTags>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    RemainingAfterMap<TRemaining, TPath, TTags, keyof THandlers>,
    TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>
  >

  partial<const T0 extends TupleEntryTag<TRemaining, TPath>, const R0>(
    entries: readonly [TupleEntryArgument<TRemaining, TPath, T0, R0>] &
      PartialEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<readonly [T0]>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TupleEntryListTags<readonly [T0]>>>,
    TOutput | R0
  >

  partial<
    const TTags extends PathTagTuple<TRemaining, TPath>,
    const R0,
    const TRest extends AnyTupleCaseList<TRemaining, TPath>,
  >(
    entries: readonly [StaticGroupedTupleEntry<TRemaining, TPath, TTags, R0>, ...TRest] &
      PartialEntriesArgument<PathValue<TRemaining, TPath>, TTags[number] | EntryTags<TRest>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number] | EntryTags<TRest>>>,
    TOutput | R0 | EntryReturn<TRest>
  >

  partial<
    const TTagEntries extends readonly TupleEntryTag<TRemaining, TPath>[],
    const TEntries extends TupleEntryArguments<TRemaining, TPath, TTagEntries>,
  >(
    entries: TEntries &
      TupleEntryArguments<TRemaining, TPath, TTagEntries> &
      PartialEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<TTagEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TupleEntryListTags<TTagEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<
    const TTagEntries extends readonly DiagnosticTupleEntryTag[],
    const TEntries extends DiagnosticTupleEntryArguments<TRemaining, TPath, TTagEntries>,
  >(
    entries: TEntries &
      DiagnosticTupleEntryArguments<TRemaining, TPath, TTagEntries> &
      PartialEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<TTagEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TupleEntryListTags<TTagEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial(entries: CompletionTupleCaseList<TRemaining, TPath>): SyncMatchByBuilder<TValue, TPath, TRemaining, TOutput>

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult

  exhaustive(
    this: SyncMatchByBuilder<TValue, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): TOutput
}
