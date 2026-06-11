import { CLI_ARGUMENT_OFFSET, commandOutput } from './script-utils.js'

const ALLOWED_TYPES = ['feat', 'fix', 'docs', 'test', 'chore', 'refactor', 'ci', 'build'] as const
const SHA_PREVIEW_LENGTH = 12

/** Commit identity and subject parsed from `git log` for Conventional Commit validation. */
interface CommitSubject {
  readonly sha: string
  readonly subject: string
}

/**
 * Detects GitHub Actions' all-zero placeholder SHA for the first push to a ref.
 *
 * The CI workflow passes `github.event.before` as the range start. On initial
 * branch or default-branch bootstrap pushes, GitHub sends forty zeroes instead
 * of a real commit. Callers use this helper to avoid constructing an invalid
 * `0000..sha` git range while still validating the pushed commits.
 *
 * @param value - Candidate SHA string from the CLI or GitHub Actions context.
 * @returns `true` when `value` is a non-empty string made only of zeroes.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function isAllZeroSha(value: string) {
  return value.length > 0 && value.split('').every((character) => character === '0')
}

/**
 * Builds the commit range for local one-argument checks.
 *
 * Use this path when a caller provides only a base commit or branch. A real base
 * becomes `base..HEAD`; an all-zero base means there is no usable lower bound,
 * so the caller should fall back to the repository-root range.
 *
 * @param from - Base commit, tag, or branch supplied by the caller.
 * @returns A git range ending at `HEAD`, or `undefined` when `from` is all zeroes.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function singleArgumentRange(from: string): string | undefined {
  return isAllZeroSha(from) ? undefined : `${from}..HEAD`
}

/**
 * Builds the commit range for CI push checks.
 *
 * Normal push events use `before..sha`. Initial pushes use the target commit
 * directly so `git log <sha>` walks every commit reachable from the pushed tip;
 * this prevents multi-commit first pushes from checking only the final commit.
 *
 * @param from - Previous commit from `github.event.before`.
 * @param to - New pushed commit from `github.sha`.
 * @returns A git revision range that covers the commits to validate.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function twoArgumentRange(from: string, to: string) {
  return isAllZeroSha(from) ? to : `${from}..${to}`
}

/**
 * Resolves an explicit commit range from process arguments.
 *
 * The script accepts `pnpm check:commits -- <from>` for local checks and
 * `pnpm check:commits -- <from> <to>` for CI push events. The standalone `--`
 * separator is ignored because package managers pass it through to `process.argv`.
 *
 * @returns A git range when the caller supplied one, otherwise `undefined`.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function cliCommitRange(): string | undefined {
  const [from, to] = process.argv.slice(CLI_ARGUMENT_OFFSET).filter((argument) => argument !== '--')

  if (from === undefined) return undefined
  return to === undefined ? singleArgumentRange(from) : twoArgumentRange(from, to)
}

/**
 * Builds the default range used when no explicit arguments are provided.
 *
 * The fallback starts after the repository root commit so local `pnpm
 * check:commits` validates the current branch history without requiring the
 * caller to know a base ref.
 *
 * @returns A `root..HEAD` git range.
 * @throws When git cannot report a root commit.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function fallbackCommitRange() {
  const [fallbackBase] = commandOutput('git', ['rev-list', '--max-parents=0', 'HEAD']).split('\n')
  if (fallbackBase === undefined || fallbackBase.length === 0)
    throw new Error('Unable to determine fallback commit range.')
  return `${fallbackBase}..HEAD`
}

/**
 * Chooses the commit range that should be validated.
 *
 * Prefer explicit CLI ranges from CI or local callers, then use the root-based
 * fallback for ad hoc local runs.
 *
 * @returns The git range passed to `git log`.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function commitRange() {
  return cliCommitRange() ?? fallbackCommitRange()
}

/**
 * Parses git log output into commit subjects.
 *
 * The command uses `%H%x1f%s`, so each line contains a full SHA, a unit
 * separator, and the subject. This keeps parsing stable for ordinary subject
 * punctuation while still failing loudly if the output shape changes.
 *
 * @param output - Raw stdout from `git log --format=%H%x1f%s`.
 * @returns Commit subjects paired with their full SHA.
 * @throws When a line does not contain both expected fields.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function parseCommitSubjects(output: string): readonly CommitSubject[] {
  if (output.length === 0) return []

  return output.split('\n').map((line) => {
    const [sha, subject] = line.split('\u001f')
    if (sha === undefined || subject === undefined) throw new Error(`Unable to parse git log line: ${line}`)
    return { sha, subject }
  })
}

/**
 * Identifies generated commit subjects that should not be Conventional Commits.
 *
 * Merge commits and Git-generated revert commits are allowed because they are
 * produced by repository workflows rather than authored feature changes.
 *
 * @param subject - Commit subject line from git.
 * @returns `true` when the subject should be skipped by the convention check.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 */
function isSkippableSubject(subject: string) {
  return subject.startsWith('Merge ') || subject.startsWith('Revert "')
}

/**
 * Validates this repository's Conventional Commit subject format.
 *
 * Subjects must use one of the release-please-supported types, may include a
 * lowercase scope, may include `!` for breaking changes, and must include a
 * description after `: `. Examples: `fix(ci): validate range` and
 * `feat!: drop legacy API`.
 *
 * @param subject - Commit subject line from git.
 * @returns `true` when the subject follows the required format.
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#commit-messages
 * @see https://github.com/DiegoGBrisa/ts-match/blob/main/docs/release.md#release-prs
 */
function isConventionalSubject(subject: string) {
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
  const details = invalidCommits
    .map((commit) => `  - ${commit.sha.slice(0, SHA_PREVIEW_LENGTH)} ${commit.subject}`)
    .join('\n')
  throw new Error(
    `Conventional Commit check failed for range ${range}.\nAllowed types: ${ALLOWED_TYPES.join(', ')}.\n${details}`,
  )
}

console.log(`conventional commits ok (${commits.length} commits checked, range ${range})`)
