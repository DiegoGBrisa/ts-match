import { match, P } from '@diegogbrisa/ts-match'

const pageUrl = new URL('https://shop.example/products?view=grid&coupon=SPRING')
const view = pageUrl.searchParams.get('view')

export const layout = match(view)
  .with('grid', () => ({ columns: 3 }))
  .with('list', () => ({ columns: 1 }))
  .with(P.null, () => ({ columns: 2 }))
  .otherwise(() => ({ columns: 2 }))

const cart = {
  items: ['sku-1', 'sku-2'],
  coupon: pageUrl.searchParams.get('coupon'),
}

export const banner = match(cart)
  .with({ coupon: P.string }, (value) => `Coupon ${value.coupon} applied`)
  .otherwise(() => 'No coupon applied')
