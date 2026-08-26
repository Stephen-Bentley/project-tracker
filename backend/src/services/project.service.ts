import Project from '../models/Project';
import User from '../models/User';
import mongoose from 'mongoose';

export class ProjectService {
  static async createProject(
    name: string,
    description: string,
    userId: string
  ) {
    const project = await Project.create({
      name,
      description,
      createdBy: userId,
      members: [userId],
    });
    return project;
  }

  static async getProjectsByMember(userId: string) {
    return await Project.find({
      members: userId,
    }).populate('members', 'name email role avatarUrl');
  }

  static async addMember(projectId: string, userId: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      (error as any).status = 404;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      (error as any).status = 404;
      throw error;
    }

    if (project.members.includes(user._id)) {
      const error = new Error('User already in project');
      (error as any).status = 409;
      throw error;
    }

    project.members.push(user._id);
    await project.save();

    return {
      message: 'User added to project',
      projectId: project._id,
      userId: user._id,
    };
  }

  static async removeMember(
    projectId: string,
    userId: string,
    currentUserId: string
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      (error as any).status = 404;
      throw error;
    }

    if (project.createdBy.toString() === userId) {
      const error = new Error('Cannot remove project creator');
      (error as any).status = 400;
      throw error;
    }

    const memberIndex = project.members.findIndex(
      (id) => id.toString() === userId
    );

    if (memberIndex === -1) {
      const error = new Error('User not in project');
      (error as any).status = 404;
      throw error;
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    return { message: 'User removed from project' };
  }

  static async getProjectById(projectId: string, userId: string) {
    const project = await Project.findById(projectId).populate(
      'members',
      'name email role avatarUrl'
    );

    if (!project) {
      const error = new Error('Project not found');
      (error as any).status = 404;
      throw error;
    }

    const isMember = project.members.some(
      (member) => member._id.toString() === userId
    );

    if (!isMember) {
      const error = new Error('Not a project member');
      (error as any).status = 403;
      throw error;
    }

    return project;
  }

  static async updateMembers(
    projectId: string,
    members: string[],
    currentUserId: string
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      (error as any).status = 404;
      throw error;
    }

    if (project.createdBy.toString() !== currentUserId) {
      const error = new Error('Only project admin can update members');
      (error as any).status = 403;
      throw error;
    }

    // Validate all user IDs
    for (const userId of members) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error(`Invalid user ID: ${userId}`);
        (error as any).status = 400;
        throw error;
      }
    }

    const updatedMembers = Array.from(
      new Set([
        ...members.map((m) => new mongoose.Types.ObjectId(m)),
        project.createdBy,
      ])
    );

    project.members = updatedMembers;
    await project.save();

    return await Project.findById(projectId).populate(
      'members',
      'name email role avatarUrl'
    );
  }

  static async getAllProjects() {
    return await Project.find()
      .populate('members', 'name email role avatarUrl')
      .populate('createdBy', 'name email');
  }
}
