import { isMatching, P } from '@diegogbrisa/ts-match'

const activityFeed = [
  { type: 'user.signed-in', userId: 'u1' },
  { type: 'invoice.paid', invoiceId: 42 },
  { type: 'user.signed-in', userId: 'u2' },
]

const isSignIn = isMatching({ type: 'user.signed-in', userId: P.string })

export const signIns = activityFeed.filter(isSignIn)
export const signedInUserIds = signIns.map((event) => event.userId)
