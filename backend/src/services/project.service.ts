import { pool } from '../config/db';
import { env } from '../config/env';
import { domainError, getProject, isProjectMember, newId } from './postgres';

export class ProjectService {
  static async createProject(
    name: string,
    description: string,
    userId: string,
    addAutomationMember = true
  ) {
    const id = newId();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO projects (id, name, description, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
        [id, name.trim(), description?.trim() || null, userId]
      );
      await client.query(
        'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );
      if (addAutomationMember) {
        const automationUser = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [env.MCP_AUTOMATION_EMAIL]
        );
        if (automationUser.rows[0] && automationUser.rows[0].id !== userId) {
          await client.query(
            'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, automationUser.rows[0].id]
          );
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return getProject(id);
  }
  static async getProjectsByMember(userId: string) {
    const result = await pool.query(
      'SELECT project_id FROM project_members WHERE user_id = $1 ORDER BY project_id',
      [userId]
    );
    return Promise.all(
      result.rows.map((row: any) => getProject(row.project_id))
    );
  }
  static async addMember(projectId: string, userId: string) {
    if (!(await getProject(projectId)))
      throw domainError('Project not found', 404);
    if (
      !(await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]))
        .rowCount
    )
      throw domainError('User not found', 404);
    try {
      await pool.query(
        'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
        [projectId, userId]
      );
    } catch (error: any) {
      if (error?.code === '23505')
        throw domainError('User already in project', 409);
      throw error;
    }
    return { message: 'User added to project', projectId, userId };
  }
  static async removeMember(
    projectId: string,
    userId: string,
    _currentUserId: string
  ) {
    const project = await getProject(projectId);
    if (!project) throw domainError('Project not found', 404);
    if (project.createdBy._id === userId)
      throw domainError('Cannot remove project creator');
    if (
      !(
        await pool.query(
          'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
          [projectId, userId]
        )
      ).rowCount
    )
      throw domainError('User not in project', 404);
    return { message: 'User removed from project' };
  }
  static async getProjectById(projectId: string, userId: string) {
    const project = await getProject(projectId);
    if (!project) throw domainError('Project not found', 404);
    if (!(await isProjectMember(projectId, userId)))
      throw domainError('Not a project member', 403);
    return project;
  }
  static async updateMembers(
    projectId: string,
    members: string[],
    currentUserId: string
  ) {
    const project = await getProject(projectId);
    if (!project) throw domainError('Project not found', 404);
    if (project.createdBy._id !== currentUserId)
      throw domainError('Only project admin can update members', 403);
    const wanted = [...new Set([...members, project.createdBy._id])];
    if (
      (
        await pool.query('SELECT id FROM users WHERE id = ANY($1::varchar[])', [
          wanted,
        ])
      ).rows.length !== wanted.length
    )
      throw domainError('One or more users were not found');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM project_members WHERE project_id = $1', [
        projectId,
      ]);
      for (const userId of wanted)
        await client.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
          [projectId, userId]
        );
      await client.query(
        'UPDATE projects SET updated_at = NOW() WHERE id = $1',
        [projectId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return getProject(projectId);
  }
  static async getAllProjects() {
    const result = await pool.query(
      'SELECT id FROM projects ORDER BY created_at DESC'
    );
    return Promise.all(result.rows.map((row: any) => getProject(row.id)));
  }
}
