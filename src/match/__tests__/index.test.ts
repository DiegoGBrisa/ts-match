import { describe, expect, it } from 'vitest'
import { isMatching, match, NonExhaustiveMatchError, P } from '../../index.js'

describe('match', () => {
  it('matches literals, object patterns, and exhaustive unions', () => {
    type Result = { type: 'success'; data: string; meta: { requestId: string } } | { type: 'error'; message: string }

    const result = ((): Result => ({ type: 'success', data: 'ok', meta: { requestId: 'r1' } }))()

    expect(
      match(result)
        .with({ type: 'success' }, (value) => value.data)
        .with({ type: 'error' }, (value) => value.message)
        .exhaustive(),
    ).toBe('ok')
  })

  it('supports selections without allocating selection payloads for normal branches', () => {
    const payload: unknown = { type: 'user', profile: { name: 'Diego', age: 30 } }
    const result = match(payload)
      .with(
        { type: 'user', profile: { name: P.select('name', P.string), age: P.select('age', P.number) } },
        ({ name, age }: { name: string; age: number }) => `${name}:${String(age)}`,
      )
      .otherwise(() => '')

    expect(result).toBe('Diego:30')
  })

  it('preserves capture payloads with special property names', () => {
    const selected = match('a')
      .with(P.select('__proto__', P.string), (payload) => ({
        hasOwnKey: Object.prototype.hasOwnProperty.call(payload, '__proto__'),
        value: payload['__proto__'],
      }))
      .otherwise(() => null)

    expect(selected).toEqual({ hasOwnKey: true, value: 'a' })

    const collected = match(['a'])
      .with(P.array(P.collect('__proto__', P.string)), (payload) => ({
        hasOwnKey: Object.prototype.hasOwnProperty.call(payload, '__proto__'),
        value: payload['__proto__'],
      }))
      .otherwise(() => null)

    expect(collected).toEqual({ hasOwnKey: true, value: ['a'] })
  })

  it('supports anonymous selection', () => {
    expect(
      match({ ok: true, data: 'value' })
        .with({ ok: true, data: P.select() }, (data) => data.toUpperCase())
        .otherwise(() => 'nope'),
    ).toBe('VALUE')
  })

  it('rejects mixed anonymous and named selections', () => {
    // @ts-expect-error runtime validation still rejects mixed anonymous/named selections for JavaScript callers
    expect(() => isMatching({ a: P.select(), b: P.select('b') }, { a: 1, b: 2 })).toThrow(TypeError)
  })

  it('supports arrays, tuples, explicit tuples, and rest patterns', () => {
    expect(
      match(['a', 'b'])
        .with(P.array(P.string), () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(['a', 1] as const)
        .with([P.string, P.number], () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(['cmd', 1, 2, 3] as const)
        .with(P.tuple([P.string, P.rest(P.number)]), () => true)
        .otherwise(() => false),
    ).toBe(true)
  })

  it('supports exact deep object matching', () => {
    expect(
      match({ user: { name: 'Diego' } })
        .with(P.exact({ user: { name: P.string } }), () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match({ user: { name: 'Diego', age: 30 } })
        .with(P.exact({ user: { name: P.string } }), () => true)
        .otherwise(() => false),
    ).toBe(false)
  })

  it('matches non-enumerable pattern keys but exact ignores non-enumerable value extras', () => {
    const pattern = {}
    Object.defineProperty(pattern, 'hidden', { value: 1, enumerable: false })

    const value = {}
    Object.defineProperty(value, 'hidden', { value: 1, enumerable: false })

    const withExtra = {}
    Object.defineProperty(withExtra, 'hidden', { value: 1, enumerable: false })

    expect(
      match(value)
        .with(pattern, () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match(withExtra)
        .with(P.exact({}), () => true)
        .otherwise(() => false),
    ).toBe(true)
  })

  it('supports primitive helpers and numeric helpers', () => {
    expect(
      match(Number.NaN)
        .with(P.nan, () => 'nan')
        .otherwise(() => 'other'),
    ).toBe('nan')
    expect(
      match(1)
        .with(P.integer, () => 'int')
        .otherwise(() => 'other'),
    ).toBe('int')
    expect(
      match(Infinity)
        .with(P.finite, () => 'finite')
        .otherwise(() => 'other'),
    ).toBe('other')
  })

  it('supports convenience primitive and built-in object helpers', () => {
    const regex = /\d/g
    regex.lastIndex = 1

    expect(isMatching(P.regex(regex), '1')).toBe(true)
    expect(isMatching(P.regex(regex), '1')).toBe(true)
    expect(regex.lastIndex).toBe(1)
    const frozenRegex = /1/g
    frozenRegex.lastIndex = 1
    Object.freeze(frozenRegex)
    expect(isMatching(P.regex(frozenRegex), '1')).toBe(true)
    expect(frozenRegex.lastIndex).toBe(1)
    expect(isMatching(P.regex(regex), 1)).toBe(false)
    expect(() => {
      // @ts-expect-error runtime validation rejects non-RegExp values for JavaScript callers
      P.regex('^user-')
    }).toThrow(TypeError)

    expect(isMatching(P.date, new Date('2026-06-03T00:00:00.000Z'))).toBe(true)
    expect(isMatching(P.date, new Date('invalid'))).toBe(false)
    const invalidDate: Date = new Date('invalid')
    expect(() =>
      // @ts-expect-error P.date cannot prove every Date is valid; runtime still throws for invalid Date
      match(invalidDate)
        .with(P.date, () => 'valid-date')
        .exhaustive(),
    ).toThrow(NonExhaustiveMatchError)
    expect(isMatching(P.error, new TypeError('boom'))).toBe(true)
    expect(isMatching(P.regexp, /ok/)).toBe(true)
    expect(isMatching(P.nullish, null)).toBe(true)
    expect(isMatching(P.nullish, undefined)).toBe(true)
    expect(isMatching({ value: P.nullish }, {})).toBe(false)
    const absentNullishValue = (():
      | { readonly kind: 'nullable'; readonly value?: null }
      | { readonly kind: 'other'; readonly other: string } => ({ kind: 'nullable' }))()
    expect(() =>
      // @ts-expect-error runtime coverage for absent optional property not covered by P.nullish
      match(absentNullishValue)
        .with({ kind: 'nullable', value: P.nullish }, () => 'nullish')
        .with({ kind: 'other', other: P.string }, () => 'other')
        .exhaustive(),
    ).toThrow(NonExhaustiveMatchError)
    expect(
      match(absentNullishValue)
        .with({ kind: 'nullable', value: P.optional(P.nullish) }, () => 'nullish-or-absent')
        .with({ kind: 'other', other: P.string }, () => 'other')
        .exhaustive(),
    ).toBe('nullish-or-absent')
    const absentTruthyValue = (():
      | { readonly kind: 'present'; readonly value?: true }
      | { readonly kind: 'other'; readonly other: string } => ({ kind: 'present' }))()
    expect(() =>
      // @ts-expect-error runtime coverage for absent optional property not covered by required P.truthy
      match(absentTruthyValue)
        .with({ kind: 'present', value: P.truthy }, () => 'truthy')
        .with({ kind: 'other', other: P.string }, () => 'other')
        .exhaustive(),
    ).toThrow(NonExhaustiveMatchError)
    expect(
      match(absentTruthyValue)
        .with({ kind: 'present', value: P.optional(P.truthy) }, () => 'truthy-or-absent')
        .with({ kind: 'other', other: P.string }, () => 'other')
        .exhaustive(),
    ).toBe('truthy-or-absent')
    expect(isMatching(P.falsy, Number.NaN)).toBe(true)
    expect(isMatching(P.falsy, '')).toBe(true)
    expect(isMatching(P.falsy, new Boolean(false))).toBe(false)
    expect(isMatching(P.truthy, [])).toBe(true)
    expect(isMatching(P.truthy, 0)).toBe(false)
    const falsyUnknown: unknown = 0
    expect(() =>
      // @ts-expect-error P.truthy cannot prove exhaustiveness for unknown because falsy values remain possible
      match(falsyUnknown)
        .with(P.truthy, () => 'truthy')
        .exhaustive(),
    ).toThrow(NonExhaustiveMatchError)
  })

  it('supports record and non-empty record patterns', () => {
    expect(
      match({ 1: 'one', 2: 'two' })
        .with(P.record(P.number, P.string), () => true)
        .otherwise(() => false),
    ).toBe(true)
    expect(
      match({})
        .with(P.record(P.string, P.number), () => true)
        .otherwise(() => false),
    ).toBe(true)
    const empty: unknown = {}
    expect(
      match(empty)
        .with(P.nonEmptyRecord(P.string, P.number), () => true)
        .otherwise(() => false),
    ).toBe(false)
  })
})
