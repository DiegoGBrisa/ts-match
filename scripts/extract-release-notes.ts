import { readFileSync } from 'node:fs'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const [version] = process.argv.slice(2).filter((argument) => argument !== '--')
if (version === undefined || version.length === 0) throw new Error('Usage: pnpm release:notes -- <version>')

const changelog = readFileSync('CHANGELOG.md', 'utf8')
const headingPattern = new RegExp(`^## \\[(?:v)?${escapeRegExp(version)}\\].*$`, 'm')
const headingMatch = headingPattern.exec(changelog)
if (headingMatch === null || headingMatch.index === undefined) {
  throw new Error(`Could not find CHANGELOG.md section for version ${version}.`)
}

const sectionStart = headingMatch.index
const nextHeadingPattern = /^## \[/gm
nextHeadingPattern.lastIndex = sectionStart + headingMatch[0].length
const nextHeadingMatch = nextHeadingPattern.exec(changelog)
const sectionEnd = nextHeadingMatch?.index ?? changelog.length
const section = changelog.slice(sectionStart, sectionEnd).trim()

if (section.length === 0) throw new Error(`CHANGELOG.md section for version ${version} is empty.`)

console.log(section)
