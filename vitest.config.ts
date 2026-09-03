import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // The same '@/' the app uses, so a test imports a module by the path the
    // application code imports it by.
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
