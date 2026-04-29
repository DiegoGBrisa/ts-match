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

  it('normalizes match.async return values and rejections', async () => {
    await expect(
      match
        .async('x')
        .with('x', () => 1)
        .exhaustive(),
    ).resolves.toBe(1)
    await expect(
      match
        .async('x')
        .with('x', () => {
          throw new Error('boom')
        })
        .exhaustive(),
    ).rejects.toThrow('boom')
    // @ts-expect-error runtime coverage for impossible async non-exhaustive data
    await expect(match.async('x').exhaustive()).rejects.toThrow(NonExhaustiveMatchError)
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

  it('normalizes matchBy.async return values and rejections', async () => {
    await expect(matchBy.async({ type: 'a' as const }, 'type').cases({ a: async () => 1 })).resolves.toBe(1)
    await expect(
      matchBy.async({ type: 'a' as const }, 'type').cases({
        a: () => {
          throw new Error('boom')
        },
      }),
    ).rejects.toThrow('boom')
    await expect(
      // @ts-expect-error runtime coverage for non-exhaustive async case maps
      matchBy.async({ type: 'b' }, 'type').cases({ a: () => 1 }),
    ).rejects.toThrow(NonExhaustiveMatchError)
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
