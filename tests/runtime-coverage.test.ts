import { describe, expect, it } from 'vitest'
import {
  assertMatching,
  isMatching,
  match,
  matchBy,
  NonExhaustiveMatchError,
  P,
  PatternMismatchError,
  pAny,
  pArray,
  pBigint,
  pBoolean,
  pExact,
  pExclude,
  pFinite,
  pInstanceOf,
  pInteger,
  pNan,
  pNonEmptyArray,
  pNonEmptyRecord,
  pNull,
  pNumber,
  pOptional,
  pRecord,
  pRest,
  pSelect,
  pString,
  pSymbol,
  pTuple,
  pUndefined,
  pUnion,
  pWhen,
  pWildcard,
} from '../src/index.js'

function enumerableKeys(value: unknown): string[] {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    throw new TypeError('Expected an object for enumerable key inspection.')
  }
  return Object.keys(value)
}

describe('P namespace and named p* exports', () => {
  it('exports named helpers matching the P namespace', () => {
    expect(pWildcard).toBe(P._)
    expect(pAny).toBe(P.any)
    expect(pString).toBe(P.string)
    expect(pNumber).toBe(P.number)
    expect(pBoolean).toBe(P.boolean)
    expect(pBigint).toBe(P.bigint)
    expect(pSymbol).toBe(P.symbol)
    expect(pNull).toBe(P.null)
    expect(pUndefined).toBe(P.undefined)
    expect(pNan).toBe(P.nan)
    expect(pFinite).toBe(P.finite)
    expect(pInteger).toBe(P.integer)
    expect(pUnion).toBe(P.union)
    expect(pExclude).toBe(P.exclude)
    expect(pOptional).toBe(P.optional)
    expect(pArray).toBe(P.array)
    expect(pNonEmptyArray).toBe(P.nonEmptyArray)
    expect(pTuple).toBe(P.tuple)
    expect(pRest).toBe(P.rest)
    expect(pExact).toBe(P.exact)
    expect(pWhen).toBe(P.when)
    expect(pInstanceOf).toBe(P.instanceOf)
    expect(pSelect).toBe(P.select)
    expect(pRecord).toBe(P.record)
    expect(pNonEmptyRecord).toBe(P.nonEmptyRecord)
  })
})

