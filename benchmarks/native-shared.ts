import { performance } from 'node:perf_hooks'
import { P } from '../dist/index.js'
import {
  ARRAY_VALUE_FIVE,
  ARRAY_VALUE_FOUR,
  EVENT_DELTA_VALUE,
  EVENT_START_VALUE,
  EVENT_STOP_VALUE,
  FIXED_DECIMAL_PLACES,
  MEDIAN_DIVISOR,
  NATIVE_NAME_WIDTH,
  NS_PER_MS,
  NS_PER_SECOND,
  VARIANCE_POWER,
} from './benchmark-constants.js'

export {
  benchmarkAsyncEvent as asyncEvent,
  benchmarkAsyncEventCaseMap as asyncEventCaseMap,
  benchmarkEventAt as eventAt,
  benchmarkEventCaseMap as eventCaseMap,
  benchmarkNestedPhaseCaseMap as nestedPhaseCaseMap,
} from './benchmark-event-fixtures.js'
export type { BenchmarkEvent } from './benchmark-event-fixtures.js'

export const ITERATIONS = 500_000
export const ASYNC_ITERATIONS = 20_000
export const WARMUP_ROUNDS = 2
export const MEASURED_ROUNDS = 9

let benchmarkSink = 0

export type SyncTask = {
  readonly name: string
  readonly iterations: number
  readonly run: () => number
}

export type AsyncTask = {
  readonly name: string
  readonly iterations: number
  readonly run: () => Promise<number>
}

export const objectRecordPattern = P.record(P.number, P.string)
export const objectPattern = { type: 'delta' as const, value: P.number }
export const nestedObjectPattern = { meta: { phase: 'active' as const }, value: P.number }
export const tuplePattern = [P.string, P.number, P.boolean] as const
export const arrayPattern = P.array(P.number)
export const stringPattern = P.string
export const recordValue = {
  [EVENT_START_VALUE]: 'one',
  [EVENT_DELTA_VALUE]: 'two',
  [EVENT_STOP_VALUE]: 'three',
}
export const tupleValue = ['ok', EVENT_START_VALUE, true] as const
export const arrayValue = [EVENT_START_VALUE, EVENT_DELTA_VALUE, EVENT_STOP_VALUE, ARRAY_VALUE_FOUR, ARRAY_VALUE_FIVE]

export function benchmarkSinkValue() {
  return benchmarkSink
}

function blackhole(value: number) {
  benchmarkSink = (benchmarkSink + value) % Number.MAX_SAFE_INTEGER
}

function median(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / MEDIAN_DIVISOR)
  const value = sorted[middle]
  if (value === undefined) throw new Error('median requires at least one sample')
  return value
}

function mean(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function standardDeviation(values: readonly number[]) {
  const average = mean(values)
  const variance = values.reduce((total, value) => total + (value - average) ** VARIANCE_POWER, 0) / values.length
  return Math.sqrt(variance)
}

function printMeasurement(name: string, iterations: number, samples: readonly number[], result: number) {
  const milliseconds = median(samples)
  const nsPerOperation = (milliseconds * NS_PER_MS) / iterations
  const opsPerSecond = NS_PER_SECOND / nsPerOperation
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const stdev = standardDeviation(samples)
  console.log(
    `${name.padEnd(NATIVE_NAME_WIDTH)} ${milliseconds.toFixed(FIXED_DECIMAL_PLACES)}ms  ${nsPerOperation.toFixed(1)}ns/op  ${opsPerSecond.toFixed(0)} ops/sec  min=${min.toFixed(FIXED_DECIMAL_PLACES)}ms  max=${max.toFixed(FIXED_DECIMAL_PLACES)}ms  σ=${stdev.toFixed(FIXED_DECIMAL_PLACES)}ms  result=${result}`,
  )
}

export function measure(task: SyncTask) {
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

export async function measureAsync(task: AsyncTask): Promise<void> {
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
