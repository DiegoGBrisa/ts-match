import { PATTERN_TOKEN } from '../patterns/token.js'
import type { BuiltInPattern, TemporalPatternKind } from '../types/index.js'

/**
 * Object shape that can be read by string and symbol keys during pattern checks.
 *
 * This keeps runtime property access explicit after unknown values have been
 * narrowed to non-null objects or functions.
 *
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export interface IndexableObject {
  readonly [key: string]: unknown
  readonly [key: symbol]: unknown
}

/**
 * Runtime options that tune structural pattern semantics for a nested match.
 *
 * `exact` is enabled only through `P.exact(...)`; ordinary object and
 * required-entry collection patterns remain partial and allow additional keys or
 * collection entries.
 *
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export interface MatchOptions {
  readonly exact: boolean
  readonly allowCollect: boolean
}

type TemporalConstructor = abstract new (...args: never[]) => object

export const NORMAL_OPTIONS: MatchOptions = { exact: false, allowCollect: false }
const EXACT_OPTIONS: MatchOptions = { exact: true, allowCollect: false }
const COLLECT_OPTIONS: MatchOptions = { exact: false, allowCollect: true }
const EXACT_COLLECT_OPTIONS: MatchOptions = { exact: true, allowCollect: true }

export function exactOptions(options: MatchOptions): MatchOptions {
  return options.allowCollect ? EXACT_COLLECT_OPTIONS : EXACT_OPTIONS
}

export function repeatedOptions(options: MatchOptions): MatchOptions {
  return options.exact ? EXACT_COLLECT_OPTIONS : COLLECT_OPTIONS
}

/**
 * Narrows unknown values to non-null objects or functions.
 *
 * @param value - Candidate value from pattern matching.
 * @returns `true` when property access and `in` checks are valid.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function isObject(value: unknown): value is IndexableObject {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

/**
 * Narrows unknown values to plain record-like objects.
 *
 * Record patterns intentionally reject arrays and class instances. Objects with
 * `Object.prototype` or `null` prototypes are accepted.
 *
 * @param value - Candidate value for `P.record(...)` or `P.nonEmptyRecord(...)`.
 * @returns `true` when `value` has plain record semantics.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function isPlainRecord(value: unknown): value is IndexableObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Detects internal pattern helper objects created by the `P` namespace.
 *
 * @param value - Candidate pattern or literal value.
 * @returns `true` when `value` carries the internal pattern token.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function isPattern(value: unknown): value is BuiltInPattern {
  return isObject(value) && PATTERN_TOKEN in value
}

/**
 * Reads all own keys from an object pattern, including non-enumerable and symbol keys.
 *
 * Object pattern definitions are developer-authored matcher structures, so all
 * own keys participate in the pattern even though runtime record values use only
 * enumerable keys.
 *
 * @param pattern - Object pattern to inspect.
 * @returns Own string and symbol keys from the pattern.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function ownPatternKeys(pattern: object): PropertyKey[] {
  return Reflect.ownKeys(pattern)
}

/**
 * Reads one property from an already narrowed object.
 *
 * @param value - Object or function value being inspected.
 * @param key - Property key to read.
 * @returns Property value at `key`.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function readProperty(value: IndexableObject, key: PropertyKey): unknown {
  return value[key]
}

/**
 * Checks a value against a primitive pattern kind.
 *
 * Primitive helper objects map to JavaScript `typeof` checks, plus exact checks
 * for `null` and `undefined`.
 *
 * @param value - Candidate runtime value.
 * @param primitive - Primitive helper name stored in the pattern.
 * @returns `true` when the value satisfies the primitive helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function primitiveMatches(value: unknown, primitive: string) {
  if (primitive === 'string') return typeof value === 'string'
  if (primitive === 'number') return typeof value === 'number'
  if (primitive === 'boolean') return typeof value === 'boolean'
  if (primitive === 'bigint') return typeof value === 'bigint'
  if (primitive === 'symbol') return typeof value === 'symbol'
  if (primitive === 'null') return value === null
  if (primitive === 'undefined') return value === undefined
  return false
}

/**
 * Matches a string with a regular expression without leaking `lastIndex` changes.
 *
 * @param value - Candidate value.
 * @param regex - Regular expression supplied to `P.regex(...)`.
 * @returns `true` when the candidate is a string accepted by `regex`.
 */
export function regexMatches(value: unknown, regex: RegExp) {
  if (typeof value !== 'string') return false
  const lastIndexDescriptor = Object.getOwnPropertyDescriptor(regex, 'lastIndex')
  if (lastIndexDescriptor?.writable !== true) return new RegExp(regex.source, regex.flags).test(value)

  const originalLastIndex = regex.lastIndex
  regex.lastIndex = 0
  try {
    return regex.test(value)
  } finally {
    regex.lastIndex = originalLastIndex
  }
}

const TEMPORAL_KINDS: readonly Exclude<TemporalPatternKind, 'any'>[] = [
  'Instant',
  'PlainDate',
  'PlainTime',
  'PlainDateTime',
  'ZonedDateTime',
  'Duration',
  'PlainYearMonth',
  'PlainMonthDay',
]

function isTemporalConstructor(value: unknown): value is TemporalConstructor {
  return typeof value === 'function'
}

/**
 * Reads a Temporal constructor from `globalThis.Temporal` when available.
 *
 * @param temporalKind - Temporal constructor name to read.
 * @returns Constructor function, or `undefined` when Temporal is unavailable.
 */
function getTemporalConstructor(temporalKind: Exclude<TemporalPatternKind, 'any'>): TemporalConstructor | undefined {
  const temporal: unknown = Reflect.get(globalThis, 'Temporal')
  if (!isObject(temporal)) return undefined
  const constructor = readProperty(temporal, temporalKind)
  return isTemporalConstructor(constructor) ? constructor : undefined
}

function temporalInstanceOf(value: unknown, constructor: TemporalConstructor) {
  try {
    return value instanceof constructor
  } catch {
    return false
  }
}

/**
 * Matches Temporal values by constructor identity without requiring Temporal at import time.
 *
 * @param value - Candidate value.
 * @param temporalKind - Specific Temporal kind, or `any` for all supported kinds.
 * @returns `true` when the candidate is an instance of the requested Temporal constructor.
 */
export function temporalMatches(value: unknown, temporalKind: TemporalPatternKind): boolean {
  if (temporalKind === 'any') {
    return TEMPORAL_KINDS.some((kind) => temporalMatches(value, kind))
  }

  const constructor = getTemporalConstructor(temporalKind)
  return constructor === undefined ? false : temporalInstanceOf(value, constructor)
}
