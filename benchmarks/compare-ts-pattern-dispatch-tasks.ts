import { matchBy } from '../dist/index.js'
import { match as tsPatternMatch } from 'ts-pattern'
import { EVENT_DELTA_MULTIPLIER, EVENT_STOP_MULTIPLIER } from './benchmark-constants.js'
import {
  ITERATIONS,
  eventAt,
  ownEventCaseMap,
  ownNestedPhaseCaseMap,
  type SyncTask,
} from './compare-ts-pattern-shared.js'

export const compareDispatchTasks: readonly SyncTask[] = [
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
    scenario: 'discriminant dispatch',
    implementation: 'ts-match matchBy fluent',
    iterations: ITERATIONS,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        total += matchBy(eventAt(index), 'type')
          .with('start', (event) => event.value)
          .with('delta', (event) => event.value * EVENT_DELTA_MULTIPLIER)
          .with('stop', (event) => event.value * EVENT_STOP_MULTIPLIER)
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
          delta: (event) => event.value * EVENT_DELTA_MULTIPLIER,
          stop: (event) => event.value * EVENT_STOP_MULTIPLIER,
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
          .with({ type: 'delta' }, (event) => event.value * EVENT_DELTA_MULTIPLIER)
          .with({ type: 'stop' }, (event) => event.value * EVENT_STOP_MULTIPLIER)
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
          .with({ meta: { phase: 'active' } }, (event) => event.value * EVENT_DELTA_MULTIPLIER)
          .with({ meta: { phase: 'closed' } }, (event) => event.value * EVENT_STOP_MULTIPLIER)
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
          group('stop', (event) => event.value * EVENT_STOP_MULTIPLIER),
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
          .with({ type: 'stop' }, (event) => event.value * EVENT_STOP_MULTIPLIER)
          .exhaustive()
      }
      return total
    },
  },
]
