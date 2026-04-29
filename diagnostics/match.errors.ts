import { match, P } from '../src/index.js'

type Action =
  | { readonly type: 'start'; readonly payload: string }
  | { readonly type: 'stop'; readonly code: number }
  | { readonly type: 'reset' }

declare const action: Action

// Intended diagnostic: ts-match says the match is not exhaustive and reports remaining cases.
match(action)
  .with({ type: 'start' }, (value) => value.payload)
  .exhaustive()

// Intended diagnostic: ts-match says this pattern cannot match the current input type.
match(action)
  .with({ type: 'missing' }, () => 'missing')
  .otherwise(() => 'fallback')

// Intended diagnostic: ts-match says P.rest must be the final tuple pattern item.
match(['cmd', 1] as const)
  .with([P.rest(P.string), P.number], () => 'bad-rest')
  .otherwise(() => 'fallback')

// Intended diagnostic: ts-match says P.select cannot be placed inside repeated containers.
match({ readonlyItems: ['a'] })
  .with({ readonlyItems: P.array(P.select('item')) }, ({ item }) => item)
  .otherwise(() => 'fallback')

// Intended diagnostic: ts-match says match.async is not exhaustive.
match
  .async(action)
  .with({ type: 'start' }, (value) => value.payload)
  .exhaustive()

// Intended diagnostic: TypeScript says predicates must return boolean or a type predicate.
match(action).when(
  (value) => value.type.length,
  () => 'bad-predicate',
)
