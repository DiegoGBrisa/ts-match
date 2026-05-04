import { group, matchBy } from '@diegogbrisa/ts-match'

type SessionEvent =
  | { readonly type: 'start'; readonly at: number }
  | { readonly type: 'resume'; readonly at: number }
  | { readonly type: 'stop'; readonly reason: string }
  | { readonly type: 'error'; readonly message: string }

type ProfileState =
  | { readonly status: 'ready'; readonly name: string }
  | { readonly status: null; readonly reason: string }
  | { readonly empty: true }

export function sessionStatus(event: SessionEvent) {
  return matchBy(event, 'type').cases((group) => [
    group('start', 'resume', (value) => ({ status: 'active', at: value.at })),
    group('stop', (value) => ({ status: 'stopped', reason: value.reason })),
    group('error', (value) => ({ status: 'failed', message: value.message })),
  ])
}

export function profileLabel(profile: ProfileState) {
  return matchBy(profile, 'status').cases((group) => [
    group('ready', (value) => value.name),
    group(null, (value) => `Unavailable: ${value.reason}`),
    group(undefined, () => 'No profile selected'),
  ])
}

export function coarseSessionStatus(event: SessionEvent) {
  return matchBy(event, 'type').cases([
    group('stop', 'error', () => 'inactive'),
    group(['start', 'resume'], () => 'active'),
  ])
}
