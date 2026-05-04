import { match, matchBy, P } from '@diegogbrisa/ts-match'

type AnalyticsEvent =
  | { readonly name: 'page_view'; readonly path: string; readonly referrer?: string }
  | { readonly name: 'button_click'; readonly id: string; readonly label: string }
  | { readonly name: 'error'; readonly error: Error }

type AppMessage =
  | { readonly channel: 'analytics'; readonly event: AnalyticsEvent }
  | { readonly channel: 'health'; readonly status: 'ok' | 'degraded' }

function summarizeEvent(event: AnalyticsEvent) {
  return matchBy(event, 'name')
    .with('page_view', (value) => ({ kind: 'page', path: value.path }))
    .with('button_click', (value) => ({ kind: 'button', id: value.id, label: value.label }))
    .with('error', (value) => ({ kind: 'error', message: value.error.message }))
    .exhaustive()
}

function routeMessage(message: AppMessage) {
  return matchBy(message, 'channel')
    .with('analytics', (value) => summarizeEvent(value.event))
    .with('health', (value) => ({ kind: 'health', status: value.status }))
    .exhaustive()
}

export const routedMessage = routeMessage({
  channel: 'analytics',
  event: { name: 'button_click', id: 'save', label: 'Save' },
})

export const selectedPath = match({ event: { name: 'page_view', path: '/docs' } })
  .with({ event: { name: 'page_view', path: P.select('path', P.string) } }, ({ path }) => path)
  .otherwise(() => '/')
