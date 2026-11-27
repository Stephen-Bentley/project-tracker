import { pool } from '../config/db';

describe('Smoke Test', () => {
  it('loads the application schema into disposable PostgreSQL', async () => {
    const result = await pool.query(
      "SELECT to_regclass('public.tasks')::text AS tasks, to_regclass('public.project_members')::text AS members"
    );
    expect(result.rows).toEqual([
      { tasks: 'tasks', members: 'project_members' },
    ]);
  });
});
