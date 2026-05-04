import { assertMatching, NonExhaustiveMatchError, PatternMismatchError, P } from '@diegogbrisa/ts-match'
import { preview } from '@diegogbrisa/ts-match/errors'

const invalidUserForm = Object.fromEntries(new URLSearchParams('type=user&id=u1&role=owner'))
let validationMessage = ''

try {
  assertMatching({ type: 'user', id: P.string, role: P.union('admin', 'member') }, invalidUserForm)
} catch (error) {
  if (error instanceof PatternMismatchError) {
    validationMessage = error.message
  }
}

const missingAccountState = new NonExhaustiveMatchError(
  { type: 'archived', id: 'acct-1' },
  { matcher: 'matchBy', path: 'type', tag: 'archived' },
)

export const errors = {
  validationMessage,
  missingAccountState: missingAccountState.message,
  retryPreview: preview({ error: new Error('payment failed'), retryable: true }),
}
