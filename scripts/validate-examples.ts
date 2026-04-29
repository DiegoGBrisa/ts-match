import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const examplesDirectory = 'examples'
const exampleFiles = readdirSync(examplesDirectory)
  .filter((file) => file.endsWith('.ts'))
  .sort((left, right) => left.localeCompare(right))

if (exampleFiles.length === 0) {
  throw new Error('Expected at least one TypeScript example file.')
}

const internalImportPattern = /from\s+['"](?:\.\.\/src|.*\/src\/|@diegogbrisa\/ts-match\/(?:src|dist)(?:\/|['"]))/u
const nonConstAssertionPattern = /\bas\s+(?!const\b)/u
const switchPattern = /\bswitch\s*\(/u

for (const file of exampleFiles) {
  const path = join(examplesDirectory, file)
  const source = readFileSync(path, 'utf8')

  if (internalImportPattern.test(source)) {
    throw new Error(`${path} imports from an internal source or dist path.`)
  }

  if (nonConstAssertionPattern.test(source)) {
    throw new Error(`${path} contains a non-const TypeScript assertion.`)
  }

  if (switchPattern.test(source)) {
    throw new Error(`${path} contains a switch statement. Keep examples switch-free unless adding explicit validation.`)
  }
}

console.log(`validated ${exampleFiles.length} example files`)
