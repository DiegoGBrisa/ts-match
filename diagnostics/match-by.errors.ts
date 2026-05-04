import { group, matchBy } from '../src/index.js'
import type { PartialEntriesArgument } from '../src/types.js'

type Event =
  | { readonly type: 'open'; readonly payload: { readonly code: 200; readonly id: string } }
  | { readonly type: 'close'; readonly payload: { readonly code: 404; readonly reason: string } }
  | { readonly type: 'idle'; readonly payload: { readonly code: 0 } }

declare const event: Event

// Intended diagnostic: ts-match says the matchBy path is invalid.
matchBy(event, 'missing')

// Intended diagnostic: ts-match says the nested dot path is invalid.
matchBy(event, 'payload.missing')

// Intended diagnostic: ts-match says the tuple path is invalid.
matchBy(event, ['payload', 'missing'])

// Intended diagnostic: ts-match says the selected path cannot be used as a tag.
matchBy(event, 'payload')

// Intended diagnostic: ts-match says this tag cannot occur at the selected path.
matchBy(event, 'type')
  .with('missing', () => 'bad-tag')
  .otherwise(() => 'fallback')

// Intended diagnostic: ts-match says matchBy is not exhaustive and reports remaining tags.
matchBy(event, 'type')
  .with('open', (value) => value.payload.id)
  .exhaustive()

// Intended diagnostic: ts-match says object-map cases are missing required keys.
matchBy(event, 'type').cases({
  open: (value) => value.payload.id,
})

// Intended diagnostic: ts-match says object-map cases contain an extra key.
matchBy(event, 'type').cases({
  open: (value) => value.payload.id,
  close: (value) => value.payload.reason,
  idle: () => 'idle',
  extra: () => 'extra',
})

type Collision = { readonly flag: true; readonly a: string } | { readonly flag: 'true'; readonly b: string }
declare const collision: Collision

// Intended diagnostic: ts-match says object-map keys collide after JavaScript normalization.
matchBy(collision, 'flag').cases({ true: () => 'collision' })

type Nullish = { readonly kind: 'ready'; readonly value: string } | { readonly kind: null; readonly value: null }
declare const nullish: Nullish

// Intended diagnostic: ts-match says object maps cannot represent null or undefined tags.
matchBy(nullish, 'kind').cases({ ready: (value) => value.value })

declare const broad: { readonly kind: string; readonly value: string }

// Intended diagnostic: ts-match says object maps require a finite literal tag union.
matchBy(broad, 'kind').cases({ ready: (value) => value.value })

// Intended diagnostic: ts-match says grouped callback cases contain impossible tags.
matchBy(event, 'type').cases((group) => [
  group('open', (value) => value.payload.id),
  group('missing', () => 'missing'),
  group(['close', 'idle'], () => 'done'),
])

// Intended diagnostic: ts-match says grouped cases contain impossible tags.
const _groupedTagDiagnostic: PartialEntriesArgument<Event['type'], 'missing'> = {}

// Intended diagnostic: ts-match says tuple-entry cases contain impossible tags.
matchBy(event, 'type').partial([['missing', () => 'missing']])

// Intended diagnostic: ts-match says exported group entries with impossible tags cannot satisfy cases.
matchBy(event, 'type').cases([
  group(['open', 'missing'], () => 'bad-group'),
  ['close', (value) => value.payload.reason],
  ['idle', () => 'idle'],
])

// Intended diagnostic: ts-match says matchBy.promise is not exhaustive.
matchBy
  .promise(Promise.resolve(event), 'type')
  .with('open', (value) => value.payload.id)
  .exhaustive()
