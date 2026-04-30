---
name: ts-match-usage
description: This skill should be used when an agent is writing or reviewing TypeScript code that uses ts-match (published as @diegogbrisa/ts-match) for pattern matching, exhaustive discriminated-union handling, promise-aware branching, runtime validation, grouped cases, pattern helpers, or boundary assertions.
---

# ts-match usage skill

## What the library is for

ts-match is a TypeScript-first pattern matching library with strong handler inference, exhaustive handling of closed unions, promise-aware terminals, runtime validation helpers, grouped discriminant cases, and zero runtime dependencies. Install and import it as `@diegogbrisa/ts-match`.

Use ts-match when code benefits from:

- exhaustive closed-union handling;
- narrowed handler parameters without casts;
- structural object/tuple/array/record matching;
- reusable runtime validators at boundaries;
- promise-backed inputs with one normalized terminal promise;
- discriminant/path dispatch through `matchBy`.

Keep simple `if` conditions when a normal condition is clearer.

## Primary public APIs

- `match(value)` — synchronous structural/value pattern matching.
- `match.promise(valueOrPromise)` — promise-aware structural/value matching. Resolves values, promises, thenables, and maybe-promise sources internally; handlers receive `Awaited<TInput>`.
- `matchBy(value, path)` — synchronous discriminant/path matching. Handlers receive the full narrowed input value.
- `matchBy.promise(valueOrPromise, path)` — promise-aware discriminant/path matching. Paths, tags, maps, groups, and handlers infer from `Awaited<TInput>`.
- `P` — namespace of reusable pattern helpers.
- Named `p*` helpers — focused named exports equivalent to `P.*` helpers.
- `group(...)` — reusable grouped `matchBy` case entry helper.
- `isMatching(pattern, value)` / `isMatching(pattern)(value)` — runtime type guards.
- `assertMatching(pattern, value)` — boundary assertion that throws `PatternMismatchError` on mismatch.
- `NonExhaustiveMatchError`, `PatternMismatchError` — public error classes.
- `MatchPromiseResult<T>` — safe promise terminal result: `{ ok: true; value: T } | { ok: false; error: unknown }`.

## Hard rules for agents

- Import only public APIs from `@diegogbrisa/ts-match` or documented package subpaths.
- Never import from `src`, `dist`, or internal files in user code.
- Do not invent helpers. Use only APIs listed here or in the README.
- Prefer `.with(...).exhaustive()` for closed unions.
- Use `.otherwise(...)` only when fallback behavior is intentional.
- Use `match.promise(...)` or `matchBy.promise(...)` when the source may be promise-backed, handlers may return promises, or callers need one normalized promise.
- Do not use unsafe TypeScript casts. Only `as const` is acceptable for literal preservation, such as reusable grouped tag arrays.
- Do not use broad `any` in examples or generated code.
- Do not use `switch` in generated examples unless explicitly writing a short before/after comparison requested by the user.
- Avoid inline object-map `.cases({...})` in hot loops. Prefer `.with(...).exhaustive()` unless the user explicitly accepts the manual-typing tradeoff of hoisted case maps.
- When TypeScript reports a `ts-match:` diagnostic, read that payload first and fix the modeled issue. Do not silence it with casts, `any`, or a rewrite to `switch`.

## Valid imports

Root import for normal usage:

```ts
import { assertMatching, group, isMatching, match, matchBy, P } from '@diegogbrisa/ts-match'
import type { MatchByPath, MatchedValue, MatchPromiseResult } from '@diegogbrisa/ts-match'
```

Focused subpaths:

```ts
import { match } from '@diegogbrisa/ts-match/match'
import { matchBy } from '@diegogbrisa/ts-match/match-by'
import { P, pString } from '@diegogbrisa/ts-match/patterns'
import { isMatching, assertMatching } from '@diegogbrisa/ts-match/assertions'
import { NonExhaustiveMatchError, PatternMismatchError } from '@diegogbrisa/ts-match/errors'
import { group } from '@diegogbrisa/ts-match/group'
```

There is no default export.

### Focused subpath type exports

Use these only when accepting/forwarding builders or writing library integrations. Most application code should rely on inference.

