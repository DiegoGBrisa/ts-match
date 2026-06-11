import { describe, expect, it } from 'vitest'
import { isMatching, match, P } from '../../index.js'

describe('match', () => {
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
})
