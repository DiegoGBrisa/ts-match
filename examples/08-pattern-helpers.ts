import { isMatching, match, P } from '@diegogbrisa/ts-match'

const cart = {
  items: [
    { sku: 'sku-1', quantity: 2 },
    { sku: 'sku-2', quantity: 1 },
  ],
  coupon: 'SPRING',
}

const cartPattern = {
  items: P.nonEmptyArray({ sku: P.string, quantity: P.number }),
  coupon: P.optional(P.string),
}

export const canCheckout = isMatching(cartPattern, cart)

export const checkoutSummary = match(cart)
  .with(cartPattern, (value) => ({ itemCount: value.items.length, coupon: value.coupon }))
  .otherwise(() => ({ itemCount: 0, coupon: undefined }))

const packageScan = ['box', 20, 30, 40]

export const packageDimensions = match(packageScan)
  .with(P.tuple([P.string, P.rest(P.number)]), ([label, ...dimensions]) => ({ label, dimensions }))
  .otherwise(() => ({ label: 'unlabeled-package', dimensions: [] }))
