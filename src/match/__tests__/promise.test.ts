import { describe, expect, it } from 'vitest'
import { match, NonExhaustiveMatchError, P } from '../../index.js'

function enumerableKeys(value: unknown): string[] {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    throw new TypeError('Expected an object for enumerable key inspection.')
  }
  return Object.keys(value)
}

describe('match terminal behavior', () => {
  it('uses otherwise for unmatched values', () => {
    const other: string = 'other'
    expect(
      match(other)
        .with('known', () => 1)
        .otherwise((value) => value.length),
    ).toBe(5)
  })

  it('throws NonExhaustiveMatchError with non-enumerable raw value', () => {
    const value = { type: 'missing' }
    let error: unknown

    try {
      // @ts-expect-error runtime coverage for impossible non-exhaustive data
      match(value).exhaustive()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(NonExhaustiveMatchError)
    expect(error).toMatchObject({ name: 'NonExhaustiveMatchError', matcher: 'match' })
    expect(enumerableKeys(error)).not.toContain('value')
    if (!(error instanceof NonExhaustiveMatchError)) throw new Error('Expected NonExhaustiveMatchError')
    expect(error.value).toBe(value)
  })

  it('resolves match.promise input values and normalizes handler outputs', async () => {
    const terminal = match
      .promise(Promise.resolve('x' as const))
      .with('x', () => Promise.resolve(1))
      .exhaustive()

    expect(terminal).toBeInstanceOf(Promise)
    await expect(terminal).resolves.toBe(1)

    const maybeValue: 'x' | PromiseLike<'x'> = 'x'
    await expect(
      match
        .promise(maybeValue)
        .with('x', () => 2)
        .exhaustive(),
    ).resolves.toBe(2)

    const nested = new Promise<Promise<'x'>>((resolve) => resolve(Promise.resolve('x')))
    await expect(
      match
        .promise(nested)
        .with('x', () => 3)
        .exhaustive(),
    ).resolves.toBe(3)

    class StringThenable implements PromiseLike<'x'> {
      then<TResult1 = 'x', TResult2 = never>(
        onfulfilled?: ((value: 'x') => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve('x' as const).then(onfulfilled, onrejected)
      }
    }

    await expect(
      match
        .promise(new StringThenable())
        .with('x', () => 4)
        .exhaustive(),
    ).resolves.toBe(4)
  })

  it('reports promise-specific .with(...) validation labels', () => {
    expect(() => {
      // @ts-expect-error runtime validation for missing promise .with(...) handler
      match.promise(Promise.resolve('x' as const)).with('x')
    }).toThrow('match.promise(...).with(...) requires a pattern and handler.')

    expect(() => {
      // @ts-expect-error runtime validation rejects non-function promise .with(...) handlers
      match.promise(Promise.resolve('x' as const)).with('x', 'not a handler')
    }).toThrow('match.promise(...).with(...) handler must be a function.')
  })

  it('rejects invalid match.promise fallback handlers through the returned promise', async () => {
    // @ts-expect-error runtime validation rejects non-function promise fallback handlers
    const terminal = match.promise(Promise.resolve('x' as const)).otherwise('not a handler')

    expect(terminal).toBeInstanceOf(Promise)
    await expect(terminal).rejects.toThrow('match.promise(...).otherwise(...) handler must be a function.')
  })

  it('rejects match.promise normal terminals for input, predicate, handler, and exhaustive failures', async () => {
    const inputError = new Error('input failed')
    const predicateError = new Error('predicate failed')
    const handlerError = new Error('handler failed')

    await expect(match.promise(Promise.reject(inputError)).otherwise(() => 0)).rejects.toBe(inputError)

    let fallbackCalled = false
    await expect(
      match.promise(Promise.reject(inputError)).otherwise(() => {
        fallbackCalled = true
        return 0
      }),
    ).rejects.toBe(inputError)
    expect(fallbackCalled).toBe(false)

    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with(
          P.when(() => {
            throw predicateError
          }),
          () => 1,
        )
        .otherwise(() => 0),
    ).rejects.toBe(predicateError)

    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', () => {
          throw handlerError
        })
        .exhaustive(),
    ).rejects.toBe(handlerError)

    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', () => Promise.reject(handlerError))
        .exhaustive(),
    ).rejects.toBe(handlerError)

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
        .otherwise(() => 0),
    ).rejects.toBe(getterError)

    // @ts-expect-error runtime coverage for impossible promise non-exhaustive data
    await expect(match.promise(Promise.resolve('x' as const)).exhaustive()).rejects.toThrow(NonExhaustiveMatchError)
  })
})
