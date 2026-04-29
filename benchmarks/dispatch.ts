import { performance } from 'node:perf_hooks'
import { isMatching, matchBy, P } from '../src/index.js'
import { PATTERN_TOKEN } from '../src/tokens.js'

const ITERATIONS = 250_000
const WARMUP_ROUNDS = 2
const MEASURED_ROUNDS = 7

type PatternKind = 'wildcard' | 'primitive' | 'union' | 'exclude' | 'optional' | 'array' | 'tuple' | 'record' | 'select'

type PatternLike = {
  readonly [PATTERN_TOKEN]?: PatternKind
  readonly primitive?: string
  readonly patterns?: readonly unknown[]
  readonly pattern?: unknown
  readonly item?: unknown
  readonly items?: readonly unknown[]
  readonly key?: unknown
  readonly value?: unknown
}

type Matcher = (value: unknown, pattern: unknown) => boolean

type Task = {
  readonly name: string
  readonly run: () => number
}

function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isPatternLike(value: unknown): value is PatternLike {
  return isObject(value) && PATTERN_TOKEN in value
}

function primitiveSwitch(value: unknown, primitive: string): boolean {
  switch (primitive) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
    case 'bigint':
      return typeof value === 'bigint'
    case 'symbol':
      return typeof value === 'symbol'
    case 'null':
      return value === null
    case 'undefined':
      return value === undefined
    default:
      return false
  }
}

function primitiveIf(value: unknown, primitive: string): boolean {
  if (primitive === 'string') return typeof value === 'string'
  if (primitive === 'number') return typeof value === 'number'
  if (primitive === 'boolean') return typeof value === 'boolean'
  if (primitive === 'bigint') return typeof value === 'bigint'
  if (primitive === 'symbol') return typeof value === 'symbol'
  if (primitive === 'null') return value === null
  if (primitive === 'undefined') return value === undefined
  return false
}

const primitiveTable: Readonly<Record<string, (value: unknown) => boolean>> = Object.freeze({
  string: (value: unknown) => typeof value === 'string',
  number: (value: unknown) => typeof value === 'number',
  boolean: (value: unknown) => typeof value === 'boolean',
  bigint: (value: unknown) => typeof value === 'bigint',
  symbol: (value: unknown) => typeof value === 'symbol',
  null: (value: unknown) => value === null,
  undefined: (value: unknown) => value === undefined,
})

const primitiveMap = new Map<string, (value: unknown) => boolean>(Object.entries(primitiveTable))

function primitiveObject(value: unknown, primitive: string): boolean {
  const predicate = primitiveTable[primitive]
  return predicate?.(value) === true
}

function primitiveMapDispatch(value: unknown, primitive: string): boolean {
  return primitiveMap.get(primitive)?.(value) === true
}

function ownPatternKeys(pattern: object): PropertyKey[] {
  return Reflect.ownKeys(pattern).filter((key) => key !== PATTERN_TOKEN)
}

function read(value: object, key: PropertyKey): unknown {
  return Reflect.get(value, key)
}

function objectMatches(value: unknown, pattern: object, matcher: Matcher): boolean {
  if (!isObject(value)) return false
  for (const key of ownPatternKeys(pattern)) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false
    if (!matcher(read(value, key), read(pattern, key))) return false
  }
  return true
}

function tupleMatches(value: unknown, items: readonly unknown[], matcher: Matcher): boolean {
  if (!Array.isArray(value) || value.length !== items.length) return false
  for (let index = 0; index < items.length; index += 1) {
    if (!matcher(value[index], items[index])) return false
  }
  return true
}

function arrayMatches(value: unknown, itemPattern: unknown, matcher: Matcher): boolean {
  if (!Array.isArray(value)) return false
  for (let index = 0; index < value.length; index += 1) {
    if (!matcher(value[index], itemPattern)) return false
  }
  return true
}

function recordMatches(value: unknown, keyPattern: unknown, valuePattern: unknown, matcher: Matcher): boolean {
  if (!isObject(value) || Array.isArray(value)) return false
  for (const key of Object.keys(value)) {
    if (!matcher(key, keyPattern)) return false
    if (!matcher(read(value, key), valuePattern)) return false
  }
  return true
}

