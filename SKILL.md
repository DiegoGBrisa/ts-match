---
name: ts-match-usage
description: This skill should be used when an agent is writing or reviewing TypeScript code that uses ts-match (published as @diegogbrisa/ts-match) for pattern matching, exhaustive discriminated-union handling, async branching, runtime validation, or boundary assertions.
---

# ts-match usage skill

## What the library is for

Use ts-match for TypeScript-first pattern matching with strong handler inference, exhaustive handling of closed unions, explicit async terminals, and runtime validation helpers. Install and import it as `@diegogbrisa/ts-match`.

Primary APIs:

- `match(value)` — structural/value pattern matching.
- `match.async(value)` — async structural/value matching with promise-normalized terminals.
- `matchBy(value, path)` — discriminant/path matching while handlers receive the full narrowed value.
- `matchBy.async(value, path)` — async discriminant/path matching.
- `P` — namespace of pattern helpers.
- `isMatching(pattern, value)` / `isMatching(pattern)(value)` — runtime type guards.
- `assertMatching(pattern, value)` — boundary assertion that throws `PatternMismatchError` on mismatch.
- `group(tag, handler)`, `group(tag, tag, handler)`, and `group(tags, handler)` — grouped `matchBy` case entries.

Use `matchBy` when one key/path decides a discriminated union branch. Use `match` when matching structure, tuples, arrays, predicates, selections, records, exact objects, or non-discriminant values.

## Hard rules for agents

- Import only public APIs from the published package `@diegogbrisa/ts-match` or documented package subpaths.
- Never import from `src`, `dist`, or internal files.
- Do not invent helpers. Use only the helpers listed in this skill.
- Prefer `.exhaustive()` for closed unions.
- Use `.otherwise(...)` only when a fallback is intentional.
- Use `match.async` or `matchBy.async` when handlers may be async or callers need one normalized promise.
- Do not use unsafe TypeScript casts. Only `as const` is acceptable for literal preservation, such as reusable grouped tag arrays.
- Do not use broad `any` in examples or generated code.
- Do not use `switch` in generated examples unless explicitly writing a short before/after comparison requested by the user.
- Avoid inline object-map `.cases({...})` in hot loops. Prefer `.with(...).exhaustive()` unless the user explicitly accepts the manual-typing tradeoff of hoisted case maps.
- When TypeScript reports a `ts-match:` diagnostic, read that payload first and fix the modeled issue. Do not silence it with casts, `any`, or by rewriting to `switch`.

## Valid imports

Root import:

```ts
import { assertMatching, group, isMatching, match, matchBy, P } from '@diegogbrisa/ts-match'
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

## Pattern helpers

`P` namespace helpers:

- `P._`, `P.any`
- `P.string`, `P.number`, `P.boolean`, `P.bigint`, `P.symbol`, `P.null`, `P.undefined`
- `P.nan`, `P.finite`, `P.integer`
- `P.union(...patterns)`
- `P.exclude(pattern)`
- `P.optional(pattern)`
- `P.array(pattern)`, `P.nonEmptyArray(pattern)`
- `P.tuple([...])`, `P.rest(pattern)`
- `P.exact(pattern)`
- `P.when(predicate)`
- `P.instanceOf(Constructor)`
- `P.select()`, `P.select(name)`, `P.select(name, pattern)`
- `P.record(keyPattern, valuePattern)`, `P.nonEmptyRecord(keyPattern, valuePattern)`

Named helper exports mirror `P` helpers:

- `pWildcard`, `pAny`, `pString`, `pNumber`, `pBoolean`, `pBigint`, `pSymbol`, `pNull`, `pUndefined`
- `pNan`, `pFinite`, `pInteger`
- `pUnion`, `pExclude`, `pOptional`
- `pArray`, `pNonEmptyArray`, `pTuple`, `pRest`
- `pExact`, `pWhen`, `pInstanceOf`, `pSelect`, `pRecord`, `pNonEmptyRecord`

## Common recipes

### Closed discriminated union

Prefer `.with(...).exhaustive()` as a clear default shape:

```ts
type Action =
  | { type: 'start'; id: string }
  | { type: 'success'; id: string; rows: readonly string[] }
  | { type: 'failure'; id: string; message: string }

