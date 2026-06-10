import { nativeAsyncTasks } from './native-async-tasks.js'
import { nativeDispatchTasks } from './native-dispatch-tasks.js'
import { nativePatternTasks } from './native-pattern-tasks.js'
import {
  ASYNC_ITERATIONS,
  ITERATIONS,
  MEASURED_ROUNDS,
  WARMUP_ROUNDS,
  benchmarkSinkValue,
  measure,
  measureAsync,
} from './native-shared.js'

console.log(
  `node=${process.version} platform=${process.platform} arch=${process.arch} iterations=${ITERATIONS} asyncIterations=${ASYNC_ITERATIONS} warmup=${WARMUP_ROUNDS} rounds=${MEASURED_ROUNDS}`,
)
for (const task of nativeDispatchTasks) measure(task)
for (const task of nativePatternTasks) measure(task)
for (const task of nativeAsyncTasks) await measureAsync(task)
console.log(`benchmarkSink=${benchmarkSinkValue()}`)
