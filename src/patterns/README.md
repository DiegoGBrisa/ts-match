# Patterns Module

Owns the `P` namespace, named `p*` Pattern helpers, and Pattern helper object construction.

Start here:

- `index.ts` exposes the public Pattern helper surface.
- `token.ts` owns the Pattern helper runtime token.
- `base.ts` owns Pattern freezing and small helper constants.
- `primitives.ts` owns primitive, literal, regex, date, error, and Temporal Pattern helpers.
- `combinators.ts` owns union, exclude, optional, and repeated array helpers.
- `collections.ts` owns map and set Pattern helpers.
- `selection.ts` owns guards, instance checks, Selection, Collection capture, records, and non-empty records.
- `tuple-exact.ts` owns tuple, rest, and exact Pattern helpers.
- `arguments.ts` owns helper argument types.

Do not put runtime matching semantics here; use `src/runtime/`.
