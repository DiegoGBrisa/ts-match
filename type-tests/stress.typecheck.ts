import { match, matchBy, P } from '../src/index.js'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Expect<T extends true> = T

type WideEvent =
  | { type: 'e00'; payload: { code: 0; value: string }; retryable: false }
  | { type: 'e01'; payload: { code: 1; value: string }; retryable: true }
  | { type: 'e02'; payload: { code: 2; value: string }; retryable: false }
  | { type: 'e03'; payload: { code: 3; value: string }; retryable: true }
  | { type: 'e04'; payload: { code: 4; value: string }; retryable: false }
  | { type: 'e05'; payload: { code: 5; value: string }; retryable: true }
  | { type: 'e06'; payload: { code: 6; value: string }; retryable: false }
  | { type: 'e07'; payload: { code: 7; value: string }; retryable: true }
  | { type: 'e08'; payload: { code: 8; value: string }; retryable: false }
  | { type: 'e09'; payload: { code: 9; value: string }; retryable: true }
  | { type: 'e10'; payload: { code: 10; value: string }; retryable: false }
  | { type: 'e11'; payload: { code: 11; value: string }; retryable: true }
  | { type: 'e12'; payload: { code: 12; value: string }; retryable: false }
  | { type: 'e13'; payload: { code: 13; value: string }; retryable: true }
  | { type: 'e14'; payload: { code: 14; value: string }; retryable: false }
  | { type: 'e15'; payload: { code: 15; value: string }; retryable: true }
  | { type: 'e16'; payload: { code: 16; value: string }; retryable: false }
  | { type: 'e17'; payload: { code: 17; value: string }; retryable: true }
  | { type: 'e18'; payload: { code: 18; value: string }; retryable: false }
  | { type: 'e19'; payload: { code: 19; value: string }; retryable: true }
  | { type: 'e20'; payload: { code: 20; value: string }; retryable: false }
  | { type: 'e21'; payload: { code: 21; value: string }; retryable: true }
  | { type: 'e22'; payload: { code: 22; value: string }; retryable: false }
  | { type: 'e23'; payload: { code: 23; value: string }; retryable: true }

declare const event: WideEvent

const _fluentResult = match(event)
  .with({ type: 'e00', payload: { code: 0 } }, (value) => value.payload.value)
  .with({ type: 'e01', payload: { code: 1 } }, (value) => value.payload.value)
  .with({ type: 'e02', payload: { code: 2 } }, (value) => value.payload.value)
  .with({ type: 'e03', payload: { code: 3 } }, (value) => value.payload.value)
  .with({ type: 'e04', payload: { code: 4 } }, (value) => value.payload.value)
  .with({ type: 'e05', payload: { code: 5 } }, (value) => value.payload.value)
  .with({ type: 'e06', payload: { code: 6 } }, (value) => value.payload.value)
  .with({ type: 'e07', payload: { code: 7 } }, (value) => value.payload.value)
  .with({ type: 'e08', payload: { code: 8 } }, (value) => value.payload.value)
  .with({ type: 'e09', payload: { code: 9 } }, (value) => value.payload.value)
  .with({ type: 'e10', payload: { code: 10 } }, (value) => value.payload.value)
  .with({ type: 'e11', payload: { code: 11 } }, (value) => value.payload.value)
  .with({ type: 'e12', payload: { code: 12 } }, (value) => value.payload.value)
  .with({ type: 'e13', payload: { code: 13 } }, (value) => value.payload.value)
  .with({ type: 'e14', payload: { code: 14 } }, (value) => value.payload.value)
  .with({ type: 'e15', payload: { code: 15 } }, (value) => value.payload.value)
  .with({ type: 'e16', payload: { code: 16 } }, (value) => value.payload.value)
  .with({ type: 'e17', payload: { code: 17 } }, (value) => value.payload.value)
  .with({ type: 'e18', payload: { code: 18 } }, (value) => value.payload.value)
  .with({ type: 'e19', payload: { code: 19 } }, (value) => value.payload.value)
  .with({ type: 'e20', payload: { code: 20 } }, (value) => value.payload.value)
  .with({ type: 'e21', payload: { code: 21 } }, (value) => value.payload.value)
  .with({ type: 'e22', payload: { code: 22 } }, (value) => value.payload.value)
  .with({ type: 'e23', payload: { code: 23 } }, (value) => value.payload.value)
  .exhaustive()

