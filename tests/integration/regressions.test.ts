import { describe, expect, it } from 'vitest'
import { group, isMatching, match, matchBy, P } from '../../src/index.js'

describe('regression coverage for adversarial edge cases', () => {
  it('supports multi-pattern .with branches without losing the matched value', () => {
    function getValue(): 'a' | 'b' | 'c' {
      return 'b'
    }

    expect(
      match(getValue())
        .with('a', 'b', (matched) => matched.toUpperCase())
        .with('c', () => 'C')
        .exhaustive(),
    ).toBe('B')
  })

  it('passes the raw matched value for non-selecting branches inside selecting unions', () => {
    function getA(): 'a' | 'b' {
      return 'a'
    }
    function getB(): 'a' | 'b' {
      return 'b'
    }

    expect(
      match(getA())
        .with(P.union(P.select('x', 'a'), 'b'), (payload) => payload)
        .exhaustive(),
    ).toEqual({ x: 'a' })

    expect(
      match(getB())
        .with(P.union(P.select('x', 'a'), 'b'), (payload) => payload)
        .exhaustive(),
    ).toBe('b')
  })

  it('rejects ambiguous selection placements at runtime boundaries', () => {
    // @ts-expect-error runtime validation still rejects repeated-container selections for JavaScript callers
    expect(() => isMatching(P.array(P.select()), ['x'])).toThrow(TypeError)
    // @ts-expect-error runtime validation still rejects repeated-container selections for JavaScript callers
    expect(() => isMatching(P.nonEmptyArray(P.select('item')), ['x'])).toThrow(TypeError)
    // @ts-expect-error runtime validation still rejects repeated-record selections for JavaScript callers
    expect(() => isMatching(P.record(P.string, P.select('value')), { a: 1 })).toThrow(TypeError)
    // @ts-expect-error runtime validation still rejects repeated-record selections for JavaScript callers
    expect(() => isMatching(P.nonEmptyRecord(P.select('key'), P.number), { a: 1 })).toThrow(TypeError)
    expect(() => isMatching({ a: P.select('same'), b: P.select('same') }, { a: 1, b: 2 })).toThrow(TypeError)
  })

  it('treats records as plain record-like objects only', () => {
    expect(isMatching(P.record(P.string, P.number), { a: 1 })).toBe(true)
    expect(isMatching(P.record(P.string, P.number), Object.assign(Object.create(null), { a: 1 }))).toBe(true)
    expect(isMatching(P.record(P.string, P.number), new Date())).toBe(false)
    expect(isMatching(P.record(P.string, P.number), new Map())).toBe(false)
    expect(isMatching(P.record(P.string, P.number), /x/u)).toBe(false)
  })

  it('validates every object-map case handler before returning a fast-path match', () => {
    const handlers = { a: () => 1, b: 'not a function' }

    expect(() => {
      // @ts-expect-error runtime validation rejects non-function case handlers
      matchBy({ type: 'a' }, 'type').cases(handlers)
    }).toThrow(TypeError)
  })

  it('resolves matchBy paths through prototype getters when the path is explicit', () => {
    class EventWithGetter {
      get type(): 'ready' {
        return 'ready'
      }

      readonly value = 42
    }

    expect(matchBy(new EventWithGetter(), 'type').cases({ ready: (event) => event.value })).toBe(42)
  })

  it('supports __proto__ discriminants through computed object keys and tuple entries', () => {
    const objectHandlers = {
      ['__proto__']: () => 'computed',
    }

    expect(matchBy({ type: '__proto__' as const }, 'type').cases(objectHandlers)).toBe('computed')
    expect(matchBy({ type: '__proto__' as const }, 'type').cases([['__proto__', () => 'tuple']])).toBe('tuple')
  })

  it('deduplicates shared selections when optional union values are absent', () => {
    const selectOptionalUnion = (value: unknown) =>
      match(value)
        .with(
          {
            data: P.optional(P.union({ a: P.select('value', P.string) }, { b: P.select('value', P.number) })),
          },
          (selection) => selection,
        )
        .otherwise(() => null)

    expect(selectOptionalUnion({})).toEqual({ value: undefined })
    expect(selectOptionalUnion({ data: undefined })).toEqual({ value: undefined })
    expect(selectOptionalUnion({ data: { b: 2 } })).toEqual({ value: 2 })
  })

  it('validates group handlers', () => {
    expect(() => {
      // @ts-expect-error runtime validation rejects non-function group handlers
      group('a', 'not a function')
    }).toThrow(TypeError)
  })
})
