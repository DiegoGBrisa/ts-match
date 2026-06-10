# Types Module

Owns the public type exports and the type-level Pattern, Matcher, matchBy, Selection, Collection capture, diagnostic, and Promise builder model.

This folder is the type engine, not a generic home for every type. Keep feature-owned types with their feature. New files here must be listed with a reason in `scripts/architecture-policy.ts`.

Start here:

- `index.ts` exposes public type aliases through the `TsMatchTypes` namespace implementation.
- `pattern-core.ts` and `pattern-collections.ts` define Pattern helper shapes.
- `pattern-inference.ts`, `pattern-coverage.ts`, `object-coverage.ts`, and `collection-inference.ts` model type-level matching.
- `exact-selection.ts`, `capture-detection.ts`, and `selection-payloads.ts` model Selection and Collection capture behavior.
- `pattern-arguments.ts` and `match-by-arguments.ts` model diagnostic argument constraints.
- `match-by-paths.ts` models Property path suggestions, path values, and Case maps.
- `pattern-diagnostics.ts` owns type-level diagnostic payload helpers.
- `result-utilities.ts` owns Promise builder result utilities.

Keep implementation details private to this folder unless another concept needs the public type seam.
