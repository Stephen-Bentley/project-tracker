module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/src/tests/configure.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
};
