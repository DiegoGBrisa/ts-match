import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isRecord } from './script-utils.js'

/** Scenario budget loaded from `benchmarks/budgets.json`. */
interface BenchmarkBudget {
  readonly name: string
  readonly maxNsPerOp: number
}

/** Top-level runtime benchmark budget file shape. */
interface BenchmarkBudgetsFile {
  readonly unit: string
  readonly policy: string
  readonly budgets: readonly BenchmarkBudget[]
}

/** One parsed measurement emitted by `benchmarks/native.ts`. */
interface BenchmarkMeasurement {
  readonly name: string
  readonly nsPerOp: number
}

/**
 * Validates one benchmark budget entry parsed from JSON.
 *
 * A valid entry names the benchmark scenario exactly as `benchmarks/native.ts`
 * prints it and sets the maximum allowed nanoseconds per operation for CI.
 *
 * @param value - Unknown JSON value from `benchmarks/budgets.json`.
 * @returns `true` when `value` is a usable budget entry.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function isBenchmarkBudget(value: unknown): value is BenchmarkBudget {
  return isRecord(value) && typeof value.name === 'string' && typeof value.maxNsPerOp === 'number'
}

/**
 * Verifies that the budget file contains a valid `budgets` array.
 *
 * This helper is split out so the top-level file guard can keep the JSON shape
 * checks explicit and fail before running a benchmark when the budget file is
 * malformed.
 *
 * @param value - Parsed object that may contain the `budgets` property.
 * @returns `true` when every budget entry has the expected shape.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function hasBudgetList(value: { readonly [key: string]: unknown }): boolean {
  return Array.isArray(value.budgets) && value.budgets.every(isBenchmarkBudget)
}

/**
 * Validates the full benchmark budget file shape.
 *
 * The file must declare `ns/op` units, include a human-readable policy, and
 * provide a list of named scenario budgets. These checks protect release CI from
 * silently accepting misspelled or incomplete budget files.
 *
 * @param value - Parsed JSON value from `benchmarks/budgets.json`.
 * @returns `true` when the file can drive runtime budget validation.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function isBenchmarkBudgetsFile(value: unknown): value is BenchmarkBudgetsFile {
  if (!isRecord(value)) return false
  return value.unit === 'ns/op' && typeof value.policy === 'string' && hasBudgetList(value)
}

/**
 * Reads and validates the committed benchmark budget file.
 *
 * Call this before launching the benchmark so configuration mistakes fail fast
 * with a clear error instead of producing misleading performance output.
 *
 * @returns The typed budget file used to compare benchmark measurements.
 * @throws When the JSON shape is invalid.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function readBudgets(): BenchmarkBudgetsFile {
  const value = JSON.parse(readFileSync('benchmarks/budgets.json', 'utf8'))
  if (!isBenchmarkBudgetsFile(value)) throw new Error('benchmarks/budgets.json has an invalid shape.')
  return value
}

/**
 * Parses a finite benchmark number from text output.
 *
 * Native benchmark lines are parsed from stdout, so this helper rejects missing,
 * `NaN`, and infinite values rather than letting invalid measurements pass into
 * budget comparisons.
 *
 * @param value - Numeric string captured from benchmark output.
 * @returns The finite number, or `undefined` when parsing fails.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function parseFiniteNumber(value: string | undefined): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Converts a benchmark-output regex match into a measurement object.
 *
 * The expected capture groups are scenario name and nanoseconds per operation.
 * Invalid captures return `undefined` so callers can ignore non-measurement
 * output lines while still parsing all real benchmark rows.
 *
 * @param match - Match produced by `parseMeasurement`'s benchmark-line regex.
 * @returns A typed measurement, or `undefined` for malformed captures.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function measurementFromMatch(match: RegExpExecArray): BenchmarkMeasurement | undefined {
  const [, rawName, rawNsPerOp] = match
  const nsPerOp = parseFiniteNumber(rawNsPerOp)
  if (rawName === undefined || nsPerOp === undefined) return undefined
  return { name: rawName.trim(), nsPerOp }
}

/**
 * Extracts one benchmark measurement from a stdout line.
 *
 * Lines must contain the scenario name, elapsed milliseconds, and `ns/op`
 * measurement printed by `benchmarks/native.ts`. Non-matching lines are ignored
 * so informational benchmark output can coexist with measurements.
 *
 * @param line - One line of benchmark stdout.
 * @returns Parsed measurement when the line is a benchmark row.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function parseMeasurement(line: string): BenchmarkMeasurement | undefined {
  const match = /^(.+?)\s+\d+(?:\.\d+)?ms\s+(\d+(?:\.\d+)?)ns\/op\s+/.exec(line)
  return match === null ? undefined : measurementFromMatch(match)
}

/**
 * Runs the native benchmark suite and parses all measurements from stdout.
 *
 * The script streams the raw benchmark output back to the caller for diagnostics,
 * then converts measurement rows into typed values for budget comparison.
 *
 * @returns Parsed benchmark measurements keyed by their printed scenario names.
 * @throws When the benchmark process fails.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#runtime-benchmark-budgets
 */
function runBenchmark(): readonly BenchmarkMeasurement[] {
  const output = execFileSync('pnpm', ['exec', 'tsx', 'benchmarks/native.ts'], { encoding: 'utf8', stdio: 'pipe' })
  process.stdout.write(output)

  return output
    .split('\n')
    .map(parseMeasurement)
    .filter((measurement) => measurement !== undefined)
}

const budgetsFile = readBudgets()
const measurements = runBenchmark()
const measurementsByName = new Map(measurements.map((measurement) => [measurement.name, measurement.nsPerOp]))
const budgetedNames = new Set(budgetsFile.budgets.map((budget) => budget.name))

const missingBudgets = budgetsFile.budgets.filter((budget) => !measurementsByName.has(budget.name))
const overBudget = budgetsFile.budgets.filter((budget) => {
  const measured = measurementsByName.get(budget.name)
  return measured !== undefined && measured > budget.maxNsPerOp
})
const unbudgetedMeasurements = measurements.filter((measurement) => !budgetedNames.has(measurement.name))

for (const measurement of unbudgetedMeasurements) {
  console.log(`benchmark budget info: unbudgeted scenario "${measurement.name}" measured ${measurement.nsPerOp}ns/op`)
}

if (missingBudgets.length > 0 || overBudget.length > 0) {
  const sections = [
    missingBudgets.length > 0
      ? `Missing budgeted scenarios:\n${missingBudgets.map((budget) => `  - ${budget.name}`).join('\n')}`
      : '',
    overBudget.length > 0
      ? `Over-budget scenarios:\n${overBudget
          .map((budget) => {
            const measured = measurementsByName.get(budget.name)
            return `  - ${budget.name}: ${measured}ns/op > ${budget.maxNsPerOp}ns/op`
          })
          .join('\n')}`
      : '',
  ]
    .filter((section) => section.length > 0)
    .join('\n\n')

  throw new Error(`Benchmark budgets failed.\n${sections}`)
}

console.log(`benchmark budgets ok (${budgetsFile.budgets.length} budgeted scenarios)`)
