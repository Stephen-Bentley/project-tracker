import request from 'supertest';
import app from '../app';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { signToken } from '../utils/jwt';
import { createTestUser } from './fixtures';

describe('Security Integration Tests', () => {
  let userToken: string;
  let otherUserToken: string;
  let adminId: string;
  let userId: string;
  let otherUserId: string;
  let projectId: string;
  let taskId: string;

  beforeEach(async () => {
    adminId = await createTestUser('Admin User', 'admin@test.com', 'admin');
    userId = await createTestUser('Regular User', 'user@test.com');
    otherUserId = await createTestUser('Other User', 'other@test.com');
    userToken = signToken({ userId, role: 'user' });
    otherUserToken = signToken({ userId: otherUserId, role: 'user' });

    const project = await ProjectService.createProject(
      'Test Project',
      'A test project',
      adminId
    );
    projectId = project!._id;
    await ProjectService.addMember(projectId, userId);
    const task = await TaskService.createTask(
      'Initial Task',
      'Initial Description',
      projectId,
      null,
      'todo',
      adminId
    );
    taskId = task._id;
  });

  describe('BOLA: Task Creation', () => {
    it('should allow project member to create a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'New Task',
          projectId: projectId,
        });
      expect(res.status).toBe(201);
    });

    it('should prevent non-project member from creating a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Unauthorized Task',
          projectId: projectId,
        });
      expect(res.status).toBe(403);
    });

    it('should prevent assigning a non-member during task creation', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unauthorized Assignment',
          projectId,
          assignedTo: otherUserId,
        });
      expect(res.status).toBe(403);
    });
  });

  describe('BOLA: Task Deletion', () => {
    it('should allow project member to delete a task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
    });

    it('should prevent non-project member from deleting a task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      expect(res.status).toBe(403);
    });
  });

  it('persists a member’s task update and returns it when the board is read again', async () => {
    const updated = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Updated task', status: 'in_progress' });
    expect(updated.status).toBe(200);

    const board = await request(app)
      .get(`/api/tasks/project/${projectId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(board.status).toBe(200);
    expect(board.body).toContainEqual(
      expect.objectContaining({
        _id: taskId,
        title: 'Updated task',
        status: 'in_progress',
      })
    );
  });

  it('keeps the saved lane order when a member edits a card’s schedule', async () => {
    const other = await TaskService.createTask(
      'Second card',
      undefined,
      projectId,
      null,
      'todo',
      adminId
    );
    await request(app)
      .put(`/api/tasks/${taskId}/position`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'todo', beforeTaskId: other._id })
      .expect(204);
    await request(app)
      .put(`/api/tasks/${other._id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ priority: 'high', dueDate: '2027-01-20' })
      .expect(200);

    const board = await request(app)
      .get(`/api/tasks/project/${projectId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(board.body.map((task: { _id: string }) => task._id)).toEqual([
      taskId,
      other._id,
    ]);
    expect(board.body[1]).toMatchObject({
      priority: 'high',
      dueDate: '2027-01-20',
    });
  });

  describe('BOLA: Task Assignment', () => {
    it('should allow project member to assign task to another member', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId: userId });
      expect(res.status).toBe(200);
    });

    it('should prevent assigning a task to a non-project member', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId: otherUserId });
      expect(res.status).toBe(403);
    });

    it('should prevent non-member from assigning a task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ userId: userId });
      expect(res.status).toBe(403);
    });

    it('should prevent assigning a non-member through task updates', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ assignedTo: otherUserId });
      expect(res.status).toBe(403);
    });
  });

  describe('IDOR: Image Access', () => {
    it('should allow authorized user to access a task image', async () => {
      // First, we need to upload an image to have one to test
      const resUpload = await request(app)
        .post(`/api/tasks/${taskId}/images`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('images', Buffer.from('fake-image-content'), 'test.png');

      expect(resUpload.status).toBe(201);
      const imageId = resUpload.body.images[0]._id;

      const resGet = await request(app)
        .get(`/api/tasks/${taskId}/images/${imageId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(resGet.status).toBe(200);
    });

    it('should deny image access without authentication', async () => {
      // We need an image ID first.
      const resUpload = await request(app)
        .post(`/api/tasks/${taskId}/images`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('images', Buffer.from('fake-image-content'), 'test.png');
      const imageId = resUpload.body.images[0]._id;

      const resGet = await request(app).get(
        `/api/tasks/${taskId}/images/${imageId}`
      );

      expect(resGet.status).toBe(401);
    });

    it('should deny image access to a non-project member', async () => {
      const resUpload = await request(app)
        .post(`/api/tasks/${taskId}/images`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('images', Buffer.from('fake-image-content'), 'test.png');
      const imageId = resUpload.body.images[0]._id;

      const resGet = await request(app)
        .get(`/api/tasks/${taskId}/images/${imageId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(resGet.status).toBe(403);
    });

    it('should deny image upload to a non-project member', async () => {
      const resUpload = await request(app)
        .post(`/api/tasks/${taskId}/images`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .attach('images', Buffer.from('fake-image-content'), 'test.png');

      expect(resUpload.status).toBe(403);
    });
  });

  describe('JWT lifecycle', () => {
    it('should rotate refresh tokens and revoke them on logout', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: 'user@test.com',
        password: 'password123',
      });
      expect(login.status).toBe(200);
      const firstCookie = login.headers['set-cookie'][0];

      const refresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', firstCookie);
      expect(refresh.status).toBe(200);
      const rotatedCookie = refresh.headers['set-cookie'][0];
      expect(rotatedCookie).not.toBe(firstCookie);

      const oldTokenRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', firstCookie);
      expect(oldTokenRefresh.status).toBe(401);

      const logout = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', rotatedCookie);
      expect(logout.status).toBe(204);

      const revokedRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', rotatedCookie);
      expect(revokedRefresh.status).toBe(401);
    });
  });
});
