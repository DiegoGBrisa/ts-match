import { match, P } from '@diegogbrisa/ts-match'

const input: unknown = 'hello'

const label = match(input)
  .with(P.string, (value) => value.toUpperCase())
  .with(P.number, (value) => `number:${String(value)}`)
  .otherwise(() => 'unknown')

if (label !== 'HELLO') throw new Error(`Expected HELLO, got ${label}`)
