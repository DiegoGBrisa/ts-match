import { matchBy } from '@diegogbrisa/ts-match'

type ConnectionEvent =
  | { readonly type: 'start'; readonly id: string }
  | { readonly type: 'resume'; readonly id: string }
  | { readonly type: 'stop'; readonly reason: string }

type CartAction =
  | {
      readonly type: 'addItem'
      readonly cartId: string
      readonly sku: string
      readonly quantity: number
      readonly subtotal: number
    }
  | {
      readonly type: 'updateQuantity'
      readonly cartId: string
      readonly sku: string
      readonly quantity: number
      readonly subtotal: number
    }
  | { readonly type: 'applyCoupon'; readonly cartId: string; readonly code: string; readonly subtotal: number }
  | { readonly type: 'checkout'; readonly cartId: string; readonly total: number }
  | { readonly type: 'noop' }

type CartResponse =
  | { readonly type: 'recalculate'; readonly cartId: string; readonly sku: string; readonly quantity: number }
  | { readonly type: 'reviewTotal'; readonly cartId: string; readonly total: number }
  | { readonly type: 'unchanged' }

type CartReview =
  | { readonly type: 'inventoryCheck'; readonly sku: string; readonly quantity: number }
  | { readonly type: 'pricePreview'; readonly cartId: string; readonly subtotal: number }
  | { readonly type: 'checkoutReview'; readonly cartId: string; readonly total: number }
  | { readonly type: 'noReview' }

function connectionLabel(event: ConnectionEvent): string {
  return matchBy(event, 'type')
    .with('start', 'resume', (value) => `active:${value.id}`)
    .with('stop', (value) => `stopped:${value.reason}`)
    .exhaustive()
}

function cartResponse(action: CartAction): CartResponse {
  return matchBy(action, 'type')
    .partial({
      addItem: (value) =>
        ({ type: 'recalculate', cartId: value.cartId, sku: value.sku, quantity: value.quantity }) as const,
    })
    .otherwise((remaining) =>
      remaining.type === 'checkout'
        ? { type: 'reviewTotal', cartId: remaining.cartId, total: remaining.total }
        : { type: 'unchanged' },
    )
}

function cartReview(action: CartAction): CartReview {
  return matchBy(action, 'type')
    .partial([
      ['addItem', (value) => ({ type: 'inventoryCheck', sku: value.sku, quantity: value.quantity }) as const],
      [
        ['updateQuantity', 'applyCoupon'] as const,
        (value) =>
          ({
            type: 'pricePreview',
            cartId: value.cartId,
            subtotal: value.subtotal,
          }) as const,
      ],
    ])
    .otherwise((remaining) =>
      remaining.type === 'checkout'
        ? { type: 'checkoutReview', cartId: remaining.cartId, total: remaining.total }
        : { type: 'noReview' },
    )
}

if (connectionLabel({ type: 'resume', id: 'socket-1' }) !== 'active:socket-1') throw new Error('matchBy.with failed')
if (cartResponse({ type: 'checkout', cartId: 'cart-1', total: 42 }).type !== 'reviewTotal') {
  throw new Error('matchBy.partial failed')
}
if (cartReview({ type: 'applyCoupon', cartId: 'cart-1', code: 'SPRING', subtotal: 34 }).type !== 'pricePreview') {
  throw new Error('matchBy tuple partial failed')
}
