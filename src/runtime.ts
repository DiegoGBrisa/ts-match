import { ownEnumerableKeys } from './keys.js'
import { PATTERN_TOKEN } from './tokens.js'
import type { BuiltInPattern, OptionalPattern } from './types.js'

type SelectionMode = 'none' | 'anonymous' | 'named'

interface SelectionState {
  mode: SelectionMode
  anonymous: unknown
  named: Record<PropertyKey, unknown> | undefined
}

interface IndexableObject {
  readonly [key: string]: unknown
  readonly [key: symbol]: unknown
}

interface MatchOptions {
  readonly exactObjectKeys: boolean
}

const NORMAL_OPTIONS: MatchOptions = { exactObjectKeys: false }
const EXACT_OPTIONS: MatchOptions = { exactObjectKeys: true }

function isObject(value: unknown): value is IndexableObject {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isPlainRecord(value: unknown): value is IndexableObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isPattern(value: unknown): value is BuiltInPattern {
  return isObject(value) && PATTERN_TOKEN in value
}

function ownPatternKeys(pattern: object): PropertyKey[] {
  return Reflect.ownKeys(pattern)
}

function readProperty(value: IndexableObject, key: PropertyKey): unknown {
  return value[key]
}

function primitiveMatches(value: unknown, primitive: string): boolean {
  if (primitive === 'string') return typeof value === 'string'
  if (primitive === 'number') return typeof value === 'number'
  if (primitive === 'boolean') return typeof value === 'boolean'
  if (primitive === 'bigint') return typeof value === 'bigint'
  if (primitive === 'symbol') return typeof value === 'symbol'
  if (primitive === 'null') return value === null
  if (primitive === 'undefined') return value === undefined
  return false
}

function cloneSelection(selection: SelectionState): SelectionState {
  if (selection.mode === 'named') {
    return { mode: 'named', anonymous: undefined, named: { ...selection.named } }
  }
  if (selection.mode === 'anonymous') {
    return { mode: 'anonymous', anonymous: selection.anonymous, named: undefined }
  }
  return { mode: 'none', anonymous: undefined, named: undefined }
}

function commitSelection(target: SelectionState, source: SelectionState): void {
  target.mode = source.mode
  if (source.mode === 'anonymous') {
    target.anonymous = source.anonymous
    target.named = undefined
    return
  }
  if (source.mode === 'named') {
    target.named = source.named
    target.anonymous = undefined
    return
  }
  target.anonymous = undefined
  target.named = undefined
}

function captureAnonymous(selection: SelectionState, value: unknown): void {
  if (selection.mode === 'named') {
    throw new TypeError('P.select() cannot be mixed with named P.select(name) in the same pattern.')
  }
  if (selection.mode === 'anonymous') {
    throw new TypeError('Only one anonymous P.select() is allowed in a single pattern.')
  }
  selection.mode = 'anonymous'
  selection.anonymous = value
}

function captureNamed(selection: SelectionState, name: PropertyKey, value: unknown): void {
  if (selection.mode === 'anonymous') {
    throw new TypeError('Named P.select(name) cannot be mixed with anonymous P.select() in the same pattern.')
  }
  selection.mode = 'named'
  selection.named ??= {}
  if (Object.prototype.hasOwnProperty.call(selection.named, name)) {
    throw new TypeError(`Duplicate named P.select(${String(name)}) in a single successful match.`)
  }
  selection.named[name] = value
}

function assertNoSelect(pattern: unknown, message: string): void {
  if (containsSelect(pattern)) throw new TypeError(message)
}

function assertNoArraySelection(item: unknown, label: 'array' | 'nonEmptyArray'): void {
  assertNoSelect(item, `P.select(...) cannot be used inside P.${label}(...).`)
}

function assertNoRecordSelection(keyPattern: unknown, valuePattern: unknown, label: 'record' | 'nonEmptyRecord'): void {
  if (containsSelect(keyPattern) || containsSelect(valuePattern)) {
    throw new TypeError(`P.select(...) cannot be used inside P.${label}(...).`)
  }
}

function containsSelectInBuiltIn(pattern: BuiltInPattern): boolean {
  return (
    containsSelectInSelectorOrUnion(pattern) ||
    containsSelectInUnaryPattern(pattern) ||
    containsSelectInCollectionPattern(pattern) ||
    containsSelectInRecordPattern(pattern)
  )
}

function containsSelectInSelectorOrUnion(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'select') return true
  return kind === 'union' && pattern.patterns.some(containsSelect)
}

