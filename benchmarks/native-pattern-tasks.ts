import { isMatching, match } from '../dist/index.js'
import {
  ITERATIONS,
  arrayPattern,
  arrayValue,
  eventAt,
  nestedObjectPattern,
  objectPattern,
  objectRecordPattern,
  recordValue,
  stringPattern,
  tuplePattern,
  tupleValue,
  type BenchmarkEvent,
  type SyncTask,
} from './native-shared.js'

export const nativePatternTasks: readonly SyncTask[] = [
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
      const isDelta = (value: BenchmarkEvent) =>
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
