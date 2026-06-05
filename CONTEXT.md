# ts-match

`ts-match` is a TypeScript-first pattern matching library for exhaustive union handling, structural runtime matching, discriminant/path dispatch, promise-aware matching, and boundary validation. This context names the library concepts agents should use when discussing or changing the codebase.

## Language

**Matcher**:
A fluent builder created by `match(value)`, `match.promise(value)`, `matchBy(value, path)`, or `matchBy.promise(value, path)`.
_Avoid_: router, switch wrapper, matcher object when referring to the fluent API generally

**Value**:
The runtime input inspected by a **Matcher**.
_Avoid_: subject, target, payload unless referring to a selected handler payload

**Pattern**:
A literal, object, tuple, array, record, or `P` helper shape that decides whether a `match` branch applies.
_Avoid_: schema, validator when discussing branch matching semantics

**Pattern helper**:
A reusable `P.*` or named `p*` helper such as `P.string`, `P.union(...)`, `P.select(...)`, `P.collect(...)`, or `pRecord(...)`.
_Avoid_: predicate helper unless specifically describing `P.when(...)`

**Branch**:
One `.with(...)` or `.when(...)` clause in a `match` chain.
_Avoid_: case when discussing structural `match(...)`; reserve **Case** for `matchBy(...).cases(...)`

**Case**:
A tag-handler entry used by `matchBy(...).cases(...)` or `matchBy(...).partial(...)`.
_Avoid_: branch when discussing object maps, tuple entries, or grouped `matchBy` entries

**Discriminant**:
A property value that identifies the variant of a union, usually read by `matchBy`.
_Avoid_: type field when the selected path is not literally `type`

**Tag**:
The actual runtime discriminant value selected by a `matchBy` **Property path**.
_Avoid_: key when referring to the selected value; key means an object property name

**Property path**:
A direct key, dot string path, or tuple path used by `matchBy` to read a **Tag**.
_Avoid_: selector unless discussing user-facing selection via `P.select(...)`

**Exhaustiveness**:
The compile-time and defensive runtime guarantee that every known remaining variant/tag is handled before `.exhaustive()` succeeds.
_Avoid_: completeness unless quoting compiler diagnostics

**Fallback**:
An intentional `.otherwise(...)` handler for remaining values or tags.
_Avoid_: default case when describing public API; use fallback

**Selection**:
A `P.select(...)` capture that changes the handler payload from the matched value to selected data.
_Avoid_: extraction, pick

**Collection capture**:
A `P.collect(...)` capture that represents many selected values under one handler-payload name.
_Avoid_: aggregate select, repeated selection, extraction

**Assertion helper**:
`isMatching(...)` or `assertMatching(...)`, used for runtime boundary validation and TypeScript narrowing.
_Avoid_: parser, decoder

**Promise builder**:
A matcher created by `match.promise(...)` or `matchBy.promise(...)` that resolves maybe-promise input and promise-normalizes terminal output.
_Avoid_: async matcher; the public API name is promise, not async

**Safe terminal**:
A promise-builder terminal that returns `MatchPromiseResult<T>` instead of rejecting, currently `safeExhaustive()` or `safeOtherwise(...)`.
_Avoid_: try/catch mode

**Diagnostic fixture**:
A file under `diagnostics/` whose TypeScript errors are checked to preserve readable `ts-match:` diagnostics.
_Avoid_: negative test when referring to published diagnostic examples

## Relationships

- A **Matcher** evaluates a **Value** through ordered **Branches** or **Cases**.
- A **Pattern** narrows the handler input and may reduce the remaining union for **Exhaustiveness**.
- A **Pattern helper** creates a **Pattern** with specific runtime and type-level semantics.
- `matchBy` reads a **Tag** from a **Property path** and dispatches **Cases** by exact tag equality.
- A **Selection** inside a matching **Pattern** replaces the normal matched-value handler payload.
- A **Collection capture** belongs inside a repeated container **Pattern** and contributes a named array to the handler payload.
- A **Promise builder** resolves the **Value** before matching and awaits handler outputs at terminal methods.
- A **Safe terminal** wraps successful or failed promise matching in `MatchPromiseResult<T>`.
- **Diagnostic fixtures** protect the developer-facing wording of type-level errors.

## Example dialogue

> **Dev:** "Should this reducer use `match` with object patterns or `matchBy`?"
> **Maintainer:** "Use `matchBy` if one **Discriminant** decides the variant. Here the **Property path** is `type`, so each **Case** should handle one **Tag** and `.exhaustive()` should prove **Exhaustiveness**."
>
> **Dev:** "What if I only need the nested payload field?"
> **Maintainer:** "Use a **Selection** in a structural **Pattern** when the handler should receive selected data instead of the whole **Value**."
>
> **Dev:** "What if I need every matching id from an array or map?"
> **Maintainer:** "Use a **Collection capture** when the handler should receive a named array of captured values."

## Flagged ambiguities

- "case" and "branch" are easy to blur — resolved: **Branch** means a structural `match(...).with/when` clause; **Case** means a `matchBy(...).cases/partial` entry.
- "tag" and "key" are easy to blur — resolved: **Tag** is the selected runtime discriminant value; **key** is an object property name or case-map property key.
- "async matcher" was superseded by **Promise builder** — use `match.promise(...)` and `matchBy.promise(...)` terminology.
- "selection" and "collection capture" are easy to blur — resolved: **Selection** means one `P.select(...)` capture; **Collection capture** means many values captured by `P.collect(...)`.
