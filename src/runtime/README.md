# Runtime Module

Owns runtime Pattern evaluation for `match`, `isMatching`, and `assertMatching`.

Start here:

- `index.ts` is the runtime matching seam used by Matcher and Assertion helpers.
- `core.ts` owns object detection, Pattern detection, shared options, primitive comparison, and Temporal detection.
- `built-ins.ts` dispatches built-in Pattern helper matching.
- `primitive-built-ins.ts` owns primitive built-in Pattern checks.
- `record-built-ins.ts` owns record and non-empty record validation.
- `object-structures.ts` owns object, tuple, array, and rest matching.
- `map-set-structures.ts` owns map and set matching.
- `selection.ts` owns Selection and Collection capture runtime state.
- `selection-rules.ts` owns capture placement and usage validation.
- `undefined-captures.ts` owns optional undefined capture behavior.

Do not put Pattern helper construction here; use `src/patterns/`.
