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

  it('supports map patterns with homogeneous and required-entry modes', () => {
    expect(isMatching(P.map(P.string, P.number), new Map([['count', 2]]))).toBe(true)
    expect(isMatching(P.map(P.string, P.number), new Map())).toBe(true)
    expect(isMatching(P.map(P.string, P.number), new Map<unknown, unknown>([['count', '2']]))).toBe(false)
    expect(isMatching(P.map(P.string, P.number), { count: 2 })).toBe(false)
    expect(isMatching(P.map(P.string, P.number), [['count', 2]])).toBe(false)
    expect(isMatching(P.map(P.string, P.number), { get: () => 2, has: () => true })).toBe(false)

    const metadata = new Map<unknown, unknown>([
      ['id', 'user-1'],
      ['count', 2],
      ['extra', true],
    ])

    expect(isMatching(P.map(['id', P.string], ['count', P.number]), metadata)).toBe(true)
    expect(isMatching(P.exact(P.map(['id', P.string], ['count', P.number])), metadata)).toBe(false)
    expect(isMatching(P.exact(P.map(['id', P.string], ['count', P.number], ['extra', P.boolean])), metadata)).toBe(true)

    expect(isMatching(P.map([P.string, P.string], [P.string, P.string]), new Map([['id', 'user-1']]))).toBe(false)
    expect(
      isMatching(
        P.map([P.string, P.string], [P.string, P.string]),
        new Map([
          ['id', 'user-1'],
          ['name', 'Ada'],
        ]),
      ),
    ).toBe(true)
    expect(
      isMatching(
        P.map([P.string, P.string], ['id', P.string]),
        new Map([
          ['id', 'user-1'],
          ['name', 'Ada'],
        ]),
      ),
    ).toBe(false)
    expect(
      isMatching(
        P.map(['id', P.string], [P.string, P.string]),
        new Map([
          ['id', 'user-1'],
          ['name', 'Ada'],
        ]),
      ),
    ).toBe(true)

    expect(isMatching(P.map([P.union('id', 'name'), P.string]), new Map([['name', 'Ada']]))).toBe(true)

    const key = { id: 1 }
    const structurallyEqualKey = { id: 1 }
    const keyed = new Map<object, string>([[key, 'value']])
    expect(isMatching(P.map([{ id: P.number }, P.string]), keyed)).toBe(true)
    expect(isMatching(P.map([P.literal(key), P.string]), keyed)).toBe(true)
    expect(isMatching(P.map([P.literal(structurallyEqualKey), P.string]), keyed)).toBe(false)

    const tupleKey = ['id', 1] as const
    const tupleValue = [true, false] as const
    expect(
      isMatching(
        P.map(P.tuple([P.string, P.number]), P.tuple([P.boolean, P.boolean])),
        new Map([[tupleKey, tupleValue]]),
      ),
    ).toBe(true)
    expect(isMatching(P.map([P.string, P.number]), new Map([[tupleKey, 1]]))).toBe(false)

    expect(() =>
      // @ts-expect-error runtime validation still rejects Map selections for JavaScript callers
      isMatching(P.map(P.select('key'), P.string), new Map([['id', 'user-1']])),
    ).toThrow(TypeError)
    expect(() =>
      // @ts-expect-error runtime validation still rejects Map entry selections for JavaScript callers
      isMatching(P.map(['id', P.select('value')]), new Map([['id', 'user-1']])),
    ).toThrow(TypeError)
  })

  it('supports set patterns with homogeneous and required-value modes', () => {
    expect(isMatching(P.set(P.string), new Set(['admin', 'owner']))).toBe(true)
    expect(isMatching(P.set(P.string), new Set())).toBe(true)
    expect(isMatching(P.set(P.string), new Set<unknown>(['admin', 1]))).toBe(false)
    expect(isMatching(P.set(P.string), ['admin'])).toBe(false)
    expect(isMatching(P.set(P.string), { has: () => true, size: 1 })).toBe(false)

    const roles = new Set<unknown>(['admin', 'owner', 7])
    expect(isMatching(P.set('admin', 'owner', P.number), roles)).toBe(true)
    expect(isMatching(P.exact(P.set('admin', 'owner')), roles)).toBe(false)
    expect(isMatching(P.exact(P.set('admin', 'owner', P.number)), roles)).toBe(true)

    expect(isMatching(P.set(P.string, P.string), new Set(['admin']))).toBe(false)
    expect(isMatching(P.set(P.string, P.string), new Set(['admin', 'owner']))).toBe(true)
    expect(isMatching(P.set(P.string, 'admin'), new Set(['admin', 'owner']))).toBe(false)
    expect(isMatching(P.set('admin', P.string), new Set(['admin', 'owner']))).toBe(true)
    expect(isMatching(P.set(P.union('admin', 'owner')), new Set(['admin', 'owner']))).toBe(true)

    const token = { role: 'admin' }
    const structurallyEqualToken = { role: 'admin' }
    const tokens = new Set<object>([token])
    expect(isMatching(P.set({ role: P.string }), tokens)).toBe(true)
    expect(isMatching(P.set(P.literal(token)), tokens)).toBe(true)
    expect(isMatching(P.set(P.literal(structurallyEqualToken)), tokens)).toBe(false)

    const tupleValue = ['id', 1] as const
    expect(isMatching(P.set(P.tuple([P.string, P.number])), new Set([tupleValue]))).toBe(true)

    expect(() =>
      // @ts-expect-error runtime validation still rejects Set selections for JavaScript callers
      isMatching(P.set(P.select('value'), P.string), new Set(['admin', 'owner'])),
    ).toThrow(TypeError)
  })

  it('supports collection captures in repeated arrays and unions', () => {
    const mixedRuntimeValue: unknown = ['a', 1]

    expect(
      match(['a', 'b'])
        .with(P.array(P.collect('ids', P.string)), ({ ids }) => ids)
        .otherwise(() => []),
    ).toEqual(['a', 'b'])

    expect(
      match([])
        .with(P.array(P.collect('ids', P.string)), ({ ids }) => ids)
        .otherwise(() => ['fallback']),
    ).toEqual([])

    expect(
      match(['a', 1, true, null])
        .with(
          P.array(
            P.union(P.collect('ids', P.string), P.collect('ages', P.number), P.collect('flags', P.boolean), P.null),
          ),
          ({ ids, ages, flags }) => ({ ids, ages, flags }),
        )
        .otherwise(() => ({ ids: [], ages: [], flags: [] })),
    ).toEqual({ ids: ['a'], ages: [1], flags: [true] })

    expect(
      match(mixedRuntimeValue)
        .with(P.array(P.collect('ids', P.string)), ({ ids }) => ids)
        .with(P.array(P.union(P.collect('ids', P.string), P.collect('ages', P.number))), ({ ids, ages }) => ({
          ids,
          ages,
        }))
        .otherwise(() => null),
    ).toEqual({ ids: ['a'], ages: [1] })

    expect(
      match(mixedRuntimeValue)
        .with(P.array(P.collect('ids', P.string)), () => 'strings')
        .otherwise(() => 'fallback'),
    ).toBe('fallback')
  })

  it('supports collection captures in non-empty arrays, records, maps, and sets', () => {
    expect(
      match(['first'])
        .with(P.nonEmptyArray(P.collect('ids', P.string)), ({ ids }) => ids)
        .otherwise(() => []),
    ).toEqual(['first'])

    expect(
      match({ id: 'user-1', role: 'admin' })
        .with(P.record(P.collect('keys', P.string), P.collect('values', P.string)), ({ keys, values }) => ({
          keys,
          values,
        }))
        .otherwise(() => ({ keys: [], values: [] })),
    ).toEqual({ keys: ['id', 'role'], values: ['user-1', 'admin'] })

    expect(
      match({})
        .with(P.record(P.collect('keys', P.string), P.collect('values', P.string)), ({ keys, values }) => ({
          keys,
          values,
        }))
        .otherwise(() => ({ keys: ['fallback'], values: ['fallback'] })),
    ).toEqual({ keys: [], values: [] })

    const metadata = new Map<unknown, unknown>([
      ['id', 'user-1'],
      ['count', 2],
      ['extra', true],
    ])

    expect(
      match(metadata)
        .with(
          P.map(P.collect('keys', P.string), P.collect('values', P.union(P.string, P.number, P.boolean))),
          (value) => {
            return { keys: value.keys, values: value.values }
          },
        )
        .otherwise(() => ({ keys: [], values: [] })),
    ).toEqual({ keys: ['id', 'count', 'extra'], values: ['user-1', 2, true] })

    expect(
      match(metadata)
        .with(
          P.map(['id', P.collect('values', P.string)], ['count', P.collect('values', P.number)]),
          ({ values }) => values,
        )
        .otherwise(() => []),
    ).toEqual(['user-1', 2])

    const roles = new Set<unknown>(['admin', 'owner', 7])
    expect(
      match(roles)
        .with(P.set(P.collect('roles', P.union(P.string, P.number))), ({ roles }) => roles)
        .otherwise(() => []),
    ).toEqual(['admin', 'owner', 7])

    expect(
      match(roles)
        .with(P.set(P.collect('roles', 'owner'), P.collect('roles', P.number)), ({ roles }) => roles)
        .otherwise(() => []),
    ).toEqual(['owner', 7])
  })

  it('supports optional and named selection payloads with collection captures', () => {
    const users = [{ id: 'u1', role: 'admin' }, { role: 'guest' }, { id: undefined, role: 'owner' }]

    expect(
      match({ source: 'sync', users })
        .with(
          { source: P.select('source', P.string), users: P.array({ id: P.optional(P.collect('ids', P.string)) }) },
          ({ source, ids }) => ({ source, ids }),
        )
        .otherwise(() => ({ source: 'fallback', ids: [] })),
    ).toEqual({ source: 'sync', ids: ['u1', undefined, undefined] })
  })

  it('rejects invalid collection capture usage at runtime for JavaScript callers', () => {
    expect(() =>
      // @ts-expect-error runtime validation rejects collection captures outside repeated containers
      isMatching(P.collect('ids', P.string), 'a'),
    ).toThrow(TypeError)

    expect(() =>
      // @ts-expect-error runtime validation rejects collection captures inside negative patterns
      isMatching(P.array(P.exclude(P.collect('ids', P.string))), []),
    ).toThrow(TypeError)

    expect(() =>
      // @ts-expect-error runtime validation rejects collection captures outside repeated containers even when tuple rest is empty
      isMatching(P.tuple([P.rest(P.collect('ids', P.string))]), []),
    ).toThrow(TypeError)

    expect(() =>
      match([])
        // @ts-expect-error runtime validation rejects collection captures outside repeated containers even when tuple rest is empty
        .with(P.tuple([P.rest(P.collect('ids', P.string))]), () => 'bad')
        .otherwise(() => 'fallback'),
    ).toThrow(TypeError)

    expect(() =>
      match({ selected: 'x', ids: [] })
        // @ts-expect-error runtime validation rejects anonymous selection mixed with collection captures
        .with({ selected: P.select(), ids: P.array(P.collect('ids', P.string)) }, () => 'bad')
        .otherwise(() => 'fallback'),
    ).toThrow(TypeError)

    expect(() =>
      match({ source: 'sync', ids: ['a'] })
        // @ts-expect-error runtime validation rejects select/collect name collisions
        .with({ source: P.select('ids', P.string), ids: P.array(P.collect('ids', P.string)) }, () => 'bad')
        .otherwise(() => 'fallback'),
    ).toThrow(TypeError)

    expect(() =>
      match({ kind: 'selected', data: 'x' })
        // @ts-expect-error runtime validation rejects select/collect name collisions across union alternatives
        .with(
          P.union(
            { kind: 'selected', data: P.select('data', P.string) },
            { kind: 'collected', data: P.array(P.collect('data', P.string)) },
          ),
          () => 'bad',
        )
        .otherwise(() => 'fallback'),
    ).toThrow(TypeError)

    expect(() =>
      isMatching(
        // @ts-expect-error runtime validation rejects anonymous selection mixed with collection captures across union alternatives
        P.union(
          { kind: 'selected', data: P.select() },
          { kind: 'collected', data: P.array(P.collect('data', P.string)) },
        ),
        { kind: 'selected', data: 'x' },
      ),
    ).toThrow(TypeError)

    expect(() => {
      // @ts-expect-error runtime validation rejects malformed JavaScript calls
      P.collect('ids')
    }).toThrow(TypeError)
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
    expect(() => group([], () => 'empty')).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation rejects empty union helpers for JavaScript callers
      P.union()
    }).toThrow(TypeError)

    const emptyTags: readonly boolean[] = []
    expect(() =>
      matchBy(result, 'ok').cases((group) => [group(emptyTags, () => 'empty'), group(true, false, () => 'done')]),
    ).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation rejects non-discriminant tags for JavaScript callers
      matchBy(result, 'ok').with({}, () => 'invalid')
    }).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation rejects non-discriminant tags for JavaScript callers
      matchBy.promise(Promise.resolve(result), 'ok').with([], () => 'invalid')
    }).toThrow(TypeError)

    const mutableTags = ['start']
    const entry = group(mutableTags, () => 'active')
    mutableTags[0] = 'stop'
    expect(entry.tags).toEqual(['start'])
    expect(Object.isFrozen(entry.tags)).toBe(true)
  })

  it('supports partial grouped callback entries', async () => {
    type Action =
      | { type: 'add'; sku: string; quantity: number }
      | { type: 'update'; sku: string; quantity: number }
      | { type: 'checkout'; total: number }

    const action = ((): Action => ({ type: 'add', sku: 'SKU-1', quantity: 2 }))()

    expect(
      matchBy(action, 'type')
        .partial((group) => [group(['add', 'update'], (value) => `${value.sku}:${String(value.quantity)}`)])
        .otherwise((value) => String(value.total)),
    ).toBe('SKU-1:2')

    await expect(
      matchBy
        .promise(Promise.resolve<Action>({ type: 'checkout', total: 42 }), 'type')
        .partial((group) => [group(['add', 'update'], (value) => `${value.sku}:${String(value.quantity)}`)])
        .otherwise((value) => String(value.total)),
    ).resolves.toBe('42')
  })

  it('supports typed dot paths and tuple paths', () => {
    const event = { meta: { type: 'click' as const, x: 1 } }
    expect(matchBy(event, 'meta.type').cases({ click: (value) => value.meta.x })).toBe(1)

    const KIND = Symbol('kind')
    const symbolEvent = { meta: { [KIND]: 'symbolic' as const, value: 2 } }
    expect(matchBy(symbolEvent, ['meta', KIND]).cases({ symbolic: (value) => value.meta.value })).toBe(2)
  })

  it('supports promise mode', async () => {
    type Event = { type: 'a'; value: number } | { type: 'b'; value: number }
    const event = ((): Event => ({ type: 'a', value: 1 }))()

    await expect(
      matchBy.promise(Promise.resolve(event), 'type').cases({
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
