import { freezePattern, PAIR_ARITY } from './base.js'
import { PATTERN_TOKEN } from './token.js'
import type { EntryMapPattern, HomogeneousMapPattern, MapEntryPattern, SetPattern } from '../types/index.js'
import type { MapPatternArgument, MapPatternFromArgs, SetPatternArgument, SetPatternFromArgs } from './arguments.js'

/**
 * Matches actual `Map` instances.
 *
 * Use `P.map(keyPattern, valuePattern)` for homogeneous maps where every entry
 * must match the same key and value patterns. Use `P.map([key, value], ...)` for
 * required-entry mode, where distinct Map entries satisfy each clause and extra
 * entries are allowed unless wrapped in `P.exact(...)`.
 *
 * @param key - Homogeneous key pattern.
 * @param value - Homogeneous value pattern.
 * @returns A frozen Map pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#map-and-set-patterns
 */
export function pMap<const TArgs extends readonly [unknown, ...unknown[]]>(
  ...args: TArgs & MapPatternArgument<TArgs>
): MapPatternFromArgs<TArgs>
export function pMap(
  ...args: readonly unknown[]
): HomogeneousMapPattern<unknown, unknown> | EntryMapPattern<readonly MapEntryPattern[]> {
  if (args.length === 0) throw new TypeError('P.map(...) requires map patterns.')

  const topLevelArrays = args.filter(Array.isArray)
  const entryClauses = args.filter(isMapEntryClause)
  if (entryClauses.length === args.length) {
    return freezePattern({
      [PATTERN_TOKEN]: 'map',
      mode: 'entries',
      key: undefined,
      value: undefined,
      entries: entryClauses,
    })
  }

  if (entryClauses.length > 0) {
    throw new TypeError('P.map(...) cannot mix entry clauses with homogeneous key/value patterns.')
  }

  if (topLevelArrays.length > 0) {
    throw new TypeError(
      'P.map(keyPattern, valuePattern) cannot use top-level array patterns. Use P.tuple([...]) for tuple keys or values.',
    )
  }

  if (args.length !== PAIR_ARITY) {
    throw new TypeError('P.map(keyPattern, valuePattern) requires exactly two patterns.')
  }

  return freezePattern({
    [PATTERN_TOKEN]: 'map',
    mode: 'homogeneous',
    key: args[0],
    value: args[1],
    entries: undefined,
  })
}

function isMapEntryClause(value: unknown): value is MapEntryPattern {
  return Array.isArray(value) && value.length === PAIR_ARITY
}

/**
 * Matches actual `Set` instances.
 *
 * Use `P.set(valuePattern)` for homogeneous sets where every value must match
 * one pattern. Use `P.set(valuePattern, ...moreValuePatterns)` for required-value
 * mode, where distinct Set values satisfy each clause and extra values are
 * allowed unless wrapped in `P.exact(...)`.
 *
 * @param value - Homogeneous value pattern or first required-value clause.
 * @param moreValues - Additional required-value clauses.
 * @returns A frozen Set pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#map-and-set-patterns
 */
export function pSet<const TArgs extends readonly [unknown, ...unknown[]]>(
  ...values: TArgs & SetPatternArgument<TArgs>
): SetPatternFromArgs<TArgs>
export function pSet(...values: readonly unknown[]): SetPattern<readonly unknown[], 'homogeneous' | 'values'> {
  if (values.length === 0) throw new TypeError('P.set(...) requires at least one value pattern.')
  if (values.length === 1) return freezePattern({ [PATTERN_TOKEN]: 'set', mode: 'homogeneous', values })
  return freezePattern({ [PATTERN_TOKEN]: 'set', mode: 'values', values })
}
