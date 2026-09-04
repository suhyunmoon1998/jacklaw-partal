import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Next compiles JSX with the automatic runtime; esbuild has to be told, or a
  // render test fails with "React is not defined".
  esbuild: { jsx: 'automatic' },
  resolve: {
    // The same '@/' the app uses, so a test imports a module by the path the
    // application code imports it by.
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    // Most of the suite is pure logic and wants nothing from a browser. The
    // render tests say `@vitest-environment jsdom` at the top of their own file.
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    globals: true,
  },
})
