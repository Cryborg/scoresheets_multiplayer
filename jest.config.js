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
}

module.exports = createJestConfig(customJestConfig)