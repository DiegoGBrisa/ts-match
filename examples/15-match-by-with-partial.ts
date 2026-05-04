import { matchBy } from '@diegogbrisa/ts-match'

type CartAction =
  | { readonly type: 'addItem'; readonly cartId: string; readonly sku: string; readonly quantity: number }
  | { readonly type: 'updateQuantity'; readonly cartId: string; readonly sku: string; readonly quantity: number }
  | { readonly type: 'applyCoupon'; readonly cartId: string; readonly code: string }
  | { readonly type: 'checkout'; readonly cartId: string; readonly total: number }
  | { readonly type: 'noop' }

export function cartResponse(action: CartAction) {
  return matchBy(action, 'type')
    .partial({
      checkout: (value) => ({ screen: 'payment', cartId: value.cartId, total: value.total }),
    })
    .otherwise(() => ({ screen: 'cart' }))
}

export function cartReview(action: CartAction) {
  return matchBy(action, 'type')
    .partial((group) => [
      group('addItem', 'updateQuantity', (value) => ({
        type: 'inventoryCheck',
        sku: value.sku,
        quantity: value.quantity,
      })),
      group('applyCoupon', (value) => ({ type: 'discountPreview', cartId: value.cartId, code: value.code })),
    ])
    .otherwise(() => ({ type: 'noReview' }))
}
