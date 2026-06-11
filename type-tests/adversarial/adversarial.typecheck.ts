import { match, matchBy, P } from '../../src/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Expect<T extends true> = T

const broadString: string = 'x'
const broadLiteral = match(broadString)
  .with('x', (value) => {
    const literal: 'x' = value
    return literal
  })
  .otherwise(() => 'other')
const _broadLiteralAssignable: 'x' | 'other' = broadLiteral

const broadObject: { type: string; data: string } = { type: 'start', data: 'ok' }
const _broadObjectResult = match(broadObject)
  .with({ type: 'start' }, (value) => value.data)
  .otherwise(() => 'other')
type _broadObjectResultType = Expect<Equal<typeof _broadObjectResult, string>>

type Result = { type: 'success'; data: string } | { type: 'error'; message: string }
declare const result: Result
const incomplete = match(result).with({ type: 'success' }, (value) => value.data)
// @ts-expect-error exhaustive is not callable while a variant remains
incomplete.exhaustive()
// @ts-expect-error exhaustive cannot be bypassed by passing the missing value
incomplete.exhaustive({ type: 'error', message: 'boom' })

const arrayValue: (number | string)[] = [1, 'x']
const arrayMatch = match(arrayValue)
  .with(P.array(P.number), (value) => value)
  .otherwise((): number[] => [])
const _arrayMatchAssignable: number[] = arrayMatch
// @ts-expect-error P.array(P.number) does not exhaust (number | string)[]
match(arrayValue)
  .with(P.array(P.number), () => 'numbers')
  .exhaustive()

const maybeEmpty: number[] = []
// @ts-expect-error P.nonEmptyArray does not exhaust broad number[] because [] is possible
match(maybeEmpty)
  .with(P.nonEmptyArray(P.number), () => 'non-empty')
  .exhaustive()

const tuple = [1, 2] as const
match(tuple)
  .with(P.nonEmptyArray(P.number), (value) => {
    const first: 1 | 2 = value[0]
    return first
  })
  .exhaustive()

const recordValue: number[] = [1, 2]
// @ts-expect-error P.record cannot match arrays because arrays are not records at runtime
match(recordValue).with(P.record(P.string, P.number), () => 'record')

type ExactUnion = { a: 1 } | { a: 1; b: 2 }
declare const exactUnion: ExactUnion
const exactPartial = match(exactUnion).with(P.exact({ a: 1 }), () => 1)
// @ts-expect-error P.exact({a: 1}) does not cover the extra-key variant
exactPartial.exhaustive()

declare const broadEvent: { type: string; data: string }
// @ts-expect-error cases requires a finite literal discriminant union
matchBy(broadEvent, 'type').cases({ start: (value) => value.data })
matchBy(broadEvent, 'type')
  .partial({ start: (value) => value.data })
  .otherwise((value) => value.data)

type Collision = { kind: true; a: string } | { kind: 'true'; b: string }
declare const collision: Collision
// @ts-expect-error object map cannot represent true and 'true' without a normalized key collision
matchBy(collision, 'kind').cases({ true: (value) => value })
matchBy(collision, 'kind').cases([
  [true, (value: Extract<Collision, { kind: true }>) => value.a],
  ['true', (value: Extract<Collision, { kind: 'true' }>) => value.b],
])

type NumericCollision = { kind: 1; a: string } | { kind: '1'; b: string }
declare const numericCollision: NumericCollision
// @ts-expect-error object map cannot represent 1 and '1' without a normalized key collision
matchBy(numericCollision, 'kind').cases({ 1: (value) => value })
matchBy(numericCollision, 'kind').cases([
  [1, (value: Extract<NumericCollision, { kind: 1 }>) => value.a],
  ['1', (value: Extract<NumericCollision, { kind: '1' }>) => value.b],
])

const partialMap = matchBy(result, 'type')
  .partial({ success: (value) => value.data })
  .otherwise((value) => {
    const message: string = value.message
    // @ts-expect-error fallback should be narrowed to the remaining error variant
    const _data = value.data
    return message
  })
const _partialMapAssignable: string = partialMap

const partialTuple = matchBy(result, 'type')
  .partial([['success', (value: Extract<Result, { type: 'success' }>) => value.data]])
  .otherwise((value) => value.message)
