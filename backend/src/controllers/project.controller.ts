import { Response } from 'express';
import Project from '../models/Project';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import mongoose from 'mongoose';

export const createProject = async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  const project = await Project.create({
    name,
    description,
    createdBy: req.user!.userId,
    members: [req.user!.userId], // creator is automatically a member
  });

  res.status(201).json(project);
};

export const getMyProjects = async (req: AuthRequest, res: Response) => {
  const projects = await Project.find({
    members: req.user!.userId,
  }).populate('members', 'name email role avatarUrl');

  res.json(projects);
};

export const addUserToProject = async (req: AuthRequest, res: Response) => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

  const userId = req.body.userId;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (project.members.includes(user._id)) {
    return res.status(409).json({ message: 'User already in project' });
  }

  project.members.push(user._id);
  await project.save();

  res.json({
    message: 'User added to project',
    projectId: project._id,
    userId: user._id,
  });
};

export const removeUserFromProject = async (
  req: AuthRequest,
  res: Response
) => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

  const userId = Array.isArray(req.params.userId)
    ? req.params.userId[0]
    : req.params.userId;

  if (
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (project.createdBy.toString() === userId) {
    return res.status(400).json({ message: 'Cannot remove project creator' });
  }

  const memberIndex = project.members.findIndex(
    (id) => id.toString() === userId
  );

  if (memberIndex === -1) {
    return res.status(404).json({ message: 'User not in project' });
  }

  project.members.splice(memberIndex, 1);
  await project.save();

  res.json({ message: 'User removed from project' });
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  const project = await Project.findById(projectId).populate(
    'members',
    'name email role avatarUrl'
  );

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Ensure the requesting user is a member
  if (
    !project.members.some(
      (member) => member._id.toString() === req.user!.userId
    )
  ) {
    return res.status(403).json({ message: 'Not a project member' });
  }

  res.json(project);
};

export const updateProjectMembers = async (req: AuthRequest, res: Response) => {
  const projectId = Array.isArray(req.params.projectId)
    ? req.params.projectId[0]
    : req.params.projectId;
  const { members } = req.body; // array of userIds

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  if (!Array.isArray(members)) {
    return res.status(400).json({ message: 'Members must be an array' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  // Only project creator can manage members
  if (project.createdBy.toString() !== req.user!.userId) {
    return res
      .status(403)
      .json({ message: 'Only project admin can update members' });
  }

  // Validate all user IDs
  for (const userId of members) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: `Invalid user ID: ${userId}` });
    }
  }

  // Ensure project creator is always included
  const updatedMembers = Array.from(
    new Set([...members, project.createdBy.toString()])
  );

  project.members = updatedMembers;
  await project.save();

  const populatedProject = await Project.findById(projectId).populate(
    'members',
    'name email role avatarUrl'
  );

  res.json(populatedProject);
};

export const getAllProjects = async (req: AuthRequest, res: Response) => {
  // Only global admins
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }

  const projects = await Project.find()
    .populate('members', 'name email role avatarUrl')
    .populate('createdBy', 'name email');

  res.json(projects);
};
