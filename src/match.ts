import { NonExhaustiveMatchError } from './errors.js'
import { evaluatePromiseExhaustive, evaluatePromiseOtherwise, safeResult } from './promise-runtime.js'
import { attemptMatch } from './runtime.js'
import type {
  AwaitedReturn,
  BuiltInPattern,
  HandlerInput,
  MatchPatternArgument,
  MatchPatternSuggestion,
  MatchPromiseResult,
  MatchedValue,
  NonExhaustiveMatchArgument,
  RemainingAfterPattern,
  RemainingAfterPatterns,
} from './types.js'

type UnknownHandler = (value: unknown) => unknown
type UnknownPredicate = (value: unknown) => boolean

type SyncMatchState = { readonly matched: false } | { readonly matched: true; readonly value: unknown }

type PromiseMatchClause =
  | {
      readonly type: 'patterns'
      readonly patterns: readonly unknown[]
      readonly handler: UnknownHandler
    }
  | {
      readonly type: 'predicate'
      readonly predicate: UnknownPredicate
      readonly handler: UnknownHandler
    }

type NoInferValue<T> = [T][T extends unknown ? 0 : never]

type MatchPatternArgs<TValue, TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: TPatterns[K] & MatchPatternArgument<TValue, TPatterns[K]>
}

type SuggestedPattern<TPattern> = TPattern extends BuiltInPattern ? never : TPattern

type SuggestedPatternArgs<TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: SuggestedPattern<TPatterns[K]>
}

const UNMATCHED_SYNC_STATE: SyncMatchState = { matched: false }

