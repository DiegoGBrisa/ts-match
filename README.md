# ts-match

Pattern matching for TypeScript. Use `match` for structural patterns, `matchBy` for discriminated unions, and `P` for reusable runtime patterns.

```ts
import { matchBy } from '@diegogbrisa/ts-match'

type CartAction =
  | { type: 'addItem'; sku: string; quantity: number }
  | { type: 'applyCoupon'; code: string; percentOff: number }
  | { type: 'clearCart'; reason: 'user' | 'timeout' }

type CartOperation =
  | { type: 'lineItemAdded'; sku: string; quantity: number }
  | { type: 'discountApplied'; code: string; multiplier: number }
  | { type: 'cartCleared'; reason: 'user' | 'timeout' }

function planCartOperation(action: CartAction): CartOperation {
  return matchBy(action, 'type')
    .with('addItem', (action) => ({ type: 'lineItemAdded', sku: action.sku, quantity: action.quantity }))
    .with('applyCoupon', (action) => ({ type: 'discountApplied', code: action.code, multiplier: 0.9 }))
    .with('clearCart', (action) => ({ type: 'cartCleared', reason: action.reason }))
    .exhaustive()
}
```

## Features

- Exhaustive handling for closed unions.
- Narrowed handler parameters without casts.
- Structural patterns for objects, tuples, arrays, and records.
- `matchBy` for ergonomic discriminant dispatch.
- `match.promise` and `matchBy.promise` for promise-backed inputs and promise-returning branches.
- `isMatching` and `assertMatching` for runtime validation.
- ESM-only package for Node 20+ with no runtime dependencies.

## Installation

```bash
npm install @diegogbrisa/ts-match
pnpm add @diegogbrisa/ts-match
yarn add @diegogbrisa/ts-match
bun add @diegogbrisa/ts-match
```

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

type Action =
  | { type: 'start-loading' }
  | { type: 'load-success'; rows: readonly string[] }
  | { type: 'load-failure'; message: string }
  | { type: 'clear' }

const next = matchBy(action, 'type')
  .with('start-loading', () => loadingState)
  .with('load-success', (action) => readyState(action.rows))
  .with('load-failure', (action) => failedState(action.message))
  .with('clear', () => idleState)
  .exhaustive()
```

Checked example: [`examples/02-exhaustive-discriminated-union.ts`](examples/02-exhaustive-discriminated-union.ts).

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

const label = match(input)
  .with(P.string, (value) => value.toUpperCase())
  .with(P.number, (value) => `number:${value}`)
  .otherwise(() => 'unknown')
```

Checked example: [`examples/01-basic-match.ts`](examples/01-basic-match.ts).

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
const label = match(value)
  .when(
    (value): value is number => typeof value === 'number' && value > 0,
    (value) => `positive:${value}`,
  )
  .otherwise(() => 'other')
```

`P.when(predicate)` is the pattern-helper form and can be nested inside object/tuple patterns.

### `.otherwise(handler)`

Use `.otherwise(...)` when the input is open-ended or a fallback is intended. The handler receives the remaining value type.

### `.exhaustive()`

Use `.exhaustive()` for closed unions. It returns the union of branch return types. TypeScript rejects it while variants remain unhandled.

Runtime error: `NonExhaustiveMatchError` if unexpected data reaches the terminal at runtime.

## `match.promise`

`match.promise(valueOrPromise)` has the same branch API as `match(value)`, but it resolves the input internally and terminal methods return promises:

```ts
const body = await match
  .promise(fetchResponse())
  .with({ ok: true, body: P.select('body', P.string) }, async ({ body }) => body.trim())
  .with({ ok: false }, ({ status, message }) => `error:${status}:${message}`)
  .exhaustive()
