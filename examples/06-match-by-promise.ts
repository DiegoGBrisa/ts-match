import { matchBy } from '@diegogbrisa/ts-match'

const ORDER_TOTAL = 49

type Order =
  | { readonly state: 'pending'; readonly id: string; readonly total: number }
  | { readonly state: 'paid'; readonly id: string; readonly total: number; readonly receiptUrl: string }
  | { readonly state: 'shipped'; readonly id: string; readonly trackingNumber: string }
  | { readonly state: 'cancelled'; readonly id: string; readonly reason: string }

const orders: readonly Order[] = [
  { state: 'paid', id: 'order-1', total: ORDER_TOTAL, receiptUrl: '/receipts/order-1' },
  { state: 'shipped', id: 'order-2', trackingNumber: 'TRACK-2' },
]

const cancelledOrder: Order = { state: 'cancelled', id: 'order-3', reason: 'payment expired' }

async function fetchOrder(id: string) {
  return orders.find((order) => order.id === id) ?? cancelledOrder
}

export const orderView = await matchBy
  .promise(fetchOrder('order-1'), 'state')
  .with('pending', (order) => ({ screen: 'checkout', orderId: order.id, total: order.total }))
  .with('paid', (order) => ({ screen: 'receipt', orderId: order.id, receiptUrl: order.receiptUrl }))
  .with('shipped', (order) => ({ screen: 'tracking', orderId: order.id, trackingNumber: order.trackingNumber }))
  .with('cancelled', (order) => {
    throw new Error(`Order was cancelled: ${order.reason}`)
  })
  .exhaustive()
