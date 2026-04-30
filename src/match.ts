import { NonExhaustiveMatchError } from './errors.js'
import { attemptMatch } from './runtime.js'
import type {
  AwaitedReturn,
  BuiltInPattern,
  HandlerInput,
  MatchPatternArgument,
  MatchPatternSuggestion,
  MatchedValue,
  NonExhaustiveMatchArgument,
  RemainingAfterPattern,
  RemainingAfterPatterns,
} from './types.js'

type UnknownHandler = (value: unknown) => unknown
type UnknownPredicate = (value: unknown) => boolean

type SyncMatchState = { readonly matched: false } | { readonly matched: true; readonly value: unknown }
type AsyncMatchState = { readonly matched: false } | { readonly matched: true; readonly value: Promise<unknown> }

type NoInferValue<T> = [T][T extends unknown ? 0 : never]

type MatchPatternArgs<TValue, TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: TPatterns[K] & MatchPatternArgument<TValue, TPatterns[K]>
}

type SuggestedPattern<TPattern> = TPattern extends BuiltInPattern ? never : TPattern

type SuggestedPatternArgs<TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: SuggestedPattern<TPatterns[K]>
}

const UNMATCHED_SYNC_STATE: SyncMatchState = { matched: false }
const UNMATCHED_ASYNC_STATE: AsyncMatchState = { matched: false }

/**
 * Validates that an unknown runtime argument is callable before using it as a handler.
 *
 * The public `.with(...)`, `.when(...)`, and `.otherwise(...)` APIs accept typed
 * function parameters, but runtime callers can still pass invalid values from
 * JavaScript. This guard keeps failures explicit and names the offending API.
 *
 * @param value - Unknown argument supplied by the caller.
 * @param label - Human-readable API label used in the thrown error message.
 * @throws {TypeError} When `value` is not a function.
 * @see https://github.com/DiegoGBrisa/ts-match#match
 */
