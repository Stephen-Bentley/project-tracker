const { execFileSync, spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const instance = randomBytes(12).toString('hex');
const database = 'tracker_test_' + instance;
const password = randomBytes(24).toString('hex');
const dbUser = 'tracker_test';
const docker = (args, input) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 120000,
  }).trim();

async function main() {
  let containerId;
  try {
    containerId = docker([
      'run',
      '--detach',
      '--rm',
      '--publish',
      '127.0.0.1::5432',
      '--env',
      'POSTGRES_DB=' + database,
      '--env',
      'POSTGRES_USER=' + dbUser,
      '--env',
      'POSTGRES_PASSWORD=' + password,
      'postgres:17-alpine',
    ]);
    if (!/^[a-f0-9]{64}$/.test(containerId))
      throw new Error('Docker did not return a valid test container ID.');

    const timeout = Date.now() + 40000;
    while (true) {
      try {
        docker([
          'exec',
          containerId,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          dbUser,
          '-d',
          database,
        ]);
        break;
      } catch {
        if (Date.now() >= timeout)
          throw new Error(
            'The disposable PostgreSQL container did not become ready.'
          );
        await delay(500);
      }
    }
    const binding = docker(['port', containerId, '5432/tcp']);
    const port = binding.match(/^127\.0\.0\.1:(\d+)$/)?.[1];
    if (!port)
      throw new Error('The test database must have a loopback-only port.');

    const schema = readFileSync(join(__dirname, 'postgres-schema.sql'), 'utf8');
    const identify =
      '\nCREATE TABLE tracker_test_identity (id TEXT PRIMARY KEY);\n' +
      "INSERT INTO tracker_test_identity VALUES ('" +
      instance +
      "');\n";
    docker(
      [
        'exec',
        '-i',
        containerId,
        'psql',
        '-X',
        '-v',
        'ON_ERROR_STOP=1',
        '-U',
        dbUser,
        '-d',
        database,
      ],
      schema + identify
    );

    const result = spawnSync(
      process.execPath,
      [
        require.resolve('jest/bin/jest'),
        '--runInBand',
        ...process.argv.slice(2),
      ],
      {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TRACKER_TEST_INSTANCE: instance,
          TRACKER_TEST_DATABASE_URL:
            'postgresql://' +
            dbUser +
            ':' +
            password +
            '@127.0.0.1:' +
            port +
            '/' +
            database,
        },
      }
    );
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    if (/^[a-f0-9]{64}$/.test(containerId ?? '')) {
      docker(['stop', '--time', '5', containerId]);
    }
  }
}

main().catch((error) => {
  console.error(
    'PostgreSQL test runner: ' +
      (error.status
        ? 'Docker exited with status ' + error.status
        : error.message)
  );
  process.exitCode = 1;
});
