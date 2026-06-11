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
  ObjectCaseKeys,
  ObjectCaseMapSupportArgument,
  PartialEntriesArgument,
  PathValue,
  PropertyPath,
} from '../types/index.js'
import type { SyncMatchByBuilder } from './sync-builder.js'
import type {
  AnyCaseHandler,
  AnyTupleCaseList,
  CaseBuilder,
  DiagnosticTupleCaseList,
  DiagnosticTupleEntryArguments,
  DiagnosticTupleEntryTag,
  EntryReturn,
  EntryTags,
  PathTagTuple,
  RemainingAfterMap,
  RuntimeTagCase,
  TupleEntryArgument,
  TupleEntryArguments,
  TupleEntryListTags,
  TupleEntryTag,
} from './types.js'
import {
  appendCases,
  assertFunction,
  evaluate,
  evaluateCaseMap,
  normalizeCaseInput,
  normalizeWithArgs,
} from './runtime.js'

export class SyncMatchByBuilderImpl<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly path: TPath,
    private readonly handled: readonly RuntimeTagCase[],
  ) {}

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
  with(...args: readonly unknown[]): unknown {
    const next = normalizeWithArgs(args, 'matchBy(...).with(...)')
    return new SyncMatchByBuilderImpl<TValue, TPath, unknown, TOutput | unknown>(
      this.value,
      this.path,
      appendCases(this.handled, [next]),
    )
  }

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

  cases<const TEntries extends DiagnosticTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): TOutput | EntryReturn<TEntries>
  cases(handlersOrEntries: unknown, ..._missing: readonly unknown[]): unknown {
    if (!Array.isArray(handlersOrEntries) && typeof handlersOrEntries !== 'function' && this.handled.length === 0) {
      return evaluateCaseMap(this.value, this.path, handlersOrEntries)
    }

    const cases = normalizeCaseInput(handlersOrEntries)

    return evaluate(this.value, this.path, appendCases(this.handled, cases), true, undefined)
  }

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

  partial<const TEntries extends DiagnosticTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >
  partial(handlersOrEntries: unknown, ..._diagnostic: readonly unknown[]): unknown {
    const cases = normalizeCaseInput(handlersOrEntries)

    return new SyncMatchByBuilderImpl<TValue, TPath, unknown, TOutput | unknown>(
      this.value,
      this.path,
      appendCases(this.handled, cases),
    )
  }

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult
  otherwise(handler: unknown): unknown {
    assertFunction(handler, 'matchBy(...).otherwise(...) handler')
    return evaluate(this.value, this.path, this.handled, false, handler)
  }

  exhaustive(): TOutput
  exhaustive(): unknown {
    return evaluate(this.value, this.path, this.handled, true, undefined)
  }
}