```

Checked example: [`examples/03-match-promise.ts`](examples/03-match-promise.ts).

Behavior:

- accepts values, promises, thenables, and maybe-promise sources;
- handlers receive `Awaited<TInput>`, not the promise wrapper;
- handler values and promise-like values are awaited by the terminal promise;
- synchronous handler throws, predicate throws, pattern errors, and input rejections become promise rejections for normal terminals;
- `.otherwise(...)` is a pattern fallback, not an input-error fallback;
- `.otherwise(...)` and `.exhaustive()` return `Promise<...>`.

Promise builders also expose safe terminals:

```ts
const result = await match
  .promise(fetchResponse())
  .with({ ok: true, body: P.select('body', P.string) }, ({ body }) => body.trim())
  .safeOtherwise(() => '')

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
  .promise(fetchResponse())
  .with({ ok: true }, ({ body }) => body)
  .with({ ok: false }, ({ message }) => message)
  .safeExhaustive()
```

Use sync `match(promise)` only if you intentionally want to pattern-match the `Promise` object itself.

## `matchBy`

`matchBy(value, path)` is specialized for discriminant dispatch. It reads a path, matches tags, and passes the full narrowed value to handlers.

### Direct key

```ts
const operation = matchBy(cartAction, 'kind')
  .with('addItem', (value) => ({ type: 'lineItemAdded', sku: value.sku, quantity: value.quantity }))
  .with('applyCoupon', (value) => ({ type: 'discountApplied', code: value.code, multiplier: 0.9 }))
  .with('clearCart', (value) => ({ type: 'cartCleared', reason: value.reason }))
  .exhaustive()
```

Checked example: [`examples/04-match-by-direct-key.ts`](examples/04-match-by-direct-key.ts).

### Nested dot path and tuple path

Dot paths read nested string-key properties and autocomplete finite tag-like paths from the input value type. Tuple paths provide segment-by-segment autocomplete and are useful for symbols and exact path segments.

```ts
const label = matchBy(event, 'meta.type')
  .with('click', (value) => `click:${value.meta.x},${value.meta.y}`)
  .with('submit', (value) => `submit:${value.meta.form}`)
  .exhaustive()

const symbolLabel = matchBy(event, ['meta', EVENT_KIND])
  .with('user', (value) => `user:${value.meta.name}`)
  .with('system', (value) => `system:${value.meta.code}`)
  .exhaustive()
```

Checked example: [`examples/05-match-by-nested-path.ts`](examples/05-match-by-nested-path.ts).

Autocomplete intentionally suggests finite tag-like paths, such as literal string/number/boolean unions. Broad payload leaves such as `number` coordinates or arbitrary `string` labels can still be typed manually when you want fallback-based matching, but they are not suggested as primary discriminant paths.

Dot-path limitation: a dot string always means nesting. Use tuple paths for literal keys that contain dots.

### `.cases(...)`

`.cases(...)` is an exhaustive terminal for `matchBy`. It supports three input shapes.

#### Object case maps

Object-map cases are exhaustive and exact for finite discriminants representable as object keys. They support string, number, symbol, and boolean tags when the normalized object keys do not collide.

```ts
const auditEvent = matchBy(cartAction, 'kind').cases({
  addItem: (value) => ({ category: 'inventory', sku: value.sku, quantity: value.quantity }),
  applyCoupon: (value) => ({ category: 'pricing', code: value.code, percentOff: value.percentOff }),
  clearCart: (value) => ({ category: 'lifecycle', reason: value.reason }),
})
```

Use object-map cases when you want compact map-style DX in ordinary non-hot code. Avoid recreating inline case maps inside tight loops: fresh maps allocate handlers/maps and go through validation each time. The benchmark suite currently shows hoisted object maps as the fastest measured `ts-match` discriminant-dispatch shape, but hoisting removes contextual handler inference and can require manual handler parameter types. For JavaScript-feeling TypeScript, prefer `.with(...).exhaustive()` unless you deliberately choose that tradeoff.

Use grouped/callback cases for `null`, `undefined`, or collisions such as `1` and `'1'`. Avoid bare `__proto__:` object-literal syntax because JavaScript treats it specially; use computed `['__proto__']`, tuple entries, or grouped cases when that tag matters.

#### Callback grouped cases

Callback grouped cases are exhaustive, preserve local handler inference, and support every discriminant value including `null` and `undefined`:

```ts
const label = matchBy(event, 'type').cases((group) => [
  group('start', 'resume', (value) => `active:${value.id}`),
  group('stop', (value) => `stopped:${value.reason}`),
  group('error', (value) => `error:${value.message}`),
])
```

Use this form when multiple tags share one handler and you want annotation-free narrowed parameters. Prefer variadic tags (`group('a', 'b', handler)`) for the best inline autocomplete; use array tags (`group(['a', 'b'], handler)`) when a reusable `as const` tuple is clearer.

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
  [[null, undefined] as const, () => 'empty'],
  ['failed', (value) => value.reason],
])
```

