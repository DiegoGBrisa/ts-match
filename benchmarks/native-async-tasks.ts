import { match, matchBy } from '../dist/index.js'
import { ASYNC_ITERATIONS, asyncEvent, asyncEventCaseMap, type AsyncTask } from './native-shared.js'

export const nativeAsyncTasks: readonly AsyncTask[] = [
  {
    name: 'match.promise with otherwise',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        total += await match
          .promise(asyncEvent())
          .with({ type: 'delta' }, async (value) => value.value)
          .otherwise(async () => 0)
      }
      return total
    },
  },
  {
    name: 'matchBy.promise cases',
    iterations: ASYNC_ITERATIONS,
    run: async () => {
      let total = 0
      for (let index = 0; index < ASYNC_ITERATIONS; index += 1) {
        total += await matchBy.promise(asyncEvent(), 'type').cases(asyncEventCaseMap)
      }
      return total
    },
  },
]
