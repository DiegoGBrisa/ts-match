import { assertMatching, isMatching, match, P } from '../src/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Expect<T extends true> = T

declare const unknownValue: unknown

const _primitiveResult = match(unknownValue)
  .with(P.boolean, (value) => {
    const _value: boolean = value
    return _value
  })
  .with(P.null, (value) => {
    const _value: null = value
    return _value
  })
  .with(P.undefined, (value) => {
    const _value: undefined = value
    return _value
  })
  .with(P.symbol, (value) => {
    const _value: symbol = value
    return _value
  })
  .otherwise(() => 'other')
type _primitiveReturn = Expect<Equal<typeof _primitiveResult, boolean | null | undefined | symbol | 'other'>>

type Status = 'idle' | 'loading' | 'success'
declare const status: Status

const _multiPatternResult = match(status)
  .with('idle', 'loading', (value) => {
    const _value: 'idle' | 'loading' = value
    return 'pending'
  })
  .with('success', (value) => {
    const _value: 'success' = value
    return _value
  })
  .exhaustive()
const _multiPatternAssignable: string = _multiPatternResult

type ExcludedInput =
  | { readonly type: 'success'; readonly data: string }
  | { readonly type: 'error'; readonly error: Error }
  | { readonly type: 'idle' }

declare const excludedInput: ExcludedInput

const _excludedResult = match(excludedInput)
  .with({ type: P.exclude('success') }, (value) => {
    const _type: 'error' | 'idle' = value.type
    return _type
  })
  .with({ type: 'success' }, (value) => value.data)
  .exhaustive()
type _excludedReturn = Expect<Equal<typeof _excludedResult, 'error' | 'idle' | string>>

type OptionalInput =
  | { readonly a?: { readonly name: 'Hello' | 'Bonjour'; readonly age: number } }
  | { readonly b: 'done' }
declare const optionalInput: OptionalInput

const _optionalResult = match(optionalInput)
  .with({ b: 'done' }, () => 'done')
  .with({ a: P.optional({ name: 'Hello' }) }, (value) => {
    const _a: { readonly name: 'Hello'; readonly age: number } | undefined = value.a
    return _a
  })
  .with({ a: { name: P.string } }, (value) => value.a?.name)
  .exhaustive()
type _optionalReturn = Expect<
  Equal<typeof _optionalResult, 'done' | { readonly name: 'Hello'; readonly age: number } | 'Bonjour' | undefined>
>

type OptionalSelectInput =
  | { readonly type: 'user'; readonly profile?: { readonly name: string; readonly age: number } }
  | { readonly type: 'system'; readonly reason?: 'shutdown' }

declare const optionalSelectInput: OptionalSelectInput

const _optionalSelectResult = match(optionalSelectInput)
  .with({ type: 'user', profile: P.optional({ name: P.select('name'), age: P.select('age') }) }, ({ age, name }) => {
    const _age: number | undefined = age
    const _name: string | undefined = name
    return _name ?? String(_age)
  })
  .with({ type: 'system', reason: P.optional(P.select('reason')) }, ({ reason }) => {
    const _reason: 'shutdown' | undefined = reason
    return _reason
  })
  .exhaustive()
type _optionalSelectReturn = Expect<Equal<typeof _optionalSelectResult, string | undefined>>

const OUTER = Symbol('outer')
const INNER = Symbol('inner')
const OTHER = Symbol('other')

type SymbolInput = { readonly [OUTER]: { readonly [INNER]: 'foo' | 'bar' } } | { readonly [OTHER]: string }
declare const symbolInput: SymbolInput

const _symbolResult = match(symbolInput)
  .with({ [OUTER]: { [INNER]: P.select('inner') } }, ({ inner }) => {
    const _inner: 'foo' | 'bar' = inner
    return inner
  })
  .with({ [OTHER]: P.select('other') }, ({ other }) => {
    const _other: string = other
    return other
  })
  .exhaustive()
type _symbolReturn = Expect<Equal<typeof _symbolResult, string>>

type Expr = readonly ['+', number, number] | readonly ['-', number] | readonly ['lit', string]
declare const expr: Expr

const _exprResult = match(expr)
  .with(['+', P.number, P.number], (value) => {
    const _value: readonly ['+', number, number] = value
    return value[1] + value[2]
  })
  .with(['-', P.number], (value) => {
    const _value: readonly ['-', number] = value
    return -value[1]
  })
  .with(['lit', P.string], (value) => value[1])
  .exhaustive()
type _exprReturn = Expect<Equal<typeof _exprResult, number | string>>

type Option<T> = { readonly kind: 'some'; readonly value: T } | { readonly kind: 'none' }

const _mapOption = <A, B>(option: Option<A>, mapper: (value: A) => B): Option<B> =>
  match(option)
    .when(
      (value): value is { readonly kind: 'some'; readonly value: A } => value.kind === 'some',
      (value) => ({ kind: 'some', value: mapper(value.value) }),
    )
    .when(
      (value): value is { readonly kind: 'none' } => value.kind === 'none',
      (value) => value,
    )
    .exhaustive()

const _mappedOption = _mapOption({ kind: 'some', value: 20 }, (value) => `number:${String(value)}`)
type _mappedOptionReturn = Expect<Equal<typeof _mappedOption, Option<string>>>

declare const unknownProfiles: unknown
const _profilesResult = match(unknownProfiles)
  .with(P.record(P.string, { name: P.string, age: P.number }), (profiles) => {
    const _profiles: Record<string, { name: string; age: number }> = profiles
    return _profiles
  })
  .otherwise(() => null)
type _profilesReturn = Expect<Equal<typeof _profilesResult, Record<string, { name: string; age: number }> | null>>

declare const readonlyNumbers: readonly (1 | 2)[]
const _readonlyArrayResult = match(readonlyNumbers)
  .with(P.array(P.union(1, 2)), (value) => {
    const _value: readonly (1 | 2)[] = value
    return value
  })
  .exhaustive()
type _readonlyArrayReturn = Expect<Equal<typeof _readonlyArrayResult, readonly (1 | 2)[]>>

const _filtered = [unknownValue].filter(isMatching({ type: 'user', id: P.string }))
type _filteredType = Expect<Equal<typeof _filtered, { type: 'user'; id: string }[]>>

assertMatching({ type: 'user', id: P.string }, unknownValue)
const _assertedId: string = unknownValue.id
