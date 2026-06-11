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
