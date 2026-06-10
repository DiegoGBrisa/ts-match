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
export interface SelectionState {
  mode: SelectionMode
  anonymous: unknown
  named: Record<PropertyKey, unknown> | undefined
  collected: Record<PropertyKey, unknown[]> | undefined
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
export function cloneSelection(selection: SelectionState): SelectionState {
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
  return {}
}

function cloneSelectionRecord<T>(record: Record<PropertyKey, T>): Record<PropertyKey, T> {
  const cloned = createSelectionRecord<T>()
  for (const key of Reflect.ownKeys(record)) defineSelectionProperty(cloned, key, record[key])
  return cloned
}

function defineSelectionProperty<T>(target: Record<PropertyKey, T>, key: PropertyKey, value: T) {
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
export function commitSelection(target: SelectionState, source: SelectionState) {
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

function selectionHasOwn(record: Record<PropertyKey, unknown> | undefined, name: PropertyKey) {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, name)
}

export function selectedPayload(selection: SelectionState): Record<PropertyKey, unknown> {
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
export function captureAnonymous(selection: SelectionState, value: unknown) {
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
export function captureNamed(selection: SelectionState, name: PropertyKey, value: unknown) {
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

export function ensureCollected(selection: SelectionState, name: PropertyKey): unknown[] {
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

export function captureCollected(selection: SelectionState, name: PropertyKey, value: unknown) {
  ensureCollected(selection, name).push(value)
}
