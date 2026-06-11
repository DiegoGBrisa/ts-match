import { describe, expect, it } from 'vitest'
import { assertMatching, isMatching, P, PatternMismatchError } from '../../index.js'

function enumerableKeys(value: unknown): string[] {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    throw new TypeError('Expected an object for enumerable key inspection.')
  }
  return Object.keys(value)
}

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
