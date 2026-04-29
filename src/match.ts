import { NonExhaustiveMatchError } from './errors.js'
import { attemptMatch } from './runtime.js'
import type {
  AwaitedReturn,
  HandlerInput,
  MatchPatternArgument,
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

const UNMATCHED_SYNC_STATE: SyncMatchState = { matched: false }
const UNMATCHED_ASYNC_STATE: AsyncMatchState = { matched: false }

function assertFunction(value: unknown, label: string): asserts value is UnknownHandler {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

function assertPredicate(value: unknown, label: string): asserts value is UnknownPredicate {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function.`)
}

function splitPatternsAndHandler(args: readonly unknown[]): {
  readonly patterns: readonly unknown[]
  readonly handler: UnknownHandler
} {
  if (args.length < 2) throw new TypeError('match(...).with(...) requires a pattern and handler.')

  const handler = args[args.length - 1]
  assertFunction(handler, 'match(...).with(...) handler')
  return { patterns: args.slice(0, -1), handler }
}

function evaluateSyncPatternState(value: unknown, state: SyncMatchState, args: readonly unknown[]): SyncMatchState {
  const { patterns, handler } = splitPatternsAndHandler(args)
  if (state.matched) return state

  const attempt = attemptMatch(value, patterns)
  if (!attempt.matched) return UNMATCHED_SYNC_STATE
  return { matched: true, value: handler(attempt.payload) }
}

function callAsyncHandler(handler: UnknownHandler, value: unknown): Promise<unknown> {
  try {
    return Promise.resolve(handler(value))
  } catch (error) {
    return Promise.reject(error)
  }
}

function evaluateAsyncPatternState(value: unknown, state: AsyncMatchState, args: readonly unknown[]): AsyncMatchState {
  const { patterns, handler } = splitPatternsAndHandler(args)
  if (state.matched) return state

  const attempt = attemptMatch(value, patterns)
  if (!attempt.matched) return UNMATCHED_ASYNC_STATE
  return { matched: true, value: callAsyncHandler(handler, attempt.payload) }
}

export interface SyncMatchBuilder<TValue, TRemaining, TOutput> {
  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): SyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): SyncMatchBuilder<TValue, Exclude<TRemaining, TGuarded>, TOutput | TResult>

  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): SyncMatchBuilder<TValue, TRemaining, TOutput | TResult>

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): TOutput | TResult

  exhaustive(
    this: SyncMatchBuilder<TValue, TRemaining, TOutput> & NonExhaustiveMatchArgument<TRemaining, 'match'>,
  ): TOutput
}

export interface AsyncMatchBuilder<TValue, TRemaining, TOutput> {
  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): AsyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>

  with<const TPatterns extends readonly [unknown, unknown, ...unknown[]], const TResult>(
    ...args: [
      ...patterns: MatchPatternArgs<TRemaining, TPatterns>,
      handler: (value: HandlerInput<TRemaining, NoInferValue<TPatterns[number]>>) => TResult,
    ]
  ): AsyncMatchBuilder<TValue, RemainingAfterPatterns<TRemaining, TPatterns[number]>, TOutput | TResult>

  when<TGuarded extends TRemaining, const TResult>(
    predicate: (value: TRemaining) => value is TGuarded,
    handler: (value: TGuarded) => TResult,
  ): AsyncMatchBuilder<TValue, Exclude<TRemaining, TGuarded>, TOutput | TResult>

  when<const TResult>(
    predicate: (value: TRemaining) => boolean,
    handler: (value: TRemaining) => TResult,
  ): AsyncMatchBuilder<TValue, TRemaining, TOutput | TResult>

  otherwise<const TResult>(handler: (value: TRemaining) => TResult): Promise<AwaitedReturn<TOutput | TResult>>

  exhaustive(
    this: AsyncMatchBuilder<TValue, TRemaining, TOutput> & NonExhaustiveMatchArgument<TRemaining, 'match.async'>,
  ): Promise<AwaitedReturn<TOutput>>
}

class SyncMatchBuilderImpl<TValue, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly state: SyncMatchState,
  ) {}

  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): SyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
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

class AsyncMatchBuilderImpl<TValue, TRemaining, TOutput> {
  constructor(
    private readonly value: TValue,
    private readonly state: AsyncMatchState,
  ) {}

  with<const TPattern, const TResult>(
    pattern: TPattern & MatchPatternArgument<TRemaining, TPattern>,
    handler: (value: HandlerInput<TRemaining, NoInferValue<TPattern>>) => TResult,
  ): AsyncMatchBuilder<TValue, RemainingAfterPattern<TRemaining, TPattern>, TOutput | TResult>
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

export interface MatchFunction {
  <const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never>
  async<const TValue>(value: TValue): AsyncMatchBuilder<TValue, TValue, never>
}

export const match: MatchFunction = Object.assign(
  <const TValue>(value: TValue): SyncMatchBuilder<TValue, TValue, never> =>
    new SyncMatchBuilderImpl<TValue, TValue, never>(value, UNMATCHED_SYNC_STATE),
  {
    async: <const TValue>(value: TValue): AsyncMatchBuilder<TValue, TValue, never> =>
      new AsyncMatchBuilderImpl<TValue, TValue, never>(value, UNMATCHED_ASYNC_STATE),
  },
)

export type { MatchedValue }