const next = matchBy(action, 'type')
  .with('start', (action) => startState(action.id))
  .with('success', (action) => readyState(action.rows))
  .with('failure', (action) => failedState(action.message))
  .exhaustive()
```

### Compact object-map cases

Use `.cases({...})` when map-style DX is preferred and the code is not a hot loop:

```ts
const label = matchBy(command, 'kind').cases({
  create: (command) => `create:${command.id}`,
  rename: (command) => `rename:${command.id}:${command.name}`,
  delete: (command) => `delete:${command.id}`,
})
```

Use object-map cases only when tags are finite and representable without key collisions. Avoid object maps for `null`, `undefined`, `__proto__`, or collisions like `1` and `'1'`.

### Hot-path discriminant dispatch

Keep the default hot-path shape inference-friendly:

```ts
const next = matchBy(action, 'type')
  .with('start', (action) => startState(action.id))
  .with('success', (action) => readyState(action.rows))
  .with('failure', (action) => failedState(action.message))
  .exhaustive()
```

Hoisted object maps can be faster in benchmarks, but they remove contextual handler inference and often force manual handler annotations. Do not generate hoisted case-map examples unless the user explicitly prioritizes that performance tradeoff over JS-feeling inference.

### Nested path matching

```ts
const label = matchBy(event, 'meta.type')
  .with('click', (event) => `click:${event.meta.x}`)
  .with('submit', (event) => `submit:${event.meta.form}`)
  .exhaustive()
```

Use tuple paths for symbol keys or literal path segments:

```ts
const label = matchBy(event, ['meta', EVENT_KIND])
  .with('user', (event) => event.meta.name)
  .with('system', (event) => String(event.meta.code))
  .exhaustive()
```

### Structural `match`

```ts
const label = match(input)
  .with({ type: 'user', profile: { name: P.select('name', P.string) } }, ({ name }) => name)
  .with({ type: 'team', name: P.select('name', P.string) }, ({ name }) => name)
  .otherwise(() => 'unknown')
```

No `P.select`: handler receives the matched value. One anonymous `P.select()`: handler receives the selected value. Named selections: handler receives an object of selected values.

### Async matching

```ts
const body = await match
  .async(response)
  .with({ ok: true, body: P.select('body', P.string) }, async ({ body }) => body.trim())
  .with({ ok: false }, ({ message }) => message)
  .exhaustive()
```

```ts
const description = await matchBy
  .async(job, 'type')
  .with('queued', async (job) => `queued:${job.id}`)
  .with('finished', (job) => `finished:${job.id}`)
  .with('failed', (job) => `failed:${job.reason}`)
  .exhaustive()
