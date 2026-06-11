import { evaluatePromiseExhaustive, evaluatePromiseOtherwise, safeResult } from '../promise/index.js'
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
  ObjectCaseKeys,
  ObjectCaseMapSupportArgument,
  PartialEntriesArgument,
  PathValue,
  PropertyPath,
} from '../types/index.js'
import type { PromiseMatchByBuilder } from './promise-builder.js'
import type {
  AnyCaseHandler,
  AnyTupleCaseList,
  CaseBuilder,
  DiagnosticTupleCaseList,
  DiagnosticTupleEntryArguments,
  DiagnosticTupleEntryTag,
  EntryReturn,
  EntryTags,
  PathTag,
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

export class PromiseMatchByBuilderImpl<TInput, TPath extends PropertyPath, TRemaining, TOutput> {
  constructor(
    private readonly input: TInput,
    private readonly path: TPath,
    private readonly handled: readonly RuntimeTagCase[],
  ) {}

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
  with(...args: readonly unknown[]): unknown {
    const next = normalizeWithArgs(args, 'matchBy.promise(...).with(...)')
    return new PromiseMatchByBuilderImpl<TInput, TPath, unknown, TOutput | unknown>(
      this.input,
      this.path,
      appendCases(this.handled, [next]),
    )
  }

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
  cases<const TEntries extends readonly GroupEntry<readonly PathTag<TRemaining, TPath>[], unknown>[]>(
    builder: (group: CaseBuilder<TRemaining, TPath>) => TEntries,
    ...diagnostic: DiagnosticArgs<ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
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

  cases<const TEntries extends DiagnosticTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>
  cases(handlersOrEntries: unknown, ..._missing: readonly unknown[]): Promise<unknown> {
    return Promise.resolve(this.input).then((value) => {
      if (!Array.isArray(handlersOrEntries) && typeof handlersOrEntries !== 'function' && this.handled.length === 0) {
        return evaluateCaseMap(value, this.path, handlersOrEntries)
      }

      const cases = normalizeCaseInput(handlersOrEntries)

      return evaluate(value, this.path, appendCases(this.handled, cases), true, undefined)
    })
  }

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

  partial<const TEntries extends DiagnosticTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >
  partial(handlersOrEntries: unknown, ..._diagnostic: readonly unknown[]): unknown {
    const cases = normalizeCaseInput(handlersOrEntries)

    return new PromiseMatchByBuilderImpl<TInput, TPath, unknown, TOutput | unknown>(
      this.input,
      this.path,
      appendCases(this.handled, cases),
    )
  }

  safeOtherwise<const TResult>(
    handler: (value: TRemaining) => TResult,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput | TResult>>>
  safeOtherwise(handler: unknown): Promise<MatchPromiseResult<unknown>> {
    return safeResult(() => this.otherwiseUnchecked(handler))
  }

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>
  otherwise(handler: unknown): Promise<unknown> {
    return this.otherwiseUnchecked(handler)
  }

  private otherwiseUnchecked(handler: unknown): Promise<unknown> {
    return evaluatePromiseOtherwise(
      this.input,
      handler,
      assertFunction,
      'matchBy.promise(...).otherwise(...) handler',
      (value, fallback) => evaluate(value, this.path, this.handled, false, fallback),
    )
  }

  exhaustive(): Promise<AwaitedReturn<TOutput>>
  exhaustive(): Promise<unknown> {
    return evaluatePromiseExhaustive(this.input, (value) => evaluate(value, this.path, this.handled, true, undefined))
  }

  safeExhaustive(): Promise<MatchPromiseResult<AwaitedReturn<TOutput>>>
  safeExhaustive(): Promise<MatchPromiseResult<unknown>> {
    return safeResult(() => this.exhaustive())
  }
}
