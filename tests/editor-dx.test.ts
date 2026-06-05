import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const COMPLETION_MARKER = '/*cursor*/'
const EDITOR_DX_TEST_TIMEOUT_MS = 60_000

interface CompletionProbeOptions {
  readonly includeDiagnostics?: boolean
}

interface CompletionProbeResult {
  readonly names: readonly string[]
  readonly diagnostics: readonly string[]
}

function createLanguageServiceHost(
  fileName: string,
  content: string,
  compilerOptions: ts.CompilerOptions,
): ts.LanguageServiceHost {
  const files = new Map([[fileName, content]])

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => '0',
    getScriptSnapshot: (requestedFileName) => {
      const file = files.get(requestedFileName)
      if (file !== undefined) return ts.ScriptSnapshot.fromString(file)
      if (existsSync(requestedFileName)) return ts.ScriptSnapshot.fromString(readFileSync(requestedFileName, 'utf8'))
      return undefined
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  }

  if (ts.sys.realpath === undefined) return host
  return { ...host, realpath: ts.sys.realpath }
}

function getCompletionsAtMarker(sourceWithMarker: string, options: CompletionProbeOptions = {}): CompletionProbeResult {
  const markerIndex = sourceWithMarker.indexOf(COMPLETION_MARKER)
  if (markerIndex < 0) throw new Error(`Completion marker ${COMPLETION_MARKER} was not found.`)

  const fileName = join(process.cwd(), 'tests', 'editor-dx.fixture.ts')
  const content = sourceWithMarker.replace(COMPLETION_MARKER, '')
  const compilerOptions: ts.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowImportingTsExtensions: true,
    noEmit: true,
    skipLibCheck: true,
  }
  const languageService = ts.createLanguageService(createLanguageServiceHost(fileName, content, compilerOptions))
  const completions = languageService.getCompletionsAtPosition(fileName, markerIndex, {
    includeCompletionsForModuleExports: false,
    includeCompletionsForImportStatements: false,
  })

  return {
    names: completions?.entries.map((entry) => entry.name) ?? [],
    diagnostics:
      options.includeDiagnostics === true
        ? languageService
            .getSemanticDiagnostics(fileName)
            .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
        : [],
  }
}

