import { matchBy } from '@diegogbrisa/ts-match'

type Job =
  | { readonly type: 'queued'; readonly id: string }
  | { readonly type: 'running'; readonly id: string; readonly worker: string }
  | { readonly type: 'finished'; readonly id: string; readonly durationMs: number }
  | { readonly type: 'failed'; readonly id: string; readonly reason: string }

type JobSummary =
  | { readonly state: 'waiting'; readonly id: string }
  | { readonly state: 'active'; readonly id: string; readonly worker: string }
  | { readonly state: 'complete'; readonly id: string; readonly durationMs: number }
  | { readonly state: 'retryable'; readonly id: string; readonly reason: string }

type JobBucket =
  | { readonly bucket: 'inProgress'; readonly id: string }
  | { readonly bucket: 'done'; readonly durationMs: number }
  | { readonly bucket: 'failed'; readonly reason: string }

type JobNextStep =
  | { readonly action: 'notifyOperator'; readonly reason: string }
  | { readonly action: 'monitor'; readonly id: string }
  | { readonly action: 'archive'; readonly durationMs: number }

type SafeJobStatus =
  | { readonly status: 'needsAttention'; readonly reason: string }
  | { readonly status: 'healthy'; readonly id: string }

async function fetchJob(): Promise<Job> {
  return { type: 'queued', id: 'job-1' }
}

async function fetchFailedJob(): Promise<Job> {
  return { type: 'failed', id: 'job-2', reason: 'timeout' }
}

async function fetchRejectedJob(): Promise<Job> {
  throw new Error('scheduler unavailable')
}

async function summarizeJob(job: Job | PromiseLike<Job>): Promise<JobSummary> {
  return matchBy
    .promise(job, 'type')
    .with('queued', async (value) => ({ state: 'waiting', id: value.id }))
    .with('running', (value) => ({ state: 'active', id: value.id, worker: value.worker }))
    .with('finished', (value) => ({ state: 'complete', id: value.id, durationMs: value.durationMs }))
    .with('failed', (value) => ({ state: 'retryable', id: value.id, reason: value.reason }))
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

async function jobBucket(job: Job | PromiseLike<Job>): Promise<JobBucket> {
  return matchBy
    .promise(job, 'type')
    .cases((group) => [
      group('queued', 'running', (value) => ({ bucket: 'inProgress', id: value.id })),
      group('finished', (value) => ({ bucket: 'done', durationMs: value.durationMs })),
      group('failed', (value) => ({ bucket: 'failed', reason: value.reason })),
    ])
}

async function jobNextStep(job: Job | PromiseLike<Job>): Promise<JobNextStep> {
  return matchBy
    .promise(job, 'type')
    .partial([
      ['failed', (value) => ({ action: 'notifyOperator', reason: value.reason }) as const],
      [['queued', 'running'] as const, (value) => ({ action: 'monitor', id: value.id }) as const],
    ])
    .otherwise((value) => ({ action: 'archive', durationMs: value.durationMs }))
}

async function safeJobStatus(job: Job | PromiseLike<Job>) {
  return matchBy
    .promise(job, 'type')
    .with('failed', (value) => ({ status: 'needsAttention', reason: value.reason }))
    .safeOtherwise((value): SafeJobStatus => ({ status: 'healthy', id: value.id }))
}

const summary = await summarizeJob(fetchJob())
const metric = await jobMetric({ type: 'finished', id: 'job-3', durationMs: 125 })
const bucket = await jobBucket(fetchFailedJob())
const nextStep = await jobNextStep(fetchFailedJob())
const safeStatus = await safeJobStatus(fetchJob())
const safeRejected = await safeJobStatus(fetchRejectedJob())

if (summary.state !== 'waiting') throw new Error(`Unexpected job summary: ${JSON.stringify(summary)}`)
if (metric !== 125) throw new Error(`Unexpected job metric: ${String(metric)}`)
if (bucket.bucket !== 'failed' || bucket.reason !== 'timeout')
  throw new Error(`Unexpected job bucket: ${JSON.stringify(bucket)}`)
if (nextStep.action !== 'notifyOperator') throw new Error(`Unexpected job next step: ${JSON.stringify(nextStep)}`)
if (!safeStatus.ok || safeStatus.value.status !== 'healthy') throw new Error('Expected safeOtherwise success')
if (safeRejected.ok) throw new Error('Expected rejected job input to become a safe error result')
