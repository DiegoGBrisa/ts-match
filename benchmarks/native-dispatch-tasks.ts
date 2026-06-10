import { matchBy } from '../dist/index.js'
import { EVENT_DELTA_MULTIPLIER, EVENT_STOP_MULTIPLIER } from './benchmark-constants.js'
import { ITERATIONS, eventAt, eventCaseMap, nestedPhaseCaseMap, type SyncTask } from './native-shared.js'

export const nativeDispatchTasks: readonly SyncTask[] = [
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
            total += event.value * EVENT_DELTA_MULTIPLIER
            break
          case 'stop':
            total += event.value * EVENT_STOP_MULTIPLIER
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
          .with('delta', (value) => value.value * EVENT_DELTA_MULTIPLIER)
          .with('stop', (value) => value.value * EVENT_STOP_MULTIPLIER)
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
          delta: (value) => value.value * EVENT_DELTA_MULTIPLIER,
          stop: (value) => value.value * EVENT_STOP_MULTIPLIER,
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
          group('stop', (value) => value.value * EVENT_STOP_MULTIPLIER),
        ])
      }
      return total
    },
  },
]
