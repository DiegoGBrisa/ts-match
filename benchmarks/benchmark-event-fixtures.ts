import {
  EVENT_DELTA_MULTIPLIER,
  EVENT_DELTA_VALUE,
  EVENT_START_VALUE,
  EVENT_STOP_MULTIPLIER,
  EVENT_STOP_VALUE,
} from './benchmark-constants.js'

export type BenchmarkEvent =
  | { type: 'start'; value: number; meta: { phase: 'open' } }
  | { type: 'delta'; value: number; meta: { phase: 'active' } }
  | { type: 'stop'; value: number; meta: { phase: 'closed' } }

const EVENTS: readonly BenchmarkEvent[] = [
  { type: 'start', value: EVENT_START_VALUE, meta: { phase: 'open' } },
  { type: 'delta', value: EVENT_DELTA_VALUE, meta: { phase: 'active' } },
  { type: 'stop', value: EVENT_STOP_VALUE, meta: { phase: 'closed' } },
]

export const benchmarkEventCaseMap = {
  start: (event: Extract<BenchmarkEvent, { type: 'start' }>) => event.value,
  delta: (event: Extract<BenchmarkEvent, { type: 'delta' }>) => event.value * EVENT_DELTA_MULTIPLIER,
  stop: (event: Extract<BenchmarkEvent, { type: 'stop' }>) => event.value * EVENT_STOP_MULTIPLIER,
}

export const benchmarkAsyncEventCaseMap = {
  start: async (event: Extract<BenchmarkEvent, { type: 'start' }>) => event.value,
  delta: async (event: Extract<BenchmarkEvent, { type: 'delta' }>) => event.value * EVENT_DELTA_MULTIPLIER,
  stop: async (event: Extract<BenchmarkEvent, { type: 'stop' }>) => event.value * EVENT_STOP_MULTIPLIER,
}

export const benchmarkNestedPhaseCaseMap = {
  open: (event: Extract<BenchmarkEvent, { meta: { phase: 'open' } }>) => event.value,
  active: (event: Extract<BenchmarkEvent, { meta: { phase: 'active' } }>) => event.value * EVENT_DELTA_MULTIPLIER,
  closed: (event: Extract<BenchmarkEvent, { meta: { phase: 'closed' } }>) => event.value * EVENT_STOP_MULTIPLIER,
}

export function benchmarkEventAt(index: number): BenchmarkEvent {
  const event = EVENTS[index % EVENTS.length]
  if (!event) throw new Error('benchmark events must not be empty')
  return event
}

export async function benchmarkAsyncEvent(): Promise<BenchmarkEvent> {
  return { type: 'delta', value: EVENT_DELTA_VALUE, meta: { phase: 'active' } }
}
