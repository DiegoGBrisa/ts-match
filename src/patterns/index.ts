import {
  pAny,
  pBigint,
  pBoolean,
  pDate,
  pError,
  pFalsy,
  pFinite,
  pInteger,
  pLiteral,
  pNan,
  pNull,
  pNullish,
  pNumber,
  pRegex,
  pRegexp,
  pString,
  pSymbol,
  pTemporal,
  pTemporalDuration,
  pTemporalInstant,
  pTemporalPlainDate,
  pTemporalPlainDateTime,
  pTemporalPlainMonthDay,
  pTemporalPlainTime,
  pTemporalPlainYearMonth,
  pTemporalZonedDateTime,
  pTruthy,
  pUndefined,
  pWildcard,
} from './primitives.js'
import { pArray, pExclude, pNonEmptyArray, pOptional, pUnion } from './combinators.js'
import { pMap, pSet } from './collections.js'
import { pExact, pRest, pTuple } from './tuple-exact.js'
import { pCollect, pInstanceOf, pNonEmptyRecord, pRecord, pSelect, pWhen } from './selection.js'
export type {} from '../types/index.js'

export {
  pAny,
  pArray,
  pBigint,
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
  pNan,
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
  pSelect,
  pSet,
  pString,
  pSymbol,
  pTemporal,
  pTemporalDuration,
  pTemporalInstant,
  pTemporalPlainDate,
  pTemporalPlainDateTime,
  pTemporalPlainMonthDay,
  pTemporalPlainTime,
  pTemporalPlainYearMonth,
  pTemporalZonedDateTime,
  pTruthy,
  pTuple,
  pUndefined,
  pUnion,
  pWhen,
  pWildcard,
}

/**
 * Namespace-style collection of every public pattern helper.
 *
 * Import `P` for the default documented API shape, then use helpers inside
 * `match`, `matchBy`, `isMatching`, and `assertMatching` patterns. The named
 * `p*` exports are equivalent tree-shakable aliases for consumers that prefer
 * direct imports.
 *
 * @example
 * ```ts
 * import { match, P } from '@diegogbrisa/ts-match'
 * match(value).with({ type: 'ready', payload: P.string }, ({ payload }) => payload).exhaustive()
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match#named-p-helper-exports
 */
export const P = Object.freeze({
  _: pWildcard,
  any: pAny,
  string: pString,
  number: pNumber,
  boolean: pBoolean,
  bigint: pBigint,
  symbol: pSymbol,
  null: pNull,
  undefined: pUndefined,
  nan: pNan,
  finite: pFinite,
  integer: pInteger,
  regex: pRegex,
  date: pDate,
  error: pError,
  regexp: pRegexp,
  nullish: pNullish,
  falsy: pFalsy,
  truthy: pTruthy,
  temporal: pTemporal,
  temporalInstant: pTemporalInstant,
  temporalPlainDate: pTemporalPlainDate,
  temporalPlainTime: pTemporalPlainTime,
  temporalPlainDateTime: pTemporalPlainDateTime,
  temporalZonedDateTime: pTemporalZonedDateTime,
  temporalDuration: pTemporalDuration,
  temporalPlainYearMonth: pTemporalPlainYearMonth,
  temporalPlainMonthDay: pTemporalPlainMonthDay,
  literal: pLiteral,
  union: pUnion,
  exclude: pExclude,
  optional: pOptional,
  array: pArray,
  nonEmptyArray: pNonEmptyArray,
  map: pMap,
  set: pSet,
  tuple: pTuple,
  rest: pRest,
  exact: pExact,
  when: pWhen,
  instanceOf: pInstanceOf,
  select: pSelect,
  collect: pCollect,
  record: pRecord,
  nonEmptyRecord: pNonEmptyRecord,
})