const _partialTupleAssignable: string = partialTuple

const tupleSelection = match([1, 'x'] as const)
  .with([P.select('n', P.number), P.select('s', P.string)], ({ n, s }) => `${n}:${s}`)
  .exhaustive()
const _tupleSelectionAssignable: string = tupleSelection

const multiPattern = match(result)
  .with({ type: 'success' }, { type: 'error' }, (value) => {
    if (value.type === 'success') return value.data
    return value.message
  })
  .exhaustive()
const _multiPatternAssignable: string = multiPattern

// @ts-expect-error multi-pattern branches reject impossible patterns
match(result).with({ type: 'success' }, { type: 'missing' }, () => 'bad')

declare const selectedUnionValue: 'a' | 'b'
const selectedUnionA = match(selectedUnionValue)
  .with(P.union(P.select('x', 'a'), 'b'), (payload) => {
    if (typeof payload === 'string') return payload
    return payload.x
  })
  .exhaustive()
const _selectedUnionAssignable: 'a' | 'b' = selectedUnionA

// @ts-expect-error P.nan cannot match a numeric literal
match(1).with(P.nan, () => 'nan')
declare const broadNumberForNan: number
// @ts-expect-error P.nan cannot exhaust broad number
match(broadNumberForNan)
  .with(P.nan, () => 'nan')
  .exhaustive()
declare const broadNumberForFinite: number
// @ts-expect-error P.finite cannot exhaust broad number because NaN/Infinity are possible
match(broadNumberForFinite)
  .with(P.finite, () => 'finite')
  .exhaustive()
declare const broadNumberForInteger: number
// @ts-expect-error P.integer cannot exhaust broad number because non-integers are possible
match(broadNumberForInteger)
  .with(P.integer, () => 'integer')
  .exhaustive()
// @ts-expect-error P.integer cannot match known non-integer literals
match(1.5).with(P.integer, () => 'integer')

const emptyArrayExhaustive = match([] as const)
  .with(P.array(P.number), () => 'empty')
  .exhaustive()
const _emptyArrayAssignable: 'empty' = emptyArrayExhaustive
// @ts-expect-error fixed tuple contains a string, so P.array(P.number) can never match
match([1, 'x'] as const).with(P.array(P.number), () => 'numbers')
declare const numberArrayForTuple: number[]
// @ts-expect-error broad number[] can never match a tuple requiring a string first item
match(numberArrayForTuple).with([P.string], () => 'bad')
// @ts-expect-error P.rest is only valid as the final item inside tuple patterns
match([1, 2] as const).with(P.rest(P.number), () => 'bad')
declare const numberArrayForRest: number[]
// @ts-expect-error P.rest is only valid as the final tuple item
match(numberArrayForRest).with([P.rest(P.number), P.number], () => 'bad')

declare const stringValueRecord: { a: string }
// @ts-expect-error record value pattern cannot match known string values
match(stringValueRecord).with(P.record(P.string, P.number), () => 'bad')
declare const staticallyEmptyObject: Record<never, never>
// @ts-expect-error non-empty record cannot match a statically empty object
match(staticallyEmptyObject).with(P.nonEmptyRecord(P.string, P.number), () => 'bad')

// @ts-expect-error duplicate anonymous selections are invalid
match({ a: 'x', b: 'y' }).with({ a: P.select(), b: P.select() }, () => 'bad')
// @ts-expect-error anonymous and named selections cannot be mixed
match({ a: 'x', b: 'y' }).with({ a: P.select(), b: P.select('b') }, () => 'bad')
declare const unknownForExclude: unknown
// @ts-expect-error selections inside P.exclude are invalid
match(unknownForExclude).with(P.exclude(P.select()), () => 'bad')
declare const stringArrayForSelect: string[]
// @ts-expect-error selections inside variable-length arrays are invalid
match(stringArrayForSelect).with(P.array(P.select()), () => 'bad')
declare const numberValueRecord: { a: number }
// @ts-expect-error selections inside records are invalid
match(numberValueRecord).with(P.record(P.string, P.select('value')), () => 'bad')
match(123).with(
  // @ts-expect-error boolean predicates must accept the current value type
  P.when((value: string) => value.length > 0),
  () => 'bad',
)
