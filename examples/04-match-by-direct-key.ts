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

function auditCommand(command: Command): string {
  return matchBy(command, 'kind').cases({
    create: (value) => `created:${value.id}`,
    rename: (value) => `renamed:${value.id}:${value.name}`,
    delete: (value) => `deleted:${value.id}`,
  })
}

const description = describeCommand({ kind: 'rename', id: 'file-1', name: 'README.md' })
const audit = auditCommand({ kind: 'delete', id: 'file-1' })

if (description !== 'rename:file-1:README.md') throw new Error(`Unexpected description: ${description}`)
if (audit !== 'deleted:file-1') throw new Error(`Unexpected audit entry: ${audit}`)
