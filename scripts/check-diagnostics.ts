import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Expected TypeScript diagnostic fragment that must appear in fixture output. */
interface ExpectedFragment {
  readonly description: string
  readonly text: string
}

const expectedFragments: readonly ExpectedFragment[] = [
  { description: 'non-exhaustive match', text: 'ts-match: match is not exhaustive' },
  { description: 'impossible match pattern', text: 'ts-match: this pattern cannot match the current input type' },
  { description: 'invalid rest placement', text: 'ts-match: invalid P.rest(...) usage' },
  {
    description: 'repeated selection placement',
    text: 'ts-match: repeated container patterns cannot contain P.select(...)',
  },
  { description: 'invalid matchBy path', text: 'ts-match: invalid matchBy path' },
  {
    description: 'unsupported matchBy tag value',
    text: 'ts-match: matchBy path resolves to a value that cannot be used as a tag',
  },
  { description: 'impossible matchBy tag', text: 'ts-match: this matchBy tag cannot occur at the selected path' },
  { description: 'non-exhaustive matchBy', text: 'ts-match: matchBy is not exhaustive for the selected path' },
  { description: 'missing object-map keys', text: 'ts-match: object-map cases are missing required key(s)' },
  { description: 'extra object-map keys', text: 'ts-match: object-map case contains an extra key' },
  { description: 'object-map key collisions', text: 'ts-match: object-map case keys collide' },
  {
    description: 'object-map nullish tags',
    text: 'ts-match: object-map cases cannot represent null or undefined tags',
  },
  { description: 'object-map broad tags', text: 'ts-match: object-map cases require a finite literal tag union' },
  { description: 'invalid grouped tags', text: 'ts-match: grouped case contains tag(s) that cannot occur' },
  { description: 'record key pattern', text: 'ts-match: record key pattern cannot match JavaScript property keys' },
  { description: 'record value selection', text: 'ts-match: record value patterns cannot contain P.select(...)' },
  { description: 'record key selection', text: 'ts-match: record key patterns cannot contain P.select(...)' },
  { description: 'map key/value selection', text: 'ts-match: Map key/value patterns cannot contain P.select(...)' },
  {
    description: 'homogeneous map tuple disambiguation',
    text: 'ts-match: P.map(keyPattern, valuePattern) cannot use top-level array patterns',
  },
  { description: 'set value selection', text: 'ts-match: Set value patterns cannot contain P.select(...)' },
  { description: 'exclude selection', text: 'ts-match: P.exclude(pattern) cannot contain P.select(...)' },
  { description: 'invalid selection structure', text: 'ts-match: invalid P.select(...) usage' },
  { description: 'predicate return type', text: "Type 'number' is not assignable to type 'boolean'" },
]

const tscPath = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))
const result = spawnSync(process.execPath, [tscPath, '-p', 'tsconfig.diagnostics.json', '--pretty', 'false'], {
  encoding: 'utf8',
})

const output = `${String(result.stdout)}${String(result.stderr)}`
const failures: string[] = []

if (result.status === 0) {
  failures.push('diagnostic fixtures compiled successfully, but they are expected to fail')
}

for (const fragment of expectedFragments) {
  if (!output.includes(fragment.text)) failures.push(`missing ${fragment.description}: ${fragment.text}`)
}

if (failures.length > 0) {
  console.error('diagnostic quality check failed')
  for (const failure of failures) console.error(`- ${failure}`)
  console.error('\n--- tsc output ---')
  console.error(output)
  process.exitCode = 1
} else {
  console.log(`diagnostic fixtures failed with expected ts-match messages (${expectedFragments.length} fragments)`)
}
