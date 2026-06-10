import { freezePattern } from './base.js'
import { PATTERN_TOKEN } from './token.js'
import type {
  ExactPattern,
  PatternStructureArgument,
  RestPattern,
  TuplePattern,
  TuplePatternArgument,
} from '../types/index.js'

/**
 * Matches arrays against positional tuple item patterns.
 *
 * Pass a readonly tuple of item patterns. Use `P.rest(pattern)` only as the final
 * tuple item to match a variable-length suffix. The runtime value must satisfy
 * every positional pattern and the tuple length rules.
 *
 * @param items - Ordered tuple item patterns.
 * @returns A frozen tuple pattern helper.
 * @example
 * ```ts
 * match(value).with(P.tuple([P.string, P.number]), ([name, count]) => count)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pTuple<const TPatterns extends readonly unknown[]>(
  items: TPatterns & TuplePatternArgument<TPatterns>,
): TuplePattern<TPatterns> {
  return freezePattern({ [PATTERN_TOKEN]: 'tuple', items })
}

/**
 * Matches the remaining items in a tuple pattern.
 *
 * `P.rest(pattern)` is valid only as the final item inside `P.tuple([...])`. It
 * requires every remaining runtime array item to match the supplied pattern.
 *
 * @param item - Pattern required for each remaining tuple item.
 * @returns A frozen tuple-rest pattern helper.
 * @throws {TypeError} When used outside a tuple or before the final tuple item.
 * @example
 * ```ts
 * match(value).with(P.tuple([P.string, P.rest(P.number)]), ([head]) => head)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#arraytuple-semantics
 */
export function pRest<const TPattern>(
  item: TPattern & PatternStructureArgument<TPattern, true>,
): RestPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'rest', item })
}

/**
 * Matches a pattern while rejecting supported extra object keys or collection
 * entries.
 *
 * Use `P.exact(...)` when a branch should accept only the keys listed in a
 * nested object pattern or only the entries/values consumed by required
 * `P.map(...)` / `P.set(...)` patterns. Homogeneous Map/Set patterns already
 * check every runtime entry/value, so exactness adds no extra constraint there.
 *
 * @param pattern - Object, collection, or pattern structure to match exactly.
 * @returns A frozen exact pattern helper.
 * @example
 * ```ts
 * match(value).with(P.exact({ type: 'ready' }), () => 'ready').otherwise(() => 'other')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 * @see https://github.com/DiegoGBrisa/ts-match#map-and-set-patterns
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pExact<const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): ExactPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'exact', pattern })
}
