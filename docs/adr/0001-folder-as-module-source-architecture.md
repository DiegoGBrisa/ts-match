# ADR 0001: Folder-as-module source architecture

## Status

Accepted

## Context

`ts-match` is being hardened around readability, small files, small functions, good abstractions, testability, type safety, and performance. The initial hardening split large files into many flat sibling modules. That improved local file size but made repository navigation worse: related implementation files were scattered in one large `src/` list, and some split files were named by sequence rather than by responsibility.

The repository needs a source layout that scales for both developer experience and agent experience. A future maintainer should be able to start from a library concept, find its public seam, implementation files, tests, and type tests quickly, and understand where shared code is allowed to live.

## Decision

Use folder-as-module architecture for source concepts.

Each top-level source concept is a folder module. The folder's `index.ts` is the concept seam. Do not create same-name sibling file/folder pairs such as `src/match.ts` next to `src/match/`.

Published package subpaths must stay stable. Source files may move from `src/match.ts` to `src/match/index.ts`, but consumers should keep importing `@diegogbrisa/ts-match/match`; the package export target moves to `dist/match/index.js`.

Top-level folder modules include the published subpaths and large internal concepts:

- `src/assertions/`
- `src/errors/`
- `src/group/`
- `src/match/`
- `src/match-by/`
- `src/patterns/`
- `src/runtime/`
- `src/types/`

Shared code is owned by the most specific concept. A shared area is allowed only for concept-neutral primitives. Do not create an `_internal` folder. If a shared file has a domain owner, colocate it with the owner module even if other modules import it. If it has no domain owner, place it in `src/shared/`, which must stay small and must not become a catch-all.

`src/types/` is a type engine, not a place for every exported or shared type. Feature-owned types stay with their feature. New `src/types/*.ts` files and new `src/shared/*.ts` files require an explicit entry with a reason in `scripts/architecture-policy.ts`. The same policy file lists the narrow import exceptions that let the type engine reference token/type-shape files without broadening public seams.

Cross-concept imports should use the target concept's `index.ts` seam by default. Direct imports into another concept's implementation files are allowed only for narrow owned primitives when exporting them from `index.ts` would pollute the concept seam. For example, runtime code may import a pattern token from `src/patterns/token.ts` directly, while normal Pattern helper usage goes through `src/patterns/index.ts`.

Tests are colocated with the feature folder they verify. Runtime tests live inside a feature-local `__tests__/` directory, for example `src/match/__tests__/index.test.ts`. Type-level tests live inside a feature-local `__typecheck__/` directory, for example `src/match/__typecheck__/index.typecheck.ts`. Test filenames mirror the implementation file they verify: `src/match/promise.ts` is verified by `src/match/__tests__/promise.test.ts` and `src/match/__typecheck__/promise.typecheck.ts` when both runtime and type-level coverage are useful. This keeps test locality while separating runtime and type-level concerns.

Cross-feature verification stays outside feature folders only when it validates interactions across concepts or package-level behavior. These suites should be grouped by what they validate, such as integration behavior, adversarial behavior, diagnostic fixtures, public API type compatibility, or release/package checks.

Repository navigation is documented in `docs/code-map.md`. Deep feature folders also have short local `README.md` files that explain the feature seam, implementation files, and verification files. Small feature folders rely on the central code map unless they grow enough to need local orientation.

Architecture rules are enforced deterministically. The repository should use maintainable scripts or ESLint rules for objective constraints rather than relying on agents or contributors to remember the conventions.

Architecture validation has its own package command, `pnpm check:architecture`, and the aggregate `pnpm check` runs it before lint. Keep architecture failures separate from lint failures so contributors can distinguish filesystem/module-shape problems from per-file code-quality problems.

The architecture policy lives in `scripts/architecture-policy.ts`. Treat changes to that file as architecture changes: adding a feature folder, cross-feature test concern, type-engine file, shared primitive, or import exception should be reviewed as a deliberate repository-shape decision.

The architecture migration should land as one full migration pass so the repository does not spend time in a mixed flat/folder layout.

## Consequences

The `src/` root becomes a map of concepts instead of a flat list of implementation shards.

Package export targets and package-content checks must account for folder indexes.

Source imports, tests, type tests, benchmarks, examples, and smoke checks must be updated together.

The migration has a large mechanical diff, but future changes should have better locality: agents and developers can navigate by concept rather than by filename prefix.
