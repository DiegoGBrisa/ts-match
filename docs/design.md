# ts-match design decisions

## Product goal

ts-match is a TypeScript-first pattern matching library for frontend, backend, library, and CLI code. It focuses on small runtime code, tree-shakable ESM output, strong TypeScript inference, and zero runtime dependencies. Install it from npm as `@diegogbrisa/ts-match`.

The canonical API is:

```ts
import { match, matchBy, P } from '@diegogbrisa/ts-match'
```

User-facing guide: [`../README.md`](../README.md). Checked examples: [`../examples`](../examples). Agent skill: [`../SKILL.md`](../SKILL.md).

## Locked API decisions

- Brand/name: ts-match.
- Published npm package: `@diegogbrisa/ts-match`.
- Runtime dependencies: none.
- Module format: ESM only.
- Runtime target: Node 20+ and modern browsers/bundlers.
- Tree-shaking: `sideEffects: false`, root exports plus focused subpath exports, `P` namespace plus `p*` named helper exports.
- Fluent method: `.with(...)`.
- Fallback: `.otherwise(...)`.
- Exhaustive terminal: `.exhaustive()`.
- Async normalization is explicit: `match.async(...)` and `matchBy.async(...)`.
- `matchBy(value, path)` is the differentiator for discriminated unions and nested discriminants.

## Pattern helpers

Canonical namespace: `P`.

Named exports use a `p` prefix for tree-shaking-sensitive users, for example `pString`, `pUnion`, `pSelect`.

Supported helpers:

