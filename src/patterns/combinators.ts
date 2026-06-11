import { freezePattern } from './base.js'
import { PATTERN_TOKEN } from './token.js'
import type {
  ArrayPattern,
  ExcludePattern,
  ExcludePatternArgument,
  NonEmptyArrayPattern,
  OptionalPattern,
  PatternStructureArgument,
  Primitive,
  RepeatedPatternArgument,
  UnionPattern,
} from '../types/index.js'
import type { PatternListArgument } from './arguments.js'

/**
 * Matches when any supplied pattern matches.
 *
 * Use `P.union(...)` to express one or more alternatives inside a single
 * structural pattern rather than adding separate branches. Each argument must be
 * a valid public pattern, literal pattern, object pattern, array pattern, or
 * tuple pattern.
 *
 * @param patterns - One or more alternative patterns tested from left to right.
 * @returns A frozen union pattern helper.
 * @example
 * ```ts
 * match(value).with(P.union('draft', 'queued'), () => 'pending').otherwise(() => 'done')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#pattern-helpers
 */
export function pUnion<const TPattern extends Primitive>(
  ...patterns: readonly [TPattern, ...TPattern[]]
): UnionPattern<readonly [TPattern, ...TPattern[]]>
export function pUnion<const TPatterns extends readonly [unknown, ...unknown[]]>(
  ...patterns: PatternListArgument<TPatterns>
): UnionPattern<TPatterns>
export function pUnion(...patterns: readonly [unknown, ...unknown[]]): UnionPattern<readonly [unknown, ...unknown[]]> {
  if (patterns.length === 0) throw new TypeError('P.union(...) requires at least one pattern.')
  return freezePattern({ [PATTERN_TOKEN]: 'union', patterns })
}

/**
 * Matches values that do not match the supplied pattern.
 *
 * Use this for exclusion branches such as "anything except archived". Selection
 * helpers are not allowed inside exclusions because no positive match payload is
 * available to capture.
 *
 * @param pattern - Pattern to reject.
 * @returns A frozen exclusion pattern helper.
 * @example
 * ```ts
 * match(status).with(P.exclude('archived'), () => 'active').otherwise(() => 'archived')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#pattern-helpers
 */
export function pExclude<const TPattern>(
  pattern: TPattern & ExcludePatternArgument<TPattern>,
): ExcludePattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'exclude', pattern })
}

/**
 * Accepts `undefined` values and missing object properties for a nested pattern.
 *
 * Use this inside object patterns when a property is optional, or as a direct
 * value pattern when `undefined` should be accepted in addition to the nested
 * pattern. When the property is absent, nested selections capture `undefined`.
 *
 * @param pattern - Pattern to apply when the value or property is present.
 * @returns A frozen optional pattern helper.
 * @example
 * ```ts
 * match(value).with({ name: P.optional(P.string) }, (user) => user.name).otherwise(() => undefined)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pOptional<const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): OptionalPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'optional', pattern })
}

/**
 * Matches arrays whose every item matches the supplied pattern.
 *
 * The value must be an array. Empty arrays match because every item satisfies the
 * item pattern vacuously. `P.select(...)` is intentionally not supported inside
 * repeated array item patterns because multiple captures would be ambiguous.
 *
 * @param item - Pattern required for every array item.
 * @returns A frozen repeated-array pattern helper.
 * @example
 * ```ts
 * match(value).with(P.array(P.string), (items) => items.join(',')).otherwise(() => '')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pArray<const TPattern>(
  item: TPattern & RepeatedPatternArgument<TPattern, 'P.array'>,
): ArrayPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'array', item })
}

/**
 * Matches non-empty arrays whose every item matches the supplied pattern.
 *
 * Use this when at least one item is required. Like `P.array`, selections inside
 * the repeated item pattern are rejected to avoid ambiguous multi-item captures.
 *
 * @param item - Pattern required for every array item.
 * @returns A frozen non-empty-array pattern helper.
 * @example
 * ```ts
 * match(value).with(P.nonEmptyArray(P.number), ([first]) => first).otherwise(() => 0)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pNonEmptyArray<const TPattern>(
  item: TPattern & RepeatedPatternArgument<TPattern, 'P.nonEmptyArray'>,
): NonEmptyArrayPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'non-empty-array', item })
}
