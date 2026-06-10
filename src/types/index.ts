import type {} from './capture-detection.js'
import type {} from './collection-inference.js'
import type {} from './exact-selection.js'
import type {} from './match-by-arguments.js'
import type {} from './match-by-paths.js'
import type {} from './object-coverage.js'
import type {} from './pattern-arguments.js'
import type {} from './pattern-collections.js'
import type {} from './pattern-core.js'
import type {} from './pattern-coverage.js'
import type {} from './pattern-diagnostics.js'
import type {} from './pattern-inference.js'
import type {} from './pattern-utilities.js'
import type {} from './result-utilities.js'
import type {} from './selection-payloads.js'

export type Primitive = TsMatchTypes.Primitive
export type Discriminant = TsMatchTypes.Discriminant
export type PropertyPath = TsMatchTypes.PropertyPath
export type PatternKind = TsMatchTypes.PatternKind
export type WildcardPattern = TsMatchTypes.WildcardPattern
export type PrimitivePattern<TPrimitive extends Primitive> = TsMatchTypes.PrimitivePattern<TPrimitive>
export type NanPattern = TsMatchTypes.NanPattern
export type FinitePattern = TsMatchTypes.FinitePattern
export type IntegerPattern = TsMatchTypes.IntegerPattern
export type RegexPattern = TsMatchTypes.RegexPattern
export type DatePattern = TsMatchTypes.DatePattern
export type ErrorPattern = TsMatchTypes.ErrorPattern
export type RegexpPattern = TsMatchTypes.RegexpPattern
export type NullishPattern = TsMatchTypes.NullishPattern
export type FalsyPattern = TsMatchTypes.FalsyPattern
export type TruthyPattern = TsMatchTypes.TruthyPattern
export type TemporalPatternKind = TsMatchTypes.TemporalPatternKind
export type TemporalPattern<TTemporalKind extends TemporalPatternKind> = TsMatchTypes.TemporalPattern<TTemporalKind>
export type LiteralPattern<TLiteral> = TsMatchTypes.LiteralPattern<TLiteral>
export type TemporalInstantValue = TsMatchTypes.TemporalInstantValue
export type TemporalPlainDateValue = TsMatchTypes.TemporalPlainDateValue
export type TemporalPlainTimeValue = TsMatchTypes.TemporalPlainTimeValue
export type TemporalPlainDateTimeValue = TsMatchTypes.TemporalPlainDateTimeValue
export type TemporalZonedDateTimeValue = TsMatchTypes.TemporalZonedDateTimeValue
export type TemporalDurationValue = TsMatchTypes.TemporalDurationValue
export type TemporalPlainYearMonthValue = TsMatchTypes.TemporalPlainYearMonthValue
export type TemporalPlainMonthDayValue = TsMatchTypes.TemporalPlainMonthDayValue
export type TemporalValue = TsMatchTypes.TemporalValue
export type UnionPattern<TPatterns extends readonly unknown[]> = TsMatchTypes.UnionPattern<TPatterns>
export type ExcludePattern<TPattern> = TsMatchTypes.ExcludePattern<TPattern>
export type OptionalPattern<TPattern> = TsMatchTypes.OptionalPattern<TPattern>
export type ArrayPattern<TPattern> = TsMatchTypes.ArrayPattern<TPattern>
export type NonEmptyArrayPattern<TPattern> = TsMatchTypes.NonEmptyArrayPattern<TPattern>
export type TuplePattern<TPatterns extends readonly unknown[]> = TsMatchTypes.TuplePattern<TPatterns>
export type RestPattern<TPattern> = TsMatchTypes.RestPattern<TPattern>
export type ExactPattern<TPattern> = TsMatchTypes.ExactPattern<TPattern>
export type GuardPattern<TGuarded, TNarrows extends boolean> = TsMatchTypes.GuardPattern<TGuarded, TNarrows>
export type InstanceOfPattern<TConstructor extends AbstractConstructor> = TsMatchTypes.InstanceOfPattern<TConstructor>
export type AnonymousSelectPattern<TPattern> = TsMatchTypes.AnonymousSelectPattern<TPattern>
export type NamedSelectPattern<TName extends PropertyKey, TPattern> = TsMatchTypes.NamedSelectPattern<TName, TPattern>
export type SelectPattern<TName extends PropertyKey | undefined, TPattern> = TsMatchTypes.SelectPattern<TName, TPattern>
export type CollectPattern<TName extends PropertyKey, TPattern> = TsMatchTypes.CollectPattern<TName, TPattern>
export type RecordPattern<TKeyPattern, TValuePattern> = TsMatchTypes.RecordPattern<TKeyPattern, TValuePattern>
export type NonEmptyRecordPattern<TKeyPattern, TValuePattern> = TsMatchTypes.NonEmptyRecordPattern<
  TKeyPattern,
  TValuePattern
>
export type MapEntryPattern<TKeyPattern = unknown, TValuePattern = unknown> = TsMatchTypes.MapEntryPattern<
  TKeyPattern,
  TValuePattern
>
export type HomogeneousMapPattern<TKeyPattern = unknown, TValuePattern = unknown> = TsMatchTypes.HomogeneousMapPattern<
  TKeyPattern,
  TValuePattern
>
export type EntryMapPattern<TEntries = readonly MapEntryPattern[]> = TsMatchTypes.EntryMapPattern<TEntries>
export type MapPattern<
  TKeyPattern = unknown,
  TValuePattern = unknown,
  TEntries extends readonly MapEntryPattern[] | undefined = undefined,
> = TsMatchTypes.MapPattern<TKeyPattern, TValuePattern, TEntries>
export type SetPattern<
  TPatterns extends readonly unknown[] = readonly unknown[],
  TMode extends 'homogeneous' | 'values' = TPatterns extends readonly [unknown] ? 'homogeneous' : 'values',
