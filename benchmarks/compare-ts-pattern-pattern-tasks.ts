import { isMatching as ownIsMatching, match as ownMatch, P as OwnP } from '../dist/index.js'
import { isMatching as tsPatternIsMatching, match as tsPatternMatch, P as TsPatternP } from 'ts-pattern'
import {
  ITERATIONS,
  arrayValue,
  eventAt,
  ownArrayPattern,
  ownNestedObjectPattern,
  ownObjectPattern,
  ownRecordPattern,
  ownTuplePattern,
  recordValue,
  tsPatternRecordValue,
  tupleValue,
  type BenchmarkEvent,
  type SyncTask,
} from './compare-ts-pattern-shared.js'

const tsPatternObjectPattern = { type: 'delta' as const, value: TsPatternP.number }
const tsPatternNestedObjectPattern = { meta: { phase: 'active' as const }, value: TsPatternP.number }
const tsPatternTuplePattern = [TsPatternP.string, TsPatternP.number, TsPatternP.boolean] as const
const tsPatternArrayPattern = TsPatternP.array(TsPatternP.number)
const tsPatternRecordPattern = TsPatternP.record(TsPatternP.string, TsPatternP.string)

export const comparePatternTasks: readonly SyncTask[] = [
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
      const isDelta = (value: BenchmarkEvent) =>
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
      const isDelta = (value: BenchmarkEvent) =>
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
