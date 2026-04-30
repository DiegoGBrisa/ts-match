import { match, P } from '@diegogbrisa/ts-match'

type ApiResponse =
  | { readonly ok: true; readonly body: string }
  | { readonly ok: false; readonly status: number; readonly message: string }

async function fetchResponse(): Promise<ApiResponse> {
  return { ok: true, body: '  user-1  ' }
}

async function fetchRejectedResponse(): Promise<ApiResponse> {
  throw new Error('network unavailable')
}

async function readBody(response: ApiResponse | PromiseLike<ApiResponse>): Promise<string> {
  return match
    .promise(response)
    .with({ ok: true, body: P.select('body', P.string) }, async ({ body }) => body.trim())
    .with({ ok: false }, ({ status, message }) => `error:${String(status)}:${message}`)
    .exhaustive()
}

async function readBodySafely(response: ApiResponse | PromiseLike<ApiResponse>) {
  return match
    .promise(response)
    .with({ ok: true, body: P.select('body', P.string) }, ({ body }) => body.trim())
    .with({ ok: false }, ({ status, message }) => `error:${String(status)}:${message}`)
    .safeExhaustive()
}

async function readOptionalBody(response: ApiResponse | PromiseLike<ApiResponse>) {
  return match
    .promise(response)
    .with({ ok: true, body: P.select('body', P.string) }, ({ body }) => body.trim())
    .safeOtherwise(() => 'empty')
}

const body = await readBody(fetchResponse())
const safeBody = await readBodySafely(fetchResponse())
const safeMissing = await readOptionalBody({ ok: false, status: 404, message: 'missing' })
const safeNetworkFailure = await readBodySafely(fetchRejectedResponse())

if (body !== 'user-1') throw new Error(`Expected user-1, got ${body}`)
if (!safeBody.ok || safeBody.value !== 'user-1') throw new Error('Expected safeExhaustive success')
if (!safeMissing.ok || safeMissing.value !== 'empty') throw new Error('Expected safeOtherwise fallback success')
if (safeNetworkFailure.ok) throw new Error('Expected rejected input to become a safe error result')
