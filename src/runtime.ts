import { ownEnumerableKeys } from './keys.js'
import { PATTERN_TOKEN } from './tokens.js'
import type { BuiltInPattern, MapEntryPattern, OptionalPattern, TemporalPatternKind } from './types.js'

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
  collected: Record<PropertyKey, unknown[]> | undefined
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
 * `exact` is enabled only through `P.exact(...)`; ordinary object and
 * required-entry collection patterns remain partial and allow additional keys or
 * collection entries.
 *
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
interface MatchOptions {
  readonly exact: boolean
  readonly allowCollect: boolean
}

type TemporalConstructor = abstract new (...args: never[]) => object

const NORMAL_OPTIONS: MatchOptions = { exact: false, allowCollect: false }
const EXACT_OPTIONS: MatchOptions = { exact: true, allowCollect: false }
const COLLECT_OPTIONS: MatchOptions = { exact: false, allowCollect: true }
const EXACT_COLLECT_OPTIONS: MatchOptions = { exact: true, allowCollect: true }

function exactOptions(options: MatchOptions): MatchOptions {
  return options.allowCollect ? EXACT_COLLECT_OPTIONS : EXACT_OPTIONS
}

function repeatedOptions(options: MatchOptions): MatchOptions {
  return options.exact ? EXACT_COLLECT_OPTIONS : COLLECT_OPTIONS
}

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
 * Matches a string with a regular expression without leaking `lastIndex` changes.
 *
 * @param value - Candidate value.
 * @param regex - Regular expression supplied to `P.regex(...)`.
 * @returns `true` when the candidate is a string accepted by `regex`.
 */
function regexMatches(value: unknown, regex: RegExp): boolean {
  if (typeof value !== 'string') return false
  const lastIndexDescriptor = Object.getOwnPropertyDescriptor(regex, 'lastIndex')
  if (lastIndexDescriptor?.writable !== true) return new RegExp(regex.source, regex.flags).test(value)

  const originalLastIndex = regex.lastIndex
  regex.lastIndex = 0
  try {
    return regex.test(value)
  } finally {
    regex.lastIndex = originalLastIndex
  }
}

const TEMPORAL_KINDS: readonly Exclude<TemporalPatternKind, 'any'>[] = [
  'Instant',
  'PlainDate',
  'PlainTime',
  'PlainDateTime',
  'ZonedDateTime',
  'Duration',
  'PlainYearMonth',
  'PlainMonthDay',
]

function isTemporalConstructor(value: unknown): value is TemporalConstructor {
  return typeof value === 'function'
}

/**
 * Reads a Temporal constructor from `globalThis.Temporal` when available.
 *
 * @param temporalKind - Temporal constructor name to read.
 * @returns Constructor function, or `undefined` when Temporal is unavailable.
 */
function getTemporalConstructor(temporalKind: Exclude<TemporalPatternKind, 'any'>): TemporalConstructor | undefined {
  const temporal = Reflect.get(globalThis, 'Temporal')
  if (!isObject(temporal)) return undefined
  const constructor = readProperty(temporal, temporalKind)
  return isTemporalConstructor(constructor) ? constructor : undefined
}

function temporalInstanceOf(value: unknown, constructor: TemporalConstructor): boolean {
  try {
    return value instanceof constructor
  } catch {
    return false
  }
}

/**
 * Matches Temporal values by constructor identity without requiring Temporal at import time.
 *
 * @param value - Candidate value.
 * @param temporalKind - Specific Temporal kind, or `any` for all supported kinds.
 * @returns `true` when the candidate is an instance of the requested Temporal constructor.
 */
function temporalMatches(value: unknown, temporalKind: TemporalPatternKind): boolean {
  if (temporalKind === 'any') {
    return TEMPORAL_KINDS.some((kind) => temporalMatches(value, kind))
  }

  const constructor = getTemporalConstructor(temporalKind)
  return constructor === undefined ? false : temporalInstanceOf(value, constructor)
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
    return {
      mode: 'named',
      anonymous: undefined,
      named: cloneNamed(selection.named),
      collected: cloneCollected(selection.collected),
    }
  }
  if (selection.mode === 'anonymous') {
    return { mode: 'anonymous', anonymous: selection.anonymous, named: undefined, collected: undefined }
  }
  return { mode: 'none', anonymous: undefined, named: undefined, collected: undefined }
}

function cloneNamed(named: Record<PropertyKey, unknown> | undefined): Record<PropertyKey, unknown> | undefined {
  if (!named) return undefined
  return cloneSelectionRecord(named)
}

