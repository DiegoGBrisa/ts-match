# Code Review Checklist

Review `ts-match` as a published TypeScript library. Prioritize observable behavior, public types, diagnostics, packaging, and examples over generic application concerns.

## Review order

1. Public API compatibility and package exports.
2. Runtime matching correctness.
3. Type-level narrowing and exhaustiveness.
4. Diagnostics and developer experience.
5. Test coverage across runtime, type, diagnostics, docs, and examples.
6. Packaging, release, and zero-runtime-dependency guarantees.
7. Performance and maintainability.

## Scope setup

- Compare against `origin/main` unless a different base is specified.
- Enumerate touched areas: `src/`, `tests/`, `type-tests/`, `diagnostics/`, `examples/`, `docs/`, `benchmarks/`, scripts, config, package metadata.
- Identify whether the change affects public API, internal runtime behavior, type-level behavior, diagnostics, docs, examples, or release packaging.
- Treat README, examples, diagnostics, and type tests as part of the library contract, not secondary artifacts.

## Public API checks

- Verify exported names and subpath exports in `src/index.ts` and `package.json` remain intentional.
- Check declaration output expectations when public types, overloads, or helper names change.
- Flag breaking API changes unless the diff clearly updates docs, examples, release notes, and tests.
- Confirm ESM-only behavior and Node 20+ assumptions are preserved.
- Ensure new public helpers are covered by README/API docs, examples when useful, runtime tests, type tests, and export smoke tests.

## Runtime correctness checks

- Check `match` branch ordering, literal equality, structural object matching, tuple/array behavior, records, and predicate helpers.
- Check `matchBy` property paths, grouped cases, partial cases, missing tags, symbol/numeric tags, and fallback behavior.
- Check promise builders resolve values and handler outputs consistently, including safe terminals.
- Verify public errors keep stable classes and useful messages.
- Cover edge cases: empty objects/arrays, sparse arrays when relevant, `null`, `undefined`, symbols, nested paths, thrown handlers, rejected promises, and missing fallbacks.

## Type-level checks

- Verify narrowing matches runtime behavior for discriminated unions, structural patterns, selections, pattern helpers, and `matchBy`.
- Check exhaustiveness constraints reject missing variants and accept fully covered cases.
- Review inference quality for handler payloads, selected values, promise terminals, grouped cases, partial cases, and named helper imports.
- Avoid broad type assertions that hide regressions. If an escape hatch is necessary, it should be local and justified by surrounding tests.
- Update `type-tests/` and `diagnostics/` when public type behavior or compiler-facing messages change.

## Diagnostics checks

- Preserve readable `ts-match:` diagnostic wording.
- Keep diagnostic fixtures focused on user-facing compiler errors.
- Verify fixture changes are paired with `pnpm test:diagnostics`.
- Avoid diagnostic types that become too expensive for common union sizes without benchmark evidence.

## Test checks

- Runtime behavior changes need focused Vitest coverage under `tests/`.
- Public type behavior changes need fixtures under `type-tests/`.
- Expected compiler error wording needs fixtures under `diagnostics/`.
- Docs and examples need validation through `pnpm test:docs` and the relevant example commands.
- Package metadata or export changes need `pnpm build`, `pnpm smoke:exports`, and often `pnpm pack:check`.

## Performance checks

- Review hot runtime loops in pattern matching, selection, path lookup, and dispatch.
- Flag avoidable repeated traversal, unnecessary allocation, or quadratic behavior in common matching paths.
- Use benchmarks when a change plausibly affects matching throughput or TypeScript type-check time.
- Do not request micro-optimizations without evidence or a clear hot path.

## Output checks

- Findings first, sorted by severity from `P0` to `P3`.
- Every finding includes a concrete file and line reference.
- State the violated contract and the user-visible impact.
- State explicitly when no findings are detected.
- Include residual risks and verification gaps after findings.
