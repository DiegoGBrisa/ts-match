import { PatternMismatchError } from './errors.js'
import { matchesPatternWithSelectionValidation } from './runtime.js'
import type { GuardedValue, PatternStructureArgument } from './types.js'

/**
 * Creates a reusable type guard from a pattern, or checks one value immediately.
 *
 * Use the curried form when you want to pass a pattern-based guard to array
 * helpers, validation branches, or other APIs that expect `(value) => boolean`.
 * Use the two-argument form when you already have a value and need an immediate
 * boolean with TypeScript narrowing in the current control-flow branch.
 *
 * @param pattern - Literal, object, array, tuple, or `P.*` pattern to test.
 * @returns A type guard that narrows matching values to `GuardedValue<TValue, TPattern>`.
 * @example
 * ```ts
 * const isUser = isMatching({ type: 'user', id: P.string })
 * if (isUser(value)) value.id.toUpperCase()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#ismatching
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#assertion-helpers
 */
export function isMatching<const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern>,
): <TValue>(value: TValue) => value is GuardedValue<TValue, TPattern>

/**
 * Checks whether a value matches a pattern and narrows the value on success.
 *
 * This overload is useful at runtime boundaries where the candidate value is
 * already available. The pattern must use public pattern helpers only; invalid
 * repeated-selection placements throw the same errors as `match`.
 *
 * @param pattern - Literal, object, array, tuple, or `P.*` pattern to test.
 * @param value - Candidate value to validate.
 * @returns `true` when `value` satisfies `pattern`.
 * @example
 * ```ts
 * if (isMatching({ type: 'ready' }, value)) {
 *   value.type
 * }
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#ismatching
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#assertion-helpers
 */
export function isMatching<TValue, const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern>,
  value: TValue,
): value is GuardedValue<TValue, TPattern>

/**
 * Implements both public `isMatching(...)` call shapes.
 *
 * @param pattern - Pattern used to validate candidates.
 * @param value - Optional immediate candidate value.
 * @returns A reusable guard when `value` is omitted, otherwise a boolean match result.
 * @see https://github.com/DiegoGBrisa/ts-match#ismatching
 */
export function isMatching(pattern: unknown, value?: unknown) {
  if (arguments.length === 1) {
    return (candidate: unknown) => matchesPatternWithSelectionValidation(candidate, pattern)
  }
  return matchesPatternWithSelectionValidation(value, pattern)
}

/**
 * Asserts that a value matches a pattern and narrows the value after the call.
 *
 * Use this for fail-fast validation at boundaries where code should stop if the
 * value does not match. The error includes previews of the value and pattern;
 * the original value and pattern are attached as non-enumerable properties for
 * debugging.
 *
 * @param pattern - Literal, object, array, tuple, or `P.*` pattern to require.
 * @param value - Candidate value to validate and narrow.
 * @throws {PatternMismatchError} When `value` does not satisfy `pattern`.
 * @example
 * ```ts
 * assertMatching({ type: 'ready', payload: P.string }, value)
 * value.payload.toUpperCase()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#assertmatching
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#assertion-helpers
 */
export function assertMatching<TValue, const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern>,
  value: TValue,
): asserts value is GuardedValue<TValue, TPattern> {
  if (!matchesPatternWithSelectionValidation(value, pattern)) throw new PatternMismatchError(pattern, value)
}
