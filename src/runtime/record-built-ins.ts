import { PATTERN_TOKEN } from '../patterns/token.js'
import type { BuiltInPattern } from '../types/index.js'
import type { MatchOptions } from './core.js'
import type { SelectionState } from './selection.js'
import { assertNoCollectInsideExclude, assertNoRecordSelection } from './selection-rules.js'
import { recordMatches, type PatternMatcher } from './object-structures.js'

export function matchRecordPattern(
  matcher: PatternMatcher,
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'record') {
    assertNoRecordSelection(pattern.key, pattern.value, 'record')
    assertNoCollectInsideExclude(pattern)
    return recordMatches(matcher, value, pattern.key, pattern.value, false, selection, options)
  }
  if (kind !== 'non-empty-record') return undefined
  assertNoRecordSelection(pattern.key, pattern.value, 'nonEmptyRecord')
  assertNoCollectInsideExclude(pattern)
  return recordMatches(matcher, value, pattern.key, pattern.value, true, selection, options)
}
