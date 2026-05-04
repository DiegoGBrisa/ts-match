import { NonExhaustiveMatchError } from './errors.js'
import { group } from './group.js'
import { ownEnumerableKeys } from './keys.js'
import { evaluatePromiseExhaustive, evaluatePromiseOtherwise, safeResult } from './promise-runtime.js'
import { GROUP_TOKEN } from './tokens.js'
import type {
  AwaitedReturn,
  CaseMap,
  CasesEntry,
  CoveredByPath,
  DiagnosticArgs,
  Discriminant,
  ExhaustiveEntriesArgument,
  ExtractByPath,
  GroupEntry,
  MatchByPath,
  MatchByPathArgument,
  MatchByTagsArgument,
  MatchPromiseResult,
  NoExtraKeys,
  NonExhaustiveMatchByArgument,
  ObjectCaseKeys,
  ObjectCaseMapArgument,
  ObjectCaseMapSupportArgument,
  PartialEntriesArgument,
  PathValue,
  PropertyPath,
} from './types.js'

type AnyCaseHandler = (value: never) => unknown
type UnknownHandler = (value: unknown) => unknown

/** Object shape that can be read by string and symbol keys during runtime dispatch. */
interface IndexableObject {
  readonly [key: string]: unknown
  readonly [key: symbol]: unknown
}

type PathTag<TValue, TPath extends PropertyPath> = Extract<PathValue<TValue, TPath>, Discriminant>
type PathTagTuple<TValue, TPath extends PropertyPath> = readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]]

type TupleCase<TValue, TPath extends PropertyPath> =
  PathTag<TValue, TPath> extends infer TTag extends Discriminant
    ? TTag extends Discriminant
      ?
          | readonly [TTag, (value: ExtractByPath<TValue, TPath, TTag>) => unknown]
          | GroupEntry<readonly [TTag], (value: ExtractByPath<TValue, TPath, TTag>) => unknown>
      : never
    : never

type GroupedTupleCase<TValue, TPath extends PropertyPath> =
  | readonly [
      readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]],
      (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown,
    ]
  | readonly [
      readonly PathTag<TValue, TPath>[],
      (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown,
    ]
  | GroupEntry<readonly Discriminant[], unknown>
  | CasesEntry<(value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown>

type AnyTupleCase<TValue, TPath extends PropertyPath> = TupleCase<TValue, TPath> | GroupedTupleCase<TValue, TPath>
type AnyTupleCaseList<TValue, TPath extends PropertyPath> = readonly AnyTupleCase<TValue, TPath>[]

/** Keeps tag autocomplete active while a user is typing an inline string literal. */
type CompletionTupleTag<TValue, TPath extends PropertyPath> = PathTag<TValue, TPath>
type CompletionTupleCase<TValue, TPath extends PropertyPath> =
  | readonly [
      CompletionTupleTag<TValue, TPath>,
      (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown,
    ]
  | readonly [
      readonly [CompletionTupleTag<TValue, TPath>, ...CompletionTupleTag<TValue, TPath>[]],
      (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown,
    ]
type CompletionTupleCaseList<TValue, TPath extends PropertyPath> = readonly CompletionTupleCase<TValue, TPath>[]

type TupleEntryTag<TValue, TPath extends PropertyPath> =
  | PathTag<TValue, TPath>
  | readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]]
type TupleEntryArgument<
  TValue,
  TPath extends PropertyPath,
  TTagEntry extends TupleEntryTag<TValue, TPath>,
  TResult,
> = TTagEntry extends readonly PathTag<TValue, TPath>[]
  ? readonly [
      tags: TTagEntry & readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]],
      handler: (value: ExtractByPath<TValue, TPath, TTagEntry[number]>) => TResult,
    ]
  : TTagEntry extends Discriminant
    ? readonly [tag: TTagEntry, handler: (value: ExtractByPath<TValue, TPath, TTagEntry>) => TResult]
    : never

type TupleEntryArguments<
  TValue,
  TPath extends PropertyPath,
  TTagEntries extends readonly TupleEntryTag<TValue, TPath>[],
> = {
  readonly [K in keyof TTagEntries]: TupleEntryArgument<TValue, TPath, TTagEntries[K], unknown>
}

type StaticGroupedTupleEntry<
  TValue,
  TPath extends PropertyPath,
  TTags extends PathTagTuple<TValue, TPath>,
  TResult,
> = readonly [
  tags: TTags & readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]],
  handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
]

type DiagnosticTupleEntryTag = Discriminant | readonly [Discriminant, ...Discriminant[]]
type DiagnosticTupleEntryArgument<
  TValue,
  TPath extends PropertyPath,
  TTagEntry extends DiagnosticTupleEntryTag,
  TResult,
> = TTagEntry extends readonly Discriminant[]
  ? readonly [
      tags: TTagEntry & readonly [Discriminant, ...Discriminant[]],
      handler: (value: ExtractByPath<TValue, TPath, TTagEntry[number]>) => TResult,
    ]
  : TTagEntry extends Discriminant
    ? readonly [tag: TTagEntry, handler: (value: ExtractByPath<TValue, TPath, TTagEntry>) => TResult]
    : never

type DiagnosticTupleEntryArguments<
  TValue,
  TPath extends PropertyPath,
  TTagEntries extends readonly DiagnosticTupleEntryTag[],
> = {
  readonly [K in keyof TTagEntries]: DiagnosticTupleEntryArgument<TValue, TPath, TTagEntries[K], unknown>
}

