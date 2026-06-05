# Common Antipatterns

Patterns to flag during `ts-match` review.

## Public API

- **Accidental export drift** - adding, removing, or renaming exports without matching docs, examples, type tests, and smoke checks.
- **Subpath mismatch** - changing source exports without keeping `package.json` subpath exports and declaration output aligned.
- **Helper sprawl** - adding a public helper that duplicates existing `P.*` or named `p*` composition.
- **Terminology drift** - using generic names that blur Branch vs Case, Tag vs key, or promise builder vs async matcher.

## Runtime behavior

- **Type/runtime divergence** - a pattern narrows at compile time but accepts or rejects different values at runtime.
- **Unhandled edge cases** - missing coverage for `null`, `undefined`, empty arrays/objects, symbols, nested paths, or missing discriminants.
- **Fallback ambiguity** - `.otherwise(...)`, `.partial(...)`, or safe terminals changing which values are handled.
- **Mutation of inputs** - changing user values, patterns, or case maps during matching.
- **Error instability** - replacing public error classes or degrading error messages relied on by users.

## Type-level behavior

- **Inference widening** - changes that turn specific handler payloads into broad unions, `unknown`, or `any`.
- **Hidden exhaustiveness holes** - making `.exhaustive()` pass when known variants remain uncovered.
- **Overbroad assertions** - using `as any`, `as never`, or double assertions to silence type failures without tests proving the contract.
- **Diagnostic noise** - making `ts-match:` errors harder to read or attaching them to the wrong call site.
- **Type-cost regressions** - recursive or distributive types that materially slow common unions without benchmark review.

## Tests and fixtures

- **Runtime-only coverage** - behavior changes covered in Vitest but not in type tests when inference changes.
- **Type-only coverage** - type changes with no runtime tests for the same contract.
- **Stale diagnostics** - expected compiler errors updated mechanically without checking readability.
- **Example drift** - examples or README demonstrating APIs that no longer compile.
- **Package blind spot** - export or `files` changes without pack or smoke validation.

## Packaging and release

- **Runtime dependency creep** - adding dependencies that violate the zero-runtime-dependency guarantee.
- **ESM breakage** - introducing CommonJS assumptions or non-exported deep imports.
- **Declaration mismatch** - changing implementation without verifying generated `.d.ts` output.
- **Release-note gap** - public behavior changes missing release documentation.

## Maintainability

- **Cross-module lockstep** - changes that require unrelated modules to know each other's internals.
- **Over-generalized matching core** - abstractions that make simple matching behavior harder to inspect.
- **Duplicated pattern semantics** - the same runtime rule implemented differently across `match`, `matchBy`, and assertion helpers.
- **Premature optimization** - complexity added without benchmark evidence or a clear hot path.
