import { assertMatching, P } from '@diegogbrisa/ts-match'

const form = Object.fromEntries(new URLSearchParams('type=user&id=u1&role=admin'))

assertMatching({ type: 'user', id: P.string, role: P.union('admin', 'member') }, form)

export const userSummary = { id: form.id, role: form.role }
