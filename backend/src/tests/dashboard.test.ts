import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';

describe('Dashboard endpoint', () => {
  it('returns scoped work, summary signals, and recent updates', async () => {
    const user = await User.create({
      name: 'Dashboard User',
      email: 'dashboard@test.com',
      password: 'password123',
      role: 'user',
    });
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other-dashboard@test.com',
      password: 'password123',
      role: 'user',
    });
    const project = await Project.create({
      name: 'Personal Project',
      createdBy: user._id,
      members: [user._id],
    });
    const assigned = await Task.create({
      title: 'Reply to feedback',
      project: project._id,
      assignedTo: user._id,
      createdBy: user._id,
      status: 'code_review',
      comments: [
        {
          author: otherUser._id,
          body: 'Can you check this?',
          createdAt: new Date(),
        },
      ],
      activities: [
        {
          actor: otherUser._id,
          type: 'comment_added',
          message: 'Comment added',
          createdAt: new Date(),
        },
      ],
    });
    await Task.create({
      title: 'Closed task',
      project: project._id,
      assignedTo: user._id,
      createdBy: user._id,
      status: 'completed',
    });
    const outsideProject = await Project.create({
      name: 'Outside Project',
      createdBy: otherUser._id,
      members: [otherUser._id],
    });
    await Task.create({
      title: 'Should not appear',
      project: outsideProject._id,
      assignedTo: user._id,
      createdBy: otherUser._id,
      status: 'todo',
    });

    const token = jwt.sign(
      { userId: user._id.toString(), role: 'user' },
      process.env.JWT_SECRET!
    );
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
      id: assigned._id.toString(),
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
