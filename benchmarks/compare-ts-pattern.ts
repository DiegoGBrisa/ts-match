import { compareAsyncTasks } from './compare-ts-pattern-async-tasks.js'
import { compareDispatchTasks } from './compare-ts-pattern-dispatch-tasks.js'
import { comparePatternTasks } from './compare-ts-pattern-pattern-tasks.js'
import { measure, measureAsync, printMeasurements, type Measurement } from './compare-ts-pattern-shared.js'

const measurements: Measurement[] = []
for (const task of compareDispatchTasks) measurements.push(measure(task))
for (const task of comparePatternTasks) measurements.push(measure(task))
for (const task of compareAsyncTasks) measurements.push(await measureAsync(task))
printMeasurements(measurements)
