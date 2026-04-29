import { GROUP_TOKEN } from './tokens.js'
import type { Discriminant, GroupEntry } from './types.js'

type CaseHandler = (value: never) => unknown

/**
 * Creates a reusable grouped case entry for `matchBy(...).cases(...)`.
 *
 * Use `group` when several discriminant tags should share one handler while
 * keeping exhaustiveness checking. Pass either a single tag or a readonly array
 * of tags, plus a handler that accepts the union of values covered by those tags
 * when used through `matchBy`'s typed `.cases(...)` APIs.
 *
 * @param tags - One discriminant tag or a readonly list of tags to handle together.
 * @param handler - Function invoked when the value at the `matchBy` path equals one of the tags.
 * @returns A frozen grouped case entry consumable by `matchBy(...).cases(...)`.
 * @throws {TypeError} When `handler` is not a function.
 * @example
 * ```ts
 * matchBy(event, 'type').cases([
 *   group(['created', 'updated'] as const, (value) => value.id),
 *   ['deleted', (value) => value.id],
 * ])
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#group
 * @see https://github.com/DiegoGBrisa/ts-match#grouped-case-inference
 */
export function group<const TTags extends readonly Discriminant[], THandler extends CaseHandler>(
  tags: TTags,
  handler: THandler,
): GroupEntry<TTags, THandler>

/**
 * Creates a grouped case entry from a single tag.
 *
 * This overload is convenient when code wants the object-entry form accepted by
 * `matchBy(...).cases(...)` but only one tag belongs to the group.
 *
 * @param tag - Discriminant tag to handle.
 * @param handler - Function invoked when the selected tag equals `tag`.
 * @returns A frozen grouped case entry with one tag.
 * @throws {TypeError} When `handler` is not a function.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
export function group<TTag extends Discriminant, THandler extends CaseHandler>(
  tag: TTag,
  handler: THandler,
): GroupEntry<readonly [TTag], THandler>

/**
 * Implements grouped case creation for both single-tag and multi-tag overloads.
 *
 * @param tagOrTags - One discriminant tag or readonly list of tags.
 * @param handler - Runtime handler stored on the grouped entry.
 * @returns A frozen grouped case entry.
 * @throws {TypeError} When `handler` is not callable.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
export function group(
  tagOrTags: Discriminant | readonly Discriminant[],
  handler: unknown,
): GroupEntry<readonly Discriminant[], unknown> {
  if (typeof handler !== 'function') throw new TypeError('group(...) handler must be a function.')
  const tags: readonly Discriminant[] = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags]
  const entry: GroupEntry<readonly Discriminant[], unknown> = {
    [GROUP_TOKEN]: true,
    tags,
    handler,
  }
  return Object.freeze(entry)
}
