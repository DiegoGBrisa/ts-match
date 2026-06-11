import { describe, expect, it } from 'vitest'
import { matchBy, NonExhaustiveMatchError } from '../../index.js'

describe('matchBy behavior', () => {
  it('rejects matchBy.promise normal terminals and catches failures with safe terminals', async () => {
    const inputError = new Error('input failed')
    const pathError = new Error('path failed')
    const handlerError = new Error('handler failed')
    const fallbackError = new Error('fallback failed')
    const throwingPath: { readonly meta: { readonly type: 'a' } } = {
      get meta(): { readonly type: 'a' } {
        throw pathError
      },
    }

    const rejectedEvent = Promise.reject<{ readonly type: 'a' }>(inputError)
    let fallbackCalled = false
    await expect(
      matchBy.promise(rejectedEvent, 'type').otherwise(() => {
        fallbackCalled = true
        return 0
      }),
    ).rejects.toBe(inputError)
    expect(fallbackCalled).toBe(false)
    await expect(matchBy.promise(Promise.resolve(throwingPath), 'meta.type').otherwise(() => 0)).rejects.toBe(pathError)
    await expect(
      matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').cases({
        a: () => {
          throw handlerError
        },
      }),
    ).rejects.toBe(handlerError)
    await expect(
      matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').cases({
        a: () => Promise.reject(handlerError),
      }),
    ).rejects.toBe(handlerError)
    await expect(
      // @ts-expect-error runtime coverage for non-exhaustive promise case maps
      matchBy.promise(Promise.resolve({ type: 'b' }), 'type').cases({ a: () => 1 }),
    ).rejects.toThrow(NonExhaustiveMatchError)

    await expect(
      matchBy
        .promise(Promise.resolve({ type: 'a' as const }), 'type')
        .with('a', () => Promise.resolve(1))
        .safeExhaustive(),
    ).resolves.toEqual({ ok: true, value: 1 })
    await expect(
      matchBy
        .promise(Promise.resolve({ type: 'a' as const }), 'type')
        .with('a', () => {
          throw handlerError
        })
        .safeExhaustive(),
    ).resolves.toEqual({ ok: false, error: handlerError })
    await expect(
      matchBy
        .promise(Promise.resolve({ type: 'a' as const }), 'type')
        .with('a', () => Promise.reject(handlerError))
        .safeExhaustive(),
    ).resolves.toEqual({ ok: false, error: handlerError })
    const rejectedSafeEvent = Promise.reject<{ readonly type: 'a' }>(inputError)
    await expect(matchBy.promise(rejectedSafeEvent, 'type').safeOtherwise(() => 0)).resolves.toEqual({
      ok: false,
      error: inputError,
    })
    await expect(matchBy.promise(Promise.resolve(throwingPath), 'meta.type').safeOtherwise(() => 0)).resolves.toEqual({
      ok: false,
      error: pathError,
    })
    const missingEvent = ((): { readonly type: 'known' } | { readonly type: 'missing' } => ({ type: 'missing' }))()
    await expect(
      matchBy
        .promise(Promise.resolve(missingEvent), 'type')
        .with('known', () => 1)
        .safeOtherwise(() => 2),
    ).resolves.toEqual({ ok: true, value: 2 })
    await expect(
      matchBy
        .promise(Promise.resolve(missingEvent), 'type')
        .with('known', () => 1)
        .safeOtherwise(() => {
          throw fallbackError
        }),
    ).resolves.toEqual({ ok: false, error: fallbackError })
    await expect(
      matchBy
        .promise(Promise.resolve(missingEvent), 'type')
        .with('known', () => 1)
        .safeOtherwise(() => Promise.reject(fallbackError)),
    ).resolves.toEqual({ ok: false, error: fallbackError })

    const defensiveBuilder = matchBy
      .promise(
        Promise.resolve(((): { readonly type: 'known' } | { readonly type: 'missing' } => ({ type: 'missing' }))()),
        'type',
      )
      .with('known', () => 1)
    // @ts-expect-error runtime coverage for defensive promise non-exhaustive matchBy data
    const defensive = await defensiveBuilder.safeExhaustive()
    expect(defensive.ok).toBe(false)
    if (defensive.ok) throw new Error('Expected failed safe result')
    expect(defensive.error).toBeInstanceOf(NonExhaustiveMatchError)
  })
})
