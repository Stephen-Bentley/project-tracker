import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { AuthenticatedActor } from '../utils/authentication';

const objectIdSchema = z
  .string()
  .refine(
    (value) => /^[a-f0-9]{24}$/i.test(value),
    'Must be a valid resource ID.'
  );
const taskStatusSchema = z.enum([
  'todo',
  'in_progress',
  'code_review',
  'completed',
  'done',
]);

class McpNotFoundError extends Error {}

const person = (value: unknown) => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return {
    id: String(record._id),
    name: typeof record.name === 'string' ? record.name : undefined,
    email: typeof record.email === 'string' ? record.email : undefined,
    role:
      record.role === 'admin' || record.role === 'user'
        ? record.role
        : undefined,
    avatarUrl:
      typeof record.avatarUrl === 'string' ? record.avatarUrl : undefined,
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

const listProjectTasks = async (
  projectId: string,
  actor: AuthenticatedActor
) => {
  return TaskService.getTasksByProject(projectId, actor.userId).catch(() => {
    throw new McpNotFoundError();
  });
};

const getTask = async (taskId: string, actor: AuthenticatedActor) => {
  return TaskService.assertMemberForTask(taskId, actor.userId).catch(() => {
    throw new McpNotFoundError();
  });
};

const getTaskForMember = async (taskId: string, actor: AuthenticatedActor) => {
  return getTask(taskId, actor);
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
      description:
        'Get safe details for one project the authenticated user belongs to.',
      inputSchema: z.object({ projectId: objectIdSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) =>
      safeTool(async () => {
        const project = await ProjectService.getProjectById(
          projectId,
          actor.userId
        ).catch(() => {
          throw new McpNotFoundError();
        });
        return { project: serializeProject(project) };
      })
  );

  server.registerTool(
    'list_project_tasks',
    {
      description:
        'List safe task summaries for one project the authenticated user belongs to.',
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
      description:
        'Get safe details for one task in a project the authenticated user belongs to.',
      inputSchema: z.object({ taskId: objectIdSchema }).strict(),
      annotations: { readOnlyHint: true },
    },
    async ({ taskId }) =>
      safeTool(async () => {
        const task = await getTask(taskId, actor);
        return { task: serializeTask(task) };
      })
  );

  server.registerTool(
    'create_task',
    {
      description:
        'Create a task in a project the authenticated user belongs to.',
      inputSchema: z
        .object({
          title: z.string().trim().min(1).max(500),
          projectId: objectIdSchema,
          description: z.string().max(10000).optional(),
          assignedTo: objectIdSchema.nullable().optional(),
          status: taskStatusSchema.optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async ({ title, projectId, description, assignedTo, status }) =>
      safeTool(async () => {
        const created = await TaskService.createTask(
          title,
          description,
          projectId,
          assignedTo || null,
          status || 'todo',
          actor.userId
        );
        const task = await getTask(created._id, actor);
        return { task: serializeTask(task) };
      })
  );

  server.registerTool(
    'update_task',
    {
      description:
        'Update fields on a task in a project the authenticated user belongs to.',
      inputSchema: z
        .object({
          taskId: objectIdSchema,
          title: z.string().trim().min(1).max(500).optional(),
          description: z.string().max(10000).optional(),
          assignedTo: objectIdSchema.nullable().optional(),
          status: taskStatusSchema.optional(),
        })
        .strict()
        .refine(
          (value) => Object.keys(value).some((key) => key !== 'taskId'),
          'At least one task field is required.'
        ),
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async ({ taskId, ...updates }) =>
      safeTool(async () => {
        await getTaskForMember(taskId, actor);
        await TaskService.updateTask(taskId, updates, actor.userId);
        return { task: serializeTask(await getTask(taskId, actor)) };
      })
  );

  server.registerTool(
    'assign_task',
    {
      description:
        'Assign or unassign a task in a project the authenticated user belongs to.',
      inputSchema: z
        .object({ taskId: objectIdSchema, userId: objectIdSchema.nullable() })
        .strict(),
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async ({ taskId, userId }) =>
      safeTool(async () => {
        await TaskService.assignUserToTask(taskId, userId, actor.userId);
        return { task: serializeTask(await getTask(taskId, actor)) };
      })
  );

  server.registerTool(
    'add_task_comment',
    {
      description:
        'Add a comment to a task in a project the authenticated user belongs to.',
      inputSchema: z
        .object({
          taskId: objectIdSchema,
          body: z.string().trim().min(1).max(2000),
        })
        .strict(),
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async ({ taskId, body }) =>
      safeTool(async () => {
        await getTaskForMember(taskId, actor);
        await TaskService.addComment(taskId, body, actor.userId);
        return { task: serializeTask(await getTask(taskId, actor)) };
      })
  );

  return server;
};