describe('pattern helpers', () => {
  it('matches wildcard, literals, primitive helpers, null, undefined, booleans, symbols, and bigint', () => {
    const symbol = Symbol('s')

    expect(
      match('anything')
        .with(P._, () => true)
        .exhaustive(),
    ).toBe(true)
    expect(
      match(1n)
        .with(1n, () => 'bigint')
        .otherwise(() => 'no'),
    ).toBe('bigint')
    expect(
      match(symbol)
        .with(symbol, () => 'symbol')
        .otherwise(() => 'no'),
    ).toBe('symbol')
    expect(
      match(null)
        .with(P.null, () => 'null')
        .otherwise(() => 'no'),
    ).toBe('null')
    expect(
      match(undefined)
        .with(P.undefined, () => 'undefined')
        .otherwise(() => 'no'),
    ).toBe('undefined')
    expect(
      match(false)
        .with(P.boolean, () => 'boolean')
        .otherwise(() => 'no'),
    ).toBe('boolean')
  })

  it('matches union and exclude patterns', () => {
    expect(
      match('warning')
        .with(P.union('error', 'warning'), () => 'alert')
        .otherwise(() => 'noop'),
    ).toBe('alert')
    function getLevel(): 'info' | 'error' {
      return 'info'
    }
    expect(
      match(getLevel())
        .with(P.exclude('error'), () => 'not-error')
        .otherwise(() => 'error'),
    ).toBe('not-error')
  })

  it('matches optional object properties', () => {
    const pattern = { name: P.optional(P.string) }

    const empty: unknown = {}
    const undefinedName: unknown = { name: undefined }
    const stringName: unknown = { name: 'Diego' }
    const numberName: unknown = { name: 1 }

    expect(
      match(empty)
        .with(pattern, () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(undefinedName)
        .with(pattern, () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(stringName)
        .with(pattern, () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(numberName)
        .with(pattern, () => true)
        .otherwise(() => false),
    ).toBe(false)
  })

  it('matches nested objects, symbol keys, and class instances structurally', () => {
    const KIND = Symbol('kind')
    class User {
      readonly role = 'admin'
      constructor(readonly name: string) {}
    }

    expect(
      match({ user: new User('Diego'), [KIND]: 'user' })
        .with({ user: { role: 'admin', name: P.string }, [KIND]: 'user' }, () => true)
        .otherwise(() => false),
    ).toBe(true)
  })

  it('supports instanceOf and predicate patterns', () => {
    const error: unknown = new TypeError('boom')

    expect(
      match(error)
        .with(P.instanceOf(TypeError), (value) => value.message)
        .otherwise(() => 'no'),
    ).toBe('boom')
    expect(
      match(10)
        .with(
          P.when((value): value is number => typeof value === 'number' && value > 5),
          () => true,
        )
        .otherwise(() => false),
    ).toBe(true)
    const broadThree: number = 3
    expect(
      match(broadThree)
        .when(
          (value): value is number => typeof value === 'number' && value > 5,
          () => true,
        )
        .otherwise(() => false),
    ).toBe(false)
  })

  it('supports arrays, non-empty arrays, tuples, rest, and nested tuples', () => {
    const emptyArray: unknown = []
    expect(
      match(emptyArray)
        .with(P.array(P.string), () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(emptyArray)
        .with(P.nonEmptyArray(P.string), () => true)
        .otherwise(() => false),
    ).toBe(false)
    expect(
      match(['a', [1, 2]])
        .with([P.string, P.tuple([P.number, P.number])], () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(['cmd', 1, 2, 3])
        .with([P.string, P.rest(P.number)], () => true)
        .otherwise(() => false),
    ).toBe(true)
  })

  it('throws on invalid rest placement and selection usage', () => {
    // @ts-expect-error runtime validation still rejects non-final P.rest placement for JavaScript callers
    expect(() => isMatching([P.rest(P.string), P.string], ['x'])).toThrow(TypeError)
    // @ts-expect-error runtime validation still rejects top-level P.rest usage for JavaScript callers
    expect(() => isMatching(P.rest(P.string), 'x')).toThrow(TypeError)
    // @ts-expect-error runtime validation still rejects duplicate anonymous selections for JavaScript callers
    expect(() => isMatching({ a: P.select(), b: P.select() }, { a: 1, b: 2 })).toThrow(TypeError)
    // @ts-expect-error runtime validation still rejects selections inside P.exclude for JavaScript callers
    expect(() => isMatching(P.exclude(P.select()), { a: 1 })).toThrow(TypeError)
  })

  it('supports records and canonical numeric keys', () => {
    expect(
      match({ 1: 'one', 2: 'two' })
        .with(P.record(P.number, P.string), () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match({ '01': 'one' })
        .with(P.record(P.number, P.string), () => true)
        .otherwise(() => false),
    ).toBe(false)
    const emptyObject: unknown = {}
    const numericArray: unknown = [1, 2]
    expect(
      match(emptyObject)
        .with(P.nonEmptyRecord(P.string, P.number), () => true)
        .otherwise(() => false),
    ).toBe(false)
    expect(
      match(numericArray)
        .with(P.record(P.string, P.number), () => true)
        .otherwise(() => false),
    ).toBe(false)
  })
})

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

describe('matchBy behavior', () => {
  it('matches direct keys, nested dot paths, tuple paths, numeric tags, boolean tags, and symbols', () => {
    const KIND = Symbol('kind')
    type Event =
      | { type: 'start'; payload: { code: 200 }; ok: true; meta: { [KIND]: 'symbol'; value: number } }
      | { type: 'stop'; payload: { code: 404 }; ok: false; reason: string }

    function getEvent(): Event {
      return { type: 'start', payload: { code: 200 }, ok: true, meta: { [KIND]: 'symbol', value: 5 } }
    }
    const event = getEvent()

    expect(matchBy(event, 'type').cases({ start: () => 'start', stop: () => 'stop' })).toBe('start')
    expect(matchBy(event, 'payload.code').cases({ 200: () => 'ok', 404: () => 'missing' })).toBe('ok')
    expect(matchBy(event, 'ok').cases({ true: () => 'yes', false: () => 'no' })).toBe('yes')

    const symbolEvent = { meta: { [KIND]: 'symbol' as const, value: 5 } }
    expect(matchBy(symbolEvent, ['meta', KIND]).cases({ symbol: (value) => value.meta.value })).toBe(5)
  })

  it('supports tuple/group cases for null and undefined discriminants', () => {
    type State = { kind: 'ready'; data: string } | { kind: null; reason: string } | { empty: true }
    const state = ((): State => ({ empty: true }))()

    expect(
      matchBy(state, 'kind').cases([
        ['ready', (value: Extract<State, { kind: 'ready' }>) => value.data],
        [null, (value: Extract<State, { kind: null }>) => value.reason],
        [undefined, (value: Extract<State, { empty: true }>) => String(value.empty)],
      ]),
    ).toBe('true')

    expect(
      matchBy(state, 'kind')
        .partial([
          ['ready', (value) => value.data],
          [[null] as const, (value) => value.reason],
        ])
        .otherwise((value) => String(value.empty)),
    ).toBe('true')
  })

  it('supports partial maps and preserves string-looking numeric/boolean keys', () => {
    const numericString = { type: '1' as const, data: 'string-key' }
    const booleanString = { type: 'true' as const, data: 'boolean-key' }

    expect(
      matchBy(numericString, 'type')
        .partial({ '1': (value) => value.data })
        .otherwise(() => 'fallback'),
    ).toBe('string-key')
    expect(
      matchBy(booleanString, 'type')
        .partial({ true: (value) => value.data })
        .otherwise(() => 'fallback'),
    ).toBe('boolean-key')
  })

  it('validates object-map handlers on the fast path', () => {
    const invalidCases = { a: 'not a function' }
    expect(() => {
      // @ts-expect-error runtime validation rejects non-function case handlers
      matchBy({ type: 'a' }, 'type').cases(invalidCases)
    }).toThrow(TypeError)
  })

  it('validates tuple-entry tags before storing cases', () => {
    expect(() => {
      // @ts-expect-error runtime validation rejects non-discriminant tuple tags
      matchBy({ type: 'a' as const }, 'type').partial([[{}, () => 1]])
    }).toThrow('group(...) tags must be discriminants.')

    expect(() => {
      matchBy({ type: 'a' as const }, 'type').partial([[[], () => 1]])
    }).toThrow('group(...) requires at least one tag.')
  })

  it('resolves matchBy.promise input values and normalizes handler outputs', async () => {
    type Event = { readonly type: 'a'; readonly value: number } | { readonly type: 'b'; readonly value: number }
    const event = ((): Event => ({ type: 'a', value: 1 }))()
    const eventPromise: Promise<Event> = Promise.resolve(event)

    class EventThenable implements PromiseLike<Event> {
      constructor(private readonly event: Event) {}

      then<TResult1 = Event, TResult2 = never>(
        onfulfilled?: ((value: Event) => TResult1 | PromiseLike<TResult1>) | null,
        _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve(this.event).then(onfulfilled, _onrejected)
      }
    }

    class RejectedEventThenable implements PromiseLike<Event> {
      constructor(private readonly error: Error) {}

      then<TResult1 = Event, TResult2 = never>(
        onfulfilled?: ((value: Event) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return Promise.reject<Event>(this.error).then(onfulfilled, onrejected)
      }
    }

    const terminal = matchBy.promise(eventPromise, 'type').cases({ a: () => Promise.resolve(1), b: () => 2 })

    expect(terminal).toBeInstanceOf(Promise)
    await expect(terminal).resolves.toBe(1)

    const nestedEvent = new Promise<Promise<Event>>((resolve) => resolve(Promise.resolve(event)))
    await expect(
      matchBy
        .promise(nestedEvent, 'type')
        .with('a', (value) => value.value + 3)
        .otherwise((value) => value.value),
    ).resolves.toBe(4)

    await expect(
      matchBy
        .promise(Promise.resolve(event), 'type')
        .cases((group) => [
          group('a', (value) => Promise.resolve(value.value + 4)),
          group('b', (value) => value.value),
        ]),
    ).resolves.toBe(5)

    await expect(
      matchBy.promise(Promise.resolve(event), 'type').cases([
        ['a', (value) => Promise.resolve(value.value + 5)],
        [['b'] as const, (value) => value.value],
      ]),
    ).resolves.toBe(6)

    await expect(
      matchBy
        .promise(Promise.resolve(event), 'type')
        .partial([['a', (value) => Promise.resolve(value.value + 6)]])
        .otherwise((value) => value.value),
    ).resolves.toBe(7)

    const maybeEvent: Event | PromiseLike<Event> = event
    await expect(
      matchBy
        .promise(maybeEvent, 'type')
        .with('a', (value) => value.value + 1)
        .otherwise((value) => value.value + 2),
    ).resolves.toBe(2)

    await expect(
      matchBy.promise(new EventThenable(event), 'type').cases({ a: (value) => value.value + 2, b: () => 0 }),
    ).resolves.toBe(3)

    const thenableError = new Error('thenable failed')
    await expect(
      matchBy.promise(new RejectedEventThenable(thenableError), 'type').safeOtherwise(() => 0),
    ).resolves.toEqual({ ok: false, error: thenableError })
  })

  it('reports matchBy.promise-specific .with(...) validation labels', () => {
    expect(() => {
      // @ts-expect-error runtime validation for missing promise .with(...) handler
      matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').with('a')
    }).toThrow('matchBy.promise(...).with(...) requires at least one tag and a handler.')

    expect(() => {
      // @ts-expect-error runtime validation rejects non-function promise .with(...) handlers
      matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').with('a', 'not a handler')
    }).toThrow('matchBy.promise(...).with(...) handler must be a function.')
  })

  it('rejects invalid matchBy.promise fallback handlers through the returned promise', async () => {
    // @ts-expect-error runtime validation rejects non-function promise fallback handlers
    const terminal = matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').otherwise('not a handler')

    expect(terminal).toBeInstanceOf(Promise)
    await expect(terminal).rejects.toThrow('matchBy.promise(...).otherwise(...) handler must be a function.')
  })

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

describe('assertion helpers and errors', () => {
  it('supports isMatching in direct and curried forms', () => {
    expect(isMatching({ type: 'user', id: P.string }, { type: 'user', id: '1' })).toBe(true)
    expect(isMatching({ type: 'user', id: P.string }, { type: 'user', id: 1 })).toBe(false)
    expect(
      [
        { type: 'user', id: '1' },
        { type: 'post', id: 1 },
      ].filter(isMatching({ type: 'user', id: P.string })),
    ).toEqual([{ type: 'user', id: '1' }])
  })

  it('supports assertMatching and PatternMismatchError metadata', () => {
    const payload: unknown = { type: 'user', id: '1' }
    assertMatching({ type: 'user', id: P.string }, payload)
    expect(payload.id).toBe('1')

    let error: unknown
    try {
      assertMatching({ type: 'user', id: P.string }, { type: 'user', id: 1 })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(PatternMismatchError)
    expect(error).toMatchObject({ name: 'PatternMismatchError' })
    expect(enumerableKeys(error)).not.toContain('value')
    expect(enumerableKeys(error)).not.toContain('pattern')
  })
})