/** Validates that an unknown runtime argument is callable before using it as a handler. */
function assertFunction(value: unknown, label: string): asserts value is UnknownHandler {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

/** Validates that an unknown runtime argument is callable before using it as a predicate. */
function assertPredicate(value: unknown, label: string): asserts value is UnknownPredicate {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

/** Splits a variadic `.with(...)` call into patterns and a trailing handler. */
function splitPatternsAndHandler(
  args: readonly unknown[],
  apiLabel: 'match(...).with(...)' | 'match.promise(...).with(...)',
): {
  readonly patterns: readonly unknown[]
  readonly handler: UnknownHandler
} {
  if (args.length < 2) throw new TypeError(`${apiLabel} requires a pattern and handler.`)

  const handler = args[args.length - 1]
  assertFunction(handler, `${apiLabel} handler`)
  return { patterns: args.slice(0, -1), handler }
}

/** Evaluates one synchronous `.with(...)` clause against the current match state. */
function evaluateSyncPatternState(value: unknown, state: SyncMatchState, args: readonly unknown[]): SyncMatchState {
  const { patterns, handler } = splitPatternsAndHandler(args, 'match(...).with(...)')
  if (state.matched) return state

  const attempt = attemptMatch(value, patterns)
  if (!attempt.matched) return UNMATCHED_SYNC_STATE
  return { matched: true, value: handler(attempt.payload) }
}

/** Normalizes promise handler execution so sync throws become rejections and thenables are awaited. */
function callPromiseHandler(handler: UnknownHandler, value: unknown): Promise<unknown> {
  try {
    return Promise.resolve(handler(value))
  } catch (error) {
    return Promise.reject(error)
  }
}

/** Evaluates stored promise-match clauses after the input value has been resolved. */
function evaluatePromiseClauses(
  value: unknown,
  clauses: readonly PromiseMatchClause[],
  exhaustive: boolean,
  fallback: UnknownHandler | undefined,
): unknown {
  for (const clause of clauses) {
    if (clause.type === 'patterns') {
      const attempt = attemptMatch(value, clause.patterns)
      if (attempt.matched) return callPromiseHandler(clause.handler, attempt.payload)
      continue
    }

    if (clause.predicate(value)) return callPromiseHandler(clause.handler, value)
  }

  if (!exhaustive && fallback) return callPromiseHandler(fallback, value)
  throw new NonExhaustiveMatchError(value, { matcher: 'match' })
}

/**
 * Fluent synchronous matcher returned by `match(value)`.
 *
 * Add branches with `.with(...)` and `.when(...)`, then finish with
 * `.exhaustive()` for closed unions or `.otherwise(...)` for an explicit
 * fallback. The builder tracks remaining union members so exhaustive terminals
 * can report missing cases at compile time.
 */
export interface SyncMatchBuilder<TValue, TRemaining, TOutput> {
  /**
   * Adds one structural pattern branch.
   *
   * The handler receives the value narrowed by the pattern. Literal patterns,
   * object patterns, tuple/array patterns, and `P.*` helpers are all supported.
   *
   * @param pattern - Pattern tested against the current value when no earlier branch matched.
   * @param handler - Handler invoked with the narrowed match payload.
   * @returns A new builder with matched cases removed from the remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#withpattern-handler
   */
  with<const TPattern extends MatchPatternSuggestion<TRemaining>, const TResult>(
    pattern: SuggestedPattern<TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  /**
   * Adds one validated structural pattern branch, including `P.*` helper patterns.
   *
   * This overload accepts the full pattern grammar and reports friendly
   * diagnostics for invalid pattern shapes. The handler receives the narrowed
   * payload selected by the pattern.
   *
   * @param pattern - Pattern or `P.*` helper tested against the current value.
   * @param handler - Handler invoked with the narrowed match payload.
   * @returns A new builder with matched cases removed from the remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#patterns
   */
  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  /**
   * Adds several alternative patterns that share one handler.
   *
   * Use this when multiple patterns should produce the same output. The handler
   * receives the union of values selected by the supplied patterns.
   *
   * @param args - Two or more patterns followed by a shared handler.
   * @returns A new builder with every supplied pattern removed from the remaining input union.
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

  /**
   * Adds several validated structural patterns, including `P.*` helper patterns.
   *
   * This overload accepts the full pattern grammar for shared-handler branches.
   * The handler receives the union of values selected by the supplied patterns.
   *
   * @param args - Two or more patterns followed by a shared handler.
   * @returns A new builder with every supplied pattern removed from the remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#patterns
   */
  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): SyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  /**
   * Adds a type-guard predicate branch.
   *
   * The predicate runs only if no previous branch matched. When it returns true,
   * the handler receives the predicate's guarded type and that guarded type is
   * removed from the remaining union.
   *
   * @param predicate - User-defined type guard evaluated against the current value.
   * @param handler - Handler invoked with the guarded value.
   * @returns A new builder with the guarded type removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#whenpredicate-handler
   */
  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): SyncMatchBuilder<TValue, Exclude<TRemaining, TGuarded>, TOutput | TResult>

  /**
   * Adds a boolean predicate branch.
   *
   * The predicate runs only if no previous branch matched. Boolean predicates do
   * not narrow the remaining union, so use a type guard when you need narrowing.
   *
   * @param predicate - Boolean predicate evaluated against the current value.
   * @param handler - Handler invoked with the current remaining value.
   * @returns A new builder with the same remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#whenpredicate-handler
   */
  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): SyncMatchBuilder<TValue, TRemaining, TOutput | TResult>

  /**
   * Finishes the match with an explicit fallback handler.
   *
   * Use `.otherwise(...)` when a default branch is intentional. The fallback
   * receives the value narrowed to any variants not already covered by `.with(...)`
   * or type-guard `.when(...)` branches.
   *
   * @param handler - Fallback invoked when no previous branch matched.
   * @returns Matched branch output or fallback output.
   * @see https://github.com/DiegoGBrisa/ts-match#otherwisehandler
   */
  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult

  /**
   * Finishes the match and requires all known cases to be covered.
   *
   * `.exhaustive()` is only callable when TypeScript can prove every remaining
   * variant is handled. At runtime it still throws `NonExhaustiveMatchError` if
   * unexpected external data reaches the terminal.
   *
   * @returns Matched branch output.
   * @throws {NonExhaustiveMatchError} When no branch handles the runtime value.
   * @see https://github.com/DiegoGBrisa/ts-match#exhaustive
   * @see https://github.com/DiegoGBrisa/ts-match#missing-exhaustive-cases
   */
  exhaustive(
    this: SyncMatchBuilder<TValue, TRemaining, TOutput> & NonExhaustiveMatchArgument<TRemaining, 'match'>,
  ): TOutput
}

/**
 * Fluent promise-aware matcher returned by `match.promise(valueOrPromise)`.
 *
 * The input is resolved only by terminal methods. Handlers receive
 * `Awaited<TInput>`, may return sync or promise-like values, and terminals return
 * one normalized promise. Safe terminals wrap success or failure in
 * `MatchPromiseResult` instead of rejecting.
 */
