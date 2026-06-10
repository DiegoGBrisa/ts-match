import { GROUP_TOKEN } from './token.js'
import type { Discriminant, GroupEntry } from '../types/index.js'

type CaseHandler = (value: never) => unknown

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value)
}

function isDiscriminant(value: unknown): value is Discriminant {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'symbol' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  )
}

function isDiscriminantArray(values: readonly unknown[]): values is readonly Discriminant[] {
  return values.every(isDiscriminant)
}

function normalizeTags(values: readonly unknown[]): readonly Discriminant[] {
  if (values.length === 0) throw new TypeError('group(...) requires at least one tag.')

  const first = values[0]
  if (values.length === 1 && isUnknownArray(first)) {
    if (first.length === 0) throw new TypeError('group(...) requires at least one tag.')
    if (!isDiscriminantArray(first)) throw new TypeError('group(...) tags must be discriminants.')
    return first
  }

  if (!isDiscriminantArray(values)) throw new TypeError('group(...) tags must be discriminants.')
  return values
}

/**
 * Creates a reusable grouped case entry for `matchBy(...).cases(...)`.
 *
 * Use `group` when several discriminant tags should share one handler while
 * keeping exhaustiveness checking. Pass either a single tag, multiple variadic
 * tags, or a readonly array of tags, plus a handler that accepts the union of
 * values covered by those tags when used through `matchBy`'s typed `.cases(...)`
 * APIs.
 *
 * @param tags - Variadic discriminant tags to handle together.
 * @param handler - Function invoked when the value at the `matchBy` path equals one of the tags.
 * @returns A frozen grouped case entry consumable by `matchBy(...).cases(...)`.
 * @throws {TypeError} When `handler` is not a function or tags are not discriminants.
 * @example
 * ```ts
 * matchBy(event, 'type').cases((group) => [
 *   group('created', 'updated', (value) => value.id),
 *   group('deleted', (value) => value.id),
 * ])
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#group
 * @see https://github.com/DiegoGBrisa/ts-match#grouped-case-inference
 */
export function group<
  const TTags extends readonly [Discriminant, Discriminant, ...Discriminant[]],
  THandler extends CaseHandler,
>(...args: readonly [...tags: TTags, handler: THandler]): GroupEntry<TTags, THandler>

/**
 * Creates a reusable grouped case entry from a readonly array of tags.
 *
 * Use the array form when tags read better together or already exist as a
 * reusable readonly list. For callback-local editor tag suggestions, prefer
 * the variadic form.
 *
 * @param tags - Readonly list of discriminant tags to handle together.
 * @param handler - Function invoked when the value at the `matchBy` path equals one of the tags.
 * @returns A frozen grouped case entry consumable by `matchBy(...).cases(...)`.
 * @throws {TypeError} When `handler` is not a function or a tag is not a discriminant.
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
 * Implements grouped case creation for single-tag, variadic multi-tag, and
 * readonly-array overloads.
 *
 * @param args - Tags followed by the runtime handler, or a tag array followed by the handler.
 * @returns A frozen grouped case entry.
 * @throws {TypeError} When `handler` is not callable or a tag is not a discriminant.
 * @see https://github.com/DiegoGBrisa/ts-match#group
 */
export function group(...args: readonly unknown[]): GroupEntry<readonly Discriminant[], unknown> {
  const handler = args.at(-1)
  if (typeof handler !== 'function') throw new TypeError('group(...) handler must be a function.')

  const tags: readonly Discriminant[] = Object.freeze([...normalizeTags(args.slice(0, -1))])
  const entry: GroupEntry<readonly Discriminant[], unknown> = {
    [GROUP_TOKEN]: true,
    tags,
    handler,
  }
  return Object.freeze(entry)
}
