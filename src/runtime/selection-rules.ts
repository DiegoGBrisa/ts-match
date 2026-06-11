import { PATTERN_TOKEN } from '../patterns/token.js'
import type { BuiltInPattern, MapEntryPattern } from '../types/index.js'
import { isObject, isPattern, ownPatternKeys, readProperty } from './core.js'
import { ensureCollected, type SelectionState } from './selection.js'

/**
 * Rejects selection helpers in pattern positions where capture payloads are ambiguous.
 *
 * @param pattern - Pattern subtree to inspect.
 * @param message - Error message to use when a selection is found.
 * @throws {TypeError} When `pattern` contains `P.select(...)`.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export function assertNoSelect(pattern: unknown, message: string) {
  if (containsSelect(pattern)) throw new TypeError(message)
}

/**
 * Rejects `P.select(...)` inside repeated array item patterns.
 *
 * Repeated containers can match multiple values, so one handler payload would be
 * ambiguous. Tuple positions should be used when a specific item must be captured.
 *
 * @param item - Repeated item pattern to inspect.
 * @param label - Public helper name used in the error message.
 * @throws {TypeError} When the item pattern contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export function assertNoArraySelection(item: unknown, label: 'array' | 'nonEmptyArray') {
  assertNoSelect(item, `P.select(...) cannot be used inside P.${label}(...).`)
}

/**
 * Rejects `P.select(...)` inside record key or value patterns.
 *
 * Records may contain many entries, so a single capture payload would be
 * ambiguous and order-dependent.
 *
 * @param keyPattern - Record key pattern to inspect.
 * @param valuePattern - Record value pattern to inspect.
 * @param label - Public helper name used in the error message.
 * @throws {TypeError} When either record pattern contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
export function assertNoRecordSelection(
  keyPattern: unknown,
  valuePattern: unknown,
  label: 'record' | 'nonEmptyRecord',
) {
  if (containsSelect(keyPattern) || containsSelect(valuePattern)) {
    throw new TypeError(`P.select(...) cannot be used inside P.${label}(...).`)
  }
}

/**
 * Rejects `P.select(...)` inside Map key or value patterns.
 *
 * Map patterns may scan and consume several entries, so one capture payload would
 * be ambiguous and order-dependent.
 *
 * @param pattern - Map pattern to inspect.
 * @throws {TypeError} When any Map key or value pattern contains a selection.
 */
export function assertNoMapSelection(pattern: BuiltInPattern) {
  if (pattern[PATTERN_TOKEN] !== 'map') return

  if (pattern.mode === 'homogeneous') {
    if (containsSelect(pattern.key) || containsSelect(pattern.value)) {
      throw new TypeError('P.select(...) cannot be used inside P.map(...).')
    }
    return
  }

  for (const [keyPattern, valuePattern] of pattern.entries) {
    if (containsSelect(keyPattern) || containsSelect(valuePattern)) {
      throw new TypeError('P.select(...) cannot be used inside P.map(...).')
    }
  }
}

/**
 * Rejects `P.select(...)` inside Set value patterns.
 *
 * Set patterns may scan and consume several values, so one capture payload would
 * be ambiguous and order-dependent.
 *
 * @param pattern - Set pattern to inspect.
 * @throws {TypeError} When any Set value pattern contains a selection.
 */
export function assertNoSetSelection(pattern: BuiltInPattern) {
  if (pattern[PATTERN_TOKEN] !== 'set') return
  if (pattern.values.some(containsSelect)) throw new TypeError('P.select(...) cannot be used inside P.set(...).')
}

function mapEntryChildren(entries: readonly MapEntryPattern[]): readonly unknown[] {
  const children: unknown[] = []
  for (const [keyPattern, valuePattern] of entries) children.push(keyPattern, valuePattern)
  return children
}

function builtInPatternChildren(pattern: BuiltInPattern): readonly unknown[] {
  if ('pattern' in pattern) return [pattern.pattern]
  if ('patterns' in pattern) return pattern.patterns
  if ('item' in pattern) return [pattern.item]
  if ('items' in pattern) return pattern.items
  if (pattern[PATTERN_TOKEN] === 'map')
    return pattern.mode === 'homogeneous' ? [pattern.key, pattern.value] : mapEntryChildren(pattern.entries)
  if ('key' in pattern && 'value' in pattern) return [pattern.key, pattern.value]
  if ('values' in pattern) return pattern.values
  return []
}

function patternChildren(pattern: unknown): readonly unknown[] {
  if (isPattern(pattern)) return builtInPatternChildren(pattern)
  if (Array.isArray(pattern)) return pattern
  if (!isObject(pattern)) return []
  return ownPatternKeys(pattern).map((key) => readProperty(pattern, key))
}

function patternTreeSome(pattern: unknown, predicate: (pattern: BuiltInPattern) => boolean): boolean {
  if (isPattern(pattern) && predicate(pattern)) return true
  return patternChildren(pattern).some((child) => patternTreeSome(child, predicate))
}

function visitPatternTree(pattern: unknown, visitor: (pattern: BuiltInPattern) => void) {
  if (isPattern(pattern)) visitor(pattern)
  for (const child of patternChildren(pattern)) visitPatternTree(child, visitor)
}

