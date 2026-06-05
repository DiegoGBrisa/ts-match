# Changelog

All notable changes to ts-match are documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and uses Conventional Commits with release-please for releases after `1.0.0`.

## [1.4.0](https://github.com/DiegoGBrisa/ts-match/compare/v1.3.0...v1.4.0) (2026-06-05)


### Features

* add collection pattern helpers ([df98f6d](https://github.com/DiegoGBrisa/ts-match/commit/df98f6d3fbadd20d66c8d5860596f0c654eb717e))
* add collection pattern helpers ([7713e42](https://github.com/DiegoGBrisa/ts-match/commit/7713e423bbbab92a5510a3a8768622c884057ba2))


### Bug Fixes

* support readonly collection narrowing ([2d2761c](https://github.com/DiegoGBrisa/ts-match/commit/2d2761c3e48196c934ac9f1d0605a6283cb6c224))

## [1.3.0](https://github.com/DiegoGBrisa/ts-match/compare/v1.2.0...v1.3.0) (2026-06-04)


### Features

* **patterns:** add convenience helper patterns ([b85c040](https://github.com/DiegoGBrisa/ts-match/commit/b85c040efd52162050dbca834e7da0e2b9ebba94))

## [1.2.0](https://github.com/DiegoGBrisa/ts-match/compare/v1.1.0...v1.2.0) (2026-05-04)


### Features

* **match:** add promise-aware builders ([737ab73](https://github.com/DiegoGBrisa/ts-match/commit/737ab73750af37057f2d8da0645564d7bb3f0a7b))


### Bug Fixes

* **match:** harden promise runtime validation ([c1643b6](https://github.com/DiegoGBrisa/ts-match/commit/c1643b687434293f4a719cff3cb000521f64eef1))
* **runtime:** validate tags and union patterns ([05d788b](https://github.com/DiegoGBrisa/ts-match/commit/05d788bf0006674820f432830625995db0121579))
* **types:** strengthen inference and matchBy grouped entries ([42990ec](https://github.com/DiegoGBrisa/ts-match/commit/42990ecc0c5f3e58f1ebd540dc734928e9a8bf91))

## [1.1.0](https://github.com/DiegoGBrisa/ts-match/compare/v1.0.3...v1.1.0) (2026-04-30)


### Features

* **dx:** improve autocomplete inference ([c0e4966](https://github.com/DiegoGBrisa/ts-match/commit/c0e4966c496dfcc6b351463d852c6bcca8a088f2))


### Bug Fixes

* **dx:** harden autocomplete inference ([cfc303a](https://github.com/DiegoGBrisa/ts-match/commit/cfc303a63abc6f0484e290de1c49cc0b73da9df5))
* **group:** harden group tag arrays ([98dcd69](https://github.com/DiegoGBrisa/ts-match/commit/98dcd69123cc8c2584d2865f698d8221c4780589))
* **group:** reject empty array groups ([bb945a7](https://github.com/DiegoGBrisa/ts-match/commit/bb945a788b6d229404a613826a0735c41dcda49f))
* **types:** require static grouped tags for coverage ([13d3271](https://github.com/DiegoGBrisa/ts-match/commit/13d32715737c4ab80f40c54996db7f3e6bf27cad))

## [1.0.3](https://github.com/DiegoGBrisa/ts-match/compare/v1.0.2...v1.0.3) (2026-04-30)


### Bug Fixes

* **release:** align package provenance metadata ([1614f89](https://github.com/DiegoGBrisa/ts-match/commit/1614f89e913ad947f1e5da2f092e6de4daefa28c))
* **release:** align package provenance metadata ([0d0a1e4](https://github.com/DiegoGBrisa/ts-match/commit/0d0a1e4b68a476b92b201c918cd55c3be69428ff))
* **release:** use trusted publishing runtime ([1dac070](https://github.com/DiegoGBrisa/ts-match/commit/1dac070f09b89f56c3e1fea9719b1dec6d7df3e9))
* **release:** use trusted publishing runtime ([96731e4](https://github.com/DiegoGBrisa/ts-match/commit/96731e4d5a2ed153cac7cd73014235757db62e09))

## [1.0.2](https://github.com/DiegoGBrisa/ts-match/compare/v1.0.1...v1.0.2) (2026-04-30)


### Bug Fixes

* **release:** allow manual publish recovery ([b480e7a](https://github.com/DiegoGBrisa/ts-match/commit/b480e7ab2d1b7bab2ab4d81e914547099ad7afa7))
* **release:** allow manual publish recovery ([d26add9](https://github.com/DiegoGBrisa/ts-match/commit/d26add9838c273ffffaee9b08c9fd874805e7578))
* **release:** avoid changelog formatting gate ([695a38b](https://github.com/DiegoGBrisa/ts-match/commit/695a38b71119fd6ade42d88e7994d8c460cbd1e2))
* **release:** avoid changelog formatting gate ([8c55c4e](https://github.com/DiegoGBrisa/ts-match/commit/8c55c4ece5a46bc0b1ee2d5f09435a31c660ad63))
* **release:** publish validated tarball ([8e4d25c](https://github.com/DiegoGBrisa/ts-match/commit/8e4d25ca75a5b1cb25fbd808989d6b23b3b8c0fd))
* **release:** publish validated tarball ([1a14ebd](https://github.com/DiegoGBrisa/ts-match/commit/1a14ebd0051cf5847cc84ee814ac9f858a6dcdd6))

## [1.0.1](https://github.com/DiegoGBrisa/ts-match/compare/v1.0.0...v1.0.1) (2026-04-29)

### Bug Fixes

- **ci:** address release review feedback ([646618e](https://github.com/DiegoGBrisa/ts-match/commit/646618e70f6db70597b6840cefe3620f4c8d627f))
- **ci:** validate initial push commit range ([2429775](https://github.com/DiegoGBrisa/ts-match/commit/24297753bcc158516861d222721d3a67390a9791))

## [1.0.0] - 2026-04-29

Initial stable release of **ts-match**.

### Features

- TypeScript-first pattern matching with structural `match(...)`, discriminant `matchBy(...)`, and promise-normalized matching APIs.
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
