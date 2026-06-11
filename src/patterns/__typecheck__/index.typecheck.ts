import { isMatching } from '../../assertions/index.js'
import { match } from '../../match/index.js'
import {
  pBoolean,
  pCollect,
  pDate,
  pError,
  pExact,
  pExclude,
  pFalsy,
  pFinite,
  pInstanceOf,
  pInteger,
  pLiteral,
  pMap,
  pNonEmptyArray,
  pNonEmptyRecord,
  pNull,
  pNullish,
  pNumber,
  pOptional,
  pRecord,
  pRegex,
  pRegexp,
  pRest,
  pSet,
  pString,
  pTemporalInstant,
  pTruthy,
  pTuple,
  pUndefined,
  pUnion,
  pWhen,
} from '../index.js'
import type {
  CollectPattern,
  InferPattern,
  LiteralPattern,
  MapPattern,
  SetPattern,
  TemporalInstantValue,
} from '../../types/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

class DomainError extends Error {
  readonly code = 'domain-error'
}

declare const unknownInput: unknown

declare const candidateRecord: unknown

const _namedHelperInference = match(candidateRecord)
  .with(
    {
      id: pString,
      enabled: pBoolean,
      retries: pInteger,
      tags: pNonEmptyArray(pString),
      score: pOptional(pFinite),
      meta: pRecord(pString, pNumber),
    },
    (value) => {
      const id: string = value.id
      const enabled: boolean = value.enabled
      const retries: number = value.retries
      const firstTag: string = value.tags[0]
      const score: number | undefined = value.score
      const metaValue: number | undefined = value.meta.rank
      return `${id}:${String(enabled)}:${String(retries)}:${firstTag}:${String(score)}:${String(metaValue)}`
    },
  )
  .otherwise(() => 'invalid')
const _namedHelperAssignable: string = _namedHelperInference

const _tupleHelperInference = match(unknownInput)
  .with(pTuple([pString, pRest(pNumber)]), (value) => {
    const command: string = value[0]
    const firstAmount: number | undefined = value[1]
    return command.length + (firstAmount ?? 0)
  })
  .otherwise(() => 0)
type _tupleHelperResult = Expect<Equal<typeof _tupleHelperInference, number>>

const _advancedHelperInference = match(unknownInput)
  .with(pExact({ error: pInstanceOf(DomainError) }), (value) => {
    const code: string = value.error.code
    return code
  })
  .with(pUnion(pNull, pUndefined), () => 'empty')
  .otherwise(() => 'unknown')
type _advancedHelperResult = Expect<Equal<typeof _advancedHelperInference, string>>

const _convenienceHelperInference = match(unknownInput)
  .with(pRegex(/^user-/), (value) => {
    const text: string = value
    return text
  })
  .with(pDate, (value) => {
    const date: Date = value
    return date
  })
  .with(pError, (value) => {
    const error: Error = value
    return error
  })
  .with(pRegexp, (value) => {
    const regexp: RegExp = value
    return regexp
  })
  .with(pTemporalInstant, (value) => {
    const temporal: TemporalInstantValue = value
    return temporal[Symbol.toStringTag]
  })
  .with(pNullish, () => 'nullish')
  .with(pFalsy, () => 'falsy')
  .with(pTruthy, () => 'truthy')
  .otherwise(() => 'unknown')
type _convenienceHelperResult = Expect<Equal<typeof _convenienceHelperInference, string | Date | Error | RegExp>>

const _whenHelperInference = match(unknownInput)
  .with(
    pWhen((value: unknown): value is string => typeof value === 'string'),
    (value) => String(value),
  )
  .otherwise(() => 'not-order')
type _whenHelper = Expect<Equal<typeof _whenHelperInference, string>>

declare const publishStatus: 'draft' | 'published'
const _excludeHelperInference = match(publishStatus)
  .with(pExclude('draft'), (value) => {
    const published: 'published' = value
    return published
  })
  .with('draft', () => 'draft')
  .exhaustive()
type _excludeHelper = Expect<Equal<typeof _excludeHelperInference, 'draft' | 'published'>>

const recordHelperGuard = isMatching(pNonEmptyRecord(pString, pBoolean))
if (recordHelperGuard(unknownInput)) {
  const flags: Record<string, boolean> = unknownInput
  void flags
}

const _mapPatternType: MapPattern<typeof pString, typeof pNumber> = pMap(pString, pNumber)
const _setPatternType: SetPattern<readonly [typeof pString]> = pSet(pString)
const _literalPatternType: LiteralPattern<'ready'> = pLiteral('ready')
const _collectPatternType: CollectPattern<'ids', typeof pString> = pCollect('ids', pString)
type _mapPatternInference = Expect<Equal<InferPattern<typeof _mapPatternType>, Map<string, number>>>
type _setPatternInference = Expect<Equal<InferPattern<typeof _setPatternType>, Set<string>>>
type _literalPatternInference = Expect<Equal<InferPattern<typeof _literalPatternType>, 'ready'>>
type _collectPatternInference = Expect<Equal<InferPattern<typeof _collectPatternType>, string>>
// @ts-expect-error P.map requires homogeneous key/value patterns or required-entry clauses
pMap()
// @ts-expect-error P.map cannot mix required-entry clauses with homogeneous key/value patterns
pMap(['id', pString], pNumber)
// @ts-expect-error homogeneous tuple key/value patterns must use P.tuple([...])
pMap(pString, ['count', pNumber])
// @ts-expect-error P.set requires at least one value pattern
pSet()
