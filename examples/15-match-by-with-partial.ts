import { matchBy } from '@diegogbrisa/ts-match'

type ConnectionEvent =
  | { readonly type: 'start'; readonly id: string }
  | { readonly type: 'resume'; readonly id: string }
  | { readonly type: 'stop'; readonly reason: string }

type SaveAction =
  | { readonly type: 'save'; readonly documentId: string }
  | { readonly type: 'close'; readonly documentId: string }
  | { readonly type: 'noop' }

function connectionLabel(event: ConnectionEvent): string {
  return matchBy(event, 'type')
    .with('start', 'resume', (value) => `active:${value.id}`)
    .with('stop', (value) => `stopped:${value.reason}`)
    .exhaustive()
}

function saveLabel(action: SaveAction): string {
  return matchBy(action, 'type')
    .partial({
      save: (value) => `save:${value.documentId}`,
    })
    .otherwise((remaining) => (remaining.type === 'close' ? `close:${remaining.documentId}` : 'noop'))
}

if (connectionLabel({ type: 'resume', id: 'socket-1' }) !== 'active:socket-1') throw new Error('matchBy.with failed')
if (saveLabel({ type: 'close', documentId: 'doc-1' }) !== 'close:doc-1') throw new Error('matchBy.partial failed')
