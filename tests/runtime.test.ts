import { describe, expect, it } from 'vitest'
import {
  assertMatching,
  isMatching,
  group,
  match,
  matchBy,
  NonExhaustiveMatchError,
  P,
  PatternMismatchError,
} from '../src/index.js'

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

  it('throws a rich non-exhaustive error', () => {
    const nonExhaustiveValue = ((): 'a' | 'x' => 'x')()
    const nonExhaustive = match(nonExhaustiveValue).with('a', () => 1)

    expect(() => {
      // @ts-expect-error runtime coverage for non-exhaustive data
      nonExhaustive.exhaustive()
    }).toThrow(NonExhaustiveMatchError)
  })
})

describe('matchBy', () => {
  it('supports exhaustive object maps', () => {
    type Event = { type: 'start'; id: string } | { type: 'stop'; reason: string }

    const event = ((): Event => ({ type: 'start', id: '1' }))()

    expect(
      matchBy(event, 'type').cases({
        start: (value) => value.id,
        stop: (value) => value.reason,
      }),
    ).toBe('1')
  })

  it('supports grouped tuple cases including null and undefined', () => {
    type State = { kind: 'ready'; data: string } | { kind: null; reason: string } | { kind?: undefined; empty: true }

    const state = ((): State => ({ kind: null, reason: 'missing' }))()

    expect(
      matchBy(state, 'kind').cases([
        ['ready', (value: Extract<State, { kind: 'ready' }>) => value.data],
        [null, (value: Extract<State, { kind: null }>) => value.reason],
        [undefined, (value: Extract<State, { empty: true }>) => String(value.empty)],
      ]),
    ).toBe('missing')
  })

  it('supports group helper and boolean tags', () => {
    type Result = { ok: true; data: string } | { ok: false; error: string }
    const result = ((): Result => ({ ok: false, error: 'boom' }))()

    expect(
      matchBy(result, 'ok').cases((group) => [
        group(true, (value) => value.data),
        group(false, (value) => value.error),
      ]),
    ).toBe('boom')

    expect(matchBy(result, 'ok').cases((group) => [group(true, false, () => 'done')])).toBe('done')
    expect(matchBy(result, 'ok').cases([group(true, false, () => 'reusable')])).toBe('reusable')
  })

  it('supports typed dot paths and tuple paths', () => {
    const event = { meta: { type: 'click' as const, x: 1 } }
    expect(matchBy(event, 'meta.type').cases({ click: (value) => value.meta.x })).toBe(1)

    const KIND = Symbol('kind')
    const symbolEvent = { meta: { [KIND]: 'symbolic' as const, value: 2 } }
    expect(matchBy(symbolEvent, ['meta', KIND]).cases({ symbolic: (value) => value.meta.value })).toBe(2)
  })

  it('supports async mode', async () => {
    type Event = { type: 'a'; value: number } | { type: 'b'; value: number }
    const event = ((): Event => ({ type: 'a', value: 1 }))()

    await expect(
      matchBy.async(event, 'type').cases({
        a: async (value) => value.value + 1,
        b: (value) => value.value + 2,
      }),
    ).resolves.toBe(2)
  })
})

describe('assertions', () => {
  it('supports isMatching and assertMatching', () => {
    const values: unknown[] = [
      { type: 'user', id: '1' },
      { type: 'post', id: 2 },
    ]
    const users = values.filter(isMatching({ type: 'user', id: P.string }))

    expect(users).toEqual([{ type: 'user', id: '1' }])

    const payload: unknown = { type: 'user', id: '1' }
    assertMatching({ type: 'user', id: P.string }, payload)
    expect(payload.id).toBe('1')
  })

  it('throws PatternMismatchError', () => {
    expect(() => assertMatching({ type: 'user' }, { type: 'post' })).toThrow(PatternMismatchError)
  })
})