function containsSelectInUnaryPattern(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  return (kind === 'exclude' || kind === 'optional' || kind === 'exact') && containsSelect(pattern.pattern)
}

function containsSelectInCollectionPattern(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'array' || kind === 'non-empty-array' || kind === 'rest') return containsSelect(pattern.item)
  return kind === 'tuple' && pattern.items.some(containsSelect)
}

function containsSelectInRecordPattern(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  return (
    (kind === 'record' || kind === 'non-empty-record') && (containsSelect(pattern.key) || containsSelect(pattern.value))
  )
}

function containsSelect(pattern: unknown): boolean {
  if (isPattern(pattern)) return containsSelectInBuiltIn(pattern)
  if (Array.isArray(pattern)) return pattern.some(containsSelect)
  if (!isObject(pattern)) return false
  return ownPatternKeys(pattern).some((key) => containsSelect(readProperty(pattern, key)))
}

function captureUndefinedFromBuiltIn(pattern: BuiltInPattern, selection: SelectionState): void {
  if (captureUndefinedFromSelection(pattern, selection)) return
  if (captureUndefinedFromUnion(pattern, selection)) return
  if (captureUndefinedFromUnary(pattern, selection)) return
  if (captureUndefinedFromCollection(pattern, selection)) return
  validateRepeatedSelectionContainers(pattern)
}

function captureUndefinedFromSelection(pattern: BuiltInPattern, selection: SelectionState): boolean {
  if (pattern[PATTERN_TOKEN] !== 'select') return false
  captureUndefinedSelections(pattern.pattern, selection)
  if (pattern.name === undefined) captureAnonymous(selection, undefined)
  else captureNamed(selection, pattern.name, undefined)
  return true
}

function captureUndefinedFromUnion(pattern: BuiltInPattern, selection: SelectionState): boolean {
  if (pattern[PATTERN_TOKEN] !== 'union') return false
  for (const option of pattern.patterns) captureUndefinedSelections(option, selection)
  return true
}

function captureUndefinedFromUnary(pattern: BuiltInPattern, selection: SelectionState): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'exclude') {
    assertNoSelect(pattern.pattern, 'P.exclude(pattern) cannot contain P.select(...).')
    return true
  }
  if (kind !== 'optional' && kind !== 'exact') return false
  captureUndefinedSelections(pattern.pattern, selection)
  return true
}

function captureUndefinedFromCollection(pattern: BuiltInPattern, selection: SelectionState): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'rest') {
    captureUndefinedSelections(pattern.item, selection)
    return true
  }
  if (kind !== 'tuple') return false
  for (const item of pattern.items) captureUndefinedSelections(item, selection)
  return true
}

function validateRepeatedSelectionContainers(pattern: BuiltInPattern): void {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'array') assertNoArraySelection(pattern.item, 'array')
  if (kind === 'non-empty-array') assertNoArraySelection(pattern.item, 'nonEmptyArray')
  if (kind === 'record') assertNoRecordSelection(pattern.key, pattern.value, 'record')
  if (kind === 'non-empty-record') assertNoRecordSelection(pattern.key, pattern.value, 'nonEmptyRecord')
}

function captureUndefinedSelections(pattern: unknown, selection: SelectionState): void {
  if (isPattern(pattern)) {
    captureUndefinedFromBuiltIn(pattern, selection)
    return
  }

  if (Array.isArray(pattern)) {
    for (const item of pattern) captureUndefinedSelections(item, selection)
    return
  }

  if (isObject(pattern)) {
    for (const key of ownPatternKeys(pattern)) captureUndefinedSelections(readProperty(pattern, key), selection)
  }
}

function restTupleMatches(
  value: readonly unknown[],
  startIndex: number,
  restPattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (value.length < startIndex) return false
  for (let valueIndex = startIndex; valueIndex < value.length; valueIndex += 1) {
    if (!matchesPattern(value[valueIndex], restPattern, selection, options)) return false
  }
  return true
}

