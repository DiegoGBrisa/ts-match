import { matchBy } from '@diegogbrisa/ts-match'

const EVENT_KIND = Symbol('event-kind')
const CLICK_X = 10
const CLICK_Y = 20

type UiEvent =
  | { readonly meta: { readonly type: 'click'; readonly x: number; readonly y: number } }
  | { readonly meta: { readonly type: 'submit'; readonly form: string } }

type SourceEvent =
  | { readonly meta: { readonly [EVENT_KIND]: 'user'; readonly name: string } }
  | { readonly meta: { readonly [EVENT_KIND]: 'system'; readonly code: number } }

export function routeEvent(event: UiEvent) {
  return matchBy(event, 'meta.type')
    .with('click', (value) => ({ kind: 'pointer', x: value.meta.x, y: value.meta.y }))
    .with('submit', (value) => ({ kind: 'form', form: value.meta.form }))
    .exhaustive()
}

export function labelSource(event: SourceEvent) {
  return matchBy(event, ['meta', EVENT_KIND])
    .with('user', (value) => `User: ${value.meta.name}`)
    .with('system', (value) => `System: ${String(value.meta.code)}`)
    .exhaustive()
}

export const routedEvent = routeEvent({ meta: { type: 'click', x: CLICK_X, y: CLICK_Y } })
export const sourceLabel = labelSource({ meta: { [EVENT_KIND]: 'user', name: 'Ada' } })
