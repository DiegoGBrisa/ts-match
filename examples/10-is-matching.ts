import { isMatching, P } from '@diegogbrisa/ts-match'

const values: unknown[] = [
  { type: 'user', id: 'u1' },
  { type: 'post', id: 1 },
  { type: 'user', id: 'u2' },
]

const isUser = isMatching({ type: 'user', id: P.string })
const users = values.filter(isUser)

if (users.length !== 2) throw new Error(`Expected two users, got ${String(users.length)}`)

const firstId = users[0]?.id
if (firstId !== 'u1') throw new Error(`Expected u1, got ${String(firstId)}`)

if (!isMatching(P.array({ type: 'user', id: P.string }), users))
  throw new Error('Filtered users should match user array pattern')
