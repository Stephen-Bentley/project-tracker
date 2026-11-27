module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // The older integration suites still populate the retired MongoDB models.
  testMatch: ['**/mcp/mcp.test.ts', '**/utils/authentication.test.ts'],
};
