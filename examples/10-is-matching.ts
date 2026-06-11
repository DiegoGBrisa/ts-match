import { isMatching, P } from '@diegogbrisa/ts-match'

const INVOICE_ID = 42

const activityFeed = [
  { type: 'user.signed-in', userId: 'u1' },
  { type: 'invoice.paid', invoiceId: INVOICE_ID },
  { type: 'user.signed-in', userId: 'u2' },
]

const isSignIn = isMatching({ type: 'user.signed-in', userId: P.string })

export const signIns = activityFeed.filter(isSignIn)
export const signedInUserIds = signIns.map((event) => event.userId)
