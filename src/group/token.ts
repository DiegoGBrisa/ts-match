/**
 * Internal symbol used to identify grouped `matchBy` case entries.
 *
 * `group(...)` attaches this token so `matchBy(...).cases(...)` can distinguish
 * grouped entries from ordinary tuple entries without relying on user-visible
 * property names. Use the global symbol registry so ESM and CommonJS
 * compatibility builds can share grouped entries in one process.
 *
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
export const GROUP_TOKEN: unique symbol = Symbol.for('@diegogbrisa/ts-match.group')