> = TsMatchTypes.SetPattern<TPatterns, TMode>
export type BuiltInPattern = TsMatchTypes.BuiltInPattern
export type MatchPatternSuggestion<TValue> = TsMatchTypes.MatchPatternSuggestion<TValue>
export type AbstractConstructor<T = object> = TsMatchTypes.AbstractConstructor<T>
export type PrimitiveName<TPrimitive extends Primitive> = TsMatchTypes.PrimitiveName<TPrimitive>
export type GroupEntry<TTags extends readonly Discriminant[], THandler> = TsMatchTypes.GroupEntry<TTags, THandler>
export type CaseEntry<TTag extends Discriminant, THandler> = TsMatchTypes.CaseEntry<TTag, THandler>
export type GroupedCaseEntry<TTags extends readonly Discriminant[], THandler> = TsMatchTypes.GroupedCaseEntry<
  TTags,
  THandler
>
export type CasesEntry<THandler> = TsMatchTypes.CasesEntry<THandler>
export type InferPattern<TPattern> = TsMatchTypes.InferPattern<TPattern>
export type MatchedValue<TValue, TPattern> = TsMatchTypes.MatchedValue<TValue, TPattern>
export type RemainingAfterPattern<TValue, TPattern> = TsMatchTypes.RemainingAfterPattern<TValue, TPattern>
export type RemainingAfterPatterns<TValue, TPatterns> = TsMatchTypes.RemainingAfterPatterns<TValue, TPatterns>
export type DiagnosticArgs<TDiagnostic> = TsMatchTypes.DiagnosticArgs<TDiagnostic>
export type PatternStructureArgument<
  TPattern,
  TAllowCollect extends boolean = false,
> = TsMatchTypes.PatternStructureArgument<TPattern, TAllowCollect>
export type MatchPatternArgument<TValue, TPattern> = TsMatchTypes.MatchPatternArgument<TValue, TPattern>
export type RepeatedPatternArgument<TPattern, TApi extends string> = TsMatchTypes.RepeatedPatternArgument<
  TPattern,
  TApi
>
export type ExcludePatternArgument<TPattern> = TsMatchTypes.ExcludePatternArgument<TPattern>
export type TuplePatternArgument<TPatterns extends readonly unknown[]> = TsMatchTypes.TuplePatternArgument<TPatterns>
export type RecordKeyPatternArgument<TKeyPattern, TApi extends string> = TsMatchTypes.RecordKeyPatternArgument<
  TKeyPattern,
  TApi
>
export type RecordValuePatternArgument<TValuePattern, TApi extends string> = TsMatchTypes.RecordValuePatternArgument<
  TValuePattern,
  TApi
>
export type NonExhaustiveMatchArgument<TRemaining, TApi extends string> = TsMatchTypes.NonExhaustiveMatchArgument<
  TRemaining,
  TApi
>
export type MatchByPathArgument<TValue, TPath extends PropertyPath> = TsMatchTypes.MatchByPathArgument<TValue, TPath>
export type MatchByTagArgument<TValue, TPath extends PropertyPath, TTag> = TsMatchTypes.MatchByTagArgument<
  TValue,
  TPath,
  TTag
>
export type MatchByTagsArgument<
  TValue,
  TPath extends PropertyPath,
  TTags extends readonly unknown[],
> = TsMatchTypes.MatchByTagsArgument<TValue, TPath, TTags>
export type NonExhaustiveMatchByArgument<
  TRemaining,
  TPath extends PropertyPath,
> = TsMatchTypes.NonExhaustiveMatchByArgument<TRemaining, TPath>
export type ObjectCaseMapSupportArgument<TTags> = TsMatchTypes.ObjectCaseMapSupportArgument<TTags>
export type ObjectCaseMapArgument<TTags, THandlers> = TsMatchTypes.ObjectCaseMapArgument<TTags, THandlers>
export type ExhaustiveEntriesArgument<TExpectedTags, THandledTags> = TsMatchTypes.ExhaustiveEntriesArgument<
  TExpectedTags,
  THandledTags
>
export type PartialEntriesArgument<TExpectedTags, THandledTags> = TsMatchTypes.PartialEntriesArgument<
  TExpectedTags,
  THandledTags
>
export type HandlerInput<TValue, TPattern> = TsMatchTypes.HandlerInput<TValue, TPattern>
export type GuardedValue<TValue, TPattern> = TsMatchTypes.GuardedValue<TValue, TPattern>
export type MatchByPath<TValue> = TsMatchTypes.MatchByPath<TValue>
export type PathValue<TValue, TPath extends PropertyPath> = TsMatchTypes.PathValue<TValue, TPath>
export type ExtractByPath<TValue, TPath extends PropertyPath, TTag> = TsMatchTypes.ExtractByPath<TValue, TPath, TTag>
export type CoveredByPath<TValue, TPath extends PropertyPath, TTag> = TsMatchTypes.CoveredByPath<TValue, TPath, TTag>
export type ObjectCaseKeys<TTags> = TsMatchTypes.ObjectCaseKeys<TTags>
export type CaseMap<TValue, TPath extends PropertyPath, TTags> = TsMatchTypes.CaseMap<TValue, TPath, TTags>
export type NoExtraKeys<TActual, TAllowedKeys extends PropertyKey> = TsMatchTypes.NoExtraKeys<TActual, TAllowedKeys>
export type MatchPromiseResult<T> = TsMatchTypes.MatchPromiseResult<T>
export type AwaitedReturn<T> = TsMatchTypes.AwaitedReturn<T>
