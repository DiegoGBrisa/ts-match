import { match as ownMatch, matchBy } from '../dist/index.js'
import { match as tsPatternMatch } from 'ts-pattern'
import { EVENT_DELTA_MULTIPLIER, EVENT_STOP_MULTIPLIER } from './benchmark-constants.js'
import { ASYNC_ITERATIONS, asyncEvent, ownAsyncEventCaseMap, type AsyncTask } from './compare-ts-pattern-shared.js'

export const compareAsyncTasks: readonly AsyncTask[] = [
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
          .with({ type: 'delta' }, async (value) => value.value * EVENT_DELTA_MULTIPLIER)
          .with({ type: 'stop' }, async (value) => value.value * EVENT_STOP_MULTIPLIER)
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
