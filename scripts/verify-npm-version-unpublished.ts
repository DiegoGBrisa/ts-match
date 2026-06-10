import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isRecord } from './script-utils.js'

/**
 * Reads the package identity that the release publishing job is about to publish.
 *
 * The npm preflight uses the current `package.json` rather than duplicating the
 * package name or version in workflow YAML, keeping release validation tied to
 * the artifact that will be packed and published.
 *
 * @returns Package name and version from `package.json`.
 * @throws When either field is missing or not a string.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#automated-npm-publishing
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#npm-version-already-exists
 */
function packageNameAndVersion(): readonly [string, string] {
  const packageJson: unknown = JSON.parse(readFileSync('package.json', 'utf8'))
  if (!isRecord(packageJson) || typeof packageJson.name !== 'string' || typeof packageJson.version !== 'string') {
    throw new Error('package.json must contain string name and version fields.')
  }
  return [packageJson.name, packageJson.version]
}

/**
 * Detects npm registry responses that mean a version is unpublished.
 *
 * `npm view` returns a non-zero exit code for both "not found" and operational
 * failures. This helper accepts only known not-found messages so the publish
 * release publishing job does not continue after registry, network, or auth problems.
 *
 * @param output - Combined stdout and stderr from `npm view <specifier> version`.
 * @returns `true` when npm reported that the package version does not exist.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#npm-version-already-exists
 */
function npmViewFailureMeansUnpublished(output: string) {
  return output.includes('E404') || output.includes('404 Not Found') || output.includes('is not in this registry')
}

const [packageName, version] = packageNameAndVersion()
const npmSpecifier = `${packageName}@${version}`
const result = spawnSync('npm', ['view', npmSpecifier, 'version'], { encoding: 'utf8' })
const output = `${result.stdout}\n${result.stderr}`

if (result.error !== undefined) throw result.error
if (result.status === 0)
  throw new Error(`${npmSpecifier} already exists on npm. Refusing to publish an existing version.`)
if (!npmViewFailureMeansUnpublished(output))
  throw new Error(`npm view failed unexpectedly for ${npmSpecifier}.\n${output}`)

console.log(`npm version is unpublished (${npmSpecifier})`)
