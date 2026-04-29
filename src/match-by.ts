import { NonExhaustiveMatchError } from './errors.js'
import { group } from './group.js'
import { ownEnumerableKeys } from './keys.js'
import { GROUP_TOKEN } from './tokens.js'
import type {
  AwaitedReturn,
  CaseMap,
  CasesEntry,
  CoveredByPath,
  Discriminant,
  ExhaustiveEntriesArgument,
  ExtractByPath,
  GroupEntry,
  MatchByPathArgument,
  MatchByTagArgument,
  MatchByTagsArgument,
  NoExtraKeys,
  NonExhaustiveMatchByArgument,
  ObjectCaseKeys,
  ObjectCaseMapArgument,
  PartialEntriesArgument,
  PathValue,
  PropertyPath,
} from './types.js'

type AnyCaseHandler = (value: never) => unknown
type UnknownHandler = (value: unknown) => unknown

interface IndexableObject {
  readonly [key: string]: unknown
  readonly [key: symbol]: unknown
}

type PathTag<TValue, TPath extends PropertyPath> = Extract<PathValue<TValue, TPath>, Discriminant>

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

type CaseBuilder<TValue, TPath extends PropertyPath> = {
  <const TTag extends Discriminant, const TResult>(
    tag: TTag & MatchByTagArgument<TValue, TPath, TTag>,
    handler: (value: ExtractByPath<TValue, TPath, TTag>) => TResult,
  ): GroupEntry<readonly [TTag], (value: ExtractByPath<TValue, TPath, TTag>) => TResult>

  <const TTags extends readonly [Discriminant, ...Discriminant[]], const TResult>(
    tags: TTags & MatchByTagsArgument<TValue, TPath, TTags>,
    handler: (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult,
  ): GroupEntry<TTags, (value: ExtractByPath<TValue, TPath, TTags[number]>) => TResult>
}

interface RuntimeTagCase {
  readonly tags?: readonly unknown[]
  readonly map?: IndexableObject
  readonly handler?: UnknownHandler
}

const validatedCaseMaps = new WeakSet<IndexableObject>()

function assertFunction(value: unknown, label: string): asserts value is UnknownHandler {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

function isObjectLike(value: unknown): value is IndexableObject {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
}

function appendCases(cases: readonly RuntimeTagCase[], next: readonly RuntimeTagCase[]): readonly RuntimeTagCase[] {
  return [...cases, ...next]
}

export interface SyncMatchByBuilder<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
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
      ObjectCaseMapArgument<PathValue<TRemaining, TPath>, THandlers> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>

  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): TOutput | EntryReturn<TEntries>

  cases<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): TOutput | EntryReturn<TEntries>

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

  partial<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult

  exhaustive(
    this: SyncMatchByBuilder<TValue, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): TOutput
}

export interface AsyncMatchByBuilder<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
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

  cases<const THandlers extends Partial<CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>>>>(
    handlers: CaseMap<TRemaining, TPath, PathValue<TRemaining, TPath>> &
      THandlers &
      ObjectCaseMapArgument<PathValue<TRemaining, TPath>, THandlers> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): Promise<AwaitedReturn<TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>>>

  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

  cases<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>

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

  partial<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>

  exhaustive(
    this: AsyncMatchByBuilder<TValue, TPath, TRemaining, TOutput> & NonExhaustiveMatchByArgument<TRemaining, TPath>,
  ): Promise<AwaitedReturn<TOutput>>
}

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

