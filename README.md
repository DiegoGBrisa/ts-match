# ts-match

[![npm version](https://img.shields.io/npm/v/%40diegogbrisa%2Fts-match.svg)](https://www.npmjs.com/package/@diegogbrisa/ts-match)

**Exhaustive matching for TypeScript discriminated unions** — with ergonomic `matchBy(...)`, strong inference, structural patterns when you need them, and zero runtime dependencies.

## Installation

```bash
npm install @diegogbrisa/ts-match
pnpm add @diegogbrisa/ts-match
yarn add @diegogbrisa/ts-match
bun add @diegogbrisa/ts-match
```

`ts-match` is built for the kind of TypeScript branching that gets ugly fast:

- reducers and event routers
- UI state handling
- API result unions
- nested object/tuple matching when `switch` stops being enough

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

## Why developers reach for `ts-match`

- **Exhaustive discriminated-union handling** without hand-rolled `assertNever` helpers.
- **Narrowed handler parameters** without manual casts.
- **`matchBy(value, 'type')` ergonomics** for the most common TypeScript branching style.
- **Structural patterns** for objects, tuples, arrays, and records when plain `switch` is not expressive enough.
- **Promise-aware matching** through `match.promise` and `matchBy.promise`.
- **Runtime validation helpers** with `isMatching` and `assertMatching`.
- **Zero runtime dependencies** and a small surface for production use.

## Why not just use `switch`?

`switch` is still great for simple branching. `ts-match` becomes useful when your code also needs:

- exhaustiveness over closed unions;
- narrowed branch-local payload types;
- nested object or tuple matching;
- reusable runtime pattern helpers;
- cleaner reducer / event-dispatch ergonomics.

If a normal `if` or `switch` is already the clearest tool, use it. The point of `ts-match` is to make the harder branching cases cleaner, not to replace every conditional.

## Before / after

### Plain `switch`

```ts
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

## When to use it

Reach for `ts-match` when you want:

- a clean exhaustive reducer or event router;
- safer handling of discriminated unions;
- structural matching beyond one-key dispatch;
- typed runtime validation helpers in the same toolkit.

You may not need it when your branch is already trivial and a normal condition reads better.

## Quick reasons to evaluate it over alternatives

- Strong focus on **TypeScript-first discriminant dispatch** via `matchBy(...)`.
- Includes both **ergonomic application-style branching** and **deeper structural matching**.
- Designed to stay honest about tradeoffs: simple branches should stay simple.

## Documentation

- [Quick start](#quick-start)
- [Why pattern matching?](#why-use-pattern-matching-instead-of-manual-branching)
- [Core concepts](#core-concepts)
- [Imports and entrypoints](#imports-and-package-entrypoints)
- API
  - [`match`](#match)
  - [`match.promise`](#matchpromise)
  - [`matchBy`](#matchby)
  - [`matchBy.promise`](#matchbypromise)
  - [`group`](#group)
  - [`P` patterns](#pattern-guide-p-namespace)
  - [Named `p*` helpers](#named-p-helper-exports)
  - [`isMatching`](#ismatching)
  - [`assertMatching`](#assertmatching)
  - [Errors](#error-classes)
- TypeScript
  - [Inference guide](#typescript-inference-guide)
  - [Diagnostics and troubleshooting](#typescript-diagnostics-and-troubleshooting)
- [Performance guide](#performance-guide)
- [Limitations and tradeoffs](#limitations-and-tradeoffs)
- [Examples index](#full-examples-index)
- [API summary](#api-reference-summary)
- [Acknowledgements](#acknowledgements)
- [Agent skill](SKILL.md)

## Quick start

Use `matchBy(value, path)` for discriminated unions when one key decides the branch and handlers still need the full narrowed value.

```ts
import { matchBy } from '@diegogbrisa/ts-match'

type State =
  | { status: 'idle'; rows: readonly string[] }
  | { status: 'loading'; rows: readonly string[] }
  | { status: 'ready'; rows: readonly string[] }
  | { status: 'failed'; message: string }

type Action =
  | { type: 'start-loading' }
  | { type: 'load-success'; rows: readonly string[] }
  | { type: 'load-failure'; message: string }
  | { type: 'clear' }

function reduce(state: State, action: Action) {
  const rows = 'rows' in state ? state.rows : []

  return matchBy(action, 'type')
    .with('start-loading', () => ({ status: 'loading', rows }))
    .with('load-success', (action) => ({ status: 'ready', rows: action.rows }))
    .with('load-failure', (action) => ({ status: 'failed', message: action.message }))
    .with('clear', () => ({ status: 'idle', rows: [] }))
    .exhaustive()
}

const next = reduce({ status: 'idle', rows: [] }, { type: 'load-success', rows: ['Ada', 'Grace'] })
```

Checked example: [`examples/02-exhaustive-discriminated-union.ts`](examples/02-exhaustive-discriminated-union.ts) — exhaustive reducer branching for a TypeScript discriminated union.

## Why use pattern matching instead of manual branching?

Manual `if`/`else` or `switch` branches work, but domain logic often needs more than a single equality check:

- exhaustive handling for closed unions;
- narrowed handler parameters without manual casts;
- nested object, tuple, array, and record patterns;
- selected values passed directly to handlers;
- reusable runtime validators through `isMatching` and `assertMatching`;
- promise-aware matching with `match.promise` and `matchBy.promise`.

Use this library where those constraints make code clearer. Keep simple branches simple when a normal condition is already the clearest tool.

## Core concepts

- **Value** — the input passed to `match(value)` or `matchBy(value, path)`.
- **Pattern** — a literal, object pattern, tuple pattern, or `P` helper that decides whether a branch matches.
- **Handler** — the function called for the first matching branch. Its parameter is narrowed from the matched pattern.
- **Exhaustiveness** — `.exhaustive()` is callable only when TypeScript can prove no variants remain. At runtime it throws `NonExhaustiveMatchError` if unexpected data reaches it.
- **Fallback** — `.otherwise(handler)` handles the remaining value instead of requiring exhaustiveness.
- **Sync vs promise** — `match(...)` and `matchBy(...)` are synchronous. Use `match.promise(...)` and `matchBy.promise(...)` when the source may be promise-backed or when the terminal result should be a promise. Promise builders resolve the input internally and handlers receive the resolved value.
- **`P` vs `p*` helpers** — `P.string` and `pString` are the same pattern helper exposed in namespace and named-import form.

## Imports and package entrypoints

Install and import from the published package name, `@diegogbrisa/ts-match`. Root imports cover normal usage:

```ts
import { assertMatching, group, isMatching, match, matchBy, P } from '@diegogbrisa/ts-match'
```

Focused subpath imports are available:

```ts
import { match } from '@diegogbrisa/ts-match/match'
import { matchBy } from '@diegogbrisa/ts-match/match-by'
import { P, pString } from '@diegogbrisa/ts-match/patterns'
import { isMatching } from '@diegogbrisa/ts-match/assertions'
import { NonExhaustiveMatchError } from '@diegogbrisa/ts-match/errors'
import { group } from '@diegogbrisa/ts-match/group'
```

There is no default export.

## `match`

`match(value)` checks patterns in order. The first matching branch wins.

```ts
import { match, P } from '@diegogbrisa/ts-match'

const pageUrl = new URL('https://shop.example/products?view=grid&coupon=SPRING')
const view = pageUrl.searchParams.get('view')

const layout = match(view)
  .with('grid', () => ({ columns: 3 }))
  .with('list', () => ({ columns: 1 }))
  .with(P.null, () => ({ columns: 2 }))
  .otherwise(() => ({ columns: 2 }))
```

Checked example: [`examples/01-basic-match.ts`](examples/01-basic-match.ts) — basic TypeScript pattern matching.

### `.with(pattern, handler)`

Use one pattern per branch for most code:

```ts
const result = match(response)
  .with({ ok: true }, (value) => value.body)
  .with({ ok: false }, (value) => value.message)
  .exhaustive()
```

Handlers receive the matched/narrowed value unless the pattern contains selections. Multiple patterns can share one handler:

```ts
const status = match(state)
  .with('idle', 'loading', () => 'pending')
  .with('success', () => 'done')
  .exhaustive()
```

### `.when(predicate, handler)`

Use `.when(...)` for value-level predicates:

```ts
function discountLabel(percent: number) {
  return match(percent)
    .when(
      (value) => value > 0,
      (value) => `${String(value)}% off`,
    )
    .otherwise(() => 'No discount')
}
```

`P.when(predicate)` is the pattern-helper form and can be nested inside object/tuple patterns.

### `.otherwise(handler)`

Use `.otherwise(...)` when the input is open-ended or a fallback is intended. The handler receives the remaining value type.

### `.exhaustive()`

Use `.exhaustive()` for closed unions. It returns the union of branch return types. TypeScript rejects it while variants remain unhandled.

Runtime error: `NonExhaustiveMatchError` if unexpected data reaches the terminal at runtime.

### Rendering UI from typed data

A match expression returns whatever its handler returns, so JSX can be the result of a branch. This is useful for UI states where the data shape decides what should be rendered:

```tsx
import { match, P } from '@diegogbrisa/ts-match'

type ProductContent = { type: 'text'; body: string } | { type: 'image'; src: string; alt: string }

type ProductResult =
  | { status: 'loading' }
  | { status: 'success'; product: { title: string; content: ProductContent } }
  | { status: 'error'; error: Error }

function ProductPreview({ result }: { result: ProductResult }) {
  return match(result)
    .with({ status: 'loading' }, () => <p>Loading product…</p>)
    .with({ status: 'error' }, ({ error }) => <p role="alert">{error.message}</p>)
    .with({ status: 'success', product: { content: { type: 'text' } } }, ({ product }) => (
      <article>
        <h2>{product.title}</h2>
        <p>{product.content.body}</p>
      </article>
    ))
    .with(
      { status: 'success', product: { content: { type: 'image', src: P.select('src'), alt: P.select('alt') } } },
      ({ src, alt }) => <img src={src} alt={alt} />,
    )
    .exhaustive()
}
```

`ts-match` is framework-agnostic; React is just a familiar way to show that handlers can return UI, objects, strings, promises, or whatever type your branch needs.

## `match.promise`

`match.promise(valueOrPromise)` has the same branch API as `match(value)`, but it resolves the input internally and terminal methods return promises:

```ts
type ProfileResponse =
  | { ok: true; profile: { id: string; name: string } }
  | { ok: false; status: number; message: string }

const profileResponse: ProfileResponse = { ok: true, profile: { id: 'user-1', name: 'Ada' } }
const missingProfile: ProfileResponse = { ok: false, status: 404, message: 'missing' }
const responses: readonly ProfileResponse[] = [profileResponse, missingProfile]
const profilePromise = Promise.resolve(responses[0] ?? missingProfile)

const profileName = await match
  .promise(profilePromise)
  .with({ ok: true, profile: { name: P.select('name', P.string) } }, ({ name }) => name)
  .with({ ok: false }, ({ status, message }) => `Request failed (${String(status)}): ${message}`)
  .exhaustive()
```

Checked example: [`examples/03-match-promise.ts`](examples/03-match-promise.ts).

Behavior:

- accepts values, promises, thenables, and `PromiseLike` inputs;
- handlers receive `Awaited<TInput>`, not the promise wrapper;
- handler values and promise-like values are awaited by the terminal promise;
- synchronous handler throws, predicate throws, pattern errors, and input rejections become promise rejections for normal terminals;
- `.otherwise(...)` is a pattern fallback, not an input-error fallback;
- `.otherwise(...)` and `.exhaustive()` return `Promise<...>`.

Promise builders also expose safe terminals:

```ts
const missingProfile: ProfileResponse = { ok: false, status: 404, message: 'missing' }
const missingResponses: readonly ProfileResponse[] = [missingProfile]
const missingProfilePromise = Promise.resolve(missingResponses[0] ?? missingProfile)

const result = await match
  .promise(missingProfilePromise)
  .with({ ok: true, profile: { name: P.select('name', P.string) } }, ({ name }) => name)
  .safeOtherwise(() => 'Guest')

if (result.ok) {
  result.value
} else {
  result.error
}
```

- `.safeExhaustive()` preserves the same compile-time exhaustiveness check as `.exhaustive()`.
- `.safeOtherwise(handler)` requires a fallback handler.
- Safe terminals resolve to `{ ok: true, value } | { ok: false, error }` and catch input, pattern, predicate, handler, fallback, and defensive non-exhaustive failures.

Use `safeExhaustive()` when all variants should be handled but operational failures should be values:

```ts
const result = await match
  .promise(profilePromise)
  .with({ ok: true }, ({ profile }) => profile.name)
  .with({ ok: false }, ({ message }) => message)
  .safeExhaustive()
```

Use sync `match(promise)` only if you intentionally want to pattern-match the `Promise` object itself.

## `matchBy`

`matchBy(value, path)` is specialized for discriminant dispatch. It reads a path, matches tags, and passes the full narrowed value to handlers.

### Direct key

```ts
function planCartOperation(action: CartAction) {
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
```

Checked example: [`examples/04-match-by-direct-key.ts`](examples/04-match-by-direct-key.ts).

### Nested dot path and tuple path

Dot paths read nested string-key properties and autocomplete finite tag-like paths from the input value type. Tuple paths provide segment-by-segment autocomplete and are useful for symbols and exact path segments.

```ts
const EVENT_KIND = Symbol('event-kind')

type UiEvent = { meta: { type: 'click'; x: number; y: number } } | { meta: { type: 'submit'; form: string } }

type SourceEvent = { meta: { [EVENT_KIND]: 'user'; name: string } } | { meta: { [EVENT_KIND]: 'system'; code: number } }

function routeEvent(event: UiEvent) {
  return matchBy(event, 'meta.type')
    .with('click', (value) => ({ kind: 'pointer', x: value.meta.x, y: value.meta.y }))
    .with('submit', (value) => ({ kind: 'form', form: value.meta.form }))
    .exhaustive()
}

function labelSource(event: SourceEvent) {
  return matchBy(event, ['meta', EVENT_KIND])
    .with('user', (value) => `User: ${value.meta.name}`)
    .with('system', (value) => `System: ${String(value.meta.code)}`)
    .exhaustive()
}
```

Checked example: [`examples/05-match-by-nested-path.ts`](examples/05-match-by-nested-path.ts).

Autocomplete intentionally suggests finite tag-like paths, such as literal string/number/boolean unions. Broad payload leaves such as `number` coordinates or arbitrary `string` labels can still be typed manually when you want fallback-based matching, but they are not suggested as primary discriminant paths.

Dot-path limitation: a dot string always means nesting. Use tuple paths for literal keys that contain dots.

### `.cases(...)`

`.cases(...)` is an exhaustive terminal for `matchBy`. It supports three input shapes.

Quick choice guide:

- Use chained `.with(...).exhaustive()` as the default for application code. It has the clearest control flow, strong local inference, and no inline case-map allocation.
- Use inline `.cases({...})` when a compact object-map style reads best and the code is not in a hot loop.
- Use hoisted `.cases(caseMap)` for hot discriminant-dispatch paths where throughput matters more than annotation-free handler inference.
- Use callback grouped cases when several tags share a handler and you want the best local inference.
- Use tuple/grouped entry arrays for generated cases, non-object-key tags, `null`/`undefined`, or normalized key collisions such as `1` and `'1'`.

#### Object case maps

Object-map cases are exhaustive and exact for finite discriminants representable as object keys. They support string, number, symbol, and boolean tags when the normalized object keys do not collide.

```ts
function auditCartAction(action: CartAction) {
  return matchBy(action, 'type').cases({
    addItem: (value) => ({ category: 'inventory', sku: value.sku, quantity: value.quantity }),
    applyCoupon: (value) => ({ category: 'pricing', code: value.code, percentOff: value.percentOff }),
    clearCart: (value) => ({ category: 'lifecycle', reason: value.reason }),
  })
}
```

Use object-map cases when you want compact map-style DX in ordinary non-hot code. Avoid recreating inline case maps inside tight loops: fresh maps allocate handlers/maps and go through validation each time. In local benchmark runs, hoisted object maps are roughly 15x faster than inline object maps for discriminant dispatch, and about 4x faster than chained `.with(...).exhaustive()` dispatch. The exact ratio depends on runtime and workload, but the direction is consistent: hoist maps in hot paths, keep inline maps for ordinary readability.

```ts
// Inline: concise, but recreates the map and handlers on every call.
function auditCartAction(action: CartAction) {
  return matchBy(action, 'type').cases({
    addItem: (value) => value.sku,
    applyCoupon: (value) => value.code,
    clearCart: (value) => value.reason,
  })
}

// Hoisted: fastest measured discriminant-dispatch shape, but handlers may need annotations.
const cartAuditCases = {
  addItem: (value: Extract<CartAction, { type: 'addItem' }>) => value.sku,
  applyCoupon: (value: Extract<CartAction, { type: 'applyCoupon' }>) => value.code,
  clearCart: (value: Extract<CartAction, { type: 'clearCart' }>) => value.reason,
}

function auditCartActionHot(action: CartAction) {
  return matchBy(action, 'type').cases(cartAuditCases)
}
```

The benchmark suite currently shows hoisted object maps as the fastest measured `ts-match` discriminant-dispatch shape, but hoisting removes contextual handler inference and can require manual handler parameter types. For JavaScript-feeling TypeScript, prefer `.with(...).exhaustive()` unless you deliberately choose that tradeoff.

Use grouped/callback cases for `null`, `undefined`, or collisions such as `1` and `'1'`. Avoid bare `__proto__:` object-literal syntax because JavaScript treats it specially; use computed `['__proto__']`, tuple entries, or grouped cases when that tag matters.

#### Callback grouped cases

Callback grouped cases preserve local handler inference and support every discriminant value including `null` and `undefined`. Use them with exhaustive `.cases(...)` or non-exhaustive `.partial(...).otherwise(...)`:

```ts
type SessionEvent =
  | { type: 'start'; at: number }
  | { type: 'resume'; at: number }
  | { type: 'stop'; reason: string }
  | { type: 'error'; message: string }

function sessionStatus(event: SessionEvent) {
  return matchBy(event, 'type').cases((group) => [
    group('start', 'resume', (value) => ({ status: 'active', at: value.at })),
    group('stop', (value) => ({ status: 'stopped', reason: value.reason })),
    group('error', (value) => ({ status: 'failed', message: value.message })),
  ])
}
```

Use this form when multiple tags share one handler and you want annotation-free narrowed parameters. Use variadic tags (`group('a', 'b', handler)`) while writing inline groups because that shape gives the best tag autocomplete. Array tags (`group(['a', 'b'], handler)`) are also supported without `as const` and can read better when the tags belong together, but editors may not suggest tag literals inside that nested array. The same callback-local `group` helper is available in `.partial((group) => [...])` when the remaining tags should fall through to `.otherwise(...)`.

#### Tuple and grouped entry arrays

Entry arrays are exhaustive and useful when cases are generated, reordered, or easier to express as tuples:

```ts
type State =
  | { kind: 'ready'; data: string }
  | { kind: 'failed'; reason: string }
  | { kind: null }
  | { kind?: undefined }

declare const state: State

const label = matchBy(state, 'kind').cases([
  ['ready', (value) => value.data],
  [[null, undefined], () => 'empty'],
  ['failed', (value) => value.reason],
])
```

Valid entry shapes are:

- `[tag, handler]` for one tag;
- `[[tag1, tag2], handler]` for a static group;
- `group(tag, handler)`, `group(tag1, tag2, ...moreTags, handler)`, or `group(tags, handler)` for reusable grouped entries.

Inline tuple-entry arrays contextually infer handlers from their sibling tags. Partial grouped arrays preserve tag autocomplete while editing grouped tags. Exhaustive grouped `.cases([...])` keeps missing-case diagnostics active while the list is incomplete, so callback `.cases((group) => [group('a', 'b', handler)])` is the best autocomplete shape for grouped exhaustive cases. Broad runtime arrays are accepted at runtime but cannot prove exhaustive coverage because TypeScript cannot know which tags they contain. Exported `group(...)` entries are useful for reusable structures but can need explicit handler parameter annotations; use callback `.cases((group) => [...])` or `.partial((group) => [...])` when you want grouped entries with the strongest annotation-free handler inference.

### `.with(...tags, handler)`

Use `.with` to chain tag groups before a final `.exhaustive()` or `.otherwise(...)`:

```ts
type ConnectionEvent = { type: 'start'; id: string } | { type: 'resume'; id: string } | { type: 'stop'; reason: string }

function connectionLabel(event: ConnectionEvent) {
  return matchBy(event, 'type')
    .with('start', 'resume', (value) => `active:${value.id}`)
    .with('stop', (value) => `stopped:${value.reason}`)
    .exhaustive()
}
```

Checked example: [`examples/15-match-by-with-partial.ts`](examples/15-match-by-with-partial.ts).

### `.partial(...).otherwise(...)`

Use `.partial(...)` when only some tags need special handling and the rest should go to `.otherwise(...)`. It accepts the same object-map and tuple/grouped entry shapes as `.cases(...)`, but it is intentionally non-exhaustive.

Object-map partial:

```ts
type CartAction =
  | { type: 'addItem'; cartId: string; sku: string; quantity: number }
  | { type: 'updateQuantity'; cartId: string; sku: string; quantity: number }
  | { type: 'applyCoupon'; cartId: string; code: string }
  | { type: 'checkout'; cartId: string; total: number }
  | { type: 'noop' }

function cartResponse(action: CartAction) {
  return matchBy(action, 'type')
    .partial({
      checkout: (value) => ({ screen: 'payment', cartId: value.cartId, total: value.total }),
    })
    .otherwise(() => ({ screen: 'cart' }))
}
```

Tuple/grouped-entry partial:

```ts
function cartReview(action: CartAction) {
  return matchBy(action, 'type')
    .partial([
      [
        ['addItem', 'updateQuantity'],
        (value) => ({ type: 'inventoryCheck', sku: value.sku, quantity: value.quantity }),
      ],
      ['applyCoupon', (value) => ({ type: 'discountPreview', cartId: value.cartId, code: value.code })],
    ])
    .otherwise(() => ({ type: 'noReview' }))
}
```

Callback grouped partials are also supported when shared handlers read better with a local `group` helper:

```ts
function cartReviewWithGroups(action: CartAction) {
  return matchBy(action, 'type')
    .partial((group) => [
      group('addItem', 'updateQuantity', (value) => ({
        type: 'inventoryCheck',
        sku: value.sku,
        quantity: value.quantity,
      })),
    ])
    .otherwise(() => ({ type: 'noReview' }))
}
```

Checked example: [`examples/15-match-by-with-partial.ts`](examples/15-match-by-with-partial.ts).

### Runtime behavior

If no `matchBy` case matches, `cases(...)` and `.exhaustive()` throw `NonExhaustiveMatchError` with `matcher`, `path`, `tag`, and `valuePreview` metadata where available. If a path segment is missing, the selected tag is `undefined`; handle it with tuple or grouped entries when that is a valid runtime state.

## `matchBy.promise`

`matchBy.promise(valueOrPromise, path)` resolves the input internally, then performs the same path/tag dispatch as `matchBy(value, path)`. Pass the promise directly; handlers receive the resolved value.

```ts
type Order =
  | { state: 'pending'; id: string; total: number }
  | { state: 'paid'; id: string; total: number; receiptUrl: string }
  | { state: 'shipped'; id: string; trackingNumber: string }
  | { state: 'cancelled'; id: string; reason: string }

const orders: readonly Order[] = [
  { state: 'paid', id: 'order-1', total: 49, receiptUrl: '/receipts/order-1' },
  { state: 'shipped', id: 'order-2', trackingNumber: 'TRACK-2' },
]
const fallbackOrder: Order = { state: 'cancelled', id: 'missing', reason: 'not found' }

async function fetchOrder(id: string) {
  return orders.find((order) => order.id === id) ?? fallbackOrder
}

const orderView = await matchBy
  .promise(fetchOrder('order-1'), 'state')
  .with('pending', (order) => ({ screen: 'checkout', orderId: order.id, total: order.total }))
  .with('paid', (order) => ({ screen: 'receipt', orderId: order.id, receiptUrl: order.receiptUrl }))
  .with('shipped', (order) => ({ screen: 'tracking', orderId: order.id, trackingNumber: order.trackingNumber }))
  .with('cancelled', (order) => {
    throw new Error(`Order was cancelled: ${order.reason}`)
  })
  .exhaustive()
```

Checked example: [`examples/06-match-by-promise.ts`](examples/06-match-by-promise.ts).

Path, tag, object-map, partial-map, and grouped-case inference all use the resolved input type (`Awaited<TInput>`). That means this keeps the same autocomplete as sync `matchBy(...)` even when the source is a `Promise<Event>` or `Event | PromiseLike<Event>`.

Normal terminals return promises and reject normally for input rejections, path-read errors, handler throws/rejections, fallback throws/rejections, and defensive non-exhaustive failures. `.otherwise(...)` remains only a pattern fallback; it does not catch input promise failures.

Safe terminals mirror `match.promise` and are useful when operational failures should be values:

```ts
const result = await matchBy
  .promise(fetchOrder('order-1'), 'state')
  .with('cancelled', (order) => ({ screen: 'cancelled', reason: order.reason }))
  .safeOtherwise((order) => ({ screen: 'order', orderId: order.id }))
```

- all synchronous `matchBy` case shapes are available on promise builders;
- `.safeExhaustive()` keeps exhaustive tag checking;
- `.safeOtherwise(handler)` requires a fallback handler;
- safe terminals resolve to `{ ok: true, value } | { ok: false, error }`.

## `group`

Grouped cases let several tags share one handler. Prefer the callback form when handlers need inferred narrowed values:

```ts
const status = matchBy(event, 'type').cases((group) => [
  group('start', 'resume', (value) => `active:${value.at}`),
  group('stop', (value) => `stopped:${value.reason}`),
  group('error', (value) => `error:${value.message}`),
])
```

Checked example: [`examples/07-grouped-cases.ts`](examples/07-grouped-cases.ts).

Both inline grouped forms are valid:

```ts
group(['start', 'resume'], handler)
group('start', 'resume', handler)
```

Use the array form when it reads better or when tags are already grouped together. Use the variadic form when the tag list is short and reads naturally inline.

For exhaustiveness, array-form tags must be statically known. Inline literal arrays count as handled tags; broad runtime arrays such as `readonly ('start' | 'resume')[]` do not prove coverage because TypeScript cannot know which tags are actually present at runtime.

Single-tag groups do not need a second tag:

```ts
group('stop', (value) => `stopped:${value.reason}`)
```

Variadic groups can contain two or more tags; the handler is always the final argument:

```ts
group('start', 'resume', 'retry', (value) => `active:${value.at}`)
```

The exported `group(...)` helper is useful for reusable prebuilt groups, especially when the handler does not need the narrowed value:

```ts
import { group } from '@diegogbrisa/ts-match'

const reusableStatusCases = [
  group(['start', 'resume'], () => 'active'),
  group('stop', () => 'inactive'),
  group('error', () => 'inactive'),
]
```

Limitation: standalone exported `group(...)` is created before `.cases(...)` has context, so TypeScript cannot always infer handler parameter types from the later `matchBy` call. Use `.cases((group) => [...])` for annotation-free handler inference.

## Pattern guide: `P` namespace

Import the namespace when readability is more important than individual helper imports:

```ts
import { P } from '@diegogbrisa/ts-match'
```

Checked example using common helpers: [`examples/08-pattern-helpers.ts`](examples/08-pattern-helpers.ts).

| Helper                                       | What it matches                                  | Notes                                                                                                |
| -------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `P._`                                        | anything                                         | Wildcard. Handler receives the original value.                                                       |
| `P.any`                                      | anything                                         | Alias of `P._`.                                                                                      |
| `P.string`                                   | strings                                          | Narrows to `string`.                                                                                 |
| `P.number`                                   | numbers                                          | Includes `NaN` and infinities; use numeric helpers for stricter checks.                              |
| `P.boolean`                                  | booleans                                         | Narrows to `boolean`.                                                                                |
| `P.bigint`                                   | bigints                                          | Narrows to `bigint`.                                                                                 |
| `P.symbol`                                   | symbols                                          | Narrows to `symbol`.                                                                                 |
| `P.null`                                     | `null`                                           | Literal null pattern helper.                                                                         |
| `P.undefined`                                | `undefined`                                      | Literal undefined pattern helper.                                                                    |
| `P.nan`                                      | `NaN`                                            | Uses `Number.isNaN`.                                                                                 |
| `P.finite`                                   | finite numbers                                   | Uses `Number.isFinite`.                                                                              |
| `P.integer`                                  | integers                                         | Uses `Number.isInteger`.                                                                             |
| `P.regex(regex)`                             | strings accepted by `regex`                      | Requires a `RegExp`; starts at `lastIndex = 0` and restores the original `lastIndex`.                |
| `P.date`                                     | valid `Date` instances                           | Rejects `Invalid Date`; use `P.instanceOf(Date)` for any `Date` instance.                            |
| `P.error`                                    | `Error` instances                                | Includes subclasses such as `TypeError` and custom errors.                                           |
| `P.regexp`                                   | `RegExp` instances                               | Matches regex objects; use `P.regex(regex)` to match strings.                                        |
| `P.nullish`                                  | `null` or `undefined`                            | Does not match missing object properties unless wrapped in `P.optional(...)`.                        |
| `P.falsy`                                    | JavaScript-falsy values                          | Matches values where `!value` is true, including `NaN`; broad primitive types narrow conservatively. |
| `P.truthy`                                   | JavaScript-truthy values                         | Matches values where `Boolean(value)` is true.                                                       |
| `P.temporal`                                 | any recognized Temporal value object             | Matches nothing when `globalThis.Temporal` is unavailable.                                           |
| `P.temporalInstant`                          | `Temporal.Instant` instances                     | Uses runtime constructor identity when Temporal is available.                                        |
| `P.temporalPlainDate`                        | `Temporal.PlainDate` instances                   | Uses runtime constructor identity when Temporal is available.                                        |
| `P.temporalPlainTime`                        | `Temporal.PlainTime` instances                   | Uses runtime constructor identity when Temporal is available.                                        |
| `P.temporalPlainDateTime`                    | `Temporal.PlainDateTime` instances               | Uses runtime constructor identity when Temporal is available.                                        |
| `P.temporalZonedDateTime`                    | `Temporal.ZonedDateTime` instances               | Uses runtime constructor identity when Temporal is available.                                        |
| `P.temporalDuration`                         | `Temporal.Duration` instances                    | Uses runtime constructor identity when Temporal is available.                                        |
| `P.temporalPlainYearMonth`                   | `Temporal.PlainYearMonth` instances              | Uses runtime constructor identity when Temporal is available.                                        |
| `P.temporalPlainMonthDay`                    | `Temporal.PlainMonthDay` instances               | Uses runtime constructor identity when Temporal is available.                                        |
| `P.union(...patterns)`                       | any listed pattern                               | Requires at least one pattern. Commits selections from the successful branch only.                   |
| `P.exclude(pattern)`                         | values that do not match `pattern`               | Cannot contain `P.select(...)`.                                                                      |
| `P.optional(pattern)`                        | absent object field, `undefined`, or `pattern`   | Selections inside an absent optional capture `undefined`.                                            |
| `P.array(pattern)`                           | arrays where every item matches                  | Variable length. `P.select(...)` inside is rejected because captures may repeat.                     |
| `P.nonEmptyArray(pattern)`                   | non-empty arrays where every item matches        | Same selection limitation as `P.array`.                                                              |
| `P.tuple([...])`                             | exact tuple pattern                              | Readability helper for bare tuple arrays.                                                            |
| `P.rest(pattern)`                            | remaining tuple items                            | Valid only as the final tuple item.                                                                  |
| `P.exact(pattern)`                           | deep exact object pattern                        | Rejects enumerable own extra keys on values.                                                         |
| `P.when(predicate)`                          | predicate-matched values                         | Supports type guards. Can be nested.                                                                 |
| `P.instanceOf(Constructor)`                  | `instanceof Constructor`                         | Useful for errors/classes.                                                                           |
| `P.select()`                                 | anonymous selected value                         | Only one anonymous select is allowed per successful pattern.                                         |
| `P.select(name)`                             | named selected value                             | Handler receives an object with selected keys.                                                       |
| `P.select(name, pattern)`                    | named selected value that also matches `pattern` | Combines validation and selection.                                                                   |
| `P.record(keyPattern, valuePattern)`         | plain record-like objects                        | Rejects arrays, class instances, maps, sets, dates, regexps, and primitives. Empty records match.    |
| `P.nonEmptyRecord(keyPattern, valuePattern)` | non-empty plain record-like objects              | Same as `P.record`, but requires at least one enumerable own key.                                    |

### Literal patterns

Plain literals are patterns too:

```ts
const label = match(value)
  .with('ready', () => 'ready')
  .with(0, () => 'zero')
  .with(null, () => 'null')
  .otherwise(() => 'other')
```

Literal equality uses `Object.is`, so `NaN`, `-0`, and `0` behave like `Object.is`.

### Convenience helpers

`P.regex(regex)` matches strings only. It requires a `RegExp` instance, does not coerce non-string values, starts matching from `lastIndex = 0`, and restores the regex's original `lastIndex` after evaluation.

`P.date` matches valid `Date` instances only. `new Date('bad')` does not match `P.date`; use `P.instanceOf(Date)` when constructor-level matching should include invalid dates.

`P.error` matches `Error` instances including subclasses. `P.regexp` matches regular expression objects, while `P.regex(regex)` matches strings accepted by a regular expression.

`P.nullish` means exactly `null | undefined`. It does not match an absent object property unless the property pattern is wrapped with `P.optional(...)`. `P.falsy` and `P.truthy` follow JavaScript truthiness exactly at runtime.

Temporal helpers are dependency-free and do not polyfill Temporal. When `globalThis.Temporal` is unavailable, `P.temporal` and the specific Temporal helpers match nothing and do not throw. When Temporal constructors are available natively or through a caller-installed global polyfill, helpers use constructor identity such as `value instanceof globalThis.Temporal.PlainDate`; they do not accept duck-typed objects or spoofed `Symbol.toStringTag` values.

The public Temporal helper types do not require consumers to include TypeScript's `ESNext.Temporal` lib. They use package-local value interfaces so projects can import `@diegogbrisa/ts-match` before Temporal is available in every target TypeScript/runtime combination.

### Object patterns

Object patterns are partial by default:

```ts
const name = match(payload)
  .with({ type: 'user', profile: { name: P.select() } }, (name) => name)
  .otherwise(() => null)
```

Object semantics:

- pattern keys use `Reflect.ownKeys(...)`, including symbol keys;
- value reads use normal JavaScript property access, so getters can run or throw;
- inherited/prototype properties can match through normal lookup;
- use `P.exact(...)` to reject enumerable own extra keys.

### Tuple and array patterns

Bare arrays are exact tuple patterns. `P.array(...)` is variable-length.

```ts
const total = match(values)
  .with([], () => 0)
  .with([P.number, P.number], ([left, right]) => left + right)
  .with(P.tuple([P.number, P.rest(P.number)]), (all) => all.reduce((sum, value) => sum + value, 0))
  .otherwise(() => -1)
```

Checked tuple/rest example: [`examples/08-pattern-helpers.ts`](examples/08-pattern-helpers.ts).

## Named `p*` helper exports

Every `P` helper is also exported as a named helper. Named imports are useful when codebases prefer focused imports or bundlers can tree-shake individual symbols more visibly.

Checked example using named helper imports: [`examples/09-named-helper-imports.ts`](examples/09-named-helper-imports.ts).

| Named export                                | Equivalent                                   |
| ------------------------------------------- | -------------------------------------------- |
| `pWildcard`                                 | `P._`                                        |
| `pAny`                                      | `P.any`                                      |
| `pString`                                   | `P.string`                                   |
| `pNumber`                                   | `P.number`                                   |
| `pBoolean`                                  | `P.boolean`                                  |
| `pBigint`                                   | `P.bigint`                                   |
| `pSymbol`                                   | `P.symbol`                                   |
| `pNull`                                     | `P.null`                                     |
| `pUndefined`                                | `P.undefined`                                |
| `pNan`                                      | `P.nan`                                      |
| `pFinite`                                   | `P.finite`                                   |
| `pInteger`                                  | `P.integer`                                  |
| `pRegex(regex)`                             | `P.regex(regex)`                             |
| `pDate`                                     | `P.date`                                     |
| `pError`                                    | `P.error`                                    |
| `pRegexp`                                   | `P.regexp`                                   |
| `pNullish`                                  | `P.nullish`                                  |
| `pFalsy`                                    | `P.falsy`                                    |
| `pTruthy`                                   | `P.truthy`                                   |
| `pTemporal`                                 | `P.temporal`                                 |
| `pTemporalInstant`                          | `P.temporalInstant`                          |
| `pTemporalPlainDate`                        | `P.temporalPlainDate`                        |
| `pTemporalPlainTime`                        | `P.temporalPlainTime`                        |
| `pTemporalPlainDateTime`                    | `P.temporalPlainDateTime`                    |
| `pTemporalZonedDateTime`                    | `P.temporalZonedDateTime`                    |
| `pTemporalDuration`                         | `P.temporalDuration`                         |
| `pTemporalPlainYearMonth`                   | `P.temporalPlainYearMonth`                   |
| `pTemporalPlainMonthDay`                    | `P.temporalPlainMonthDay`                    |
| `pUnion(...)`                               | `P.union(...)`                               |
| `pExclude(pattern)`                         | `P.exclude(pattern)`                         |
| `pOptional(pattern)`                        | `P.optional(pattern)`                        |
| `pArray(pattern)`                           | `P.array(pattern)`                           |
| `pNonEmptyArray(pattern)`                   | `P.nonEmptyArray(pattern)`                   |
| `pTuple([...])`                             | `P.tuple([...])`                             |
| `pRest(pattern)`                            | `P.rest(pattern)`                            |
| `pExact(pattern)`                           | `P.exact(pattern)`                           |
| `pWhen(predicate)`                          | `P.when(predicate)`                          |
| `pInstanceOf(Constructor)`                  | `P.instanceOf(Constructor)`                  |
| `pSelect(...)`                              | `P.select(...)`                              |
| `pRecord(keyPattern, valuePattern)`         | `P.record(keyPattern, valuePattern)`         |
| `pNonEmptyRecord(keyPattern, valuePattern)` | `P.nonEmptyRecord(keyPattern, valuePattern)` |

## `isMatching`

`isMatching` checks a pattern and returns a type guard.

Two call forms are supported:

```ts
isMatching(pattern, value)
isMatching(pattern)(value)
```

Typical usage:

```ts
const isUser = isMatching({ type: 'user', id: P.string })
const users = values.filter(isUser)
```

Checked example: [`examples/10-is-matching.ts`](examples/10-is-matching.ts).

Use `isMatching` when a branch should continue only if a value matches. Use `assertMatching` when a mismatch should throw.

## `assertMatching`

`assertMatching(pattern, value)` throws `PatternMismatchError` when the value does not match. After a successful call, TypeScript narrows the value.

```ts
const form = Object.fromEntries(new URLSearchParams('type=user&id=u1&role=admin'))

assertMatching({ type: 'user', id: P.string, role: P.union('admin', 'member') }, form)

form.id // string
```

Checked example: [`examples/11-assert-matching.ts`](examples/11-assert-matching.ts).

Use it at runtime boundaries: request bodies, form data, API payloads, webhook events, storage reads, and test fixtures.

## Error classes

### `NonExhaustiveMatchError`

Thrown by `.exhaustive()` and exhaustive `matchBy(...).cases(...)` paths when runtime data reaches an unhandled branch. In TypeScript code this is usually prevented by the type system, but it can still happen with JavaScript callers or incorrectly typed runtime data.

Properties:

- `name: 'NonExhaustiveMatchError'`
- `message`
- `valuePreview: string`
- `matcher: 'match' | 'matchBy' | 'isMatching' | 'assertMatching' | undefined`
- `key: PropertyKey | undefined`
- `path: string | undefined`
- `tag: unknown`
- non-enumerable `value: unknown`

### `PatternMismatchError`

Thrown by `assertMatching(pattern, value)`.

Properties:

- `name: 'PatternMismatchError'`
- `message`
- `valuePreview: string`
- `patternPreview: string`
- non-enumerable `value: unknown`
- non-enumerable `pattern: unknown`

Checked example: [`examples/12-error-handling.ts`](examples/12-error-handling.ts).

The ts-match errors subpath (`@diegogbrisa/ts-match/errors`) also currently exports `preview(value)` and the `MatchErrorMetadata` interface used by `NonExhaustiveMatchError`. They are low-level diagnostic exports; normal application code should prefer the error classes.

## TypeScript inference guide

### Handler parameters are narrowed

```ts
const text = matchBy(action, 'type')
  .with('load-success', (action) => action.rows.join(','))
  .with('load-failure', (action) => action.message)
  .with('clear', () => '')
  .with('start-loading', () => '')
  .exhaustive()
```

Each handler sees only the variant for its tag.

### Return types are inferred

`match(...)`, `matchBy(...)`, and their promise forms infer the union of branch return values. Promise terminals wrap the awaited return in a promise.

### Selections change the handler payload

Without selections, handlers receive the matched value. With one anonymous selection, handlers receive that selected value. With named selections, handlers receive an object of selected values.

```ts
const selected = match(payload)
  .with(
    { profile: { name: P.select('name', P.string), age: P.select('age', P.number) } },
    ({ name, age }) => `${name}:${age}`,
  )
  .otherwise(() => null)
```

### Exhaustiveness catches missing cases

For closed unions, `.exhaustive()` is available only after all remaining variants are covered. `matchBy(...).cases({...})` requires a complete object map when object keys can represent every discriminant.

## TypeScript diagnostics and troubleshooting

`ts-match` cannot replace TypeScript's compiler diagnostics, but invalid usage is shaped to surface readable `ts-match:` messages in IDE errors. Read the `ts-match:` line first; it names the library concept, the violated rule, and usually the fix.

The checked diagnostic fixtures live in [`diagnostics/`](diagnostics/) and are verified by `pnpm test:diagnostics`.

### Missing exhaustive cases

```ts
matchBy(event, 'type')
  .with('open', (event) => event.payload.id)
  .exhaustive()
```

Produces a diagnostic containing:

```text
ts-match: matchBy is not exhaustive for the selected path. Add handlers for the remaining tag(s), or use .otherwise(...) when a fallback is intentional.
```

Fix by adding the missing `.with(...)` branches, or use `.otherwise(...)` when a fallback is part of the design.

### Invalid paths

```ts
matchBy(event, 'payload.missing')
matchBy(event, ['payload', 'missing'])
```

Produces:

```text
ts-match: invalid matchBy path. Use an existing direct key, valid dot path, or tuple path. Use tuple paths for symbol keys or keys that contain dots.
```

Fix the path. Use dot paths for normal nested string keys and tuple paths for symbols or literal keys containing `.`.

### Impossible cases

```ts
match(action).with({ type: 'missing' }, () => 'bad')
matchBy(action, 'type').with('missing', () => 'bad')
```

Produce diagnostics containing:

```text
ts-match: this pattern cannot match the current input type.
ts-match: this matchBy tag cannot occur at the selected path.
```

Fix the literal/tag, remove the unreachable branch, or narrow/widen the input type before matching.

### Invalid pattern helper placement

```ts
P.array(P.select('item'))
P.exclude(P.select('x'))
P.tuple([P.rest(P.string), P.number])
```

Produce diagnostics containing:

```text
ts-match: repeated container patterns cannot contain P.select(...).
ts-match: P.exclude(pattern) cannot contain P.select(...).
ts-match: invalid P.rest(...) usage.
```

Move selections outside repeated or negative contexts. `P.rest(...)` belongs only as the final tuple item.

### Object-map case mistakes

```ts
matchBy(event, 'type').cases({ open: (event) => event.payload.id })
```

Produces:

```text
ts-match: object-map cases are missing required key(s). Add handlers for the missing keys or use .partial(...).otherwise(...).
```

Extra keys, broad tags, `null`/`undefined`, and normalized key collisions also produce `ts-match:` diagnostics. Use tuple-entry cases or callback grouped cases when object keys cannot represent the tags:

```ts
const label = matchBy(state, 'kind').cases((group) => [
  group('ready', (state) => state.data),
  group(null, () => 'empty'),
])
```

### Grouped-case inference

Prefer callback grouped cases when handlers need inferred variants:

```ts
matchBy(event, 'type').cases((group) => [group('open', 'close', (event) => event.type), group('idle', () => 'idle')])
```

Array-form callback groups are still supported without `as const` and can be more readable when their tags are statically known, but use the variadic form above when you want tag suggestions while typing:

```ts
matchBy(event, 'type').cases((group) => [group(['open', 'close'], (event) => event.type), group('idle', () => 'idle')])
```

Inline tuple-entry arrays preserve handler narrowing without const assertions. Partial grouped arrays preserve tag autocomplete while editing grouped tags; exhaustive `.cases([...])` keeps missing-case diagnostics active while the list is incomplete, so variadic callback `group('a', 'b', handler)` is the autocomplete-friendly exhaustive grouped form. Dynamic runtime arrays are accepted at runtime but cannot prove that every tag is covered.

Standalone exported `group(...)` is useful for reusable groups, but because it is created before `.cases(...)` or `.partial(...)` has context, handler annotations can still help in complex prebuilt tuple/group arrays. Do not add unsafe casts; use callback `group` first.

### Boundary assertions

`isMatching(...)` and `assertMatching(...)` validate pattern structure too. If an assertion pattern contains invalid selection/rest placement, the diagnostic appears before runtime:

```text
ts-match: invalid P.select(...) usage.
ts-match: invalid P.rest(...) usage.
```

### Readonly tuples and objects

Readonly tuple and object inputs are supported by the type tests and examples. Inline matcher arrays preserve literal tags without const assertions.

## Performance guide

Performance guidance is intentionally practical, not absolute:

- The package has zero runtime dependencies and `sideEffects: false`.
- Prefer `matchBy(value, 'type')` for straightforward discriminated-union dispatch when one key determines the branch.
- Use `.with(...).exhaustive()` as the default guide/example shape for closed discriminated unions: it keeps strong inference, avoids inline object-map allocation, and reads in execution order.
- Use inline `.cases({...})` for compact map-style DX in ordinary non-hot code.
- Avoid inline `.cases({...})` in hot loops because it recreates maps/handlers and validates fresh objects.
- Hoisted `matchBy(...).cases(caseMap)` is currently the fastest measured `ts-match` discriminant-dispatch shape in `benchmarks/native.ts`. In local runs it is roughly 15x faster than inline `.cases({...})` and about 4x faster than chained `.with(...).exhaustive()` dispatch for simple discriminants. Treat those ratios as directional, not guaranteed; benchmark on your workload. Hoisting is a deliberate performance/DX tradeoff because reusable handler maps can lose contextual inference. Do not use it as the default user-facing style.
- Hoist reusable patterns and validators when that preserves inference, for example `const isTelemetry = isMatching(P.exact(...))`.
- Measure locally with `pnpm bench:native`. The benchmark includes inline object maps, hoisted object maps, grouped callback cases, structural patterns, predicate patterns, `isMatching`, and promise terminals.

Checked performance-style example: [`examples/14-performance-friendly-hoisting.ts`](examples/14-performance-friendly-hoisting.ts).

Benchmark file included with the package:

- [`benchmarks/native.ts`](benchmarks/native.ts)

The repository also contains the development-only `benchmarks/dispatch.ts` strategy benchmark, runnable with `pnpm bench:dispatch`.

## Limitations and tradeoffs

- **ESM only.** CommonJS consumers need an ESM-compatible import path or bundler setup.
- **Node 20+.** Older runtimes are not targeted.
- **No structural `Map`/`Set` helpers yet.** Until they ship, use `P.instanceOf(Map)` / `P.instanceOf(Set)` plus `P.when(...)` for custom checks.
- **Temporal availability is runtime-owned.** Temporal helpers do not polyfill `globalThis.Temporal`; they match nothing until the runtime or application provides Temporal constructors.
- **Selections are intentionally restricted in repeated contexts.** `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, and `P.nonEmptyRecord(...)` reject `P.select(...)` because captures may repeat ambiguously.
- **`P.exclude(...)` cannot contain selections.** Excluding a pattern should not capture data from a branch that did not match.
- **`P.rest(...)` is tuple-only and must be final.** Runtime misuse throws `TypeError`.
- **Object patterns use normal JavaScript property lookup.** Getters can run or throw, and inherited properties can match.
- **`P.exact(...)` checks enumerable own extra keys on values.** It is deep for object patterns, but it is not a cyclic-graph matcher.
- **Dot paths mean nesting.** Use tuple paths when a literal key contains `.` or when path segments are symbols.
- **Object-map `matchBy(...).cases({...})` cannot represent `null`, `undefined`, or normalized key collisions.** Avoid bare `__proto__:` object-literal syntax; use computed `['__proto__']`, `.cases((group) => [...])`, or tuple entries for those cases.
- **Standalone exported `group(...)` has limited handler inference.** Use the callback `group` parameter for JavaScript-feeling grouped cases or partials.

See [`docs/design.md`](docs/design.md) for locked design decisions and lower-level semantics.

## Full examples index

Run all examples with `pnpm test:examples`.

| File                                                                                             | Demonstrates                                       | APIs used                                                    |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| [`examples/01-basic-match.ts`](examples/01-basic-match.ts)                                       | Basic matching and fallback behavior               | `match`, `.with`, `.otherwise`, `P`                          |
| [`examples/02-exhaustive-discriminated-union.ts`](examples/02-exhaustive-discriminated-union.ts) | Exhaustive discriminated union reducer             | `matchBy`, `.with`, `.exhaustive`                            |
| [`examples/03-match-promise.ts`](examples/03-match-promise.ts)                                   | Promise structural matching and safe terminals     | `match.promise`, `P.select`, safe terminals                  |
| [`examples/04-match-by-direct-key.ts`](examples/04-match-by-direct-key.ts)                       | Direct-key discriminant dispatch and object maps   | `matchBy.with`, `matchBy.cases`                              |
| [`examples/05-match-by-nested-path.ts`](examples/05-match-by-nested-path.ts)                     | Dot paths and tuple symbol paths                   | `matchBy`                                                    |
| [`examples/06-match-by-promise.ts`](examples/06-match-by-promise.ts)                             | Promise discriminant dispatch                      | `matchBy.promise`, `.with`, `.exhaustive`                    |
| [`examples/07-grouped-cases.ts`](examples/07-grouped-cases.ts)                                   | Grouped tags, `null`, `undefined`, reusable groups | `matchBy`, callback `group`, exported `group`                |
| [`examples/08-pattern-helpers.ts`](examples/08-pattern-helpers.ts)                               | `P` namespace helpers                              | `P`, `match`, `isMatching`                                   |
| [`examples/09-named-helper-imports.ts`](examples/09-named-helper-imports.ts)                     | Named `p*` helper imports                          | `pString`, `pNumber`, `pUnion`, `pOptional`, `pSelect`       |
| [`examples/10-is-matching.ts`](examples/10-is-matching.ts)                                       | Runtime type guards and filtering                  | `isMatching`, `P`                                            |
| [`examples/11-assert-matching.ts`](examples/11-assert-matching.ts)                               | Boundary assertion and narrowing                   | `assertMatching`, `P`                                        |
| [`examples/12-error-handling.ts`](examples/12-error-handling.ts)                                 | Public error classes and previews                  | `PatternMismatchError`, `NonExhaustiveMatchError`, `preview` |
| [`examples/13-real-world-events.ts`](examples/13-real-world-events.ts)                           | Event routing and nested selection                 | `match`, `matchBy`, `P.select`                               |
| [`examples/14-performance-friendly-hoisting.ts`](examples/14-performance-friendly-hoisting.ts)   | Inference-friendly hot-path guidance               | `matchBy.with`, hoisted `isMatching`, `P.exact`              |
| [`examples/15-match-by-with-partial.ts`](examples/15-match-by-with-partial.ts)                   | Object and tuple partial fallback                  | `matchBy.partial`, `.otherwise`                              |
| [`examples/16-convenience-helpers.ts`](examples/16-convenience-helpers.ts)                       | Convenience helpers and Temporal availability      | `P.regex`, `P.date`, `P.temporalInstant`, `P.truthy`         |

## API reference summary

### Primary APIs

- `match(value)`
- `match.promise(valueOrPromise)`
- `matchBy(value, path)`
- `matchBy.promise(valueOrPromise, path)`
- `P`

### Utilities

- `group(tag, handler)`, `group(tag1, tag2, ...moreTags, handler)`, `group(tags, handler)`
- `isMatching(pattern, value)`
- `isMatching(pattern)(value)`
- `assertMatching(pattern, value)`

### Error classes

- `NonExhaustiveMatchError`
- `PatternMismatchError`

### Pattern helper exports

- Namespace: `P._`, `P.any`, `P.string`, `P.number`, `P.boolean`, `P.bigint`, `P.symbol`, `P.null`, `P.undefined`, `P.nan`, `P.finite`, `P.integer`, `P.regex`, `P.date`, `P.error`, `P.regexp`, `P.nullish`, `P.falsy`, `P.truthy`, `P.temporal`, `P.temporalInstant`, `P.temporalPlainDate`, `P.temporalPlainTime`, `P.temporalPlainDateTime`, `P.temporalZonedDateTime`, `P.temporalDuration`, `P.temporalPlainYearMonth`, `P.temporalPlainMonthDay`, `P.union`, `P.exclude`, `P.optional`, `P.array`, `P.nonEmptyArray`, `P.tuple`, `P.rest`, `P.exact`, `P.when`, `P.instanceOf`, `P.select`, `P.record`, `P.nonEmptyRecord`
- Named helpers: `pWildcard`, `pAny`, `pString`, `pNumber`, `pBoolean`, `pBigint`, `pSymbol`, `pNull`, `pUndefined`, `pNan`, `pFinite`, `pInteger`, `pRegex`, `pDate`, `pError`, `pRegexp`, `pNullish`, `pFalsy`, `pTruthy`, `pTemporal`, `pTemporalInstant`, `pTemporalPlainDate`, `pTemporalPlainTime`, `pTemporalPlainDateTime`, `pTemporalZonedDateTime`, `pTemporalDuration`, `pTemporalPlainYearMonth`, `pTemporalPlainMonthDay`, `pUnion`, `pExclude`, `pOptional`, `pArray`, `pNonEmptyArray`, `pTuple`, `pRest`, `pExact`, `pWhen`, `pInstanceOf`, `pSelect`, `pRecord`, `pNonEmptyRecord`

### Root type-only exports

These are mainly for library authors and advanced integrations:

- `AbstractConstructor`
- `AnonymousSelectPattern`
- `ArrayPattern`
- `CaseEntry`
- `CasesEntry`
- `DatePattern`
- `Discriminant`
- `ErrorPattern`
- `ExactPattern`
- `ExcludePattern`
- `FalsyPattern`
- `FinitePattern`
- `GroupedCaseEntry`
- `GroupEntry`
- `GuardPattern`
- `InferPattern`
- `InstanceOfPattern`
- `IntegerPattern`
- `MatchedValue`
- `MatchByPath`
- `MatchPromiseResult`
- `NamedSelectPattern`
- `NanPattern`
- `NonEmptyArrayPattern`
- `NonEmptyRecordPattern`
- `NullishPattern`
- `OptionalPattern`
- `PatternKind`
- `Primitive`
- `PrimitivePattern`
- `PropertyPath`
- `RecordPattern`
- `RegexPattern`
- `RegexpPattern`
- `RestPattern`
- `SelectPattern`
- `TemporalDurationValue`
- `TemporalInstantValue`
- `TemporalPattern`
- `TemporalPatternKind`
- `TemporalPlainDateTimeValue`
- `TemporalPlainDateValue`
- `TemporalPlainMonthDayValue`
- `TemporalPlainTimeValue`
- `TemporalPlainYearMonthValue`
- `TemporalValue`
- `TemporalZonedDateTimeValue`
- `TruthyPattern`
- `TuplePattern`
- `UnionPattern`
- `WildcardPattern`

Advanced type helpers are useful when you are building wrappers around ts-match:

```ts
import type { InferPattern, MatchByPath, MatchPromiseResult } from '@diegogbrisa/ts-match'
import { P } from '@diegogbrisa/ts-match'

type UserPayload = InferPattern<{ id: typeof P.string; role: typeof P.string }>
// { id: string; role: string }

const userRolePath: MatchByPath<UserPayload> = 'role'

async function load() {
  const result: MatchPromiseResult<UserPayload> = { ok: true, value: { id: 'user-1', role: 'admin' } }
  return result
}
```

Builder types (`SyncMatchBuilder`, `PromiseMatchBuilder`, `SyncMatchByBuilder`, `PromiseMatchByBuilder`) are mainly for libraries that accept a partially built matcher and return it. Application code should normally rely on inference from `match(...)`, `match.promise(...)`, `matchBy(...)`, and `matchBy.promise(...)`.

### Focused subpath exports

| Published subpath                  | Public exports                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@diegogbrisa/ts-match/match`      | `match`, `SyncMatchBuilder`, `PromiseMatchBuilder`, `MatchFunction`, `MatchedValue`, `MatchPromiseResult`                          |
| `@diegogbrisa/ts-match/match-by`   | `matchBy`, `SyncMatchByBuilder`, `PromiseMatchByBuilder`, `MatchByBuilder`, `MatchByFunction`, `MatchByPath`, `MatchPromiseResult` |
| `@diegogbrisa/ts-match/patterns`   | `P` and every public `p*` helper                                                                                                   |
| `@diegogbrisa/ts-match/assertions` | `isMatching`, `assertMatching`                                                                                                     |
| `@diegogbrisa/ts-match/errors`     | `NonExhaustiveMatchError`, `PatternMismatchError`, `preview`, `MatchErrorMetadata`                                                 |
| `@diegogbrisa/ts-match/group`      | `group`                                                                                                                            |

## Acknowledgements

ts-match was inspired by the excellent work Gabriel Vergnaud has done on [ts-pattern](https://github.com/gvergnaud/ts-pattern).

ts-pattern set a very high bar for ergonomic, type-safe pattern matching in TypeScript. I built ts-match independently because I wanted to explore a smaller ESM-only library with a different emphasis: `matchBy` for discriminant/path dispatch, promise-aware matchers, named `p*` helper exports, and runtime semantics that fit my own preferences.

ts-match is not affiliated with ts-pattern.

## Package notes

- Package name: `@diegogbrisa/ts-match`.
- ESM only (`"type": "module"`).
- Node 20+.
- TypeScript 5.4+ recommended.
- Zero runtime dependencies.
- `sideEffects: false` for bundlers that read package metadata.

## Development checks

```bash
pnpm check                  # lint, format, typecheck, type tests, coverage, build, docs/examples smoke
pnpm test                   # runtime tests
pnpm test:type              # TypeScript type tests
pnpm test:docs              # README local-link validation
pnpm test:examples          # build, validate, compile, and run examples
pnpm bench:native           # runtime benchmark scenarios
pnpm bench:dispatch         # dispatch strategy benchmark
pnpm bench:types            # TypeScript extended diagnostics
pnpm pack:check             # build, pack, install tarball, and import smoke
```

Example validation checks that examples compile, run, avoid internal `src`/`dist` imports, avoid non-const assertions, and avoid `switch` statements.

## Additional documentation

- Release notes: [`CHANGELOG.md`](CHANGELOG.md)
- Release process: [`docs/release.md`](docs/release.md)
- Design notes: [`docs/design.md`](docs/design.md)
- Agent skill: [`SKILL.md`](SKILL.md)