- `@diegogbrisa/ts-match/match`: `match`, `SyncMatchBuilder`, `PromiseMatchBuilder`, `MatchFunction`, `MatchedValue`, `MatchPromiseResult`.
- `@diegogbrisa/ts-match/match-by`: `matchBy`, `SyncMatchByBuilder`, `PromiseMatchByBuilder`, `MatchByBuilder`, `MatchByFunction`, `MatchByPath`, `MatchPromiseResult`.
- `@diegogbrisa/ts-match/patterns`: `P` and every public `p*` helper.
- `@diegogbrisa/ts-match/assertions`: `isMatching`, `assertMatching`.
- `@diegogbrisa/ts-match/errors`: `NonExhaustiveMatchError`, `PatternMismatchError`, `preview`, `MatchErrorMetadata`.
- `@diegogbrisa/ts-match/group`: `group`.

## Choosing the right matcher

Use `matchBy` when one key/path decides a discriminated union branch:

```ts
const next = matchBy(action, 'type')
  .with('start', (action) => startState(action.id))
  .with('success', (action) => readyState(action.rows))
  .with('failure', (action) => failedState(action.message))
  .exhaustive()
```

Use `match` when matching structure, tuples, arrays, predicates, selections, records, exact objects, or non-discriminant values:

```ts
const label = match(input)
  .with({ type: 'user', profile: { name: P.select('name', P.string) } }, ({ name }) => name)
  .with({ type: 'team', name: P.select('name', P.string) }, ({ name }) => name)
  .otherwise(() => 'unknown')
```

Use promise builders when the input may be async or when terminals should return promises:

```ts
const label = await matchBy
  .promise(fetchEvent(), 'type')
  .with('created', (event) => event.id)
  .otherwise(() => 'unknown')
```

Use sync `match(promise)` only if you intentionally want to match the `Promise` object itself.

## `match(value)` use cases

### Literal and structural branches

```ts
const label = match(value)
  .with('ready', () => 'ready')
  .with(0, () => 'zero')
  .with({ ok: true }, (value) => value.body)
  .otherwise(() => 'unknown')
```

Plain literals, object patterns, bare tuple arrays, and every `P.*` helper are valid patterns. Literal equality uses `Object.is`.

### Multiple patterns sharing one handler

```ts
const status = match(state)
  .with('idle', 'loading', () => 'pending')
  .with('success', () => 'done')
  .exhaustive()
```

### `.when(predicate, handler)`

Use `.when(...)` for value-level predicates that are easier to express as functions:

```ts
const label = match(value)
  .when(
    (value): value is number => typeof value === 'number' && value > 0,
    (value) => `positive:${value}`,
  )
  .otherwise(() => 'other')
```

Use `P.when(predicate)` when the predicate should be nested inside another pattern.

### `.otherwise(handler)`

Use `.otherwise(...)` for open inputs or intentional fallback behavior. The fallback receives the remaining unmatched value type.

```ts
const size = match(value)
  .with(P.string, (value) => value.length)
  .otherwise(() => 0)
```

### `.exhaustive()`

Use `.exhaustive()` for closed unions. TypeScript rejects it while known cases remain unhandled.

```ts
const text = match(result)
  .with({ type: 'success' }, (value) => value.data)
  .with({ type: 'error' }, (value) => value.message)
  .with({ type: 'idle' }, () => 'idle')
  .exhaustive()
```

At runtime, unexpected unhandled data throws `NonExhaustiveMatchError`.

### Selections

No `P.select`: handler receives the matched value.

```ts
match(user).with({ type: 'user' }, (user) => user.id)
```

One anonymous `P.select()`: handler receives the selected value.

```ts
match(user).with({ profile: { name: P.select() } }, (name) => name)
```

Named selections: handler receives an object of selected values.

```ts
match(user).with(
  { name: P.select('name', P.string), age: P.select('age', P.number) },
  ({ name, age }) => `${name}:${age}`,
)
```

Do not mix anonymous and named selections in one successful pattern.

## `match.promise(valueOrPromise)` use cases

Promise builders accept `T | PromiseLike<T>`, including thenables and maybe-promise sources. Handlers receive `Awaited<TInput>`.

```ts
type ApiResponse = { ok: true; body: string } | { ok: false; status: number; message: string }

declare function fetchResponse(): Promise<ApiResponse>

const body = await match
  .promise(fetchResponse())
  .with({ ok: true, body: P.select('body', P.string) }, async ({ body }) => body.trim())
  .with({ ok: false }, ({ message }) => message)
  .exhaustive()
```

