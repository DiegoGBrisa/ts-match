import { commandOutput } from './script-utils.js'

const ALLOWED_TYPES = ['feat', 'fix', 'docs', 'test', 'chore', 'refactor', 'ci', 'build'] as const

interface CommitSubject {
  readonly sha: string
  readonly subject: string
}

function isAllZeroSha(value: string): boolean {
  return value.length > 0 && value.split('').every((character) => character === '0')
}

function singleArgumentRange(from: string): string | undefined {
  return isAllZeroSha(from) ? undefined : `${from}..HEAD`
}

function twoArgumentRange(from: string, to: string): string {
  return isAllZeroSha(from) ? to : `${from}..${to}`
}

function cliCommitRange(): string | undefined {
  const [from, to] = process.argv.slice(2).filter((argument) => argument !== '--')

  if (from === undefined) return undefined
  return to === undefined ? singleArgumentRange(from) : twoArgumentRange(from, to)
}

function fallbackCommitRange(): string {
  const [fallbackBase] = commandOutput('git', ['rev-list', '--max-parents=0', 'HEAD']).split('\n')
  if (fallbackBase === undefined || fallbackBase.length === 0)
    throw new Error('Unable to determine fallback commit range.')
  return `${fallbackBase}..HEAD`
}

function commitRange(): string {
  return cliCommitRange() ?? fallbackCommitRange()
}

function parseCommitSubjects(output: string): readonly CommitSubject[] {
  if (output.length === 0) return []

  return output.split('\n').map((line) => {
    const [sha, subject] = line.split('\u001f')
    if (sha === undefined || subject === undefined) throw new Error(`Unable to parse git log line: ${line}`)
    return { sha, subject }
  })
}

function isSkippableSubject(subject: string): boolean {
  return subject.startsWith('Merge ') || subject.startsWith('Revert "')
}

function isConventionalSubject(subject: string): boolean {
  const allowedTypes = ALLOWED_TYPES.join('|')
  const pattern = new RegExp(`^(${allowedTypes})(\\([a-z0-9._/-]+\\))?!?: .+`)
  return pattern.test(subject)
}

const range = commitRange()
const output = commandOutput('git', ['log', '--format=%H%x1f%s', range])
const commits = parseCommitSubjects(output)
const invalidCommits = commits.filter(
  (commit) => !isSkippableSubject(commit.subject) && !isConventionalSubject(commit.subject),
)

if (invalidCommits.length > 0) {
  const details = invalidCommits.map((commit) => `  - ${commit.sha.slice(0, 12)} ${commit.subject}`).join('\n')
  throw new Error(
    `Conventional Commit check failed for range ${range}.\nAllowed types: ${ALLOWED_TYPES.join(', ')}.\n${details}`,
  )
}

console.log(`conventional commits ok (${commits.length} commits checked, range ${range})`)
