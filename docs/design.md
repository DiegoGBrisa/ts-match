# ts-match design decisions

## Product goal

ts-match is a TypeScript-first pattern matching library for frontend, backend, library, and CLI code. It focuses on small runtime code, tree-shakable ESM output, script-friendly CommonJS compatibility, strong TypeScript inference, and zero runtime dependencies. Install it from npm as `@diegogbrisa/ts-match`.

The canonical API is:

```ts
import { match, matchBy, P } from '@diegogbrisa/ts-match'
```

User-facing guide: [`../README.md`](../README.md). Checked examples: [`../examples`](../examples). Agent skill: [`../SKILL.md`](../SKILL.md).

## Locked API decisions

- Brand/name: ts-match.
- Published npm package: `@diegogbrisa/ts-match`.
- Runtime dependencies: none.
- Module format: ESM-first package with CommonJS compatibility exports for scripts and tooling.
- Runtime target: Node 20+ and modern browsers/bundlers.
- Tree-shaking: `sideEffects: false`, root exports plus focused subpath exports, `P` namespace plus `p*` named helper exports.
- Fluent method: `.with(...)`.
- Fallback: `.otherwise(...)`.
- Exhaustive terminal: `.exhaustive()`.
- Promise normalization is explicit: `match.promise(...)` and `matchBy.promise(...)` resolve value, promise, thenable, and maybe-promise inputs internally; handlers receive `Awaited<TInput>`, terminal values are promise-normalized, normal terminals reject normally, and safe terminals return `MatchPromiseResult<T>`.
- `matchBy(value, path)` is the differentiator for discriminated unions and nested discriminants.

## v1.x roadmap principle

v1.x roadmap work should be additive-only public API work. New pattern helpers, safe terminals, and type refinements can ship in v1.x when they preserve current runtime behavior, TypeScript inference expectations, ESM-first packaging with CommonJS compatibility exports, Node 20+ targeting, zero runtime dependencies, and performance posture. Changes to existing pattern semantics, selection rules, property-path behavior, exhaustiveness behavior, or fallback behavior require a separate design decision before they can ship.

The first v1.x roadmap batch is limited to convenience pattern helpers and ships as one release, including date/time and Temporal helpers. The batch includes `P.regex`, `P.date`, `P.error`, `P.regexp`, `P.nullish`, `P.falsy`, `P.truthy`, and the Temporal helpers listed below. `P.not` is intentionally not planned because `P.exclude(...)` is the canonical negative helper and aligns with TypeScript's `Exclude<T, U>` mental model.

Every new `P.*` helper in the first v1.x batch must also have the matching named `p*` export to preserve the package's established namespace-plus-named-helper API symmetry.

The same namespace-plus-named-helper symmetry applies to collection captures: `P.collect(...)` ships with `pCollect(...)` and a public `CollectPattern` type.

Helper semantics:

