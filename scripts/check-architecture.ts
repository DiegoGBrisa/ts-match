import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  allDirectories,
  allowedFileNames,
  allowedImportTargets,
  featureNameFromSourcePath,
  fileDirectory,
  fileStem,
  importSpecifiers,
  isInsideDirectory,
  listDirectories,
  listFiles,
  normalized,
  packageExport,
  resolveImport,
} from './architecture-check-helpers.js'
import { architecturePolicy } from './architecture-policy.js'
import { isRecord } from './script-utils.js'

const {
  crossRuntimeTestFolders,
  crossTypecheckFolders,
  deepFeatureFolders,
  featureFolders,
  forbiddenInternalDirectory,
  javascriptModuleTestExtension,
  publicSubpaths,
  runtimeTestRoot,
  sharedFiles,
  sourceIndex,
  sourceRoot,
  testDirectory,
  testExtension,
  typecheckDirectory,
  typecheckExtension,
  typeEngineFiles,
  typeEngineImportExceptions,
  typescriptExtension,
  typeTestRoot,
} = architecturePolicy

const failures: string[] = []

if (!existsSync('docs/code-map.md')) failures.push('docs/code-map.md must document repository navigation.')
if (existsSync(join(sourceRoot, forbiddenInternalDirectory)))
  failures.push('src/_internal is disallowed; use feature ownership or src/shared for concept-neutral primitives.')

for (const entry of readdirSync(sourceRoot).sort()) {
  const path = join(sourceRoot, entry)
  if (statSync(path).isFile() && entry !== sourceIndex) {
    failures.push(`src root file ${path} is disallowed; top-level concepts must be folder modules.`)
  }
}

for (const featureFolder of featureFolders) {
  const indexPath = join(sourceRoot, featureFolder, sourceIndex)
  if (!existsSync(indexPath)) failures.push(`${indexPath} is required as the feature seam.`)
}

for (const featureFolder of deepFeatureFolders) {
  const readmePath = join(sourceRoot, featureFolder, 'README.md')
  if (!existsSync(readmePath)) failures.push(`${readmePath} is required for feature navigation.`)
}

for (const directory of [sourceRoot, ...allDirectories(sourceRoot)]) {
  const childDirectories = new Set(listDirectories(directory).map((path) => path.split('/').at(-1)))
  for (const filePath of listFiles(directory).filter((path) => dirname(path) === normalized(directory))) {
    const fileName = filePath.split('/').at(-1)
    if (!fileName?.endsWith(typescriptExtension)) continue
    if (childDirectories.has(fileStem(fileName, typescriptExtension))) {
      failures.push(
        `${filePath} conflicts with sibling folder ${join(directory, fileStem(fileName, typescriptExtension))}.`,
      )
    }
  }
}

for (const filePath of listFiles(sourceRoot)) {
  if (filePath.endsWith(testExtension) && !isInsideDirectory(filePath, testDirectory)) {
    failures.push(`${filePath} must live inside a feature-local ${testDirectory}/ directory.`)
  }
  if (filePath.endsWith(typecheckExtension) && !isInsideDirectory(filePath, typecheckDirectory)) {
    failures.push(`${filePath} must live inside a feature-local ${typecheckDirectory}/ directory.`)
  }
  if (isInsideDirectory(filePath, testDirectory) && !filePath.endsWith(testExtension)) {
    failures.push(`${filePath} is inside ${testDirectory}/ but is not a runtime test file.`)
  }
  if (isInsideDirectory(filePath, typecheckDirectory) && !filePath.endsWith(typecheckExtension)) {
    failures.push(`${filePath} is inside ${typecheckDirectory}/ but is not a typecheck fixture.`)
  }
}

for (const entry of readdirSync(runtimeTestRoot).sort()) {
  const path = join(runtimeTestRoot, entry)
  if (statSync(path).isFile()) {
    failures.push(`${path} is disallowed; cross-feature runtime tests must live in a concern directory.`)
  }
  if (statSync(path).isDirectory() && !crossRuntimeTestFolders.some((folder) => folder === entry)) {
    failures.push(`${path} is not an allowed cross-feature runtime test concern directory.`)
  }
}

for (const filePath of listFiles(runtimeTestRoot)) {
  const directory = fileDirectory(runtimeTestRoot, filePath)
  const hasRuntimeExtension = filePath.endsWith(testExtension) || filePath.endsWith(javascriptModuleTestExtension)
  if (directory && !crossRuntimeTestFolders.some((folder) => folder === directory)) {
    failures.push(`${filePath} must live under an allowed cross-feature runtime test concern directory.`)
  }
  if (!hasRuntimeExtension) failures.push(`${filePath} must be a runtime test file.`)
}

