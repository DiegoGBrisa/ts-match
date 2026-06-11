import { PromiseMatchByBuilderImpl } from './promise.js'
import { SyncMatchByBuilderImpl } from './sync.js'
import type { PromiseMatchByBuilder } from './promise-builder.js'
import type { SyncMatchByBuilder } from './sync-builder.js'
import type { MatchByPath, MatchByPathArgument, MatchPromiseResult, PropertyPath } from '../types/index.js'

function matchBySync<const TValue, const TPath extends MatchByPath<TValue>>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): SyncMatchByBuilder<TValue, TPath, TValue, never>
function matchBySync<const TValue, const TPath extends PropertyPath>(
  value: TValue,
  path: TPath & MatchByPathArgument<TValue, TPath>,
): SyncMatchByBuilder<TValue, TPath, TValue, never>
function matchBySync(value: unknown, path: PropertyPath): SyncMatchByBuilder<unknown, PropertyPath, unknown, never> {
  return new SyncMatchByBuilderImpl<unknown, PropertyPath, unknown, never>(value, path, [])
}

function matchByPromise<const TInput, const TPath extends MatchByPath<Awaited<TInput>>>(
  value: TInput,
  path: TPath & MatchByPathArgument<Awaited<TInput>, TPath>,
): PromiseMatchByBuilder<TInput, TPath, Awaited<TInput>, never>
function matchByPromise<const TInput, const TPath extends PropertyPath>(
  value: TInput,
  path: TPath & MatchByPathArgument<Awaited<TInput>, TPath>,
): PromiseMatchByBuilder<TInput, TPath, Awaited<TInput>, never>
function matchByPromise(
  value: unknown,
  path: PropertyPath,
): PromiseMatchByBuilder<unknown, PropertyPath, unknown, never> {
  return new PromiseMatchByBuilderImpl<unknown, PropertyPath, unknown, never>(value, path, [])
}

const matchByValue = Object.assign(matchBySync, { promise: matchByPromise })

export { matchByValue as matchBy }
export type MatchByFunction = typeof matchByValue
export type { MatchByPath, MatchPromiseResult }
export type { MatchByBuilder } from './types.js'
export type { PromiseMatchByBuilder } from './promise-builder.js'
export type { SyncMatchByBuilder } from './sync-builder.js'
