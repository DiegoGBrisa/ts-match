import { NORMAL_OPTIONS, isObject, isPattern, type MatchOptions } from './core.js'
import { selectedPayload, type SelectionState } from './selection.js'
import { containsCollect, containsSelect, validatePatternCaptureUsage } from './selection-rules.js'
import { matchBuiltInPattern } from './built-ins.js'
import { matchTuple, objectPatternMatches } from './object-structures.js'

function matchesPattern(
  value: unknown,
  pattern: unknown,
  selection: SelectionState | undefined = undefined,
  options: MatchOptions = NORMAL_OPTIONS,
) {
  if (isPattern(pattern)) return matchBuiltInPattern(matchesPattern, value, pattern, selection, options)
  if (Array.isArray(pattern)) return matchTuple(matchesPattern, value, pattern, selection, options)
  if (isObject(pattern)) return objectPatternMatches(matchesPattern, value, pattern, selection, options)
  return Object.is(value, pattern)
}

/**
 * Determines whether a standalone pattern check needs capture validation.
 *
 * `isMatching` and `assertMatching` do not use captured payloads, but they still
 * need to reject invalid selection placements when selections appear.
 *
 * @param pattern - Pattern structure to inspect.
 * @returns `true` when selection validation should run.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
function needsSelectionValidation(pattern: unknown) {
  return containsSelect(pattern) || containsCollect(pattern)
}

/**
 * Matches a value while validating selection placement for assertion-style APIs.
 *
 * Use this internal helper for APIs that return only a boolean or assertion but
 * still need to enforce the same selection constraints as `match`.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Pattern structure to evaluate.
 * @returns `true` when the value matches the pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#ismatching
 */
export function matchesPatternWithSelectionValidation(value: unknown, pattern: unknown): boolean {
  if (!needsSelectionValidation(pattern)) return matchesPattern(value, pattern)
  validatePatternCaptureUsage(pattern)
  const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined, collected: undefined }
  return matchesPattern(value, pattern, selection)
}

/**
 * Result of trying one or more patterns against a value.
 *
 * `payload` is either the original value, an anonymous selection payload, a named
 * selection object, or `undefined` when no pattern matched.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#handler-parameters-are-narrowed
 */
interface MatchAttempt {
  readonly matched: boolean
  readonly payload: unknown
}

/**
 * Attempts to match a value against ordered branch patterns.
 *
 * The first successful pattern wins. Selection helpers transform the handler
 * payload; patterns without selections pass through the original matched value.
 *
 * @param value - Candidate runtime value from a match chain.
 * @param patterns - Ordered pattern alternatives from one branch.
 * @returns Match status and handler payload for the first successful pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#withpattern-handler
 */
export function attemptMatch(value: unknown, patterns: readonly unknown[]): MatchAttempt {
  for (const pattern of patterns) {
    validatePatternCaptureUsage(pattern)
    const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined, collected: undefined }
    if (!matchesPattern(value, pattern, selection)) continue

    if (selection.mode === 'anonymous') return { matched: true, payload: selection.anonymous }
    if (selection.mode === 'named') return { matched: true, payload: selectedPayload(selection) }
    return { matched: true, payload: value }
  }

  return { matched: false, payload: undefined }
}