for (const entry of readdirSync(typeTestRoot).sort()) {
  const path = join(typeTestRoot, entry)
  if (statSync(path).isFile()) {
    failures.push(`${path} is disallowed; cross-feature type fixtures must live in a concern directory.`)
  }
  if (statSync(path).isDirectory() && !crossTypecheckFolders.some((folder) => folder === entry)) {
    failures.push(`${path} is not an allowed cross-feature typecheck concern directory.`)
  }
}

for (const filePath of listFiles(typeTestRoot)) {
  const directory = fileDirectory(typeTestRoot, filePath)
  if (directory && !crossTypecheckFolders.some((folder) => folder === directory)) {
    failures.push(`${filePath} must live under an allowed cross-feature typecheck concern directory.`)
  }
  if (!filePath.endsWith(typecheckExtension)) failures.push(`${filePath} must be a typecheck fixture.`)
}

const typeEngineFileNames = allowedFileNames(typeEngineFiles)
for (const fileName of typeEngineFileNames) {
  const filePath = join(sourceRoot, 'types', fileName)
  if (!existsSync(filePath)) failures.push(`${filePath} is listed in architecture policy but does not exist.`)
}

for (const filePath of listFiles(join(sourceRoot, 'types')).filter((path) => path.endsWith(typescriptExtension))) {
  const fileName = filePath.split('/').at(-1)
  if (fileName && !typeEngineFileNames.has(fileName)) {
    failures.push(
      `${filePath} is not listed in architecture policy. Colocate owned types with their feature, or add a reviewed type-engine policy entry with a reason.`,
    )
  }

  const source = readFileSync(filePath, 'utf8')
  const allowedTargets = allowedImportTargets(typeEngineImportExceptions, filePath)
  for (const specifier of importSpecifiers(source)) {
    const target = resolveImport(filePath, specifier, typescriptExtension)
    if (!target) continue
    const targetFeature = featureNameFromSourcePath(sourceRoot, target)
    if (targetFeature && targetFeature !== 'types' && !allowedTargets.has(target)) {
      failures.push(
        `${filePath} must not import feature module ${target}. Add a narrow policy exception only for token/type-shape imports.`,
      )
    }
  }
}

const sharedFileNames = allowedFileNames(sharedFiles)
for (const fileName of sharedFileNames) {
  const filePath = join(sourceRoot, 'shared', fileName)
  if (!existsSync(filePath)) failures.push(`${filePath} is listed in architecture policy but does not exist.`)
}

for (const filePath of listFiles(join(sourceRoot, 'shared')).filter((path) => path.endsWith(typescriptExtension))) {
  const fileName = filePath.split('/').at(-1)
  if (fileName && !sharedFileNames.has(fileName)) {
    failures.push(
      `${filePath} is not listed in architecture policy. Colocate owned code with its feature, or add a reviewed concept-neutral shared policy entry with a reason.`,
    )
  }

  const source = readFileSync(filePath, 'utf8')
  for (const specifier of importSpecifiers(source)) {
    const target = resolveImport(filePath, specifier, typescriptExtension)
    if (!target) continue
    const targetFeature = featureNameFromSourcePath(sourceRoot, target)
    if (targetFeature && targetFeature !== 'shared') {
      failures.push(`${filePath} must not import feature module ${target}.`)
    }
  }
}

const packageJson: unknown = JSON.parse(readFileSync('package.json', 'utf8'))
const exportsValue = isRecord(packageJson) ? packageJson.exports : undefined
if (!isRecord(exportsValue)) {
  failures.push('package.json exports must be an object.')
} else {
  const rootExport = packageExport(exportsValue['.'])
  if (!rootExport) {
    failures.push('package.json root export must define import, require, and types targets.')
  } else {
    if (rootExport.import !== './dist/index.js') failures.push('root import target must be ./dist/index.js.')
    if (rootExport.require !== './dist-cjs/index.js') failures.push('root require target must be ./dist-cjs/index.js.')
    if (rootExport.types !== './dist/index.d.ts') failures.push('root types target must be ./dist/index.d.ts.')
  }

  for (const subpath of publicSubpaths) {
    const exportValue = packageExport(exportsValue[`./${subpath}`])
    const importTarget = `./dist/${subpath}/index.js`
    const requireTarget = `./dist-cjs/${subpath}/index.js`
    const typesTarget = `./dist/${subpath}/index.d.ts`
    if (!exportValue) {
      failures.push(`package.json export ./${subpath} must define import, require, and types targets.`)
      continue
    }
    if (exportValue.import !== importTarget) failures.push(`./${subpath} import target must be ${importTarget}.`)
    if (exportValue.require !== requireTarget) failures.push(`./${subpath} require target must be ${requireTarget}.`)
    if (exportValue.types !== typesTarget) failures.push(`./${subpath} types target must be ${typesTarget}.`)
  }
}

if (failures.length > 0) {
  throw new Error(`Architecture check failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`)
}

console.log('architecture ok')
