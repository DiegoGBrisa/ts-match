import { isMatching, matchBy, P } from '../src/index.js'
import {
  ARRAY_VALUE_FIVE,
  ARRAY_VALUE_FOUR,
  EVENT_DELTA_VALUE,
  LARGE_CASE_COUNT,
  LARGE_EVENT_VALUE,
} from './benchmark-constants.js'
import {
  matchIf,
  matchMap,
  matchSwitch,
  matchTable,
  primitiveIf,
  primitiveMapDispatch,
  primitiveObject,
  primitiveSwitch,
} from './dispatch-matchers.js'
import { ITERATIONS, bench, task } from './dispatch-measurement.js'

function currentTask(value: unknown, pattern: unknown) {
  return task(
    'current isMatching',
    (candidate, candidatePattern) => isMatching(candidatePattern, candidate),
    value,
    pattern,
  )
}

function strategyTasks(value: unknown, pattern: unknown) {
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
  ['array', [1, EVENT_DELTA_VALUE, ARRAY_VALUE_FOUR, ARRAY_VALUE_FIVE], P.array(P.number)],
  ['record', { a: 1, b: EVENT_DELTA_VALUE, c: ARRAY_VALUE_FOUR }, P.record(P.string, P.number)],
  ['select', { a: 1 }, { a: P.select('a', P.number) }],
  ['failure path', { type: 'post', id: 1 }, { type: 'user', id: P.string }],
] as const

for (const [name, value, pattern] of scenarios) {
  bench(`pattern dispatch: ${name}`, strategyTasks(value, pattern))
}

const directEvent = { type: 'delta' as const, value: EVENT_DELTA_VALUE }
const nestedEvent = { meta: { type: 'delta' as const }, value: EVENT_DELTA_VALUE }
const largeEvent: { readonly type: string; readonly value: number } = { type: 'k24', value: LARGE_EVENT_VALUE }
const largeCases: Readonly<Record<string, (event: typeof largeEvent) => number>> = Object.fromEntries(
  Array.from({ length: LARGE_CASE_COUNT }, (_unused, index) => [
    `k${index}`,
    (event: typeof largeEvent) => event.value + index,
  ]),
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