describe('editor DX', () => {
  it('suggests finite nested matchBy string paths from the input value type', () => {
    const result = getCompletionsAtMarker(
      `
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'pointer' } }; readonly value: { readonly form: string } }
        | { readonly meta: { readonly type: 'submit'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'form' } }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, '${COMPLETION_MARKER}')
    `,
      { includeDiagnostics: true },
    )

    expect(result.names).toEqual(expect.arrayContaining(['meta.type', 'meta.nested.kind']))
    expect(result.names).not.toEqual(
      expect.arrayContaining(['meta', 'meta.x', 'meta.y', 'meta.nested', 'value', 'value.form']),
    )
    expect(result.diagnostics.join('\n')).toContain('ts-match: invalid matchBy path')
  })

  it('suggests finite matchBy.promise paths from the resolved input value type', () => {
    const stringPath = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly nested: { readonly kind: 'pointer' } }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit'; readonly nested: { readonly kind: 'form' } }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), '${COMPLETION_MARKER}')
    `)

    const tuplePath = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly nested: { readonly kind: 'pointer' } }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit'; readonly nested: { readonly kind: 'form' } }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), ['${COMPLETION_MARKER}'])
    `)

    expect(stringPath.names).toEqual(expect.arrayContaining(['meta.type', 'meta.nested.kind']))
    expect(stringPath.names).not.toEqual(expect.arrayContaining(['meta', 'value']))
    expect(tuplePath.names).toEqual(expect.arrayContaining(['meta']))
  })

  it('suggests matchBy.promise tags, remaining tags, maps, partial maps, and grouped callbacks', () => {
    const firstTag = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type').with('${COMPLETION_MARKER}', (value) => value)
    `)

    const remainingTag = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type')
        .with('click', (value) => value.value.x)
        .with('${COMPLETION_MARKER}', (value) => value)
    `)

    const casesMap = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type').cases({ ${COMPLETION_MARKER} })
    `)

    const partialMap = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type').partial({ ${COMPLETION_MARKER} }).otherwise((value) => value)
    `)

    const partialTupleEntry = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type').partial([['${COMPLETION_MARKER}', (value) => value]]).otherwise((value) => value)
    `)

    const groupedPartialTupleEntry = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type').partial([[['${COMPLETION_MARKER}'], (value) => value]]).otherwise((value) => value)
    `)

    const groupedCallback = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type').cases((group) => [group('${COMPLETION_MARKER}', (value) => value)])
    `)

    const variadicGroupedCallback = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare function fetchEvent(): Promise<UiEvent>
      matchBy.promise(fetchEvent(), 'meta.type').cases((group) => [group('click', '${COMPLETION_MARKER}', (value) => value)])
    `)

    expect(firstTag.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(remainingTag.names).toEqual(expect.arrayContaining(['submit']))
    expect(remainingTag.names).not.toEqual(expect.arrayContaining(['click']))
    expect(casesMap.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(partialMap.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(partialTupleEntry.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(groupedPartialTupleEntry.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(groupedCallback.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(variadicGroupedCallback.names).toEqual(expect.arrayContaining(['click', 'submit']))
  })

  it('suggests P namespace helpers in promise builders', () => {
    const directPattern = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      declare function fetchValue(): Promise<unknown>
      match.promise(fetchValue()).with(P.${COMPLETION_MARKER}, (matched) => matched)
    `)

    const nestedPattern = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      type User = { readonly type: 'user'; readonly id: string }
      declare function fetchUser(): Promise<User>
      match.promise(fetchUser()).with({ id: P.${COMPLETION_MARKER} }, (matched) => matched.id)
    `)

    for (const result of [directPattern, nestedPattern]) {
      expect(result.names).toEqual(expect.arrayContaining(['string', 'number', 'select', 'union']))
    }
  })

  it('suggests matchBy tags and remaining tags in .with(...) chains', () => {
    const firstTag = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, 'meta.type').with('${COMPLETION_MARKER}', (value) => value)
    `)

    const remainingTag = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, 'meta.type')
        .with('click', (value) => value.value.x)
        .with('${COMPLETION_MARKER}', (value) => value)
    `)

    const symbolTag = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      const EVENT_KIND: unique symbol = Symbol('event-kind')
      type SymbolEvent =
        | { readonly meta: { readonly [EVENT_KIND]: 'user'; readonly name: string } }
        | { readonly meta: { readonly [EVENT_KIND]: 'system'; readonly code: number } }

      declare const event: SymbolEvent
      matchBy(event, ['meta', EVENT_KIND]).with('${COMPLETION_MARKER}', (value) => value)
    `)

    expect(firstTag.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(remainingTag.names).toEqual(expect.arrayContaining(['submit']))
    expect(remainingTag.names).not.toEqual(expect.arrayContaining(['click']))
    expect(symbolTag.names).toEqual(expect.arrayContaining(['user', 'system']))
  })

  it('suggests matchBy tags inside partial array-form grouped entries', () => {
    const tuplePartialGroupArray = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, 'meta.type').partial([[['${COMPLETION_MARKER}'], (value) => value]]).otherwise((value) => value)
    `)

    expect(tuplePartialGroupArray.names).toEqual(expect.arrayContaining(['click', 'submit']))
  })

  it('suggests narrowed handler fields across matchBy chains, partial entries, and callback groups', () => {
    const partialGroupedTupleHandler = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type CartAction =
        | { readonly type: 'addItem'; readonly cartId: string; readonly sku: string; readonly quantity: number }
        | { readonly type: 'updateQuantity'; readonly cartId: string; readonly sku: string; readonly quantity: number }
        | { readonly type: 'applyCoupon'; readonly cartId: string; readonly code: string }
        | { readonly type: 'checkout'; readonly cartId: string; readonly total: number }

      declare const action: CartAction
      matchBy(action, 'type').partial([
        [['addItem', 'updateQuantity'], (value) => value.${COMPLETION_MARKER}],
        ['applyCoupon', (value) => value.code],
      ]).otherwise((value) => value)
    `)

    const callbackGroupedPartialHandler = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type CartAction =
        | { readonly type: 'addItem'; readonly cartId: string; readonly sku: string; readonly quantity: number }
        | { readonly type: 'updateQuantity'; readonly cartId: string; readonly sku: string; readonly quantity: number }
        | { readonly type: 'applyCoupon'; readonly cartId: string; readonly code: string }
        | { readonly type: 'checkout'; readonly cartId: string; readonly total: number }

      declare const action: CartAction
      matchBy(action, 'type').partial((group) => [
        group(['addItem', 'updateQuantity'], (value) => value.${COMPLETION_MARKER}),
      ]).otherwise((value) => value)
    `)

    const withHandler = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type AppMessage =
        | { readonly channel: 'analytics'; readonly event: { readonly name: string } }
        | { readonly channel: 'health'; readonly status: 'ok' | 'degraded' }

      declare const message: AppMessage
      matchBy(message, 'channel')
        .with('analytics', (value) => value.event.name)
        .with('health', (value) => value.${COMPLETION_MARKER})
        .exhaustive()
    `)

    const promisePartialGroupedTupleHandler = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type CartAction =
        | { readonly type: 'addItem'; readonly cartId: string; readonly sku: string; readonly quantity: number }
        | { readonly type: 'updateQuantity'; readonly cartId: string; readonly sku: string; readonly quantity: number }
        | { readonly type: 'applyCoupon'; readonly cartId: string; readonly code: string }
        | { readonly type: 'checkout'; readonly cartId: string; readonly total: number }

      declare function fetchAction(): Promise<CartAction>
      matchBy.promise(fetchAction(), 'type').partial([
        [['addItem', 'updateQuantity'], (value) => value.${COMPLETION_MARKER}],
      ]).otherwise((value) => value)
    `)

    expect(partialGroupedTupleHandler.names).toEqual(expect.arrayContaining(['cartId', 'quantity', 'sku', 'type']))
    expect(partialGroupedTupleHandler.names).not.toEqual(expect.arrayContaining(['code', 'total']))
    expect(callbackGroupedPartialHandler.names).toEqual(expect.arrayContaining(['cartId', 'quantity', 'sku', 'type']))
    expect(callbackGroupedPartialHandler.names).not.toEqual(expect.arrayContaining(['code', 'total']))
    expect(withHandler.names).toEqual(expect.arrayContaining(['channel', 'status']))
    expect(withHandler.names).not.toEqual(expect.arrayContaining(['event']))
    expect(promisePartialGroupedTupleHandler.names).toEqual(
      expect.arrayContaining(['cartId', 'quantity', 'sku', 'type']),
    )
    expect(promisePartialGroupedTupleHandler.names).not.toEqual(expect.arrayContaining(['code', 'total']))
  })

  it(
    'suggests selected and narrowed match handler completions',
    () => {
      const selectedHandler = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      type Product =
        | { readonly type: 'book'; readonly title: string; readonly rating: number }
        | { readonly type: 'course'; readonly title: string; readonly rating: number }

      declare const product: Product
      match(product).with(
        { type: P.union('book', 'course'), title: P.select('title', P.string), rating: P.select('rating', P.number) },
        (value) => value.${COMPLETION_MARKER},
      )
    `)

      const promiseSelectedHandler = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      type Product =
        | { readonly type: 'book'; readonly title: string; readonly rating: number }
        | { readonly type: 'course'; readonly title: string; readonly rating: number }

      declare function fetchProduct(): Promise<Product>
      match.promise(fetchProduct()).with(
        { type: P.union('book', 'course'), title: P.select('title', P.string), rating: P.select('rating', P.number) },
        (value) => value.${COMPLETION_MARKER},
      )
    `)

      const whenHandler = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      declare const value: unknown
      match(value).with(
        P.when((candidate: unknown): candidate is { readonly id: string; readonly role: 'admin' | 'member' } => true),
        (candidate) => candidate.${COMPLETION_MARKER},
      )
    `)

      expect(selectedHandler.names).toEqual(expect.arrayContaining(['rating', 'title']))
      expect(promiseSelectedHandler.names).toEqual(expect.arrayContaining(['rating', 'title']))
      expect(whenHandler.names).toEqual(expect.arrayContaining(['id', 'role']))
    },
    EDITOR_DX_TEST_TIMEOUT_MS,
  )

  it(
    'suggests helper completions in nested pattern arguments',
    () => {
      const unionLiteralArgument = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      type User = { readonly role: 'admin' | 'member' | 'owner' }
      declare const user: User
      match(user).with({ role: P.union('admin', '${COMPLETION_MARKER}') }, (value) => value)
    `)

      const assertionUnionLiteralArgument = getCompletionsAtMarker(`
      import { assertMatching, P } from '../src/index.ts'

      declare const form: unknown
      assertMatching({ type: 'user', role: P.union('admin', '${COMPLETION_MARKER}') }, form)
    `)

      const optionalHelperArgument = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      declare const value: unknown
      match(value).with({ role: P.optional(P.${COMPLETION_MARKER}) }, (matched) => matched)
    `)

      expect(unionLiteralArgument.names).toEqual(expect.arrayContaining(['admin']))
      expect(assertionUnionLiteralArgument.names).toEqual(expect.arrayContaining(['admin']))
      expect(optionalHelperArgument.names).toEqual(expect.arrayContaining(['string', 'number', 'union']))
    },
    EDITOR_DX_TEST_TIMEOUT_MS,
  )

  it('suggests matchBy case keys for object maps, partial maps, and grouped callbacks', () => {
    const casesMap = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, 'meta.type').cases({ ${COMPLETION_MARKER} })
    `)

    const partialMap = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, 'meta.type').partial({ ${COMPLETION_MARKER} }).otherwise((value) => value)
    `)

    const groupedCallback = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, 'meta.type').cases((group) => [group('${COMPLETION_MARKER}', (value) => value)])
    `)

    const variadicGroupedCallback = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click' }; readonly value: { readonly x: number } }
        | { readonly meta: { readonly type: 'submit' }; readonly value: { readonly form: string } }

      declare const event: UiEvent
      matchBy(event, 'meta.type').cases((group) => [group('click', '${COMPLETION_MARKER}', (value) => value)])
    `)

    expect(casesMap.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(partialMap.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(groupedCallback.names).toEqual(expect.arrayContaining(['click', 'submit']))
    expect(variadicGroupedCallback.names).toEqual(expect.arrayContaining(['click', 'submit']))
  })

  it(
    'suggests literal match patterns',
    () => {
      const literalPattern = getCompletionsAtMarker(`
      import { match } from '../src/index.ts'

      type Status = 'idle' | 'loading' | 'success'
      declare const status: Status
      match(status).with('${COMPLETION_MARKER}', (value) => value)
    `)

      expect(literalPattern.names).toEqual(expect.arrayContaining(['idle', 'loading', 'success']))
    },
    EDITOR_DX_TEST_TIMEOUT_MS,
  )

  it(
    'suggests structural object match pattern keys and nested literals',
    () => {
      const objectKey = getCompletionsAtMarker(`
      import { match } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly x: number } }
        | { readonly meta: { readonly type: 'submit'; readonly form: string } }

      declare const event: UiEvent
      match(event).with({ ${COMPLETION_MARKER} }, (value) => value)
    `)

      const nestedLiteral = getCompletionsAtMarker(`
      import { match } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly x: number } }
        | { readonly meta: { readonly type: 'submit'; readonly form: string } }

      declare const event: UiEvent
      match(event).with({ meta: { type: '${COMPLETION_MARKER}' } }, (value) => value)
    `)

      expect(objectKey.names).toEqual(expect.arrayContaining(['meta']))
      expect(nestedLiteral.names).toEqual(expect.arrayContaining(['click', 'submit']))
    },
    EDITOR_DX_TEST_TIMEOUT_MS,
  )

  it(
    'preserves P namespace helper autocomplete in direct, nested, assertion, and helper-argument positions',
    () => {
      const directPattern = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      declare const value: unknown
      match(value).with(P.${COMPLETION_MARKER}, (matched) => matched)
    `)

      const nestedPattern = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      type User = { readonly type: 'user'; readonly id: string }
      declare const user: User
      match(user).with({ id: P.${COMPLETION_MARKER} }, (matched) => matched.id)
    `)

      const assertionPattern = getCompletionsAtMarker(`
      import { isMatching, P } from '../src/index.ts'

      declare const value: unknown
      isMatching(P.${COMPLETION_MARKER}, value)
    `)

      const helperArgument = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      declare const value: unknown
      match(value).with(P.union(P.${COMPLETION_MARKER}), (matched) => matched)
    `)

      for (const result of [directPattern, nestedPattern, assertionPattern, helperArgument]) {
        expect(result.names).toEqual(expect.arrayContaining(['string', 'number', 'select', 'collect', 'union']))
      }
    },
    EDITOR_DX_TEST_TIMEOUT_MS,
  )

  it('suggests tuple path segments for array-style matchBy paths', () => {
    const firstSegment = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'pointer' } } }
        | { readonly meta: { readonly type: 'submit'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'form' } } }

      declare const event: UiEvent
      matchBy(event, ['${COMPLETION_MARKER}'])
    `)

    const secondSegment = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'pointer' } } }
        | { readonly meta: { readonly type: 'submit'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'form' } } }

      declare const event: UiEvent
      matchBy(event, ['meta', '${COMPLETION_MARKER}'])
    `)

    const thirdSegment = getCompletionsAtMarker(`
      import { matchBy } from '../src/index.ts'

      type UiEvent =
        | { readonly meta: { readonly type: 'click'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'pointer' } } }
        | { readonly meta: { readonly type: 'submit'; readonly x: number; readonly y: number; readonly nested: { readonly kind: 'form' } } }

      declare const event: UiEvent
      matchBy(event, ['meta', 'nested', '${COMPLETION_MARKER}'])
    `)

    expect(firstSegment.names).toEqual(expect.arrayContaining(['meta']))
    expect(firstSegment.names).not.toEqual(expect.arrayContaining(['type', 'x', 'y']))
    expect(secondSegment.names).toEqual(expect.arrayContaining(['type', 'nested']))
    expect(secondSegment.names).not.toEqual(expect.arrayContaining(['x', 'y']))
    expect(thirdSegment.names).toEqual(expect.arrayContaining(['kind']))
  })
})
