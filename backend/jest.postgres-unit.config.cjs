module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // The homeserver deployment check runs these tests without a database.
  testMatch: ['**/mcp/mcp.test.ts', '**/utils/authentication.test.ts'],
};
