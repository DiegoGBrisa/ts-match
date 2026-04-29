/**
 * Returns enumerable string and symbol keys in object-pattern matching order.
 *
 * Object patterns should observe ordinary JavaScript enumerable-key semantics:
 * string keys from `Object.keys(...)` first, followed by enumerable own symbols.
 * Use this helper whenever runtime matching needs to inspect object or record
 * patterns so key handling stays consistent across `match`, `matchBy`, and error
 * validation paths.
 *
 * @param value - Object whose own enumerable keys should be read.
 * @returns Ordered property keys that participate in matching.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function ownEnumerableKeys(value: object): PropertyKey[] {
  const stringKeys = Object.keys(value)
  const symbolKeys = Object.getOwnPropertySymbols(value).filter((key) =>
    Object.prototype.propertyIsEnumerable.call(value, key),
  )
  return [...stringKeys, ...symbolKeys]
}