function assertFunction(value: unknown, label: string): asserts value is UnknownHandler {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

/**
 * Validates that an unknown runtime argument is callable before using it as a predicate.
 *
 * This mirrors `assertFunction` but documents the value as a boolean predicate so
 * the `.when(...)` implementation can call it safely after runtime validation.
 *
 * @param value - Unknown predicate argument supplied by the caller.
 * @param label - Human-readable API label used in the thrown error message.
 * @throws {TypeError} When `value` is not a function.
 * @see https://github.com/DiegoGBrisa/ts-match#whenpredicate-handler
 */
function assertPredicate(value: unknown, label: string): asserts value is UnknownPredicate {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

/**
 * Splits a variadic `.with(...)` call into patterns and a trailing handler.
 *
 * `match(...).with(...)` accepts either one pattern plus a handler or several
 * alternative patterns plus one handler. This helper enforces the minimum arity,
 * validates the trailing handler, and leaves the pattern arguments in order for
 * runtime matching.
 *
 * @param args - Raw arguments passed to `.with(...)`.
 * @returns The ordered pattern list and validated handler.
 * @throws {TypeError} When no pattern/handler pair exists or the handler is not callable.
 * @see https://github.com/DiegoGBrisa/ts-match#withpattern-handler
 */
function splitPatternsAndHandler(args: readonly unknown[]): {
  readonly patterns: readonly unknown[]
  readonly handler: UnknownHandler
} {
  if (args.length < 2) throw new TypeError('match(...).with(...) requires a pattern and handler.')

  const handler = args[args.length - 1]
  assertFunction(handler, 'match(...).with(...) handler')
  return { patterns: args.slice(0, -1), handler }
}

/**
 * Evaluates one synchronous `.with(...)` clause against the current match state.
 *
 * Once an earlier branch has matched, later branches are skipped so handlers run
 * at most once and in user-written order. When no supplied pattern matches, the
 * state remains unmatched for later clauses or final fallback handling.
 *
 * @param value - Original value being matched.
 * @param state - Current synchronous match state.
 * @param args - Raw `.with(...)` arguments for this clause.
 * @returns Updated match state after evaluating this clause.
 * @see https://github.com/DiegoGBrisa/ts-match#match
 */
function evaluateSyncPatternState(value: unknown, state: SyncMatchState, args: readonly unknown[]): SyncMatchState {
  const { patterns, handler } = splitPatternsAndHandler(args)
  if (state.matched) return state

  const attempt = attemptMatch(value, patterns)
  if (!attempt.matched) return UNMATCHED_SYNC_STATE
  return { matched: true, value: handler(attempt.payload) }
}

/**
 * Normalizes async handler execution into a promise.
 *
 * Async match chains should reject when a handler throws synchronously and should
 * resolve when a handler returns either a plain value or a promise. Wrapping the
 * call here keeps `.with(...)`, `.when(...)`, and `.otherwise(...)` consistent.
 *
 * @param handler - Validated branch or fallback handler.
 * @param value - Value passed to the handler.
 * @returns Promise for the handler result.
 * @see https://github.com/DiegoGBrisa/ts-match#matchasync
 */
function callAsyncHandler(handler: UnknownHandler, value: unknown): Promise<unknown> {
  try {
    return Promise.resolve(handler(value))
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Evaluates one asynchronous `.with(...)` clause against the current match state.
 *
 * This mirrors the synchronous evaluator but stores a promise for the matched
 * handler result so terminal async APIs can await or return it consistently.
 *
 * @param value - Original value being matched.
 * @param state - Current asynchronous match state.
 * @param args - Raw `.with(...)` arguments for this clause.
 * @returns Updated async match state after evaluating this clause.
 * @see https://github.com/DiegoGBrisa/ts-match#matchasync
 */
function evaluateAsyncPatternState(value: unknown, state: AsyncMatchState, args: readonly unknown[]): AsyncMatchState {
  const { patterns, handler } = splitPatternsAndHandler(args)
  if (state.matched) return state

  const attempt = attemptMatch(value, patterns)
  if (!attempt.matched) return UNMATCHED_ASYNC_STATE
  return { matched: true, value: callAsyncHandler(handler, attempt.payload) }
}

/**
 * Fluent synchronous matcher returned by `match(value)`.
 *
 * Add branches with `.with(...)` and `.when(...)`, then finish with
 * `.exhaustive()` for closed unions or `.otherwise(...)` for an explicit
 * fallback. The builder tracks the remaining unhandled TypeScript union members
 * so `.exhaustive()` can fail at compile time when known cases are missing.
 *
 * @typeParam TValue - Original value type being matched.
 * @typeParam TRemaining - Union members not yet covered by typed branches.
 * @typeParam TOutput - Union of return types from matched branches.
 * @see https://github.com/DiegoGBrisa/ts-match#match
 * @see https://github.com/DiegoGBrisa/ts-match#exhaustive
 */
export interface SyncMatchBuilder<TValue, TRemaining, TOutput> {
  /**
   * Adds one structural pattern branch.
   *
   * The pattern can be a literal, object, array, tuple, or `P.*` helper. When it
   * matches, the handler receives the narrowed value or selected payload.
   *
   * @param pattern - Pattern that must match for the handler to run.
   * @param handler - Function invoked with the narrowed handler input.
   * @returns A new builder with covered cases removed from `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#withpattern-handler
   */
  with<const TPattern extends MatchPatternSuggestion<TRemaining>, const TResult>(
    pattern: SuggestedPattern<TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  /**
   * Adds several alternative patterns that share one handler.
   *
   * Use this when multiple patterns should produce the same output while keeping
   * a single branch in the match chain.
   *
   * @param args - Two or more patterns followed by one handler.
   * @returns A new builder with all covered cases removed from `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#withpattern-handler
   */
  with<
    const TPatterns extends readonly [
      MatchPatternSuggestion<TRemaining>,
      MatchPatternSuggestion<TRemaining>,
      ...MatchPatternSuggestion<TRemaining>[],
    ],
    const TResult,
  >(
    ...args: [
      ...patterns: SuggestedPatternArgs<TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): SyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): SyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  /**
   * Adds a type-guard predicate branch.
   *
   * Use this for custom runtime checks that cannot be expressed as structural
   * patterns. When the guard returns `true`, the handler receives the guarded type.
   *
   * @param predicate - Type guard evaluated against the original value.
   * @param handler - Function invoked with the guarded value.
   * @returns A new builder with guarded cases removed from `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#whenpredicate-handler
   */
  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): SyncMatchBuilder<TValue, Exclude<TRemaining, TGuarded>, TOutput | TResult>

  /**
   * Adds a boolean predicate branch.
   *
   * Use this for runtime filtering that should not change exhaustiveness because
   * TypeScript cannot know which union members the predicate covers.
   *
   * @param predicate - Boolean predicate evaluated against the original value.
   * @param handler - Function invoked when the predicate returns `true`.
   * @returns A new builder with unchanged `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#whenpredicate-handler
   */
  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): SyncMatchBuilder<TValue, TRemaining, TOutput | TResult>

  /**
   * Finishes the match with an explicit fallback handler.
   *
   * Use this for open-ended inputs or when a default branch is intentional. The
   * fallback receives the remaining unmatched value type.
   *
   * @param handler - Fallback function invoked only when no earlier branch matched.
   * @returns The matched branch output or fallback output.
   * @see https://github.com/DiegoGBrisa/ts-match#otherwisehandler
   */
  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult

  /**
   * Finishes the match and requires all known cases to be covered.
   *
   * Prefer this for discriminated unions and other closed inputs. TypeScript
   * rejects the call when `TRemaining` is not `never`; runtime throws if an
   * unexpected value reaches the matcher.
   *
   * @returns The matched branch output.
   * @throws {NonExhaustiveMatchError} When no branch matches at runtime.
   * @see https://github.com/DiegoGBrisa/ts-match#exhaustive
   * @see https://github.com/DiegoGBrisa/ts-match#missing-exhaustive-cases
   */
  exhaustive(
    this: SyncMatchBuilder<TValue, TRemaining, TOutput> & NonExhaustiveMatchArgument<TRemaining, 'match'>,
  ): TOutput
}

/**
 * Fluent asynchronous matcher returned by `match.async(value)`.
 *
 * The async builder has the same branch semantics as `match(value)`, but terminal
 * methods return promises and branch handlers may return either values or
 * promises. Use this when matching should sequence asynchronous work per branch.
 *
 * @typeParam TValue - Original value type being matched.
 * @typeParam TRemaining - Union members not yet covered by typed branches.
 * @typeParam TOutput - Union of awaited and non-awaited branch return types.
 * @see https://github.com/DiegoGBrisa/ts-match#matchasync
 */
export interface AsyncMatchBuilder<TValue, TRemaining, TOutput> {
  /**
   * Adds one structural pattern branch to an async match chain.
   *
   * @param pattern - Pattern that must match for the handler to run.
   * @param handler - Function invoked with the narrowed handler input.
   * @returns A new async builder with covered cases removed from `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchasync
   */
  with<const TPattern extends MatchPatternSuggestion<TRemaining>, const TResult>(
    pattern: SuggestedPattern<TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): AsyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): AsyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  /**
   * Adds several alternative patterns that share one async handler.
   *
   * @param args - Two or more patterns followed by one handler.
   * @returns A new async builder with all covered cases removed from `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchasync
   */
  with<
    const TPatterns extends readonly [
      MatchPatternSuggestion<TRemaining>,
      MatchPatternSuggestion<TRemaining>,
      ...MatchPatternSuggestion<TRemaining>[],
    ],
    const TResult,
  >(
    ...args: [
      ...patterns: SuggestedPatternArgs<TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): AsyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): AsyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  /**
   * Adds a type-guard predicate branch to an async match chain.
   *
   * @param predicate - Type guard evaluated against the original value.
   * @param handler - Function invoked with the guarded value.
   * @returns A new async builder with guarded cases removed from `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchasync
   */
  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): AsyncMatchBuilder<TValue, Exclude<TRemaining, TGuarded>, TOutput | TResult>

  /**
   * Adds a boolean predicate branch to an async match chain.
   *
   * @param predicate - Boolean predicate evaluated against the original value.
   * @param handler - Function invoked when the predicate returns `true`.
   * @returns A new async builder with unchanged `TRemaining`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchasync
   */
  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): AsyncMatchBuilder<TValue, TRemaining, TOutput | TResult>

  /**
   * Finishes the async match with an explicit fallback handler.
   *
   * @param handler - Fallback function invoked only when no earlier branch matched.
   * @returns Promise for the matched branch output or fallback output.
   * @see https://github.com/DiegoGBrisa/ts-match#matchasync
   */
  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>

  /**
   * Finishes the async match and requires all known cases to be covered.
   *
   * @returns Promise for the matched branch output.
   * @throws {NonExhaustiveMatchError} When no branch matches at runtime.
   * @see https://github.com/DiegoGBrisa/ts-match#matchasync
   */
  exhaustive(
    this: AsyncMatchBuilder<TValue, TRemaining, TOutput> & NonExhaustiveMatchArgument<TRemaining, 'match.async'>,
  ): Promise<AwaitedReturn<TOutput>>
}

