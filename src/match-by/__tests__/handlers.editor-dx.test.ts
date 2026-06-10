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
    'suggests literal completions inside P.union arguments',
    () => {
      const result = getCompletionsAtMarker(`
      import { match, P } from '../src/index.ts'

      type User = { readonly role: 'admin' | 'member' | 'owner' }
      declare const user: User
      match(user).with({ role: P.union('admin', '${COMPLETION_MARKER}') }, (value) => value)
    `)

      expect(result.names).toEqual(expect.arrayContaining(['admin']))
    },
    EDITOR_DX_TEST_TIMEOUT_MS,
  )
})
