import { PATTERN_TOKEN } from '../patterns/token.js'
import type { BuiltInPattern, OptionalPattern } from '../types/index.js'
import { exactOptions, type MatchOptions, repeatedOptions } from './core.js'
import {
  captureAnonymous,
  captureCollected,
  captureNamed,
  cloneSelection,
  commitSelection,
  type SelectionState,
} from './selection.js'
import { captureUndefinedSelections } from './undefined-captures.js'
import { matchPrimitivePattern } from './primitive-built-ins.js'
import {
  assertNoArraySelection,
  assertNoCollect,
  assertNoCollectInsideExclude,
  assertNoMapSelection,
  assertNoSelect,
  assertNoSetSelection,
  ensureCollectedArrays,
} from './selection-rules.js'
import { matchTuple, type PatternMatcher } from './object-structures.js'
import {
  homogeneousMapMatches,
  homogeneousSetMatches,
  requiredMapEntriesMatch,
  requiredSetValuesMatch,
} from './map-set-structures.js'
import { matchRecordPattern } from './record-built-ins.js'

/**
 * Evaluates a `P.union(...)` helper.
 *
 * Union alternatives are tested left to right. Selection state is cloned for each
 * branch and committed only from the successful alternative.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not a union.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
function matchUnionPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  if (pattern[PATTERN_TOKEN] !== 'union') return undefined

  for (const option of pattern.patterns) {
    if (!selection) {
      if (matcher(value, option, undefined, options)) return true
      continue
    }

    const branchSelection = cloneSelection(selection)
    if (matcher(value, option, branchSelection, options)) {
      commitSelection(selection, branchSelection)
      return true
    }
  }
  return false
}

/**
 * Evaluates unary wrapper helpers such as `P.exclude`, `P.optional`, and `P.exact`.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not unary.
 * @throws {TypeError} When `P.exclude(...)` contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
function matchUnaryPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'exclude') {
    assertNoSelect(pattern.pattern, 'P.exclude(pattern) cannot contain P.select(...).')
    assertNoCollect(pattern.pattern, 'P.exclude(pattern) cannot contain P.collect(...).')
    return !matcher(value, pattern.pattern, undefined, options)
  }
  if (kind === 'optional') return matchOptionalPattern(matcher, value, pattern, selection, options)
  if (kind === 'exact') return matcher(value, pattern.pattern, selection, exactOptions(options))
  return undefined
}

/**
 * Evaluates a `P.optional(...)` helper against a direct value.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Optional pattern helper.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the value is `undefined` or matches the inner pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function matchOptionalPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: OptionalPattern<unknown>,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (value !== undefined) return matcher(value, pattern.pattern, selection, options)
  if (selection) captureUndefinedSelections(pattern.pattern, selection, options)
  return true
}

/**
 * Evaluates repeated array helpers against every array item.
 *
 * @param value - Candidate runtime value.
 * @param itemPattern - Pattern required for each array item.
 * @param requireNonEmpty - Whether an empty array should be rejected.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the value is an array satisfying all item rules.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
function matchArrayItems(
  matcher: PatternMatcher,
  value: unknown,
  itemPattern: unknown,
  requireNonEmpty: boolean,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!Array.isArray(value) || (requireNonEmpty && value.length === 0)) return false
  for (let index = 0; index < value.length; index += 1) {
    if (!matcher(value[index], itemPattern, selection, repeatedOptions(options))) return false
  }
  ensureCollectedArrays(selection, itemPattern)
  return true
}

/**
 * Evaluates built-in array, non-empty-array, tuple, and rest helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not a collection.
 * @throws {TypeError} When `P.rest(...)` is used outside a tuple.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
function matchCollectionPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'array') {
    assertNoArraySelection(pattern.item, 'array')
    assertNoCollectInsideExclude(pattern.item)
    return matchArrayItems(matcher, value, pattern.item, false, selection, options)
  }
  if (kind === 'non-empty-array') {
    assertNoArraySelection(pattern.item, 'nonEmptyArray')
    assertNoCollectInsideExclude(pattern.item)
    return matchArrayItems(matcher, value, pattern.item, true, selection, options)
  }
  if (kind === 'tuple') return matchTuple(matcher, value, pattern.items, selection, options)
  if (kind === 'rest') throw new TypeError('P.rest(pattern) can only be used inside tuple patterns.')
  return undefined
}

/**
 * Evaluates predicate, instance, and selection helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not selection-like.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
function matchSelectionPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'when') return pattern.predicate(value)
  if (kind === 'instance-of') return value instanceof pattern.constructor
  if (kind === 'collect') {
    if (!options.allowCollect)
      throw new TypeError('P.collect(name, pattern) can only be used inside repeated containers.')
    if (!matcher(value, pattern.pattern, selection, options)) return false
    if (selection) captureCollected(selection, pattern.name, value)
    return true
  }
  if (kind !== 'select') return undefined

  if (!matcher(value, pattern.pattern, selection, options)) return false
  if (!selection) return true
  if (pattern.name === undefined) captureAnonymous(selection, value)
  else captureNamed(selection, pattern.name, value)
  return true
}

/**
 * Evaluates Map and Set helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not Map/Set.
 */
function matchMapOrSetPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'map') {
    assertNoMapSelection(pattern)
    assertNoCollectInsideExclude(pattern)
    if (pattern.mode === 'homogeneous')
      return homogeneousMapMatches(matcher, value, pattern.key, pattern.value, selection, options)
    return requiredMapEntriesMatch(matcher, value, pattern.entries, selection, options)
  }

  if (kind !== 'set') return undefined
  assertNoSetSelection(pattern)
  assertNoCollectInsideExclude(pattern)
  if (pattern.mode === 'homogeneous')
    return homogeneousSetMatches(matcher, value, pattern.values[0], selection, options)
  return requiredSetValuesMatch(matcher, value, pattern.values, selection, options)
}

/**
 * Dispatches a built-in pattern helper to the specialized runtime matcher.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the built-in helper matches the value.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function matchBuiltInPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  const primitive = matchPrimitivePattern(value, pattern)
  if (primitive !== undefined) return primitive

  const union = matchUnionPattern(matcher, value, pattern, selection, options)
  if (union !== undefined) return union

  const unary = matchUnaryPattern(matcher, value, pattern, selection, options)
  if (unary !== undefined) return unary

  const collection = matchCollectionPattern(matcher, value, pattern, selection, options)
  if (collection !== undefined) return collection

  const selected = matchSelectionPattern(matcher, value, pattern, selection, options)
  if (selected !== undefined) return selected

  const mapOrSet = matchMapOrSetPattern(matcher, value, pattern, selection, options)
  if (mapOrSet !== undefined) return mapOrSet

  return matchRecordPattern(matcher, value, pattern, selection, options) ?? false
}

/**
 * Recursively matches a value against any public pattern structure.
 *
 * This is the central runtime matcher for literals, arrays, object patterns, and
 * built-in `P.*` helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Pattern structure to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the pattern matches.
 * @see https://github.com/DiegoGBrisa/ts-match#core-concepts
 */
