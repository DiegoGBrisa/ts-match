/**
 * Internal symbol used to identify built-in pattern helper objects at runtime.
 *
 * The symbol prevents accidental collisions with user object-pattern keys while
 * still allowing runtime helpers to discriminate `P.*` pattern objects quickly.
 * Use the global symbol registry so ESM and CommonJS compatibility builds share
 * marker identity when both are loaded in one process.
 * It is not part of the documented public API; consumers should use `P` or named
 * `p*` helpers instead.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const PATTERN_TOKEN: unique symbol = Symbol.for('@diegogbrisa/ts-match.pattern')
