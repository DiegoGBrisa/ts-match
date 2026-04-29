import { readFileSync } from 'node:fs'
import { isRecord } from './script-utils.js'

function packageVersion(): string {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  if (!isRecord(packageJson) || typeof packageJson.version !== 'string') {
    throw new Error('package.json must contain a string version.')
  }
  return packageJson.version
}

const [tagArgument] = process.argv.slice(2).filter((argument) => argument !== '--')
const tagName = tagArgument ?? process.env.GITHUB_REF_NAME ?? process.env.GITHUB_EVENT_RELEASE_TAG_NAME
if (tagName === undefined || tagName.length === 0) {
  throw new Error('Release tag is required. Pass it as an argument or set GITHUB_REF_NAME.')
}

const version = packageVersion()
const expectedTag = `v${version}`

if (tagName !== expectedTag) {
  throw new Error(`Release tag/version mismatch: expected ${expectedTag} from package.json, received ${tagName}.`)
}

console.log(`release tag matches package version (${tagName})`)