export interface PromiseMatchBuilder<TInput, TRemaining, TOutput> {
  /**
   * Adds one structural pattern branch to a promise-aware matcher.
   *
   * Terminal methods resolve the input first; this handler receives the resolved
   * value narrowed by the pattern. Handler return values may be sync or promise-like.
   *
   * @param pattern - Pattern tested against the resolved value when no earlier branch matched.
   * @param handler - Handler invoked with the narrowed resolved match payload.
   * @returns A new promise builder with matched cases removed from the remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  with<const TPattern extends MatchPatternSuggestion<TRemaining>, const TResult>(
    pattern: SuggestedPattern<TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): PromiseMatchBuilder<TInput, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  /**
   * Adds one validated structural pattern branch, including `P.*` helper patterns.
   *
   * Terminal methods resolve the input first. This overload accepts the full
   * pattern grammar and reports friendly diagnostics for invalid pattern shapes.
   *
   * @param pattern - Pattern or `P.*` helper tested against the resolved value.
   * @param handler - Handler invoked with the narrowed resolved match payload.
   * @returns A new promise builder with matched cases removed from the remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): PromiseMatchBuilder<TInput, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  /**
   * Adds several alternative patterns that share one promise-aware handler.
   *
   * Use this when multiple resolved-value patterns should produce the same output.
   * The handler receives the union of values selected by the supplied patterns.
   *
   * @param args - Two or more patterns followed by a shared handler.
   * @returns A new promise builder with every supplied pattern removed from the remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
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
  ): PromiseMatchBuilder<TInput, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  /**
   * Adds several validated structural patterns, including `P.*` helper patterns.
   *
   * Terminal methods resolve the input first. This overload accepts the full
   * pattern grammar for shared-handler branches.
   *
   * @param args - Two or more patterns followed by a shared handler.
   * @returns A new promise builder with every supplied pattern removed from the remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): PromiseMatchBuilder<TInput, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  /**
   * Adds a type-guard predicate branch to a promise-aware matcher.
   *
   * The predicate runs against the resolved input only if no previous branch
   * matched. When it returns true, the handler receives the predicate's guarded type.
   *
   * @param predicate - User-defined type guard evaluated against the resolved value.
   * @param handler - Handler invoked with the guarded resolved value.
   * @returns A new promise builder with the guarded type removed from the remaining union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): PromiseMatchBuilder<TInput, Exclude<TRemaining, TGuarded>, TOutput | TResult>

  /**
   * Adds a boolean predicate branch to a promise-aware matcher.
   *
   * The predicate runs against the resolved input only if no previous branch
   * matched. Boolean predicates do not narrow the remaining union.
   *
   * @param predicate - Boolean predicate evaluated against the resolved value.
   * @param handler - Handler invoked with the current remaining resolved value.
   * @returns A new promise builder with the same remaining input union.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): PromiseMatchBuilder<TInput, TRemaining, TOutput | TResult>

  /**
   * Finishes the promise match with an explicit fallback handler.
   *
   * The input is resolved first. If no branch matches the resolved value, the
   * fallback runs and its value or promise-like value is awaited. Input rejection
   * is not caught by `.otherwise(...)`; use `.safeOtherwise(...)` when failures
   * should become values.
   *
   * @param handler - Fallback invoked when no previous branch matched.
   * @returns Promise of matched branch output or fallback output.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>

  /**
   * Safe fallback terminal that resolves to a result object instead of rejecting.
   *
   * Catches input rejection, pattern/predicate errors, handler throws/rejections,
   * fallback throws/rejections, and defensive non-exhaustiveness. The fallback is
   * still required and only runs after the input resolves and no branch matches.
   *
   * @param handler - Fallback invoked when no previous branch matched.
   * @returns Promise resolving to `{ ok: true, value }` or `{ ok: false, error }`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  safeOtherwise<const TResult>(
    handler: (value: TRemaining) => TResult,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput | TResult>>>

  /**
   * Finishes the promise match and requires all known cases to be covered.
   *
   * The input is resolved first, then matched exactly like sync `.exhaustive()`.
   * Handler values and promise-like handler results are awaited. Runtime failures
   * reject the returned promise.
   *
   * @returns Promise of the matched branch output.
   * @throws {NonExhaustiveMatchError} Via promise rejection when no branch handles the runtime value.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  exhaustive(
    this: PromiseMatchBuilder<TInput, TRemaining, TOutput> & NonExhaustiveMatchArgument<TRemaining, 'match.promise'>,
  ): Promise<AwaitedReturn<TOutput>>

  /**
   * Safe exhaustive terminal with the same compile-time exhaustiveness gate as `.exhaustive()`.
   *
   * Use this for closed unions when operational failures should be returned as
   * values. It catches input rejection, pattern/predicate errors, handler
   * throws/rejections, and defensive `NonExhaustiveMatchError` failures.
   *
   * @returns Promise resolving to `{ ok: true, value }` or `{ ok: false, error }`.
   * @see https://github.com/DiegoGBrisa/ts-match#matchpromise
   */
  safeExhaustive(
    this: PromiseMatchBuilder<TInput, TRemaining, TOutput> & NonExhaustiveMatchArgument<TRemaining, 'match.promise'>,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput>>>
}

/** Runtime implementation for synchronous match chains. */
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

/** Runtime implementation for promise-aware match chains. */
class PromiseMatchBuilderImpl<TInput, TRemaining, TOutput> {
  constructor(
    private readonly input: TInput,
    private readonly clauses: readonly PromiseMatchClause[],
  ) {}