/**
 * Recursively detects `P.select(...)` inside any public pattern structure.
 *
 * @param pattern - Literal, object, tuple, or built-in pattern to inspect.
 * @returns `true` when any nested selection helper exists.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function containsSelect(pattern: unknown) {
  return patternTreeSome(pattern, (builtIn) => builtIn[PATTERN_TOKEN] === 'select')
}

export function containsCollect(pattern: unknown) {
  return patternTreeSome(pattern, (builtIn) => builtIn[PATTERN_TOKEN] === 'collect')
}

function containsAnonymousSelect(pattern: unknown) {
  return patternTreeSome(pattern, (builtIn) => builtIn[PATTERN_TOKEN] === 'select' && builtIn.name === undefined)
}

function containsCollectInsideExclude(pattern: unknown) {
  return patternTreeSome(pattern, (builtIn) => builtIn[PATTERN_TOKEN] === 'exclude' && containsCollect(builtIn.pattern))
}

function namedSelectNames(pattern: unknown, names: Set<PropertyKey> = new Set()): Set<PropertyKey> {
  visitPatternTree(pattern, (builtIn) => {
    if (builtIn[PATTERN_TOKEN] === 'select' && builtIn.name !== undefined) names.add(builtIn.name)
  })
  return names
}

export function assertNoCollect(pattern: unknown, message: string) {
  if (containsCollect(pattern)) throw new TypeError(message)
}

export function assertNoCollectInsideExclude(pattern: unknown) {
  if (containsCollectInsideExclude(pattern)) {
    throw new TypeError('P.exclude(pattern) cannot contain P.collect(...).')
  }
}

interface CollectPlacementChild {
  readonly pattern: unknown
  readonly allowCollect: boolean
  readonly insideExclude: boolean
}

function collectPlacementEntryChildren(
  entries: readonly MapEntryPattern[],
  insideExclude: boolean,
): readonly CollectPlacementChild[] {
  const children: CollectPlacementChild[] = []
  for (const [keyPattern, valuePattern] of entries) {
    children.push({ pattern: keyPattern, allowCollect: true, insideExclude })
    children.push({ pattern: valuePattern, allowCollect: true, insideExclude })
  }
  return children
}

function collectPlacementChildren(
  pattern: BuiltInPattern,
  allowCollect: boolean,
  insideExclude: boolean,
): readonly CollectPlacementChild[] {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'collect') {
    if (insideExclude) throw new TypeError('P.exclude(pattern) cannot contain P.collect(...).')
    if (!allowCollect) throw new TypeError('P.collect(name, pattern) can only be used inside repeated containers.')
    return [{ pattern: pattern.pattern, allowCollect: true, insideExclude: false }]
  }
  if ('pattern' in pattern) {
    return [{ pattern: pattern.pattern, allowCollect, insideExclude: kind === 'exclude' || insideExclude }]
  }
  if ('item' in pattern) {
    return [{ pattern: pattern.item, allowCollect: kind !== 'rest' || allowCollect, insideExclude }]
  }
  if ('items' in pattern) return pattern.items.map((item) => ({ pattern: item, allowCollect, insideExclude }))
  if (kind === 'map') {
    if (pattern.mode === 'homogeneous') {
      return [
        { pattern: pattern.key, allowCollect: true, insideExclude },
        { pattern: pattern.value, allowCollect: true, insideExclude },
      ]
    }
    return collectPlacementEntryChildren(pattern.entries, insideExclude)
  }
  if ('key' in pattern && 'value' in pattern) {
    return [
      { pattern: pattern.key, allowCollect: true, insideExclude },
      { pattern: pattern.value, allowCollect: true, insideExclude },
    ]
  }
  if ('values' in pattern) return pattern.values.map((value) => ({ pattern: value, allowCollect: true, insideExclude }))
  return []
}

export function validateCollectPlacement(pattern: unknown, allowCollect: boolean, insideExclude = false): void {
  if (isPattern(pattern)) {
    for (const child of collectPlacementChildren(pattern, allowCollect, insideExclude)) {
      validateCollectPlacement(child.pattern, child.allowCollect, child.insideExclude)
    }
    return
  }

  if (Array.isArray(pattern)) {
    for (const item of pattern) validateCollectPlacement(item, allowCollect, insideExclude)
    return
  }

  if (isObject(pattern)) {
    for (const key of ownPatternKeys(pattern))
      validateCollectPlacement(readProperty(pattern, key), allowCollect, insideExclude)
  }
}

function collectNames(pattern: unknown, names: Set<PropertyKey> = new Set()): Set<PropertyKey> {
  visitPatternTree(pattern, (builtIn) => {
    if (builtIn[PATTERN_TOKEN] === 'collect') names.add(builtIn.name)
  })
  return names
}

export function ensureCollectedArrays(selection: SelectionState | undefined, pattern: unknown) {
  if (!selection) return
  for (const name of collectNames(pattern)) ensureCollected(selection, name)
}

function validateCollectCaptureCompatibility(pattern: unknown) {
  if (containsAnonymousSelect(pattern)) {
    throw new TypeError('P.collect(name, pattern) cannot be mixed with anonymous P.select() in the same pattern.')
  }

  const selectedNames = namedSelectNames(pattern)
  for (const name of collectNames(pattern)) {
    if (selectedNames.has(name)) {
      throw new TypeError(`P.collect(${String(name)}, pattern) cannot use the same name as P.select(...).`)
    }
  }
}

export function validatePatternCaptureUsage(pattern: unknown) {
  if (!containsCollect(pattern)) return
  validateCollectPlacement(pattern, false)
  validateCollectCaptureCompatibility(pattern)
}
