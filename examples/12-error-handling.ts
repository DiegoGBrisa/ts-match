import { assertMatching, NonExhaustiveMatchError, PatternMismatchError, P } from '@diegogbrisa/ts-match'

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

const nonExhaustive = new NonExhaustiveMatchError(
  { type: 'new-runtime-case' },
  { matcher: 'matchBy', path: 'type', tag: 'new-runtime-case' },
)

if (!mismatchMessage.includes('Value did not match pattern')) throw new Error('Expected PatternMismatchError message')
if (nonExhaustive.name !== 'NonExhaustiveMatchError') throw new Error('Expected NonExhaustiveMatchError name')
if (nonExhaustive.matcher !== 'matchBy' || nonExhaustive.path !== 'type') {
  throw new Error('Expected NonExhaustiveMatchError metadata')
}
