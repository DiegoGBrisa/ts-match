import { assertMatching, matchBy, NonExhaustiveMatchError, PatternMismatchError, P } from '@diegogbrisa/ts-match'
import { preview } from '@diegogbrisa/ts-match/errors'
import type { MatchErrorMetadata } from '@diegogbrisa/ts-match/errors'

let mismatchMessage = ''

try {
  assertMatching({ type: 'user', id: P.string }, { type: 'user', id: 123 })
} catch (error) {
  if (!(error instanceof PatternMismatchError)) throw error
  mismatchMessage = error.message
  if (error.patternPreview.length === 0 || error.valuePreview.length === 0) {
    throw new Error('PatternMismatchError should include previews')
  }
}

type AccountState =
  | { readonly type: 'active'; readonly id: string }
  | { readonly type: 'disabled'; readonly id: string }

function loadAccountState(): AccountState {
  return JSON.parse('{"type":"archived","id":"acct-1"}')
}

let nonExhaustivePath = ''
let nonExhaustiveTag: unknown

try {
  matchBy(loadAccountState(), 'type').cases({
    active: (account) => `active:${account.id}`,
    disabled: (account) => `disabled:${account.id}`,
  })
} catch (error) {
  if (!(error instanceof NonExhaustiveMatchError)) throw error
  nonExhaustivePath = error.path ?? ''
  nonExhaustiveTag = error.tag
}

const metadata: MatchErrorMetadata = { matcher: 'matchBy', path: 'type', tag: 'archived' }
const nonExhaustive = new NonExhaustiveMatchError({ type: 'archived' }, metadata)
const previewText = preview({ error: new Error('boom'), retryable: true })

if (!mismatchMessage.includes('Value did not match pattern')) throw new Error('Expected PatternMismatchError message')
if (nonExhaustivePath !== 'type' || nonExhaustiveTag !== 'archived') {
  throw new Error('Expected real NonExhaustiveMatchError metadata')
}
if (nonExhaustive.name !== 'NonExhaustiveMatchError') throw new Error('Expected NonExhaustiveMatchError name')
if (nonExhaustive.matcher !== 'matchBy' || nonExhaustive.path !== 'type') {
  throw new Error('Expected constructed NonExhaustiveMatchError metadata')
}
if (!previewText.includes('retryable')) throw new Error('Expected preview output')
