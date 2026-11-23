import { randomBytes } from 'crypto';
import { pool } from '../config/db';

export type TaskStatus =
  'todo' | 'in_progress' | 'code_review' | 'completed' | 'done';

export const newId = () => randomBytes(12).toString('hex');

export const domainError = (message: string, status = 400) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
};

export const userShape = (row: any) => ({
  _id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  avatarUrl: row.avatar_url ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getUser = async (id: string, withSecrets = false) => {
  const fields = withSecrets
    ? 'id, name, email, role, avatar_url, password_hash, avatar_image, avatar_content_type, refresh_token_hash, refresh_token_expires_at, created_at, updated_at'
    : 'id, name, email, role, avatar_url, created_at, updated_at';
  const result = await pool.query(`SELECT ${fields} FROM users WHERE id = $1`, [
    id,
  ]);
  return result.rows[0] as any | undefined;
};

export const getProjectMembers = async (projectId: string) => {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at, u.updated_at
     FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 ORDER BY u.name`,
    [projectId]
  );
  return result.rows.map(userShape);
};

export const getProject = async (projectId: string) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.created_by, p.created_at, p.updated_at,
      json_build_object('id', creator.id, 'name', creator.name, 'email', creator.email) AS created_by_user
     FROM projects p JOIN users creator ON creator.id = p.created_by WHERE p.id = $1`,
    [projectId]
  );
  const row = result.rows[0] as any;
  if (!row) return undefined;
  return {
    _id: row.id,
    name: row.name,
    description: row.description,
    createdBy: {
      _id: row.created_by_user.id,
      name: row.created_by_user.name,
      email: row.created_by_user.email,
    },
    members: await getProjectMembers(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const isProjectMember = async (projectId: string, userId: string) => {
  const result = await pool.query(
    'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rowCount === 1;
};

export const assertProjectMember = async (
  projectId: string,
  userId: string
) => {
  if (!(await isProjectMember(projectId, userId)))
    throw domainError('Not a project member', 403);
};
