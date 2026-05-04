import { match, P } from '@diegogbrisa/ts-match'

type ProfileResponse =
  | { readonly ok: true; readonly profile: { readonly id: string; readonly name: string } }
  | { readonly ok: false; readonly status: number; readonly message: string }

const profileResponse: ProfileResponse = { ok: true, profile: { id: 'user-1', name: 'Ada' } }
const missingProfile: ProfileResponse = { ok: false, status: 404, message: 'missing' }
const responses: readonly ProfileResponse[] = [profileResponse, missingProfile]
const profilePromise = Promise.resolve(responses[0] ?? missingProfile)
const missingProfilePromise = Promise.resolve(responses[1] ?? missingProfile)

export const profileName = await match
  .promise(profilePromise)
  .with({ ok: true, profile: { name: P.select('name', P.string) } }, ({ name }) => name)
  .with({ ok: false }, ({ status, message }) => `Request failed (${String(status)}): ${message}`)
  .exhaustive()

export const safeProfileName = await match
  .promise(missingProfilePromise)
  .with({ ok: true, profile: { name: P.select('name', P.string) } }, ({ name }) => name)
  .safeOtherwise(() => 'Guest')
