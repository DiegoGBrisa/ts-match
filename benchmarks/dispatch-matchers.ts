import { PATTERN_TOKEN } from '../src/patterns/token.js'

export type PatternKind =
  | 'wildcard'
  | 'primitive'
  | 'union'
  | 'exclude'
  | 'optional'
  | 'array'
  | 'tuple'
  | 'record'
  | 'select'

type PatternLike = {
  readonly [PATTERN_TOKEN]?: PatternKind
  readonly primitive?: string
  readonly patterns?: readonly unknown[]
  readonly pattern?: unknown
  readonly item?: unknown
  readonly items?: readonly unknown[]
  readonly key?: unknown
  readonly value?: unknown
}

export type Matcher = (value: unknown, pattern: unknown) => boolean

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isPatternLike(value: unknown): value is PatternLike {
  return isObject(value) && PATTERN_TOKEN in value
}

export function primitiveSwitch(value: unknown, primitive: string) {
  switch (primitive) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
    case 'bigint':
      return typeof value === 'bigint'
    case 'symbol':
      return typeof value === 'symbol'
    case 'null':
      return value === null
    case 'undefined':
      return value === undefined
    default:
      return false
  }
}

export function primitiveIf(value: unknown, primitive: string) {
  if (primitive === 'string') return typeof value === 'string'
  if (primitive === 'number') return typeof value === 'number'
  if (primitive === 'boolean') return typeof value === 'boolean'
  if (primitive === 'bigint') return typeof value === 'bigint'
  if (primitive === 'symbol') return typeof value === 'symbol'
  if (primitive === 'null') return value === null
  if (primitive === 'undefined') return value === undefined
  return false
}

const primitiveTable: Readonly<Record<string, (value: unknown) => boolean>> = Object.freeze({
  string: (value: unknown) => typeof value === 'string',
  number: (value: unknown) => typeof value === 'number',
  boolean: (value: unknown) => typeof value === 'boolean',
  bigint: (value: unknown) => typeof value === 'bigint',
  symbol: (value: unknown) => typeof value === 'symbol',
  null: (value: unknown) => value === null,
  undefined: (value: unknown) => value === undefined,
})

const primitiveMap = new Map<string, (value: unknown) => boolean>(Object.entries(primitiveTable))

export function primitiveObject(value: unknown, primitive: string) {
  const predicate = primitiveTable[primitive]
  return predicate?.(value) === true
}

export function primitiveMapDispatch(value: unknown, primitive: string) {
  return primitiveMap.get(primitive)?.(value) === true
}

function ownPatternKeys(pattern: object): PropertyKey[] {
  return Reflect.ownKeys(pattern).filter((key) => key !== PATTERN_TOKEN)
}

function read(value: object, key: PropertyKey): unknown {
  return Reflect.get(value, key)
}

function objectMatches(value: unknown, pattern: object, matcher: Matcher) {
  if (!isObject(value)) return false
  for (const key of ownPatternKeys(pattern)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false
    if (!matcher(read(value, key), read(pattern, key))) return false
  }
  return true
}

function tupleMatches(value: unknown, items: readonly unknown[], matcher: Matcher) {
  if (!Array.isArray(value) || value.length !== items.length) return false
  for (let index = 0; index < items.length; index += 1) {
    if (!matcher(value[index], items[index])) return false
  }
  return true
}

function arrayMatches(value: unknown, itemPattern: unknown, matcher: Matcher) {
  if (!Array.isArray(value)) return false
  for (let index = 0; index < value.length; index += 1) {
    if (!matcher(value[index], itemPattern)) return false
  }
  return true
}

function recordMatches(value: unknown, keyPattern: unknown, valuePattern: unknown, matcher: Matcher) {
  if (!isObject(value) || Array.isArray(value)) return false
  for (const key of Object.keys(value)) {
    if (!matcher(key, keyPattern)) return false
    if (!matcher(read(value, key), valuePattern)) return false
  }
  return true
}

