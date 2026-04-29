import { match, matchBy, P } from '@diegogbrisa/ts-match'

type AnalyticsEvent =
  | { readonly name: 'page_view'; readonly path: string; readonly referrer?: string }
  | { readonly name: 'button_click'; readonly id: string; readonly label: string }
  | { readonly name: 'error'; readonly error: Error }

type TransportMessage =
  | { readonly meta: { readonly channel: 'analytics' }; readonly event: AnalyticsEvent }
  | { readonly meta: { readonly channel: 'health' }; readonly status: 'ok' | 'degraded' }

function summarizeEvent(event: AnalyticsEvent): string {
  return matchBy(event, 'name')
    .with('page_view', (value) => `page:${value.path}`)
    .with('button_click', (value) => `button:${value.id}:${value.label}`)
    .with('error', (value) => `error:${value.error.message}`)
    .exhaustive()
}

function routeMessage(message: TransportMessage): string {
  return matchBy(message, 'meta.channel')
    .with('analytics', (value) => summarizeEvent(value.event))
    .with('health', (value) => `health:${value.status}`)
    .exhaustive()
}

const selectedPath = match({ event: { name: 'page_view', path: '/docs' } })
  .with({ event: { name: 'page_view', path: P.select('path', P.string) } }, ({ path }) => path)
  .otherwise(() => '/')

if (
  routeMessage({ meta: { channel: 'analytics' }, event: { name: 'button_click', id: 'save', label: 'Save' } }) !==
  'button:save:Save'
) {
  throw new Error('analytics routing failed')
}
if (selectedPath !== '/docs') throw new Error(`Expected /docs, got ${selectedPath}`)
