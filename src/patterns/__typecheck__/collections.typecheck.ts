import { match, P } from '../../index.js'
import type {
  TemporalDurationValue,
  TemporalInstantValue,
  TemporalPlainDateTimeValue,
  TemporalPlainDateValue,
  TemporalPlainMonthDayValue,
  TemporalPlainTimeValue,
  TemporalPlainYearMonthValue,
  TemporalValue,
  TemporalZonedDateTimeValue,
} from '../../index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

declare const temporalValue: TemporalValue

const _temporalAnyBuilder = match(temporalValue).with(P.temporal, (value) => {
  const temporal: TemporalValue = value
  return temporal[Symbol.toStringTag]
})
// @ts-expect-error Temporal helpers require runtime constructors and cannot prove structural TemporalValue exhaustiveness
_temporalAnyBuilder.exhaustive()
const _temporalAnyResult = _temporalAnyBuilder.otherwise(() => 'fallback')
type _temporalAny = Expect<
  Equal<
    typeof _temporalAnyResult,
    | 'Temporal.Instant'
    | 'Temporal.PlainDate'
    | 'Temporal.PlainTime'
    | 'Temporal.PlainDateTime'
    | 'Temporal.ZonedDateTime'
    | 'Temporal.Duration'
    | 'Temporal.PlainYearMonth'
    | 'Temporal.PlainMonthDay'
    | 'fallback'
  >
>