Valid entry shapes are:

- `[tag, handler]` for one tag;
- `[[tag1, tag2] as const, handler]` for a static group;
- `group(tag, handler)`, `group(tag1, tag2, ...moreTags, handler)`, or `group(tags, handler)` for reusable grouped entries.

Array-form grouped tags must be statically known to prove exhaustive coverage. Inline literal arrays and reusable `as const` tuples count; broad runtime arrays are runtime-valid but do not prove all tags are present. Inline tuple-entry arrays contextually infer handlers from their sibling tags. Exported `group(...)` entries are useful for reusable structures but can need explicit handler parameter annotations; use callback `.cases((group) => [...])` when you want grouped entries with the strongest annotation-free handler inference.

### `.with(...tags, handler)`

Use `.with` to chain tag groups before a final `.exhaustive()` or `.otherwise(...)`:

```ts
const label = matchBy(event, 'type')
  .with('start', 'resume', (value) => `active:${value.id}`)
  .with('stop', (value) => `stopped:${value.reason}`)
  .exhaustive()
```

Checked example: [`examples/15-match-by-with-partial.ts`](examples/15-match-by-with-partial.ts).

### `.partial(...).otherwise(...)`

Use `.partial(...)` when only some tags need special handling and the rest should go to `.otherwise(...)`. It accepts the same object-map and tuple/grouped entry shapes as `.cases(...)`, but it is intentionally non-exhaustive.

Object-map partial:

```ts
const response = matchBy(cartAction, 'type')
  .partial({
    addItem: (value) => ({ type: 'recalculate', cartId: value.cartId, sku: value.sku, quantity: value.quantity }),
  })
  .otherwise((remaining) =>
    remaining.type === 'checkout'
      ? { type: 'reviewTotal', cartId: remaining.cartId, total: remaining.total }
      : { type: 'unchanged' },
  )
```

Tuple/grouped-entry partial:

```ts
const review = matchBy(cartAction, 'type')
  .partial([
    ['addItem', (value) => ({ type: 'inventoryCheck', sku: value.sku, quantity: value.quantity })],
    [
      ['updateQuantity', 'applyCoupon'] as const,
      (value) => ({
        type: 'pricePreview',
        cartId: value.cartId,
        subtotal: value.subtotal,
      }),
    ],
  ])
  .otherwise((remaining) =>
    remaining.type === 'checkout'
      ? { type: 'checkoutReview', cartId: remaining.cartId, total: remaining.total }
      : { type: 'noReview' },
  )
```

Callback grouped cases are supported by `.cases(...)`; for partial grouped behavior use `.partial([...])` with tuple entries or exported `group(...)` entries.

Checked example: [`examples/15-match-by-with-partial.ts`](examples/15-match-by-with-partial.ts).

### Runtime behavior

If no `matchBy` case matches, `cases(...)` and `.exhaustive()` throw `NonExhaustiveMatchError` with `matcher`, `path`, `tag`, and `valuePreview` metadata where available. If a path segment is missing, the selected tag is `undefined`; handle it with tuple or grouped entries when that is a valid runtime state.

## `matchBy.promise`

`matchBy.promise(valueOrPromise, path)` resolves the input internally, then performs the same path/tag dispatch as `matchBy(value, path)`:

```ts
const summary = await matchBy
  .promise(fetchJob(), 'type')
  .with('queued', async (value) => ({ state: 'waiting', id: value.id }))
  .with('finished', (value) => ({ state: 'complete', id: value.id, durationMs: value.durationMs }))
  .with('failed', (value) => ({ state: 'retryable', id: value.id, reason: value.reason }))
  .exhaustive()
```

Checked example: [`examples/06-match-by-promise.ts`](examples/06-match-by-promise.ts).

