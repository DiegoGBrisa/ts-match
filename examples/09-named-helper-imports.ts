import { match, pNonEmptyArray, pNumber, pOptional, pSelect, pString, pUnion } from '@diegogbrisa/ts-match'

const product = {
  type: 'book',
  title: 'Designing Data-Intensive Applications',
  rating: 5,
  tags: ['systems', 'databases'],
}

export const productCard = match(product)
  .with(
    {
      type: pUnion('book', 'course'),
      title: pSelect('title', pString),
      rating: pSelect('rating', pNumber),
      tags: pOptional(pNonEmptyArray(pString)),
    },
    ({ rating, title }) => ({ title, rating }),
  )
  .otherwise(() => ({ title: 'Untitled', rating: 0 }))
