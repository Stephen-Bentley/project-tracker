import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import mongoose from 'mongoose';
import { z } from 'zod';
import Project from '../models/Project';
import Task from '../models/Task';
import { ProjectService } from '../services/project.service';
import { AuthenticatedActor } from '../utils/authentication';

const objectIdSchema = z
  .string()
  .refine(mongoose.Types.ObjectId.isValid, 'Must be a valid MongoDB object ID.');

class McpNotFoundError extends Error {}

const person = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return {
    id: String(record._id),
    name: typeof record.name === 'string' ? record.name : undefined,
    email: typeof record.email === 'string' ? record.email : undefined,
    role: record.role === 'admin' || record.role === 'user' ? record.role : undefined,
    avatarUrl: typeof record.avatarUrl === 'string' ? record.avatarUrl : undefined,
  };
};

const serializeProject = (project: any) => ({
  id: String(project._id),
  name: project.name,
  description: project.description || undefined,
  createdBy: person(project.createdBy),
  members: Array.isArray(project.members)
    ? project.members.map(person).filter(Boolean)
    : [],
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

const serializeTask = (task: any) => ({
  id: String(task._id),
  title: task.title,
  description: task.description || undefined,
  projectId: String(task.project),
  assignedTo: person(task.assignedTo),
  createdBy: person(task.createdBy),
  status: task.status,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const toolResult = (value: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value) }],
  structuredContent: value as Record<string, unknown>,
});

const toolFailure = (message: string) => ({
  isError: true,
  content: [{ type: 'text' as const, text: message }],
});

const assertProjectMember = async (projectId: string, actor: AuthenticatedActor) => {
  const project = await Project.findById(projectId);
  if (!project || !project.members.some((member) => member.toString() === actor.userId)) {
    throw new McpNotFoundError();
  }
  return project;
};

const listProjectTasks = async (projectId: string, actor: AuthenticatedActor) => {
  const project = await assertProjectMember(projectId, actor);
  return Task.find({ project: project._id })
    .populate('assignedTo', 'name email avatarUrl')
    .populate('createdBy', 'name email');
};

const getTask = async (taskId: string, actor: AuthenticatedActor) => {
  const task = await Task.findById(taskId)
    .populate('assignedTo', 'name email avatarUrl')
    .populate('createdBy', 'name email');

  if (!task) throw new McpNotFoundError();
  await assertProjectMember(task.project.toString(), actor);
  return task;
};

const safeTool = async <T>(operation: () => Promise<T>) => {
  try {
    return toolResult(await operation());
  } catch (error) {
    if (error instanceof McpNotFoundError) {
      return toolFailure('Requested resource was not found.');
    }
    return toolFailure('Unable to complete the requested operation.');
  }
};

export const createMcpServer = (actor: AuthenticatedActor) => {
  const server = new McpServer({ name: 'project-tracker', version: '1.0.0' });

  server.registerTool(
    'list_my_projects',
    {
      description: 'List projects that the authenticated user belongs to.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true },
    },
    async () =>
      safeTool(async () => {
        const projects = await ProjectService.getProjectsByMember(actor.userId);
        return { projects: projects.map(serializeProject) };
      })
  );

  server.registerTool(
    'get_project',
    {
      description: 'Get safe details for one project the authenticated user belongs to.',
      inputSchema: z.object({ projectId: objectIdSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) =>
      safeTool(async () => {
        const project = await ProjectService.getProjectById(projectId, actor.userId).catch(() => {
          throw new McpNotFoundError();
        });
        return { project: serializeProject(project) };
      })
  );

  server.registerTool(
    'list_project_tasks',
    {
      description: 'List safe task summaries for one project the authenticated user belongs to.',
      inputSchema: z.object({ projectId: objectIdSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) =>
      safeTool(async () => {
        const tasks = await listProjectTasks(projectId, actor);
        return { tasks: tasks.map(serializeTask) };
      })
  );

  server.registerTool(
    'get_task',
    {
      description: 'Get safe details for one task in a project the authenticated user belongs to.',
      inputSchema: z.object({ taskId: objectIdSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ taskId }) =>
      safeTool(async () => {
        const task = await getTask(taskId, actor);
        return { task: serializeTask(task) };
      })
  );

  return server;
};
