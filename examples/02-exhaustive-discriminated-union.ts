import { matchBy } from '@diegogbrisa/ts-match'

type State =
  | { readonly status: 'idle'; readonly data: readonly string[] }
  | { readonly status: 'loading'; readonly data: readonly string[] }
  | { readonly status: 'ready'; readonly data: readonly string[] }
  | { readonly status: 'failed'; readonly message: string }

type Action =
  | { readonly type: 'start-loading' }
  | { readonly type: 'load-success'; readonly rows: readonly string[] }
  | { readonly type: 'load-failure'; readonly message: string }
  | { readonly type: 'clear' }

const idleState: State = { status: 'idle', data: [] }
const loadingState: State = { status: 'loading', data: [] }

function readyState(data: readonly string[]): State {
  return { status: 'ready', data }
}

function failedState(message: string): State {
  return { status: 'failed', message }
}

function reduce(_state: State, action: Action): State {
  return matchBy(action, 'type')
    .with('start-loading', () => loadingState)
    .with('load-success', (value) => readyState(value.rows))
    .with('load-failure', (value) => failedState(value.message))
    .with('clear', () => idleState)
    .exhaustive()
}

const next = reduce({ status: 'idle', data: [] }, { type: 'load-success', rows: ['a', 'b'] })

if (next.status !== 'ready' || next.data.length !== 2) throw new Error('Expected ready state with two rows')