/**
 * Runtime implementation for synchronous match chains.
 *
 * The class stores the original value and immutable branch state. Public users do
 * not construct it directly; they receive the `SyncMatchBuilder` interface from
 * `match(value)`.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#match
 */
class SyncMatchBuilderImpl<TValue, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly state: SyncMatchState,
  ) {}

  with<const TPattern extends MatchPatternSuggestion<TRemaining>, const TResult>(
    pattern: SuggestedPattern<TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
  with<
    const TPatterns extends readonly [
      MatchPatternSuggestion<TRemaining>,
      MatchPatternSuggestion<TRemaining>,
      ...MatchPatternSuggestion<TRemaining>[],
    ],
    const TResult,
  >(
    ...args: [
      ...patterns: SuggestedPatternArgs<TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): SyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>
  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): SyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>
  with(...args: readonly unknown[]): SyncMatchBuilder<TValue, unknown, TOutput | unknown> {
    return new SyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(
      this.value,
      evaluateSyncPatternState(this.value, this.state, args),
    )
  }

  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): SyncMatchBuilder<TValue, Exclude<TRemaining, TGuarded>, TOutput | TResult>
  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): SyncMatchBuilder<TValue, TRemaining, TOutput | TResult>
  when(predicate: unknown, handler: unknown): SyncMatchBuilder<TValue, unknown, TOutput | unknown> {
    assertPredicate(predicate, 'match(...).when(...) predicate')
    assertFunction(handler, 'match(...).when(...) handler')
    if (this.state.matched) {
      return new SyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(this.value, this.state)
    }
    if (!predicate(this.value)) {
      return new SyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(this.value, UNMATCHED_SYNC_STATE)
    }
    return new SyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(this.value, {
      matched: true,
      value: handler(this.value),
    })
  }

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult
  otherwise(handler: unknown): unknown {
    assertFunction(handler, 'match(...).otherwise(...) handler')
    if (this.state.matched) return this.state.value
    return handler(this.value)
  }

  exhaustive(): TOutput
  exhaustive(): unknown {
    if (this.state.matched) return this.state.value
    throw new NonExhaustiveMatchError(this.value, { matcher: 'match' })
  }
}

