import { NonExhaustiveMatchError } from '../errors/index.js'
import { group } from '../group/index.js'
import { ownEnumerableKeys } from '../shared/keys.js'
import { GROUP_TOKEN } from '../group/token.js'
import type { Discriminant, GroupEntry, PropertyPath } from '../types/index.js'
import type { CaseInputBuilder, IndexableObject, RuntimeTagCase, UnknownHandler } from './types.js'

const PAIR_ARITY = 2
const MIN_WITH_ARGUMENTS = 2
const validatedCaseMaps = new WeakSet<IndexableObject>()

export function assertFunction(value: unknown, label: string): asserts value is UnknownHandler {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

function isCaseInputBuilder(value: unknown): value is CaseInputBuilder {
  return typeof value === 'function'
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function isObjectLike(value: unknown): value is IndexableObject {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
}

export function appendCases(
  cases: readonly RuntimeTagCase[],
  next: readonly RuntimeTagCase[],
): readonly RuntimeTagCase[] {
  return [...cases, ...next]
}

export function normalizeWithArgs(
  args: readonly unknown[],
  apiLabel: 'matchBy(...).with(...)' | 'matchBy.promise(...).with(...)',
): RuntimeTagCase {
  if (args.length < MIN_WITH_ARGUMENTS) throw new TypeError(`${apiLabel} requires at least one tag and a handler.`)

  const handler = args[args.length - 1]
  assertFunction(handler, `${apiLabel} handler`)

  const tags = args.slice(0, -1)
  if (!isDiscriminantArray(tags)) throw new TypeError(`${apiLabel} tags must be discriminants.`)

  return { tags, handler }
}

export function evaluateCaseMap<TPath extends PropertyPath>(value: unknown, path: TPath, handlers: unknown): unknown {
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

export function evaluate<TPath extends PropertyPath>(
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

function pathToString(path: PropertyPath) {
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

function validateCaseMap(value: IndexableObject) {
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

interface RuntimeGroupArgs {
  readonly tags: readonly Discriminant[]
  readonly handler: UnknownHandler
}

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

function isDiscriminantArray(value: unknown): value is readonly Discriminant[] {
  return Array.isArray(value) && value.every(isDiscriminant)
}

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

function buildGroupEntry(...args: readonly unknown[]): GroupEntry<readonly Discriminant[], unknown> {
  const normalized = normalizeGroupArgs(args)
  return group(normalized.tags, normalized.handler)
}

export function normalizeCaseInput(handlersOrEntries: unknown): readonly RuntimeTagCase[] {
  if (isCaseInputBuilder(handlersOrEntries)) {
    const entries: unknown = handlersOrEntries(buildGroupEntry)
    if (!isUnknownArray(entries)) throw new TypeError('matchBy cases builder must return an array of grouped cases.')
    return normalizeEntries(entries)
  }

  return isUnknownArray(handlersOrEntries) ? normalizeEntries(handlersOrEntries) : normalizeCaseMap(handlersOrEntries)
}

function normalizeEntries(entries: readonly unknown[]): readonly RuntimeTagCase[] {
  return entries.map((entry) => {
    const grouped = readGroupEntry(entry)
    if (grouped) return grouped

    if (!isUnknownArray(entry) || entry.length !== PAIR_ARITY) {
      throw new TypeError('matchBy grouped cases must be [tag, handler] or [[tags], handler] entries.')
    }

    const tagOrTags = entry[0]
    const handler = entry[1]
    const normalized = normalizeGroupArgs([tagOrTags, handler])
    return { tags: normalized.tags, handler: normalized.handler }
  })
}

function readGroupEntry(value: unknown): RuntimeTagCase | undefined {
  if (!isObjectLike(value) || !(GROUP_TOKEN in value)) return undefined

  const tags = Reflect.get(value, 'tags')
  const handler = Reflect.get(value, 'handler')
  if (!Array.isArray(tags)) throw new TypeError('matchBy group(...) entry tags must be an array.')
  const normalized = normalizeGroupArgs([tags, handler])
  return { tags: normalized.tags, handler: normalized.handler }
}
