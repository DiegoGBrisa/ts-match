import type {
  AwaitedReturn,
  CaseMap,
  CoveredByPath,
  DiagnosticArgs,
  Discriminant,
  ExhaustiveEntriesArgument,
  ExtractByPath,
  GroupEntry,
  MatchByTagsArgument,
  MatchPromiseResult,
  NoExtraKeys,
  NonExhaustiveMatchByArgument,
  ObjectCaseKeys,
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
  TupleEntryArgument,
  TupleEntryArguments,
  TupleEntryListTags,
  TupleEntryTag,
  RemainingAfterMap,
} from './types.js'

export interface PromiseMatchByBuilder<TInput, TPath extends PropertyPath, TRemaining, TOutput> {
  with<const TTags extends PathTagTuple<TRemaining, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult]
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >

  with<const TTags extends readonly [Discriminant, ...Discriminant[]], const TResult>(
    ...args: [
      ...tags: MatchByTagsArgument<TRemaining, TPath, TTags>,
      handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult,
    ]
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >

  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapSupportArgument<PathValue<TRemaining, TPath>> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): Promise<AwaitedReturn<TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>>>

  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  cases<const T0 extends TupleEntryTag<TRemaining, TPath>, const R0>(
    entries: readonly [TupleEntryArgument<TRemaining, TPath, T0, R0>],
    ...diagnostic: DiagnosticArgs<
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<readonly [T0]>>
    >
  ): Promise<AwaitedReturn<TOutput | R0>>

  cases<
    const TTagEntries extends readonly TupleEntryTag<TRemaining, TPath>[],
    const TEntries extends TupleEntryArguments<TRemaining, TPath, TTagEntries>,
  >(
    entries: TEntries & TupleEntryArguments<TRemaining, TPath, TTagEntries>,
    ...diagnostic: DiagnosticArgs<
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<TTagEntries>>
    >
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  cases<
    const TTagEntries extends readonly DiagnosticTupleEntryTag[],
    const TEntries extends DiagnosticTupleEntryArguments<TRemaining, TPath, TTagEntries>,
  >(
    entries: TEntries &
      DiagnosticTupleEntryArguments<TRemaining, TPath, TTagEntries> &
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<TTagEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  cases<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  partial<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<
    TTags = PathValue<TRemaining, TPath>,
    THandlers extends Partial<CaseMap<TRemaining, TPath, TTags>> = Partial<CaseMap<TRemaining, TPath, TTags>>,
  >(
    handlers: THandlers & NoExtraKeys<THandlers, ObjectCaseKeys<TTags>>,
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    RemainingAfterMap<TRemaining, TPath, TTags, keyof THandlers>,
    TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>
  >

  partial<const T0 extends TupleEntryTag<TRemaining, TPath>, const R0>(
    entries: readonly [TupleEntryArgument<TRemaining, TPath, T0, R0>] &
      PartialEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<readonly [T0]>>,
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TupleEntryListTags<readonly [T0]>>>,
    TOutput | R0
  >

  partial<
    const TTagEntries extends readonly TupleEntryTag<TRemaining, TPath>[],
    const TEntries extends TupleEntryArguments<TRemaining, TPath, TTagEntries>,
  >(
    entries: TEntries &
      TupleEntryArguments<TRemaining, TPath, TTagEntries> &
      PartialEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<TTagEntries>>,
  ): PromiseMatchByBuilder<
    TInput,
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
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TupleEntryListTags<TTagEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial(
    entries: CompletionTupleCaseList<TRemaining, TPath>,
  ): PromiseMatchByBuilder<TInput, TPath, TRemaining, TOutput>

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>

  safeOtherwise<const TResult>(
    handler: (value: TRemaining) => TResult,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput | TResult>>>

  exhaustive(
    this: PromiseMatchByBuilder<TInput, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): Promise<AwaitedReturn<TOutput>>

  safeExhaustive(
    this: PromiseMatchByBuilder<TInput, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput>>>
}
