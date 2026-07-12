import { Response } from 'express';
import Task, { TaskStatus } from '../models/Task';
import Project from '../models/Project';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, description, projectId, assignedTo, status } = req.body;

  if (!title || !projectId) {
    return res.status(400).json({ message: 'Title and projectId required' });
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: 'Invalid projectId' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Permission: user must be a member
  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  const task = await Task.create({
    title,
    description,
    project: project._id,
    assignedTo,
    status: (status as TaskStatus) || 'todo',
    createdBy: req.user!.userId,
  });

  res.status(201).json(task);
};

export const getTasksByProject = async (req: AuthRequest, res: Response) => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: 'Invalid projectId' });
  }

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  // Permission: user must be a member
  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  const tasks = await Task.find({ project: project._id })
    .populate('assignedTo', 'name email avatarUrl')
    .populate('createdBy', 'name email');

  res.json(tasks);
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const { title, description, status, assignedTo } = req.body;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: 'Invalid taskId' });
  }

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  // Permission: user must be a member
  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  // Update allowed fields
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }
    task.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== 'string') {
      return res.status(400).json({ message: 'Description must be text' });
    }
    task.description = description.trim();
  }
  if (status && ['todo', 'in_progress', 'done'].includes(status))
    task.status = status as TaskStatus;
  if (assignedTo !== undefined) {
    if (assignedTo === null || assignedTo === '') {
      task.assignedTo = null;
    } else if (
      typeof assignedTo !== 'string' ||
      !mongoose.Types.ObjectId.isValid(assignedTo)
    ) {
      return res.status(400).json({ message: 'Invalid assigned user' });
    } else if (!project.members.some((id) => id.toString() === assignedTo)) {
      return res.status(403).json({ message: 'User not in project' });
    } else {
      task.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }
  }

  await task.save();
  res.json(task);
};

export const uploadTaskImages = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const files = req.files as Express.Multer.File[] | undefined;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID' });
  }
  if (!files?.length) {
    return res
      .status(400)
      .json({ message: 'Please select at least one image' });
  }

  const task = await Task.findById(taskId).select('+images.data');
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }
  if (task.images.length + files.length > 3) {
    return res
      .status(400)
      .json({ message: 'A task can have up to three images' });
  }

  task.images.push(
    ...files.map((file) => ({
      filename: file.originalname,
      contentType: file.mimetype,
      data: file.buffer,
      uploadedAt: new Date(),
    }))
  );
  await task.save();
  res.status(201).json(task);
};

export const getTaskImage = async (req: AuthRequest, res: Response) => {
  const { taskId, imageId } = req.params;
  if (
    !mongoose.Types.ObjectId.isValid(taskId) ||
    !mongoose.Types.ObjectId.isValid(imageId)
  ) {
    return res.status(400).end();
  }

  const task = await Task.findById(taskId).select('+images.data');
  const image = task?.images.find(
    (candidate) => candidate._id?.toString() === imageId
  );
  if (!image) return res.status(404).end();

  res.set('Cache-Control', 'private, max-age=3600');
  res.type(image.contentType).send(image.data);
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: 'Invalid taskId' });
  }

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  await task.deleteOne();
  res.json({ message: 'Task deleted' });
};

export const assignUserToTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: 'Invalid task ID' });
  }

  const task = await Task.findById(taskId).populate('project');
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  // If userId is provided, check validity and membership
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (!project.members.some((id) => id.toString() === userId)) {
      return res.status(403).json({ message: 'User not in project' });
    }
    task.assignedTo = userId;
  } else {
    // Unassign user
    task.assignedTo = null;
  }

  await task.save();

  res.json({
    message: userId ? 'User assigned to task' : 'User unassigned from task',
    taskId: task._id,
    assignedTo: task.assignedTo,
  });
};