function matchSwitch(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    switch (pattern[PATTERN_TOKEN]) {
      case 'wildcard':
        return true
      case 'primitive':
        return primitiveSwitch(value, String(pattern.primitive))
      case 'union':
        return pattern.patterns?.some((option) => matchSwitch(value, option)) === true
      case 'exclude':
        return !matchSwitch(value, pattern.pattern)
      case 'optional':
        return value === undefined || matchSwitch(value, pattern.pattern)
      case 'array':
        return arrayMatches(value, pattern.item, matchSwitch)
      case 'tuple':
        return tupleMatches(value, pattern.items ?? [], matchSwitch)
      case 'record':
        return recordMatches(value, pattern.key, pattern.value, matchSwitch)
      case 'select':
        return matchSwitch(value, pattern.pattern)
      default:
        return false
    }
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchSwitch)
  if (isObject(pattern)) return objectMatches(value, pattern, matchSwitch)
  return Object.is(value, pattern)
}

type DispatchHandler = (value: unknown, pattern: PatternLike) => boolean

const wildcardHandler: DispatchHandler = () => true
const primitiveHandler: DispatchHandler = (value, pattern) => primitiveObject(value, String(pattern.primitive))
const unionHandler: DispatchHandler = (value, pattern) =>
  pattern.patterns?.some((option) => matchTable(value, option)) === true
const excludeHandler: DispatchHandler = (value, pattern) => !matchTable(value, pattern.pattern)
const optionalHandler: DispatchHandler = (value, pattern) => value === undefined || matchTable(value, pattern.pattern)
const arrayHandler: DispatchHandler = (value, pattern) => arrayMatches(value, pattern.item, matchTable)
const tupleHandler: DispatchHandler = (value, pattern) => tupleMatches(value, pattern.items ?? [], matchTable)
const recordHandler: DispatchHandler = (value, pattern) => recordMatches(value, pattern.key, pattern.value, matchTable)
const selectHandler: DispatchHandler = (value, pattern) => matchTable(value, pattern.pattern)

const tableHandlers: Readonly<Record<string, DispatchHandler>> = Object.freeze({
  wildcard: wildcardHandler,
  primitive: primitiveHandler,
  union: unionHandler,
  exclude: excludeHandler,
  optional: optionalHandler,
  array: arrayHandler,
  tuple: tupleHandler,
  record: recordHandler,
  select: selectHandler,
})

function matchTable(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    const handler = kind === undefined ? undefined : tableHandlers[kind]
    return handler?.(value, pattern) === true
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchTable)
  if (isObject(pattern)) return objectMatches(value, pattern, matchTable)
  return Object.is(value, pattern)
}

const mapHandlers = new Map<PatternKind, DispatchHandler>([
  ['wildcard', wildcardHandler],
  ['primitive', primitiveHandler],
  ['union', unionHandler],
  ['exclude', excludeHandler],
  ['optional', optionalHandler],
  ['array', arrayHandler],
  ['tuple', tupleHandler],
  ['record', recordHandler],
  ['select', selectHandler],
])

function matchMap(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    return kind !== undefined && mapHandlers.get(kind)?.(value, pattern) === true
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchMap)
  if (isObject(pattern)) return objectMatches(value, pattern, matchMap)
  return Object.is(value, pattern)
}

function matchIf(value: unknown, pattern: unknown): boolean {
  if (isPatternLike(pattern)) {
    const kind = pattern[PATTERN_TOKEN]
    if (kind === 'wildcard') return true
    if (kind === 'primitive') return primitiveIf(value, String(pattern.primitive))
    if (kind === 'union') return pattern.patterns?.some((option) => matchIf(value, option)) === true
    if (kind === 'exclude') return !matchIf(value, pattern.pattern)
    if (kind === 'optional') return value === undefined || matchIf(value, pattern.pattern)
    if (kind === 'array') return arrayMatches(value, pattern.item, matchIf)
    if (kind === 'tuple') return tupleMatches(value, pattern.items ?? [], matchIf)
    if (kind === 'record') return recordMatches(value, pattern.key, pattern.value, matchIf)
    if (kind === 'select') return matchIf(value, pattern.pattern)
    return false
  }
  if (Array.isArray(pattern)) return tupleMatches(value, pattern, matchIf)
  if (isObject(pattern)) return objectMatches(value, pattern, matchIf)
  return Object.is(value, pattern)
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const value = sorted[middle]
  if (value === undefined) throw new Error('median requires at least one sample')
  return value
}

function measure(task: Task): { readonly medianMs: number; readonly result: number } {
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

function bench(name: string, tasks: readonly Task[], verifyEqual = true): void {
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
    const nsPerOperation = (measured.medianMs * 1_000_000) / ITERATIONS
    console.log(`${task.name.padEnd(22)} ${measured.medianMs.toFixed(2)}ms  ${nsPerOperation.toFixed(1)}ns/op`)
  }
}