Path, tag, object-map, partial-map, and grouped-case inference all use the resolved input type (`Awaited<TInput>`). That means this keeps the same autocomplete as sync `matchBy(...)` even when the source is a `Promise<Event>` or `Event | PromiseLike<Event>`.

Normal terminals return promises and reject normally for input rejections, path-read errors, handler throws/rejections, fallback throws/rejections, and defensive non-exhaustive failures. `.otherwise(...)` remains only a pattern fallback; it does not catch input promise failures.

All `matchBy` case shapes are available on promise builders:

```ts
const compact = await matchBy.promise(fetchJob(), 'type').cases({
  queued: async (value) => ({ state: 'waiting', id: value.id }),
  finished: (value) => ({ state: 'complete', id: value.id, durationMs: value.durationMs }),
  failed: (value) => ({ state: 'retryable', id: value.id, reason: value.reason }),
})

const partial = await matchBy
  .promise(fetchJob(), 'type')
  .partial({ queued: (value) => ({ action: 'monitor', id: value.id }) })
  .otherwise((value) => ({ action: 'archive', id: value.id }))

const grouped = await matchBy
  .promise(fetchJob(), 'type')
  .cases((group) => [
    group('queued', 'finished', (value) => ({ bucket: 'resolvedOrWaiting', id: value.id })),
    group('failed', (value) => ({ bucket: 'needsAttention', reason: value.reason })),
  ])
```

Safe terminals mirror `match.promise`:

```ts
const fallbackResult = await matchBy
  .promise(fetchJob(), 'type')
  .with('queued', (value) => ({ status: 'waiting', id: value.id }))
  .safeOtherwise(() => ({ status: 'unknown' }))

const exhaustiveResult = await matchBy
  .promise(fetchJob(), 'type')
  .with('queued', (value) => ({ status: 'waiting', id: value.id }))
  .with('finished', (value) => ({ status: 'complete', id: value.id }))
  .with('failed', (value) => ({ status: 'failed', reason: value.reason }))
  .safeExhaustive()
```

- `.safeExhaustive()` keeps exhaustive tag checking.
- `.safeOtherwise(handler)` requires a fallback handler.
- Safe terminals resolve to `{ ok: true, value } | { ok: false, error }`.

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

Use the array form when it reads better or when the tags already exist as a reusable literal tuple. It keeps `group` to two arguments. Use the variadic form when you want the best inline autocomplete while typing tags. TypeScript's language service can complete direct variadic argument positions more reliably than string literals nested inside generic array arguments.

For exhaustiveness, array-form tags must be statically known. Inline arrays and `as const` reusable arrays count as handled tags; broad runtime arrays such as `readonly ('start' | 'resume')[]` do not prove coverage because TypeScript cannot know which tags are actually present at runtime.

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
  group(['start', 'resume'] as const, () => 'active'),
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

Checked coverage for all helpers: [`examples/08-pattern-helpers.ts`](examples/08-pattern-helpers.ts).

