import { matchBy } from '@diegogbrisa/ts-match'

type Job =
  | { readonly type: 'queued'; readonly id: string }
  | { readonly type: 'finished'; readonly id: string; readonly durationMs: number }
  | { readonly type: 'failed'; readonly id: string; readonly reason: string }

async function describeJob(job: Job): Promise<string> {
  return matchBy
    .async(job, 'type')
    .with('queued', async (value) => `queued:${value.id}`)
    .with('finished', (value) => `finished:${value.id}:${String(value.durationMs)}`)
    .with('failed', (value) => `failed:${value.id}:${value.reason}`)
    .exhaustive()
}

const description = await describeJob({ type: 'finished', id: 'job-1', durationMs: 42 })

if (description !== 'finished:job-1:42') throw new Error(`Unexpected job description: ${description}`)
