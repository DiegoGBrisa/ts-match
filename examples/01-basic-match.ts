import { match, P } from '@diegogbrisa/ts-match'

type Notification =
  | { readonly channel: 'email'; readonly subject: string; readonly urgent: boolean }
  | { readonly channel: 'sms'; readonly phone: string; readonly urgent: boolean }
  | { readonly channel: 'push'; readonly deviceId: string; readonly urgent: boolean }

const input: unknown = 'hello'

const label = match(input)
  .with(P.string, (value) => value.toUpperCase())
  .with(P.number, (value) => `number:${String(value)}`)
  .otherwise(() => 'unknown')

function loadNotification(): Notification {
  return { channel: 'sms', phone: '+15550001', urgent: true }
}

const notification = loadNotification()

const deliveryQueue = match(notification)
  .with({ channel: 'email' }, { channel: 'push' }, (message) => `async:${message.urgent ? 'high' : 'normal'}`)
  .with({ channel: 'sms' }, (message) => `sms:${message.phone}`)
  .exhaustive()

const checkoutInput: unknown = { totalCents: 4999, currency: 'USD' }

const checkoutLabel = match(checkoutInput)
  .with({ totalCents: P.number, currency: P.string }, (cart) => `checkout:${cart.currency}:${String(cart.totalCents)}`)
  .when(
    (value): value is readonly string[] => Array.isArray(value) && value.every((item) => typeof item === 'string'),
    (items) => `csv:${items.join(',')}`,
  )
  .otherwise(() => 'unsupported')

if (label !== 'HELLO') throw new Error(`Expected HELLO, got ${label}`)
if (deliveryQueue !== 'sms:+15550001') throw new Error(`Expected sms delivery, got ${deliveryQueue}`)
if (checkoutLabel !== 'checkout:USD:4999') throw new Error(`Expected checkout label, got ${checkoutLabel}`)
