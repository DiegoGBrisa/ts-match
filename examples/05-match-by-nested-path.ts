import { matchBy } from '@diegogbrisa/ts-match'

const EVENT_KIND = Symbol('event-kind')

type UiEvent =
  | { readonly meta: { readonly type: 'click'; readonly x: number; readonly y: number } }
  | { readonly meta: { readonly type: 'submit'; readonly form: string } }

type SymbolEvent =
  | { readonly meta: { readonly [EVENT_KIND]: 'user'; readonly name: string } }
  | { readonly meta: { readonly [EVENT_KIND]: 'system'; readonly code: number } }

function labelEvent(event: UiEvent): string {
  return matchBy(event, 'meta.type')
    .with('click', (value) => `click:${String(value.meta.x)},${String(value.meta.y)}`)
    .with('submit', (value) => `submit:${value.meta.form}`)
    .exhaustive()
}

function labelSymbolEvent(event: SymbolEvent): string {
  return matchBy(event, ['meta', EVENT_KIND])
    .with('user', (value) => `user:${value.meta.name}`)
    .with('system', (value) => `system:${String(value.meta.code)}`)
    .exhaustive()
}

if (labelEvent({ meta: { type: 'click', x: 10, y: 20 } }) !== 'click:10,20') throw new Error('dot path failed')
if (labelSymbolEvent({ meta: { [EVENT_KIND]: 'user', name: 'Ada' } }) !== 'user:Ada') {
  throw new Error('tuple symbol path failed')
}