- `P._` / `P.any`
- `P.string`, `P.number`, `P.boolean`, `P.bigint`, `P.symbol`, `P.null`, `P.undefined`
- `P.nan`, `P.finite`, `P.integer`
- `P.union(...)`
- `P.exclude(pattern)`
- `P.optional(pattern)`
- `P.array(pattern)`
- `P.nonEmptyArray(pattern)`
- bare tuple arrays and `P.tuple([...])`
- `P.rest(pattern)` as the final tuple item
- `P.exact(pattern)`
- `P.when(predicate)` and `.when(predicate, handler)`
- `P.instanceOf(Constructor)`
- `P.select()`, `P.select(name)`, `P.select(name, pattern)`
- `P.select(...)` is intentionally rejected inside `P.exclude(...)`, `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, and `P.nonEmptyRecord(...)` because those contexts can invert, skip, or repeat captures ambiguously.
- `P.record(keyPattern, valuePattern)`
- `P.nonEmptyRecord(keyPattern, valuePattern)`

Out of scope for v1:

- Map/Set structural matching. Use `P.instanceOf(Map | Set)` plus `P.when(...)` for now.
- RegExp-as-string matching. Use `P.when(...)` for now.
- Special aliases like `P.date`, `P.error`, `P.regexp`.
- Cycle protection for deeply cyclic value/pattern graphs.

## Object semantics

- Plain object patterns are partial by default.
- `P.exact(...)` is deep exact for object keys.
- Exactness is over enumerable own data keys on the value.
- Pattern keys use all own keys via `Reflect.ownKeys(...)`, including non-enumerable keys deliberately placed on the pattern.
- JavaScript object-literal `__proto__` syntax changes the pattern object's prototype instead of creating an own key. Use computed keys (`{ ['__proto__']: ... }`) when matching an own `__proto__` property.
- Value property reads use normal JS property access, so getters can run/throw.
- Object patterns match structurally through normal JavaScript property lookup, so own properties and prototype getters can match.
- Object pattern matching supports symbol keys.
- `P.record(...)` and `P.nonEmptyRecord(...)` are for plain record-like objects (`Object.prototype` or `null` prototype), not class instances, arrays, `Date`, `RegExp`, `Map`, or `Set`.

## Array/tuple semantics

- Bare arrays are exact tuple patterns.
- `P.tuple([...])` is an explicit tuple readability helper.
- `P.array(pattern)` is homogeneous variable-length.
- Empty arrays match `P.array(pattern)`.
- `P.nonEmptyArray(pattern)` requires at least one item.
- `P.rest(pattern)` is valid only as the final tuple pattern item.
- Readonly arrays/tuples should be preserved in handler types where TypeScript can infer them.

## Selection semantics

- No `P.select`: handler receives the matched value.
- One anonymous `P.select()`: handler receives the selected value.
- Named `P.select('name')`: handler receives an object of named selections.
- `P.select(name, pattern)` selects the current value only if it also matches `pattern`.
- Selections inside a matching `P.optional(...)` pattern capture `undefined` when the optional value is absent or explicitly `undefined`.
- Anonymous and named selections are intentionally not mixed in one pattern.
- Selection inside `P.exclude(...)` is invalid.

## matchBy semantics

- Supports direct keys, typed dot-string paths, and tuple paths.
- Dot paths always mean nesting; literal keys containing dots are not supported by dot syntax.
- Tuple paths exist for symbols and exact path segments.
- Missing optional path segments resolve to `undefined`, which can be handled as a discriminant.
- Runtime path reads use explicit property access after an `in` check, so prototype getters on class instances are supported for `matchBy(...)` paths.
- `matchBy(...).with(...).exhaustive()` is the default documentation shape for closed discriminated unions because it keeps contextual handler inference and avoids fresh object-map allocation in examples.
- `matchBy(...).cases({...})` is exhaustive/exact and returns immediately. Inline maps are compact DX, not hot-loop guidance. Hoisted object maps are the measured fast path for discriminant dispatch but often require explicit handler parameter types, so they should not be the default user-facing style.
- `matchBy(...).partial({...}).otherwise(...)` is partial and fallback-based.
- `matchBy(...).with(...)` supports multiple tags before the handler.
- Object-map `.cases({...})` supports string, number, symbol, and boolean tags when representable without collision.
- Tuple/grouped `.cases([...])` is the universal exact form and supports string, number, symbol, boolean, null, and undefined.
- Callback `.cases((group) => [...])` is the preferred grouped form when handlers need inferred values; the local `group` callback has full `matchBy` context and requires no TypeScript annotations.
- Exported group helper: `group(tagOrTags, handler)` remains available for reusable prebuilt groups, but standalone helpers cannot receive callback-contextual handler types from a later `cases(...)` call.

## Assertion helpers

- `isMatching(pattern, value)` and `isMatching(pattern)(value)` return type guards.
- `assertMatching(pattern, value)` throws `PatternMismatchError` or narrows the value after the call.
- `.exhaustive()` throws `NonExhaustiveMatchError` at runtime if unexpected data reaches an impossible branch.

## Compatibility principle

Favor the simplest behavior that is predictable at runtime, strongly typed in TypeScript, fast in hot paths, and easy to tree-shake. Divergences from ordinary JavaScript property and collection semantics should be deliberate and documented here.

Known v0 limitation to improve before public promotion:

- Standalone exported `group(...)` cannot receive contextual handler types from a later `.cases(...)` call due TypeScript inference limits. Prefer `.cases((group) => [...])` when grouped handlers should infer without annotations.

Current verification includes runtime tests, deterministic property-style tests, suite-inspired adversarial tests, adversarial type tests, diagnostic fixtures (`pnpm test:diagnostics`), checked examples, README local-link validation, package export smoke tests, coverage reporting, a native runtime benchmark, a dispatch-strategy benchmark (`pnpm bench:dispatch`), and a type-performance benchmark (`pnpm bench:types`). Object-map `.cases({...})` rejects broad discriminants, `null`/`undefined` tags, and normalized key collisions such as `true` vs `'true'` or `1` vs `'1'`; tuple/grouped entries remain the universal exact form. Runtime benchmarks measure both inline and hoisted object case maps because hoisting handlers is the realistic hot-path shape for allocation-sensitive code.

## Internal dispatch strategy

The source implementation intentionally avoids internal `switch` statements in `src/runtime.ts`. Benchmarks showed object-table and `Map` dispatch were usually slower in hot pattern-matching paths, while direct `if` branches were effectively tied with `switch` for primitive/pattern dispatch and kept the implementation aligned with the library philosophy. The benchmark-only files still contain `switch` variants so `pnpm bench:dispatch` can continue comparing strategies over time.

## Type-safety implementation policy

Non-const TypeScript assertions are forbidden across source, tests, benchmarks, and scripts. The only allowed assertion form is `as const`. Builder internals are split into sync and async implementations so terminal return types are modeled directly instead of forced through conditional-type casts. ESLint enforces the assertion policy through the local `local/no-non-const-assertions` rule, so `pnpm lint` and `pnpm check` cover it without a separate validation script.
