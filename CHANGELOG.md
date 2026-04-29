# Changelog

All notable changes to ts-match are documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and uses Conventional Commits with release-please for releases after `1.0.0`.

## [1.0.0] - 2026-04-29

Initial stable release of **ts-match**.

### Features

- TypeScript-first pattern matching with `match(value)`, `match.async(value)`, `matchBy(value, path)`, and `matchBy.async(value, path)`.
- Exhaustive checking for closed unions through `.exhaustive()` and explicit fallback handling through `.otherwise(...)`.
- Discriminant dispatch through `matchBy(...).with(...).exhaustive()`, object-map `.cases({...})`, partial case maps, and grouped case callbacks.
- Pattern helpers through `P` and named `p*` exports for primitives, arrays, tuples, records, objects, predicates, optional values, negation, exclusion, and selections.
- Runtime validation helpers with `isMatching(...)` and `assertMatching(...)`.
- Selection support for passing selected values directly to handlers, including optional selections that capture `undefined` when absent.
- Focused subpath imports for `match`, `match-by`, `patterns`, `assertions`, `errors`, and `group`.

### TypeScript and diagnostics

- Strong narrowed handler inference for common object, tuple, union, and discriminant-matching paths.
- Branded `ts-match:` type-level diagnostics for non-exhaustive matches, impossible patterns/tags, invalid paths, invalid rest/select/exclude usage, repeated selection containers, and invalid record/object-map cases.
- Diagnostic fixtures published in the package so users and coding agents can inspect expected TypeScript error shapes.

### Package and documentation

- ESM-only package for Node 20+.
- Zero runtime dependencies.
- Public examples covering basic matching, discriminated unions, async matching, direct and nested `matchBy`, grouped cases, pattern helpers, named helper imports, runtime validation, error handling, real-world events, performance-friendly hoisting, and partial case maps.
- Portable agent skill at `docs/agent-skill/SKILL.md` for coding agents using ts-match in downstream repositories.
- Native benchmark at `benchmarks/native.ts` for inspecting public runtime performance scenarios.
