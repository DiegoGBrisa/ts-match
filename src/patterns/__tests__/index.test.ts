import { describe, expect, it } from 'vitest'
import {
  P,
  pAny,
  pArray,
  pBigint,
  pBoolean,
  pCollect,
  pExact,
  pExclude,
  pFinite,
  pInstanceOf,
  pInteger,
  pNan,
  pNonEmptyArray,
  pNonEmptyRecord,
  pNull,
  pNumber,
  pOptional,
  pRecord,
  pRest,
  pSelect,
  pString,
  pSymbol,
  pTuple,
  pUndefined,
  pUnion,
  pWhen,
  pWildcard,
} from '../../index.js'

describe('P namespace and named p* exports', () => {
  it('exports named helpers matching the P namespace', () => {
    expect(pWildcard).toBe(P._)
    expect(pAny).toBe(P.any)
    expect(pString).toBe(P.string)
    expect(pNumber).toBe(P.number)
    expect(pBoolean).toBe(P.boolean)
    expect(pBigint).toBe(P.bigint)
    expect(pSymbol).toBe(P.symbol)
    expect(pNull).toBe(P.null)
    expect(pUndefined).toBe(P.undefined)
    expect(pNan).toBe(P.nan)
    expect(pFinite).toBe(P.finite)
    expect(pInteger).toBe(P.integer)
    expect(pUnion).toBe(P.union)
    expect(pExclude).toBe(P.exclude)
    expect(pOptional).toBe(P.optional)
    expect(pArray).toBe(P.array)
    expect(pNonEmptyArray).toBe(P.nonEmptyArray)
    expect(pTuple).toBe(P.tuple)
    expect(pRest).toBe(P.rest)
    expect(pExact).toBe(P.exact)
    expect(pWhen).toBe(P.when)
    expect(pInstanceOf).toBe(P.instanceOf)
    expect(pSelect).toBe(P.select)
    expect(pCollect).toBe(P.collect)
    expect(pRecord).toBe(P.record)
    expect(pNonEmptyRecord).toBe(P.nonEmptyRecord)
  })
})
