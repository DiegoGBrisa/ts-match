import { describe, expect, it } from 'vitest'
import {
  assertMatching,
  isMatching,
  match,
  matchBy,
  P,
  pBoolean,
  pNull,
  pNumber,
  pString,
  pUndefined,
} from '../../src/index.js'

const PROPERTY_SEED = 0x5eed_1234
const FUZZ_CASES = 250

type PrimitiveKind = 'string' | 'number' | 'boolean' | 'null' | 'undefined'
type PrimitiveValue = string | number | boolean | null | undefined
type TaggedValue =
  | { readonly tag: 'a'; readonly value: number }
  | { readonly tag: 'b'; readonly value: number }
  | { readonly tag: 'c'; readonly value: number }

function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

function integer(rng: () => number, maxExclusive: number) {
  return Math.floor(rng() * maxExclusive)
}

function primitiveKindAt(index: number): PrimitiveKind {
  if (index === 0) return 'string'
  if (index === 1) return 'number'
  if (index === 2) return 'boolean'
  if (index === 3) return 'null'
  return 'undefined'
}

function primitiveValue(kind: PrimitiveKind, index: number): PrimitiveValue {
  if (kind === 'string') return `s-${index}`
  if (kind === 'number') return index - 125
  if (kind === 'boolean') return index % 2 === 0
  if (kind === 'null') return null
  return undefined
}

function primitivePattern(kind: PrimitiveKind): unknown {
  if (kind === 'string') return P.string
  if (kind === 'number') return P.number
  if (kind === 'boolean') return P.boolean
  if (kind === 'null') return P.null
  return P.undefined
}

function primitiveOracle(kind: PrimitiveKind, value: unknown) {
  if (kind === 'string') return typeof value === 'string'
  if (kind === 'number') return typeof value === 'number'
  if (kind === 'boolean') return typeof value === 'boolean'
  if (kind === 'null') return value === null
  return value === undefined
}

function tagAt(index: number): TaggedValue['tag'] {
  if (index === 0) return 'a'
  if (index === 1) return 'b'
  return 'c'
}

function valueAtPath(value: unknown, path: readonly PropertyKey[]): unknown {
  let current = value
  for (const segment of path) {
    if ((typeof current !== 'object' && typeof current !== 'function') || current === null) return undefined
    if (!(segment in current)) return undefined
    current = Reflect.get(current, segment)
  }
  return current
}