| Helper                                       | What it matches                                  | Notes                                                                                             |
| -------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `P._`                                        | anything                                         | Wildcard. Handler receives the original value.                                                    |
| `P.any`                                      | anything                                         | Alias of `P._`.                                                                                   |
| `P.string`                                   | strings                                          | Narrows to `string`.                                                                              |
| `P.number`                                   | numbers                                          | Includes `NaN` and infinities; use numeric helpers for stricter checks.                           |
| `P.boolean`                                  | booleans                                         | Narrows to `boolean`.                                                                             |
| `P.bigint`                                   | bigints                                          | Narrows to `bigint`.                                                                              |
| `P.symbol`                                   | symbols                                          | Narrows to `symbol`.                                                                              |
| `P.null`                                     | `null`                                           | Literal null pattern helper.                                                                      |
| `P.undefined`                                | `undefined`                                      | Literal undefined pattern helper.                                                                 |
| `P.nan`                                      | `NaN`                                            | Uses `Number.isNaN`.                                                                              |
| `P.finite`                                   | finite numbers                                   | Uses `Number.isFinite`.                                                                           |
| `P.integer`                                  | integers                                         | Uses `Number.isInteger`.                                                                          |
| `P.union(...patterns)`                       | any listed pattern                               | Commits selections from the successful branch only.                                               |
| `P.exclude(pattern)`                         | values that do not match `pattern`               | Cannot contain `P.select(...)`.                                                                   |
| `P.optional(pattern)`                        | absent object field, `undefined`, or `pattern`   | Selections inside an absent optional capture `undefined`.                                         |
| `P.array(pattern)`                           | arrays where every item matches                  | Variable length. `P.select(...)` inside is rejected because captures may repeat.                  |
| `P.nonEmptyArray(pattern)`                   | non-empty arrays where every item matches        | Same selection limitation as `P.array`.                                                           |
| `P.tuple([...])`                             | exact tuple pattern                              | Readability helper for bare tuple arrays.                                                         |
| `P.rest(pattern)`                            | remaining tuple items                            | Valid only as the final tuple item.                                                               |
| `P.exact(pattern)`                           | deep exact object pattern                        | Rejects enumerable own extra keys on values.                                                      |
| `P.when(predicate)`                          | predicate-matched values                         | Supports type guards. Can be nested.                                                              |
| `P.instanceOf(Constructor)`                  | `instanceof Constructor`                         | Useful for errors/classes.                                                                        |
| `P.select()`                                 | anonymous selected value                         | Only one anonymous select is allowed per successful pattern.                                      |
| `P.select(name)`                             | named selected value                             | Handler receives an object with selected keys.                                                    |
| `P.select(name, pattern)`                    | named selected value that also matches `pattern` | Combines validation and selection.                                                                |
| `P.record(keyPattern, valuePattern)`         | plain record-like objects                        | Rejects arrays, class instances, maps, sets, dates, regexps, and primitives. Empty records match. |
| `P.nonEmptyRecord(keyPattern, valuePattern)` | non-empty plain record-like objects              | Same as `P.record`, but requires at least one enumerable own key.                                 |

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

Checked example using every named helper: [`examples/09-named-helper-imports.ts`](examples/09-named-helper-imports.ts).

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
const payload: unknown = { type: 'user', id: 'u1', role: 'admin' }

assertMatching({ type: 'user', id: P.string, role: P.union('admin', 'member') }, payload)