```

### Grouped tags

Prefer callback `group` for inferred handler parameters. Use the variadic form for the best tag autocomplete:

```ts
const status = matchBy(event, 'type').cases((group) => [
  group('start', 'resume', (event) => `active:${event.id}`),
  group('stop', (event) => `stopped:${event.reason}`),
])
```

Array-form callback groups remain supported and are often more readable because `group` keeps two arguments. TypeScript gives better editor completions in variadic tag positions than inside `group(['...'], handler)`, so prefer variadic form only when inline autocomplete/inference matters. Use exported `group(...)` for reusable prebuilt groups, especially when handlers do not need narrowed parameters:

```ts
const statusCases = [group(['start', 'resume'] as const, () => 'active'), group('stop', () => 'inactive')]
```

### Runtime guard

```ts
const isUser = isMatching({ type: 'user', id: P.string })
const users = values.filter(isUser)
```

### Runtime assertion

```ts
const payload: unknown = JSON.parse(raw)
assertMatching({ type: 'user', id: P.string }, payload)
payload.id
```

A mismatch throws `PatternMismatchError`.

## Responding to `ts-match:` diagnostics

`ts-match` intentionally shapes common invalid usage into readable TypeScript diagnostics whose messages start with `ts-match:`. When helping a user or fixing generated code:

1. Read the `ts-match:` message before the surrounding TypeScript overload noise.
2. Apply the suggested fix directly.
3. Do not add unsafe casts, broad `any`, or manual type assertions to bypass the diagnostic.
4. Do not replace `matchBy` with `switch` just to silence an error.
5. Re-run the typecheck after fixing the modeled problem.

Common diagnostic fixes:

- `ts-match: match is not exhaustive` / `ts-match: matchBy is not exhaustive` — add the missing `.with(...)` / grouped cases, or use `.otherwise(...)` only when fallback behavior is intentional.
- `ts-match: invalid matchBy path` — fix the direct key, dot path, or tuple path. Use tuple paths for symbol keys or keys containing `.`.
- `ts-match: this matchBy tag cannot occur` — remove the impossible tag or correct the path.
- `ts-match: object-map cases are missing required key(s)` — add the missing handlers or change to `.partial(...).otherwise(...)`.
- `ts-match: object-map case contains an extra key` — remove the extra key or fix the discriminant path.
- `ts-match: object-map cases cannot represent null or undefined tags` / key collision diagnostics — use tuple-entry cases or callback grouped cases instead of an object map.
- `ts-match: repeated container patterns cannot contain P.select(...)` — move the selection outside `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, or `P.nonEmptyRecord(...)`.
- `ts-match: P.exclude(pattern) cannot contain P.select(...)` — remove the selection or move it outside the excluded pattern.
- `ts-match: invalid P.rest(...) usage` — use `P.rest(...)` only as the final tuple pattern item.

If grouped-case inference is weak, prefer `.cases((group) => [...])` and the variadic local form `group('a', 'b', handler)`. Do not treat `group(['a', 'b'], handler)` as invalid; it is supported, just less reliable for inline autocomplete. Use exported `group(...)` for reusable groups whose handlers do not need contextual variant inference. Check the README diagnostics section for concrete examples.

## Important limitations

- `P.array(...)`, `P.nonEmptyArray(...)`, `P.record(...)`, and `P.nonEmptyRecord(...)` reject `P.select(...)` because captures may repeat ambiguously.
- `P.exclude(...)` cannot contain selections.
- `P.rest(...)` is valid only as the final tuple pattern item.
- `P.record(...)` and `P.nonEmptyRecord(...)` target plain record-like objects, not arrays, class instances, maps, sets, dates, regexps, or primitives.
- Dot paths always mean nesting. Use tuple paths for symbols and literal segments containing dots.
- Object patterns use normal JavaScript property lookup, so getters can run or throw and inherited properties can match.
- `P.exact(...)` rejects enumerable own extra keys on values, but it is not a cyclic graph matcher.
- No structural `Map`/`Set` helper exists. Use `P.instanceOf(Map)` / `P.instanceOf(Set)` plus `P.when(...)` for custom checks.
- No RegExp string helper exists. Use `P.when(...)`.

## Anti-patterns

- Importing internal files.
- Using undocumented helper aliases.
- Adding casts to force handler types instead of changing the pattern or using callback `group`.
- Using sync `match` with async handlers when callers expect one promise.
- Using inline `.cases({...})` inside hot loops.
- Recommending hoisted case maps that require manual handler annotations as normal user-facing code.
- Using object-map `.cases({...})` for `null`, `undefined`, `__proto__`, or normalized key collisions.
- Selecting inside repeated contexts such as arrays or records.
- Writing examples that are not compiled against the installed package.

## Validation checklist

Before introducing or modifying usage:

1. Confirm every imported symbol is listed in this skill.
2. Confirm examples import only from package root or documented subpaths.
3. Confirm closed unions use `.exhaustive()` or exhaustive `.cases({...})`.
4. Confirm async handlers use `match.async` or `matchBy.async` when callers need promises.
5. Confirm no unsafe casts, broad `any`, internal imports, or unsupported helper names were added.
6. Compile the affected project examples/tests.
7. If editing this library itself, run `pnpm check`, `pnpm pack:check`, and `pnpm test`.
8. If changing public types or overloads, ensure `pnpm test:editor-dx` is covered by `pnpm check` and verify packaged `dist/*.d.ts` autocomplete when relevant.
