import { match, P } from '@diegogbrisa/ts-match'

const GRID_COLUMNS = 3
const FALLBACK_COLUMNS = 2

const pageUrl = new URL('https://shop.example/products?view=grid&coupon=SPRING')
const view = pageUrl.searchParams.get('view')

export const layout = match(view)
  .with('grid', () => ({ columns: GRID_COLUMNS }))
  .with('list', () => ({ columns: 1 }))
  .with(P.null, () => ({ columns: FALLBACK_COLUMNS }))
  .otherwise(() => ({ columns: FALLBACK_COLUMNS }))

const cart = {
  items: ['sku-1', 'sku-2'],
  coupon: pageUrl.searchParams.get('coupon'),
}

export const banner = match(cart)
  .with({ coupon: P.string }, (value) => `Coupon ${value.coupon} applied`)
  .otherwise(() => 'No coupon applied')
