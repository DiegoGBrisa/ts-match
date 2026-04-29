import {
  isMatching,
  match,
  pAny,
  pArray,
  pBigint,
  pBoolean,
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
} from '@diegogbrisa/ts-match'

class NamedHelperError extends Error {}

const helperChecks = [
  isMatching(pWildcard, 'anything'),
  isMatching(pAny, 'anything'),
  isMatching(pString, 'text'),
  isMatching(pNumber, 1),
  isMatching(pBoolean, true),
  isMatching(pBigint, 1n),
  isMatching(pSymbol, Symbol('s')),
  isMatching(pNull, null),
  isMatching(pUndefined, undefined),
  isMatching(pNan, Number.NaN),
  isMatching(pFinite, 1),
  isMatching(pInteger, 1),
  isMatching(pUnion('a', 'b'), 'a'),
  isMatching(pArray(pNumber), [1, 2]),
  isMatching(pNonEmptyArray(pString), ['a']),
  isMatching(pTuple([pString, pRest(pNumber)]), ['sum', 1, 2]),
  isMatching(pExact({ id: pString }), { id: 'x' }),
  isMatching(
    pWhen((value: number) => value > 0),
    1,
  ),
  isMatching(pInstanceOf(NamedHelperError), new NamedHelperError('x')),
  isMatching(pRecord(pString, pNumber), { a: 1 }),
  isMatching(pNonEmptyRecord(pString, pBoolean), { enabled: true }),
]

if (helperChecks.some((check) => !check)) throw new Error('Expected named helper parity checks to pass')

type NamedInput = { readonly kind: 'user'; readonly name: string } | { readonly kind: 'team'; readonly name: string }

function readName(input: NamedInput): string {
  return match(input)
    .with({ kind: 'user', name: pSelect('name', pString), nickname: pOptional(pString) }, ({ name }) => name)
    .with({ kind: pExclude('user') }, () => 'other')
    .exhaustive()
}

const selected = readName({ kind: 'user', name: 'Ada' })

if (selected !== 'Ada') throw new Error(`Expected Ada, got ${selected}`)
