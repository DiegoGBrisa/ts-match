import { ownEnumerableKeys } from './keys.js'
import { PATTERN_TOKEN } from './tokens.js'
import type { BuiltInPattern, OptionalPattern } from './types.js'

type SelectionMode = 'none' | 'anonymous' | 'named'

/**
 * Mutable capture state used while a single pattern attempt is evaluated.
 *
 * The runtime supports either one anonymous capture or one object of named
 * captures per successful pattern. This state records the active capture mode and
 * payload while nested pattern helpers are traversed.
 *
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
interface SelectionState {
  mode: SelectionMode
  anonymous: unknown
  named: Record<PropertyKey, unknown> | undefined
}

/**
 * Object shape that can be read by string and symbol keys during pattern checks.
 *
 * This keeps runtime property access explicit after unknown values have been
 * narrowed to non-null objects or functions.
 *
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
interface IndexableObject {
  readonly [key: string]: unknown
  readonly [key: symbol]: unknown
}

/**
 * Runtime options that tune structural pattern semantics for a nested match.
 *
 * `exactObjectKeys` is enabled only through `P.exact(...)`; ordinary object
 * patterns remain partial and allow additional enumerable keys.
 *
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
interface MatchOptions {
  readonly exactObjectKeys: boolean
}

const NORMAL_OPTIONS: MatchOptions = { exactObjectKeys: false }
const EXACT_OPTIONS: MatchOptions = { exactObjectKeys: true }

/**
 * Narrows unknown values to non-null objects or functions.
 *
 * @param value - Candidate value from pattern matching.
 * @returns `true` when property access and `in` checks are valid.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
function isObject(value: unknown): value is IndexableObject {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

/**
 * Narrows unknown values to plain record-like objects.
 *
 * Record patterns intentionally reject arrays and class instances. Objects with
 * `Object.prototype` or `null` prototypes are accepted.
 *
 * @param value - Candidate value for `P.record(...)` or `P.nonEmptyRecord(...)`.
 * @returns `true` when `value` has plain record semantics.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
function isPlainRecord(value: unknown): value is IndexableObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Detects internal pattern helper objects created by the `P` namespace.
 *
 * @param value - Candidate pattern or literal value.
 * @returns `true` when `value` carries the internal pattern token.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
function isPattern(value: unknown): value is BuiltInPattern {
  return isObject(value) && PATTERN_TOKEN in value
}

/**
 * Reads all own keys from an object pattern, including non-enumerable and symbol keys.
 *
 * Object pattern definitions are developer-authored matcher structures, so all
 * own keys participate in the pattern even though runtime record values use only
 * enumerable keys.
 *
 * @param pattern - Object pattern to inspect.
 * @returns Own string and symbol keys from the pattern.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
function ownPatternKeys(pattern: object): PropertyKey[] {
  return Reflect.ownKeys(pattern)
}

/**
 * Reads one property from an already narrowed object.
 *
 * @param value - Object or function value being inspected.
 * @param key - Property key to read.
 * @returns Property value at `key`.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
function readProperty(value: IndexableObject, key: PropertyKey): unknown {
  return value[key]
}

/**
 * Checks a value against a primitive pattern kind.
 *
 * Primitive helper objects map to JavaScript `typeof` checks, plus exact checks
 * for `null` and `undefined`.
 *
 * @param value - Candidate runtime value.
 * @param primitive - Primitive helper name stored in the pattern.
 * @returns `true` when the value satisfies the primitive helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
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

/**
 * Copies capture state before trying an alternative branch.
 *
 * Union patterns need speculative selection so a failed alternative does not leak
 * partial captures into the next alternative.
 *
 * @param selection - Current capture state.
 * @returns Independent capture state with the same payload.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
function cloneSelection(selection: SelectionState): SelectionState {
  if (selection.mode === 'named') {
    return { mode: 'named', anonymous: undefined, named: { ...selection.named } }
  }
  if (selection.mode === 'anonymous') {
    return { mode: 'anonymous', anonymous: selection.anonymous, named: undefined }
  }
  return { mode: 'none', anonymous: undefined, named: undefined }
}

/**
 * Commits captures from a successful speculative branch.
 *
 * @param target - Capture state owned by the outer pattern attempt.
 * @param source - Capture state from the successful branch.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
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

/**
 * Records one anonymous `P.select()` payload.
 *
 * Anonymous selections cannot be mixed with named selections, and only one
 * anonymous selection may exist in a successful pattern.
 *
 * @param selection - Mutable capture state for this pattern attempt.
 * @param value - Runtime value to pass directly to the handler.
 * @throws {TypeError} When selection modes are mixed or duplicated.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
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

/**
 * Records one named `P.select(name)` payload.
 *
 * Named selections build the handler payload object. Duplicate names are rejected
 * inside a single successful match to avoid overwriting captured values.
 *
 * @param selection - Mutable capture state for this pattern attempt.
 * @param name - Capture key used in the handler payload object.
 * @param value - Runtime value to store under `name`.
 * @throws {TypeError} When selection modes are mixed or names are duplicated.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
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

/**
 * Rejects selection helpers in pattern positions where capture payloads are ambiguous.
 *
 * @param pattern - Pattern subtree to inspect.
 * @param message - Error message to use when a selection is found.
 * @throws {TypeError} When `pattern` contains `P.select(...)`.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
function assertNoSelect(pattern: unknown, message: string): void {
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
function assertNoArraySelection(item: unknown, label: 'array' | 'nonEmptyArray'): void {
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
function assertNoRecordSelection(keyPattern: unknown, valuePattern: unknown, label: 'record' | 'nonEmptyRecord'): void {
  if (containsSelect(keyPattern) || containsSelect(valuePattern)) {
    throw new TypeError(`P.select(...) cannot be used inside P.${label}(...).`)
  }
}

/**
 * Checks whether a built-in helper pattern contains any selection helper.
 *
 * @param pattern - Built-in `P.*` pattern to inspect.
 * @returns `true` when a nested `P.select(...)` exists.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
function containsSelectInBuiltIn(pattern: BuiltInPattern): boolean {
  return (
    containsSelectInSelectorOrUnion(pattern) ||
    containsSelectInUnaryPattern(pattern) ||
    containsSelectInCollectionPattern(pattern) ||
    containsSelectInRecordPattern(pattern)
  )
}

/**
 * Checks selector and union patterns for nested selections.
 *
 * @param pattern - Built-in pattern whose token has already been validated.
 * @returns `true` when the pattern itself or a union option contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
function containsSelectInSelectorOrUnion(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'select') return true
  return kind === 'union' && pattern.patterns.some(containsSelect)
}

/**
 * Checks unary wrapper patterns for nested selections.
 *
 * @param pattern - Built-in pattern whose token has already been validated.
 * @returns `true` when `P.exclude`, `P.optional`, or `P.exact` wraps a selection.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
function containsSelectInUnaryPattern(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  return (kind === 'exclude' || kind === 'optional' || kind === 'exact') && containsSelect(pattern.pattern)
}

/**
 * Checks array, tuple, and rest patterns for nested selections.
 *
 * @param pattern - Built-in pattern whose token has already been validated.
 * @returns `true` when a collection item pattern contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
function containsSelectInCollectionPattern(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'array' || kind === 'non-empty-array' || kind === 'rest') return containsSelect(pattern.item)
  return kind === 'tuple' && pattern.items.some(containsSelect)
}

/**
 * Checks record key and value patterns for nested selections.
 *
 * @param pattern - Built-in pattern whose token has already been validated.
 * @returns `true` when a record key or value pattern contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
function containsSelectInRecordPattern(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  return (
    (kind === 'record' || kind === 'non-empty-record') && (containsSelect(pattern.key) || containsSelect(pattern.value))
  )
}

/**
 * Recursively detects `P.select(...)` inside any public pattern structure.
 *
 * @param pattern - Literal, object, tuple, or built-in pattern to inspect.
 * @returns `true` when any nested selection helper exists.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
function containsSelect(pattern: unknown): boolean {
  if (isPattern(pattern)) return containsSelectInBuiltIn(pattern)
  if (Array.isArray(pattern)) return pattern.some(containsSelect)
  if (!isObject(pattern)) return false
  return ownPatternKeys(pattern).some((key) => containsSelect(readProperty(pattern, key)))
}

/**
 * Captures `undefined` payloads for selections inside optional missing branches.
 *
 * @param pattern - Built-in pattern that is being treated as absent or undefined.
 * @param selection - Mutable capture state to update.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedFromBuiltIn(pattern: BuiltInPattern, selection: SelectionState): void {
  if (captureUndefinedFromSelection(pattern, selection)) return
  if (captureUndefinedFromUnion(pattern, selection)) return
  if (captureUndefinedFromUnary(pattern, selection)) return
  if (captureUndefinedFromCollection(pattern, selection)) return
  validateRepeatedSelectionContainers(pattern)
}

/**
 * Captures `undefined` for a selection pattern in an absent optional property.
 *
 * @param pattern - Built-in pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a selection and was handled.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
function captureUndefinedFromSelection(pattern: BuiltInPattern, selection: SelectionState): boolean {
  if (pattern[PATTERN_TOKEN] !== 'select') return false
  captureUndefinedSelections(pattern.pattern, selection)
  if (pattern.name === undefined) captureAnonymous(selection, undefined)
  else captureNamed(selection, pattern.name, undefined)
  return true
}

/**
 * Captures `undefined` through all options of an absent optional union pattern.
 *
 * @param pattern - Built-in pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a union and was handled.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedFromUnion(pattern: BuiltInPattern, selection: SelectionState): boolean {
  if (pattern[PATTERN_TOKEN] !== 'union') return false
  for (const option of pattern.patterns) captureUndefinedSelections(option, selection)
  return true
}

/**
 * Captures `undefined` through unary wrappers in an absent optional property.
 *
 * @param pattern - Built-in pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a supported unary wrapper and was handled.
 * @throws {TypeError} When an excluded pattern contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
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

/**
 * Captures `undefined` through tuple and rest patterns for absent optional properties.
 *
 * @param pattern - Built-in collection pattern being inspected.
 * @param selection - Mutable capture state to update.
 * @returns `true` when `pattern` was a tuple or rest pattern and was handled.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
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

/**
 * Enforces selection restrictions for repeated container helpers.
 *
 * @param pattern - Built-in pattern to validate.
 * @throws {TypeError} When repeated array or record patterns contain selections.
 * @see https://github.com/DiegoGBrisa/ts-match#invalid-pattern-helper-placement
 */
