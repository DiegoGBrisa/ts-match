import { performance } from 'node:perf_hooks'
import { DISPATCH_NAME_WIDTH, FIXED_DECIMAL_PLACES, MEDIAN_DIVISOR, NS_PER_MS } from './benchmark-constants.js'
import type { Matcher } from './dispatch-matchers.js'

export const ITERATIONS = 250_000
const WARMUP_ROUNDS = 2
const MEASURED_ROUNDS = 7

export type Task = {
  readonly name: string
  readonly run: () => number
}

function median(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / MEDIAN_DIVISOR)
  const value = sorted[middle]
  if (value === undefined) throw new Error('median requires at least one sample')
  return value
}

function measure(task: Task) {
  let result = 0
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) result = task.run()

  const samples: number[] = []
  for (let round = 0; round < MEASURED_ROUNDS; round += 1) {
    const start = performance.now()
    result = task.run()
    samples.push(performance.now() - start)
  }

  return { medianMs: median(samples), result }
}

export function bench(name: string, tasks: readonly Task[], verifyEqual = true) {
  console.log(`\n${name}`)
  let expected: number | undefined
  for (const task of tasks) {
    const measured = measure(task)
    if (verifyEqual) {
      expected ??= measured.result
      if (measured.result !== expected) {
        throw new Error(`${task.name} produced ${measured.result}; expected ${expected}`)
      }
    }
    const nsPerOperation = (measured.medianMs * NS_PER_MS) / ITERATIONS
    console.log(
      `${task.name.padEnd(DISPATCH_NAME_WIDTH)} ${measured.medianMs.toFixed(FIXED_DECIMAL_PLACES)}ms  ${nsPerOperation.toFixed(1)}ns/op`,
    )
  }
}

export function task(name: string, matcher: Matcher, value: unknown, pattern: unknown): Task {
  return {
    name,
    run: () => {
      let total = 0
      for (let index = 0; index < ITERATIONS; index += 1) {
        if (matcher(value, pattern)) total += 1
      }
      return total
    },
  }
}
