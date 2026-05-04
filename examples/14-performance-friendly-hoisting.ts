import { isMatching, matchBy, P } from '@diegogbrisa/ts-match'

type CounterAction =
  | { readonly type: 'increment'; readonly amount: number }
  | { readonly type: 'decrement'; readonly amount: number }
  | { readonly type: 'reset' }

const telemetryPattern = P.exact({ event: P.string, count: P.number })
export const isTelemetry = isMatching(telemetryPattern)

export function applyCounter(count: number, action: CounterAction) {
  return matchBy(action, 'type')
    .with('increment', (value) => count + value.amount)
    .with('decrement', (value) => count - value.amount)
    .with('reset', () => 0)
    .exhaustive()
}
