import { matchBy } from '@diegogbrisa/ts-match'

type CartAction =
  | { readonly kind: 'addItem'; readonly sku: string; readonly quantity: number }
  | { readonly kind: 'applyCoupon'; readonly code: string; readonly percentOff: number }
  | { readonly kind: 'clearCart'; readonly reason: 'user' | 'timeout' }

type CartOperation =
  | { readonly type: 'lineItemAdded'; readonly sku: string; readonly quantity: number }
  | { readonly type: 'discountApplied'; readonly code: string; readonly multiplier: number }
  | { readonly type: 'cartCleared'; readonly reason: 'user' | 'timeout' }

type CartAuditEvent =
  | { readonly category: 'inventory'; readonly sku: string; readonly quantity: number }
  | { readonly category: 'pricing'; readonly code: string; readonly percentOff: number }
  | { readonly category: 'lifecycle'; readonly reason: 'user' | 'timeout' }

function planCartOperation(action: CartAction): CartOperation {
  return matchBy(action, 'kind')
    .with('addItem', (value) => ({ type: 'lineItemAdded', sku: value.sku, quantity: value.quantity }))
    .with('applyCoupon', (value) => ({
      type: 'discountApplied',
      code: value.code,
      multiplier: 1 - value.percentOff / 100,
    }))
    .with('clearCart', (value) => ({ type: 'cartCleared', reason: value.reason }))
    .exhaustive()
}

function auditCartAction(action: CartAction): CartAuditEvent {
  return matchBy(action, 'kind').cases({
    addItem: (value) => ({ category: 'inventory', sku: value.sku, quantity: value.quantity }) as const,
    applyCoupon: (value) => ({ category: 'pricing', code: value.code, percentOff: value.percentOff }) as const,
    clearCart: (value) => ({ category: 'lifecycle', reason: value.reason }) as const,
  })
}

const operation = planCartOperation({ kind: 'applyCoupon', code: 'SPRING', percentOff: 15 })
const audit = auditCartAction({ kind: 'addItem', sku: 'sku-123', quantity: 2 })

if (operation.type !== 'discountApplied' || operation.multiplier !== 0.85) {
  throw new Error(`Unexpected cart operation: ${JSON.stringify(operation)}`)
}
if (audit.category !== 'inventory' || audit.sku !== 'sku-123') {
  throw new Error(`Unexpected audit event: ${JSON.stringify(audit)}`)
}
