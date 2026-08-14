import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ProjectService } from '../services/project.service';
import {
  createProjectSchema,
  addMemberSchema,
  removeMemberSchema,
  updateMembersSchema,
} from '../validators/project.validator';
import { validate } from '../middleware/validate.middleware';

export const createProject = async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  const project = await ProjectService.createProject(name, description, req.user!.userId);
  res.status(201).json(project);
};

export const getMyProjects = async (req: AuthRequest, res: Response) => {
  const projects = await ProjectService.getProjectsByMember(req.user!.userId);
  res.json(projects);
};

export const addUserToProject = async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId;
  const userId = req.body.userId;
  const result = await ProjectService.addMember(projectId, userId);
  res.json(result);
};

export const removeUserFromProject = async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId;
  const userId = req.params.userId;
  const result = await ProjectService.removeMember(projectId, userId, req.user!.userId);
  res.json(result);
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId;
  const project = await ProjectService.getProjectById(projectId, req.user!.userId);
  res.json(project);
};

export const updateProjectMembers = async (req: AuthRequest, res: Response) => {
  const projectId = req.params.projectId;
  const { members } = req.body;
  const project = await ProjectService.updateMembers(projectId, members, req.user!.userId);
  res.json(project);
};

export const getAllProjects = async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  const projects = await ProjectService.getAllProjects();
  res.json(projects);
};
