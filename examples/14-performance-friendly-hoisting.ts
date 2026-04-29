import { isMatching, matchBy, P } from '@diegogbrisa/ts-match'

type CounterAction =
  | { readonly type: 'increment'; readonly amount: number }
  | { readonly type: 'decrement'; readonly amount: number }
  | { readonly type: 'reset' }

const telemetryPattern = P.exact({ event: P.string, count: P.number })
const isTelemetry = isMatching(telemetryPattern)

function applyCounter(count: number, action: CounterAction): number {
  return matchBy(action, 'type')
    .with('increment', (value) => count + value.amount)
    .with('decrement', (value) => count - value.amount)
    .with('reset', () => 0)
    .exhaustive()
}

const next = applyCounter(10, { type: 'decrement', amount: 3 })
const validTelemetry = isTelemetry({ event: 'counter.updated', count: next })

if (next !== 7) throw new Error(`Expected 7, got ${String(next)}`)
if (!validTelemetry) throw new Error('Expected hoisted telemetry pattern to match')
