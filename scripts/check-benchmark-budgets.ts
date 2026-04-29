import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isRecord } from './script-utils.js'

interface BenchmarkBudget {
  readonly name: string
  readonly maxNsPerOp: number
}

interface BenchmarkBudgetsFile {
  readonly unit: string
  readonly policy: string
  readonly budgets: readonly BenchmarkBudget[]
}

interface BenchmarkMeasurement {
  readonly name: string
  readonly nsPerOp: number
}

function isBenchmarkBudget(value: unknown): value is BenchmarkBudget {
  return isRecord(value) && typeof value.name === 'string' && typeof value.maxNsPerOp === 'number'
}

function hasBudgetList(value: { readonly [key: string]: unknown }): boolean {
  return Array.isArray(value.budgets) && value.budgets.every(isBenchmarkBudget)
}

function isBenchmarkBudgetsFile(value: unknown): value is BenchmarkBudgetsFile {
  if (!isRecord(value)) return false
  return value.unit === 'ns/op' && typeof value.policy === 'string' && hasBudgetList(value)
}

function readBudgets(): BenchmarkBudgetsFile {
  const value = JSON.parse(readFileSync('benchmarks/budgets.json', 'utf8'))
  if (!isBenchmarkBudgetsFile(value)) throw new Error('benchmarks/budgets.json has an invalid shape.')
  return value
}

function parseFiniteNumber(value: string | undefined): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function measurementFromMatch(match: RegExpExecArray): BenchmarkMeasurement | undefined {
  const [, rawName, rawNsPerOp] = match
  const nsPerOp = parseFiniteNumber(rawNsPerOp)
  if (rawName === undefined || nsPerOp === undefined) return undefined
  return { name: rawName.trim(), nsPerOp }
}

function parseMeasurement(line: string): BenchmarkMeasurement | undefined {
  const match = /^(.+?)\s+\d+(?:\.\d+)?ms\s+(\d+(?:\.\d+)?)ns\/op\s+/.exec(line)
  return match === null ? undefined : measurementFromMatch(match)
}

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
