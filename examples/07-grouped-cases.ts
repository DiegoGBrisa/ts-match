import { group, matchBy } from '@diegogbrisa/ts-match'

type StreamEvent =
  | { readonly type: 'start'; readonly at: number }
  | { readonly type: 'resume'; readonly at: number }
  | { readonly type: 'stop'; readonly reason: string }
  | { readonly type: 'error'; readonly message: string }

type OptionalState =
  | { readonly kind: 'ready'; readonly data: string }
  | { readonly kind: null; readonly reason: string }
  | { readonly empty: true }

function streamStatus(event: StreamEvent): string {
  return matchBy(event, 'type').cases((group) => [
    group(['start', 'resume'], (value) => `active:${String(value.at)}`),
    group('stop', (value) => `stopped:${value.reason}`),
    group('error', (value) => `error:${value.message}`),
  ])
}

function stateLabel(state: OptionalState): string {
  return matchBy(state, 'kind').cases((group) => [
    group('ready', (value) => value.data),
    group(null, (value) => value.reason),
    group(undefined, () => 'empty'),
  ])
}

const reusableStatusCases = [
  group(['start', 'resume'] as const, () => 'active'),
  group('stop', () => 'inactive'),
  group('error', () => 'inactive'),
]

function coarseStatus(event: StreamEvent): string {
  return matchBy(event, 'type').cases(reusableStatusCases)
}

if (streamStatus({ type: 'resume', at: 2 }) !== 'active:2') throw new Error('group callback failed')
if (stateLabel({ empty: true }) !== 'empty') throw new Error('undefined grouped case failed')
if (coarseStatus({ type: 'stop', reason: 'done' }) !== 'inactive') throw new Error('exported group helper failed')
