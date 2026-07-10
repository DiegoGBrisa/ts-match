import { PATTERN_TOKEN } from '../patterns/token.js'
import type { BuiltInPattern } from '../types/index.js'
import { isObject, isPattern, type MatchOptions, ownPatternKeys, readProperty, repeatedOptions } from './core.js'
import {
  appendSelectionCaptures,
  captureAnonymous,
  captureCollected,
  captureNamed,
  mergeUnionAlternativeSelection,
  type SelectionState,
} from './selection.js'
import {
  assertNoArraySelection,
  assertNoCollect,
  assertNoCollectInsideExclude,
  assertNoMapSelection,
  assertNoRecordSelection,
  assertNoSelect,
  assertNoSetSelection,
} from './selection-rules.js'

/**
 * Captures `undefined` payloads for selections inside optional missing branches.
 *
 * @param pattern - Built-in pattern that is being treated as absent or undefined.
 * @param selection - Mutable capture state to update.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedFromBuiltIn(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions) {
  if (captureUndefinedFromSelection(pattern, selection, options)) return
  if (captureUndefinedFromCollect(pattern, selection, options)) return
  if (captureUndefinedFromUnion(pattern, selection, options)) return
  if (captureUndefinedFromUnary(pattern, selection, options)) return
  if (captureUndefinedFromCollection(pattern, selection, options)) return
  validateRepeatedSelectionContainers(pattern)
}

/**
 * Captures `undefined` for a selection pattern in an absent optional property.
 *
 * @param pattern - Built-in pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a selection and was handled.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
function captureUndefinedFromSelection(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions) {
  if (pattern[PATTERN_TOKEN] !== 'select') return false
  captureUndefinedSelections(pattern.pattern, selection, options)
  if (pattern.name === undefined) captureAnonymous(selection, undefined)
  else captureNamed(selection, pattern.name, undefined)
  return true
}

function captureUndefinedFromCollect(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions) {
  if (pattern[PATTERN_TOKEN] !== 'collect') return false
  if (!options.allowCollect)
    throw new TypeError('P.collect(name, pattern) can only be used inside repeated containers.')
  captureUndefinedSelections(pattern.pattern, selection, options)
  captureCollected(selection, pattern.name, undefined)
  return true
}

/**
 * Captures `undefined` through all options of an absent optional union pattern.
 *
 * @param pattern - Built-in pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a union and was handled.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedFromUnion(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions) {
  if (pattern[PATTERN_TOKEN] !== 'union') return false
  const unionSelection: SelectionState = {
    mode: 'none',
    anonymous: undefined,
    named: undefined,
    collected: undefined,
  }
  for (const option of pattern.patterns) {
    const alternativeSelection: SelectionState = {
      mode: 'none',
      anonymous: undefined,
      named: undefined,
      collected: undefined,
    }
    captureUndefinedSelections(option, alternativeSelection, options)
    mergeUnionAlternativeSelection(unionSelection, alternativeSelection)
  }
  appendSelectionCaptures(selection, unionSelection)
  return true
}

/**
 * Captures `undefined` through unary wrappers in an absent optional property.
 *
 * @param pattern - Built-in pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a supported unary wrapper and was handled.
 * @throws {TypeError} When an excluded pattern contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedFromUnary(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions) {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'exclude') {
    assertNoSelect(pattern.pattern, 'P.exclude(pattern) cannot contain P.select(...).')
    assertNoCollect(pattern.pattern, 'P.exclude(pattern) cannot contain P.collect(...).')
    return true
  }
  if (kind !== 'optional' && kind !== 'exact') return false
  captureUndefinedSelections(pattern.pattern, selection, options)
  return true
}

/**
 * Captures `undefined` through tuple and rest patterns for absent optional properties.
 *
 * @param pattern - Built-in collection pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a tuple or rest pattern and was handled.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedFromCollection(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions) {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'rest') {
    captureUndefinedSelections(pattern.item, selection, options)
    return true
  }
  if (kind === 'array' || kind === 'non-empty-array') {
    validateRepeatedSelectionContainers(pattern)
    captureUndefinedSelections(pattern.item, selection, repeatedOptions(options))
    return true
  }
  if (kind === 'record' || kind === 'non-empty-record') {
    validateRepeatedSelectionContainers(pattern)
    captureUndefinedSelections(pattern.key, selection, repeatedOptions(options))
    captureUndefinedSelections(pattern.value, selection, repeatedOptions(options))
    return true
  }
  if (kind === 'map') {
    validateRepeatedSelectionContainers(pattern)
    if (pattern.mode === 'homogeneous') {
      captureUndefinedSelections(pattern.key, selection, repeatedOptions(options))
      captureUndefinedSelections(pattern.value, selection, repeatedOptions(options))
      return true
    }
    for (const [keyPattern, valuePattern] of pattern.entries) {
      captureUndefinedSelections(keyPattern, selection, repeatedOptions(options))
      captureUndefinedSelections(valuePattern, selection, repeatedOptions(options))
    }
    return true
  }
  if (kind === 'set') {
    validateRepeatedSelectionContainers(pattern)
    for (const valuePattern of pattern.values)
      captureUndefinedSelections(valuePattern, selection, repeatedOptions(options))
    return true
  }
  if (kind !== 'tuple') return false
  for (const item of pattern.items) captureUndefinedSelections(item, selection, options)
  return true
}

/**
 * Enforces selection restrictions for repeated container helpers.
 *
 * @param pattern - Built-in pattern to validate.
 * @throws {TypeError} When repeated array or record patterns contain selections.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export function validateRepeatedSelectionContainers(pattern: BuiltInPattern) {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'array') {
    assertNoArraySelection(pattern.item, 'array')
    assertNoCollectInsideExclude(pattern.item)
  }
  if (kind === 'non-empty-array') {
    assertNoArraySelection(pattern.item, 'nonEmptyArray')
    assertNoCollectInsideExclude(pattern.item)
  }
  if (kind === 'record') {
    assertNoRecordSelection(pattern.key, pattern.value, 'record')
    assertNoCollectInsideExclude(pattern.key)
    assertNoCollectInsideExclude(pattern.value)
  }
  if (kind === 'non-empty-record') {
    assertNoRecordSelection(pattern.key, pattern.value, 'nonEmptyRecord')
    assertNoCollectInsideExclude(pattern.key)
    assertNoCollectInsideExclude(pattern.value)
  }
  if (kind === 'map') {
    assertNoMapSelection(pattern)
    assertNoCollectInsideExclude(pattern)
  }
  if (kind === 'set') {
    assertNoSetSelection(pattern)
    assertNoCollectInsideExclude(pattern)
  }
}

/**
 * Recursively captures `undefined` for selections under an absent optional property.
 *
 * @param pattern - Pattern subtree associated with the absent property.
 * @param selection - Mutable capture state to update.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
export function captureUndefinedSelections(pattern: unknown, selection: SelectionState, options: MatchOptions): void {
  if (isPattern(pattern)) {
    captureUndefinedFromBuiltIn(pattern, selection, options)
    return
  }

  if (Array.isArray(pattern)) {
    for (const item of pattern) captureUndefinedSelections(item, selection, options)
    return
  }

  if (isObject(pattern)) {
    for (const key of ownPatternKeys(pattern))
      captureUndefinedSelections(readProperty(pattern, key), selection, options)
  }
}
