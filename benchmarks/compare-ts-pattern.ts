import { performance } from 'node:perf_hooks'
import { isMatching as ownIsMatching, match as ownMatch, matchBy, P as OwnP } from '../dist/index.js'
import { isMatching as tsPatternIsMatching, match as tsPatternMatch, P as TsPatternP } from 'ts-pattern'

const ITERATIONS = 500_000
const ASYNC_ITERATIONS = 20_000
const WARMUP_ROUNDS = 2
const MEASURED_ROUNDS = 7

type Event =
  | { type: 'start'; value: number; meta: { phase: 'open' } }
  | { type: 'delta'; value: number; meta: { phase: 'active' } }
  | { type: 'stop'; value: number; meta: { phase: 'closed' } }

const events: readonly Event[] = [
  { type: 'start', value: 1, meta: { phase: 'open' } },
  { type: 'delta', value: 2, meta: { phase: 'active' } },
  { type: 'stop', value: 3, meta: { phase: 'closed' } },
]

const ownEventCaseMap = {
  start: (value: Extract<Event, { type: 'start' }>) => value.value,
  delta: (value: Extract<Event, { type: 'delta' }>) => value.value * 2,
  stop: (value: Extract<Event, { type: 'stop' }>) => value.value * 3,
}

const ownAsyncEventCaseMap = {
  start: async (value: Extract<Event, { type: 'start' }>) => value.value,
  delta: async (value: Extract<Event, { type: 'delta' }>) => value.value * 2,
  stop: async (value: Extract<Event, { type: 'stop' }>) => value.value * 3,
}

const ownNestedPhaseCaseMap = {
  open: (value: Extract<Event, { meta: { phase: 'open' } }>) => value.value,
  active: (value: Extract<Event, { meta: { phase: 'active' } }>) => value.value * 2,
  closed: (value: Extract<Event, { meta: { phase: 'closed' } }>) => value.value * 3,
}

const ownObjectPattern = { type: 'delta' as const, value: OwnP.number }
const ownNestedObjectPattern = { meta: { phase: 'active' as const }, value: OwnP.number }
const ownTuplePattern = [OwnP.string, OwnP.number, OwnP.boolean] as const
const ownArrayPattern = OwnP.array(OwnP.number)
const ownRecordPattern = OwnP.record(OwnP.string, OwnP.string)
const tsPatternObjectPattern = { type: 'delta' as const, value: TsPatternP.number }
const tsPatternNestedObjectPattern = { meta: { phase: 'active' as const }, value: TsPatternP.number }
const tsPatternTuplePattern = [TsPatternP.string, TsPatternP.number, TsPatternP.boolean] as const
const tsPatternArrayPattern = TsPatternP.array(TsPatternP.number)
const tsPatternRecordPattern = TsPatternP.record(TsPatternP.string, TsPatternP.string)
const tupleValue = ['ok', 1, true] as const
const arrayValue = [1, 2, 3, 4, 5]
const recordValue = { one: '1', two: '2', three: '3' }
const tsPatternRecordValue: unknown = recordValue

type SyncTask = {
  readonly scenario: string
  readonly implementation: string
  readonly iterations: number
  readonly run: () => number
}

type AsyncTask = {
  readonly scenario: string
  readonly implementation: string
  readonly iterations: number
  readonly run: () => Promise<number>
}

type Measurement = {
  readonly scenario: string
  readonly implementation: string
  readonly iterations: number
  readonly milliseconds: number
  readonly result: number
}

function eventAt(index: number): Event {
  const event = events[index % events.length]
  if (!event) throw new Error('benchmark events must not be empty')
  return event
}

async function asyncEvent(): Promise<Event> {
  return { type: 'delta', value: 2, meta: { phase: 'active' } }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const value = sorted[middle]
  if (value === undefined) throw new Error('median requires at least one sample')
  return value
}

