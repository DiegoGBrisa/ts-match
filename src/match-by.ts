import { NonExhaustiveMatchError } from './errors.js'
import { group } from './group.js'
import { ownEnumerableKeys } from './keys.js'
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
      readonly PathTag<TValue, TPath>[],
      (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown,
    ]
  | GroupEntry<readonly Discriminant[], unknown>
  | CasesEntry<(value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown>

type AnyTupleCase<TValue, TPath extends PropertyPath> = TupleCase<TValue, TPath> | GroupedTupleCase<TValue, TPath>
type AnyTupleCaseList<TValue, TPath extends PropertyPath> = readonly AnyTupleCase<TValue, TPath>[]

type SuggestedTupleCase<TValue, TPath extends PropertyPath> =
  | readonly [PathTag<TValue, TPath>, (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown]
  | readonly [PathTagTuple<TValue, TPath>, (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown]

type SuggestedTupleCaseList<TValue, TPath extends PropertyPath> =
  | readonly []
  | readonly [SuggestedTupleCase<TValue, TPath>, ...SuggestedTupleCase<TValue, TPath>[]]

type CaseBuilder<TValue, TPath extends PropertyPath> = {
  <const TTags extends PathTagTuple<TValue, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult]
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>

  <const TTags extends readonly [Discriminant, ...Discriminant[]], const TResult>(
    ...args: [
      ...tags: MatchByTagsArgument<TValue, TPath, TTags>,
      handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
    ]
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>

  <const TTags extends PathTagTuple<TValue, TPath>, const TResult>(
    tags: TTags,
    handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>

  <const TTags extends readonly [Discriminant, ...Discriminant[]], const TResult>(
    tags: TTags & MatchByTagsArgument<TValue, TPath, TTags>,
    handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>

  <const TResult>(
    tags: readonly PathTag<TValue, TPath>[],
    handler: (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => TResult,
  ): GroupEntry<
    readonly PathTag<TValue, TPath>[],
    (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => TResult
  >
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

  cases<const TEntries extends SuggestedTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): TOutput | EntryReturn<TEntries>

  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapArgument<PathValue<TRemaining, TPath>, THandlers> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): never

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

  partial<const TEntries extends SuggestedTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

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
 * Fluent asynchronous discriminant matcher returned by `matchBy.async(value, path)`.
 *
 * This builder has the same tag-dispatch and exhaustiveness semantics as
 * `matchBy(value, path)`, but terminal methods return promises and handlers may
 * return either values or promises.
 *
 * @typeParam TValue - Original value type being matched.
 * @typeParam TPath - Direct key, dot path, or tuple path used to read the tag.
 * @typeParam TRemaining - Union members whose selected tag is not handled yet.
 * @typeParam TOutput - Union of awaited and non-awaited branch return types.
 * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
 */
export interface AsyncMatchByBuilder<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
  /**
   * Adds one or more async tag branches that share a handler.
   *
   * @param args - One or more tags followed by one handler.
   * @returns A new async builder with those tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   */
  with<const TTags extends PathTagTuple<TRemaining, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult]
  ): AsyncMatchByBuilder<
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
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >

  /**
   * Exhaustively handles async tags with an object case map.
   *
   * @param handlers - Object map from tag keys to handlers.
   * @returns Promise for matched output from an earlier branch or case-map handler.
   * @throws {NonExhaustiveMatchError} When no handler exists for the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   * @see https://github.com/DiegoGBrisa/ts-match#cases
   */
  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapSupportArgument<PathValue<TRemaining, TPath>> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): Promise<AwaitedReturn<TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>>>

  /**
   * Exhaustively handles async tags with a grouped-case builder.
   *
   * @param builder - Function that returns grouped case entries.
   * @returns Promise for matched output from an earlier branch or grouped handler.
   * @throws {NonExhaustiveMatchError} When no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   * @see https://github.com/DiegoGBrisa/ts-match#group
   */
  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  cases<const TEntries extends readonly GroupEntry<readonly PathTag<TRemaining, TPath>[], unknown>[]>(
    builder: (group: CaseBuilder<TRemaining, TPath>) => TEntries,
    ...diagnostic: DiagnosticArgs<ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  /**
   * Exhaustively handles async tags with tuple or grouped entries.
   *
   * @param entries - Exhaustive entry list for the remaining tags.
   * @returns Promise for matched output from an earlier branch or entry handler.
   * @throws {NonExhaustiveMatchError} When no entry handles the runtime tag.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   */
  cases<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  cases<const TEntries extends SuggestedTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  /**
   * Adds a non-exhaustive async object case map and keeps matching open.
   *
   * @param handlers - Partial object map from tag keys to handlers.
   * @returns A new async builder with handled map keys removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   */
  partial<
    TTags = PathValue<TRemaining, TPath>,
    THandlers extends Partial<CaseMap<TRemaining, TPath, TTags>> = Partial<CaseMap<TRemaining, TPath, TTags>>,
  >(
    handlers: THandlers & NoExtraKeys<THandlers, ObjectCaseKeys<TTags>>,
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    RemainingAfterMap<TRemaining, TPath, TTags, keyof THandlers>,
    TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>
  >

  /**
   * Adds a non-exhaustive async tuple/grouped entry list and keeps matching open.
   *
   * @param entries - Partial entry list for selected tags.
   * @returns A new async builder with entry tags removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   */
  partial<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<const TEntries extends SuggestedTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  /**
   * Finishes the async matcher with a fallback for all remaining tags.
   *
   * @param handler - Fallback invoked when no handled tag matches.
   * @returns Promise for matched branch output or fallback output.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   */
  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>

  /**
   * Finishes the async matcher and requires all known tags to be covered.
   *
   * @returns Promise for matched branch output.
   * @throws {NonExhaustiveMatchError} When the runtime tag is unhandled.
   * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
   */
  exhaustive(
    this: AsyncMatchByBuilder<TValue, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): Promise<AwaitedReturn<TOutput>>
}

/**
 * Conditional builder type used by advanced consumers to model sync or async `matchBy` flows.
 *
 * Most users should rely on inference from `matchBy(...)` or `matchBy.async(...)`.
 * This exported type is available for helper functions that need to forward a
 * builder while preserving whether the chain is synchronous or asynchronous.
 *
 * @typeParam TValue - Original value type being matched.
 * @typeParam TPath - Direct key, dot path, or tuple path used to read the tag.
 * @typeParam TRemaining - Union members whose selected tag is not handled yet.
 * @typeParam TOutput - Union of outputs from handled branches.
 * @typeParam TAsync - Selects `AsyncMatchByBuilder` when `true`, otherwise `SyncMatchByBuilder`.
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
export type MatchByBuilder<
  TValue,
  TPath extends PropertyPath,
  TRemaining,
  TOutput,
  TAsync extends boolean,
> = TAsync extends true
  ? AsyncMatchByBuilder<TValue, TPath, TRemaining, TOutput>
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

type EntryTags<TEntries extends readonly unknown[]> = TEntries[number] extends infer TEntry
  ? TEntry extends readonly [infer TTags extends readonly Discriminant[], unknown]
    ? TTags[number]
    : TEntry extends readonly [infer TTag extends Discriminant, unknown]
      ? TTag
      : TEntry extends { readonly tags: infer TTags extends readonly Discriminant[] }
        ? TTags[number]
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
    const next = normalizeWithArgs(args)
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
  cases<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): TOutput | EntryReturn<TEntries>

  cases<const TEntries extends SuggestedTupleCaseList<TRemaining, TPath>>(
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
  partial<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<const TEntries extends SuggestedTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >
  partial(handlersOrEntries: unknown, ..._diagnostic: readonly unknown[]): unknown {
    const cases = Array.isArray(handlersOrEntries)
      ? normalizeEntries(handlersOrEntries)
      : normalizeCaseMap(handlersOrEntries)

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

/**
 * Runtime implementation for asynchronous `matchBy` chains.
 *
 * Public users receive the `AsyncMatchByBuilder` interface from
 * `matchBy.async(...)`; this class delays terminal evaluation through promises so
 * sync throws and async handler results have consistent promise behavior.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
 */
class AsyncMatchByBuilderImpl<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly path: TPath,
    private readonly handled: readonly RuntimeTagCase[],
  ) {}

  with<const TTags extends PathTagTuple<TRemaining, TPath>, const TResult>(
    ...args: [...tags: TTags, handler: (value: ExtractByPath<TRemaining, TPath, TTags[number]>) => TResult]
  ): AsyncMatchByBuilder<
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
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, TTags[number]>>,
    TOutput | TResult
  >
  with(...args: readonly unknown[]): unknown {
    const next = normalizeWithArgs(args)
    return new AsyncMatchByBuilderImpl<TValue, TPath, unknown, TOutput | unknown>(
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
  cases<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>
  cases(handlersOrEntries: unknown, ..._missing: readonly unknown[]): Promise<unknown> {
    return Promise.resolve().then(() => {
      if (!Array.isArray(handlersOrEntries) && typeof handlersOrEntries !== 'function' && this.handled.length === 0) {
        return evaluateCaseMap(this.value, this.path, handlersOrEntries)
      }

      const cases = normalizeCaseInput(handlersOrEntries)

      return evaluate(this.value, this.path, appendCases(this.handled, cases), true, undefined)
    })
  }

  partial<
    TTags = PathValue<TRemaining, TPath>,
    THandlers extends Partial<CaseMap<TRemaining, TPath, TTags>> = Partial<CaseMap<TRemaining, TPath, TTags>>,
  >(
    handlers: THandlers & NoExtraKeys<THandlers, ObjectCaseKeys<TTags>>,
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    RemainingAfterMap<TRemaining, TPath, TTags, keyof THandlers>,
    TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>
  >
  partial<const TEntries extends AnyTupleCaseList<TRemaining, TPath>>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  partial<const TEntries extends SuggestedTupleCaseList<TRemaining, TPath>>(
    entries: TEntries,
    ...diagnostic: DiagnosticArgs<PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>>
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >
  partial(handlersOrEntries: unknown, ..._diagnostic: readonly unknown[]): unknown {
    const cases = Array.isArray(handlersOrEntries)
      ? normalizeEntries(handlersOrEntries)
      : normalizeCaseMap(handlersOrEntries)

    return new AsyncMatchByBuilderImpl<TValue, TPath, unknown, TOutput | unknown>(
      this.value,
      this.path,
      appendCases(this.handled, cases),
    )
  }

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>
  otherwise(handler: unknown): Promise<unknown> {
    assertFunction(handler, 'matchBy(...).otherwise(...) handler')
    return Promise.resolve().then(() => evaluate(this.value, this.path, this.handled, false, handler))
  }

  exhaustive(): Promise<AwaitedReturn<TOutput>>
  exhaustive(): Promise<unknown> {
    return Promise.resolve().then(() => evaluate(this.value, this.path, this.handled, true, undefined))
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
function normalizeWithArgs(args: readonly unknown[]): RuntimeTagCase {
  if (args.length < 2) throw new TypeError('matchBy(...).with(...) requires at least one tag and a handler.')

  const handler = args[args.length - 1]
  assertFunction(handler, 'matchBy(...).with(...) handler')
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
 * Normalizes any `.cases(...)` input form into runtime cases.
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
    assertFunction(handler, 'matchBy grouped case handler')
    return {
      tags: Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags],
      handler,
    }
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
  assertFunction(handler, 'matchBy grouped case handler')
  return { tags, handler }
}

/**
 * Starts a synchronous discriminant match by reading `path` from `value`.
 *
 * The path can be a direct key (`'type'`), a dot path (`'payload.kind'`), or a
 * tuple path (`['payload', 'kind'] as const`). Prefer `.with(...).exhaustive()`
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
 * Starts an asynchronous discriminant match by reading `path` from `value`.
 *
 * Use this when tag-specific handlers need to return promises. The selected path
 * rules and exhaustiveness behavior are the same as the synchronous `matchBy`.
 *
 * @param value - Runtime value to match while preserving its TypeScript type.
 * @param path - Direct key, dot path, or tuple path used to read the discriminant tag.
 * @returns An asynchronous `matchBy` builder.
 * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
 */
function matchByAsync<const TValue, const TPath extends MatchByPath<TValue>>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): AsyncMatchByBuilder<TValue, TPath, TValue, never>
function matchByAsync<const TValue, const TPath extends PropertyPath>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): AsyncMatchByBuilder<TValue, TPath, TValue, never>
/**
 * Runtime implementation for the asynchronous `matchBy.async(...)` entry point.
 *
 * @param value - Runtime value to match.
 * @param path - Path used to read the discriminant tag.
 * @returns An asynchronous `matchBy` builder with no handled cases yet.
 * @see https://github.com/DiegoGBrisa/ts-match#matchbyasync
 */
function matchByAsync(value: unknown, path: PropertyPath): AsyncMatchByBuilder<unknown, PropertyPath, unknown, never> {
  return new AsyncMatchByBuilderImpl<unknown, PropertyPath, unknown, never>(value, path, [])
}

/**
 * Public callable `matchBy` value with synchronous and asynchronous entry points.
 *
 * Import this as `matchBy` from the root package or `@diegogbrisa/ts-match/match-by`.
 * Call it directly for sync handlers, or call `matchBy.async(...)` for promise
 * terminal methods.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 * @see https://github.com/DiegoGBrisa/ts-match#focused-subpath-exports
 */
const matchByValue = Object.assign(matchBySync, { async: matchByAsync })

export { matchByValue as matchBy }
/**
 * Public callable type of `matchBy`, including the `.async` entry point.
 *
 * Use this when accepting or forwarding the top-level `matchBy` function itself.
 * Ordinary consumers usually rely on the exported value inference instead.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#matchby
 */
export type MatchByFunction = typeof matchByValue
export type { MatchByPath }
