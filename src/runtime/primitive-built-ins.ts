import { PATTERN_TOKEN } from '../patterns/token.js'
import type { BuiltInPattern } from '../types/index.js'
import { primitiveMatches, regexMatches, temporalMatches } from './core.js'

function matchNumberOrRegexPattern(value: unknown, pattern: BuiltInPattern): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'nan') return Number.isNaN(value)
  if (kind === 'finite') return typeof value === 'number' && Number.isFinite(value)
  if (kind === 'integer') return Number.isInteger(value)
  if (kind === 'regex') return regexMatches(value, pattern.regex)
  return undefined
}

function matchInstanceLikePattern(value: unknown, pattern: BuiltInPattern): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'date') return value instanceof Date && !Number.isNaN(value.getTime())
  if (kind === 'error') return value instanceof Error
  if (kind === 'regexp') return value instanceof RegExp
  if (kind === 'temporal') return temporalMatches(value, pattern.temporal)
  return undefined
}

function matchValueLikePattern(value: unknown, pattern: BuiltInPattern): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'nullish') return value === null || value === undefined
  if (kind === 'falsy') return !value
  if (kind === 'truthy') return Boolean(value)
  if (kind === 'literal') return Object.is(value, pattern.literal)
  return undefined
}

/**
 * Evaluates primitive-like built-in helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @returns Match result, or `undefined` when the helper is not primitive-like.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function matchPrimitivePattern(value: unknown, pattern: BuiltInPattern): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'wildcard') return true
  if (kind === 'primitive') return primitiveMatches(value, pattern.primitive)
  return (
    matchNumberOrRegexPattern(value, pattern) ??
    matchInstanceLikePattern(value, pattern) ??
    matchValueLikePattern(value, pattern)
  )
}
