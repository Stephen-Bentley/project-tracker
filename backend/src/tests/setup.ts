import { pool } from '../config/db';

let verified = false;

beforeAll(async () => {
  const identity = await pool.query<{ id: string }>(
    'SELECT id FROM public.tracker_test_identity'
  );
  if (
    identity.rowCount !== 1 ||
    identity.rows[0].id !== process.env.TRACKER_TEST_INSTANCE
  ) {
    throw new Error(
      'Refusing to reset a database without the test runner identity.'
    );
  }
  verified = true;
});

beforeEach(async () => {
  if (!verified)
    throw new Error('The disposable test database was not verified.');
  await pool.query('TRUNCATE public.users CASCADE');
});

afterAll(() => pool.end());