function task(name: string, matcher: Matcher, value: unknown, pattern: unknown): Task {
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

function currentTask(value: unknown, pattern: unknown): Task {
  return task(
    'current isMatching',
    (candidate, candidatePattern) => isMatching(candidatePattern, candidate),
    value,
    pattern,
  )
}

function strategyTasks(value: unknown, pattern: unknown): Task[] {
  return [
    currentTask(value, pattern),
    task('switch clone', matchSwitch, value, pattern),
    task('object table clone', matchTable, value, pattern),
    task('Map clone', matchMap, value, pattern),
    task('if/else clone', matchIf, value, pattern),
  ]
}

bench('primitive dispatch only: string', [
  task('switch', (value) => primitiveSwitch(value, 'string'), 'x', P._),
  task('object table', (value) => primitiveObject(value, 'string'), 'x', P._),
  task('Map', (value) => primitiveMapDispatch(value, 'string'), 'x', P._),
  task('if/else', (value) => primitiveIf(value, 'string'), 'x', P._),
])

bench('primitive dispatch only: number', [
  task('switch', (value) => primitiveSwitch(value, 'number'), 1, P._),
  task('object table', (value) => primitiveObject(value, 'number'), 1, P._),
  task('Map', (value) => primitiveMapDispatch(value, 'number'), 1, P._),
  task('if/else', (value) => primitiveIf(value, 'number'), 1, P._),
])

bench('primitive dispatch only: boolean', [
  task('switch', (value) => primitiveSwitch(value, 'boolean'), true, P._),
  task('object table', (value) => primitiveObject(value, 'boolean'), true, P._),
  task('Map', (value) => primitiveMapDispatch(value, 'boolean'), true, P._),
  task('if/else', (value) => primitiveIf(value, 'boolean'), true, P._),
])

bench('primitive dispatch only: null', [
  task('switch', (value) => primitiveSwitch(value, 'null'), null, P._),
  task('object table', (value) => primitiveObject(value, 'null'), null, P._),
  task('Map', (value) => primitiveMapDispatch(value, 'null'), null, P._),
  task('if/else', (value) => primitiveIf(value, 'null'), null, P._),
])

const scenarios = [
  ['wildcard', 'anything', P._],
  ['primitive string', 'x', P.string],
  ['primitive number', 1, P.number],
  ['primitive boolean', false, P.boolean],
  ['undefined', undefined, P.undefined],
  ['literal', 'x', 'x'],
  ['union', 'warning', P.union('error', 'warning')],
  ['exclude', 'info', P.exclude('error')],
  ['optional', undefined, P.optional(P.string)],
  ['object', { type: 'user', id: '1' }, { type: 'user', id: P.string }],
  ['nested object', { a: { b: { c: 1 } } }, { a: { b: { c: P.number } } }],
  ['tuple', ['x', 1], [P.string, P.number]],
  ['array', [1, 2, 3, 4, 5], P.array(P.number)],
  ['record', { a: 1, b: 2, c: 3 }, P.record(P.string, P.number)],
  ['select', { a: 1 }, { a: P.select('a', P.number) }],
  ['failure path', { type: 'post', id: 1 }, { type: 'user', id: P.string }],
] as const

for (const [name, value, pattern] of scenarios) {
  bench(`pattern dispatch: ${name}`, strategyTasks(value, pattern))
}

const directEvent = { type: 'delta' as const, value: 2 }
const nestedEvent = { meta: { type: 'delta' as const }, value: 2 }
const largeEvent: { readonly type: string; readonly value: number } = { type: 'k24', value: 24 }
const largeCases: Readonly<Record<string, (event: typeof largeEvent) => number>> = Object.fromEntries(
  Array.from({ length: 50 }, (_unused, index) => [`k${index}`, (event: typeof largeEvent) => event.value + index]),
)

bench(
  'matchBy direct/nested/large object maps',
  [
    {
      name: 'direct key',
      run: () => {
        let total = 0
        for (let index = 0; index < ITERATIONS; index += 1) {
          total += matchBy(directEvent, 'type').cases({ delta: (event) => event.value })
        }
        return total
      },
    },
    {
      name: 'nested path',
      run: () => {
        let total = 0
        for (let index = 0; index < ITERATIONS; index += 1) {
          total += matchBy(nestedEvent, 'meta.type').cases({ delta: (event) => event.value })
        }
        return total
      },
    },
    {
      name: 'large case map',
      run: () => {
        let total = 0
        for (let index = 0; index < ITERATIONS; index += 1) {
          total += matchBy(largeEvent, 'type')
            .partial(largeCases)
            .otherwise(() => 0)
        }
        return total
      },
    },
  ],
  false,
)
