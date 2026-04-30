import { matchBy } from '@diegogbrisa/ts-match'

type ConnectionEvent =
  | { readonly type: 'start'; readonly id: string }
  | { readonly type: 'resume'; readonly id: string }
  | { readonly type: 'stop'; readonly reason: string }

type SaveAction =
  | { readonly type: 'save'; readonly documentId: string }
  | { readonly type: 'rename'; readonly documentId: string; readonly title: string }
  | { readonly type: 'duplicate'; readonly documentId: string; readonly targetId: string }
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

function documentAudit(action: SaveAction): string {
  return matchBy(action, 'type')
    .partial([
      ['save', (value) => `write:${value.documentId}`],
      [['rename', 'duplicate'] as const, (value) => `copy:${value.documentId}`],
    ])
    .otherwise((remaining) => (remaining.type === 'close' ? `close:${remaining.documentId}` : 'noop'))
}

if (connectionLabel({ type: 'resume', id: 'socket-1' }) !== 'active:socket-1') throw new Error('matchBy.with failed')
if (saveLabel({ type: 'close', documentId: 'doc-1' }) !== 'close:doc-1') throw new Error('matchBy.partial failed')
if (documentAudit({ type: 'rename', documentId: 'doc-1', title: 'Notes' }) !== 'copy:doc-1') {
  throw new Error('matchBy tuple partial failed')
}