/**
 * Runtime implementation for asynchronous match chains.
 *
 * The class stores the original value and a promise-backed branch state. Public
 * users do not construct it directly; they receive the `AsyncMatchBuilder`
 * interface from `match.async(value)`.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#matchasync
 */
class AsyncMatchBuilderImpl<TValue, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly state: AsyncMatchState,
  ) {}

  with<const TPattern extends MatchPatternSuggestion<TRemaining>, const TResult>(
    pattern: SuggestedPattern<TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): AsyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): AsyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
  with<
    const TPatterns extends readonly [
      MatchPatternSuggestion<TRemaining>,
      MatchPatternSuggestion<TRemaining>,
      ...MatchPatternSuggestion<TRemaining>[],
    ],
    const TResult,
  >(
    ...args: [
      ...patterns: SuggestedPatternArgs<TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): AsyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>
  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): AsyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>
  with(...args: readonly unknown[]): AsyncMatchBuilder<TValue, unknown, TOutput | unknown> {
    return new AsyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(
      this.value,
      evaluateAsyncPatternState(this.value, this.state, args),
    )
  }

  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): AsyncMatchBuilder<TValue, Exclude<TRemaining, TGuarded>, TOutput | TResult>
  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): AsyncMatchBuilder<TValue, TRemaining, TOutput | TResult>
  when(predicate: unknown, handler: unknown): AsyncMatchBuilder<TValue, unknown, TOutput | unknown> {
    assertPredicate(predicate, 'match(...).when(...) predicate')
    assertFunction(handler, 'match(...).when(...) handler')
    if (this.state.matched) {
      return new AsyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(this.value, this.state)
    }
    if (!predicate(this.value)) {
      return new AsyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(this.value, UNMATCHED_ASYNC_STATE)
    }
    return new AsyncMatchBuilderImpl<TValue, unknown, TOutput | unknown>(this.value, {
      matched: true,
      value: callAsyncHandler(handler, this.value),
    })
  }

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>
  otherwise(handler: unknown): Promise<unknown> {
    assertFunction(handler, 'match(...).otherwise(...) handler')
    if (this.state.matched) return this.state.value
    return callAsyncHandler(handler, this.value)
  }

  exhaustive(): Promise<AwaitedReturn<TOutput>>
  exhaustive(): Promise<unknown> {
    if (this.state.matched) return this.state.value
    return Promise.reject(new NonExhaustiveMatchError(this.value, { matcher: 'match' }))
  }
}

