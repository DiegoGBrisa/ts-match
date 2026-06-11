import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { JSON_INDENT_SPACES } from './script-utils.js'

const CJS_DIST_ROOT = 'dist-cjs'

mkdirSync(CJS_DIST_ROOT, { recursive: true })
writeFileSync(
  join(CJS_DIST_ROOT, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, JSON_INDENT_SPACES)}\n`,
)
