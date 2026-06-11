import { createPromiseMatchBuilder, createSyncMatchBuilder } from './runtime.js'
import type { PromiseMatchBuilder } from './promise-builder.js'
import type { SyncMatchBuilder } from './sync-builder.js'
import type { MatchPromiseResult, MatchedValue } from '../types/index.js'

/**
 * Callable entry point for structural pattern matching.
 *
 * Call `match(value)` for synchronous matching, or `match.promise(valueOrPromise)`
 * when the source may be promise-backed or the terminal result should be a
 * promise. Prefer `.with(...).exhaustive()` for closed unions and
 * `.otherwise(...)` for intentional fallbacks.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#match
 * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
 */
export interface MatchFunction {
  /**
   * Starts a synchronous fluent match chain for a value.
   *
   * @param value - Runtime value to match while preserving its TypeScript type.
   * @returns A synchronous match builder.
   */
  <const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never>

  /**
   * Starts a promise-aware fluent match chain for a value, promise, or thenable.
   *
   * Handlers receive `Awaited<TInput>`, terminals return promises, and safe
   * terminals are available only on promise builders.
   *
   * @param value - Runtime value, promise, thenable, or maybe-promise source.
   * @returns A promise-aware match builder.
   */
  promise<const TInput>(value: TInput): PromiseMatchBuilder<TInput, Awaited<TInput>, never>
}

/**
 * Starts a fluent pattern match for a value.
 *
 * Use structural patterns and `P.*` helpers to narrow handler inputs without
 * casts. Call `match.promise(...)` for promise-backed sources; sync `match(...)`
 * intentionally matches the value as provided.
 *
 * @example
 * ```ts
 * const label = match(event)
 *   .with({ type: 'ready' }, () => 'Ready')
 *   .with({ type: 'failed' }, ({ message }) => message)
 *   .exhaustive()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#match
 * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
 */
export const match: MatchFunction = Object.assign(
  <const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never> => createSyncMatchBuilder(value),
  {
    promise: <const TInput>(value: TInput): PromiseMatchBuilder<TInput, Awaited<TInput>, never> =>
      createPromiseMatchBuilder(value),
  },
)

/** Advanced helper types re-exported from the `match` subpath. */
export type { PromiseMatchBuilder } from './promise-builder.js'
export type { SyncMatchBuilder } from './sync-builder.js'
export type { MatchedValue, MatchPromiseResult }
