import { PatternMismatchError } from './errors.js'
import { matchesPatternWithSelectionValidation } from './runtime.js'
import type { GuardedValue, PatternStructureArgument } from './types.js'

export function isMatching<const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern>,
): <TValue>(value: TValue) => value is GuardedValue<TValue, TPattern>
export function isMatching<TValue, const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern>,
  value: TValue,
): value is GuardedValue<TValue, TPattern>
export function isMatching(pattern: unknown, value?: unknown) {
  if (arguments.length === 1) {
    return (candidate: unknown) => matchesPatternWithSelectionValidation(candidate, pattern)
  }
  return matchesPatternWithSelectionValidation(value, pattern)
}

export function assertMatching<TValue, const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern>,
  value: TValue,
): asserts value is GuardedValue<TValue, TPattern> {
  if (!matchesPatternWithSelectionValidation(value, pattern)) throw new PatternMismatchError(pattern, value)
}
