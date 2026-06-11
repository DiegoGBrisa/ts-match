import type {
  CasesEntry,
  CoveredByPath,
  Discriminant,
  ExtractByPath,
  GroupEntry,
  MatchByTagsArgument,
  ObjectCaseKeys,
  PathValue,
  PropertyPath,
} from '../types/index.js'
import type { PromiseMatchByBuilder } from './promise-builder.js'
import type { SyncMatchByBuilder } from './sync-builder.js'

export type AnyCaseHandler = (value: never) => unknown
export type UnknownHandler = (value: unknown) => unknown
export type CaseInputBuilder = (
  groupBuilder: (...args: readonly unknown[]) => GroupEntry<readonly Discriminant[], unknown>,
) => unknown

export interface IndexableObject {
  readonly [key: string]: unknown
  readonly [key: symbol]: unknown
}

export type PathTag<TValue, TPath extends PropertyPath> = Extract<PathValue<TValue, TPath>, Discriminant>
export type PathTagTuple<TValue, TPath extends PropertyPath> = readonly [
  PathTag<TValue, TPath>,
  ...PathTag<TValue, TPath>[],
]

export type TupleCase<TValue, TPath extends PropertyPath> =
  PathTag<TValue, TPath> extends infer TTag extends Discriminant
    ? TTag extends Discriminant
      ?
          | readonly [TTag, (value: ExtractByPath<TValue, TPath, TTag>) => unknown]
          | GroupEntry<readonly [TTag], (value: ExtractByPath<TValue, TPath, TTag>) => unknown>
      : never
    : never

export type GroupedTupleCase<TValue, TPath extends PropertyPath> =
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

export type AnyTupleCase<TValue, TPath extends PropertyPath> =
  | TupleCase<TValue, TPath>
  | GroupedTupleCase<TValue, TPath>
export type AnyTupleCaseList<TValue, TPath extends PropertyPath> = readonly AnyTupleCase<TValue, TPath>[]

export type CompletionTupleTag<TValue, TPath extends PropertyPath> = PathTag<TValue, TPath>
export type CompletionTupleCase<TValue, TPath extends PropertyPath> =
  | readonly [
      CompletionTupleTag<TValue, TPath>,
      (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown,
    ]
  | readonly [
      readonly [CompletionTupleTag<TValue, TPath>, ...CompletionTupleTag<TValue, TPath>[]],
      (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown,
    ]
export type CompletionTupleCaseList<TValue, TPath extends PropertyPath> = readonly CompletionTupleCase<TValue, TPath>[]

export type TupleEntryTag<TValue, TPath extends PropertyPath> =
  | PathTag<TValue, TPath>
  | readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]]
export type TupleEntryArgument<
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

export type TupleEntryArguments<
  TValue,
  TPath extends PropertyPath,
  TTagEntries extends readonly TupleEntryTag<TValue, TPath>[],
> = {
  readonly [K in keyof TTagEntries]: TupleEntryArgument<TValue, TPath, TTagEntries[K], unknown>
}

export type StaticGroupedTupleEntry<
  TValue,
  TPath extends PropertyPath,
  TTags extends PathTagTuple<TValue, TPath>,
  TResult,
> = readonly [
  tags: TTags & readonly [PathTag<TValue, TPath>, ...PathTag<TValue, TPath>[]],
  handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
]

export type DiagnosticTupleEntryTag = Discriminant | readonly [Discriminant, ...Discriminant[]]
export type DiagnosticTupleEntryArgument<
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

export type DiagnosticTupleEntryArguments<
  TValue,
  TPath extends PropertyPath,
  TTagEntries extends readonly DiagnosticTupleEntryTag[],
> = {
  readonly [K in keyof TTagEntries]: DiagnosticTupleEntryArgument<TValue, TPath, TTagEntries[K], unknown>
}

export type DiagnosticTupleCaseList<TValue, TPath extends PropertyPath> = readonly CasesEntry<
  (value: ExtractByPath<TValue, TPath, PathTag<TValue, TPath>>) => unknown
>[]

export type TupleEntryListTags<TTagEntries extends readonly unknown[]> = TTagEntries[number] extends infer TEntryTag
  ? TEntryTag extends readonly Discriminant[]
    ? StaticEntryTags<TEntryTag>
    : TEntryTag extends Discriminant
      ? TEntryTag
      : never
  : never

export type CaseBuilder<TValue, TPath extends PropertyPath> = {
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

export interface RuntimeTagCase {
  readonly tags?: readonly unknown[]
  readonly map?: IndexableObject
  readonly handler?: UnknownHandler
}

export type EntryReturn<TEntries extends readonly unknown[]> = TEntries[number] extends infer TEntry
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

export type StaticEntryTags<TTags extends readonly Discriminant[]> = number extends TTags['length']
  ? never
  : TTags[number]

export type EntryTags<TEntries extends readonly unknown[]> = TEntries[number] extends infer TEntry
  ? TEntry extends readonly [infer TTags extends readonly Discriminant[], unknown]
    ? StaticEntryTags<TTags>
    : TEntry extends readonly [infer TTag extends Discriminant, unknown]
      ? TTag
      : TEntry extends { readonly tags: infer TTags extends readonly Discriminant[] }
        ? StaticEntryTags<TTags>
        : never
  : never

export type RemainingAfterMap<TValue, TPath extends PropertyPath, TTags, TKeys> = Exclude<
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

export type MatchByBuilder<
  TValue,
  TPath extends PropertyPath,
  TRemaining,
  TOutput,
  TPromise extends boolean,
> = TPromise extends true
  ? PromiseMatchByBuilder<TValue, TPath, TRemaining, TOutput>
  : SyncMatchByBuilder<TValue, TPath, TRemaining, TOutput>
