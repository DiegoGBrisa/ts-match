import { describe, expect, it } from 'vitest'
import { isMatching, match, NonExhaustiveMatchError, P, PatternMismatchError } from '../../index.js'
import { preview } from '../index.js'

describe('match', () => {
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
        .with(
          // @ts-expect-error runtime validation rejects select/collect name collisions across union alternatives
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

  it('keeps previews and public errors safe when value coercion throws', () => {
    const coercionError = new Error('coercion failed')
    const hostileValue = {
      toJSON() {
        throw coercionError
      },
      [Symbol.toPrimitive]() {
        throw coercionError
      },
    }

    expect(preview(hostileValue)).toBe('[Unserializable value]')
    expect(() => new NonExhaustiveMatchError(hostileValue)).not.toThrow()
    expect(() => new PatternMismatchError(P.string, hostileValue)).not.toThrow()
  })
})
