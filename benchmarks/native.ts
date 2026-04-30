import { performance } from 'node:perf_hooks'
import { isMatching, match, matchBy, P } from '../dist/index.js'

const ITERATIONS = 500_000
const ASYNC_ITERATIONS = 20_000
const WARMUP_ROUNDS = 2
const MEASURED_ROUNDS = 9

let benchmarkSink = 0

type Event =
  | { type: 'start'; value: number; meta: { phase: 'open' } }
  | { type: 'delta'; value: number; meta: { phase: 'active' } }
  | { type: 'stop'; value: number; meta: { phase: 'closed' } }

const events: readonly Event[] = [
  { type: 'start', value: 1, meta: { phase: 'open' } },
  { type: 'delta', value: 2, meta: { phase: 'active' } },
  { type: 'stop', value: 3, meta: { phase: 'closed' } },
]

const eventCaseMap = {
  start: (value: Extract<Event, { type: 'start' }>) => value.value,
  delta: (value: Extract<Event, { type: 'delta' }>) => value.value * 2,
  stop: (value: Extract<Event, { type: 'stop' }>) => value.value * 3,
}

const asyncEventCaseMap = {
  start: async (value: Extract<Event, { type: 'start' }>) => value.value,
  delta: async (value: Extract<Event, { type: 'delta' }>) => value.value * 2,
  stop: async (value: Extract<Event, { type: 'stop' }>) => value.value * 3,
}

const nestedPhaseCaseMap = {
  open: (value: Extract<Event, { meta: { phase: 'open' } }>) => value.value,
  active: (value: Extract<Event, { meta: { phase: 'active' } }>) => value.value * 2,
  closed: (value: Extract<Event, { meta: { phase: 'closed' } }>) => value.value * 3,
}

const objectRecordPattern = P.record(P.number, P.string)
const objectPattern = { type: 'delta' as const, value: P.number }
const nestedObjectPattern = { meta: { phase: 'active' as const }, value: P.number }
const tuplePattern = [P.string, P.number, P.boolean] as const
const arrayPattern = P.array(P.number)
const stringPattern = P.string
const recordValue = { 1: 'one', 2: 'two', 3: 'three' }
const tupleValue = ['ok', 1, true] as const
const arrayValue = [1, 2, 3, 4, 5]
async function asyncEvent(): Promise<Event> {
  return { type: 'delta', value: 2, meta: { phase: 'active' } }
}

type SyncTask = {
  readonly name: string
  readonly iterations: number
  readonly run: () => number
}

type AsyncTask = {
  readonly name: string
  readonly iterations: number
  readonly run: () => Promise<number>
}

function eventAt(index: number): Event {
  const event = events[index % events.length]
  if (!event) throw new Error('benchmark events must not be empty')
  return event
}

function blackhole(value: number): void {
  benchmarkSink = (benchmarkSink + value) % Number.MAX_SAFE_INTEGER
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const value = sorted[middle]
  if (value === undefined) throw new Error('median requires at least one sample')
  return value
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function standardDeviation(values: readonly number[]): number {
  const average = mean(values)
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function printMeasurement(name: string, iterations: number, samples: readonly number[], result: number): void {
  const milliseconds = median(samples)
  const nsPerOperation = (milliseconds * 1_000_000) / iterations
  const opsPerSecond = 1_000_000_000 / nsPerOperation
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const stdev = standardDeviation(samples)
  console.log(
    `${name.padEnd(34)} ${milliseconds.toFixed(2)}ms  ${nsPerOperation.toFixed(1)}ns/op  ${opsPerSecond.toFixed(0)} ops/sec  min=${min.toFixed(2)}ms  max=${max.toFixed(2)}ms  σ=${stdev.toFixed(2)}ms  result=${result}`,
  )
}

function measure(task: SyncTask): void {
  let result = 0
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) result = task.run()

  const samples: number[] = []
  for (let round = 0; round < MEASURED_ROUNDS; round += 1) {
    const start = performance.now()
    result = task.run()
    samples.push(performance.now() - start)
  }

  blackhole(result)
  printMeasurement(task.name, task.iterations, samples, result)
}

async function measureAsync(task: AsyncTask): Promise<void> {
  let result = 0
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) result = await task.run()

  const samples: number[] = []
  for (let round = 0; round < MEASURED_ROUNDS; round += 1) {
    const start = performance.now()
    result = await task.run()
    samples.push(performance.now() - start)
  }

  blackhole(result)
  printMeasurement(task.name, task.iterations, samples, result)
}

