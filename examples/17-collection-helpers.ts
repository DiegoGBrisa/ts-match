import { match, P } from '@diegogbrisa/ts-match'

const METADATA_COUNT = 2
const QUALITY_SCORE = 9
const SPEED_SCORE = 7
const METRIC_VALUE = 7

const metadata = new Map<unknown, unknown>([
  ['id', 'user-123'],
  ['count', METADATA_COUNT],
  ['source', 'import'],
])

export const metadataStatus = match(metadata)
  .with(P.map(['id', P.string], ['count', P.number]), () => 'has-required-metadata')
  .otherwise(() => 'missing-metadata')

const roles = new Set<unknown>(['admin', 'owner'])

export const hasExactRoles = match(roles)
  .with(P.exact(P.set('admin', 'owner')), () => true)
  .otherwise(() => false)

const fieldKey = Object.freeze({ field: 'id' })
const fields = new Map<object, string>([[fieldKey, 'user-123']])

export const fieldId = match(fields)
  .with(P.map([P.literal(fieldKey), P.string]), (matchedFields) => matchedFields.get(fieldKey))
  .otherwise(() => undefined)

const scoreMap = new Map([
  ['quality', QUALITY_SCORE],
  ['speed', SPEED_SCORE],
])

export const totalScore = match(scoreMap)
  .with(P.map(P.string, P.number), (scores) => [...scores.values()].reduce((total, score) => total + score, 0))
  .otherwise(() => 0)

const events = [
  { type: 'user', id: 'user-1' },
  { type: 'metric', value: METRIC_VALUE },
  { type: 'user', id: 'user-2' },
] as const

export const collectedEventData = match(events)
  .with(
    P.array(
      P.union(
        { type: 'user', id: P.collect('userIds', P.string) },
        { type: 'metric', value: P.collect('metricValues', P.number) },
      ),
    ),
    ({ userIds, metricValues }) => ({ userIds, metricValues }),
  )
  .otherwise(() => ({ userIds: [], metricValues: [] }))

export const requiredMetadataValues = match(metadata)
  .with(P.map(['id', P.collect('values', P.string)], ['count', P.collect('values', P.number)]), ({ values }) => values)
  .otherwise(() => [])