const _specificTemporalBuilder = match(temporalValue)
  .with(P.temporalInstant, (value) => {
    const temporal: TemporalInstantValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(P.temporalPlainDate, (value) => {
    const temporal: TemporalPlainDateValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(P.temporalPlainTime, (value) => {
    const temporal: TemporalPlainTimeValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(P.temporalPlainDateTime, (value) => {
    const temporal: TemporalPlainDateTimeValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(P.temporalZonedDateTime, (value) => {
    const temporal: TemporalZonedDateTimeValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(P.temporalDuration, (value) => {
    const temporal: TemporalDurationValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(P.temporalPlainYearMonth, (value) => {
    const temporal: TemporalPlainYearMonthValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(P.temporalPlainMonthDay, (value) => {
    const temporal: TemporalPlainMonthDayValue = value
    return temporal[Symbol.toStringTag]
  })
// @ts-expect-error Temporal helpers require runtime constructors and cannot prove structural TemporalValue exhaustiveness
_specificTemporalBuilder.exhaustive()
const _specificTemporalResult = _specificTemporalBuilder.otherwise(() => 'fallback')
type _specificTemporal = Expect<Equal<typeof _specificTemporalResult, typeof _temporalAnyResult>>

declare const collectionValue: Map<string, number> | Set<string> | 'ready' | 'idle'
const _collectionResult = match(collectionValue)
  .with(P.map(P.string, P.number), (value) => {
    value.set('count', value.get('count') ?? 0)
    return value.get('count')
  })
  .with(P.set(P.string), (value) => {
    value.add('checked')
    return value.size
  })
  .with(P.literal('ready'), (value) => {
    return value
  })
  .with('idle', () => 'idle')
  .exhaustive()
type _collection = Expect<Equal<typeof _collectionResult, number | 'ready' | 'idle' | undefined>>

declare const repeatedUsers: readonly (
  | { readonly id: string; readonly age: number }
  | { readonly id?: undefined; readonly age: number }
)[]
const _collectionCaptureResult = match({ source: 'sync' as const, users: repeatedUsers })
  .with(
    {
      source: P.select('source', P.string),
      users: P.array({ id: P.optional(P.collect('ids', P.string)), age: P.collect('ages', P.number) }),
    },
    (value) => {
      const source: string = value.source
      const ids: (string | undefined)[] = value.ids
      const ages: number[] = value.ages
      return { source, ids, ages }
    },
  )
  .otherwise(() => null)
const _collectionCaptureAssignable: { source: string; ids: (string | undefined)[]; ages: number[] } | null =
  _collectionCaptureResult

declare const mixedList: readonly (string | number | boolean | null)[]
const _collectionUnionResult = match(mixedList)
  .with(
    P.array(
      P.union(P.collect('values', P.string), P.collect('values', P.number), P.collect('flags', P.boolean), P.null),
    ),
    (value) => {
      const values: (string | number)[] = value.values
      const flags: boolean[] = value.flags
      return { values, flags }
    },
  )
  .otherwise(() => null)
const _collectionUnionAssignable: { values: (string | number)[]; flags: boolean[] } | null = _collectionUnionResult

declare const collectMap: Map<string, number>
const _collectionMapResult = match(collectMap)
  .with(P.map(P.collect('keys', P.string), P.collect('values', P.number)), (value) => {
    const keys: string[] = value.keys
    const values: number[] = value.values
    return keys.length + values.length
  })
  .exhaustive()
type _collectionMap = Expect<Equal<typeof _collectionMapResult, number>>

declare const collectSet: Set<'admin' | 'owner' | 1>
const _collectionSetResult = match(collectSet)
  .with(P.set(P.union(P.collect('roles', P.string), P.collect('levels', P.number))), (value) => {
    const roles: string[] = value.roles
    const levels: number[] = value.levels
    return roles.length + levels.length
  })
  .exhaustive()
type _collectionSet = Expect<Equal<typeof _collectionSetResult, number>>

match('x')
  // @ts-expect-error P.collect is only valid inside repeated container patterns
  .with(P.collect('ids', P.string), () => 'bad')
  .otherwise(() => 'fallback')

// @ts-expect-error P.collect is invalid inside negative patterns
P.array(P.exclude(P.collect('ids', P.string)))

match({ selected: 'x', ids: ['a'] }).with(
  // @ts-expect-error collection captures cannot mix with anonymous selections
  { selected: P.select(), ids: P.array(P.collect('ids', P.string)) },
  () => 'bad',
)

match({ source: 'sync', ids: ['a'] }).with(
  // @ts-expect-error collection capture names cannot collide with named selections
  { source: P.select('ids', P.string), ids: P.array(P.collect('ids', P.string)) },
  () => 'bad',
)

match({ source: 'sync', ids: ['a'] }).with(
  // @ts-expect-error numeric and string capture names share one JavaScript property key
  { source: P.select(1, P.string), ids: P.array(P.collect('1', P.string)) },
  () => 'bad',
)

declare const readonlyCollectionValue: ReadonlyMap<string, number> | ReadonlySet<string> | 'ready'
const _readonlyCollectionResult = match(readonlyCollectionValue)
  .with(P.map(P.string, P.number), (value) => {
    type _readonlyMapValue = Expect<Equal<typeof value, ReadonlyMap<string, number>>>
    // @ts-expect-error ReadonlyMap branch values must not expose mutable Map methods
    value.set('count', 1)
    return value.get('count')
  })
  .with(P.set(P.string), (value) => {
    type _readonlySetValue = Expect<Equal<typeof value, ReadonlySet<string>>>
    // @ts-expect-error ReadonlySet branch values must not expose mutable Set methods
    value.add('checked')
    return value.size
  })
  .with('ready', (value) => {
    return value
  })
  .exhaustive()
type _readonlyCollection = Expect<Equal<typeof _readonlyCollectionResult, number | 'ready' | undefined>>

declare const requiredEntryMap: Map<'id' | 'count', string | number>
const _requiredEntryMapBuilder = match(requiredEntryMap).with(P.map(['id', P.string], ['count', P.number]), (value) => {
  value.set('id', value.get('id') ?? 'fallback')
  return value.get('id') ?? value.get('count')
})
// @ts-expect-error required-entry map patterns cannot prove every possible Map value is covered
_requiredEntryMapBuilder.exhaustive()

declare const readonlyRequiredEntryMap: ReadonlyMap<'id' | 'count', string | number>
const _readonlyRequiredEntryMapBuilder = match(readonlyRequiredEntryMap).with(
  P.map(['id', P.string], ['count', P.number]),
  (value) => {
    type _readonlyRequiredMapValue = Expect<Equal<typeof value, ReadonlyMap<'id' | 'count', string | number>>>
    // @ts-expect-error ReadonlyMap required-entry branch values must stay readonly
    value.set('id', 'fallback')
    return value.get('id') ?? value.get('count')
  },
)
// @ts-expect-error required-entry map patterns cannot prove every possible ReadonlyMap value is covered
_readonlyRequiredEntryMapBuilder.exhaustive()

declare const requiredValueSet: Set<'admin' | 'owner'>
const _requiredValueSetBuilder = match(requiredValueSet).with(P.set('admin', 'owner'), (value) => {
  value.add('admin')
  return value.has('admin') && value.has('owner')
})
// @ts-expect-error required-value set patterns cannot prove every possible Set value is covered
_requiredValueSetBuilder.exhaustive()

declare const readonlyRequiredValueSet: ReadonlySet<'admin' | 'owner'>
const _readonlyRequiredValueSetBuilder = match(readonlyRequiredValueSet).with(P.set('admin', 'owner'), (value) => {
  type _readonlyRequiredSetValue = Expect<Equal<typeof value, ReadonlySet<'admin' | 'owner'>>>
  // @ts-expect-error ReadonlySet required-value branch values must stay readonly
  value.add('admin')
  return value.has('admin') && value.has('owner')
})
// @ts-expect-error required-value set patterns cannot prove every possible ReadonlySet value is covered
_readonlyRequiredValueSetBuilder.exhaustive()

declare const referenceToken: { readonly id: 'token' }
declare const tokenCandidate: typeof referenceToken
const _referenceLiteralBuilder = match(tokenCandidate).with(P.literal(referenceToken), (value) => {
  return value.id
})
// @ts-expect-error object/function/array P.literal(...) patterns match by runtime reference identity only
_referenceLiteralBuilder.exhaustive()

declare const literalNumberTarget: number
declare const literalNumberCandidate: number
const _broadPrimitiveLiteralBuilder = match(literalNumberCandidate).with(P.literal(literalNumberTarget), (value) => {
  type _value = Expect<Equal<typeof value, number>>
  return value
})
// @ts-expect-error broad primitive P.literal(...) patterns match one runtime value and cannot prove exhaustiveness
_broadPrimitiveLiteralBuilder.exhaustive()

declare const literalStatusTarget: 'ready' | 'idle'
declare const literalStatusCandidate: 'ready' | 'idle'
const _unionPrimitiveLiteralBuilder = match(literalStatusCandidate).with(P.literal(literalStatusTarget), (value) => {
  type _value = Expect<Equal<typeof value, 'ready' | 'idle'>>
  return value
})
// @ts-expect-error primitive-union P.literal(...) patterns match one runtime value and cannot prove exhaustiveness
_unionPrimitiveLiteralBuilder.exhaustive()
