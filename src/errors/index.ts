/**
 * Optional context attached to matching errors.
 *
 * Runtime matchers pass this metadata when they can identify which matcher,
 * property path, object key, or discriminant tag failed. Consumers can read the
 * copied fields on `NonExhaustiveMatchError` instead of parsing the message.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#error-classes
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#matchby-semantics
 */
export interface MatchErrorMetadata {
  readonly matcher?: 'match' | 'matchBy' | 'isMatching' | 'assertMatching'
  readonly key?: PropertyKey
  readonly path?: string
  readonly tag?: unknown
}

const MAX_PREVIEW_LENGTH = 500

/**
 * Formats an unknown runtime value for readable error messages.
 *
 * The formatter handles `bigint`, `symbol`, functions, and circular references
 * without throwing. Long previews are truncated so assertion and exhaustiveness
 * errors remain readable in CI logs and terminals.
 *
 * @param value - Unknown value to include in an error message.
 * @returns A stable string preview capped to the internal preview length.
 * @see https://github.com/DiegoGBrisa/ts-match#error-classes
 */
export function preview(value: unknown): string {
  const seen = new WeakSet<object>()

  try {
    const text = JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'bigint') return `${String(item)}n`
      if (typeof item === 'symbol') return String(item)
      if (typeof item === 'function') return `[Function ${item.name || 'anonymous'}]`
      if (typeof item === 'object' && item !== null) {
        if (seen.has(item)) return '[Circular]'
        seen.add(item)
      }
      return item
    })

    if (text === undefined) return String(value)
    return text.length > MAX_PREVIEW_LENGTH ? `${text.slice(0, MAX_PREVIEW_LENGTH)}…` : text
  } catch {
    return String(value)
  }
}

/**
 * Error thrown when an exhaustive matcher receives an unhandled value.
 *
 * `match(...).exhaustive()` and `matchBy(...).exhaustive()` use this error when
 * runtime data reaches a branch that TypeScript could not prove impossible. The
 * original value is attached as a non-enumerable `value` property, and the error
 * also exposes `valuePreview`, `matcher`, `path`, `key`, and `tag` for diagnostics.
 *
 * @param value - Runtime value that did not match any exhaustive branch.
 * @param metadata - Optional matcher/path/tag context for the failure.
 * @example
 * ```ts
 * try {
 *   match(value).with('ready', () => 'ok').exhaustive()
 * } catch (error) {
 *   if (error instanceof NonExhaustiveMatchError) console.error(error.valuePreview)
 * }
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#nonexhaustivematcherror
 * @see https://github.com/DiegoGBrisa/ts-match#missing-exhaustive-cases
 */
export class NonExhaustiveMatchError extends Error {
  readonly valuePreview: string
  readonly matcher: MatchErrorMetadata['matcher'] | undefined
  readonly key: PropertyKey | undefined
  readonly path: string | undefined
  readonly tag: unknown
  declare readonly value: unknown

  constructor(value: unknown, metadata: MatchErrorMetadata = {}) {
    const valuePreview = preview(value)
    const detail =
      metadata.matcher === 'matchBy'
        ? `Non-exhaustive matchBy${metadata.path ? ` on path "${metadata.path}"` : ''}${metadata.key ? ` on key "${String(metadata.key)}"` : ''}${'tag' in metadata ? ` for tag ${preview(metadata.tag)}` : ''}.`
        : `Non-exhaustive match for value: ${valuePreview}.`

    super(detail)
    this.name = 'NonExhaustiveMatchError'
    this.valuePreview = valuePreview
    this.matcher = metadata.matcher
    this.key = metadata.key
    this.path = metadata.path
    this.tag = metadata.tag
    Object.defineProperty(this, 'value', {
      value,
      enumerable: false,
      configurable: false,
      writable: false,
    })
  }
}

/**
 * Error thrown by `assertMatching` when a value fails its required pattern.
 *
 * The error message includes short previews of the value and pattern. The full
 * value and pattern are attached as non-enumerable properties so callers can log
 * or inspect them without polluting normal JSON serialization.
 *
 * @param pattern - Pattern that was required.
 * @param value - Runtime value that failed the pattern.
 * @example
 * ```ts
 * assertMatching({ type: 'ready' }, value)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#patternmismatcherror
 * @see https://github.com/DiegoGBrisa/ts-match#assertmatching
 */
export class PatternMismatchError extends Error {
  readonly valuePreview: string
  readonly patternPreview: string
  declare readonly value: unknown
  declare readonly pattern: unknown

  constructor(pattern: unknown, value: unknown) {
    const valuePreview = preview(value)
    const patternPreview = preview(pattern)
    super(`Value did not match pattern. Value: ${valuePreview}. Pattern: ${patternPreview}.`)
    this.name = 'PatternMismatchError'
    this.valuePreview = valuePreview
    this.patternPreview = patternPreview
    Object.defineProperty(this, 'value', {
      value,
      enumerable: false,
      configurable: false,
      writable: false,
    })
    Object.defineProperty(this, 'pattern', {
      value: pattern,
      enumerable: false,
      configurable: false,
      writable: false,
    })
  }
}
