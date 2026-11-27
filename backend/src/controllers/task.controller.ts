import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TaskService, TaskStatus } from '../services/task.service';
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

  const tasks = await TaskService.getTasksByProject(
    projectId,
    req.user!.userId
  );
  res.json(tasks);
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const updatedTask = await TaskService.updateTask(
    taskId,
    req.body,
    req.user!.userId
  );
  res.json(updatedTask);
};

export const moveBoardTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  await TaskService.moveBoardTask(
    taskId,
    req.body.status,
    req.body.beforeTaskId,
    req.user!.userId
  );
  res.sendStatus(204);
};

export const addTaskComment = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
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
