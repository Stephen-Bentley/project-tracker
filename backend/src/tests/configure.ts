const instance = process.env.TRACKER_TEST_INSTANCE;
const testUrl = process.env.TRACKER_TEST_DATABASE_URL;
if (!instance || !/^[a-f0-9]{24}$/.test(instance) || !testUrl) {
  throw new Error(
    'Run npm run test:postgres to create a disposable test database.'
  );
}

const database = new URL(testUrl);
if (
  database.protocol !== 'postgresql:' ||
  database.hostname !== '127.0.0.1' ||
  !database.port ||
  database.search ||
  database.hash ||
  database.username !== 'tracker_test' ||
  database.pathname !== '/tracker_test_' + instance
) {
  throw new Error(
    'Refusing to connect to a database outside the PostgreSQL test runner.'
  );
}

process.env.DATABASE_URL = testUrl;
process.env.JWT_SECRET = 'project-tracker-test-signing-key';
process.env.MCP_AUTOMATION_EMAIL = 'mcp-automation@example.test';

export {};