payload.id // string
```

Checked example: [`examples/11-assert-matching.ts`](examples/11-assert-matching.ts).

Use it at runtime boundaries: parsed JSON, API payloads, webhook events, storage reads, and test fixtures.

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
matchBy(event, ['payload', 'missing'] as const)
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
P.tuple([P.rest(P.string), P.number] as const)
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

Array-form callback groups are still supported and can be more readable when their tags are statically known:

```ts
matchBy(event, 'type').cases((group) => [group(['open', 'close'], (event) => event.type), group('idle', () => 'idle')])
```

The tradeoff is editor behavior: TypeScript currently provides more reliable autocomplete in variadic positions like `group('open', '|', handler)` than inside nested arrays like `group(['|'], handler)`. This is a language-service contextual-typing limitation, not a runtime limitation. Exhaustiveness also only counts literal tuple arrays; dynamic runtime arrays are accepted at runtime but cannot prove that every tag is covered.

Standalone exported `group(...)` is useful for reusable groups, but because it is created before `.cases(...)` has context, handler annotations can still help in complex prebuilt tuple/group arrays. Do not add unsafe casts; use callback `group` first.

### Boundary assertions

`isMatching(...)` and `assertMatching(...)` validate pattern structure too. If an assertion pattern contains invalid selection/rest placement, the diagnostic appears before runtime:

```text
ts-match: invalid P.select(...) usage.
ts-match: invalid P.rest(...) usage.
```

### Readonly tuples and objects

Readonly tuple and object inputs are supported by the type tests and examples. Use `as const` only for literal tuples/objects that need literal preservation, such as reusable grouped tags.

## Performance guide

Performance guidance is intentionally practical, not absolute:

- The package has zero runtime dependencies and `sideEffects: false`.
- Prefer `matchBy(value, 'type')` for straightforward discriminated-union dispatch when one key determines the branch.
- Use `.with(...).exhaustive()` as the default guide/example shape for closed discriminated unions: it keeps strong inference, avoids inline object-map allocation, and reads in execution order.
- Use inline `.cases({...})` for compact map-style DX in ordinary non-hot code.
- Avoid inline `.cases({...})` in hot loops because it recreates maps/handlers and validates fresh objects.
- Hoisted `matchBy(...).cases(caseMap)` is currently the fastest measured `ts-match` discriminant-dispatch shape in `benchmarks/native.ts`, but it is a deliberate performance/DX tradeoff because reusable handler maps can lose contextual inference. Do not use it as the default user-facing style.
- Hoist reusable patterns and validators when that preserves inference, for example `const isTelemetry = isMatching(P.exact(...))`.
- Measure locally with `pnpm bench:native`. The benchmark includes inline object maps, hoisted object maps, grouped callback cases, structural patterns, predicate patterns, `isMatching`, and promise terminals.

Checked performance-style example: [`examples/14-performance-friendly-hoisting.ts`](examples/14-performance-friendly-hoisting.ts).

Benchmark file included with the package:

- [`benchmarks/native.ts`](benchmarks/native.ts)

The repository also contains the development-only `benchmarks/dispatch.ts` strategy benchmark, runnable with `pnpm bench:dispatch`.

## Limitations and tradeoffs

- **ESM only.** CommonJS consumers need an ESM-compatible import path or bundler setup.
- **Node 20+.** Older runtimes are not targeted.
- **No structural `Map`/`Set` helpers in v1.** Use `P.instanceOf(Map)` / `P.instanceOf(Set)` plus `P.when(...)` for custom checks.
- **No RegExp string helper.** Use `P.when((value): value is string => typeof value === 'string' && regex.test(value))`.
- **No special aliases beyond the documented helpers.** For example, use `P.union(P.null, P.undefined)` for null-or-undefined.
- **Selections are intentionally restricted in repeated contexts.** `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, and `P.nonEmptyRecord(...)` reject `P.select(...)` because captures may repeat ambiguously.
- **`P.exclude(...)` cannot contain selections.** Excluding a pattern should not capture data from a branch that did not match.
- **`P.rest(...)` is tuple-only and must be final.** Runtime misuse throws `TypeError`.
- **Object patterns use normal JavaScript property lookup.** Getters can run or throw, and inherited properties can match.
- **`P.exact(...)` checks enumerable own extra keys on values.** It is deep for object patterns, but it is not a cyclic-graph matcher.
- **Dot paths mean nesting.** Use tuple paths when a literal key contains `.` or when path segments are symbols.
- **Object-map `matchBy(...).cases({...})` cannot represent `null`, `undefined`, or normalized key collisions.** Avoid bare `__proto__:` object-literal syntax; use computed `['__proto__']`, `.cases((group) => [...])`, or tuple entries for those cases.
- **Standalone exported `group(...)` has limited handler inference.** Use the callback `group` parameter for JavaScript-feeling grouped cases.

See [`docs/design.md`](docs/design.md) for locked design decisions and lower-level semantics.

## Full examples index

Run all examples with `pnpm test:examples`.

