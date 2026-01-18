import { Response } from "express";
import Task, { TaskStatus } from "../models/Task";
import Project from "../models/Project";
import { AuthRequest } from "../middleware/auth.middleware";
import mongoose from "mongoose";

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, description, projectId, assignedTo, status } = req.body;

  if (!title || !projectId) {
    return res.status(400).json({ message: "Title and projectId required" });
  }

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "Invalid projectId" });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  // Permission: user must be a member
  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: "Not a project member" });
  }

  const task = await Task.create({
    title,
    description,
    project: project._id,
    assignedTo,
    status: (status as TaskStatus) || "todo",
    createdBy: req.user!.userId,
  });

  res.status(201).json(task);
};

export const getTasksByProject = async (req: AuthRequest, res: Response) => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: "Invalid projectId" });
  }

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: "Project not found" });

  // Permission: user must be a member
  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: "Not a project member" });
  }

  const tasks = await Task.find({ project: project._id })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");

  res.json(tasks);
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;
  const { title, description, status, assignedTo } = req.body;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: "Invalid taskId" });
  }

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: "Project not found" });

  // Permission: user must be a member
  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: "Not a project member" });
  }

  // Update allowed fields
  if (title) task.title = title;
  if (description) task.description = description;
  if (status && ["todo", "in_progress", "done"].includes(status))
    task.status = status as TaskStatus;
  if (assignedTo) task.assignedTo = assignedTo;

  await task.save();
  res.json(task);
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.taskId)
    ? req.params.taskId[0]
    : req.params.taskId;

  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    return res.status(400).json({ message: "Invalid taskId" });
  }

  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const project = await Project.findById(task.project);
  if (!project) return res.status(404).json({ message: "Project not found" });

  if (!project.members.some((id) => id.toString() === req.user!.userId)) {
    return res.status(403).json({ message: "Not a project member" });
  }

  await task.deleteOne();
  res.json({ message: "Task deleted" });
};
