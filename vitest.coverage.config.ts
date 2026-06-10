import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config.js'

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['src/**/__tests__/**/*.test.ts', 'tests/**/*.test.ts', 'tests/**/*.test.mjs'],
      exclude: ['**/*.editor-dx.test.ts'],
    },
  }),
)
