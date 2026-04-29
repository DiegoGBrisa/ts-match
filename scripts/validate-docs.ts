import { existsSync, readFileSync } from 'node:fs'

const readmePath = 'README.md'
const readme = readFileSync(readmePath, 'utf8')
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu
const missingLinks: string[] = []

for (const match of readme.matchAll(linkPattern)) {
  const rawTarget = match[1]
  if (!rawTarget) continue

  const target = rawTarget.trim().split(/\s+/u)[0]?.split('#')[0]
  if (!target || target.startsWith('#')) continue
  if (/^(?:https?:|mailto:)/u.test(target)) continue

  if (!existsSync(target)) missingLinks.push(target)
}

if (missingLinks.length > 0) {
  throw new Error(`README.md contains missing local links: ${missingLinks.join(', ')}`)
}

console.log('README links ok')
