import { describe, expect, it } from 'vitest'
import {
  assertMatching,
  group,
  match,
  matchBy,
  NonExhaustiveMatchError,
  PatternMismatchError,
} from '../../src/index.js'

describe('adversarial runtime coverage', () => {
  it('asserts useful error shapes and metadata', () => {
    type ErrorCase = { type: 'known'; id: 1 } | { type: 'missing'; id: 1 }
    const value = ((): ErrorCase => ({ type: 'missing', id: 1 }))()
    const nonExhaustiveMatch = match(value).with({ type: 'known' }, () => 1)

    expect(() => {
      // @ts-expect-error runtime coverage for non-exhaustive data
      nonExhaustiveMatch.exhaustive()
    }).toThrow(NonExhaustiveMatchError)
    try {
      // @ts-expect-error runtime coverage for non-exhaustive case maps
      matchBy(value, 'type').cases({ known: () => 1 })
      throw new Error('expected matchBy to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(NonExhaustiveMatchError)
      if (error instanceof NonExhaustiveMatchError) {
        expect(error.name).toBe('NonExhaustiveMatchError')
        expect(error.matcher).toBe('matchBy')
        expect(error.path).toBe('type')
        expect(error.tag).toBe('missing')
        expect(error.value).toBe(value)
        expect(error.message).toContain('Non-exhaustive matchBy')
      }
    }

    try {
      assertMatching({ type: 'known' }, value)
      throw new Error('expected assertMatching to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(PatternMismatchError)
      if (error instanceof PatternMismatchError) {
        expect(error.name).toBe('PatternMismatchError')
        expect(error.pattern).toEqual({ type: 'known' })
        expect(error.value).toBe(value)
        expect(error.message).toContain('Value did not match pattern')
      }
    }
  })

  it('validates handlers, grouped cases, invalid maps, and object-map collisions at runtime', () => {
    expect(() => {
      // @ts-expect-error runtime validation for missing handler
      match('x').with('x')
    }).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation for invalid predicate
      match('x').when('not a predicate', () => 1)
    }).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation for invalid case-map handler
      matchBy({ type: 'a' }, 'type').cases({ a: 'not a function' })
    }).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation for invalid case map
      matchBy({ type: 'a' }, 'type').cases('not a map')
    }).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation for malformed grouped case
      matchBy({ type: 'a' }, 'type').cases([['a']])
    }).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation for invalid grouped handler
      matchBy({ type: 'a' }, 'type').cases([['a', 'not a function']])
    }).toThrow(TypeError)
    expect(() => {
      // @ts-expect-error runtime validation for invalid group helper handler
      matchBy({ type: 'a' }, 'type').cases([group('a', 'not a function')])
    }).toThrow(TypeError)
    const collisionValue = { kind: ((): 1 | '1' => 1)() }
    expect(
      matchBy(collisionValue, 'kind').cases([
        [1, () => 'number'],
        ['1', () => 'string'],
      ]),
    ).toBe('number')
  })

  it('covers matchBy path traversal, symbols, partial maps, and grouped cases', () => {
    const KIND = Symbol('kind')
    const symbolA = Symbol('a')
    const symbolB = Symbol('b')
    const value = { meta: { kind: 'open' as const, nested: { state: 'ready' as const } }, [KIND]: 'symbolic' as const }
    const symbolTagged = { [KIND]: ((): typeof symbolA | typeof symbolB => symbolA)() }
    const optionalPathValue = { meta: ((): { kind: 'x' } | undefined => undefined)() }

    expect(matchBy(value, 'meta.kind').cases({ open: () => 'dot' })).toBe('dot')
    expect(matchBy(value, ['meta', 'nested', 'state']).cases({ ready: () => 'tuple' })).toBe('tuple')
    expect(matchBy(value, [KIND]).cases({ symbolic: () => 'symbol-path' })).toBe('symbol-path')
    expect(
      matchBy(symbolTagged, [KIND] as const)
        // @ts-expect-error runtime coverage for unique symbol grouped cases
        .cases((group) => [group(symbolA, () => 'symbol-a'), group(symbolB, () => 'symbol-b')]),
    ).toBe('symbol-a')
    expect(
      matchBy(optionalPathValue, 'meta.kind').cases((group) => [
        group('x', () => 'present'),
        group(undefined, () => 'missing'),
      ]),
    ).toBe('missing')
    const partialValue = { type: ((): 'a' | 'b' | 'c' => 'b')() }
    const groupedValue = { type: ((): 'a' | 'b' => 'b')() }
    expect(
      matchBy(partialValue, 'type')
        .partial({ a: () => 'a' })
        .otherwise((remaining) => remaining.type),
    ).toBe('b')
    expect(matchBy(groupedValue, 'type').cases((group) => [group(['a', 'b'], () => 'grouped')])).toBe('grouped')
  })
})
