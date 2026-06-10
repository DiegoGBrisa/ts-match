import { describe, expect, it } from 'vitest'
import { match, NonExhaustiveMatchError, P } from '../../index.js'

describe('match terminal behavior', () => {
  it('wraps match.promise safe terminal results without rejecting', async () => {
    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', () => Promise.resolve(1))
        .safeExhaustive(),
    ).resolves.toEqual({ ok: true, value: 1 })

    const inputError = new Error('input failed')
    const handlerError = new Error('handler failed')
    const fallbackError = new Error('fallback failed')

    await expect(match.promise(Promise.reject(inputError)).safeOtherwise(() => 0)).resolves.toEqual({
      ok: false,
      error: inputError,
    })

    const predicateError = new Error('predicate failed')
    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with(
          P.when(() => {
            throw predicateError
          }),
          () => 1,
        )
        .safeOtherwise(() => 0),
    ).resolves.toEqual({ ok: false, error: predicateError })

    const getterError = new Error('getter failed')
    const throwingValue: { readonly type: 'x' } = {
      get type(): 'x' {
        throw getterError
      },
    }
    await expect(
      match
        .promise(Promise.resolve(throwingValue))
        .with({ type: 'x' }, () => 1)
        .safeOtherwise(() => 0),
    ).resolves.toEqual({ ok: false, error: getterError })

    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', () => {
          throw handlerError
        })
        .safeExhaustive(),
    ).resolves.toEqual({ ok: false, error: handlerError })

    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', () => Promise.reject(handlerError))
        .safeExhaustive(),
    ).resolves.toEqual({ ok: false, error: handlerError })

    const fallbackInput = ((): 'x' | 'missing' => 'missing')()
    await expect(
      match
        .promise(Promise.resolve(fallbackInput))
        .with('x', () => 1)
        .safeOtherwise(() => 2),
    ).resolves.toEqual({ ok: true, value: 2 })
    await expect(
      match
        .promise(Promise.resolve(fallbackInput))
        .with('x', () => 1)
        .safeOtherwise(() => {
          throw fallbackError
        }),
    ).resolves.toEqual({ ok: false, error: fallbackError })
    await expect(
      match
        .promise(Promise.resolve(fallbackInput))
        .with('x', () => 1)
        .safeOtherwise(() => Promise.reject(fallbackError)),
    ).resolves.toEqual({ ok: false, error: fallbackError })

    // @ts-expect-error runtime coverage for defensive promise non-exhaustive data
    const defensive = await match.promise(Promise.resolve('missing' as const)).safeExhaustive()
    expect(defensive.ok).toBe(false)
    if (defensive.ok) throw new Error('Expected failed safe result')
    expect(defensive.error).toBeInstanceOf(NonExhaustiveMatchError)
  })
})
