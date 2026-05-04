import { matchBy } from '@diegogbrisa/ts-match'

type CartAction =
  | { readonly type: 'addItem'; readonly sku: string; readonly quantity: number }
  | { readonly type: 'applyCoupon'; readonly code: string; readonly percentOff: number }
  | { readonly type: 'clearCart'; readonly reason: 'user' | 'timeout' }

export function planCartOperation(action: CartAction) {
  return matchBy(action, 'type')
    .with('addItem', (value) => ({ type: 'lineItemAdded', sku: value.sku, quantity: value.quantity }))
    .with('applyCoupon', (value) => ({
      type: 'discountApplied',
      code: value.code,
      multiplier: 1 - value.percentOff / 100,
    }))
    .with('clearCart', (value) => ({ type: 'cartCleared', reason: value.reason }))
    .exhaustive()
}

export function auditCartAction(action: CartAction) {
  return matchBy(action, 'type').cases({
    addItem: (value) => ({ category: 'inventory', sku: value.sku, quantity: value.quantity }),
    applyCoupon: (value) => ({ category: 'pricing', code: value.code, percentOff: value.percentOff }),
    clearCart: (value) => ({ category: 'lifecycle', reason: value.reason }),
  })
}

export const operation = planCartOperation({ type: 'applyCoupon', code: 'SPRING', percentOff: 15 })
export const auditEvent = auditCartAction({ type: 'addItem', sku: 'sku-123', quantity: 2 })
