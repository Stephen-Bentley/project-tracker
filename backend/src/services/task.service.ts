import Task, { TaskStatus } from '../models/Task';
import Project from '../models/Project';
import mongoose from 'mongoose';

export class TaskService {
  static async createTask(
    title: string,
    description?: string,
    projectId: string,
    assignedTo: string | null,
    status: TaskStatus,
    creatorId: string
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      (error as any).status = 404;
      throw error;
    }

    const task = await Task.create({
      title,
      description,
      project: project._id,
      assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : null,
      status: status,
      createdBy: creatorId,
      activities: [
        {
          type: 'created',
          message: 'Task created',
          actor: new mongoose.Types.ObjectId(creatorId),
          createdAt: new Date(),
        },
      ],
    });

    return task;
  }

  static async getTasksByProject(projectId: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      (error as any).status = 404;
      throw error;
    }

    // Check permission (caller must be a member)
    // We'll handle permission checks in the controller or by passing member check to service
    // To keep it simple, I'll do the check in the controller for now or a helper
    return await Task.find({ project: project._id })
      .populate('assignedTo', 'name email avatarUrl')
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email avatarUrl')
      .populate('activities.actor', 'name email avatarUrl');
  }

  static async updateTask(taskId: string, updates: any, actorId: string) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      (error as any).status = 404;
      throw error;
    }

    const project = await Project.findById(task.project);
    if (!project) {
      const error = new Error('Project not found');
      (error as any).status = 404;
      throw error;
    }

    const activities: {
      type: string;
      message: string;
      actor: mongoose.Types.ObjectId;
      createdAt: Date;
    }[] = [];
    const statusLabels: Record<string, string> = {
      todo: 'To do',
      in_progress: 'In progress',
      code_review: 'Code review',
      completed: 'Completed',
      done: 'Code review',
    };

    // Apply updates
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (
      updates.status &&
      ['todo', 'in_progress', 'code_review', 'completed', 'done'].includes(
        updates.status
      )
    ) {
      if (task.status !== updates.status) {
        activities.push({
          type: 'status_changed',
          message: `Status changed from ${statusLabels[task.status]} to ${statusLabels[updates.status]}`,
          actor: new mongoose.Types.ObjectId(actorId),
          createdAt: new Date(),
        });
      }
      task.status = updates.status;
    }
    if (
      updates.title !== undefined ||
      updates.description !== undefined
    ) {
      activities.push({
        type: 'details_updated',
        message: 'Task details updated',
        actor: new mongoose.Types.ObjectId(actorId),
        createdAt: new Date(),
      });
    }
    if (updates.assignedTo !== undefined) {
      const previousAssignee = task.assignedTo?.toString() || null;
      const nextAssignee = updates.assignedTo || null;
      if (updates.assignedTo === null || updates.assignedTo === '') {
        task.assignedTo = null;
      } else {
        task.assignedTo = new mongoose.Types.ObjectId(updates.assignedTo);
      }
      if (previousAssignee !== nextAssignee) {
        activities.push({
          type: 'assigned',
          message: nextAssignee ? 'Task assignee changed' : 'Task unassigned',
          actor: new mongoose.Types.ObjectId(actorId),
          createdAt: new Date(),
        });
      }
    }

    if (!task.activities) task.activities = [];
    task.activities.push(...activities);

    await task.save();
    return task;
  }

  static async uploadTaskImages(taskId: string, images: any[], actorId: string) {
    const task = await Task.findById(taskId).select('+images.data');
    if (!task) {
      const error = new Error('Task not found');
      (error as any).status = 404;
      throw error;
    }

    if (task.images.length + images.length > 3) {
      const error = new Error('A task can have up to three images');
      (error as any).status = 400;
      throw error;
    }

    task.images.push(
      ...images.map((img) => ({
        filename: img.originalname,
        contentType: img.mimetype,
        data: img.buffer,
        uploadedAt: new Date(),
      }))
    );

    if (!task.activities) task.activities = [];
    task.activities.push({
      type: 'images_added',
      message: `${images.length} image${images.length === 1 ? '' : 's'} added`,
      actor: new mongoose.Types.ObjectId(actorId),
      createdAt: new Date(),
    });

    await task.save();
    return task;
  }

  static async getTaskImage(taskId: string, imageId: string) {
    const task = await Task.findById(taskId).select('+images.data');
    if (!task) {
      const error = new Error('Task not found');
      (error as any).status = 404;
      throw error;
    }

    const image = task.images.find(
      (candidate) => candidate._id?.toString() === imageId
    );
    if (!image) {
      const error = new Error('Image not found');
      (error as any).status = 404;
      throw error;
    }

    return image;
  }

  static async deleteTask(taskId: string) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      (error as any).status = 404;
      throw error;
    }

    await task.deleteOne();
    return { message: 'Task deleted' };
  }

  static async assignUserToTask(
    taskId: string,
    userId: string | null,
    actorId: string
  ) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      (error as any).status = 404;
      throw error;
    }

    const previousAssignee = task.assignedTo?.toString() || null;
    if (userId) {
      task.assignedTo = new mongoose.Types.ObjectId(userId);
    } else {
      task.assignedTo = null;
    }

    if (previousAssignee !== userId) {
      if (!task.activities) task.activities = [];
      task.activities.push({
        type: 'assigned',
        message: userId ? 'Task assignee changed' : 'Task unassigned',
        actor: new mongoose.Types.ObjectId(actorId),
        createdAt: new Date(),
      });
    }

    await task.save();

    return {
      message: userId ? 'User assigned to task' : 'User unassigned from task',
      taskId: task._id,
      assignedTo: task.assignedTo,
    };
  }

  static async addComment(taskId: string, body: string, authorId: string) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      (error as any).status = 404;
      throw error;
    }

    if (!task.comments) task.comments = [];
    if (!task.activities) task.activities = [];

    task.comments.push({
      author: new mongoose.Types.ObjectId(authorId),
      body: body.trim(),
      createdAt: new Date(),
    });
    task.activities.push({
      type: 'comment_added',
      message: 'Comment added',
      actor: new mongoose.Types.ObjectId(authorId),
      createdAt: new Date(),
    });

    await task.save();
    return task;
  }
}
