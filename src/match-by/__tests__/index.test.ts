import { describe, expect, it } from 'vitest'
import { group, matchBy, P } from '../../index.js'

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
