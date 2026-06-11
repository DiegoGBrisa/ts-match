import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { isRecord } from './script-utils.js'

export type FilePolicy = Readonly<Record<string, string>>
export type ImportExceptionPolicy = Readonly<Record<string, readonly string[]>>
export type PackageExport = {
  readonly import: string
  readonly types: string
}

export function normalized(path: string) {
  return path.replaceAll('\\', '/')
}

export function listFiles(directory: string): readonly string[] {
  const files: string[] = []
  if (!existsSync(directory)) return files

  for (const entry of readdirSync(directory).sort()) {
    const path = `${directory}/${entry}`
    const stats = statSync(path)
    if (stats.isDirectory()) {
      files.push(...listFiles(path))
      continue
    }
    files.push(normalized(path))
  }

  return files
}

export function listDirectories(directory: string): readonly string[] {
  if (!existsSync(directory)) return []

  const directories: string[] = []
  for (const entry of readdirSync(directory).sort()) {
    const path = `${directory}/${entry}`
    if (statSync(path).isDirectory()) directories.push(normalized(path))
  }
  return directories
}

export function allDirectories(directory: string): readonly string[] {
  const directories: string[] = []
  for (const child of listDirectories(directory)) {
    directories.push(child, ...allDirectories(child))
  }
  return directories
}

export function fileStem(fileName: string, extension: string) {
  return fileName.endsWith(extension) ? fileName.slice(0, -extension.length) : fileName
}

export function isInsideDirectory(filePath: string, directoryName: string) {
  return filePath.split('/').includes(directoryName)
}

export function fileDirectory(root: string, filePath: string): string | null {
  const relativePath = normalized(relative(root, filePath))
  if (relativePath.startsWith('..')) return null
  const [directory] = relativePath.split('/')
  return directory ?? null
}

export function packageExport(value: unknown): PackageExport | null {
  if (!isRecord(value)) return null
  const importTarget = value.import
  const typesTarget = value.types
  if (typeof importTarget !== 'string' || typeof typesTarget !== 'string') return null
  return { import: importTarget, types: typesTarget }
}

export function importSpecifiers(source: string): readonly string[] {
  const specifiers: string[] = []
  const importPattern = /from\s+['"]([^'"]+)['"]/g

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1]
    if (specifier) specifiers.push(specifier)
  }

  return specifiers
}

export function resolveImport(importer: string, specifier: string, extension: string) {
  if (!specifier.startsWith('.')) return null
  const withoutExtension = specifier.endsWith('.js') ? specifier.slice(0, -'.js'.length) : specifier
  const resolved = resolve(dirname(importer), `${withoutExtension}${extension}`)
  return normalized(relative(process.cwd(), resolved))
}

export function featureNameFromSourcePath(sourceRoot: string, filePath: string): string | null {
  const relativePath = normalized(relative(sourceRoot, filePath))
  if (relativePath.startsWith('..')) return null
  const featureName = relativePath.split('/')[0]
  return featureName ?? null
}

export function allowedFileNames(filePolicy: FilePolicy) {
  return new Set(Object.keys(filePolicy))
}

export function allowedImportTargets(importExceptionPolicy: ImportExceptionPolicy, importer: string) {
  return new Set(importExceptionPolicy[importer] ?? [])
}
