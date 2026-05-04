# Comparing `ts-match`

This page helps developers decide when `ts-match` is a better fit than plain `switch` statements or broader pattern-matching libraries.

## Quick decision guide

Use **plain `switch` / `if`** when:

- the branch is simple;
- the input is open-ended;
- a direct condition is already the clearest possible code.

Use **`ts-match`** when:

- you want exhaustive handling for discriminated unions;
- you want narrowed branch-local payload types without manual casts;
- you want cleaner reducer/event-router code through `matchBy(value, 'type')`;
- you need structural object/tuple/array patterns that `switch` cannot express cleanly.

Use a **broader pattern-matching library** when:

- your main priority is maximum DSL breadth over focused discriminant-dispatch ergonomics;
- you prefer a different API style and it fits your team better.

## `switch` vs `ts-match`

### Plain `switch`

```ts
type CartAction =
  | { type: 'addItem'; sku: string; quantity: number }
  | { type: 'applyCoupon'; code: string; percentOff: number }
  | { type: 'clearCart'; reason: 'user' | 'timeout' }

function planCartOperation(action: CartAction) {
  switch (action.type) {
    case 'addItem':
      return { type: 'lineItemAdded', sku: action.sku, quantity: action.quantity }
    case 'applyCoupon':
      return {
        type: 'discountApplied',
        code: action.code,
        multiplier: 1 - action.percentOff / 100,
      }
    case 'clearCart':
      return { type: 'cartCleared', reason: action.reason }
    default: {
      const _never: never = action
      return _never
    }
  }
}
```

### `ts-match`

```ts
import { matchBy } from '@diegogbrisa/ts-match'

type CartAction =
  | { type: 'addItem'; sku: string; quantity: number }
  | { type: 'applyCoupon'; code: string; percentOff: number }
  | { type: 'clearCart'; reason: 'user' | 'timeout' }

function planCartOperation(action: CartAction) {
  return matchBy(action, 'type')
    .with('addItem', (action) => ({ type: 'lineItemAdded', sku: action.sku, quantity: action.quantity }))
    .with('applyCoupon', (action) => ({
      type: 'discountApplied',
      code: action.code,
      multiplier: 1 - action.percentOff / 100,
    }))
    .with('clearCart', (action) => ({ type: 'cartCleared', reason: action.reason }))
    .exhaustive()
}
```

## What `ts-match` is optimized for

`ts-match` is especially strong when your code naturally looks like:

- reducers;
- event handlers / routers;
- UI state transitions;
- API-result branching;
- discriminated-union domain modeling.

Its strongest ergonomic story is the `matchBy(value, 'type')` style: a common TypeScript branching pattern with exhaustive checking and narrowed handler parameters.

## Where `ts-match` goes beyond `switch`

- **Exhaustive matching for closed unions** without hand-written `assertNever` helpers.
- **Branch-local narrowing** that stays close to the handler.
- **Structural matching** for objects, tuples, arrays, and records.
- **Reusable runtime patterns** via `P` helpers.
- **Promise-aware matching** through `match.promise(...)` and `matchBy.promise(...)`.

## Where plain `switch` is still better

Prefer `switch` or `if` when:

- a direct condition is simpler than a matching DSL;
- you only branch on one scalar value and there is no real type-safety pain;
- the code is so small that another abstraction adds noise.

`ts-match` is not trying to replace every conditional. It is designed for the cases where normal branching becomes repetitive, fragile, or noisy.

## Compared with broader matching libraries

Instead of claiming to beat every alternative at everything, `ts-match` is intentionally strongest in a narrower set of developer needs:

- **TypeScript-first discriminant dispatch** through `matchBy(...)`
- **exhaustive application-style branching**
- **structural matching when needed, not as the only story**
- **honest tradeoff positioning**: simple code should stay simple

If another library fits your team's taste better, use it. `ts-match` is for developers who want a focused, ergonomic way to write exhaustive TypeScript branching without overcomplicating normal conditions.
