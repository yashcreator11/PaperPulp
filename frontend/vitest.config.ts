import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text', 'html'],

      include: [
        'src/**/*.ts',
        'src/Services/parseAndValidateAssetFile.tsx',  // logic-only file with unit tests
      ],
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        'src/components/ui/**',      // shadcn generated
        'src/api/**',                // API layer needs MSW/integration tests
        'src/pages/**',              // Pages need E2E tests
        'src/layouts/**',            // Layout components need E2E tests
        'src/context/**',            // Contexts need RTL integration tests
        'src/tour/**',               // Tour config — static data, low risk
        'src/guides/**',
        'src/**/__tests__/**',
      ],
      // Thresholds apply to the included files (pure logic: utils, hooks, config, services).
      // React components remain excluded until RTL integration tests are added.
      thresholds: {
        lines: 40,
        functions: 60,
        branches: 50,
        statements: 40,
      },
    },
  },
});