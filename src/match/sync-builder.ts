import type {
  BuiltInPattern,
  HandlerInput,
  MatchPatternArgument,
  MatchPatternSuggestion,
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
