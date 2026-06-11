import type {
  AwaitedReturn,
  BuiltInPattern,
  HandlerInput,
  MatchPatternArgument,
  MatchPatternSuggestion,
  MatchPromiseResult,
  NonExhaustiveMatchArgument,
  RemainingAfterPattern,
  RemainingAfterPatterns,
} from '../types/index.js'

type NoInferValue<T> = [T][T extends unknown ? 0 : never]

type MatchPatternArgs<TValue, TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: TPatterns[K] & MatchPatternArgument<TValue, TPatterns[K]>
}

type SuggestedPattern<TPattern> = TPattern extends BuiltInPattern ? never : TPattern

type SuggestedPatternArgs<TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: SuggestedPattern<TPatterns[K]>
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