function measure(task: SyncTask): Measurement {
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

async function measureAsync(task: AsyncTask): Promise<Measurement> {
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

function printMeasurements(measurements: readonly Measurement[]): void {
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

    const nsPerOperation = (measurement.milliseconds * 1_000_000) / measurement.iterations
    const opsPerSecond = 1_000_000_000 / nsPerOperation
    const relative = measurement.milliseconds / fastestMilliseconds

    console.log(
      `${measurement.scenario.padEnd(28)}  ${measurement.implementation.padEnd(29)}  ${`${measurement.milliseconds.toFixed(2)}ms`.padStart(9)}  ${`${nsPerOperation.toFixed(1)}`.padStart(9)}  ${`${opsPerSecond.toFixed(0)}`.padStart(11)}  ${`${relative.toFixed(2)}x`.padStart(6)}  ${measurement.result}`,
    )
  }
}

const syncTasks: readonly SyncTask[] = [
  {
    scenario: 'discriminant dispatch',
    implementation: 'native switch',
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
    scenario: 'discriminant dispatch',
    implementation: 'ts-match matchBy fluent',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type')
          .with('start', (event) => event.value)
          .with('delta', (event) => event.value * 2)
          .with('stop', (event) => event.value * 3)
          .exhaustive()
      }
      return total
    },
  },
  {
    scenario: 'discriminant dispatch',
    implementation: 'ts-match cases inline',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type').cases({
          start: (event) => event.value,
          delta: (event) => event.value * 2,
          stop: (event) => event.value * 3,
        })
      }
      return total
    },
  },
  {
    scenario: 'discriminant dispatch',
    implementation: 'ts-match cases hoisted',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1)
        total += matchBy(eventAt(index), 'type').cases(ownEventCaseMap)
      return total
    },
  },
  {
    scenario: 'discriminant dispatch',
    implementation: 'ts-match partial hoisted',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type')
          .partial(ownEventCaseMap)
          .otherwise(() => 0)
      }
      return total
    },
  },
  {
    scenario: 'discriminant dispatch',
    implementation: 'ts-pattern match chain',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += tsPatternMatch(eventAt(index))
          .with({ type: 'start' }, (event) => event.value)
          .with({ type: 'delta' }, (event) => event.value * 2)
          .with({ type: 'stop' }, (event) => event.value * 3)
          .exhaustive()
      }
      return total
    },
  },
  {
    scenario: 'nested discriminant',
    implementation: 'ts-match matchBy path',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1)
        total += matchBy(eventAt(index), 'meta.phase').cases(ownNestedPhaseCaseMap)
      return total
    },
  },
  {
    scenario: 'nested discriminant',
    implementation: 'ts-pattern match chain',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += tsPatternMatch(eventAt(index))
          .with({ meta: { phase: 'open' } }, (event) => event.value)
          .with({ meta: { phase: 'active' } }, (event) => event.value * 2)
          .with({ meta: { phase: 'closed' } }, (event) => event.value * 3)
          .exhaustive()
      }
      return total
    },
  },
  {
    scenario: 'grouped cases',
    implementation: 'ts-match grouped callback',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type').cases((group) => [
          group(['start', 'delta'], (event) => event.value),
          group('stop', (event) => event.value * 3),
        ])
      }
      return total
    },
  },
  {
    scenario: 'grouped cases',
    implementation: 'ts-pattern grouped match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += tsPatternMatch(eventAt(index))
          .with({ type: 'start' }, { type: 'delta' }, (event) => event.value)
          .with({ type: 'stop' }, (event) => event.value * 3)
          .exhaustive()
      }
      return total
    },
  },
  {
    scenario: 'object pattern',
    implementation: 'ts-match match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          ownMatch(eventAt(index))
            .with(ownObjectPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'object pattern',
    implementation: 'ts-pattern match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          tsPatternMatch(eventAt(index))
            .with(tsPatternObjectPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'nested object pattern',
    implementation: 'ts-match match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          ownMatch(eventAt(index))
            .with(ownNestedObjectPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'nested object pattern',
    implementation: 'ts-pattern match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          tsPatternMatch(eventAt(index))
            .with(tsPatternNestedObjectPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'tuple pattern',
    implementation: 'ts-match match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          ownMatch(tupleValue)
            .with(ownTuplePattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'tuple pattern',
    implementation: 'ts-pattern match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          tsPatternMatch(tupleValue)
            .with(tsPatternTuplePattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'array pattern',
    implementation: 'ts-match match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          ownMatch(arrayValue)
            .with(ownArrayPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'array pattern',
    implementation: 'ts-pattern match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (
          tsPatternMatch(arrayValue)
            .with(tsPatternArrayPattern, () => true)
            .otherwise(() => false)
        )
          total += 1
      }
      return total
    },
  },
  {
    scenario: 'predicate classifier',
    implementation: 'ts-match match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      const isDelta = (value: Event) =>
        ownMatch(value)
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
    scenario: 'predicate classifier',
    implementation: 'ts-pattern match',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      const isDelta = (value: Event) =>
        tsPatternMatch(value)
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
    scenario: 'isMatching primitive',
    implementation: 'ts-match isMatching',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (ownIsMatching(OwnP.string, 'value')) total += 1
      }
      return total
    },
  },
  {
    scenario: 'isMatching primitive',
    implementation: 'ts-pattern isMatching',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (tsPatternIsMatching(TsPatternP.string, 'value')) total += 1
      }
      return total
    },
  },
  {
    scenario: 'isMatching record',
    implementation: 'ts-match isMatching',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (ownIsMatching(ownRecordPattern, recordValue)) total += 1
      }
      return total
    },
  },
  {
    scenario: 'isMatching record',
    implementation: 'ts-pattern isMatching',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (tsPatternIsMatching(tsPatternRecordPattern, tsPatternRecordValue)) total += 1
      }
      return total
    },
  },
]

const asyncTasks: readonly AsyncTask[] = [
  {
    scenario: 'promise discriminant dispatch',
    implementation: 'ts-match matchBy.promise cases',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        total += await matchBy.promise(asyncEvent(), 'type').cases(ownAsyncEventCaseMap)
      }
      return total
    },
  },
  {
    scenario: 'promise discriminant dispatch',
    implementation: 'ts-pattern async chain',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        const event = await asyncEvent()
        total += await tsPatternMatch(event)
          .with({ type: 'start' }, async (value) => value.value)
          .with({ type: 'delta' }, async (value) => value.value * 2)
          .with({ type: 'stop' }, async (value) => value.value * 3)
          .exhaustive()
      }
      return total
    },
  },
  {
    scenario: 'promise object pattern',
    implementation: 'ts-match match.promise',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        total += await ownMatch
          .promise(asyncEvent())
          .with({ type: 'delta' }, async (value) => value.value)
          .otherwise(async () => 0)
      }
      return total
    },
  },
  {
    scenario: 'promise object pattern',
    implementation: 'ts-pattern async handler',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        const event = await asyncEvent()
        total += await tsPatternMatch(event)
          .with({ type: 'delta' }, async (value) => value.value)
          .otherwise(async () => 0)
      }
      return total
    },
  },
]

const measurements: Measurement[] = []
for (const task of syncTasks) measurements.push(measure(task))
for (const task of asyncTasks) measurements.push(await measureAsync(task))
printMeasurements(measurements)
