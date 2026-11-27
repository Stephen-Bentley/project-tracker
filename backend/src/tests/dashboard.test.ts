import request from 'supertest';
import app from '../app';
import { pool } from '../config/db';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { signToken } from '../utils/jwt';
import { createTestUser } from './fixtures';

describe('Dashboard endpoint', () => {
  it('returns scoped work, summary signals, and recent updates', async () => {
    const user = await createTestUser('Dashboard User', 'dashboard@test.com');
    const otherUser = await createTestUser(
      'Other User',
      'other-dashboard@test.com'
    );
    const project = (await ProjectService.createProject(
      'Personal Project',
      '',
      user
    ))!;
    await ProjectService.addMember(project._id, otherUser);
    const assigned = await TaskService.createTask(
      'Reply to feedback',
      undefined,
      project._id,
      user,
      'code_review',
      user
    );
    await TaskService.addComment(
      assigned._id,
      'Can you check this?',
      otherUser
    );
    await TaskService.createTask(
      'Closed task',
      undefined,
      project._id,
      user,
      'completed',
      user
    );
    const outsideProject = (await ProjectService.createProject(
      'Outside Project',
      '',
      otherUser
    ))!;
    const outsideTask = await TaskService.createTask(
      'Should not appear',
      undefined,
      outsideProject._id,
      null,
      'todo',
      otherUser
    );
    // Simulate a task assigned before the user was removed from that project.
    await pool.query('UPDATE tasks SET assigned_to = $1 WHERE id = $2', [
      user,
      outsideTask._id,
    ]);

    const token = signToken({ userId: user, role: 'user' });
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.summary).toEqual({
      waitingOnMe: 1,
      blocked: 0,
      inReview: 1,
      repliesNeeded: 1,
    });
    expect(response.body.activeWork).toHaveLength(1);
    expect(response.body.activeWork[0]).toMatchObject({
      id: assigned._id,
      projectName: 'Personal Project',
      title: 'Reply to feedback',
      repliesNeeded: true,
      inReview: true,
    });
    expect(response.body.activeWork[0].title).not.toBe('Should not appear');
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(401);
  });
});
