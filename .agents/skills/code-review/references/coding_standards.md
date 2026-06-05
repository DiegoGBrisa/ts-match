# Coding Standards

Repository-specific conventions come first. Use `AGENTS.md`, `CONTEXT.md`, docs under `docs/`, and existing nearby code before applying generic preferences.

## Baseline expectations

- Preserve the published contract of `@diegogbrisa/ts-match`.
- Keep runtime code dependency-free, deterministic, and ESM-compatible.
- Keep public API names aligned with repository terminology: Matcher, Value, Pattern, Pattern helper, Branch, Case, Discriminant, Tag, Property path, Exhaustiveness, Fallback, Selection, Assertion helper, Promise builder, Safe terminal, Diagnostic fixture.
- Prefer small, explicit runtime helpers over abstractions that obscure matching semantics.
- Let tests define behavior at every layer: runtime, type-level, diagnostics, docs, examples, and package exports.

## TypeScript standards

- Prefer precise generics and inference over caller-provided annotations.
- Keep public type aliases and overloads readable enough to diagnose user issues.
- Use `unknown` at runtime boundaries before refinement.
- Keep type assertions local and narrow. Avoid `any` unless the alternative would make a public type less correct or much harder to maintain.
- Preserve parity between compile-time narrowing and runtime matching behavior.

## Runtime standards

- Matching logic must be deterministic and ordered where the API promises ordered branches.
- Structural pattern matching should make edge cases explicit: `null`, arrays, tuples, records, missing keys, symbols, and nested property paths.
- Public errors should use stable exported classes and clear messages.
- Promise builders should normalize maybe-promise values and handler outputs consistently.
- Avoid hidden mutation of user-provided values, patterns, or case maps.

## API design

- Public helpers should have a clear role and compose with existing `P.*` and named `p*` helpers.
- Avoid adding a helper when a documented composition of existing helpers is sufficient.
- Do not introduce overloads that improve one call site by weakening inference elsewhere.
- Keep `match` terminology separate from `matchBy` terminology: Branches for structural matching, Cases for tag dispatch.
- Update README, examples, docs, and release notes when the public contract changes.

## Testing standards

- Runtime changes need focused Vitest tests.
- Type-level changes need fixtures in `type-tests/`.
- User-facing compiler error changes need fixtures in `diagnostics/`.
- Public exports and package metadata changes need build, export smoke, and package-content checks.
- Examples should compile, run when intended, and demonstrate real public API usage.

## Documentation standards

- README and examples should use repository terminology from `CONTEXT.md`.
- Docs should describe behavior, not implementation trivia.
- Links must remain local-link-valid under `pnpm test:docs`.
- Diagnostic wording in docs should match fixture expectations.

## Packaging standards

- Keep the package ESM-only.
- Keep Node 20+ compatibility.
- Keep zero runtime dependencies.
- Keep `package.json` exports, `files`, and generated declarations consistent.
- Treat release and pack scripts as part of the publication contract.

## Maintainability standards

- Prefer local, obvious helpers for repeated runtime logic.
- Avoid cross-module coupling that makes `match`, `matchBy`, patterns, and type utilities change in lockstep without a clear contract.
- Keep benchmark-sensitive runtime loops straightforward.
- Comments should explain subtle type/runtime alignment, not restate code.