Normal terminals reject for input rejection, pattern/predicate errors, handler throws/rejections, fallback throws/rejections, and defensive non-exhaustiveness. `.otherwise(...)` is only a pattern fallback; it does not catch input rejection.

### Promise normal terminals

```ts
const result: Promise<string> = match
  .promise(loadResult())
  .with({ type: 'success' }, (value) => value.data)
  .with({ type: 'error' }, async (value) => value.message)
  .with({ type: 'idle' }, () => 'idle')
  .exhaustive()
```

Handler return values are awaited and unwrapped, so `Promise<string>` and `string` branches produce `Promise<string>`.

### Promise safe terminals

Safe terminals exist only on promise builders.

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

- `safeExhaustive()` preserves compile-time exhaustiveness exactly like `.exhaustive()`.
- `safeOtherwise(handler)` requires a fallback handler; there is no no-argument form.
- Safe results have type `Promise<MatchPromiseResult<Output>>`.
- Safe success values are awaited before wrapping.
- Safe errors are `unknown` and are the original thrown/rejected reason when possible.

Use `safeExhaustive()` for closed unions where operational failures should be returned as values:

```ts
const result = await match
  .promise(fetchResult())
  .with({ type: 'success' }, (value) => value.data)
  .with({ type: 'error' }, (value) => value.message)
  .with({ type: 'idle' }, () => 'idle')
  .safeExhaustive()
```

## `matchBy(value, path)` use cases

`matchBy` reads a direct key, nested dot path, or tuple path and dispatches by the selected tag. Handlers receive the full input value narrowed by the tag.

### Direct keys

```ts
const label = matchBy(command, 'kind')
  .with('create', (command) => `create:${command.id}`)
  .with('rename', (command) => `rename:${command.id}:${command.name}`)
  .with('delete', (command) => `delete:${command.id}`)
  .exhaustive()
```

### Nested dot paths and tuple paths

```ts
const label = matchBy(event, 'meta.type')
  .with('click', (event) => `click:${event.meta.x}`)
  .with('submit', (event) => `submit:${event.meta.form}`)
  .exhaustive()
```

Use tuple paths for symbol keys or literal path segments that contain dots:

```ts
const label = matchBy(event, ['meta', EVENT_KIND])
  .with('user', (event) => event.meta.name)
  .with('system', (event) => String(event.meta.code))
  .exhaustive()
```

Autocomplete suggests finite tag-like paths. Broad scalar paths such as arbitrary `string` or `number` fields remain accepted manually but are not suggested as primary discriminants.

### `.with(...tags, handler)`

Use `.with(...)` for inference-friendly chained dispatch. One or more tags can share a handler.

```ts
const status = matchBy(event, 'type')
  .with('start', 'resume', (event) => `active:${event.id}`)
  .with('stop', (event) => `stopped:${event.reason}`)
  .exhaustive()
```

### `.cases({...})` object maps

Use object maps for compact exhaustive maps when tags are representable as object keys and there are no normalized key collisions.

```ts
const label = matchBy(command, 'kind').cases({
  create: (command) => `create:${command.id}`,
  rename: (command) => `rename:${command.id}:${command.name}`,
  delete: (command) => `delete:${command.id}`,
})
```

Avoid object maps for `null`, `undefined`, or collisions like `1` and `'1'`; use tuple/grouped cases instead. Avoid bare `__proto__:` object-literal syntax because JavaScript treats it specially; use computed `['__proto__']`, tuple entries, or grouped cases when that tag matters.

### `.cases((group) => [...])` callback groups

Use callback groups when several tags share a handler and you want contextual narrowed handler inference.

```ts
const status = matchBy(event, 'type').cases((group) => [
  group('start', 'resume', (event) => `active:${event.id}`),
  group('stop', (event) => `stopped:${event.reason}`),
  group('error', (event) => `error:${event.message}`),
])
```

This form supports single-tag groups, variadic multi-tag groups, and array-form groups. Prefer variadic tags for editor autocomplete.

### `.cases([...])` tuple/grouped entry arrays

Use entry arrays when cases are generated, need universal tag support, or are easier to read as tuples.

```ts
type State =
  | { kind: 'ready'; data: string }
  | { kind: 'failed'; reason: string }
  | { kind: null }
  | { kind?: undefined }

declare const state: State

const label = matchBy(state, 'kind').cases([
  ['ready', (state) => state.data],
  [[null, undefined] as const, () => 'empty'],
  ['failed', (state) => state.reason],
])
```