- `P.regex(regex)` accepts only a `RegExp` instance. It is string-only: it matches values where `typeof value === 'string'` and the supplied regular expression matches the string; it does not coerce non-string values. It is deterministic for stateful regular expressions: matching starts from `lastIndex = 0` and restores the caller's original `lastIndex` after evaluation.
- `P.date` matches valid `Date` instances only, equivalent to `value instanceof Date && !Number.isNaN(value.getTime())`. Invalid `Date` instances remain matchable with `P.instanceOf(Date)` when callers want constructor-level matching.
- `P.error` matches `Error` instances, including subclasses such as `TypeError`, `RangeError`, and custom errors.
- `P.regexp` matches `RegExp` instances only. It is distinct from `P.regex(regex)`: `P.regexp` matches regular expression objects, while `P.regex(regex)` matches strings accepted by a regular expression.
- `P.nullish` matches exactly `null | undefined`. It does not match missing object properties unless wrapped in `P.optional(...)`.
- `P.falsy` follows JavaScript truthiness exactly and matches values where `!value` is `true`, including `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, and `NaN`. It does not match truthy containers or wrappers such as `[]`, `{}`, `'0'`, `'false'`, or `new Boolean(false)`.
- `P.truthy` follows JavaScript truthiness exactly and matches values where `Boolean(value)` is `true`.
- Date/time helper work should ship with Temporal support rather than treating Temporal as a later unrelated feature. Temporal helpers must remain dependency-free and should not require the library to polyfill `globalThis.Temporal`.
- `P.temporal` matches any recognized Temporal value object and remains separate from `P.date`; legacy `Date` instances do not match `P.temporal`, and Temporal objects do not match `P.date`. Specific planned helpers are `P.temporalInstant`, `P.temporalPlainDate`, `P.temporalPlainTime`, `P.temporalPlainDateTime`, `P.temporalZonedDateTime`, `P.temporalDuration`, `P.temporalPlainYearMonth`, and `P.temporalPlainMonthDay`.
- When `globalThis.Temporal` is unavailable, Temporal helpers match nothing. They must not throw at module import time, pattern construction time, or match evaluation time merely because the runtime does not provide Temporal.
- Temporal helpers use real constructor identity when Temporal constructors are available, for example `value instanceof globalThis.Temporal.PlainDate`. They do not accept duck-typed objects or spoofed `Symbol.toStringTag` values.
- Temporal helper public types should not force consumers to include TypeScript's `ESNext.Temporal` lib. The README is the user-facing documentation source and must explain the runtime/type compatibility tradeoff clearly: runtime matching depends on available Temporal constructors or a caller-provided polyfill, while declaration compatibility should remain usable for projects that do not include global Temporal types yet. Design details can also live in this document, but user-facing behavior belongs in the README.

Helper type behavior should match what TypeScript can represent honestly. `P.nullish` removes `null | undefined` from remaining unions. `P.falsy` removes statically representable falsy literals (`false | 0 | 0n | '' | null | undefined`) from remaining unions; `NaN` is runtime-only because TypeScript has no `NaN` literal type. `P.truthy` narrows by excluding statically representable falsy literals. `P.regex(regex)` narrows matched payloads to `string` but does not prove coverage of arbitrary string sublanguages. `P.date`, `P.error`, `P.regexp`, and Temporal helpers narrow to their corresponding public helper types while preserving declaration compatibility. `P.literal(value)` covers primitive literals but does not prove exhaustiveness for object/function/array references because TypeScript cannot prove runtime identity. Homogeneous `P.map(...)` and `P.set(...)` can narrow and cover compatible concrete `Map`/`Set` types; required-entry/value modes narrow compatible collections but remain non-exhaustive because TypeScript cannot represent required Map/Set contents or exact consumed entry counts.
Map/Set type narrowing also accepts `ReadonlyMap` and `ReadonlySet` annotations, preserving readonly handler types even though runtime matching still checks actual `Map`/`Set` instances.

Release acceptance for this helper batch includes public API exports, README documentation, runtime tests, type tests, Temporal declaration compatibility coverage, no-Temporal fallback coverage on runtimes without `globalThis.Temporal`, native Temporal runtime coverage on Node 26 and Temporal-capable browser lanes, export smoke/package checks, at least one natural checked example, and an updated root `SKILL.md` so downstream coding agents learn the new version's public helper surface before release. Track the helper batch as a single implementation issue so date/time, Temporal, docs, examples, tests, and agent skill updates land together in one coherent v1.x release.

Collection helper design:

- `P.map(keyPattern, valuePattern)` matches actual `Map` instances only, using `value instanceof Map`. It does not match plain objects, entry arrays, or duck-typed map-like objects.
- `P.map(...)` supports both homogeneous maps (`P.map(keyPattern, valuePattern)`, where every entry must match the same key and value patterns) and variadic entry-pattern maps (`P.map([keyPattern, valuePattern], [keyPattern, valuePattern], ...)`). Entry-pattern maps are partial by default, mirroring object pattern semantics: a map may contain extra entries unless wrapped in exact matching semantics. Ambiguous homogeneous tuple key/value patterns should use explicit `P.tuple(...)`, for example `P.map(P.tuple([P.string, P.number]), P.tuple([P.boolean, P.boolean]))`, because top-level array pairs in `P.map(...)` are interpreted as entry patterns.
- Entry-pattern `P.map(...)` clauses consume distinct runtime entries. One actual Map entry cannot satisfy multiple top-level entry clauses; repeated broad clauses therefore express cardinality, and exact matching can reason about matched entry counts predictably.
- Entry-pattern `P.map(...)` matching is deterministic: evaluate entry clauses left to right, and for each clause scan Map entries in insertion order for the first unused entry that satisfies the key and value patterns.
- `P.exact(P.map(...entries))` rejects extra Map entries beyond the distinct entries consumed by the entry clauses. `P.exact(P.map(keyPattern, valuePattern))` adds no extra constraint beyond homogeneous matching because homogeneous matching already checks every runtime entry and does not express required cardinality.
- Map key and value positions accept the normal public pattern grammar, including plain literal patterns and `P.union(...)`. `P.literal(value)` lets callers express exact value/reference identity for object, function, or array keys without changing the existing structural meaning of plain object patterns.
- `P.select(...)` remains rejected inside `P.map(...)`, consistent with repeated-container restrictions. Use the explicit `P.collect(...)` collection-capture helper for aggregate Map key/value captures rather than overloading `P.select(...)`.
- `P.set(...)` mirrors the Map API shape. `P.set(valuePattern)` is homogeneous and requires every Set value to match the same pattern. `P.set(valuePattern, ...moreValuePatterns)` is required-value mode and requires distinct Set values matching each top-level value pattern, with extra values allowed unless wrapped in exact matching semantics. Ambiguous tuple value patterns should use explicit `P.tuple(...)`.
- Required-value `P.set(...)` clauses consume distinct runtime values and match deterministically: evaluate value patterns left to right, scanning Set values in insertion order for the first unused value that satisfies each pattern.
- `P.exact(P.set(...requiredValues))` rejects extra Set values beyond the distinct values consumed by the required-value clauses. `P.exact(P.set(valuePattern))` adds no extra constraint beyond homogeneous matching because homogeneous matching already checks every runtime value and does not express required cardinality.
- `P.select(...)` remains rejected inside `P.set(...)`, consistent with repeated-container restrictions. Use the explicit `P.collect(...)` collection-capture helper for aggregate Set value captures.

## Pattern helpers

Canonical namespace: `P`.

Named exports use a `p` prefix for tree-shaking-sensitive users, for example `pString`, `pUnion`, `pSelect`.

Supported helpers:

- `P._` / `P.any`
- `P.string`, `P.number`, `P.boolean`, `P.bigint`, `P.symbol`, `P.null`, `P.undefined`
- `P.nan`, `P.finite`, `P.integer`
- `P.regex(regex)`
- `P.date`, `P.error`, `P.regexp`, `P.nullish`, `P.falsy`, `P.truthy`
- `P.temporal`, `P.temporalInstant`, `P.temporalPlainDate`, `P.temporalPlainTime`, `P.temporalPlainDateTime`, `P.temporalZonedDateTime`, `P.temporalDuration`, `P.temporalPlainYearMonth`, `P.temporalPlainMonthDay`
- `P.literal(value)`
- `P.union(...)`
- `P.exclude(pattern)`
- `P.optional(pattern)`
- `P.array(pattern)`
- `P.nonEmptyArray(pattern)`
- `P.map(keyPattern, valuePattern)` and `P.map([keyPattern, valuePattern], ...)`
- `P.set(valuePattern)` and `P.set(valuePattern, ...moreValuePatterns)`
- bare tuple arrays and `P.tuple([...])`
- `P.rest(pattern)` as the final tuple item
- `P.exact(pattern)`
- `P.when(predicate)` and `.when(predicate, handler)`
- `P.instanceOf(Constructor)`
- `P.select()`, `P.select(name)`, `P.select(name, pattern)`
- `P.collect(name, pattern)`
- `P.select(...)` is intentionally rejected inside `P.exclude(...)`, `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, `P.nonEmptyRecord(...)`, `P.map(...)`, and `P.set(...)` because those contexts can invert, skip, or repeat captures ambiguously.
- `P.record(keyPattern, valuePattern)`
- `P.nonEmptyRecord(keyPattern, valuePattern)`

