export interface MatchErrorMetadata {
  readonly matcher?: 'match' | 'matchBy' | 'isMatching' | 'assertMatching'
  readonly key?: PropertyKey
  readonly path?: string
  readonly tag?: unknown
}

const MAX_PREVIEW_LENGTH = 500

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