Valid entries:

- `[tag, handler]`;
- `[[tag1, tag2] as const, handler]`;
- `group(tag, handler)`;
- `group(tag1, tag2, ...moreTags, handler)`;
- `group(tags, handler)`.

Only statically known array tags prove exhaustiveness. Broad runtime arrays are runtime-valid but do not prove coverage. Inline tuple-entry arrays contextually infer handlers from their sibling tags. Exported `group(...)` entries are useful for reusable structures but can need explicit handler parameter annotations; use callback `.cases((group) => [...])` when you want grouped entries with the strongest annotation-free handler inference.

### `.partial(...).otherwise(...)`

Use `.partial(...)` when only some tags need special behavior before a fallback.

```ts
const label = matchBy(action, 'type')
  .partial({ save: (action) => `save:${action.documentId}` })
  .otherwise((remaining) => `fallback:${remaining.type}`)
```

`.partial(...)` accepts object maps and tuple/grouped entry arrays:

```ts
const label = matchBy(action, 'type')
  .partial([
    ['save', (action) => `save:${action.documentId}`],
    [['rename', 'duplicate'] as const, (action) => `copy:${action.documentId}`],
  ])
  .otherwise((remaining) => `fallback:${remaining.type}`)
```

Callback grouped cases are for exhaustive `.cases(...)`; use `.partial([...])` with tuple entries or exported `group(...)` for partial grouped behavior.

## `matchBy.promise(valueOrPromise, path)` use cases

`matchBy.promise(...)` mirrors `matchBy(...)`, but resolves the input internally and returns promises from terminal methods. Path, tag, case-map, partial-map, and grouped-case inference all use `Awaited<TInput>`.

```ts
const description = await matchBy
  .promise(fetchJob(), 'type')
  .with('queued', async (job) => `queued:${job.id}`)
  .with('finished', (job) => `finished:${job.id}`)
  .with('failed', (job) => `failed:${job.reason}`)
  .exhaustive()
```

All synchronous `matchBy` case shapes are available:

```ts
const compact = await matchBy.promise(fetchJob(), 'type').cases({
  queued: async (job) => `queued:${job.id}`,
  finished: (job) => `finished:${job.id}`,
  failed: (job) => `failed:${job.reason}`,
})

const partial = await matchBy
  .promise(fetchJob(), 'type')
  .partial({ queued: (job) => `queued:${job.id}` })
  .otherwise((job) => `fallback:${job.id}`)

const grouped = await matchBy
  .promise(fetchJob(), 'type')
  .cases((group) => [group('queued', 'finished', (job) => job.id), group('failed', (job) => job.reason)])
```

Normal terminals reject for input rejection, path-read errors, handler throws/rejections, fallback throws/rejections, and defensive non-exhaustiveness. `.otherwise(...)` is only a tag fallback; it does not catch input rejection.

Promise-safe terminals mirror `match.promise`:

```ts
const result = await matchBy
  .promise(fetchJob(), 'type')
  .with('queued', (job) => job.id)
  .safeOtherwise(() => 'unknown')

const exhaustive = await matchBy
  .promise(fetchJob(), 'type')
  .with('queued', (job) => job.id)
  .with('finished', (job) => job.id)
  .with('failed', (job) => job.reason)
  .safeExhaustive()
```

## `group(...)` use cases

Prefer callback `group` for inferred handler parameters:

```ts
const status = matchBy(event, 'type').cases((group) => [
  group('start', 'resume', (event) => `active:${event.id}`),
  group('stop', (event) => `stopped:${event.reason}`),
])
```

Use exported `group(...)` for reusable prebuilt groups, especially when handlers do not need narrowed parameters or are explicitly annotated:

```ts
const statusCases = [group(['start', 'resume'] as const, () => 'active'), group('stop', () => 'inactive')]
```

Supported forms:

- `group(tag, handler)` — one tag.
- `group(tag1, tag2, ...moreTags, handler)` — two or more tags; best inline autocomplete.
- `group(tags, handler)` — array/tuple tags; best when tags are reusable.

Array-form groups remain supported and are often more readable because `group` keeps two arguments. TypeScript gives better editor completions in variadic tag positions than inside `group(['...'], handler)`, so prefer variadic form when inline autocomplete matters. For exhaustiveness, array-form tags must be statically known: inline arrays and reusable `as const` arrays count as covered tags; broad runtime arrays do not prove coverage.

