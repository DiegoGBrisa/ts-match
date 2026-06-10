import { freezePattern, PAIR_ARITY } from './base.js'
import { pWildcard } from './primitives.js'
import { PATTERN_TOKEN } from './token.js'
import type {
  AbstractConstructor,
  AnonymousSelectPattern,
  CollectPattern,
  GuardPattern,
  InstanceOfPattern,
  NamedSelectPattern,
  NonEmptyRecordPattern,
  PatternStructureArgument,
  RecordKeyPatternArgument,
  RecordPattern,
  RecordValuePatternArgument,
  SelectPattern,
  WildcardPattern,
} from '../types/index.js'

/**
 * Matches values accepted by a predicate or type guard.
 *
 * Use a type guard when you want handler parameters to narrow to a custom type,
 * or a boolean predicate when runtime filtering is enough. The predicate receives
 * the candidate value and must return `true` for a match.
 *
 * @param predicate - Boolean predicate or TypeScript type guard.
 * @returns A frozen predicate pattern helper.
 * @example
 * ```ts
 * match(value).with(P.when((n: number): n is 1 => n === 1), () => 'one').otherwise(() => 'other')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match#boundary-assertions
 */
export function pWhen<TInput, TGuarded extends TInput>(
  predicate: (value: TInput) => value is TGuarded,
): GuardPattern<TGuarded, true>

/**
 * Matches values accepted by a boolean predicate without claiming exhaustiveness coverage.
 *
 * @param predicate - Function that returns `true` when the candidate should match.
 * @returns A frozen predicate pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pWhen<TInput>(predicate: (value: TInput) => boolean): GuardPattern<TInput, false>

/**
 * Creates the runtime predicate pattern used by the public `P.when(...)` overloads.
 *
 * @param predicate - Runtime predicate supplied by the caller.
 * @returns A frozen predicate pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pWhen(predicate: (value: unknown) => boolean): GuardPattern<unknown, boolean> {
  return freezePattern({ [PATTERN_TOKEN]: 'when', predicate, narrows: false })
}

/**
 * Matches values that are instances of a constructor.
 *
 * Use this for class instances and built-in constructors that should be checked
 * with JavaScript's `instanceof` operator.
 *
 * @param constructor - Constructor function used on the right-hand side of `instanceof`.
 * @returns A frozen instance-of pattern helper.
 * @example
 * ```ts
 * match(value).with(P.instanceOf(Error), (error) => error.message).otherwise(() => '')
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 */
export function pInstanceOf<TConstructor extends AbstractConstructor>(
  constructor: TConstructor,
): InstanceOfPattern<TConstructor> {
  return freezePattern({ [PATTERN_TOKEN]: 'instance-of', constructor })
}

/**
 * Captures a matched value and passes that capture to the handler.
 *
 * Use anonymous `P.select()` when the handler should receive one captured value.
 * Use named `P.select(name, pattern?)` when the handler should receive an object
 * of captures. Anonymous and named selections cannot be mixed in one successful
 * pattern, and repeated containers such as `P.array(...)` reject selections.
 *
 * @returns A frozen anonymous selection pattern over the wildcard pattern.
 * @example
 * ```ts
 * match(value).with({ payload: P.select() }, (payload) => payload).otherwise(() => undefined)
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#handler-parameters-are-narrowed
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pSelect(): AnonymousSelectPattern<WildcardPattern>

/**
 * Captures a matched value under a property key and passes all named captures to the handler.
 *
 * @param name - Capture key that will appear on the handler payload object.
 * @returns A frozen named selection pattern over the wildcard pattern.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 */
export function pSelect<const TName extends PropertyKey>(name: TName): NamedSelectPattern<TName, WildcardPattern>

