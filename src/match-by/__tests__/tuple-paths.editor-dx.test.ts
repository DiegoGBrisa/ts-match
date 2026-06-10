import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const COMPLETION_MARKER = '/*cursor*/'
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