class SyncMatchByBuilderImpl<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly path: TPath,
    private readonly handled: readonly RuntimeTagCase[],
  ) {}

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
      ObjectCaseMapArgument<PathValue<TRemaining, TPath>, THandlers> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>
  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): TOutput | EntryReturn<TEntries>
  cases<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
    entries: TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
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
  partial<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): SyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >
  partial(handlersOrEntries: unknown): unknown {
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

class AsyncMatchByBuilderImpl<TValue, TPath extends PropertyPath, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly path: TPath,
    private readonly handled: readonly RuntimeTagCase[],
  ) {}

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
      ObjectCaseMapArgument<PathValue<TRemaining, TPath>, THandlers> &
      NoExtraKeys<THandlers, ObjectCaseKeys<PathValue<TRemaining, TPath>>>,
  ): Promise<AwaitedReturn<TOutput | ReturnType<Extract<THandlers[keyof THandlers], AnyCaseHandler>>>>
  cases<const TEntries extends readonly GroupEntry<readonly Discriminant[], unknown>[]>(
    builder: (
      group: CaseBuilder<TRemaining, TPath>,
    ) => TEntries & ExhaustiveEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): Promise<AwaitedReturn<TOutput | EntryReturn<TEntries>>>
  cases<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
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
  partial<const TEntries extends readonly AnyTupleCase<TRemaining, TPath>[]>(
    entries: TEntries & PartialEntriesArgument<PathValue<TRemaining, TPath>, EntryTags<TEntries>>,
  ): AsyncMatchByBuilder<
    TValue,
    TPath,
    Exclude<TRemaining, CoveredByPath<TRemaining, TPath, EntryTags<TEntries>>>,
    TOutput | EntryReturn<TEntries>
  >
  partial(handlersOrEntries: unknown): unknown {
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

function normalizeWithArgs(args: readonly unknown[]): RuntimeTagCase {
  if (args.length < 2) throw new TypeError('matchBy(...).with(...) requires at least one tag and a handler.')

  const handler = args[args.length - 1]
  assertFunction(handler, 'matchBy(...).with(...) handler')
  return { tags: args.slice(0, -1), handler }
}

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

function pathToString(path: PropertyPath): string {
  return typeof path === 'string' ? path : path.map(String).join('.')
}

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

function readPathSegment(value: unknown, segment: PropertyKey): unknown {
  if (!isObjectLike(value)) return undefined
  if (!(segment in value)) return undefined
  return Reflect.get(value, segment)
}

function mapKeyForTag(tag: unknown): PropertyKey | undefined {
  if (typeof tag === 'symbol') return tag
  if (typeof tag === 'string' || typeof tag === 'number' || typeof tag === 'boolean') {
    return String(tag)
  }
  return undefined
}

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

function assertCaseMap(value: unknown): asserts value is IndexableObject {
  if (!isObjectLike(value)) {
    throw new TypeError('matchBy(...).cases(...) expected an object map or entry array.')
  }

  validateCaseMap(value)
}

function validateCaseMap(value: IndexableObject): void {
  if (validatedCaseMaps.has(value)) return

  for (const key of ownEnumerableKeys(value)) {
    readCaseMapHandler(value, key)
  }
  validatedCaseMaps.add(value)
}

function resolveCaseMapHandler(value: IndexableObject, tag: unknown): UnknownHandler | undefined {
  const key = mapKeyForTag(tag)
  if (key === undefined) {
    validateCaseMap(value)
    return undefined
  }
  return resolveCaseMapHandlerForKey(value, key)
}

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

function readCaseMapHandler(value: IndexableObject, key: PropertyKey): UnknownHandler {
  const handler = value[key]
  assertFunction(handler, `matchBy case "${String(key)}"`)
  return handler
}

function normalizeCaseMap(value: unknown): readonly RuntimeTagCase[] {
  assertCaseMap(value)
  return [{ map: value }]
}

function isDiscriminantArray(value: Discriminant | readonly Discriminant[]): value is readonly Discriminant[] {
  return Array.isArray(value)
}

function buildGroupEntry(
  tagOrTags: Discriminant | readonly Discriminant[],
  handler: unknown,
): GroupEntry<readonly Discriminant[], unknown> {
  assertFunction(handler, 'group(...) handler')
  if (isDiscriminantArray(tagOrTags)) return group(tagOrTags, handler)
  return group(tagOrTags, handler)
}

function normalizeCaseInput(handlersOrEntries: unknown): readonly RuntimeTagCase[] {
  if (typeof handlersOrEntries === 'function') {
    const entries = handlersOrEntries(buildGroupEntry)
    if (!Array.isArray(entries)) throw new TypeError('matchBy cases builder must return an array of grouped cases.')
    return normalizeEntries(entries)
  }

  return Array.isArray(handlersOrEntries) ? normalizeEntries(handlersOrEntries) : normalizeCaseMap(handlersOrEntries)
}

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

function readGroupEntry(value: unknown): RuntimeTagCase | undefined {
  if (!isObjectLike(value) || !(GROUP_TOKEN in value)) return undefined

  const tags = Reflect.get(value, 'tags')
  const handler = Reflect.get(value, 'handler')
  if (!Array.isArray(tags)) throw new TypeError('matchBy group(...) entry tags must be an array.')
  assertFunction(handler, 'matchBy grouped case handler')
  return { tags, handler }
}

function matchBySync<const TValue, const TPath extends PropertyPath>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): SyncMatchByBuilder<TValue, TPath, TValue, never>
function matchBySync(value: unknown, path: PropertyPath): SyncMatchByBuilder<unknown, PropertyPath, unknown, never> {
  return new SyncMatchByBuilderImpl<unknown, PropertyPath, unknown, never>(value, path, [])
}

function matchByAsync<const TValue, const TPath extends PropertyPath>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): AsyncMatchByBuilder<TValue, TPath, TValue, never>
function matchByAsync(value: unknown, path: PropertyPath): AsyncMatchByBuilder<unknown, PropertyPath, unknown, never> {
  return new AsyncMatchByBuilderImpl<unknown, PropertyPath, unknown, never>(value, path, [])
}

const matchByValue = Object.assign(matchBySync, { async: matchByAsync })

export { matchByValue as matchBy }
export type MatchByFunction = typeof matchByValue