| File                                                                                             | Demonstrates                                       | APIs used                                                    |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| [`examples/01-basic-match.ts`](examples/01-basic-match.ts)                                       | Basic fallback, shared handlers, and predicates    | `match`, multi-pattern `.with`, `.when`, `P`                 |
| [`examples/02-exhaustive-discriminated-union.ts`](examples/02-exhaustive-discriminated-union.ts) | Exhaustive discriminated union reducer             | `matchBy`, `.with`, `.exhaustive`                            |
| [`examples/03-match-promise.ts`](examples/03-match-promise.ts)                                   | Promise structural matching and safe terminals     | `match.promise`, `P.select`, safe terminals                  |
| [`examples/04-match-by-direct-key.ts`](examples/04-match-by-direct-key.ts)                       | Direct-key discriminant dispatch and object maps   | `matchBy.with`, `matchBy.cases`                              |
| [`examples/05-match-by-nested-path.ts`](examples/05-match-by-nested-path.ts)                     | Dot paths and tuple symbol paths                   | `matchBy`                                                    |
| [`examples/06-match-by-promise.ts`](examples/06-match-by-promise.ts)                             | Promise discriminant dispatch, maps, groups, safe  | `matchBy.promise`, `.cases`, `.partial`, safe                |
| [`examples/07-grouped-cases.ts`](examples/07-grouped-cases.ts)                                   | Grouped tags, `null`, `undefined`, reusable groups | `matchBy`, callback `group`, exported `group`                |
| [`examples/08-pattern-helpers.ts`](examples/08-pattern-helpers.ts)                               | `P` namespace helpers                              | `P`, `match`, `isMatching`                                   |
| [`examples/09-named-helper-imports.ts`](examples/09-named-helper-imports.ts)                     | Named `p*` helpers                                 | every public `p*` helper                                     |
| [`examples/10-is-matching.ts`](examples/10-is-matching.ts)                                       | Runtime type guards and filtering                  | `isMatching`, `P`                                            |
| [`examples/11-assert-matching.ts`](examples/11-assert-matching.ts)                               | Boundary assertion and narrowing                   | `assertMatching`, `P`                                        |
| [`examples/12-error-handling.ts`](examples/12-error-handling.ts)                                 | Public error classes and previews                  | `PatternMismatchError`, `NonExhaustiveMatchError`, `preview` |
| [`examples/13-real-world-events.ts`](examples/13-real-world-events.ts)                           | Event routing and nested selection                 | `match`, `matchBy`, `P.select`                               |
| [`examples/14-performance-friendly-hoisting.ts`](examples/14-performance-friendly-hoisting.ts)   | Inference-friendly hot-path guidance               | `matchBy.with`, hoisted `isMatching`, `P.exact`              |
| [`examples/15-match-by-with-partial.ts`](examples/15-match-by-with-partial.ts)                   | Chained tags and object/tuple partial fallback     | `matchBy.with`, `matchBy.partial`, `.otherwise`              |

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

- Namespace: `P._`, `P.any`, `P.string`, `P.number`, `P.boolean`, `P.bigint`, `P.symbol`, `P.null`, `P.undefined`, `P.nan`, `P.finite`, `P.integer`, `P.union`, `P.exclude`, `P.optional`, `P.array`, `P.nonEmptyArray`, `P.tuple`, `P.rest`, `P.exact`, `P.when`, `P.instanceOf`, `P.select`, `P.record`, `P.nonEmptyRecord`
- Named helpers: `pWildcard`, `pAny`, `pString`, `pNumber`, `pBoolean`, `pBigint`, `pSymbol`, `pNull`, `pUndefined`, `pNan`, `pFinite`, `pInteger`, `pUnion`, `pExclude`, `pOptional`, `pArray`, `pNonEmptyArray`, `pTuple`, `pRest`, `pExact`, `pWhen`, `pInstanceOf`, `pSelect`, `pRecord`, `pNonEmptyRecord`

### Root type-only exports

These are mainly for library authors and advanced integrations:

- `AbstractConstructor`
- `AnonymousSelectPattern`
- `ArrayPattern`
- `CaseEntry`
- `CasesEntry`
- `Discriminant`
- `ExactPattern`
- `ExcludePattern`
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
- `OptionalPattern`
- `PatternKind`
- `Primitive`
- `PrimitivePattern`
- `PropertyPath`
- `RecordPattern`
- `RestPattern`
- `SelectPattern`
- `TuplePattern`
- `UnionPattern`
- `WildcardPattern`

Advanced type helpers are useful when you are building wrappers around ts-match:

```ts
import type { InferPattern, MatchByPath, MatchPromiseResult } from '@diegogbrisa/ts-match'
import { P } from '@diegogbrisa/ts-match'

type UserPayload = InferPattern<{ id: typeof P.string; role: typeof P.string }>
// { id: string; role: string }

function makePath<TValue>(path: MatchByPath<TValue>): MatchByPath<TValue> {
  return path
}

async function load(): Promise<MatchPromiseResult<UserPayload>> {
  return { ok: true, value: { id: 'user-1', role: 'admin' } }
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
