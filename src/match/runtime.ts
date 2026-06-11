import { NonExhaustiveMatchError } from '../errors/index.js'
import { evaluatePromiseExhaustive, evaluatePromiseOtherwise, safeResult } from '../promise/index.js'
import { attemptMatch } from '../runtime/index.js'
import type {
  AwaitedReturn,
  BuiltInPattern,
  HandlerInput,
  MatchPatternArgument,
  MatchPatternSuggestion,
  MatchPromiseResult,
  RemainingAfterPattern,
  RemainingAfterPatterns,
} from '../types/index.js'
import type { PromiseMatchBuilder } from './promise-builder.js'
import type { SyncMatchBuilder } from './sync-builder.js'

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

const MIN_WITH_ARGUMENTS = 2
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
  if (args.length < MIN_WITH_ARGUMENTS) throw new TypeError(`${apiLabel} requires a pattern and handler.`)

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

export function createSyncMatchBuilder<const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never> {
  return new SyncMatchBuilderImpl<TValue, TValue, never>(value, UNMATCHED_SYNC_STATE)
}

export function createPromiseMatchBuilder<const TInput>(
  value: TInput,
): PromiseMatchBuilder<TInput, Awaited<TInput>, never> {
  return new PromiseMatchBuilderImpl<TInput, Awaited<TInput>, never>(value, [])
}