/**
 * Callable entry point for building sync and async pattern-match chains.
 *
 * The default call signature creates a synchronous builder. The `.async` member
 * creates an asynchronous builder with the same pattern semantics and promise
 * terminal methods.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#match
 * @see https://github.com/DiegoGBrisa/ts-match#matchasync
 */
export interface MatchFunction {
  /**
   * Starts a synchronous fluent match chain for a value.
   *
   * @param value - Runtime value to match while preserving its TypeScript type.
   * @returns A synchronous match builder.
   * @see https://github.com/DiegoGBrisa/ts-match#match
   */
  <const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never>

  /**
   * Starts an asynchronous fluent match chain for a value.
   *
   * @param value - Runtime value to match while preserving its TypeScript type.
   * @returns An asynchronous match builder.
   * @see https://github.com/DiegoGBrisa/ts-match#matchasync
   */
  async<const TValue>(value: TValue): AsyncMatchBuilder<TValue, TValue, never>
}

/**
 * Starts a fluent pattern match for a value.
 *
 * Prefer `.with(...).exhaustive()` for closed discriminated unions and
 * `.otherwise(...)` when a default branch is intentional. Use `match.async` when
 * branch handlers need to perform asynchronous work.
 *
 * @example
 * ```ts
 * const label = match(event)
 *   .with({ type: 'ready' }, () => 'Ready')
 *   .with({ type: 'failed' }, ({ message }) => message)
 *   .exhaustive()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#match
 * @see https://github.com/DiegoGBrisa/ts-match#quick-start
 */
export const match: MatchFunction = Object.assign(
  <const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never> =>
    new SyncMatchBuilderImpl<TValue, TValue, never>(value, UNMATCHED_SYNC_STATE),
  {
    async: <const TValue>(value: TValue): AsyncMatchBuilder<TValue, TValue, never> =>
      new AsyncMatchBuilderImpl<TValue, TValue, never>(value, UNMATCHED_ASYNC_STATE),
  },
)

export type { MatchedValue }
