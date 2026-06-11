# Match Module

Owns the structural `match(value)` Matcher and `match.promise(value)` Promise builder seam.

Start here:

- `index.ts` exposes the public `match` function and subpath types.
- `runtime.ts` owns branch normalization and sync/promise Matcher evaluation.
- `sync-builder.ts` models synchronous Matcher chaining.
- `promise-builder.ts` models Promise builder chaining and safe terminals.
- `__tests__/` contains runtime tests for this module.

Do not put `matchBy` Case dispatch here; use `src/match-by/`.