  with<const TPattern extends MatchPatternSuggestion<TRemaining>, const TResult>(
    pattern: SuggestedPattern<TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): PromiseMatchBuilder<TInput, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): PromiseMatchBuilder<TInput, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
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
  ): PromiseMatchBuilder<TInput, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>
  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): PromiseMatchBuilder<TInput, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>
  with(...args: readonly unknown[]): PromiseMatchBuilder<TInput, unknown, TOutput | unknown> {
    const { patterns, handler } = splitPatternsAndHandler(args, 'match.promise(...).with(...)')
    return new PromiseMatchBuilderImpl<TInput, unknown, TOutput | unknown>(this.input, [
      ...this.clauses,
      { type: 'patterns', patterns, handler },
    ])
  }

  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): PromiseMatchBuilder<TInput, Exclude<TRemaining, TGuarded>, TOutput | TResult>
  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): PromiseMatchBuilder<TInput, TRemaining, TOutput | TResult>
  when(predicate: unknown, handler: unknown): PromiseMatchBuilder<TInput, unknown, TOutput | unknown> {
    assertPredicate(predicate, 'match.promise(...).when(...) predicate')
    assertFunction(handler, 'match.promise(...).when(...) handler')
    return new PromiseMatchBuilderImpl<TInput, unknown, TOutput | unknown>(this.input, [
      ...this.clauses,
      { type: 'predicate', predicate, handler },
    ])
  }

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>
  otherwise(handler: unknown): Promise<unknown> {
    return this.otherwiseUnchecked(handler)
  }

  safeOtherwise<const TResult>(
    handler: (value: TRemaining) => TResult,
  ): Promise<MatchPromiseResult<AwaitedReturn<TOutput | TResult>>>
  safeOtherwise(handler: unknown): Promise<MatchPromiseResult<unknown>> {
    return safeResult(() => this.otherwiseUnchecked(handler))
  }

  private otherwiseUnchecked(handler: unknown): Promise<unknown> {
    return evaluatePromiseOtherwise(
      this.input,
      handler,
      assertFunction,
      'match.promise(...).otherwise(...) handler',
      (value, fallback) => evaluatePromiseClauses(value, this.clauses, false, fallback),
    )
  }

  exhaustive(): Promise<AwaitedReturn<TOutput>>
  exhaustive(): Promise<unknown> {
    return evaluatePromiseExhaustive(this.input, (value) =>
      evaluatePromiseClauses(value, this.clauses, true, undefined),
    )
  }

  safeExhaustive(): Promise<MatchPromiseResult<AwaitedReturn<TOutput>>>
  safeExhaustive(): Promise<MatchPromiseResult<unknown>> {
    return safeResult(() => this.exhaustive())
  }
}

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
  <const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never> =>
    new SyncMatchBuilderImpl<TValue, TValue, never>(value, UNMATCHED_SYNC_STATE),
  {
    promise: <const TInput>(value: TInput): PromiseMatchBuilder<TInput, Awaited<TInput>, never> =>
      new PromiseMatchBuilderImpl<TInput, Awaited<TInput>, never>(value, []),
  },
)

/** Advanced helper types re-exported from the `match` subpath. */
export type { MatchedValue, MatchPromiseResult }
