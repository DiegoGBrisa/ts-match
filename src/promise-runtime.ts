import type { MatchPromiseResult } from './types.js'

export type PromiseTerminalHandler = (value: unknown) => unknown
export type PromiseTerminalHandlerAssertion = (value: unknown, label: string) => asserts value is PromiseTerminalHandler

/** Converts a promise-producing operation into a resolved discriminated safe result. */
export function safeResult(operation: () => Promise<unknown>): Promise<MatchPromiseResult<unknown>> {
  try {
    return operation().then(
      (value) => ({ ok: true, value }),
      (error: unknown) => ({ ok: false, error }),
    )
  } catch (error) {
    return Promise.resolve({ ok: false, error })
  }
}

/** Resolves a maybe-promise input before evaluating a promise matcher fallback terminal. */
export function evaluatePromiseOtherwise(
  input: unknown,
  handler: unknown,
  assertHandler: PromiseTerminalHandlerAssertion,
  handlerLabel: string,
  evaluate: (value: unknown, fallback: PromiseTerminalHandler) => unknown,
): Promise<unknown> {
  assertHandler(handler, handlerLabel)
  return Promise.resolve(input).then((value) => evaluate(value, handler))
}

/** Resolves a maybe-promise input before evaluating an exhaustive promise matcher terminal. */
export function evaluatePromiseExhaustive(input: unknown, evaluate: (value: unknown) => unknown): Promise<unknown> {
  return Promise.resolve(input).then(evaluate)
}