function validateRepeatedSelectionContainers(pattern: BuiltInPattern): void {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'array') assertNoArraySelection(pattern.item, 'array')
  if (kind === 'non-empty-array') assertNoArraySelection(pattern.item, 'nonEmptyArray')
  if (kind === 'record') assertNoRecordSelection(pattern.key, pattern.value, 'record')
  if (kind === 'non-empty-record') assertNoRecordSelection(pattern.key, pattern.value, 'nonEmptyRecord')
}

/**
 * Recursively captures `undefined` for selections under an absent optional property.
 *
 * @param pattern - Pattern subtree associated with the absent property.
 * @param selection - Mutable capture state to update.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
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

/**
 * Checks the suffix of an array against a tuple rest pattern.
 *
 * @param value - Runtime array being matched.
 * @param startIndex - First array index covered by the rest pattern.
 * @param restPattern - Pattern required for every remaining item.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when every remaining item matches.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
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

/**
 * Matches an array value against positional tuple patterns.
 *
 * @param value - Candidate runtime value.
 * @param items - Ordered tuple item patterns.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the candidate satisfies tuple length and item rules.
 * @throws {TypeError} When `P.rest(...)` is not the final tuple item.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
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

/**
 * Matches an optional object property pattern.
 *
 * Missing properties and explicit `undefined` values match and propagate
 * `undefined` into nested selections. Present values must satisfy the inner pattern.
 *
 * @param value - Object being matched.
 * @param key - Property key for the optional pattern.
 * @param propertyPattern - `P.optional(...)` helper stored in the object pattern.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the optional property semantics are satisfied.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
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

/**
 * Checks that a runtime object has no enumerable keys beyond the pattern keys.
 *
 * @param value - Runtime object already known to satisfy required pattern keys.
 * @param keys - Keys allowed by the exact object pattern.
 * @returns `true` when no additional enumerable keys are present.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function exactObjectKeysMatch(value: IndexableObject, keys: readonly PropertyKey[]): boolean {
  const allowedKeys = new Set(keys)
  for (const valueKey of ownEnumerableKeys(value)) {
    if (!allowedKeys.has(valueKey)) return false
  }
  return true
}

/**
 * Matches a runtime value against an object pattern.
 *
 * Object patterns are partial by default: every pattern key must match, but extra
 * runtime keys are allowed unless `P.exact(...)` enabled exact-key options.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Object pattern whose keys and nested patterns must match.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the object pattern matches.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
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

/**
 * Converts a string property key to a canonical numeric key when possible.
 *
 * JavaScript stores object keys as strings, so record key patterns allow string
 * keys such as `"1"` to match numeric key patterns such as `1`.
 *
 * @param key - String property key from a record value.
 * @returns Canonical number for numeric string keys, otherwise `null`.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
function canonicalNumberKey(key: string): number | null {
  if (key === '-0') return -0
  const value = Number(key)
  if (!Number.isFinite(value)) return null
  return String(value) === key ? value : null
}

/**
 * Checks a record key against a key pattern.
 *
 * String keys are tested directly first, then as canonical numbers when possible
 * so record patterns align with JavaScript object-key coercion.
 *
 * @param key - Runtime enumerable record key.
 * @param pattern - Pattern required for the key.
 * @param selection - Optional capture state for this match attempt.
 * @returns `true` when the key satisfies the key pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
function keyMatches(key: PropertyKey, pattern: unknown, selection: SelectionState | undefined): boolean {
  if (matchesPattern(key, pattern, selection, NORMAL_OPTIONS)) return true
  if (typeof key !== 'string') return false

  const numericKey = canonicalNumberKey(key)
  if (numericKey === null) return false
  return matchesPattern(numericKey, pattern, selection, NORMAL_OPTIONS)
}

/**
 * Matches a plain record against key and value patterns.
 *
 * @param value - Candidate runtime value.
 * @param keyPattern - Pattern required for every enumerable key.
 * @param valuePattern - Pattern required for every enumerable value.
 * @param requireNonEmpty - Whether empty records should be rejected.
 * @param selection - Optional capture state for this match attempt.
 * @returns `true` when all record entries satisfy their patterns.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
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

/**
 * Evaluates primitive-like built-in helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @returns Match result, or `undefined` when the helper is not primitive-like.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
function matchPrimitivePattern(value: unknown, pattern: BuiltInPattern): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'wildcard') return true
  if (kind === 'primitive') return primitiveMatches(value, pattern.primitive)
  if (kind === 'nan') return Number.isNaN(value)
  if (kind === 'finite') return typeof value === 'number' && Number.isFinite(value)
  if (kind === 'integer') return Number.isInteger(value)
  return undefined
}

/**
 * Evaluates a `P.union(...)` helper.
 *
 * Union alternatives are tested left to right. Selection state is cloned for each
 * branch and committed only from the successful alternative.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not a union.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
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

/**
 * Evaluates unary wrapper helpers such as `P.exclude`, `P.optional`, and `P.exact`.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not unary.
 * @throws {TypeError} When `P.exclude(...)` contains a selection.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
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

/**
 * Evaluates a `P.optional(...)` helper against a direct value.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Optional pattern helper.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the value is `undefined` or matches the inner pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
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

/**
 * Evaluates repeated array helpers against every array item.
 *
 * @param value - Candidate runtime value.
 * @param itemPattern - Pattern required for each array item.
 * @param requireNonEmpty - Whether an empty array should be rejected.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the value is an array satisfying all item rules.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
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

/**
 * Evaluates built-in array, non-empty-array, tuple, and rest helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not a collection.
 * @throws {TypeError} When `P.rest(...)` is used outside a tuple.
 * @see https://github.com/DiegoGBrisa/ts-match#tuple-and-array-patterns
 */
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

/**
 * Evaluates predicate, instance, and selection helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not selection-like.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
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

/**
 * Evaluates record and non-empty-record helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @returns Match result, or `undefined` when the helper is not a record helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
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

/**
 * Dispatches a built-in pattern helper to the specialized runtime matcher.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the built-in helper matches the value.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
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

/**
 * Recursively matches a value against any public pattern structure.
 *
 * This is the central runtime matcher for literals, arrays, object patterns, and
 * built-in `P.*` helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Pattern structure to evaluate.
 * @param selection - Optional capture state for this match attempt.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when the pattern matches.
 * @see https://github.com/DiegoGBrisa/ts-match#core-concepts
 */
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
function needsSelectionValidation(pattern: unknown): boolean {
  return containsSelect(pattern)
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
  const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined }
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
    const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined }
    if (!matchesPattern(value, pattern, selection)) continue

    if (selection.mode === 'anonymous') return { matched: true, payload: selection.anonymous }
    if (selection.mode === 'named') return { matched: true, payload: selection.named ?? {} }
    return { matched: true, payload: value }
  }

  return { matched: false, payload: undefined }
}
