import { describe, expect, it } from 'vitest'
import { assertMatching, isMatching, P, PatternMismatchError } from '../../index.js'

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
