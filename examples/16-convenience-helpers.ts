import { isMatching, match, P } from '@diegogbrisa/ts-match'

const uploadedProfile = {
  id: 'user-123',
  displayName: 'Ada',
  avatarUrl: null,
  retryCount: 0,
  createdAt: new Date('2026-06-03T00:00:00.000Z'),
}

const profilePattern = {
  id: P.regex(/^user-\d+$/),
  displayName: P.truthy,
  avatarUrl: P.nullish,
  retryCount: P.falsy,
  createdAt: P.date,
}

type UnknownFunction = () => unknown

function isUnknownFunction(value: unknown): value is UnknownFunction {
  return typeof value === 'function'
}

function callUnknownFunction(value: unknown): unknown {
  return isUnknownFunction(value) ? value() : undefined
}

export const profileReady = isMatching(profilePattern, uploadedProfile)

export const profileSummary = match(uploadedProfile)
  .with(profilePattern, (profile) => ({
    id: profile.id,
    createdYear: profile.createdAt.getUTCFullYear(),
    hasAvatar: false,
  }))
  .otherwise(() => ({ id: 'invalid-profile', createdYear: 0, hasAvatar: false }))

const temporal: unknown = Reflect.get(globalThis, 'Temporal')
const temporalNow: unknown =
  typeof temporal === 'object' && temporal !== null ? Reflect.get(temporal, 'Now') : undefined
const temporalInstantFactory: unknown =
  typeof temporalNow === 'object' && temporalNow !== null ? Reflect.get(temporalNow, 'instant') : undefined
const maybeTemporalInstant = callUnknownFunction(temporalInstantFactory)

export const temporalStatus = match(maybeTemporalInstant)
  .with(P.temporalInstant, () => 'temporal-ready')
  .otherwise(() => 'temporal-unavailable')

export const errorLabel = match(new TypeError('invalid profile'))
  .with(P.error, (error) => error.name)
  .otherwise(() => 'unknown-error')

export const regexpLabel = match(/^user-\d+$/)
  .with(P.regexp, (regex) => regex.source)
  .otherwise(() => '')
