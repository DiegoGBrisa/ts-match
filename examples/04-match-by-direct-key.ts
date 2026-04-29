import { matchBy } from '@diegogbrisa/ts-match'

type Command =
  | { readonly kind: 'create'; readonly id: string }
  | { readonly kind: 'rename'; readonly id: string; readonly name: string }
  | { readonly kind: 'delete'; readonly id: string }

function describeCommand(command: Command): string {
  return matchBy(command, 'kind')
    .with('create', (value) => `create:${value.id}`)
    .with('rename', (value) => `rename:${value.id}:${value.name}`)
    .with('delete', (value) => `delete:${value.id}`)
    .exhaustive()
}

const description = describeCommand({ kind: 'rename', id: 'file-1', name: 'README.md' })

if (description !== 'rename:file-1:README.md') throw new Error(`Unexpected description: ${description}`)
