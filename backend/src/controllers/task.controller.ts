import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Task, { TaskStatus } from '../models/Task';
import Project from '../models/Project';
import { TaskService } from '../services/task.service';
import { validate } from '../middleware/validate.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
} from '../validators/task.validator';

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, description, projectId, assignedTo, status } = req.body;
  const task = await TaskService.createTask(
    title,
    description,
    projectId,
    assignedTo,
    (status as TaskStatus) || 'todo',
    req.user!.userId
  );
  res.status(201).json(task);
};

export const getTasksByProject = async (req: AuthRequest, res: Response) => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  const tasks = await TaskService.getTasksByProject(projectId);
  res.json(tasks);
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const project = await Project.findById(
    req.body.project || (await Task.findById(taskId))?.project
  );

  // Note: To properly handle project check without fetching task twice, we might need to fetch task first in service or a specialized method.
  // For now, I'll keep it simple.

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const projectData = await Project.findById(task.project);
  if (!projectData)
    return res.status(404).json({ message: 'Project not found' });

  if (!projectData.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  const updatedTask = await TaskService.updateTask(
    taskId,
    req.body,
    req.user!.userId
  );
  res.json(updatedTask);
};

export const addTaskComment = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  const updatedTask = await TaskService.addComment(
    taskId,
    req.body.body,
    req.user!.userId
  );
  res.status(201).json(updatedTask);
};

export const uploadTaskImages = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files?.length) {
    return res
      .status(400)
      .json({ message: 'Please select at least one image' });
  }

  const task = await TaskService.uploadTaskImages(
    taskId,
    files,
    req.user!.userId
  );
  res.status(201).json(task);
};

export const getTaskImage = async (req: AuthRequest, res: Response) => {
  const { taskId, imageId } = req.params;
  const tId = Array.isArray(taskId) ? taskId[0] : taskId;
  const iId = Array.isArray(imageId) ? imageId[0] : imageId;
  const image = await TaskService.getTaskImage(tId, iId, req.user!.userId);
  res.type(image.contentType).send(image.data);
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const result = await TaskService.deleteTask(taskId, req.user!.userId);
  res.json(result);
};

export const assignUserToTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const userId = req.body.userId;
  const result = await TaskService.assignUserToTask(
    taskId,
    userId,
    req.user!.userId
  );
  res.json(result);
};
