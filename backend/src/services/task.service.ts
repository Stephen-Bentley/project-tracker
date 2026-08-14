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
      .populate('createdBy', 'name email');
  }

  static async updateTask(taskId: string, updates: any) {
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

    // Apply updates
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (
      updates.status &&
      ['todo', 'in_progress', 'code_review', 'completed', 'done'].includes(
        updates.status
      )
    ) {
      task.status = updates.status;
    }
    if (updates.assignedTo !== undefined) {
      if (updates.assignedTo === null || updates.assignedTo === '') {
        task.assignedTo = null;
      } else {
        task.assignedTo = new mongoose.Types.ObjectId(updates.assignedTo);
      }
    }

    await task.save();
    return task;
  }

  static async uploadTaskImages(taskId: string, images: any[]) {
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

  static async assignUserToTask(taskId: string, userId: string | null) {
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      (error as any).status = 404;
      throw error;
    }

    if (userId) {
      task.assignedTo = new mongoose.Types.ObjectId(userId);
    } else {
      task.assignedTo = null;
    }

    await task.save();

    return {
      message: userId ? 'User assigned to task' : 'User unassigned from task',
      taskId: task._id,
      assignedTo: task.assignedTo,
    };
  }
}
