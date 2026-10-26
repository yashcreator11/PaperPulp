/** @type {import('jest').Config} */
export default {
  // ESM support — ai-server uses "type": "module"
  transform: {},
  testEnvironment: 'node',
  injectGlobals: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'html'],
  collectCoverageFrom: [
    '**/*.js',
    '!jest.config.js',
    '!coverage/**',
    '!node_modules/**',
    '!__tests__/**',
    '!qdrant_data/**',
    '!uploads/**',
  ],
  coverageThreshold: {
    global: {
      lines: 10,
      functions: 10,
      branches: 10,
      statements: 10,
    },
  },
};