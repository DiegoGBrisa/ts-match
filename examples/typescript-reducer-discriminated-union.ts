import { matchBy } from '@diegogbrisa/ts-match'

type State =
  | { readonly status: 'idle'; readonly rows: readonly string[] }
  | { readonly status: 'loading'; readonly rows: readonly string[] }
  | { readonly status: 'ready'; readonly rows: readonly string[] }
  | { readonly status: 'failed'; readonly message: string }

type Action =
  | { readonly type: 'start-loading' }
  | { readonly type: 'load-success'; readonly rows: readonly string[] }
  | { readonly type: 'load-failure'; readonly message: string }
  | { readonly type: 'clear' }

function reduce(state: State, action: Action) {
  const rows = 'rows' in state ? state.rows : []

  return matchBy(action, 'type')
    .with('start-loading', () => ({ status: 'loading', rows }))
    .with('load-success', (event) => ({ status: 'ready', rows: event.rows }))
    .with('load-failure', (event) => ({ status: 'failed', message: event.message }))
    .with('clear', () => ({ status: 'idle', rows: [] }))
    .exhaustive()
}

export const nextState = reduce({ status: 'idle', rows: [] }, { type: 'load-success', rows: ['Ada', 'Grace'] })