## Pattern helpers

`P` namespace helpers:

- `P._`, `P.any` — wildcard helpers that match anything.
- `P.string`, `P.number`, `P.boolean`, `P.bigint`, `P.symbol`, `P.null`, `P.undefined` — primitive helpers.
- `P.nan`, `P.finite`, `P.integer` — numeric helpers.
- `P.union(...patterns)` — matches any listed pattern.
- `P.exclude(pattern)` — matches values that do not match the nested pattern; cannot contain selections.
- `P.optional(pattern)` — matches an absent object property, `undefined`, or the nested pattern.
- `P.array(pattern)` — variable-length arrays where every item matches; selections inside are rejected.
- `P.nonEmptyArray(pattern)` — same as `P.array(...)` but requires at least one item.
- `P.tuple([...])` — explicit exact tuple pattern.
- `P.rest(pattern)` — remaining tuple items; valid only as the final tuple item.
- `P.exact(pattern)` — deep exact object pattern rejecting enumerable own extra value keys.
- `P.when(predicate)` — nested predicate or type guard pattern.
- `P.instanceOf(Constructor)` — `instanceof` pattern for classes/errors.
- `P.select()` — anonymous selection.
- `P.select(name)` — named selection of the current value.
- `P.select(name, pattern)` — named selection after nested validation.
- `P.record(keyPattern, valuePattern)` — plain record-like objects; empty records match.
- `P.nonEmptyRecord(keyPattern, valuePattern)` — plain record-like objects with at least one key.

Named helper exports mirror `P` helpers:

- `pWildcard`, `pAny`, `pString`, `pNumber`, `pBoolean`, `pBigint`, `pSymbol`, `pNull`, `pUndefined`
- `pNan`, `pFinite`, `pInteger`
- `pUnion`, `pExclude`, `pOptional`
- `pArray`, `pNonEmptyArray`, `pTuple`, `pRest`
- `pExact`, `pWhen`, `pInstanceOf`, `pSelect`, `pRecord`, `pNonEmptyRecord`

Use named helpers when codebases prefer focused imports or want helper usage visible to bundlers.

## Runtime guards and assertions

### `isMatching`

```ts
const isUser = isMatching({ type: 'user', id: P.string })
const users = values.filter(isUser)

if (isMatching({ type: 'user', id: P.string }, payload)) {
  payload.id
}
```

Use `isMatching` for filters, conditional branches, and non-throwing runtime validation. It supports direct and curried forms.

### `assertMatching`

```ts
const payload: unknown = JSON.parse(raw)
assertMatching({ type: 'user', id: P.string }, payload)
payload.id
```

Use `assertMatching` at boundaries where mismatch should throw: parsed JSON, IPC payloads, storage reads, test fixtures, CLI arguments, and external events. A mismatch throws `PatternMismatchError`.

## Error and diagnostic APIs

- `NonExhaustiveMatchError` — thrown by `.exhaustive()` and exhaustive `matchBy(...).cases(...)` when runtime data reaches an unhandled branch. Exposes `matcher`, `path`, `tag`, `valuePreview`, and non-enumerable `value`.
- `PatternMismatchError` — thrown by `assertMatching(...)`. Exposes `valuePreview`, `patternPreview`, and non-enumerable `value`/`pattern`.
- `preview(value)` — low-level diagnostic helper from the errors subpath. Prefer error classes in normal app code.
- `MatchErrorMetadata` — metadata interface used by `NonExhaustiveMatchError`.

## Responding to `ts-match:` diagnostics

`ts-match` intentionally shapes common invalid usage into readable TypeScript diagnostics whose messages start with `ts-match:`. When helping a user or fixing generated code:

1. Read the `ts-match:` message before the surrounding TypeScript overload noise.
2. Apply the suggested fix directly.
3. Do not add unsafe casts, broad `any`, or manual type assertions to bypass the diagnostic.
4. Do not replace `matchBy` with `switch` just to silence an error.
5. Re-run the typecheck after fixing the modeled problem.

Common diagnostic fixes:

- `ts-match: match is not exhaustive` / `ts-match: matchBy is not exhaustive` — add missing `.with(...)` / grouped cases, or use `.otherwise(...)` only when fallback behavior is intentional.
- `ts-match: invalid matchBy path` — fix the direct key, dot path, or tuple path. Use tuple paths for symbol keys or keys containing `.`.
- `ts-match: this matchBy tag cannot occur` — remove the impossible tag or correct the path.
- `ts-match: object-map cases are missing required key(s)` — add missing handlers or change to `.partial(...).otherwise(...)`.
- `ts-match: object-map case contains an extra key` — remove the extra key or fix the discriminant path.
- `ts-match: object-map cases cannot represent null or undefined tags` / key collision diagnostics — use tuple-entry cases or callback grouped cases instead of an object map.
- `ts-match: repeated container patterns cannot contain P.select(...)` — move the selection outside `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, or `P.nonEmptyRecord(...)`.
- `ts-match: P.exclude(pattern) cannot contain P.select(...)` — remove the selection or move it outside the excluded pattern.
- `ts-match: invalid P.rest(...) usage` — use `P.rest(...)` only as the final tuple pattern item.

If grouped-case inference is weak, prefer `.cases((group) => [...])` and the variadic local form `group('a', 'b', handler)`. Do not treat `group(['a', 'b'], handler)` as invalid; it is supported, just less reliable for inline autocomplete. Use exported `group(...)` for reusable groups whose handlers do not need contextual variant inference.

## Important limitations

- `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, and `P.nonEmptyRecord(...)` reject `P.select(...)` because captures may repeat ambiguously.
- `P.exclude(...)` cannot contain selections.
- `P.rest(...)` is valid only as the final tuple pattern item.
- `P.record(...)` and `P.nonEmptyRecord(...)` target plain record-like objects, not arrays, class instances, maps, sets, dates, regexps, or primitives.
- Dot paths always mean nesting. Use tuple paths for symbols and literal segments containing dots.
- Object patterns use normal JavaScript property lookup, so getters can run or throw and inherited properties can match.
- `P.exact(...)` rejects enumerable own extra keys on values, but it is not a cyclic graph matcher.
- Object-map `.cases({...})` cannot represent `null`, `undefined`, or normalized key collisions. Avoid bare `__proto__:` object-literal syntax; use computed `['__proto__']`, tuple/grouped entries, or callback grouped cases.
- Standalone exported `group(...)` cannot always infer handler parameter types from a later `.cases(...)` call. Use callback-local `group` for annotation-free grouped handlers.
- No structural `Map`/`Set` helper exists. Use `P.instanceOf(Map)` / `P.instanceOf(Set)` plus `P.when(...)` for custom checks.
- No RegExp string helper exists. Use `P.when(...)`.

## Anti-patterns

- Importing internal files.
- Using undocumented helper aliases.
- Adding casts to force handler types instead of changing the pattern, path, or callback `group` shape.
- Using sync `match` with promise-returning handlers when callers expect one normalized promise.
- Awaiting promise-producing sources before `match.promise(...)` or `matchBy.promise(...)` when passing the source directly would keep inference and error handling simpler.
- Using inline `.cases({...})` inside hot loops.
- Recommending hoisted case maps that require manual handler annotations as normal user-facing code.
- Using object-map `.cases({...})` for `null`, `undefined`, bare `__proto__:` syntax, or normalized key collisions.
- Selecting inside repeated contexts such as arrays or records.
- Writing examples that are not compiled against the installed package.

## Validation checklist

Before introducing or modifying ts-match usage:

1. Confirm every imported symbol is listed in this skill or README.
2. Confirm examples import only from package root or documented subpaths.
3. Confirm closed unions use `.exhaustive()` or exhaustive `.cases(...)`.
4. Confirm promise-backed sources or promise-returning handlers use `match.promise` or `matchBy.promise` when callers need promises.
5. Confirm safe terminals are used only on promise builders.
6. Confirm `safeOtherwise(...)` always has a fallback handler.
7. Confirm `matchBy.promise(...)` path/tag/case/group inference is based on the resolved input type.
8. Confirm no unsafe casts, broad `any`, internal imports, unsupported helper names, or `switch` rewrites were added.
9. Compile the affected project examples/tests.
10. If editing this library itself, run `pnpm check`, `pnpm pack:check`, and `pnpm test`.
11. If changing public types or overloads, ensure `pnpm test:editor-dx` is covered by `pnpm check` and verify packaged `dist/*.d.ts` autocomplete when relevant.
