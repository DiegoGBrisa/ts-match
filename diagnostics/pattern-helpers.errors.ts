import { P, pArray, pExclude, pNonEmptyArray, pNonEmptyRecord, pRecord, pTuple, pWhen } from '../src/index.js'

// Intended diagnostic: ts-match says P.array cannot contain P.select.
P.array(P.select('item'))

// Intended diagnostic: ts-match says pArray has the same diagnostics as P.array.
pArray(P.select('item'))

// Intended diagnostic: ts-match says P.nonEmptyArray cannot contain P.select.
pNonEmptyArray(P.select('item'))

// Intended diagnostic: ts-match says P.exclude cannot contain P.select.
P.exclude(P.select('excluded'))

// Intended diagnostic: ts-match says pExclude has the same diagnostics as P.exclude.
pExclude(P.select('excluded'))

// Intended diagnostic: ts-match says P.rest must be the final item in tuple patterns.
P.tuple([P.rest(P.string), P.number] as const)

// Intended diagnostic: ts-match says pTuple has the same rest-placement diagnostic as P.tuple.
pTuple([P.rest(P.string), P.number] as const)

// Intended diagnostic: ts-match says record key patterns must match property keys.
P.record(P.array(P.string), P.number)

// Intended diagnostic: ts-match says record value patterns cannot contain P.select.
pRecord(P.string, P.select('value'))

// Intended diagnostic: ts-match says non-empty record key patterns cannot contain P.select.
pNonEmptyRecord(P.select('key'), P.number)

// Intended diagnostic: TypeScript says predicates must return boolean or a type predicate.
pWhen((value: string) => value.length)
