import { GROUP_TOKEN } from './tokens.js'
import type { Discriminant, GroupEntry } from './types.js'

type CaseHandler = (value: never) => unknown

export function group<const TTags extends readonly Discriminant[], THandler extends CaseHandler>(
  tags: TTags,
  handler: THandler,
): GroupEntry<TTags, THandler>
export function group<TTag extends Discriminant, THandler extends CaseHandler>(
  tag: TTag,
  handler: THandler,
): GroupEntry<readonly [TTag], THandler>
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