const syncTasks: readonly SyncTask[] = [
  {
    name: 'native switch',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        const event = eventAt(index)
        switch (event.type) {
          case 'start':
            total += event.value
            break
          case 'delta':
            total += event.value * 2
            break
          case 'stop':
            total += event.value * 3
            break
        }
      }
      return total
    },
  },
  {
    name: 'matchBy fluent',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        const event = eventAt(index)
        total += matchBy(event, 'type')
          .with('start', (value) => value.value)
          .with('delta', (value) => value.value * 2)
          .with('stop', (value) => value.value * 3)
          .exhaustive()
      }
      return total
    },
  },
  {
    name: 'matchBy cases inline object',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        const event = eventAt(index)
        total += matchBy(event, 'type').cases({
          start: (value) => value.value,
          delta: (value) => value.value * 2,
          stop: (value) => value.value * 3,
        })
      }
      return total
    },
  },
  {
    name: 'matchBy cases hoisted object',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type').cases(eventCaseMap)
      }
      return total
    },
  },
  {
    name: 'matchBy partial hoisted object',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type')
          .partial(eventCaseMap)
          .otherwise(() => 0)
      }
      return total
    },
  },
  {
    name: 'matchBy nested path',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'meta.phase').cases(nestedPhaseCaseMap)
      }
      return total
    },
  },
  {
    name: 'matchBy grouped callback',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type').cases((group) => [
          group(['start', 'delta'], (value) => value.value),
          group('stop', (value) => value.value * 3),
        ])
      }
      return total
    },
  },
  {
    name: 'match object pattern',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          match(eventAt(index))
            .with(objectPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    name: 'match nested object pattern',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          match(eventAt(index))
            .with(nestedObjectPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    name: 'match tuple pattern',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          match(tupleValue)
            .with(tuplePattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    name: 'match array pattern',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          match(arrayValue)
            .with(arrayPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    name: 'match predicate',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      const isDelta = (value: Event) =>
        match(value)
          .with({ type: 'delta' }, () => true)
          .otherwise(() => false)
      for (let index = 0; index < ITERATIONS; index += 1) {
        const event = eventAt(index)
        if (isDelta(event)) total += event.value
      }
      return total
    },
  },
  {
    name: 'isMatching primitive',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (isMatching(stringPattern, 'value')) total += 1
      }
      return total
    },
  },
  {
    name: 'isMatching record',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (isMatching(objectRecordPattern, recordValue)) total += 1
      }
      return total
    },
  },
]

const asyncTasks: readonly AsyncTask[] = [
  {
    name: 'match.async exhaustive',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        const event = await asyncEvent()
        total += await match
          .async(event)
          .with({ type: 'delta' }, async (value) => value.value)
          .otherwise(async () => 0)
      }
      return total
    },
  },
  {
    name: 'matchBy.async cases',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        const event = await asyncEvent()
        total += await matchBy.async(event, 'type').cases(asyncEventCaseMap)
      }
      return total
    },
  },
]

console.log(
  `node=${process.version} platform=${process.platform} arch=${process.arch} iterations=${ITERATIONS} asyncIterations=${ASYNC_ITERATIONS} warmup=${WARMUP_ROUNDS} rounds=${MEASURED_ROUNDS}`,
)
for (const task of syncTasks) measure(task)
for (const task of asyncTasks) await measureAsync(task)
console.log(`benchmarkSink=${benchmarkSink}`)