function matchTuple(
  value: unknown,
  items: readonly unknown[],
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!Array.isArray(value)) return false

  for (let index = 0; index < items.length; index += 1) {
    const itemPattern = items[index]
    if (isPattern(itemPattern) && itemPattern[PATTERN_TOKEN] === 'rest') {
      if (index !== items.length - 1) {
        throw new TypeError('P.rest(pattern) is only supported as the final tuple pattern item.')
      }
      return restTupleMatches(value, index, itemPattern.item, selection, options)
    }

    if (!matchesPattern(value[index], itemPattern, selection, options)) return false
  }

  return value.length === items.length
}

function optionalPropertyMatches(
  value: IndexableObject,
  key: PropertyKey,
  propertyPattern: OptionalPattern<unknown>,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!(key in value)) {
    if (selection) captureUndefinedSelections(propertyPattern.pattern, selection)
    return true
  }

  const propertyValue = readProperty(value, key)
  if (propertyValue === undefined) {
    if (selection) captureUndefinedSelections(propertyPattern.pattern, selection)
    return true
  }

  return matchesPattern(propertyValue, propertyPattern.pattern, selection, options)
}

function exactObjectKeysMatch(value: IndexableObject, keys: readonly PropertyKey[]): boolean {
  const allowedKeys = new Set(keys)
  for (const valueKey of ownEnumerableKeys(value)) {
    if (!allowedKeys.has(valueKey)) return false
  }
  return true
}

function objectPatternMatches(
  value: unknown,
  pattern: IndexableObject,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!isObject(value)) return false

  const keys = ownPatternKeys(pattern)
  for (const key of keys) {
    const propertyPattern = readProperty(pattern, key)
    if (isPattern(propertyPattern) && propertyPattern[PATTERN_TOKEN] === 'optional') {
      if (!optionalPropertyMatches(value, key, propertyPattern, selection, options)) return false
      continue
    }

    if (!(key in value)) return false
    if (!matchesPattern(readProperty(value, key), propertyPattern, selection, options)) return false
  }

  return !options.exactObjectKeys || exactObjectKeysMatch(value, keys)
}

function canonicalNumberKey(key: string): number | null {
  if (key === '-0') return -0
  const value = Number(key)
  if (!Number.isFinite(value)) return null
  return String(value) === key ? value : null
}

function keyMatches(key: PropertyKey, pattern: unknown, selection: SelectionState | undefined): boolean {
  if (matchesPattern(key, pattern, selection, NORMAL_OPTIONS)) return true
  if (typeof key !== 'string') return false

  const numericKey = canonicalNumberKey(key)
  if (numericKey === null) return false
  return matchesPattern(numericKey, pattern, selection, NORMAL_OPTIONS)
}

function recordMatches(
  value: unknown,
  keyPattern: unknown,
  valuePattern: unknown,
  requireNonEmpty: boolean,
  selection: SelectionState | undefined,
): boolean {
  if (!isPlainRecord(value)) return false

  const keys = ownEnumerableKeys(value)
  if (requireNonEmpty && keys.length === 0) return false

  for (const key of keys) {
    if (!keyMatches(key, keyPattern, selection)) return false
    if (!matchesPattern(readProperty(value, key), valuePattern, selection, NORMAL_OPTIONS)) return false
  }

  return true
}

function matchPrimitivePattern(value: unknown, pattern: BuiltInPattern): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'wildcard') return true
  if (kind === 'primitive') return primitiveMatches(value, pattern.primitive)
  if (kind === 'nan') return Number.isNaN(value)
  if (kind === 'finite') return typeof value === 'number' && Number.isFinite(value)
  if (kind === 'integer') return Number.isInteger(value)
  return undefined
}

function matchUnionPattern(
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  if (pattern[PATTERN_TOKEN] !== 'union') return undefined

  for (const option of pattern.patterns) {
    if (!selection) {
      if (matchesPattern(value, option, undefined, options)) return true
      continue
    }

    const branchSelection = cloneSelection(selection)
    if (matchesPattern(value, option, branchSelection, options)) {
      commitSelection(selection, branchSelection)
      return true
    }
  }
  return false
}

