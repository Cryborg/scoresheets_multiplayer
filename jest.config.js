const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/backup/',
    '<rootDir>/src/__tests__/backup/',
    '<rootDir>/.next/'
  ],
  moduleNameMapper: {
    // Handle module aliases (if you're using them in your project)
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle other Next.js specific mocks
    '^next/server$': '<rootDir>/__mocks__/next/server.js',
  },
  // Add global setup for server-side tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
}

module.exports = createJestConfig(customJestConfig)