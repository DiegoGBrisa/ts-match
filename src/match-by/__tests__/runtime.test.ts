import { describe, expect, it } from 'vitest'
import { matchBy } from '../../index.js'

describe('matchBy behavior', () => {
  it('matches direct keys, nested dot paths, tuple paths, numeric tags, boolean tags, and symbols', () => {
    const KIND = Symbol('kind')
    type Event =
      | { type: 'start'; payload: { code: 200 }; ok: true; meta: { [KIND]: 'symbol'; value: number } }
      | { type: 'stop'; payload: { code: 404 }; ok: false; reason: string }

    function getEvent(): Event {
      return { type: 'start', payload: { code: 200 }, ok: true, meta: { [KIND]: 'symbol', value: 5 } }
    }
    const event = getEvent()

    expect(matchBy(event, 'type').cases({ start: () => 'start', stop: () => 'stop' })).toBe('start')
    expect(matchBy(event, 'payload.code').cases({ 200: () => 'ok', 404: () => 'missing' })).toBe('ok')
    expect(matchBy(event, 'ok').cases({ true: () => 'yes', false: () => 'no' })).toBe('yes')

    const symbolEvent = { meta: { [KIND]: 'symbol' as const, value: 5 } }
    expect(matchBy(symbolEvent, ['meta', KIND]).cases({ symbol: (value) => value.meta.value })).toBe(5)
  })

  it('supports tuple/group cases for null and undefined discriminants', () => {
    type State = { kind: 'ready'; data: string } | { kind: null; reason: string } | { empty: true }
    const state = ((): State => ({ empty: true }))()

    expect(
      matchBy(state, 'kind').cases([
        ['ready', (value: Extract<State, { kind: 'ready' }>) => value.data],
        [null, (value: Extract<State, { kind: null }>) => value.reason],
        [undefined, (value: Extract<State, { empty: true }>) => String(value.empty)],
      ]),
    ).toBe('true')

    expect(
      matchBy(state, 'kind')
        .partial([
          ['ready', (value) => value.data],
          [[null] as const, (value) => value.reason],
        ])
        .otherwise((value) => String(value.empty)),
    ).toBe('true')
  })

  it('supports partial maps and preserves string-looking numeric/boolean keys', () => {
    const numericString = { type: '1' as const, data: 'string-key' }
    const booleanString = { type: 'true' as const, data: 'boolean-key' }

    expect(
      matchBy(numericString, 'type')
        .partial({ '1': (value) => value.data })
        .otherwise(() => 'fallback'),
    ).toBe('string-key')
    expect(
      matchBy(booleanString, 'type')
        .partial({ true: (value) => value.data })
        .otherwise(() => 'fallback'),
    ).toBe('boolean-key')
  })

  it('validates object-map handlers on the fast path', () => {
    const invalidCases = { a: 'not a function' }
    expect(() => {
      // @ts-expect-error runtime validation rejects non-function case handlers
      matchBy({ type: 'a' }, 'type').cases(invalidCases)
    }).toThrow(TypeError)
  })

  it('validates tuple-entry tags before storing cases', () => {
    expect(() => {
      // @ts-expect-error runtime validation rejects non-discriminant tuple tags
      matchBy({ type: 'a' as const }, 'type').partial([[{}, () => 1]])
    }).toThrow('group(...) tags must be discriminants.')

    expect(() => {
      matchBy({ type: 'a' as const }, 'type').partial([[[], () => 1]])
    }).toThrow('group(...) requires at least one tag.')
  })

  it('resolves matchBy.promise input values and normalizes handler outputs', async () => {
    type Event = { readonly type: 'a'; readonly value: number } | { readonly type: 'b'; readonly value: number }
    const event = ((): Event => ({ type: 'a', value: 1 }))()
    const eventPromise: Promise<Event> = Promise.resolve(event)

    class EventThenable implements PromiseLike<Event> {
      constructor(private readonly event: Event) {}

      then<TResult1 = Event, TResult2 = never>(
        onfulfilled?: ((value: Event) => TResult1 | PromiseLike<TResult1>) | null,
        _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve(this.event).then(onfulfilled, _onrejected)
      }
    }

    class RejectedEventThenable implements PromiseLike<Event> {
      constructor(private readonly error: Error) {}

      then<TResult1 = Event, TResult2 = never>(
        onfulfilled?: ((value: Event) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return Promise.reject<Event>(this.error).then(onfulfilled, onrejected)
      }
    }

    const terminal = matchBy.promise(eventPromise, 'type').cases({ a: () => Promise.resolve(1), b: () => 2 })

    expect(terminal).toBeInstanceOf(Promise)
    await expect(terminal).resolves.toBe(1)

    const nestedEvent = new Promise<Promise<Event>>((resolve) => resolve(Promise.resolve(event)))
    await expect(
      matchBy
        .promise(nestedEvent, 'type')
        .with('a', (value) => value.value + 3)
        .otherwise((value) => value.value),
    ).resolves.toBe(4)

    await expect(
      matchBy
        .promise(Promise.resolve(event), 'type')
        .cases((group) => [
          group('a', (value) => Promise.resolve(value.value + 4)),
          group('b', (value) => value.value),
        ]),
    ).resolves.toBe(5)

    await expect(
      matchBy.promise(Promise.resolve(event), 'type').cases([
        ['a', (value) => Promise.resolve(value.value + 5)],
        [['b'] as const, (value) => value.value],
      ]),
    ).resolves.toBe(6)

    await expect(
      matchBy
        .promise(Promise.resolve(event), 'type')
        .partial([['a', (value) => Promise.resolve(value.value + 6)]])
        .otherwise((value) => value.value),
    ).resolves.toBe(7)

    const maybeEvent: Event | PromiseLike<Event> = event
    await expect(
      matchBy
        .promise(maybeEvent, 'type')
        .with('a', (value) => value.value + 1)
        .otherwise((value) => value.value + 2),
    ).resolves.toBe(2)

    await expect(
      matchBy.promise(new EventThenable(event), 'type').cases({ a: (value) => value.value + 2, b: () => 0 }),
    ).resolves.toBe(3)

    const thenableError = new Error('thenable failed')
    await expect(
      matchBy.promise(new RejectedEventThenable(thenableError), 'type').safeOtherwise(() => 0),
    ).resolves.toEqual({ ok: false, error: thenableError })
  })

  it('reports matchBy.promise-specific .with(...) validation labels', () => {
    expect(() => {
      // @ts-expect-error runtime validation for missing promise .with(...) handler
      matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').with('a')
    }).toThrow('matchBy.promise(...).with(...) requires at least one tag and a handler.')

    expect(() => {
      // @ts-expect-error runtime validation rejects non-function promise .with(...) handlers
      matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').with('a', 'not a handler')
    }).toThrow('matchBy.promise(...).with(...) handler must be a function.')
  })

  it('rejects invalid matchBy.promise fallback handlers through the returned promise', async () => {
    // @ts-expect-error runtime validation rejects non-function promise fallback handlers
    const terminal = matchBy.promise(Promise.resolve({ type: 'a' as const }), 'type').otherwise('not a handler')

    expect(terminal).toBeInstanceOf(Promise)
    await expect(terminal).rejects.toThrow('matchBy.promise(...).otherwise(...) handler must be a function.')
  })
})