describe('property-style deterministic validation', () => {
  it('matches primitive helpers against a simple oracle', () => {
    const rng = createRng(PROPERTY_SEED)

    for (let index = 0; index < FUZZ_CASES; index += 1) {
      const valueKind = primitiveKindAt(integer(rng, 5))
      const patternKind = primitiveKindAt(integer(rng, 5))
      const value = primitiveValue(valueKind, index)
      const pattern = primitivePattern(patternKind)

      expect(isMatching(pattern, value), `seed=${PROPERTY_SEED} index=${index}`).toBe(
        primitiveOracle(patternKind, value),
      )
    }
  })

  it('keeps P namespace helpers equivalent to p* named helpers', () => {
    const rng = createRng(PROPERTY_SEED + 1)
    const pairs: readonly {
      readonly name: string
      readonly namespacePattern: unknown
      readonly namedPattern: unknown
    }[] = [
      { name: 'string', namespacePattern: P.string, namedPattern: pString },
      { name: 'number', namespacePattern: P.number, namedPattern: pNumber },
      { name: 'boolean', namespacePattern: P.boolean, namedPattern: pBoolean },
      { name: 'null', namespacePattern: P.null, namedPattern: pNull },
      { name: 'undefined', namespacePattern: P.undefined, namedPattern: pUndefined },
    ]

    for (let index = 0; index < FUZZ_CASES; index += 1) {
      const valueKind = primitiveKindAt(integer(rng, 5))
      const value = primitiveValue(valueKind, index)
      const pair = pairs[integer(rng, pairs.length)]
      if (!pair) throw new Error('missing helper pair')

      expect(
        isMatching(pair.namespacePattern, value),
        `seed=${PROPERTY_SEED + 1} index=${index} helper=${pair.name}`,
      ).toBe(isMatching(pair.namedPattern, value))
    }
  })

  it('keeps assertMatching and isMatching in sync', () => {
    const rng = createRng(PROPERTY_SEED + 2)

    for (let index = 0; index < FUZZ_CASES; index += 1) {
      const valueKind = primitiveKindAt(integer(rng, 5))
      const patternKind = primitiveKindAt(integer(rng, 5))
      const value = primitiveValue(valueKind, index)
      const pattern = primitivePattern(patternKind)
      const matched = isMatching(pattern, value)

      if (matched) {
        expect(() => assertMatching(pattern, value), `seed=${PROPERTY_SEED + 2} index=${index}`).not.toThrow()
      } else {
        expect(() => assertMatching(pattern, value), `seed=${PROPERTY_SEED + 2} index=${index}`).toThrow()
      }
    }
  })

  it('matches matchBy direct and nested paths against a path oracle', () => {
    const rng = createRng(PROPERTY_SEED + 3)
    const handlers = {
      a: (value: Extract<TaggedValue, { tag: 'a' }>) => value.value + 1,
      b: (value: Extract<TaggedValue, { tag: 'b' }>) => value.value + 2,
      c: (value: Extract<TaggedValue, { tag: 'c' }>) => value.value + 3,
    }
    const nestedHandlers = {
      a: (value: { readonly meta: Extract<TaggedValue, { tag: 'a' }> }) => value.meta.value + 1,
      b: (value: { readonly meta: Extract<TaggedValue, { tag: 'b' }> }) => value.meta.value + 2,
      c: (value: { readonly meta: Extract<TaggedValue, { tag: 'c' }> }) => value.meta.value + 3,
    }

    for (let index = 0; index < FUZZ_CASES; index += 1) {
      const tag = tagAt(integer(rng, 3))
      const value: TaggedValue = { tag, value: index }
      const nested = { meta: value }
      const expectedDirect = tag === 'a' ? index + 1 : tag === 'b' ? index + 2 : index + 3
      const pathValue = valueAtPath(nested, ['meta', 'tag'])

      expect(pathValue, `seed=${PROPERTY_SEED + 3} index=${index}`).toBe(tag)
      expect(matchBy(value, 'tag').cases(handlers), `seed=${PROPERTY_SEED + 3} index=${index}`).toBe(expectedDirect)
      expect(matchBy(nested, 'meta.tag').cases(nestedHandlers), `seed=${PROPERTY_SEED + 3} index=${index}`).toBe(
        expectedDirect,
      )
      expect(
        matchBy(nested, ['meta', 'tag'] as const).cases(nestedHandlers),
        `seed=${PROPERTY_SEED + 3} index=${index}`,
      ).toBe(expectedDirect)
    }
  })

  it('keeps grouped cases equivalent to an obvious direct oracle', () => {
    const rng = createRng(PROPERTY_SEED + 4)

    for (let index = 0; index < FUZZ_CASES; index += 1) {
      const tag = tagAt(integer(rng, 3))
      const value: TaggedValue = { tag, value: index }
      const expected = tag === 'c' ? index * 3 : index

      expect(
        matchBy(value, 'tag').cases((group) => [
          group(['a', 'b'], (item) => item.value),
          group('c', (item) => item.value * 3),
        ]),
        `seed=${PROPERTY_SEED + 4} index=${index}`,
      ).toBe(expected)
    }
  })

  it('keeps match results equivalent to direct primitive classification', () => {
    const rng = createRng(PROPERTY_SEED + 5)

    for (let index = 0; index < FUZZ_CASES; index += 1) {
      const valueKind = primitiveKindAt(integer(rng, 5))
      const value = primitiveValue(valueKind, index)
      const expected = typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number' : 'other'

      expect(
        match(value)
          .with(P.string, () => 'string')
          .with(P.number, () => 'number')
          .otherwise(() => 'other'),
        `seed=${PROPERTY_SEED + 5} index=${index}`,
      ).toBe(expected)
    }
  })
})
