import { performance } from 'node:perf_hooks'
import { P as OwnP } from '../dist/index.js'
import {
  ARRAY_VALUE_FIVE,
  ARRAY_VALUE_FOUR,
  COMPARE_IMPLEMENTATION_WIDTH,
  COMPARE_OPS_WIDTH,
  COMPARE_RELATIVE_WIDTH,
  COMPARE_SCENARIO_WIDTH,
  COMPARE_TIME_WIDTH,
  EVENT_DELTA_VALUE,
  EVENT_START_VALUE,
  EVENT_STOP_VALUE,
  FIXED_DECIMAL_PLACES,
  MEDIAN_DIVISOR,
  NS_PER_MS,
  NS_PER_SECOND,
} from './benchmark-constants.js'
import {
  benchmarkAsyncEvent as asyncEvent,
  benchmarkAsyncEventCaseMap as ownAsyncEventCaseMap,
  benchmarkEventAt as eventAt,
  benchmarkEventCaseMap as ownEventCaseMap,
  benchmarkNestedPhaseCaseMap as ownNestedPhaseCaseMap,
} from './benchmark-event-fixtures.js'

export { asyncEvent, eventAt, ownAsyncEventCaseMap, ownEventCaseMap, ownNestedPhaseCaseMap }
export type { BenchmarkEvent } from './benchmark-event-fixtures.js'

export const ITERATIONS = 500_000
export const ASYNC_ITERATIONS = 20_000
export const WARMUP_ROUNDS = 2
export const MEASURED_ROUNDS = 7

export type SyncTask = {
  readonly scenario: string
  readonly implementation: string
  readonly iterations: number
  readonly run: () => number
}

export type AsyncTask = {
  readonly scenario: string
  readonly implementation: string
  readonly iterations: number
  readonly run: () => Promise<number>
}

export type Measurement = {
  readonly scenario: string
  readonly implementation: string
  readonly iterations: number
  readonly milliseconds: number
  readonly result: number
}

export const ownObjectPattern = { type: 'delta' as const, value: OwnP.number }
export const ownNestedObjectPattern = { meta: { phase: 'active' as const }, value: OwnP.number }
export const ownTuplePattern = [OwnP.string, OwnP.number, OwnP.boolean] as const
export const ownArrayPattern = OwnP.array(OwnP.number)
export const ownRecordPattern = OwnP.record(OwnP.string, OwnP.string)
export const tupleValue = ['ok', EVENT_START_VALUE, true] as const
export const arrayValue = [EVENT_START_VALUE, EVENT_DELTA_VALUE, EVENT_STOP_VALUE, ARRAY_VALUE_FOUR, ARRAY_VALUE_FIVE]
export const recordValue = { one: '1', two: '2', three: '3' }
export const tsPatternRecordValue: unknown = recordValue

function median(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / MEDIAN_DIVISOR)
  const value = sorted[middle]
  if (value === undefined) throw new Error('median requires at least one sample')
  return value
}

export function measure(task: SyncTask): Measurement {
  let result = 0
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) result = task.run()

  const samples: number[] = []
  for (let round = 0; round < MEASURED_ROUNDS; round += 1) {
    const start = performance.now()
    result = task.run()
    samples.push(performance.now() - start)
  }

  return {
    scenario: task.scenario,
    implementation: task.implementation,
    iterations: task.iterations,
    milliseconds: median(samples),
    result,
  }
}

export async function measureAsync(task: AsyncTask): Promise<Measurement> {
  let result = 0
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) result = await task.run()

  const samples: number[] = []
  for (let round = 0; round < MEASURED_ROUNDS; round += 1) {
    const start = performance.now()
    result = await task.run()
    samples.push(performance.now() - start)
  }

  return {
    scenario: task.scenario,
    implementation: task.implementation,
    iterations: task.iterations,
    milliseconds: median(samples),
    result,
  }
}

function fastestByScenario(measurements: readonly Measurement[]): ReadonlyMap<string, number> {
  const fastest = new Map<string, number>()
  for (const measurement of measurements) {
    const previous = fastest.get(measurement.scenario)
    if (previous === undefined || measurement.milliseconds < previous)
      fastest.set(measurement.scenario, measurement.milliseconds)
  }
  return fastest
}

export function printMeasurements(measurements: readonly Measurement[]) {
  const fastest = fastestByScenario(measurements)
  console.log(
    'scenario                      implementation                 time       ns/op      ops/sec      rel     result',
  )
  console.log(
    '----------------------------  -----------------------------  ---------  ---------  -----------  ------  --------',
  )

  let previousScenario = ''
  for (const measurement of measurements) {
    if (previousScenario !== '' && previousScenario !== measurement.scenario) console.log('')
    previousScenario = measurement.scenario

    const fastestMilliseconds = fastest.get(measurement.scenario)
    if (fastestMilliseconds === undefined) throw new Error(`missing fastest measurement for ${measurement.scenario}`)

    const nsPerOperation = (measurement.milliseconds * NS_PER_MS) / measurement.iterations
    const opsPerSecond = NS_PER_SECOND / nsPerOperation
    const relative = measurement.milliseconds / fastestMilliseconds

    console.log(
      `${measurement.scenario.padEnd(COMPARE_SCENARIO_WIDTH)}  ${measurement.implementation.padEnd(COMPARE_IMPLEMENTATION_WIDTH)}  ${`${measurement.milliseconds.toFixed(FIXED_DECIMAL_PLACES)}ms`.padStart(COMPARE_TIME_WIDTH)}  ${`${nsPerOperation.toFixed(1)}`.padStart(COMPARE_TIME_WIDTH)}  ${`${opsPerSecond.toFixed(0)}`.padStart(COMPARE_OPS_WIDTH)}  ${`${relative.toFixed(FIXED_DECIMAL_PLACES)}x`.padStart(COMPARE_RELATIVE_WIDTH)}  ${measurement.result}`,
    )
  }
}