function cloneCollected(
  collected: Record<PropertyKey, unknown[]> | undefined,
): Record<PropertyKey, unknown[]> | undefined {
  if (!collected) return undefined
  const cloned = createSelectionRecord<unknown[]>()
  for (const key of Reflect.ownKeys(collected)) {
    const values = collected[key]
    if (values) defineSelectionProperty(cloned, key, [...values])
  }
  return cloned
}

function createSelectionRecord<T>(): Record<PropertyKey, T> {
  return Object.create(null)
}

function cloneSelectionRecord<T>(record: Record<PropertyKey, T>): Record<PropertyKey, T> {
  const cloned = createSelectionRecord<T>()
  for (const key of Reflect.ownKeys(record)) defineSelectionProperty(cloned, key, record[key])
  return cloned
}

function defineSelectionProperty<T>(target: Record<PropertyKey, T>, key: PropertyKey, value: T): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  })
}

function copySelectionProperties<T>(target: Record<PropertyKey, unknown>, source: Record<PropertyKey, T> | undefined) {
  if (!source) return
  for (const key of Reflect.ownKeys(source)) defineSelectionProperty(target, key, source[key])
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
    target.collected = undefined
    return
  }
  if (source.mode === 'named') {
    target.named = source.named
    target.collected = source.collected
    target.anonymous = undefined
    return
  }
  target.anonymous = undefined
  target.named = undefined
  target.collected = undefined
}

function selectionHasOwn(record: Record<PropertyKey, unknown> | undefined, name: PropertyKey): boolean {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, name)
}

function selectedPayload(selection: SelectionState): Record<PropertyKey, unknown> {
  const payload: Record<PropertyKey, unknown> = {}
  copySelectionProperties(payload, selection.named)
  copySelectionProperties(payload, selection.collected)
  return payload
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
  selection.named ??= createSelectionRecord()
  if (selectionHasOwn(selection.named, name)) {
    throw new TypeError(`Duplicate named P.select(${String(name)}) in a single successful match.`)
  }
  if (selectionHasOwn(selection.collected, name)) {
    throw new TypeError(`P.select(${String(name)}) cannot use the same name as P.collect(...).`)
  }
  defineSelectionProperty(selection.named, name, value)
}

function ensureCollected(selection: SelectionState, name: PropertyKey): unknown[] {
  if (selection.mode === 'anonymous') {
    throw new TypeError('P.collect(name, pattern) cannot be mixed with anonymous P.select() in the same pattern.')
  }
  if (selectionHasOwn(selection.named, name)) {
    throw new TypeError(`P.collect(${String(name)}, pattern) cannot use the same name as P.select(...).`)
  }
  selection.mode = 'named'
  selection.collected ??= createSelectionRecord()
  if (!selectionHasOwn(selection.collected, name)) defineSelectionProperty(selection.collected, name, [])
  const values = selection.collected[name]
  if (!values) throw new TypeError('P.collect(name, pattern) could not initialize collection capture.')
  return values
}

