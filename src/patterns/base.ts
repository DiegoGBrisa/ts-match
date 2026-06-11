export const PAIR_ARITY = 2

export function freezePattern<TPattern extends object>(pattern: TPattern): TPattern {
  return Object.freeze(pattern)
}