export function matchSwitch(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    switch (pattern[PATTERN_TOKEN]) {
      case 'wildcard':
        return true
      case 'primitive':
        return primitiveSwitch(value, String(pattern.primitive))
      case 'union':
        return pattern.patterns?.some((option) => matchSwitch(value, option)) === true
      case 'exclude':
        return !matchSwitch(value, pattern.pattern)
      case 'optional':
        return value === undefined || matchSwitch(value, pattern.pattern)
      case 'array':
        return arrayMatches(value, pattern.item, matchSwitch)
      case 'tuple':
        return tupleMatches(value, pattern.items ?? [], matchSwitch)
      case 'record':
        return recordMatches(value, pattern.key, pattern.value, matchSwitch)
      case 'select':
        return matchSwitch(value, pattern.pattern)
      default:
        return false
    }
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchSwitch)
  if (isObject(pattern)) return objectMatches(value, pattern, matchSwitch)
  return Object.is(value, pattern)
}

type DispatchHandler = (value: unknown, pattern: PatternLike) => boolean

const wildcardHandler: DispatchHandler = () => true
const primitiveHandler: DispatchHandler = (value, pattern) => primitiveObject(value, String(pattern.primitive))
const unionHandler: DispatchHandler = (value, pattern) =>
  pattern.patterns?.some((option) => matchTable(value, option)) === true
const excludeHandler: DispatchHandler = (value, pattern) => !matchTable(value, pattern.pattern)
const optionalHandler: DispatchHandler = (value, pattern) => value === undefined || matchTable(value, pattern.pattern)
const arrayHandler: DispatchHandler = (value, pattern) => arrayMatches(value, pattern.item, matchTable)
const tupleHandler: DispatchHandler = (value, pattern) => tupleMatches(value, pattern.items ?? [], matchTable)
const recordHandler: DispatchHandler = (value, pattern) => recordMatches(value, pattern.key, pattern.value, matchTable)
const selectHandler: DispatchHandler = (value, pattern) => matchTable(value, pattern.pattern)

const tableHandlers: Readonly<Record<string, DispatchHandler>> = Object.freeze({
  wildcard: wildcardHandler,
  primitive: primitiveHandler,
  union: unionHandler,
  exclude: excludeHandler,
  optional: optionalHandler,
  array: arrayHandler,
  tuple: tupleHandler,
  record: recordHandler,
  select: selectHandler,
})

export function matchTable(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    const handler = kind === undefined ? undefined : tableHandlers[kind]
    return handler?.(value, pattern) === true
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchTable)
  if (isObject(pattern)) return objectMatches(value, pattern, matchTable)
  return Object.is(value, pattern)
}

const mapHandlers = new Map<PatternKind, DispatchHandler>([
  ['wildcard', wildcardHandler],
  ['primitive', primitiveHandler],
  ['union', unionHandler],
  ['exclude', excludeHandler],
  ['optional', optionalHandler],
  ['array', arrayHandler],
  ['tuple', tupleHandler],
  ['record', recordHandler],
  ['select', selectHandler],
])

export function matchMap(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    return kind !== undefined && mapHandlers.get(kind)?.(value, pattern) === true
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchMap)
  if (isObject(pattern)) return objectMatches(value, pattern, matchMap)
  return Object.is(value, pattern)
}

export function matchIf(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    if (kind === 'wildcard') return true
    if (kind === 'primitive') return primitiveIf(value, String(pattern.primitive))
    if (kind === 'union') return pattern.patterns?.some((option) => matchIf(value, option)) === true
    if (kind === 'exclude') return !matchIf(value, pattern.pattern)
    if (kind === 'optional') return value === undefined || matchIf(value, pattern.pattern)
    if (kind === 'array') return arrayMatches(value, pattern.item, matchIf)
    if (kind === 'tuple') return tupleMatches(value, pattern.items ?? [], matchIf)
    if (kind === 'record') return recordMatches(value, pattern.key, pattern.value, matchIf)
    if (kind === 'select') return matchIf(value, pattern.pattern)
    return false
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchIf)
  if (isObject(pattern)) return objectMatches(value, pattern, matchIf)
  return Object.is(value, pattern)
}
