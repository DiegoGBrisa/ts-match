import { assertMatching, P } from '@diegogbrisa/ts-match'

const payload: unknown = { type: 'user', id: 'u1', role: 'admin' }

assertMatching({ type: 'user', id: P.string, role: P.union('admin', 'member') }, payload)

const label = `${payload.id}:${payload.role}`

if (label !== 'u1:admin') throw new Error(`Unexpected label: ${label}`)
