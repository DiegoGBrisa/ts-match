import { matchBy } from '@diegogbrisa/ts-match'

type Job =
  | { readonly type: 'queued'; readonly id: string }
  | { readonly type: 'running'; readonly id: string; readonly worker: string }
  | { readonly type: 'finished'; readonly id: string; readonly durationMs: number }
  | { readonly type: 'failed'; readonly id: string; readonly reason: string }

async function fetchJob(): Promise<Job> {
  return { type: 'queued', id: 'job-1' }
}

async function fetchFailedJob(): Promise<Job> {
  return { type: 'failed', id: 'job-2', reason: 'timeout' }
}

async function fetchRejectedJob(): Promise<Job> {
  throw new Error('scheduler unavailable')
}

async function describeJob(job: Job | PromiseLike<Job>): Promise<string> {
  return matchBy
    .promise(job, 'type')
    .with('queued', async (value) => `queued:${value.id}`)
    .with('running', (value) => `running:${value.id}:${value.worker}`)
    .with('finished', (value) => `finished:${value.id}:${String(value.durationMs)}`)
    .with('failed', (value) => `failed:${value.id}:${value.reason}`)
    .exhaustive()
}

async function jobMetric(job: Job | PromiseLike<Job>): Promise<number> {
  return matchBy.promise(job, 'type').cases({
    queued: () => 0,
    running: (value) => value.worker.length,
    finished: (value) => value.durationMs,
    failed: (value) => value.reason.length,
  })
}

async function jobBucket(job: Job | PromiseLike<Job>): Promise<string> {
  return matchBy
    .promise(job, 'type')
    .cases((group) => [
      group('queued', 'running', (value) => `active:${value.id}`),
      group('finished', (value) => `done:${value.durationMs}`),
      group('failed', (value) => `failed:${value.reason}`),
    ])
}

async function jobStatus(job: Job | PromiseLike<Job>): Promise<string> {
  return matchBy
    .promise(job, 'type')
    .partial([
      ['failed', (value) => `needs-attention:${value.reason}`],
      [['queued', 'running'] as const, (value) => `in-flight:${value.id}`],
    ])
    .otherwise((value) => `complete:${value.durationMs}`)
}

async function safeJobStatus(job: Job | PromiseLike<Job>) {
  return matchBy
    .promise(job, 'type')
    .with('failed', (value) => `failed:${value.reason}`)
    .safeOtherwise((value) => `not-failed:${value.id}`)
}

const description = await describeJob(fetchJob())
const metric = await jobMetric({ type: 'finished', id: 'job-3', durationMs: 125 })
const bucket = await jobBucket(fetchFailedJob())
const status = await jobStatus(fetchFailedJob())
const safeStatus = await safeJobStatus(fetchJob())
const safeRejected = await safeJobStatus(fetchRejectedJob())

if (description !== 'queued:job-1') throw new Error(`Unexpected job description: ${description}`)
if (metric !== 125) throw new Error(`Unexpected job metric: ${String(metric)}`)
if (bucket !== 'failed:timeout') throw new Error(`Unexpected job bucket: ${bucket}`)
if (status !== 'needs-attention:timeout') throw new Error(`Unexpected job status: ${status}`)
if (!safeStatus.ok || safeStatus.value !== 'not-failed:job-1') throw new Error('Expected safeOtherwise success')
if (safeRejected.ok) throw new Error('Expected rejected job input to become a safe error result')
