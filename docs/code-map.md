# Code Map

This map is the starting point for repository navigation. Use `CONTEXT.md` for library vocabulary and `docs/adr/` for architecture decisions.

## Source Modules

| Concept                   | Source seam               | Implementation    | Runtime tests                         | Type-level tests                |
| ------------------------- | ------------------------- | ----------------- | ------------------------------------- | ------------------------------- |
| Assertion helpers         | `src/assertions/index.ts` | `src/assertions/` | `src/assertions/__tests__/`           | Cross-feature fixtures          |
| Diagnostics errors        | `src/errors/index.ts`     | `src/errors/`     | `src/errors/__tests__/`               | `type-tests/public-api/`        |
| Grouped cases             | `src/group/index.ts`      | `src/group/`      | `src/match-by/__tests__/`             | `src/match-by/__typecheck__/`   |
| Matcher                   | `src/match/index.ts`      | `src/match/`      | `src/match/__tests__/`                | Cross-feature fixtures          |
| matchBy                   | `src/match-by/index.ts`   | `src/match-by/`   | `src/match-by/__tests__/`             | `src/match-by/__typecheck__/`   |
| Pattern helpers           | `src/patterns/index.ts`   | `src/patterns/`   | `src/patterns/__tests__/`             | `src/patterns/__typecheck__/`   |
| Promise builder terminals | `src/promise/index.ts`    | `src/promise/`    | `src/promise/__tests__/`              | Cross-feature fixtures          |
| Runtime matching          | `src/runtime/index.ts`    | `src/runtime/`    | Feature tests plus adversarial suites | Cross-feature fixtures          |
| Type engine               | `src/types/index.ts`      | `src/types/`      | Not applicable                        | Feature and public API fixtures |

## Cross-Feature Verification

| Concern                         | Location                                     |
| ------------------------------- | -------------------------------------------- |
| Adversarial runtime behavior    | `tests/adversarial/`                         |
| Runtime integration/regressions | `tests/integration/`                         |
| Public API type compatibility   | `type-tests/public-api/`                     |
| Cross-feature type interactions | `type-tests/integration/`                    |
| Type diagnostics                | `diagnostics/` and `type-tests/diagnostics/` |
| Type-performance benchmark      | `type-tests/performance/`                    |

## Rules

- Top-level source concepts are folder modules.
- A folder module's `index.ts` is its seam.
- Do not create same-name sibling file/folder pairs.
- Runtime tests live in feature-local `__tests__/` directories.
- Type-level tests live in feature-local `__typecheck__/` directories.
- Cross-feature tests stay outside source folders and are grouped by what they validate.
- Shared code is colocated with its owner first. Use `src/shared/` only for concept-neutral primitives.
- `src/types/` is the type engine. Keep feature-owned types with their feature.
- `scripts/architecture-policy.ts` is the reviewed allowlist for type-engine files, shared primitives, test concern buckets, public subpaths, and narrow type-engine import exceptions.
