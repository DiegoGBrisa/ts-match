import { describe, expect, it } from 'vitest'
import { isMatching, match, P } from '../../index.js'

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