function captureCollected(selection: SelectionState, name: PropertyKey, value: unknown): void {
  ensureCollected(selection, name).push(value)
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
 * Rejects `P.select(...)` inside Map key or value patterns.
 *
 * Map patterns may scan and consume several entries, so one capture payload would
 * be ambiguous and order-dependent.
 *
 * @param pattern - Map pattern to inspect.
 * @throws {TypeError} When any Map key or value pattern contains a selection.
 */
function assertNoMapSelection(pattern: BuiltInPattern): void {
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
function assertNoSetSelection(pattern: BuiltInPattern): void {
  if (pattern[PATTERN_TOKEN] !== 'set') return
  if (pattern.values.some(containsSelect)) throw new TypeError('P.select(...) cannot be used inside P.set(...).')
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
    containsSelectInRecordPattern(pattern) ||
    containsSelectInMapOrSetPattern(pattern)
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
  return (
    (kind === 'exclude' || kind === 'optional' || kind === 'exact' || kind === 'collect') &&
    containsSelect(pattern.pattern)
  )
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
 * Checks Map and Set patterns for nested selections.
 *
 * @param pattern - Built-in pattern whose token has already been validated.
 * @returns `true` when a Map key/value or Set value pattern contains a selection.
 */
function containsSelectInMapOrSetPattern(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'set') return pattern.values.some(containsSelect)
  if (kind !== 'map') return false
  if (pattern.mode === 'homogeneous') return containsSelect(pattern.key) || containsSelect(pattern.value)
  return pattern.entries.some(
    ([keyPattern, valuePattern]) => containsSelect(keyPattern) || containsSelect(valuePattern),
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

function containsCollectInBuiltIn(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'collect') return true
  if (kind === 'select') return containsCollect(pattern.pattern)
  if (kind === 'union') return pattern.patterns.some(containsCollect)
  if (kind === 'exclude' || kind === 'optional' || kind === 'exact') return containsCollect(pattern.pattern)
  if (kind === 'array' || kind === 'non-empty-array' || kind === 'rest') return containsCollect(pattern.item)
  if (kind === 'tuple') return pattern.items.some(containsCollect)
  if (kind === 'record' || kind === 'non-empty-record')
    return containsCollect(pattern.key) || containsCollect(pattern.value)
  if (kind === 'set') return pattern.values.some(containsCollect)
  if (kind !== 'map') return false
  if (pattern.mode === 'homogeneous') return containsCollect(pattern.key) || containsCollect(pattern.value)
  return pattern.entries.some(
    ([keyPattern, valuePattern]) => containsCollect(keyPattern) || containsCollect(valuePattern),
  )
}

function containsCollect(pattern: unknown): boolean {
  if (isPattern(pattern)) return containsCollectInBuiltIn(pattern)
  if (Array.isArray(pattern)) return pattern.some(containsCollect)
  if (!isObject(pattern)) return false
  return ownPatternKeys(pattern).some((key) => containsCollect(readProperty(pattern, key)))
}

function containsAnonymousSelectInBuiltIn(pattern: BuiltInPattern): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'select') return pattern.name === undefined || containsAnonymousSelect(pattern.pattern)
  if (kind === 'collect') return containsAnonymousSelect(pattern.pattern)
  if (kind === 'union') return pattern.patterns.some(containsAnonymousSelect)
  if (kind === 'exclude' || kind === 'optional' || kind === 'exact') return containsAnonymousSelect(pattern.pattern)
  if (kind === 'array' || kind === 'non-empty-array' || kind === 'rest') return containsAnonymousSelect(pattern.item)
  if (kind === 'tuple') return pattern.items.some(containsAnonymousSelect)
  if (kind === 'record' || kind === 'non-empty-record')
    return containsAnonymousSelect(pattern.key) || containsAnonymousSelect(pattern.value)
  if (kind === 'set') return pattern.values.some(containsAnonymousSelect)
  if (kind !== 'map') return false
  if (pattern.mode === 'homogeneous')
    return containsAnonymousSelect(pattern.key) || containsAnonymousSelect(pattern.value)
  return pattern.entries.some(
    ([keyPattern, valuePattern]) => containsAnonymousSelect(keyPattern) || containsAnonymousSelect(valuePattern),
  )
}

function containsAnonymousSelect(pattern: unknown): boolean {
  if (isPattern(pattern)) return containsAnonymousSelectInBuiltIn(pattern)
  if (Array.isArray(pattern)) return pattern.some(containsAnonymousSelect)
  if (!isObject(pattern)) return false
  return ownPatternKeys(pattern).some((key) => containsAnonymousSelect(readProperty(pattern, key)))
}

function containsCollectInsideExclude(pattern: unknown): boolean {
  if (isPattern(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    if (kind === 'exclude') return containsCollect(pattern.pattern)
    if (kind === 'select' || kind === 'optional' || kind === 'exact' || kind === 'collect') {
      return containsCollectInsideExclude(pattern.pattern)
    }
    if (kind === 'union') return pattern.patterns.some(containsCollectInsideExclude)
    if (kind === 'array' || kind === 'non-empty-array' || kind === 'rest') {
      return containsCollectInsideExclude(pattern.item)
    }
    if (kind === 'tuple') return pattern.items.some(containsCollectInsideExclude)
    if (kind === 'record' || kind === 'non-empty-record') {
      return containsCollectInsideExclude(pattern.key) || containsCollectInsideExclude(pattern.value)
    }
    if (kind === 'set') return pattern.values.some(containsCollectInsideExclude)
    if (kind === 'map') {
      if (pattern.mode === 'homogeneous') {
        return containsCollectInsideExclude(pattern.key) || containsCollectInsideExclude(pattern.value)
      }
      return pattern.entries.some(
        ([keyPattern, valuePattern]) =>
          containsCollectInsideExclude(keyPattern) || containsCollectInsideExclude(valuePattern),
      )
    }
    return false
  }

  if (Array.isArray(pattern)) return pattern.some(containsCollectInsideExclude)
  if (!isObject(pattern)) return false
  return ownPatternKeys(pattern).some((key) => containsCollectInsideExclude(readProperty(pattern, key)))
}

function namedSelectNames(pattern: unknown, names: Set<PropertyKey> = new Set()): Set<PropertyKey> {
  if (isPattern(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    if (kind === 'select') {
      if (pattern.name !== undefined) names.add(pattern.name)
      namedSelectNames(pattern.pattern, names)
      return names
    }
    if (kind === 'collect' || kind === 'exclude' || kind === 'optional' || kind === 'exact') {
      namedSelectNames(pattern.pattern, names)
      return names
    }
    if (kind === 'union') {
      for (const option of pattern.patterns) namedSelectNames(option, names)
      return names
    }
    if (kind === 'array' || kind === 'non-empty-array' || kind === 'rest') {
      namedSelectNames(pattern.item, names)
      return names
    }
    if (kind === 'tuple') {
      for (const item of pattern.items) namedSelectNames(item, names)
      return names
    }
    if (kind === 'record' || kind === 'non-empty-record') {
      namedSelectNames(pattern.key, names)
      namedSelectNames(pattern.value, names)
      return names
    }
    if (kind === 'set') {
      for (const valuePattern of pattern.values) namedSelectNames(valuePattern, names)
      return names
    }
    if (kind === 'map') {
      if (pattern.mode === 'homogeneous') {
        namedSelectNames(pattern.key, names)
        namedSelectNames(pattern.value, names)
        return names
      }
      for (const [keyPattern, valuePattern] of pattern.entries) {
        namedSelectNames(keyPattern, names)
        namedSelectNames(valuePattern, names)
      }
    }
    return names
  }

  if (Array.isArray(pattern)) {
    for (const item of pattern) namedSelectNames(item, names)
    return names
  }

  if (isObject(pattern)) {
    for (const key of ownPatternKeys(pattern)) namedSelectNames(readProperty(pattern, key), names)
  }
  return names
}

function assertNoCollect(pattern: unknown, message: string): void {
  if (containsCollect(pattern)) throw new TypeError(message)
}

function assertNoCollectInsideExclude(pattern: unknown): void {
  if (containsCollectInsideExclude(pattern)) {
    throw new TypeError('P.exclude(pattern) cannot contain P.collect(...).')
  }
}

function validateCollectPlacement(pattern: unknown, allowCollect: boolean, insideExclude = false): void {
  if (isPattern(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    if (kind === 'collect') {
      if (insideExclude) throw new TypeError('P.exclude(pattern) cannot contain P.collect(...).')
      if (!allowCollect) throw new TypeError('P.collect(name, pattern) can only be used inside repeated containers.')
      validateCollectPlacement(pattern.pattern, true)
      return
    }
    if (kind === 'exclude') {
      validateCollectPlacement(pattern.pattern, allowCollect, true)
      return
    }
    if (kind === 'select' || kind === 'optional' || kind === 'exact') {
      validateCollectPlacement(pattern.pattern, allowCollect, insideExclude)
      return
    }
    if (kind === 'union') {
      for (const option of pattern.patterns) validateCollectPlacement(option, allowCollect, insideExclude)
      return
    }
    if (kind === 'array' || kind === 'non-empty-array') {
      validateCollectPlacement(pattern.item, true, insideExclude)
      return
    }
    if (kind === 'rest') {
      validateCollectPlacement(pattern.item, allowCollect, insideExclude)
      return
    }
    if (kind === 'tuple') {
      for (const item of pattern.items) validateCollectPlacement(item, allowCollect, insideExclude)
      return
    }
    if (kind === 'record' || kind === 'non-empty-record') {
      validateCollectPlacement(pattern.key, true, insideExclude)
      validateCollectPlacement(pattern.value, true, insideExclude)
      return
    }
    if (kind === 'set') {
      for (const valuePattern of pattern.values) validateCollectPlacement(valuePattern, true, insideExclude)
      return
    }
    if (kind === 'map') {
      if (pattern.mode === 'homogeneous') {
        validateCollectPlacement(pattern.key, true, insideExclude)
        validateCollectPlacement(pattern.value, true, insideExclude)
        return
      }
      for (const [keyPattern, valuePattern] of pattern.entries) {
        validateCollectPlacement(keyPattern, true, insideExclude)
        validateCollectPlacement(valuePattern, true, insideExclude)
      }
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
  if (isPattern(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    if (kind === 'collect') {
      names.add(pattern.name)
      collectNames(pattern.pattern, names)
      return names
    }
    if (kind === 'select' || kind === 'exclude' || kind === 'optional' || kind === 'exact') {
      collectNames(pattern.pattern, names)
      return names
    }
    if (kind === 'union') {
      for (const option of pattern.patterns) collectNames(option, names)
      return names
    }
    if (kind === 'array' || kind === 'non-empty-array' || kind === 'rest') {
      collectNames(pattern.item, names)
      return names
    }
    if (kind === 'tuple') {
      for (const item of pattern.items) collectNames(item, names)
      return names
    }
    if (kind === 'record' || kind === 'non-empty-record') {
      collectNames(pattern.key, names)
      collectNames(pattern.value, names)
      return names
    }
    if (kind === 'set') {
      for (const valuePattern of pattern.values) collectNames(valuePattern, names)
      return names
    }
    if (kind === 'map') {
      if (pattern.mode === 'homogeneous') {
        collectNames(pattern.key, names)
        collectNames(pattern.value, names)
        return names
      }
      for (const [keyPattern, valuePattern] of pattern.entries) {
        collectNames(keyPattern, names)
        collectNames(valuePattern, names)
      }
    }
    return names
  }

  if (Array.isArray(pattern)) {
    for (const item of pattern) collectNames(item, names)
    return names
  }

  if (isObject(pattern)) {
    for (const key of ownPatternKeys(pattern)) collectNames(readProperty(pattern, key), names)
  }
  return names
}

function ensureCollectedArrays(selection: SelectionState | undefined, pattern: unknown): void {
  if (!selection) return
  for (const name of collectNames(pattern)) ensureCollected(selection, name)
}

function validateCollectCaptureCompatibility(pattern: unknown): void {
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

function validatePatternCaptureUsage(pattern: unknown): void {
  if (!containsCollect(pattern)) return
  validateCollectPlacement(pattern, false)
  validateCollectCaptureCompatibility(pattern)
}

/**
 * Captures `undefined` payloads for selections inside optional missing branches.
 *
 * @param pattern - Built-in pattern that is being treated as absent or undefined.
 * @param selection - Mutable capture state to update.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedFromBuiltIn(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions): void {
  if (captureUndefinedFromSelection(pattern, selection, options)) return
  if (captureUndefinedFromCollect(pattern, selection, options)) return
  if (captureUndefinedFromUnion(pattern, selection, options)) return
  if (captureUndefinedFromUnary(pattern, selection, options)) return
  if (captureUndefinedFromCollection(pattern, selection, options)) return
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
function captureUndefinedFromSelection(
  pattern: BuiltInPattern,
  selection: SelectionState,
  options: MatchOptions,
): boolean {
  if (pattern[PATTERN_TOKEN] !== 'select') return false
  captureUndefinedSelections(pattern.pattern, selection, options)
  if (pattern.name === undefined) captureAnonymous(selection, undefined)
  else captureNamed(selection, pattern.name, undefined)
  return true
}

function captureUndefinedFromCollect(
  pattern: BuiltInPattern,
  selection: SelectionState,
  options: MatchOptions,
): boolean {
  if (pattern[PATTERN_TOKEN] !== 'collect') return false
  if (!options.allowCollect)
    throw new TypeError('P.collect(name, pattern) can only be used inside repeated containers.')
  captureUndefinedSelections(pattern.pattern, selection, options)
  captureCollected(selection, pattern.name, undefined)
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
function captureUndefinedFromUnion(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions): boolean {
  if (pattern[PATTERN_TOKEN] !== 'union') return false
  for (const option of pattern.patterns) captureUndefinedSelections(option, selection, options)
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
function captureUndefinedFromUnary(pattern: BuiltInPattern, selection: SelectionState, options: MatchOptions): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'exclude') {
    assertNoSelect(pattern.pattern, 'P.exclude(pattern) cannot contain P.select(...).')
    assertNoCollect(pattern.pattern, 'P.exclude(pattern) cannot contain P.collect(...).')
    return true
  }
  if (kind !== 'optional' && kind !== 'exact') return false
  captureUndefinedSelections(pattern.pattern, selection, options)
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
function captureUndefinedFromCollection(
  pattern: BuiltInPattern,
  selection: SelectionState,
  options: MatchOptions,
): boolean {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'rest') {
    captureUndefinedSelections(pattern.item, selection, options)
    return true
  }
  if (kind === 'array' || kind === 'non-empty-array') {
    validateRepeatedSelectionContainers(pattern)
    captureUndefinedSelections(pattern.item, selection, repeatedOptions(options))
    return true
  }
  if (kind === 'record' || kind === 'non-empty-record') {
    validateRepeatedSelectionContainers(pattern)
    captureUndefinedSelections(pattern.key, selection, repeatedOptions(options))
    captureUndefinedSelections(pattern.value, selection, repeatedOptions(options))
    return true
  }
  if (kind === 'map') {
    validateRepeatedSelectionContainers(pattern)
    if (pattern.mode === 'homogeneous') {
      captureUndefinedSelections(pattern.key, selection, repeatedOptions(options))
      captureUndefinedSelections(pattern.value, selection, repeatedOptions(options))
      return true
    }
    for (const [keyPattern, valuePattern] of pattern.entries) {
      captureUndefinedSelections(keyPattern, selection, repeatedOptions(options))
      captureUndefinedSelections(valuePattern, selection, repeatedOptions(options))
    }
    return true
  }
  if (kind === 'set') {
    validateRepeatedSelectionContainers(pattern)
    for (const valuePattern of pattern.values)
      captureUndefinedSelections(valuePattern, selection, repeatedOptions(options))
    return true
  }
  if (kind !== 'tuple') return false
  for (const item of pattern.items) captureUndefinedSelections(item, selection, options)
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
  if (kind === 'array') {
    assertNoArraySelection(pattern.item, 'array')
    assertNoCollectInsideExclude(pattern.item)
  }
  if (kind === 'non-empty-array') {
    assertNoArraySelection(pattern.item, 'nonEmptyArray')
    assertNoCollectInsideExclude(pattern.item)
  }
  if (kind === 'record') {
    assertNoRecordSelection(pattern.key, pattern.value, 'record')
    assertNoCollectInsideExclude(pattern.key)
    assertNoCollectInsideExclude(pattern.value)
  }
  if (kind === 'non-empty-record') {
    assertNoRecordSelection(pattern.key, pattern.value, 'nonEmptyRecord')
    assertNoCollectInsideExclude(pattern.key)
    assertNoCollectInsideExclude(pattern.value)
  }
  if (kind === 'map') {
    assertNoMapSelection(pattern)
    assertNoCollectInsideExclude(pattern)
  }
  if (kind === 'set') {
    assertNoSetSelection(pattern)
    assertNoCollectInsideExclude(pattern)
  }
}

/**
 * Recursively captures `undefined` for selections under an absent optional property.
 *
 * @param pattern - Pattern subtree associated with the absent property.
 * @param selection - Mutable capture state to update.
 * @see https://github.com/DiegoGBrisa/ts-match#object-patterns
 */
function captureUndefinedSelections(pattern: unknown, selection: SelectionState, options: MatchOptions): void {
  if (isPattern(pattern)) {
    captureUndefinedFromBuiltIn(pattern, selection, options)
    return
  }

  if (Array.isArray(pattern)) {
    for (const item of pattern) captureUndefinedSelections(item, selection, options)
    return
  }

  if (isObject(pattern)) {
    for (const key of ownPatternKeys(pattern))
      captureUndefinedSelections(readProperty(pattern, key), selection, options)
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
  if (selection && containsCollect(restPattern)) validateCollectPlacement(restPattern, options.allowCollect)
  for (let valueIndex = startIndex; valueIndex < value.length; valueIndex += 1) {
    if (!matchesPattern(value[valueIndex], restPattern, selection, options)) return false
  }
  ensureCollectedArrays(selection, restPattern)
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
    if (selection) captureUndefinedSelections(propertyPattern.pattern, selection, options)
    return true
  }

  const propertyValue = readProperty(value, key)
  if (propertyValue === undefined) {
    if (selection) captureUndefinedSelections(propertyPattern.pattern, selection, options)
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

  return !options.exact || exactObjectKeysMatch(value, keys)
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
function keyMatches(
  key: PropertyKey,
  pattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (matchesPattern(key, pattern, selection, options)) return true
  if (typeof key !== 'string') return false

  const numericKey = canonicalNumberKey(key)
  if (numericKey === null) return false
  return matchesPattern(numericKey, pattern, selection, options)
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
  options: MatchOptions,
): boolean {
  if (!isPlainRecord(value)) return false

  const keys = ownEnumerableKeys(value)
  if (requireNonEmpty && keys.length === 0) return false

  for (const key of keys) {
    if (!keyMatches(key, keyPattern, selection, repeatedOptions(options))) return false
    if (!matchesPattern(readProperty(value, key), valuePattern, selection, repeatedOptions(options))) return false
  }

  ensureCollectedArrays(selection, keyPattern)
  ensureCollectedArrays(selection, valuePattern)
  return true
}

/**
 * Checks one Map entry against one required-entry clause.
 *
 * @param entry - Runtime Map entry in insertion order.
 * @param clause - Required key/value pattern pair.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when both key and value satisfy the clause.
 */
function mapEntryMatches(
  entry: readonly [unknown, unknown],
  clause: MapEntryPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  const [keyPattern, valuePattern] = clause

  if (selection) {
    const entrySelection = cloneSelection(selection)
    if (
      matchesPattern(entry[0], keyPattern, entrySelection, repeatedOptions(options)) &&
      matchesPattern(entry[1], valuePattern, entrySelection, repeatedOptions(options))
    ) {
      commitSelection(selection, entrySelection)
      return true
    }
    return false
  }

  return (
    matchesPattern(entry[0], keyPattern, undefined, repeatedOptions(options)) &&
    matchesPattern(entry[1], valuePattern, undefined, repeatedOptions(options))
  )
}

/**
 * Matches homogeneous Map patterns by requiring every entry to satisfy the same
 * key and value patterns.
 *
 * @param value - Candidate runtime value.
 * @param keyPattern - Pattern required for every Map key.
 * @param valuePattern - Pattern required for every Map value.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when `value` is a Map and every entry matches.
 */
function homogeneousMapMatches(
  value: unknown,
  keyPattern: unknown,
  valuePattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!(value instanceof Map)) return false

  for (const [entryKey, entryValue] of value) {
    if (!matchesPattern(entryKey, keyPattern, selection, repeatedOptions(options))) return false
    if (!matchesPattern(entryValue, valuePattern, selection, repeatedOptions(options))) return false
  }

  ensureCollectedArrays(selection, keyPattern)
  ensureCollectedArrays(selection, valuePattern)
  return true
}

/**
 * Matches required-entry Map patterns with deterministic distinct consumption.
 *
 * Clauses are evaluated left to right. For each clause, Map entries are scanned
 * in insertion order and the first unused matching entry is consumed.
 *
 * @param value - Candidate runtime value.
 * @param entries - Required key/value pattern clauses.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when every required clause consumes one distinct Map entry.
 */
function requiredMapEntriesMatch(
  value: unknown,
  entries: readonly MapEntryPattern[],
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!(value instanceof Map)) return false

  const runtimeEntries = [...value.entries()]
  const usedIndexes = new Set<number>()

  for (const clause of entries) {
    let consumedIndex: number | undefined
    for (let index = 0; index < runtimeEntries.length; index += 1) {
      if (usedIndexes.has(index)) continue
      const runtimeEntry = runtimeEntries[index]
      if (runtimeEntry === undefined) continue
      if (!mapEntryMatches(runtimeEntry, clause, selection, options)) continue
      consumedIndex = index
      break
    }

    if (consumedIndex === undefined) return false
    usedIndexes.add(consumedIndex)
  }

  if (options.exact && usedIndexes.size !== value.size) return false
  ensureCollectedArrays(selection, entries)
  return true
}

/**
 * Matches homogeneous Set patterns by requiring every value to satisfy one pattern.
 *
 * @param value - Candidate runtime value.
 * @param valuePattern - Pattern required for every Set value.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when `value` is a Set and every value matches.
 */
function homogeneousSetMatches(
  value: unknown,
  valuePattern: unknown,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!(value instanceof Set)) return false

  for (const setValue of value) {
    if (!matchesPattern(setValue, valuePattern, selection, repeatedOptions(options))) return false
  }

  ensureCollectedArrays(selection, valuePattern)
  return true
}

/**
 * Matches required-value Set patterns with deterministic distinct consumption.
 *
 * Value clauses are evaluated left to right. For each clause, Set values are
 * scanned in insertion order and the first unused matching value is consumed.
 *
 * @param value - Candidate runtime value.
 * @param patterns - Required value patterns.
 * @param options - Structural matching options for nested checks.
 * @returns `true` when every required clause consumes one distinct Set value.
 */
function requiredSetValuesMatch(
  value: unknown,
  patterns: readonly unknown[],
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean {
  if (!(value instanceof Set)) return false

  const runtimeValues = [...value.values()]
  const usedIndexes = new Set<number>()

  for (const valuePattern of patterns) {
    let consumedIndex: number | undefined
    for (let index = 0; index < runtimeValues.length; index += 1) {
      if (usedIndexes.has(index)) continue
      if (selection) {
        const valueSelection = cloneSelection(selection)
        if (!matchesPattern(runtimeValues[index], valuePattern, valueSelection, repeatedOptions(options))) continue
        commitSelection(selection, valueSelection)
      } else if (!matchesPattern(runtimeValues[index], valuePattern, undefined, repeatedOptions(options))) {
        continue
      }
      consumedIndex = index
      break
    }

    if (consumedIndex === undefined) return false
    usedIndexes.add(consumedIndex)
  }

  if (options.exact && usedIndexes.size !== value.size) return false
  ensureCollectedArrays(selection, patterns)
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
  if (kind === 'regex') return regexMatches(value, pattern.regex)
  if (kind === 'date') return value instanceof Date && !Number.isNaN(value.getTime())
  if (kind === 'error') return value instanceof Error
  if (kind === 'regexp') return value instanceof RegExp
  if (kind === 'nullish') return value === null || value === undefined
  if (kind === 'falsy') return !value
  if (kind === 'truthy') return Boolean(value)
  if (kind === 'temporal') return temporalMatches(value, pattern.temporal)
  if (kind === 'literal') return Object.is(value, pattern.literal)
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
    assertNoCollect(pattern.pattern, 'P.exclude(pattern) cannot contain P.collect(...).')
    return !matchesPattern(value, pattern.pattern, undefined, options)
  }
  if (kind === 'optional') return matchOptionalPattern(value, pattern, selection, options)
  if (kind === 'exact') return matchesPattern(value, pattern.pattern, selection, exactOptions(options))
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
  if (selection) captureUndefinedSelections(pattern.pattern, selection, options)
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
    if (!matchesPattern(value[index], itemPattern, selection, repeatedOptions(options))) return false
  }
  ensureCollectedArrays(selection, itemPattern)
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
    assertNoCollectInsideExclude(pattern.item)
    return matchArrayItems(value, pattern.item, false, selection, options)
  }
  if (kind === 'non-empty-array') {
    assertNoArraySelection(pattern.item, 'nonEmptyArray')
    assertNoCollectInsideExclude(pattern.item)
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
  if (kind === 'collect') {
    if (!options.allowCollect)
      throw new TypeError('P.collect(name, pattern) can only be used inside repeated containers.')
    if (!matchesPattern(value, pattern.pattern, selection, options)) return false
    if (selection) captureCollected(selection, pattern.name, value)
    return true
  }
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
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'record') {
    assertNoRecordSelection(pattern.key, pattern.value, 'record')
    assertNoCollectInsideExclude(pattern)
    return recordMatches(value, pattern.key, pattern.value, false, selection, options)
  }
  if (kind !== 'non-empty-record') return undefined
  assertNoRecordSelection(pattern.key, pattern.value, 'nonEmptyRecord')
  assertNoCollectInsideExclude(pattern)
  return recordMatches(value, pattern.key, pattern.value, true, selection, options)
}

/**
 * Evaluates Map and Set helpers.
 *
 * @param value - Candidate runtime value.
 * @param pattern - Built-in pattern helper to evaluate.
 * @param options - Structural matching options for nested checks.
 * @returns Match result, or `undefined` when the helper is not Map/Set.
 */
function matchMapOrSetPattern(
  value: unknown,
  pattern: BuiltInPattern,
  selection: SelectionState | undefined,
  options: MatchOptions,
): boolean | undefined {
  const kind = pattern[PATTERN_TOKEN]
  if (kind === 'map') {
    assertNoMapSelection(pattern)
    assertNoCollectInsideExclude(pattern)
    if (pattern.mode === 'homogeneous')
      return homogeneousMapMatches(value, pattern.key, pattern.value, selection, options)
    return requiredMapEntriesMatch(value, pattern.entries, selection, options)
  }

  if (kind !== 'set') return undefined
  assertNoSetSelection(pattern)
  assertNoCollectInsideExclude(pattern)
  if (pattern.mode === 'homogeneous') return homogeneousSetMatches(value, pattern.values[0], selection, options)
  return requiredSetValuesMatch(value, pattern.values, selection, options)
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

  const mapOrSet = matchMapOrSetPattern(value, pattern, selection, options)
  if (mapOrSet !== undefined) return mapOrSet

  return matchRecordPattern(value, pattern, selection, options) ?? false
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
  return containsSelect(pattern) || containsCollect(pattern)
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
  validatePatternCaptureUsage(pattern)
  const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined, collected: undefined }
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
    validatePatternCaptureUsage(pattern)
    const selection: SelectionState = { mode: 'none', anonymous: undefined, named: undefined, collected: undefined }
    if (!matchesPattern(value, pattern, selection)) continue

    if (selection.mode === 'anonymous') return { matched: true, payload: selection.anonymous }
    if (selection.mode === 'named') return { matched: true, payload: selectedPayload(selection) }
    return { matched: true, payload: value }
  }

  return { matched: false, payload: undefined }
}