function matchUnaryPattern(
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'exclude') {
    assertNoSelect(pattern.pattern, 'P.exclude(pattern) cannot contain P.select(...).')
    return !matchesPattern(value, pattern.pattern, undefined, options)
  }
  if (kind === 'optional') return matchOptionalPattern(value, pattern, selection, options)
  if (kind === 'exact') return matchesPattern(value, pattern.pattern, selection, EXACT_OPTIONS)
  return undefined
}

function matchOptionalPattern(
  value: unknown,
  pattern: OptionalPattern<unknown>,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (value !== undefined) return matchesPattern(value, pattern.pattern, selection, options)
  if (selection) captureUndefinedSelections(pattern.pattern, selection)
  return true
}

function matchArrayItems(
  value: unknown,
  itemPattern: unknown,
  requireNonEmpty: boolean,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!Array.isArray(value) || (requireNonEmpty && value.length === 0)) return false
  for (let index = 0; index < value.length; index += 1) {
    if (!matchesPattern(value[index], itemPattern, selection, options)) return false
  }
  return true
}

function matchCollectionPattern(
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'array') {
    assertNoArraySelection(pattern.item, 'array')
    return matchArrayItems(value, pattern.item, false, selection, options)
  }
  if (kind === 'non-empty-array') {
    assertNoArraySelection(pattern.item, 'nonEmptyArray')
    return matchArrayItems(value, pattern.item, true, selection, options)
  }
  if (kind === 'tuple') return matchTuple(value, pattern.items, selection, options)
  if (kind === 'rest') throw new TypeError('P.rest(pattern) can only be used inside tuple patterns.')
  return undefined
}

function matchSelectionPattern(
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'when') return pattern.predicate(value)
  if (kind === 'instance-of') return value instanceof pattern.constructor
  if (kind !== 'select') return undefined

  if (!matchesPattern(value, pattern.pattern, selection, options)) return false
  if (!selection) return true
  if (pattern.name === undefined) captureAnonymous(selection, value)
  else captureNamed(selection, pattern.name, value)
  return true
}

function matchRecordPattern(
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'record') {
    assertNoRecordSelection(pattern.key, pattern.value, 'record')
    return recordMatches(value, pattern.key, pattern.value, false, selection)
  }
  if (kind !== 'non-empty-record') return undefined
  assertNoRecordSelection(pattern.key, pattern.value, 'nonEmptyRecord')
  return recordMatches(value, pattern.key, pattern.value, true, selection)
}

function matchBuiltInPattern(
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  const primitive = matchPrimitivePattern(value, pattern)
  if (primitive !== undefined) return primitive

  const union = matchUnionPattern(value, pattern, selection, options)
  if (union !== undefined) return union

  const unary = matchUnaryPattern(value, pattern, selection, options)
  if (unary !== undefined) return unary

  const collection = matchCollectionPattern(value, pattern, selection, options)
  if (collection !== undefined) return collection

  const selected = matchSelectionPattern(value, pattern, selection, options)
  if (selected !== undefined) return selected

  return matchRecordPattern(value, pattern, selection) ?? false
}

function matchesPattern(
  value: unknown,
  pattern: unknown,
  selection: SelectionState | undefined = undefined,
  options: MatchOptions = NORMAL_OPTIONS,
): boolean {
  if (isPattern(pattern)) return matchBuiltInPattern(value, pattern, selection, options)
  if (Array.isArray(pattern)) return matchTuple(value, pattern, selection, options)
  if (isObject(pattern)) return objectPatternMatches(value, pattern, selection, options)
  return Object.is(value, pattern)
}

function needsSelectionValidation(pattern: unknown): boolean {
  return containsSelect(pattern)
}

export function matchesPatternWithSelectionValidation(value: unknown, pattern: unknown): boolean {
  if (!needsSelectionValidation(pattern)) return matchesPattern(value, pattern)
  const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined }
  return matchesPattern(value, pattern, selection)
}

interface MatchAttempt {
  readonly matched: boolean
  readonly payload: unknown
}

export function attemptMatch(value: unknown, patterns: readonly unknown[]): MatchAttempt {
  for (const pattern of patterns) {
    const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined }
    if (!matchesPattern(value, pattern, selection)) continue

    if (selection.mode === 'anonymous') return { matched: true, payload: selection.anonymous }
    if (selection.mode === 'named') return { matched: true, payload: selection.named ?? {} }
    return { matched: true, payload: value }
  }

  return { matched: false, payload: undefined }
}
