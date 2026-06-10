import { defineConfig } from 'vitest/config'

const COVERAGE_HIGH_WATERMARK = 85
const BRANCH_COVERAGE_WATERMARK = 80

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/__typecheck__/**',
        'src/group/token.ts',
        'src/index.ts',
        'src/patterns/token.ts',
      ],
      thresholds: {
        lines: COVERAGE_HIGH_WATERMARK,
        functions: COVERAGE_HIGH_WATERMARK,
        branches: BRANCH_COVERAGE_WATERMARK,
        statements: COVERAGE_HIGH_WATERMARK,
      },
    },
  },
})
