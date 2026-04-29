import { assertMatching, isMatching, P } from '../src/index.js'

declare const input: unknown

// Intended diagnostic: ts-match says top-level P.rest is not a valid assertion pattern.
isMatching(P.rest(P.string), input)

// Intended diagnostic: ts-match says repeated-container selections are invalid for isMatching.
isMatching(P.array(P.select('item')), input)

// Intended diagnostic: ts-match says duplicate anonymous selections are invalid for assertMatching.
assertMatching({ a: P.select(), b: P.select() }, input)

// Intended diagnostic: ts-match says selections inside P.exclude are invalid for assertMatching.
assertMatching(P.exclude(P.select('excluded')), input)
