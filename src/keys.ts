export function ownEnumerableKeys(value: object): PropertyKey[] {
  const stringKeys = Object.keys(value)
  const symbolKeys = Object.getOwnPropertySymbols(value).filter((key) =>
    Object.prototype.propertyIsEnumerable.call(value, key),
  )
  return [...stringKeys, ...symbolKeys]
}
