import { readFileSync } from 'node:fs'
import { isRecord } from './script-utils.js'

const packageJson: unknown = JSON.parse(readFileSync('package.json', 'utf8'))

if (!isRecord(packageJson)) throw new Error('package.json must contain an object.')

const dependencies = packageJson.dependencies
if (dependencies !== undefined && !isRecord(dependencies)) {
  throw new Error('package.json dependencies must be an object when present.')
}

if (dependencies !== undefined) {
  const dependencyNames = Object.keys(dependencies)
  if (dependencyNames.length > 0) {
    throw new Error(`Expected zero runtime dependencies, found: ${dependencyNames.join(', ')}`)
  }
}

console.log('zero runtime dependencies ok')
