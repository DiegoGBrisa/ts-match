import type { MapEntryPattern } from '../types/index.js'
import { type MatchOptions, repeatedOptions } from './core.js'
import { cloneSelection, commitSelection, type SelectionState } from './selection.js'
import { ensureCollectedArrays } from './selection-rules.js'
import type { PatternMatcher } from './object-structures.js'

/**
 * Checks one Map entry against one required-entry clause.
 *
 * @param entry - Runtime Map entry in insertion order.
 * @param clause - Required key/value pattern pair.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when both key and value satisfy the clause.
 */
function mapEntryMatches(
  matcher: PatternMatcher,
  entry: readonly [unknown, unknown],
  clause: MapEntryPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  const [keyPattern, valuePattern] = clause

  if (selection) {
    const entrySelection = cloneSelection(selection)
    if (
      matcher(entry[0], keyPattern, entrySelection, repeatedOptions(options)) &&
      matcher(entry[1], valuePattern, entrySelection, repeatedOptions(options))
    ) {
      commitSelection(selection, entrySelection)
      return true
    }
    return false
  }

  return (
    matcher(entry[0], keyPattern, undefined, repeatedOptions(options)) &&
    matcher(entry[1], valuePattern, undefined, repeatedOptions(options))
  )
}

/**
 * Matches homogeneous Map patterns by requiring every entry to satisfy the same
 * key and value patterns.
 *
 * @param value - Candidate runtime value.
 * @param keyPattern - Pattern required for every Map key.
 * @param valuePattern - Pattern required for every Map value.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when `value` is a Map and every entry matches.
 */
export function homogeneousMapMatches(
  matcher: PatternMatcher,
  value: unknown,
  keyPattern: unknown,
  valuePattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!(value instanceof Map)) return false

  for (const [entryKey, entryValue] of value) {
    if (!matcher(entryKey, keyPattern, selection, repeatedOptions(options))) return false
    if (!matcher(entryValue, valuePattern, selection, repeatedOptions(options))) return false
  }

  ensureCollectedArrays(selection, keyPattern)
  ensureCollectedArrays(selection, valuePattern)
  return true
}

/**
 * Matches required-entry Map patterns with deterministic distinct consumption.
 *
 * Clauses are evaluated left to right. For each clause, Map entries are scanned
 * in insertion order and the first unused matching entry is consumed.
 *
 * @param value - Candidate runtime value.
 * @param entries - Required key/value pattern clauses.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when every required clause consumes one distinct Map entry.
 */
export function requiredMapEntriesMatch(
  matcher: PatternMatcher,
  value: unknown,
  entries: readonly MapEntryPattern[],
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!(value instanceof Map)) return false

  const runtimeEntries = [...value.entries()]
  const usedIndexes = new Set<number>()

  for (const clause of entries) {
    let consumedIndex: number | undefined
    for (let index = 0; index < runtimeEntries.length; index += 1) {
      if (usedIndexes.has(index)) continue
      const runtimeEntry = runtimeEntries[index]
      if (runtimeEntry === undefined) continue
      if (!mapEntryMatches(matcher, runtimeEntry, clause, selection, options)) continue
      consumedIndex = index
      break
    }

    if (consumedIndex === undefined) return false
    usedIndexes.add(consumedIndex)
  }

  if (options.exact && usedIndexes.size !== value.size) return false
  ensureCollectedArrays(selection, entries)
  return true
}

/**
 * Matches homogeneous Set patterns by requiring every value to satisfy one pattern.
 *
 * @param value - Candidate runtime value.
 * @param valuePattern - Pattern required for every Set value.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when `value` is a Set and every value matches.
 */
export function homogeneousSetMatches(
  matcher: PatternMatcher,
  value: unknown,
  valuePattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!(value instanceof Set)) return false

  for (const setValue of value) {
    if (!matcher(setValue, valuePattern, selection, repeatedOptions(options))) return false
  }

  ensureCollectedArrays(selection, valuePattern)
  return true
}

/**
 * Matches required-value Set patterns with deterministic distinct consumption.
 *
 * Value clauses are evaluated left to right. For each clause, Set values are
 * scanned in insertion order and the first unused matching value is consumed.
 *
 * @param value - Candidate runtime value.
 * @param patterns - Required value patterns.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when every required clause consumes one distinct Set value.
 */
export function requiredSetValuesMatch(
  matcher: PatternMatcher,
  value: unknown,
  patterns: readonly unknown[],
  selection: SelectionState | undefined,
  options: MatchOptions,
) {
  if (!(value instanceof Set)) return false

  const runtimeValues = [...value.values()]
  const usedIndexes = new Set<number>()

  for (const valuePattern of patterns) {
    let consumedIndex: number | undefined
    for (let index = 0; index < runtimeValues.length; index += 1) {
      if (usedIndexes.has(index)) continue
      if (selection) {
        const valueSelection = cloneSelection(selection)
        if (!matcher(runtimeValues[index], valuePattern, valueSelection, repeatedOptions(options))) continue
        commitSelection(selection, valueSelection)
      } else if (!matcher(runtimeValues[index], valuePattern, undefined, repeatedOptions(options))) {
        continue
      }
      consumedIndex = index
      break
    }

    if (consumedIndex === undefined) return false
    usedIndexes.add(consumedIndex)
  }

  if (options.exact && usedIndexes.size !== value.size) return false
  ensureCollectedArrays(selection, patterns)
  return true
}