type _fluent = Expect<Equal<typeof _fluentResult, string>>

const _mappedResult = matchBy(event, 'type').cases({
  e00: (value) => value.payload.code,
  e01: (value) => value.payload.code,
  e02: (value) => value.payload.code,
  e03: (value) => value.payload.code,
  e04: (value) => value.payload.code,
  e05: (value) => value.payload.code,
  e06: (value) => value.payload.code,
  e07: (value) => value.payload.code,
  e08: (value) => value.payload.code,
  e09: (value) => value.payload.code,
  e10: (value) => value.payload.code,
  e11: (value) => value.payload.code,
  e12: (value) => value.payload.code,
  e13: (value) => value.payload.code,
  e14: (value) => value.payload.code,
  e15: (value) => value.payload.code,
  e16: (value) => value.payload.code,
  e17: (value) => value.payload.code,
  e18: (value) => value.payload.code,
  e19: (value) => value.payload.code,
  e20: (value) => value.payload.code,
  e21: (value) => value.payload.code,
  e22: (value) => value.payload.code,
  e23: (value) => value.payload.code,
})

type _mapped = Expect<
  Equal<
    typeof _mappedResult,
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23
  >
>

const _selectedResult = match(event)
  .with({ type: P.select('type'), payload: { code: P.select('code'), value: P.string } }, (selection) => selection)
  .exhaustive()

type _selected = Expect<Equal<typeof _selectedResult, { type: WideEvent['type']; code: WideEvent['payload']['code'] }>>

const _nestedMappedResult = matchBy(event, 'payload.code').cases({
  0: (value) => value.payload.value,
  1: (value) => value.payload.value,
  2: (value) => value.payload.value,
  3: (value) => value.payload.value,
  4: (value) => value.payload.value,
  5: (value) => value.payload.value,
  6: (value) => value.payload.value,
  7: (value) => value.payload.value,
  8: (value) => value.payload.value,
  9: (value) => value.payload.value,
  10: (value) => value.payload.value,
  11: (value) => value.payload.value,
  12: (value) => value.payload.value,
  13: (value) => value.payload.value,
  14: (value) => value.payload.value,
  15: (value) => value.payload.value,
  16: (value) => value.payload.value,
  17: (value) => value.payload.value,
  18: (value) => value.payload.value,
  19: (value) => value.payload.value,
  20: (value) => value.payload.value,
  21: (value) => value.payload.value,
  22: (value) => value.payload.value,
  23: (value) => value.payload.value,
})

type _nestedMapped = Expect<Equal<typeof _nestedMappedResult, string>>

const _partialStressResult = matchBy(event, 'type')
  .partial({
    e00: (value) => value.payload.code,
    e01: (value) => value.payload.code,
    e02: (value) => value.payload.code,
    e03: (value) => value.payload.code,
    e04: (value) => value.payload.code,
    e05: (value) => value.payload.code,
    e06: (value) => value.payload.code,
    e07: (value) => value.payload.code,
    e08: (value) => value.payload.code,
    e09: (value) => value.payload.code,
    e10: (value) => value.payload.code,
    e11: (value) => value.payload.code,
  })
  .otherwise((value) => value.payload.code)

type _partialStress = Expect<Equal<typeof _partialStressResult, WideEvent['payload']['code']>>

const _asyncStressResult = match
  .async(event)
  .with({ retryable: true }, async (value) => value.payload.value)
  .with({ retryable: false }, (value) => value.payload.value)
  .exhaustive()

type _asyncStress = Expect<Equal<typeof _asyncStressResult, Promise<string>>>
