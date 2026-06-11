import { PATTERN_TOKEN } from '../patterns/token.js'
import type { OptionalPattern } from '../types/index.js'
import { ownEnumerableKeys } from '../shared/keys.js'
import {
  isObject,
  isPattern,
  isPlainRecord,
  type IndexableObject,
  type MatchOptions,
  ownPatternKeys,
  readProperty,
  repeatedOptions,
} from './core.js'
import type { SelectionState } from './selection.js'
import { captureUndefinedSelections } from './undefined-captures.js'
import { containsCollect, ensureCollectedArrays, validateCollectPlacement } from './selection-rules.js'

export type PatternMatcher = (
  value: unknown,
  pattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
) => boolean

/**
 * Checks the suffix of an array against a tuple rest pattern.
 *
 * @param value - Runtime array being matched.
 * @param startIndex - First array index covered by the rest pattern.
 * @param restPattern - Pattern required for every remaining item.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when every remaining item matches.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
function restTupleMatches(
  matcher: PatternMatcher,
  value: readonly unknown[],
  startIndex: number,
  restPattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (value.length < startIndex) return false
  if (selection && containsCollect(restPattern)) validateCollectPlacement(restPattern, options.allowCollect)
  for (let valueIndex = startIndex; valueIndex < value.length; valueIndex += 1) {
    if (!matcher(value[valueIndex], restPattern, selection, options)) return false
  }
  ensureCollectedArrays(selection, restPattern)
  return true
}

/**
 * Matches an array value against positional tuple patterns.
 *
 * @param value - Candidate runtime value.
 * @param items - Ordered tuple item patterns.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the candidate satisfies tuple length and item rules.
 * @throws {TypeError} When `P.rest(...)` is not the final tuple item.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
export function matchTuple(
  matcher: PatternMatcher,
  value: unknown,
  items: readonly unknown[],
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!Array.isArray(value)) return false

  for (let index = 0; index < items.length; index += 1) {
    const itemPattern = items[index]
    if (isPattern(itemPattern) && itemPattern[PATTERN_TOKEN] === 'rest') {
      if (index !== items.length - 1) {
        throw new TypeError('P.rest(pattern) is only supported as the final tuple pattern item.')
      }
      return restTupleMatches(matcher, value, index, itemPattern.item, selection, options)
    }

    if (!matcher(value[index], itemPattern, selection, options)) return false
  }

  return value.length === items.length
}

/**
 * Matches an optional object property pattern.
 *
 * Missing properties and explicit `undefined` values match and propagate
 * `undefined` into nested selections. Present values must satisfy the inner pattern.
 *
 * @param value - Object being matched.
 * @param key - Property key for the optional pattern.
 * @param propertyPattern - `P.optional(...)` helper stored in the object pattern.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the optional property semantics are satisfied.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function optionalPropertyMatches(
  matcher: PatternMatcher,
  value: IndexableObject,
  key: PropertyKey,
  propertyPattern: OptionalPattern<unknown>,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!(key in value)) {
    if (selection) captureUndefinedSelections(propertyPattern.pattern, selection, options)
    return true
  }

  const propertyValue = readProperty(value, key)
  if (propertyValue === undefined) {
    if (selection) captureUndefinedSelections(propertyPattern.pattern, selection, options)
    return true
  }

  return matcher(propertyValue, propertyPattern.pattern, selection, options)
}

/**
 * Checks that a runtime object has no enumerable keys beyond the pattern keys.
 *
 * @param value - Runtime object already known to satisfy required pattern keys.
 * @param keys - Keys allowed by the exact object pattern.
 * @returns `true` when no additional enumerable keys are present.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function exactObjectKeysMatch(value: IndexableObject, keys: readonly PropertyKey[]) {
  const allowedKeys = new Set(keys)
  for (const valueKey of ownEnumerableKeys(value)) {
    if (!allowedKeys.has(valueKey)) return false
  }
  return true
}

/**
 * Matches a runtime value against an object pattern.
 *
 * Object patterns are partial by default: every pattern key must match, but extra
 * runtime keys are allowed unless `P.exact(...)` enabled exact-key options.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Object pattern whose keys and nested patterns must match.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the object pattern matches.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
export function objectPatternMatches(
  matcher: PatternMatcher,
  value: unknown,
  pattern: IndexableObject,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!isObject(value)) return false

  const keys = ownPatternKeys(pattern)
  for (const key of keys) {
    const propertyPattern = readProperty(pattern, key)
    if (isPattern(propertyPattern) && propertyPattern[PATTERN_TOKEN] === 'optional') {
      if (!optionalPropertyMatches(matcher, value, key, propertyPattern, selection, options)) return false
      continue
    }

    if (!(key in value)) return false
    if (!matcher(readProperty(value, key), propertyPattern, selection, options)) return false
  }

  return !options.exact || exactObjectKeysMatch(value, keys)
}

/**
 * Converts a string property key to a canonical numeric key when possible.
 *
 * JavaScript stores object keys as strings, so record key patterns allow string
 * keys such as `"1"` to match numeric key patterns such as `1`.
 *
 * @param key - String property key from a record value.
 * @returns Canonical number for numeric string keys, otherwise `null`.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
function canonicalNumberKey(key: string): number | null {
  if (key === '-0') return -0
  const value = Number(key)
  if (!Number.isFinite(value)) return null
  return String(value) === key ? value : null
}

/**
 * Checks a record key against a key pattern.
 *
 * String keys are tested directly first, then as canonical numbers when possible
 * so record patterns align with JavaScript object-key coercion.
 *
 * @param key - Runtime enumerable record key.
 * @param pattern - Pattern required for the key.
 * @param selection - Optional capture state for this match attempt.
 * @returns `true` when the key satisfies the key pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
function keyMatches(
  matcher: PatternMatcher,
  key: PropertyKey,
  pattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (matcher(key, pattern, selection, options)) return true
  if (typeof key !== 'string') return false

  const numericKey = canonicalNumberKey(key)
  if (numericKey === null) return false
  return matcher(numericKey, pattern, selection, options)
}

/**
 * Matches a plain record against key and value patterns.
 *
 * @param value - Candidate runtime value.
 * @param keyPattern - Pattern required for every enumerable key.
 * @param valuePattern - Pattern required for every enumerable value.
 * @param requireNonEmpty - Whether empty records should be rejected.
 * @param selection - Optional capture state for this match attempt.
 * @returns `true` when all record entries satisfy their patterns.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function recordMatches(
  matcher: PatternMatcher,
  value: unknown,
  keyPattern: unknown,
  valuePattern: unknown,
  requireNonEmpty: boolean,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!isPlainRecord(value)) return false

  const keys = ownEnumerableKeys(value)
  if (requireNonEmpty && keys.length === 0) return false

  for (const key of keys) {
    if (!keyMatches(matcher, key, keyPattern, selection, repeatedOptions(options))) return false
    if (!matcher(readProperty(value, key), valuePattern, selection, repeatedOptions(options))) return false
  }

  ensureCollectedArrays(selection, keyPattern)
  ensureCollectedArrays(selection, valuePattern)
  return true
}
