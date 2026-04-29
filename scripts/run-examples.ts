import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const examplesDirectory = 'examples'
const exampleFiles = readdirSync(examplesDirectory)
  .filter((file) => file.endsWith('.ts'))
  .sort((left, right) => left.localeCompare(right))

for (const file of exampleFiles) {
  await import(pathToFileURL(resolve(examplesDirectory, file)).href)
}

console.log(`ran ${exampleFiles.length} examples`)