type DiagnosticTupleCaseList<TValue, TPath extends PropertyPath> = readonly CasesEntry<
  (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown
>[]

type TupleEntryListTags<TTagEntries extends readonly unknown[]> = TTagEntries[number] extends infer TEntryTag
  ? TEntryTag extends readonly Discriminant[]
    ? StaticEntryTags<TEntryTag>
    : TEntryTag extends Discriminant
      ? TEntryTag
      : never
  : never

type CaseBuilder<TValue, TPath extends PropertyPath> = {
  <const TTags extends PathTagTuple<TValue, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult]
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>

  <const TTags extends PathTagTuple<TValue, TPath>, const TResult>(
    tags: TTags & readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]],
    handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>

  <const TResult>(
    tags: readonly PathTag<TValue, TPath>[],
    handler: (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => TResult,
  ): GroupEntry<
    readonly PathTag<TValue, TPath>[],
    (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => TResult
  >

  <const TTags extends readonly [Discriminant, ...Discriminant[]], const TResult>(
    ...args:
      | [
          ...tags: MatchByTagsArgument<TValue, TPath, TTags>,
          handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
        ]
      | [
          tags: TTags & MatchByTagsArgument<TValue, TPath, TTags>,
          handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
        ]
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>
}

/** Normalized runtime representation of one or more `matchBy` case handlers. */
interface RuntimeTagCase {
  readonly tags?: readonly unknown[]
  readonly map?: IndexableObject
  readonly handler?: UnknownHandler
}

const validatedCaseMaps = new WeakSet<IndexableObject>()

/**
 * Validates that a runtime case value is callable before storing or invoking it.
 *
 * @param value - Unknown handler candidate from a case map, entry, or branch call.
 * @param label - API label included in the error message.
 * @throws {TypeError} When `value` is not a function.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
function assertFunction(value: unknown, label: string): asserts value is UnknownHandler {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

/**
 * Narrows values that can be inspected with property keys.
 *
 * @param value - Unknown value that may hold path segments or case-map handlers.
 * @returns `true` for non-null objects and functions.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#matchby-semantics
 */
function isObjectLike(value: unknown): value is IndexableObject {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
}

/**
 * Appends normalized case handlers while preserving branch order.
 *
 * @param cases - Previously handled runtime cases.
 * @param next - Newly normalized cases to append.
 * @returns A new case list used by the next builder instance.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
function appendCases(cases: readonly RuntimeTagCase[], next: readonly RuntimeTagCase[]): readonly RuntimeTagCase[] {
  return [...cases, ...next]
}

/**
 * Fluent synchronous discriminant matcher returned by `matchBy(value, path)`.
 *
 * `matchBy` reads one discriminant value from a direct key, dot path, or tuple
 * path and dispatches handlers by tag. Use `.with(...).exhaustive()` for the
 * default documented chain style, `.cases(...)` for compact exhaustive maps, or
 * `.partial(...).otherwise(...)` when only some tags need special handling.
 *
 * @typeParam TValue - Original value type being matched.
 * @typeParam TPath - Direct key, dot path, or tuple path used to read the tag.
 * @typeParam TRemaining - Union members whose selected tag is not handled yet.
 * @typeParam TOutput - Union of outputs from handled branches.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#matchby-semantics
 */
export interface SyncMatchByBuilder<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
  /**
   * Adds one or more tag branches that share a handler.
   *
   * Each tag must be a possible value at the selected path. When the runtime tag
   * equals any supplied tag, the handler receives the union member narrowed by
   * that tag.
   *
   * @param args - One or more tags followed by one handler.
   * @returns A new builder with those tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#withtags-handler
   */
  with<const TTags extends PathTagTuple<TRemaining, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult]
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >

  /**
   * Adds validated tag branches and reports friendly diagnostics for invalid tags.
   *
   * This overload accepts the same tag-and-handler shape as `.with(...)` while
   * preserving helpful messages when a tag is not possible at the selected path.
   * The handler receives the union member narrowed by the supplied tag or tags.
   *
   * @param args - One or more tags followed by one handler.
   * @returns A new builder with those tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#withtags-handler
   */
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

  /**
   * Exhaustively handles tags with an object case map.
   *
   * Use this form when every tag has a property-key-compatible value such as a
   * string, number, boolean, or symbol. Every possible tag must be present unless
   * earlier `.with(...)` calls already handled it.
   *
   * @param handlers - Object map from tag keys to handlers.
   * @returns Matched output from an earlier branch or the selected case-map handler.
   * @throws {NonExhaustiveMatchError} When no handler exists for the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#cases
   * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
   */
  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapSupportArgument<PathValue<TRemaining, TPath>> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>

  /**
   * Exhaustively handles tags with a grouped-case builder.
   *
   * The callback receives a typed `group` helper for creating grouped case
   * entries. Return an array containing every remaining tag exactly as documented
   * for grouped cases.
   *
   * @param builder - Function that returns grouped case entries.
   * @returns Matched output from an earlier branch or the selected grouped handler.
   * @throws {NonExhaustiveMatchError} When no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#group
   * @see https://github.com/DiegoGBrisa/ts-match#grouped-case-inference
   */
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

  /**
   * Exhaustively handles tags with tuple entries.
   *
   * Tuple entries contextually infer each handler from its sibling tag, so
   * `[tag, handler]` and `[[tags], handler]` entries keep narrowed handler
   * parameters without annotations.
   *
   * @param entries - Exhaustive tuple entry list for the remaining tags.
   * @returns Matched output from an earlier branch or the selected entry handler.
   * @throws {NonExhaustiveMatchError} When no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#group
   */
  cases<const T0 extends TupleEntryTag<TRemaining, TPath>, const R0>(
    entries: readonly [TupleEntryArgument<TRemaining, TPath, T0, R0>],
    ...diagnostic: DiagnosticArgs<
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<readonly [T0]>>
    >
  ): TOutput | R0

  /**
   * Exhaustively handles an arbitrary-length inline tuple-entry array.
   *
   * Each entry is written as `[tag, handler]` or `[[tag1, tag2], handler]`.
   * Handlers are contextually typed from their sibling tag entry, and every
   * statically known tag counts toward exhaustiveness.
   *
   * @param entries - Inline exhaustive tuple-entry list for the remaining tags.
   * @returns Matched output from an earlier branch or the selected entry handler.
   * @throws {NonExhaustiveMatchError} When no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#cases
   */
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

  /**
   * Exhaustively handles tags with tuple or grouped entries.
   *
   * Use entry arrays when tags are easier to express as `[tag, handler]`,
   * `[[tags], handler]`, or `group(...)` entries instead of an object map.
   *
   * @param entries - Exhaustive entry list for the remaining tags.
   * @returns Matched output from an earlier branch or the selected entry handler.
   * @throws {NonExhaustiveMatchError} When no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#group
   */
  cases<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): TOutput | EntryReturn<TEntries>

  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapArgument<PathValue<TRemaining, TPath>, THandlers> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): never

  /**
   * Adds non-exhaustive grouped entries with a typed callback-local group helper.
   *
   * Use this when several tags share one partial handler and you want handler
   * parameters to infer from the selected `matchBy` path without annotations.
   *
   * @param builder - Function that returns partial grouped case entries.
   * @returns A new builder with handled tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
   */
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

  /**
   * Adds a non-exhaustive object case map and keeps matching open.
   *
   * Use this when only some tags need custom handling before an `.otherwise(...)`
   * fallback or later branches. Handlers must still be functions and keys must be
   * valid tag keys for the selected path.
   *
   * @param handlers - Partial object map from tag keys to handlers.
   * @returns A new builder with handled map keys removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
   */
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

  /**
   * Adds a non-exhaustive tuple entry list and keeps matching open.
   *
   * Tuple entries contextually infer each handler from its sibling tag, mirroring
   * exhaustive tuple entries while leaving the remaining tags for fallback.
   *
   * @param entries - Partial tuple entry list for selected tags.
   * @returns A new builder with entry tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
   */
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

  /**
   * Adds an arbitrary-length inline tuple-entry partial list and keeps matching open.
   *
   * Each entry is written as `[tag, handler]` or `[[tag1, tag2], handler]`.
   * Handlers are contextually typed from their sibling tag entry. Handled tags
   * are removed from the remaining union before `.otherwise(...)`.
   *
   * @param entries - Inline partial tuple-entry list for selected tags.
   * @returns A new builder with entry tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
   */
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

  /**
   * Adds a non-exhaustive tuple/grouped entry list and keeps matching open.
   *
   * @param entries - Partial entry list for selected tags.
   * @returns A new builder with entry tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
   */
  partial<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial(entries: CompletionTupleCaseList<TRemaining, TPath>): SyncMatchByBuilder<TValue, TPath, TRemaining, TOutput>

  /**
   * Finishes the matcher with a fallback for all remaining tags.
   *
   * @param handler - Fallback invoked when no handled tag matches.
   * @returns Matched branch output or fallback output.
   * @see https://github.com/DiegoGBrisa/ts-match#partialotherwise
   */
  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult

  /**
   * Finishes the matcher and requires all known tags to be covered.
   *
   * @returns Matched branch output.
   * @throws {NonExhaustiveMatchError} When the runtime tag is unhandled.
   * @see https://github.com/DiegoGBrisa/ts-match#matchby
   * @see https://github.com/DiegoGBrisa/ts-match#missing-exhaustive-cases
   */
  exhaustive(
    this: SyncMatchByBuilder<TValue, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): TOutput
}

