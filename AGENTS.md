# Agent guide

## Library overview

`ts-match` is a TypeScript-first pattern matching library for exhaustive discriminated-union handling, structural object/tuple/array/record patterns, discriminant/path dispatch via `matchBy`, promise-aware matching, runtime boundary assertions, and readable `ts-match:` diagnostics. It is published as `@diegogbrisa/ts-match`, is ESM-first with CommonJS compatibility exports for scripts and tooling, targets Node 20+, and has zero runtime dependencies.

Core public APIs:

- `match(value)` and `match.promise(valueOrPromise)` for structural/value matching.
- `matchBy(value, path)` and `matchBy.promise(valueOrPromise, path)` for discriminant/path dispatch.
- `P` and named `p*` helpers for reusable patterns.
- `group(...)` for grouped `matchBy` cases.
- `isMatching(...)` and `assertMatching(...)` for runtime validation/narrowing.
- `NonExhaustiveMatchError` and `PatternMismatchError` for public error handling.

## Package commands

Use `pnpm` for this repository. Prefer the narrowest command that validates your change before running the full suite.

### Build and typecheck

- `pnpm build` — clean and compile `src` to ESM `dist` and CommonJS compatibility `dist-cjs`.
- `pnpm typecheck` — build, then run the full repo typecheck.
- `pnpm typecheck:only` — TypeScript check without rebuilding.
- `pnpm typecheck:types` / `pnpm test:type` — run public/type-level test fixtures.

### Runtime tests and diagnostics

- `pnpm test` — run the Vitest runtime suite.
- `pnpm test:coverage` — run coverage, excluding editor-DX tests.
- `pnpm test:editor-dx` — run TypeScript language-service autocomplete/DX tests.
- `pnpm test:diagnostics` — verify expected `ts-match:` compiler diagnostics.
- `pnpm test:temporal-real` — run dynamic Temporal integration tests; uses real Temporal when available and asserts no-match/no-throw fallback when unavailable.
- `pnpm test:temporal-browser` — build and run browser Temporal integration tests with Playwright; set `TS_MATCH_BROWSER=chromium` or `firefox`.

### Docs and examples

- `pnpm test:docs` — validate README local links.
- `pnpm test:examples` — build, validate, compile, and run examples.
- `pnpm test:examples:validate` — validate examples without running them.
- `pnpm test:examples:run` — compile and execute examples.

### Lint, format, and aggregate checks

- `pnpm lint` / `pnpm lint:fix` — run or fix ESLint issues.
- `pnpm format:check` / `pnpm format` — check or apply Prettier formatting.
- `pnpm check` — full local validation: lint, format, build, typecheck, type tests, diagnostics, editor-DX, coverage, exports smoke, docs, and examples.

### Benchmarks and package validation

- `pnpm bench:native` — run public runtime benchmark scenarios.
- `pnpm bench:native:check` — build and check native benchmark budgets.
- `pnpm bench:dispatch` — run internal dispatch strategy benchmark.
- `pnpm bench:compare` — compare selected scenarios with `ts-pattern`.
- `pnpm bench:types` — run TypeScript extended diagnostics benchmark.
- `pnpm pack:check` — build, pack, validate package contents, and smoke-test the tarball.

### Release checks

- `pnpm release:preflight` — local release gate including checks, benchmarks, pack validation, audit, and zero-runtime-deps check; CI adds native Temporal lanes for Node 26, Chromium, and Firefox.
- `pnpm release:notes` — extract release notes.
- `pnpm release:verify-tag` — verify release tag state.
- `pnpm release:verify-unpublished` — verify the package version is not already published.

## Agent skills

### Issue tracker

Issues and PRDs for this repo are tracked in GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default mattpocock/skills label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout: root `CONTEXT.md` plus root `docs/adr/` when present. See `docs/agents/domain.md`.

Before architecture, diagnosis, TDD, or planning work, read `CONTEXT.md` and any relevant ADRs under `docs/adr/` if they exist.
