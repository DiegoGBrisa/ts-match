/**
 * Internal symbol used to identify built-in pattern helper objects at runtime.
 *
 * The symbol prevents accidental collisions with user object-pattern keys while
 * still allowing runtime helpers to discriminate `P.*` pattern objects quickly.
 * It is not part of the documented public API; consumers should use `P` or named
 * `p*` helpers instead.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export const PATTERN_TOKEN: unique symbol = Symbol('ts-match.pattern')

/**
 * Internal symbol used to identify grouped `matchBy` case entries.
 *
 * `group(...)` attaches this token so `matchBy(...).cases(...)` can distinguish
 * grouped entries from ordinary tuple entries without relying on user-visible
 * property names.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
export const GROUP_TOKEN: unique symbol = Symbol('ts-match.group')