/**
 * Captures a nested pattern match under a property key.
 *
 * @param name - Capture key that will appear on the handler payload object.
 * @param pattern - Pattern that must match before the value is captured.
 * @returns A frozen named selection pattern over `pattern`.
 * @see https://github.com/DiegoGBrisa/ts-match#selections-change-the-handler-payload
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pSelect<const TName extends PropertyKey, const TPattern>(
  name: TName,
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): NamedSelectPattern<TName, TPattern>

/**
 * Creates the runtime selection pattern used by the public `P.select(...)` overloads.
 *
 * @param name - Optional named capture key. Omit it for an anonymous capture.
 * @param pattern - Pattern that must match before the value is captured.
 * @returns A frozen selection pattern helper.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pSelect(
  name?: PropertyKey,
  pattern: unknown = pWildcard,
): SelectPattern<PropertyKey | undefined, unknown> {
  return freezePattern({ [PATTERN_TOKEN]: 'select', name, pattern })
}

/**
 * Captures every repeated value matched by a nested pattern into a named array.
 *
 * `P.collect(name, pattern)` is valid only inside repeated containers such as
 * `P.array(...)`, `P.record(...)`, `P.map(...)`, and `P.set(...)`. It behaves
 * like a normal matching wrapper: the inner pattern must match before the value
 * is appended to the handler payload array.
 *
 * @param name - Capture key that will appear on the handler payload object.
 * @param pattern - Pattern that must match before the value is collected.
 * @returns A frozen collection capture pattern over `pattern`.
 * @see https://github.com/DiegoGBrisa/ts-match#collection-captures
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#selection-semantics
 */
export function pCollect<const TName extends PropertyKey, const TPattern>(
  name: TName,
  pattern: TPattern & PatternStructureArgument<TPattern, true>,
): CollectPattern<TName, TPattern>
export function pCollect(name: PropertyKey, pattern: unknown): CollectPattern<PropertyKey, unknown> {
  if (arguments.length < PAIR_ARITY) {
    throw new TypeError('P.collect(name, pattern) requires a capture name and pattern.')
  }
  const nameType = typeof name
  if (nameType !== 'string' && nameType !== 'number' && nameType !== 'symbol') {
    throw new TypeError('P.collect(name, pattern) requires a string, number, or symbol capture name.')
  }
  return freezePattern({ [PATTERN_TOKEN]: 'collect', name, pattern })
}

/**
 * Matches plain records whose enumerable keys and values match supplied patterns.
 *
 * The runtime value must be a plain object, not an array, class instance, map,
 * set, or function. String keys that represent canonical numbers can also match
 * number key patterns, mirroring JavaScript object-key coercion.
 *
 * @param key - Pattern required for every enumerable key.
 * @param value - Pattern required for every enumerable value.
 * @returns A frozen record pattern helper.
 * @example
 * ```ts
 * match(value).with(P.record(P.string, P.number), (scores) => scores).otherwise(() => ({}))
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pRecord<const TKeyPattern, const TValuePattern>(
  key: TKeyPattern & RecordKeyPatternArgument<TKeyPattern, 'P.record'>,
  value: TValuePattern & RecordValuePatternArgument<TValuePattern, 'P.record'>,
): RecordPattern<TKeyPattern, TValuePattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'record', key, value })
}

/**
 * Matches non-empty plain records whose keys and values match supplied patterns.
 *
 * Use this when an empty object should be rejected. The same plain-record and
 * selection restrictions as `P.record(...)` apply.
 *
 * @param key - Pattern required for every enumerable key.
 * @param value - Pattern required for every enumerable value.
 * @returns A frozen non-empty record pattern helper.
 * @example
 * ```ts
 * match(value).with(P.nonEmptyRecord(P.string, P.number), (scores) => scores).otherwise(() => ({}))
 * ```
 * @see https://github.com/DiegoGBrisa/ts-match#pattern-guide-p-namespace
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/design.md#object-semantics
 */
export function pNonEmptyRecord<const TKeyPattern, const TValuePattern>(
  key: TKeyPattern & RecordKeyPatternArgument<TKeyPattern, 'P.nonEmptyRecord'>,
  value: TValuePattern & RecordValuePatternArgument<TValuePattern, 'P.nonEmptyRecord'>,
): NonEmptyRecordPattern<TKeyPattern, TValuePattern> {
  return freezePattern({ [PATTERN_TOKEN]: 'non-empty-record', key, value })
}