Out of scope for the current helper batches:

- Cycle protection for deeply cyclic value/pattern graphs.

## Object semantics

- Plain object patterns are partial by default.
- `P.exact(...)` is deep exact for object keys and rejects extra unconsumed entries/values in required Map/Set mode.
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
- Collection captures are distinct from selections: `P.collect(name, pattern)` is named-only, valid only inside repeated container patterns (`P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, `P.nonEmptyRecord(...)`, `P.map(...)`, and `P.set(...)`), and contributes named arrays to the handler payload.
- Collection captures may mix with named `P.select(...)` captures in the same pattern, producing one object handler payload with named single values and named arrays. Collection captures do not mix with anonymous `P.select()` because anonymous selection replaces the handler payload shape.
- Multiple `P.collect(...)` captures with the same name append into the same handler-payload array. A `P.collect(...)` name must not collide with a `P.select(...)` name because one field cannot be both a single selected value and a collected array.
- Handler payload inference for `P.collect(name, pattern)` contributes `name: T[]`, where `T` is the value matched by the inner pattern. Duplicate `P.collect(...)` names merge by unioning their element types, for example repeated `P.collect('values', P.string)` and `P.collect('values', P.number)` produce `values: (string | number)[]`.
- Collection captures do not add special exhaustiveness behavior. Exhaustiveness and remaining-union reduction are determined by the inner pattern exactly as if the collection capture were a normal matching wrapper.
- Collection capture order follows JavaScript iteration order: array index order for arrays, `Object.keys(value)` order for records, Map insertion order for maps, and Set insertion order for sets. Required-entry `P.map(...)` and required-value `P.set(...)` collect from the entries/values consumed by each top-level pattern clause in clause order.
- Empty repeated containers that match still provide empty arrays for collection-capture names present in the repeated item/key/value pattern. For example, `P.array(P.collect('ids', P.string))` matches `[]` with a handler payload of `{ ids: [] }`.
- Collection captures are position-aware: array items, record keys, record values, Map keys, Map values, and Set values can each contain `P.collect(...)`, and the captured value is the current item/key/value at that position.
- Homogeneous Map and Set patterns collect from every matching runtime entry/value because the homogeneous pattern checks every entry/value. Required-entry Map and required-value Set patterns collect only from the distinct entries/values consumed by their top-level clauses; extra entries/values allowed by partial matching are not inspected for collection captures.
- `P.collect(name, pattern)` is a normal matching capture, not a filter. The inner `pattern` must match for the surrounding repeated pattern to match; mixed repeated values should use `P.union(...)` or another explicit pattern that accepts each allowed item/value shape.
- `P.collect(...)` works inside `P.union(...)` when the union appears inside a repeated container. Only the collection captures from the union option that actually matches are committed; failed union options must not leak partial captures.
- `P.collect(...)` follows existing optional-selection semantics inside `P.optional(...)`: if an optional property is absent or explicitly `undefined` in a matching repeated item, the collection capture appends `undefined` and the captured array type includes `undefined`.
- Collection captures are invalid inside `P.exclude(...)`, including when the negative pattern appears inside a repeated container, because negative matching has no positive matched value to capture.
- Collection captures are branch-local and commit only when the surrounding pattern succeeds. Failed repeated-container matches, failed union options, and failed required Map/Set clauses must discard tentative collection captures before matching continues to later branches or fallbacks.

## matchBy semantics

- Supports direct keys, typed dot-string paths, and tuple paths.
- String and tuple path arguments are autocomplete-friendly for known input types and suggest direct/nested paths whose resolved value is a finite tag-like union. Broad payload leaves such as `string` or `number` can still be typed explicitly, but they are not suggested as primary discriminant paths.
- Dot paths always mean nesting; literal keys containing dots are not supported by dot syntax.
- Tuple paths exist for symbols and exact path segments.
- Missing optional path segments resolve to `undefined`, which can be handled as a discriminant.
- Runtime path reads use explicit property access after an `in` check, so prototype getters on class instances are supported for `matchBy(...)` paths.
- `matchBy(...).with(...).exhaustive()` is the default documentation shape for closed discriminated unions because it keeps contextual handler inference and avoids fresh object-map allocation in examples.
- `matchBy(...).cases({...})` is exhaustive/exact and returns immediately. Inline maps are compact DX, not hot-loop guidance. Hoisted object maps are the measured fast path for discriminant dispatch but often require explicit handler parameter types, so they should not be the default user-facing style.
- `matchBy(...).partial({...}).otherwise(...)`, `matchBy(...).partial([...]).otherwise(...)`, and `matchBy(...).partial((group) => [...]).otherwise(...)` are partial and fallback-based.
- `matchBy(...).with(...)` supports multiple tags before the handler.
- Object-map `.cases({...})` supports string, number, symbol, and boolean tags when representable without collision.
- Tuple/grouped `.cases([...])` is the universal exact form and supports string, number, symbol, boolean, null, and undefined. Exhaustive coverage only counts statically known tags; broad runtime tag arrays do not prove that every tag is present.
- Callback `.cases((group) => [...])` and `.partial((group) => [...])` are the preferred grouped forms when handlers need inferred values; the local `group` callback has full `matchBy` context and requires no TypeScript annotations.
- Callback `group(tag, handler)` handles one tag. Callback `group(tag1, tag2, ...moreTags, handler)` handles two or more tags and is the best editor-autocomplete shape while typing tags.
- Callback `group([tag, tag], handler)` remains supported without `as const` and is often more visually tidy because `group` has only two arguments. Inline static arrays count toward exhaustiveness, but editors may not provide the same literal completions inside the nested array. Broad runtime arrays are accepted by runtime normalization but intentionally do not count as exhaustive coverage because TypeScript cannot know which tags they contain.
- Exported group helper: `group(tag, handler)`, `group(tag1, tag2, ...moreTags, handler)`, and `group(tags, handler)` remain available for reusable prebuilt groups, but standalone helpers cannot receive callback-contextual handler types from a later `cases(...)` or `partial(...)` call.

## Assertion helpers

- `isMatching(pattern, value)` and `isMatching(pattern)(value)` return type guards.
- `assertMatching(pattern, value)` throws `PatternMismatchError` or narrows the value after the call.
- `.exhaustive()` throws `NonExhaustiveMatchError` at runtime if unexpected data reaches an impossible branch.

## Compatibility principle

Favor the simplest behavior that is predictable at runtime, strongly typed in TypeScript, fast in hot paths, and easy to tree-shake. Divergences from ordinary JavaScript property and collection semantics should be deliberate and documented here.

Known TypeScript/editor limitations:

- Standalone exported `group(...)` cannot receive contextual handler types from a later `.cases(...)` call due to TypeScript inference limits. Prefer `.cases((group) => [...])` when grouped handlers should infer without annotations.
- Variadic callback groups provide the best grouped-tag autocomplete. Array-form callback groups are supported without const assertions, but in-array completions can be weaker.
- Inline tuple/grouped entry arrays preserve tag inference without const assertions. Partial grouped arrays preserve tag autocomplete; exhaustive grouped `.cases([...])` prioritizes missing-case diagnostics while the list is incomplete. Broad runtime arrays are accepted at runtime but cannot prove exhaustive coverage.

Current verification includes runtime tests, deterministic property-style tests, suite-inspired adversarial tests, adversarial type tests, diagnostic fixtures (`pnpm test:diagnostics`), checked examples, README local-link validation, package export smoke tests, coverage reporting, a native runtime benchmark, a dispatch-strategy benchmark (`pnpm bench:dispatch`), and a type-performance benchmark (`pnpm bench:types`). Object-map `.cases({...})` rejects broad discriminants, `null`/`undefined` tags, and normalized key collisions such as `true` vs `'true'` or `1` vs `'1'`; tuple/grouped entries remain the universal exact form. Runtime benchmarks measure both inline and hoisted object case maps because hoisting handlers is the realistic hot-path shape for allocation-sensitive code.

## Internal dispatch strategy

The source implementation intentionally avoids internal `switch` statements in `src/runtime/index.ts`. Benchmarks showed object-table and `Map` dispatch were usually slower in hot pattern-matching paths, while direct `if` branches were effectively tied with `switch` for primitive/pattern dispatch and kept the implementation aligned with the library philosophy. The benchmark-only files still contain `switch` variants so `pnpm bench:dispatch` can continue comparing strategies over time.

## Type-safety implementation policy

Non-const TypeScript assertions are forbidden across source, tests, benchmarks, and scripts. The only allowed assertion form is `as const`. Builder internals are split into sync and promise-aware implementations so terminal return types are modeled directly instead of forced through conditional-type casts. ESLint enforces the assertion policy through the local `local/no-non-const-assertions` rule, so `pnpm lint` and `pnpm check` cover it without a separate validation script.
