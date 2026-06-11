import { describe, expect, it } from 'vitest'
import { assertMatching, isMatching, match, P } from '../../src/index.js'

describe('suite-inspired hardening', () => {
  it('matches primitive literals and primitive helpers precisely', () => {
    const symbol = Symbol.for('suite-hardening')
    const classify = (value: unknown) =>
      match(value)
        .with(true, () => 'true')
        .with(false, () => 'false')
        .with(null, () => 'null')
        .with(undefined, () => 'undefined')
        .with(symbol, () => 'symbol')
        .with(1n, () => 'bigint')
        .with(-0, () => 'negative-zero')
        .with(0, () => 'positive-zero')
        .with(P.nan, () => 'nan')
        .with(P.boolean, () => 'boolean')
        .with(P.symbol, () => 'other-symbol')
        .with(P.bigint, () => 'other-bigint')
        .otherwise(() => 'other')

    expect(classify(true)).toBe('true')
    expect(classify(false)).toBe('false')
    expect(classify(null)).toBe('null')
    expect(classify(undefined)).toBe('undefined')
    expect(classify(symbol)).toBe('symbol')
    expect(classify(1n)).toBe('bigint')
    expect(classify(-0)).toBe('negative-zero')
    expect(classify(0)).toBe('positive-zero')
    expect(classify(Number.NaN)).toBe('nan')
    expect(classify(Symbol('other'))).toBe('other-symbol')
    expect(classify(2n)).toBe('other-bigint')
  })

  it('supports several patterns in one branch without evaluating later matched branches', () => {
    let evaluatedAfterMatch = false

    const result = match<'idle' | 'loading' | 'success'>('loading')
      .with('idle', 'loading', () => 'pending')
      .with(
        P.when(() => {
          evaluatedAfterMatch = true
          return true
        }),
        () => 'late',
      )
      .otherwise(() => 'other')

    expect(result).toBe('pending')
    expect(evaluatedAfterMatch).toBe(false)
  })

  it('handles nested tuple/object reducers with selections', () => {
    type State = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: string }
    type Event = { type: 'fetch' } | { type: 'success'; data: string } | { type: 'cancel' }

    const reduce = (state: State, event: Event): State => {
      const input: unknown = [state, event]
      return match(input)
        .with(P.tuple([{ status: 'idle' }, { type: 'fetch' }]), () => ({ status: 'loading' }))
        .with(P.tuple([{ status: 'loading' }, { type: 'success', data: P.select('data', P.string) }]), ({ data }) => ({
          status: 'success',
          data,
        }))
        .with(P.tuple([{ status: 'loading' }, { type: 'cancel' }]), () => ({ status: 'idle' }))
        .otherwise(() => state)
    }

    expect(reduce({ status: 'idle' }, { type: 'fetch' })).toEqual({ status: 'loading' })
    expect(reduce({ status: 'loading' }, { type: 'success', data: 'ok' })).toEqual({
      status: 'success',
      data: 'ok',
    })
    expect(reduce({ status: 'loading' }, { type: 'cancel' })).toEqual({ status: 'idle' })
    expect(reduce({ status: 'success', data: 'old' }, { type: 'cancel' })).toEqual({ status: 'success', data: 'old' })
  })

  it('matches optional nested properties only when present values satisfy the nested pattern', () => {
    type Input = { a?: { name: string; age: number } } | { b: 'done' }

    const classify = (input: Input) =>
      match(input)
        .with({ b: 'done' }, () => 'done')
        .with({ a: P.optional({ name: 'Hello' }) }, () => 'hello-or-absent')
        .with({ a: { name: P.string } }, () => 'other-name')
        .exhaustive()

    expect(classify({})).toBe('hello-or-absent')
    expect(classify({ a: { name: 'Hello', age: 20 } })).toBe('hello-or-absent')
    expect(classify({ a: { name: 'Bonjour', age: 20 } })).toBe('other-name')
    expect(classify({ b: 'done' })).toBe('done')
  })

  it('captures undefined for selections inside absent optional properties', () => {
    type Input = { type: 'user'; profile?: { name: string; age: number } } | { type: 'system'; reason?: 'shutdown' }

    const readUser = (input: Input): string | undefined =>
      match(input)
        .with(
          { type: 'user', profile: P.optional({ name: P.select('name'), age: P.select('age') }) },
          ({ age, name }) => (name === undefined ? undefined : `${name}:${String(age)}`),
        )
        .with({ type: 'system', reason: P.optional(P.select('reason')) }, ({ reason }) => reason)
        .exhaustive()

    expect(readUser({ type: 'user' })).toBeUndefined()
    expect(readUser({ type: 'user', profile: { name: 'Ada', age: 36 } })).toBe('Ada:36')
    expect(readUser({ type: 'system' })).toBeUndefined()
    expect(readUser({ type: 'system', reason: 'shutdown' })).toBe('shutdown')
  })

  it('captures undefined through optional union, exact, and tuple selection patterns', () => {
    const emptyInput: unknown = {}

    expect(
      match(emptyInput)
        .with({ data: P.optional(P.union({ a: P.select('a') }, { b: P.select('b') })) }, (payload) => payload)
        .otherwise(() => ({ fallback: true })),
    ).toEqual({ a: undefined, b: undefined })

    expect(
      match(emptyInput)
        .with({ data: P.optional(P.exact({ nested: P.select('nested') })) }, ({ nested }) => nested)
        .otherwise(() => 'fallback'),
    ).toBeUndefined()

    expect(
      match(emptyInput)
        .with({ data: P.optional(P.tuple([P.select('first'), P.number])) }, ({ first }) => first)
        .otherwise(() => 'fallback'),
    ).toBeUndefined()
  })

  it('rejects invalid selection contexts even when an optional property is absent', () => {
    // @ts-expect-error runtime validation still rejects optional repeated-container selections for JavaScript callers
    expect(() => isMatching({ values: P.optional(P.array(P.select('value'))) }, {})).toThrow(TypeError)
    // @ts-expect-error runtime validation still rejects optional record selections for JavaScript callers
    expect(() => isMatching({ records: P.optional(P.record(P.string, P.select('value'))) }, {})).toThrow(TypeError)
  })

  it('covers sync and promise predicate branch behavior', async () => {
    let syncSkipped = false
    const syncResult = match('x')
      .with('x', () => 'matched')
      .when(
        () => {
          syncSkipped = true
          return true
        },
        () => 'late',
      )
      .exhaustive()

    expect(syncResult).toBe('matched')
    expect(syncSkipped).toBe(false)

    await expect(
      match
        .promise(Promise.resolve(3 as const))
        .when(
          (value): value is 3 => value === 3,
          async (value) => value + 1,
        )
        .otherwise(() => 0),
    ).resolves.toBe(4)

    const asyncValue: number = 2
    await expect(
      match
        .promise(Promise.resolve(asyncValue))
        .when(
          (value): value is 3 => value === 3,
          () => 3,
        )
        .otherwise(async (value) => value + 5),
    ).resolves.toBe(7)

    let asyncSkipped = false
    await expect(
      match
        .promise(Promise.resolve('done' as const))
        .with('done', () => 'matched')
        .when(
          () => {
            asyncSkipped = true
            return true
          },
          () => 'late',
        )
        .exhaustive(),
    ).resolves.toBe('matched')
    expect(asyncSkipped).toBe(false)
  })

  it('narrows with exclusion patterns at the top level and inside objects', () => {
    const primitive = (value: 'one' | 'two') =>
      match(value)
        .with(P.exclude('one'), () => 'not-one')
        .with('one', () => 'one')
        .exhaustive()

    const nested = (value: { tag: 'a' | 'b'; payload: string | number }) =>
      match(value)
        .with({ tag: P.exclude('a'), payload: P.number }, (matchValue) => `b:${String(matchValue.payload)}`)
        .with({ tag: 'a' }, () => 'a')
        .otherwise(() => 'other')

    expect(primitive('two')).toBe('not-one')
    expect(primitive('one')).toBe('one')
    expect(nested({ tag: 'b', payload: 2 })).toBe('b:2')
    expect(nested({ tag: 'b', payload: 'nope' })).toBe('other')
    expect(nested({ tag: 'a', payload: 2 })).toBe('a')
  })

  it('matches symbol-keyed object patterns and curried type guards', () => {
    const OUTER = Symbol('outer')
    const INNER = Symbol('inner')
    const OTHER = Symbol('other')

    type Input = { [OUTER]: { [INNER]: 'foo' | 'bar' } } | { [OTHER]: string }
    const value = ((): Input => ({ [OUTER]: { [INNER]: 'foo' } }))()
    const matchesFoo = isMatching({ [OUTER]: { [INNER]: 'foo' } })

    expect(matchesFoo(value)).toBe(true)
    expect(isMatching({ [OUTER]: { [INNER]: 'bar' } }, value)).toBe(false)
    expect(
      match(value)
        .with({ [OUTER]: { [INNER]: P.select() } }, (inner) => inner)
        .with({ [OTHER]: P.select() }, (other) => other)
        .exhaustive(),
    ).toBe('foo')
  })

  it('distinguishes tuple length, variadic rest, and readonly tuple inputs', () => {
    const sum = (values: unknown) =>
      match(values)
        .with([], () => 0)
        .with([P.number, P.number], ([left, right]) => left + right)
        .with(P.tuple([P.number, P.rest(P.number)]), (all) => all.reduce((total, value) => total + value, 0))
        .otherwise(() => -1)

    expect(sum([])).toBe(0)
    expect(sum([2, 3])).toBe(5)
    expect(sum([2, 3, 4, 5])).toBe(14)
    expect(
      match(['cmd', 1, 2] as const)
        .with(['cmd', P.rest(P.number)], ([command, ...numbers]) => `${command}:${String(numbers.length)}`)
        .otherwise(() => 'no'),
    ).toBe('cmd:2')
  })

  it('matches complex record patterns while rejecting non-records and incompatible keys', () => {
    const profiles: unknown = {
      alice: { profile: { name: 'Alice', age: 25 }, active: true },
      bob: { profile: { name: 'Bob', age: 30 }, active: false },
    }

    expect(
      match(profiles)
        .with(
          P.record(P.string, {
            profile: { name: P.string, age: P.integer },
            active: P.boolean,
          }),
          () => 'profiles',
        )
        .otherwise(() => 'no'),
    ).toBe('profiles')

    expect(isMatching(P.record(P.string, P.string), ['a', 'b'])).toBe(false)
    expect(isMatching(P.record(P.string, P.string), null)).toBe(false)
    expect(isMatching(P.record(P.number, P.string), { '01': 'one' })).toBe(false)
    expect(isMatching(P.record(P.number, P.string), { 1: 'one', 2: 'two' })).toBe(true)
  })

  it('checks exact object keys recursively, including enumerable symbol extras', () => {
    const EXTRA = Symbol('extra')

    expect(isMatching(P.exact({ user: { name: P.string } }), { user: { name: 'Ada' } })).toBe(true)
    expect(isMatching(P.exact({ user: { name: P.string } }), { user: { name: 'Ada', age: 36 } })).toBe(false)
    expect(isMatching(P.exact({ user: { name: P.string } }), { user: { name: 'Ada' }, [EXTRA]: true })).toBe(false)
  })

  it('supports instance checks and assertion narrowing at runtime boundaries', () => {
    class CustomError extends Error {
      readonly code = 'custom'
    }

    const value: unknown = new CustomError('boom')

    expect(
      match(value)
        .with(P.instanceOf(CustomError), (error) => error.code)
        .otherwise(() => 'no'),
    ).toBe('custom')

    assertMatching(P.instanceOf(CustomError), value)
    expect(value.code).toBe('custom')
  })

  it('keeps union-branch selections isolated until a branch succeeds', () => {
    const input: unknown = { type: 'b', value: 2 }

    expect(
      match(input)
        .with(
          P.union({ type: 'a', value: P.select('value') }, { type: 'b', value: P.select('value') }),
          ({ value }) => value,
        )
        .otherwise(() => 0),
    ).toBe(2)
  })
})
