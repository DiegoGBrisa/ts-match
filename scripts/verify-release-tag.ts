import { readFileSync } from 'node:fs'
import { CLI_ARGUMENT_OFFSET, environmentVariable, isRecord } from './script-utils.js'

/**
 * Reads the package version that a GitHub Release tag must match.
 *
 * The release publishing job uses this helper to enforce that release tags follow the
 * package version in `package.json` exactly as `v<version>`, preventing an
 * accidental GitHub Release from publishing the wrong npm version.
 *
 * @returns The package version string from `package.json`.
 * @throws When `package.json` does not contain a string `version` field.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#automated-npm-publishing
 */
function packageVersion() {
  const packageJson: unknown = JSON.parse(readFileSync('package.json', 'utf8'))
  if (!isRecord(packageJson) || typeof packageJson.version !== 'string') {
    throw new Error('package.json must contain a string version.')
  }
  return packageJson.version
}

const [tagArgument] = process.argv.slice(CLI_ARGUMENT_OFFSET).filter((argument) => argument !== '--')
const tagName =
  tagArgument ?? environmentVariable('GITHUB_REF_NAME') ?? environmentVariable('GITHUB_EVENT_RELEASE_TAG_NAME')
if (tagName === undefined || tagName.length === 0) {
  throw new Error('Release tag is required. Pass it as an argument or set GITHUB_REF_NAME.')
}

const version = packageVersion()
const expectedTag = `v${version}`

if (tagName !== expectedTag) {
  throw new Error(`Release tag/version mismatch: expected ${expectedTag} from package.json, received ${tagName}.`)
}

console.log(`release tag matches package version (${tagName})`)
