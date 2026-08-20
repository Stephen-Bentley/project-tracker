import request from 'supertest';
import app from '../app';
import mongoose from 'mongoose';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';
import jwt from 'jsonwebtoken';

describe('Security Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let otherUserToken: string;
  let adminId: string;
  let userId: string;
  let otherUserId: string;
  let projectId: string;
  let taskId: string;

  beforeEach(async () => {
    // Setup users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
    });
    adminId = admin._id.toString();

    const user = await User.create({
      name: 'Regular User',
      email: 'user@test.com',
      password: 'password123',
      role: 'user',
    });
    userId = user._id.toString();

    const otherUser = await User.create({
      name: 'Other User',
      email: 'other@test.com',
      password: 'password123',
      role: 'user',
    });
    otherUserId = otherUser._id.toString();

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminId, role: 'admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    userToken = jwt.sign(
      { userId: userId, role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    otherUserToken = jwt.sign(
      { userId: otherUserId, role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    // Setup project
    const project = await Project.create({
      name: 'Test Project',
      description: 'A test project',
      createdBy: adminId,
      members: [adminId, userId],
    });
    projectId = project._id.toString();

    // Setup task
    const task = await Task.create({
      title: 'Initial Task',
      description: 'Initial Description',
      project: projectId,
      status: 'todo',
      createdBy: adminId,
    });
    taskId = task._id.toString();
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
      // Create a new task for this test
      const newTask = await Task.create({
        title: 'Delete Me',
        project: projectId,
        status: 'todo',
        createdBy: adminId,
      });
      const newTaskId = newTask._id.toString();

      const res = await request(app)
        .delete(`/api/tasks/${newTaskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);
      expect(res.status).toBe(403);
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
