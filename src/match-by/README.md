# MatchBy Module

Owns `matchBy(value, path)` and `matchBy.promise(value, path)` Case dispatch by Property path.

Start here:

- `index.ts` exposes the public `matchBy` function and subpath types.
- `runtime.ts` owns path traversal, Case normalization, object maps, tuple entries, and grouped Cases.
- `sync.ts` and `promise.ts` implement sync and Promise builder behavior.
- `sync-builder.ts` and `promise-builder.ts` model the builder interfaces.
- `types.ts` contains shared builder type aliases.
- `__tests__/` and `__typecheck__/` contain feature-local verification.

Do not put structural Pattern matching here; use `src/match/` and `src/runtime/`.