/**
 * Fluent promise-aware discriminant matcher returned by `matchBy.promise(valueOrPromise, path)`.
 *
 * The selected path, tag completions, handler narrowing, and exhaustiveness
 * checks are computed from `Awaited<TInput>`. Terminal methods resolve the input
 * internally, normalize sync or promise-like handler outputs, and safe terminals
 * wrap failures in `MatchPromiseResult` instead of rejecting.
 *
 * @typeParam TInput - Original value, promise, or thenable input type.
 * @typeParam TPath - Direct key, dot path, or tuple path used to read the tag.
 * @typeParam TRemaining - Resolved union members whose selected tag is not handled yet.
 * @typeParam TOutput - Union of awaited and non-awaited branch return types.
 * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
 */
export interface PromiseMatchByBuilder<TInput, TPath extends PropertyPath, TRemaining, TOutput> {
  /**
   * Adds one or more tag branches that share a handler.
   *
   * Tags are checked against the selected path after the input resolves. The
   * handler receives the resolved input narrowed by the supplied tag or tag
   * group, and may return either a value or a promise-like value.
   *
   * @param args - One or more tags followed by one handler.
   * @returns A new promise builder with those tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  with<const TTags extends PathTagTuple<TRemaining, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult]
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >

  /**
   * Adds validated promise-aware tag branches and reports friendly diagnostics for invalid tags.
   *
   * Tags are checked after the input resolves. This overload preserves helpful
   * messages when a tag is not possible at the selected path while keeping the
   * handler narrowed by the supplied tag or tags.
   *
   * @param args - One or more tags followed by one handler.
   * @returns A new promise builder with those tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
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

  /**
   * Exhaustively handles tags with an object case map after the input resolves.
   *
   * Use this form when every resolved tag has a property-key-compatible value
   * such as a string, number, boolean, or symbol. Every possible tag must be
   * present unless earlier `.with(...)` calls already handled it.
   *
   * @param handlers - Object map from tag keys to handlers.
   * @returns Promise of matched output from an earlier branch or the selected case-map handler.
   * @throws {NonExhaustiveMatchError} Via promise rejection when no handler exists for the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapSupportArgument<PathValue<TRemaining, TPath>> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): Promise<AwaitedReturn<TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>>>

  /**
   * Exhaustively handles tags with a grouped-case builder after the input resolves.
   *
   * The callback receives a typed `group` helper for creating grouped case
   * entries. Return an array containing every remaining tag exactly as documented
   * for grouped cases.
   *
   * @param builder - Function that returns grouped case entries.
   * @returns Promise of matched output from an earlier branch or the selected grouped handler.
   * @throws {NonExhaustiveMatchError} Via promise rejection when no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#grouped-case-inference
   */
  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  /**
   * Exhaustively handles tags with tuple entries after the input resolves.
   *
   * Tuple entries contextually infer each handler from its sibling tag, so
   * `[tag, handler]` and `[[tags], handler]` entries keep narrowed handler
   * parameters without annotations. Statically known grouped tag arrays count
   * toward exhaustiveness.
   *
   * @param entries - Exhaustive tuple entry list for the remaining tags.
   * @returns Promise of matched output from an earlier branch or the selected entry handler.
   * @throws {NonExhaustiveMatchError} Via promise rejection when no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  cases<const T0 extends TupleEntryTag<TRemaining, TPath>, const R0>(
    entries: readonly [TupleEntryArgument<TRemaining, TPath, T0, R0>],
    ...diagnostic: DiagnosticArgs<
      ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<readonly [T0]>>
    >
  ): Promise<AwaitedReturn<TOutput | R0>>

  /**
   * Exhaustively handles an arbitrary-length inline tuple-entry array after input resolution.
   *
   * Each entry is written as `[tag, handler]` or `[[tag1, tag2], handler]`.
   * Handlers are contextually typed from their sibling tag entry, and every
   * statically known tag counts toward exhaustiveness.
   *
   * @param entries - Inline exhaustive tuple-entry list for the remaining tags.
   * @returns Promise of matched output from an earlier branch or the selected entry handler.
   * @throws {NonExhaustiveMatchError} Via promise rejection when no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
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

  /**
   * Exhaustively handles tags with tuple or exported grouped entries after input resolution.
   *
   * Use entry arrays when tags are easier to express as `[tag, handler]`,
   * `[[tags], handler]`, or exported `group(...)` entries instead of an object map.
   *
   * @param entries - Exhaustive entry list for the remaining tags.
   * @returns Promise of matched output from an earlier branch or the selected entry handler.
   * @throws {NonExhaustiveMatchError} Via promise rejection when no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  cases<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  /**
   * Adds non-exhaustive grouped entries with a typed callback-local group helper after input resolution.
   *
   * Use this when several tags share one partial handler and you want handler
   * parameters to infer from the selected `matchBy` path without annotations.
   *
   * @param builder - Function that returns partial grouped case entries.
   * @returns A new promise builder with handled tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
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

  /**
   * Adds a non-exhaustive object case map and keeps matching open.
   *
   * Use this when only some resolved tags need custom handling before an
   * `.otherwise(...)` fallback or later branches. Handlers must still be
   * functions and keys must be valid tag keys for the selected path.
   *
   * @param handlers - Partial object map from tag keys to handlers.
   * @returns A new promise builder with handled map keys removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
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

  /**
   * Adds a non-exhaustive tuple entry list and keeps matching open.
   *
   * Tuple entries contextually infer each handler from its sibling tag, mirroring
   * exhaustive tuple entries while leaving the remaining tags for fallback.
   *
   * @param entries - Partial tuple entry list for selected tags.
   * @returns A new promise builder with entry tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  partial<const T0 extends TupleEntryTag<TRemaining, TPath>, const R0>(
    entries: readonly [TupleEntryArgument<TRemaining, TPath, T0, R0>] &
      PartialEntriesArgument<PathValue<TRemaining, TPath>, TupleEntryListTags<readonly [T0]>>,
  ): PromiseMatchByBuilder<
    TInput,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TupleEntryListTags<readonly [T0]>>>,
    TOutput | R0
  >

  /**
   * Adds an arbitrary-length inline tuple-entry partial list and keeps matching open.
   *
   * Each entry is written as `[tag, handler]` or `[[tag1, tag2], handler]`.
   * Handlers are contextually typed from their sibling tag entry. Handled tags
   * are removed from the remaining union before `.otherwise(...)`.
   *
   * @param entries - Inline partial tuple-entry list for selected tags.
   * @returns A new promise builder with entry tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
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

  /**
   * Adds a non-exhaustive tuple/grouped entry list and keeps matching open.
   *
   * Use this for partial entry arrays containing tuple entries or exported
   * `group(...)` entries. Handled tags are removed from the remaining union.
   *
   * @param entries - Partial entry list for selected tags.
   * @returns A new promise builder with entry tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
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

  /**
   * Finishes the promise matcher with a fallback for all remaining tags.
   *
   * The input is resolved first. If no branch or partial case matches the
   * resolved tag, the fallback runs and its value or promise-like value is
   * awaited. Runtime failures reject the returned promise.
   *
   * @param handler - Fallback invoked when no handled tag matches.
   * @returns Promise of matched branch output or fallback output.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>

  /**
   * Safe fallback terminal that resolves to a result object instead of rejecting.
   *
   * Catches input rejection, path-read errors, handler throws/rejections,
   * fallback throws/rejections, and defensive non-exhaustiveness. The fallback is
   * still required and only runs after the input resolves and no branch matches.
   *
   * @param handler - Fallback invoked when no handled tag matches.
   * @returns Promise resolving to `{ ok: true, value }` or `{ ok: false, error }`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  safeOtherwise<const TResult>(
    handler: (value: TRemaining) => TResult,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput | TResult>>>

  /**
   * Finishes the promise matcher and requires all known tags to be covered.
   *
   * The input is resolved first, then the selected path is read and dispatched.
   * Handler values and promise-like handler results are awaited. Runtime failures
   * reject the returned promise.
   *
   * @returns Promise of the matched branch output.
   * @throws {NonExhaustiveMatchError} Via promise rejection when the runtime tag is unhandled.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  exhaustive(
    this: PromiseMatchByBuilder<TInput, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): Promise<AwaitedReturn<TOutput>>

  /**
   * Safe exhaustive terminal with the same compile-time exhaustiveness gate as `.exhaustive()`.
   *
   * Use this for closed discriminant unions when operational failures should be
   * returned as values. It catches input rejection, path-read errors, handler
   * throws/rejections, and defensive `NonExhaustiveMatchError` failures.
   *
   * @returns Promise resolving to `{ ok: true, value }` or `{ ok: false, error }`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
   */
  safeExhaustive(
    this: PromiseMatchByBuilder<TInput, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput>>>
}

/**
 * Conditional builder type used by advanced consumers to model sync or promise `matchBy` flows.
 *
 * Most users should rely on inference from `matchBy(...)` or `matchBy.promise(...)`.
 */
export type MatchByBuilder<
  TValue,
  TPath extends PropertyPath,
  TRemaining,
  TOutput,
  TPromise extends boolean,
> = TPromise extends true
  ? PromiseMatchByBuilder<TValue, TPath, TRemaining, TOutput>
  : SyncMatchByBuilder<TValue, TPath, TRemaining, TOutput>

type EntryReturn<TEntries extends readonly unknown[]> = TEntries[number] extends infer TEntry
  ? TEntry extends readonly [unknown, infer THandler]
    ? THandler extends (value: never) => infer TResult
      ? TResult
      : never
    : TEntry extends { readonly handler: infer THandler }
      ? THandler extends (value: never) => infer TResult
        ? TResult
        : never
      : never
  : never

/** Tags only count toward exhaustiveness when the entry carries a literal tuple, not a broad runtime array. */
type StaticEntryTags<TTags extends readonly Discriminant[]> = number extends TTags['length'] ? never : TTags[number]

type EntryTags<TEntries extends readonly unknown[]> = TEntries[number] extends infer TEntry
  ? TEntry extends readonly [infer TTags extends readonly Discriminant[], unknown]
    ? StaticEntryTags<TTags>
    : TEntry extends readonly [infer TTag extends Discriminant, unknown]
      ? TTag
      : TEntry extends { readonly tags: infer TTags extends readonly Discriminant[] }
        ? StaticEntryTags<TTags>
        : never
  : never

type RemainingAfterMap<TValue, TPath extends PropertyPath, TTags, TKeys> = Exclude<
  TValue,
  CoveredByPath<
    TValue,
    TPath,
    TTags extends unknown
      ? TKeys extends ObjectCaseKeys<TTags>
        ? ObjectCaseKeys<TTags> extends TKeys
          ? TTags
          : never
        : never
      : never
  >
>

/**
 * Runtime implementation for synchronous `matchBy` chains.
 *
 * Public users receive the `SyncMatchByBuilder` interface from `matchBy(...)`;
 * this class stores the original value, selected path, and accumulated handled
 * cases until a terminal method evaluates them.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
class SyncMatchByBuilderImpl<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
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

/** Runtime implementation for promise-aware `matchBy` chains. */
class PromiseMatchByBuilderImpl<TInput, TPath extends PropertyPath, TRemaining, TOutput> {
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

/**
 * Converts a `.with(...tags, handler)` call into one normalized runtime case.
 *
 * @param args - Raw `.with(...)` arguments with one or more tags and a handler.
 * @returns Normalized tag case for runtime dispatch.
 * @throws {TypeError} When the call is missing tags or a callable handler.
 * @see https://github.com/DiegoGBrisa/ts-match#withtags-handler
 */
function normalizeWithArgs(
  args: readonly unknown[],
  apiLabel: 'matchBy(...).with(...)' | 'matchBy.promise(...).with(...)',
): RuntimeTagCase {
  if (args.length < 2) throw new TypeError(`${apiLabel} requires at least one tag and a handler.`)

  const handler = args[args.length - 1]
  assertFunction(handler, `${apiLabel} handler`)
  return { tags: args.slice(0, -1), handler }
}

/**
 * Evaluates an exhaustive object case map without additional accumulated cases.
 *
 * @param value - Original runtime value being matched.
 * @param path - Path used to read the discriminant tag.
 * @param handlers - User-supplied object case map.
 * @returns Output of the matched case-map handler.
 * @throws {NonExhaustiveMatchError} When the runtime tag has no handler.
 * @see https://github.com/DiegoGBrisa/ts-match#cases
 */
function evaluateCaseMap<TPath extends PropertyPath>(value: unknown, path: TPath, handlers: unknown): unknown {
  assertCaseMap(handlers)

  const tag = getPathValue(value, path)
  const handler = resolveCaseMapHandler(handlers, tag)
  if (handler) return handler(value)

  throw new NonExhaustiveMatchError(value, {
    matcher: 'matchBy',
    path: pathToString(path),
    tag,
  })
}

/**
 * Evaluates accumulated `matchBy` cases and an optional fallback.
 *
 * Cases are checked in user-written order. Exhaustive terminal calls throw when
 * no case handles the runtime tag; non-exhaustive calls use `fallback` instead.
 *
 * @param value - Original runtime value being matched.
 * @param path - Path used to read the discriminant tag.
 * @param cases - Normalized cases accumulated by `.with(...)`, `.partial(...)`, or `.cases(...)`.
 * @param exhaustive - Whether missing tags should throw instead of using a fallback.
 * @param fallback - Optional fallback handler for `.otherwise(...)`.
 * @returns Matched case output or fallback output.
 * @throws {NonExhaustiveMatchError} When `exhaustive` is true and no handler matches.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
function evaluate<TPath extends PropertyPath>(
  value: unknown,
  path: TPath,
  cases: readonly RuntimeTagCase[],
  exhaustive: boolean,
  fallback: UnknownHandler | undefined,
): unknown {
  const tag = getPathValue(value, path)

  for (const item of cases) {
    const handler = resolveCaseHandler(item, tag)
    if (handler) return handler(value)
  }

  if (!exhaustive && fallback) return fallback(value)

  throw new NonExhaustiveMatchError(value, {
    matcher: 'matchBy',
    path: pathToString(path),
    tag,
  })
}

/**
 * Formats a property path for diagnostics.
 *
 * @param path - Direct key, dot path, or tuple path used by `matchBy`.
 * @returns Human-readable path string included in errors.
 * @see https://github.com/DiegoGBrisa/ts-match#runtime-behavior
 */
function pathToString(path: PropertyPath): string {
  return typeof path === 'string' ? path : path.map(String).join('.')
}

/**
 * Reads the discriminant value from a direct key, dot path, or tuple path.
 *
 * Missing path segments resolve to `undefined`, matching normal optional runtime
 * access for discriminant lookup while keeping handler dispatch explicit.
 *
 * @param value - Runtime value being matched.
 * @param path - Path supplied to `matchBy`.
 * @returns Value found at `path`, or `undefined` when any segment is missing.
 * @see https://github.com/DiegoGBrisa/ts-match#nested-dot-path-and-tuple-path
 */
function getPathValue(value: unknown, path: PropertyPath): unknown {
  if (typeof path === 'string' && !path.includes('.')) {
    return readPathSegment(value, path)
  }

  const segments = typeof path === 'string' ? path.split('.') : path
  let current = value

  for (const segment of segments) {
    current = readPathSegment(current, segment)
    if (current === undefined) return undefined
  }

  return current
}

/**
 * Reads one path segment from an object-like value.
 *
 * @param value - Current path traversal value.
 * @param segment - Property key to read.
 * @returns Property value, or `undefined` when the segment cannot be read.
 * @see https://github.com/DiegoGBrisa/ts-match#nested-dot-path-and-tuple-path
 */
function readPathSegment(value: unknown, segment: PropertyKey): unknown {
  if (!isObjectLike(value)) return undefined
  if (!(segment in value)) return undefined
  return Reflect.get(value, segment)
}

/**
 * Converts a runtime tag into an object-map key when possible.
 *
 * Object case maps can dispatch by symbol keys directly and by stringified
 * string, number, or boolean tags. Other tags require tuple/grouped entries.
 *
 * @param tag - Runtime discriminant tag read from the selected path.
 * @returns Case-map property key, or `undefined` when object maps cannot represent the tag.
 * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
 */
function mapKeyForTag(tag: unknown): PropertyKey | undefined {
  if (typeof tag === 'symbol') return tag
  if (typeof tag === 'string' || typeof tag === 'number' || typeof tag === 'boolean') {
    return String(tag)
  }
  return undefined
}

/**
 * Resolves the handler for one normalized runtime case and tag.
 *
 * @param item - Normalized tag list or object map.
 * @param tag - Runtime discriminant tag.
 * @returns Matching handler, or `undefined` when this case does not cover the tag.
 * @see https://github.com/DiegoGBrisa/ts-match#runtime-behavior
 */
function resolveCaseHandler(item: RuntimeTagCase, tag: unknown): UnknownHandler | undefined {
  if (item.tags && item.handler) {
    for (const candidate of item.tags) {
      if (Object.is(candidate, tag)) return item.handler
    }
  }

  const key = mapKeyForTag(tag)
  if (key === undefined) return undefined

  if (item.map) return resolveCaseMapHandlerForKey(item.map, key)

  return undefined
}

/**
 * Validates that a `.cases(...)` or `.partial(...)` object map is object-like.
 *
 * @param value - Unknown case-map candidate supplied by the caller.
 * @throws {TypeError} When `value` is not an object-like case map.
 * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
 */
function assertCaseMap(value: unknown): asserts value is IndexableObject {
  if (!isObjectLike(value)) {
    throw new TypeError('matchBy(...).cases(...) expected an object map or entry array.')
  }

  validateCaseMap(value)
}

/**
 * Validates every handler in an object case map exactly once.
 *
 * Validated maps are cached in a `WeakSet` so repeated dispatch through the same
 * map does not re-scan all keys on every call.
 *
 * @param value - Object case map to validate.
 * @throws {TypeError} When any enumerable case-map value is not callable.
 * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
 */
function validateCaseMap(value: IndexableObject): void {
  if (validatedCaseMaps.has(value)) return

  for (const key of ownEnumerableKeys(value)) {
    readCaseMapHandler(value, key)
  }
  validatedCaseMaps.add(value)
}

/**
 * Resolves a handler from an object case map for a runtime tag.
 *
 * @param value - Validated or unvalidated object case map.
 * @param tag - Runtime discriminant tag read from the selected path.
 * @returns Matching handler, or `undefined` when the tag cannot be represented or is absent.
 * @see https://github.com/DiegoGBrisa/ts-match#cases
 */
function resolveCaseMapHandler(value: IndexableObject, tag: unknown): UnknownHandler | undefined {
  const key = mapKeyForTag(tag)
  if (key === undefined) {
    validateCaseMap(value)
    return undefined
  }
  return resolveCaseMapHandlerForKey(value, key)
}

/**
 * Resolves a handler from an object case map for an already-normalized property key.
 *
 * @param value - Object case map to inspect.
 * @param key - Property key derived from the runtime tag.
 * @returns Matching handler, or `undefined` when no own key matches.
 * @see https://github.com/DiegoGBrisa/ts-match#cases
 */
function resolveCaseMapHandlerForKey(value: IndexableObject, key: PropertyKey): UnknownHandler | undefined {
  if (validatedCaseMaps.has(value)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return undefined
    return readCaseMapHandler(value, key)
  }

  let matchedHandler: UnknownHandler | undefined
  for (const candidateKey of ownEnumerableKeys(value)) {
    const handler = readCaseMapHandler(value, candidateKey)
    if (Object.is(candidateKey, key)) matchedHandler = handler
  }
  validatedCaseMaps.add(value)
  return matchedHandler
}

/**
 * Reads and validates one handler from an object case map.
 *
 * @param value - Object case map being validated or dispatched.
 * @param key - Case-map property key to read.
 * @returns Callable handler stored at `key`.
 * @throws {TypeError} When the stored value is not a function.
 * @see https://github.com/DiegoGBrisa/ts-match#object-map-case-mistakes
 */
function readCaseMapHandler(value: IndexableObject, key: PropertyKey): UnknownHandler {
  const handler = value[key]
  assertFunction(handler, `matchBy case "${String(key)}"`)
  return handler
}

/**
 * Converts an object case map into normalized runtime cases.
 *
 * @param value - User-supplied object case map.
 * @returns One normalized runtime case wrapping the map.
 * @throws {TypeError} When the map shape or handlers are invalid.
 * @see https://github.com/DiegoGBrisa/ts-match#cases
 */
function normalizeCaseMap(value: unknown): readonly RuntimeTagCase[] {
  assertCaseMap(value)
  return [{ map: value }]
}

/** Runtime grouped-case builder arguments after validation. */
interface RuntimeGroupArgs {
  readonly tags: readonly Discriminant[]
  readonly handler: UnknownHandler
}

/**
 * Checks whether an unknown runtime value is a valid matchBy discriminant.
 *
 * @param value - Candidate grouped-case tag.
 * @returns `true` when the value can be compared as a discriminant.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
function isDiscriminant(value: unknown): value is Discriminant {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'symbol' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  )
}

/**
 * Narrows a grouped-case tag argument to a readonly tag array.
 *
 * @param value - Candidate list of tags from `group(...)` builder input.
 * @returns `true` when `value` is an array of discriminant tags.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
function isDiscriminantArray(value: unknown): value is readonly Discriminant[] {
  return Array.isArray(value) && value.every(isDiscriminant)
}

/**
 * Validates and normalizes callback-local `group(...)` arguments.
 *
 * @param args - Single tag plus handler, readonly tag array plus handler, or variadic tags plus handler.
 * @returns Normalized tags and handler.
 * @throws {TypeError} When the handler or tags are invalid.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
function normalizeGroupArgs(args: readonly unknown[]): RuntimeGroupArgs {
  const handler = args.at(-1)
  assertFunction(handler, 'group(...) handler')

  const tags = args.slice(0, -1)
  if (tags.length === 0) throw new TypeError('group(...) requires at least one tag.')

  const first = tags[0]
  if (tags.length === 1 && Array.isArray(first)) {
    if (first.length === 0) throw new TypeError('group(...) requires at least one tag.')
    if (!isDiscriminantArray(first)) throw new TypeError('group(...) tags must be discriminants.')
    return { tags: first, handler }
  }

  if (!isDiscriminantArray(tags)) throw new TypeError('group(...) tags must be discriminants.')
  return { tags, handler }
}

/**
 * Builds a typed grouped entry for the `.cases((group) => ...)` callback API.
 *
 * @param args - Single tag, variadic tags, or readonly tag list followed by a shared handler.
 * @returns Frozen grouped case entry.
 * @throws {TypeError} When `handler` is not callable or tags are invalid.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
function buildGroupEntry(...args: readonly unknown[]): GroupEntry<readonly Discriminant[], unknown> {
  const normalized = normalizeGroupArgs(args)
  return group(normalized.tags, normalized.handler)
}

/**
 * Normalizes any `.cases(...)` or `.partial(...)` input form into runtime cases.
 *
 * Accepts object maps, tuple/grouped entry arrays, or a builder callback that
 * returns an entry array.
 *
 * @param handlersOrEntries - User-supplied `.cases(...)` input.
 * @returns Normalized cases ready for dispatch.
 * @throws {TypeError} When the input shape is invalid.
 * @see https://github.com/DiegoGBrisa/ts-match#cases
 */
function normalizeCaseInput(handlersOrEntries: unknown): readonly RuntimeTagCase[] {
  if (typeof handlersOrEntries === 'function') {
    const entries = handlersOrEntries(buildGroupEntry)
    if (!Array.isArray(entries)) throw new TypeError('matchBy cases builder must return an array of grouped cases.')
    return normalizeEntries(entries)
  }

  return Array.isArray(handlersOrEntries) ? normalizeEntries(handlersOrEntries) : normalizeCaseMap(handlersOrEntries)
}

/**
 * Normalizes tuple and grouped case entries into runtime cases.
 *
 * @param entries - Array of `[tag, handler]`, `[[tags], handler]`, or `group(...)` entries.
 * @returns Normalized tag cases.
 * @throws {TypeError} When an entry has an invalid shape or handler.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
function normalizeEntries(entries: readonly unknown[]): readonly RuntimeTagCase[] {
  return entries.map((entry) => {
    const grouped = readGroupEntry(entry)
    if (grouped) return grouped

    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new TypeError('matchBy grouped cases must be [tag, handler] or [[tags], handler] entries.')
    }

    const tagOrTags = entry[0]
    const handler = entry[1]
    const normalized = normalizeGroupArgs([tagOrTags, handler])
    return { tags: normalized.tags, handler: normalized.handler }
  })
}

/**
 * Reads a `group(...)` object entry when the value carries the group token.
 *
 * @param value - Unknown entry from a `.cases(...)` entry array.
 * @returns Normalized runtime case for grouped entries, or `undefined` for non-group values.
 * @throws {TypeError} When the grouped entry has invalid tags or handler.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
function readGroupEntry(value: unknown): RuntimeTagCase | undefined {
  if (!isObjectLike(value) || !(GROUP_TOKEN in value)) return undefined

  const tags = Reflect.get(value, 'tags')
  const handler = Reflect.get(value, 'handler')
  if (!Array.isArray(tags)) throw new TypeError('matchBy group(...) entry tags must be an array.')
  const normalized = normalizeGroupArgs([tags, handler])
  return { tags: normalized.tags, handler: normalized.handler }
}

/**
 * Starts a synchronous discriminant match by reading `path` from `value`.
 *
 * The path can be a direct key (`'type'`), a dot path (`'payload.kind'`), or a
 * tuple path (`['payload', 'kind']`). Prefer `.with(...).exhaustive()`
 * for the default documented style on closed discriminated unions.
 *
 * @param value - Runtime value to match while preserving its TypeScript type.
 * @param path - Direct key, dot path, or tuple path used to read the discriminant tag.
 * @returns A synchronous `matchBy` builder.
 * @example
 * ```ts
 * matchBy(event, 'type')
 *   .with('created', (value) => value.id)
 *   .with('deleted', (value) => value.id)
 *   .exhaustive()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#matchby-semantics
 */
function matchBySync<const TValue, const TPath extends MatchByPath<TValue>>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): SyncMatchByBuilder<TValue, TPath, TValue, never>
/**
 * Starts a synchronous discriminant match for manually supplied property paths.
 *
 * This overload accepts broad or computed paths while still validating the path
 * shape and preserving tag narrowing when the path is known precisely enough.
 *
 * @param value - Runtime value to match while preserving its TypeScript type.
 * @param path - Direct key, dot path, or tuple path used to read the discriminant tag.
 * @returns A synchronous `matchBy` builder.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
function matchBySync<const TValue, const TPath extends PropertyPath>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): SyncMatchByBuilder<TValue, TPath, TValue, never>
/**
 * Runtime implementation for the synchronous `matchBy(...)` entry point.
 *
 * @param value - Runtime value to match.
 * @param path - Path used to read the discriminant tag.
 * @returns A synchronous `matchBy` builder with no handled cases yet.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
function matchBySync(value: unknown, path: PropertyPath): SyncMatchByBuilder<unknown, PropertyPath, unknown, never> {
  return new SyncMatchByBuilderImpl<unknown, PropertyPath, unknown, never>(value, path, [])
}

/**
 * Starts a promise-aware discriminant match by resolving `value` and reading `path` from it.
 *
 * Path autocomplete and handler narrowing are based on `Awaited<TInput>`, so
 * callers can pass promise-backed or maybe-promise sources without awaiting
 * before matching.
 *
 * @param value - Runtime value, promise, or thenable to match.
 * @param path - Direct key, dot path, or tuple path used to read the discriminant tag.
 * @returns A promise-aware `matchBy` builder.
 * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
 */
function matchByPromise<const TInput, const TPath extends MatchByPath<Awaited<TInput>>>(
  value: TInput,
  path: TPath & MatchByPathArgument<Awaited<TInput>, TPath>,
): PromiseMatchByBuilder<TInput, TPath, Awaited<TInput>, never>
/**
 * Starts a promise-aware discriminant match for manually supplied property paths.
 *
 * This overload accepts broad or computed paths while still validating the path
 * shape against `Awaited<TInput>` and preserving tag narrowing when the path is
 * known precisely enough.
 *
 * @param value - Runtime value, promise, or thenable to match.
 * @param path - Direct key, dot path, or tuple path used to read the discriminant tag.
 * @returns A promise-aware `matchBy` builder.
 * @see https://github.com/DiegoGBrisa/ts-match#matchbypromise
 */
function matchByPromise<const TInput, const TPath extends PropertyPath>(
  value: TInput,
  path: TPath & MatchByPathArgument<Awaited<TInput>, TPath>,
): PromiseMatchByBuilder<TInput, TPath, Awaited<TInput>, never>
/** Runtime implementation for the `matchBy.promise(...)` entry point. */
function matchByPromise(
  value: unknown,
  path: PropertyPath,
): PromiseMatchByBuilder<unknown, PropertyPath, unknown, never> {
  return new PromiseMatchByBuilderImpl<unknown, PropertyPath, unknown, never>(value, path, [])
}

/**
 * Public callable `matchBy` value with synchronous and promise-aware entry points.
 *
 * Import this as `matchBy` from the root package or `@diegogbrisa/ts-match/match-by`.
 * Call it directly for sync handlers, or call `matchBy.promise(...)` when the
 * source may be promise-backed or a promise terminal is desired.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 * @see https://github.com/DiegoGBrisa/ts-match#focused-subpath-exports
 */
const matchByValue = Object.assign(matchBySync, { promise: matchByPromise })

export { matchByValue as matchBy }
/**
 * Public callable type of `matchBy`, including the `.promise` entry point.
 *
 * Use this when accepting or forwarding the top-level `matchBy` function itself.
 * Ordinary consumers usually rely on the exported value inference instead.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
export type MatchByFunction = typeof matchByValue
/** Advanced helper types re-exported from the `match-by` subpath. */
export type { MatchByPath, MatchPromiseResult }
