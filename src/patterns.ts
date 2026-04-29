import { PATTERN_TOKEN } from './tokens.js'
import type {
  AbstractConstructor,
  AnonymousSelectPattern,
  ArrayPattern,
  ExactPattern,
  ExcludePattern,
  FinitePattern,
  GuardPattern,
  InstanceOfPattern,
  IntegerPattern,
  NamedSelectPattern,
  NanPattern,
  NonEmptyArrayPattern,
  NonEmptyRecordPattern,
  OptionalPattern,
  PatternStructureArgument,
  PrimitivePattern,
  Primitive,
  PrimitiveName,
  RecordKeyPatternArgument,
  RecordPattern,
  RecordValuePatternArgument,
  RepeatedPatternArgument,
  RestPattern,
  SelectPattern,
  TuplePattern,
  TuplePatternArgument,
  UnionPattern,
  WildcardPattern,
  ExcludePatternArgument,
} from './types.js'

function freezePattern<TPattern extends object>(pattern: TPattern): TPattern {
  return Object.freeze(pattern)
}

function primitive<TPrimitive extends Primitive>(name: PrimitiveName<TPrimitive>): PrimitivePattern<TPrimitive> {
  return freezePattern({
    [PATTERN_TOKEN]: 'primitive',
    primitive: name,
  })
}

export const pWildcard: WildcardPattern = freezePattern({ [PATTERN_TOKEN]: 'wildcard' })
export const pAny: WildcardPattern = pWildcard

export const pString: PrimitivePattern<string> = primitive('string')
export const pNumber: PrimitivePattern<number> = primitive('number')
export const pBoolean: PrimitivePattern<boolean> = primitive('boolean')
export const pBigint: PrimitivePattern<bigint> = primitive('bigint')
export const pSymbol: PrimitivePattern<symbol> = primitive('symbol')
export const pNull: PrimitivePattern<null> = primitive('null')
export const pUndefined: PrimitivePattern<undefined> = primitive('undefined')

export const pNan: NanPattern = freezePattern({ [PATTERN_TOKEN]: 'nan' })
export const pFinite: FinitePattern = freezePattern({ [PATTERN_TOKEN]: 'finite' })
export const pInteger: IntegerPattern = freezePattern({ [PATTERN_TOKEN]: 'integer' })

type PatternListArgument<TPatterns extends readonly unknown[]> = {
  readonly [K in keyof TPatterns]: TPatterns[K] & PatternStructureArgument<TPatterns[K]>
}

export function pUnion<const TPatterns extends readonly unknown[]>(
  ...patterns: PatternListArgument<TPatterns>
): UnionPattern<TPatterns> {
  return freezePattern({ [PATTERN_TOKEN]: 'union', patterns })
}

export function pExclude<const TPattern>(
  pattern: TPattern & ExcludePatternArgument<TPattern>,
): ExcludePattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'exclude', pattern })
}

export function pOptional<const TPattern>(
  pattern: TPattern & PatternStructureArgument<TPattern>,
): OptionalPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'optional', pattern })
}

export function pArray<const TPattern>(
  item: TPattern & RepeatedPatternArgument<TPattern, 'P.array'>,
): ArrayPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'array', item })
}

export function pNonEmptyArray<const TPattern>(
  item: TPattern & RepeatedPatternArgument<TPattern, 'P.nonEmptyArray'>,
): NonEmptyArrayPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'non-empty-array', item })
}

export function pTuple<const TPatterns extends readonly unknown[]>(
  items: TPatterns & TuplePatternArgument<TPatterns>,
): TuplePattern<TPatterns> {
  return freezePattern({ [PATTERN_TOKEN]: 'tuple', items })
}

export function pRest<const TPattern>(item: TPattern & PatternStructureArgument<TPattern>): RestPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'rest', item })
}

export function pExact<const TPattern>(pattern: TPattern & PatternStructureArgument<TPattern>): ExactPattern<TPattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'exact', pattern })
}

export function pWhen<TInput, TGuarded extends TInput>(
  predicate: (value: TInput) => value is TGuarded,
): GuardPattern<TGuarded, true>
export function pWhen<TInput>(predicate: (value: TInput) => boolean): GuardPattern<TInput, false>
export function pWhen(predicate: (value: unknown) => boolean): GuardPattern<unknown, boolean> {
  return freezePattern({ [PATTERN_TOKEN]: 'when', predicate, narrows: false })
}

export function pInstanceOf<TConstructor extends AbstractConstructor>(
  constructor: TConstructor,
): InstanceOfPattern<TConstructor> {
  return freezePattern({ [PATTERN_TOKEN]: 'instance-of', constructor })
}

export function pSelect(): AnonymousSelectPattern<WildcardPattern>
export function pSelect<const TName extends PropertyKey>(name: TName): NamedSelectPattern<TName, WildcardPattern>
export function pSelect<const TName extends PropertyKey, const TPattern>(
  name: TName,
  pattern: TPattern & PatternStructureArgument<TPattern>,
): NamedSelectPattern<TName, TPattern>
export function pSelect(
  name?: PropertyKey,
  pattern: unknown = pWildcard,
): SelectPattern<PropertyKey | undefined, unknown> {
  return freezePattern({ [PATTERN_TOKEN]: 'select', name, pattern })
}

export function pRecord<const TKeyPattern, const TValuePattern>(
  key: TKeyPattern & RecordKeyPatternArgument<TKeyPattern, 'P.record'>,
  value: TValuePattern & RecordValuePatternArgument<TValuePattern, 'P.record'>,
): RecordPattern<TKeyPattern, TValuePattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'record', key, value })
}

export function pNonEmptyRecord<const TKeyPattern, const TValuePattern>(
  key: TKeyPattern & RecordKeyPatternArgument<TKeyPattern, 'P.nonEmptyRecord'>,
  value: TValuePattern & RecordValuePatternArgument<TValuePattern, 'P.nonEmptyRecord'>,
): NonEmptyRecordPattern<TKeyPattern, TValuePattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'non-empty-record', key, value })
}

export const P = Object.freeze({
  _: pWildcard,
  any: pAny,
  string: pString,
  number: pNumber,
  boolean: pBoolean,
  bigint: pBigint,
  symbol: pSymbol,
  null: pNull,
  undefined: pUndefined,
  nan: pNan,
  finite: pFinite,
  integer: pInteger,
  union: pUnion,
  exclude: pExclude,
  optional: pOptional,
  array: pArray,
  nonEmptyArray: pNonEmptyArray,
  tuple: pTuple,
  rest: pRest,
  exact: pExact,
  when: pWhen,
  instanceOf: pInstanceOf,
  select: pSelect,
  record: pRecord,
  nonEmptyRecord: pNonEmptyRecord,
})
