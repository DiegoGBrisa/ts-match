import { match, P } from '@diegogbrisa/ts-match'

type ApiResponse =
  | { readonly ok: true; readonly body: string }
  | { readonly ok: false; readonly status: number; readonly message: string }

async function readBody(response: ApiResponse): Promise<string> {
  return match
    .async(response)
    .with({ ok: true, body: P.select('body', P.string) }, async ({ body }) => body.trim())
    .with({ ok: false }, ({ status, message }) => `error:${String(status)}:${message}`)
    .exhaustive()
}

const body = await readBody({ ok: true, body: '  user-1  ' })

if (body !== 'user-1') throw new Error(`Expected user-1, got ${body}`)
