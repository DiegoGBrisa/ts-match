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
})
