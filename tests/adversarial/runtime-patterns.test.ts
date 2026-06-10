import { describe, expect, it } from 'vitest'
import {
  isMatching,
  match,
  P,
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
} from '../../src/index.js'

const CONSTRUCTOR_KEY = 'constructor'
const PROTOTYPE_KEY = 'prototype'

describe('adversarial runtime coverage', () => {
  it('matches Object.is-sensitive literal values', () => {
    expect(
      match(Number.NaN)
        .with(Number.NaN, () => 'nan')
        .otherwise(() => 'miss'),
    ).toBe('nan')
    expect(
      match(-0)
        .with(+0, () => 'zero')
        .otherwise(() => 'miss'),
    ).toBe('miss')
    expect(
      match(+0)
        .with(-0, () => 'negative-zero')
        .otherwise(() => 'miss'),
    ).toBe('miss')
    expect(
      match(-0)
        .with(-0, () => 'negative-zero')
        .exhaustive(),
    ).toBe('negative-zero')
  })

  it('covers primitive helpers and literal primitives including bigint and symbols', () => {
    const token = Symbol('token')

    expect(isMatching(P.string, 'x')).toBe(true)
    expect(isMatching(P.number, 1)).toBe(true)
    expect(isMatching(P.boolean, false)).toBe(true)
    expect(isMatching(P.bigint, 1n)).toBe(true)
    expect(isMatching(P.symbol, token)).toBe(true)
    expect(isMatching(P.null, null)).toBe(true)
    expect(isMatching(P.undefined, undefined)).toBe(true)
    expect(isMatching(P.nan, Number.NaN)).toBe(true)
    expect(isMatching(P.finite, Number.POSITIVE_INFINITY)).toBe(false)
    expect(isMatching(P.integer, 1.5)).toBe(false)
    expect(
      match(token)
        .with(token, () => 'symbol')
        .exhaustive(),
    ).toBe('symbol')
  })

  it('preserves P namespace and named-helper parity', () => {
    expect(P._).toBe(pWildcard)
    expect(P.any).toBe(pAny)
    expect(P.string).toBe(pString)
    expect(P.number).toBe(pNumber)
    expect(P.boolean).toBe(pBoolean)
    expect(P.bigint).toBe(pBigint)
    expect(P.symbol).toBe(pSymbol)
    expect(P.null).toBe(pNull)
    expect(P.undefined).toBe(pUndefined)
    expect(P.nan).toBe(pNan)
    expect(P.finite).toBe(pFinite)
    expect(P.integer).toBe(pInteger)

    expect(isMatching(P.array(P.number), [1, 2])).toBe(isMatching(pArray(pNumber), [1, 2]))
    expect(isMatching(P.nonEmptyArray(P.string), ['x'])).toBe(isMatching(pNonEmptyArray(pString), ['x']))
    expect(isMatching(P.tuple([P.string, P.number]), ['x', 1])).toBe(isMatching(pTuple([pString, pNumber]), ['x', 1]))
    expect(isMatching(P.union('a', 'b'), 'a')).toBe(isMatching(pUnion('a', 'b'), 'a'))
    expect(isMatching(P.exclude('a'), 'b')).toBe(isMatching(pExclude('a'), 'b'))
    expect(isMatching(P.optional(P.string), undefined)).toBe(isMatching(pOptional(pString), undefined))
    expect(isMatching(P.exact({ a: P.number }), { a: 1 })).toBe(isMatching(pExact({ a: pNumber }), { a: 1 }))
    expect(isMatching(P.record(P.string, P.number), { a: 1 })).toBe(isMatching(pRecord(pString, pNumber), { a: 1 }))
    expect(isMatching(P.nonEmptyRecord(P.string, P.number), { a: 1 })).toBe(
      isMatching(pNonEmptyRecord(pString, pNumber), { a: 1 }),
    )
    expect(
      isMatching(
        P.when((value: unknown) => value === 'x'),
        'x',
      ),
    ).toBe(
      isMatching(
        pWhen((value: unknown) => value === 'x'),
        'x',
      ),
    )
    expect(isMatching(P.instanceOf(Date), new Date())).toBe(isMatching(pInstanceOf(Date), new Date()))
    expect(
      match(['head', 1, 2])
        .with([P.string, P.rest(P.number)], () => true)
        .otherwise(() => false),
    ).toBe(
      match(['head', 1, 2])
        .with([pString, pRest(pNumber)], () => true)
        .otherwise(() => false),
    )
    expect(
      match({ value: 'x' })
        .with({ value: P.select('value') }, (selection) => selection.value)
        .exhaustive(),
    ).toBe(
      match({ value: 'x' })
        .with({ value: pSelect('value') }, (selection) => selection.value)
        .exhaustive(),
    )
  })

  it('distinguishes partial object patterns from exact object patterns', () => {
    expect(isMatching({ a: P.number }, { a: 1, b: 2 })).toBe(true)
    expect(isMatching(P.exact({ a: P.number }), { a: 1, b: 2 })).toBe(false)
    expect(isMatching(P.exact({ nested: { a: P.number } }), { nested: { a: 1, b: 2 } })).toBe(false)
  })

  it('handles optional, nullable, missing, inherited, symbol, numeric, and special object keys', () => {
    const symbolKey = Symbol('id')
    const inherited = Object.create({ inherited: 'yes' })
    inherited.own = 1

    const pollutionLike = {
      ['__proto__']: 'own-proto',
      [CONSTRUCTOR_KEY]: 'own-constructor',
      [PROTOTYPE_KEY]: 'own-prototype',
      1: 'one',
      true: 'truthy',
      [symbolKey]: 42,
      maybe: undefined,
      nullable: null,
    }

    expect(isMatching({ inherited: 'yes' }, inherited)).toBe(true)
    expect(isMatching({ [symbolKey]: P.number }, pollutionLike)).toBe(true)
    expect(isMatching({ 1: 'one', true: 'truthy' }, pollutionLike)).toBe(true)
    expect(isMatching({ ['__proto__']: 'own-proto' }, pollutionLike)).toBe(true)
    expect(isMatching({ [CONSTRUCTOR_KEY]: 'own-constructor' }, pollutionLike)).toBe(true)
    expect(isMatching({ [PROTOTYPE_KEY]: 'own-prototype' }, pollutionLike)).toBe(true)
    expect(isMatching({ missing: P.optional(P.string) }, pollutionLike)).toBe(true)
    expect(isMatching({ maybe: P.optional(P.string) }, pollutionLike)).toBe(true)
    expect(isMatching({ nullable: P.union(P.null, P.string) }, pollutionLike)).toBe(true)
  })

  it('covers arrays, readonly tuples, empty arrays, non-empty arrays, and rest patterns', () => {
    const readonlyTuple = ['cmd', 1, 2, 3] as const

    expect(
      match(readonlyTuple)
        .with([P.string, P.rest(P.number)], () => 'tuple')
        .exhaustive(),
    ).toBe('tuple')
    expect(isMatching(P.array(P.number), [])).toBe(true)
    expect(isMatching(P.nonEmptyArray(P.number), [])).toBe(false)
    expect(isMatching(P.nonEmptyArray(P.number), [1])).toBe(true)
    expect(isMatching([P.string, P.number], ['x'])).toBe(false)
    // @ts-expect-error runtime validation still rejects invalid non-final P.rest placement for JavaScript callers
    expect(() => isMatching([P.rest(P.number), P.number], [1, 2])).toThrow(TypeError)
  })

  it('covers plain records and rejects non-record objects', () => {
    const nullPrototypeRecord: { a?: number } = Object.create(null)
    nullPrototypeRecord.a = 1
    const frozen = Object.freeze({ a: 1 })

    expect(isMatching(P.record(P.string, P.number), { a: 1 })).toBe(true)
    expect(isMatching(P.nonEmptyRecord(P.string, P.number), {})).toBe(false)
    expect(isMatching(P.record(P.string, P.number), nullPrototypeRecord)).toBe(true)
    expect(isMatching(P.record(P.string, P.number), frozen)).toBe(true)
    expect(isMatching(P.record(P.string, P.number), [])).toBe(false)
    expect(isMatching(P.record(P.string, P.number), new Date())).toBe(false)
    expect(isMatching(P.record(P.string, P.number), /x/)).toBe(false)
    expect(isMatching(P.record(P.string, P.number), new Map())).toBe(false)
    expect(isMatching(P.record(P.string, P.number), new Set())).toBe(false)
    expect(isMatching(P.record(P.string, P.number), () => 1)).toBe(false)
  })

  it('covers class instances, prototype getters, throwing getters, and predicates that throw', () => {
    class WithGetter {
      readonly own = 1
      get inherited(): number {
        return 2
      }
    }

    const throwingGetter = {
      get value() {
        throw new Error('getter failed')
      },
    }

    expect(isMatching({ own: P.number, inherited: P.number }, new WithGetter())).toBe(true)
    expect(() => isMatching({ value: P.number }, throwingGetter)).toThrow('getter failed')
    expect(() =>
      isMatching(
        P.when(() => {
          throw new Error('predicate failed')
        }),
        'x',
      ),
    ).toThrow('predicate failed')
  })

  it('covers promise success, rejection, and sync throws in promise mode', async () => {
    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', async () => 'ok')
        .exhaustive(),
    ).resolves.toBe('ok')
    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', () => 'sync')
        .exhaustive(),
    ).resolves.toBe('sync')
    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', async () => Promise.reject(new Error('rejected')))
        .exhaustive(),
    ).rejects.toThrow('rejected')
    await expect(
      match
        .promise(Promise.resolve('x' as const))
        .with('x', () => {
          throw new Error('sync failed')
        })
        .exhaustive(),
    ).rejects.toThrow('sync failed')
  })
})
