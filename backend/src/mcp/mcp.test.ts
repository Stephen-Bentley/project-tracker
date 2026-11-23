import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ProjectService } from '../services/project.service';
import { TaskService } from '../services/task.service';
import { AuthenticatedActor } from '../utils/authentication';
import { createMcpServer } from './server';

jest.mock('../services/project.service');
jest.mock('../services/task.service');

describe('Project Tracker MCP server', () => {
  let client: Client;
  const memberId = '1'.repeat(24);
  const outsiderId = '2'.repeat(24);
  const projectId = '3'.repeat(24);
  const taskId = '4'.repeat(24);
  const timestamps = { createdAt: new Date(), updatedAt: new Date() };
  const member = {
    _id: memberId,
    name: 'Member',
    email: 'member@mcp.test',
    role: 'user',
    avatarUrl: null,
    ...timestamps,
  };
  const project = {
    _id: projectId,
    name: 'MCP project',
    description: '',
    createdBy: member,
    members: [member],
    ...timestamps,
  };
  const task = {
    _id: taskId,
    title: 'Safe task',
    description: '',
    project: projectId,
    assignedTo: null,
    createdBy: member,
    status: 'todo',
    ...timestamps,
    images: [
      {
        _id: 'image-id',
        filename: 'private.png',
        contentType: 'image/png',
        uploadedAt: new Date(),
        data: 'private image bytes',
      },
    ],
    comments: [],
    activities: [],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(ProjectService.createProject).mockResolvedValue(project);
    jest
      .mocked(ProjectService.getProjectsByMember)
      .mockResolvedValue([project]);
    jest.mocked(TaskService.assertMemberForTask).mockResolvedValue(task);
  });

  const connect = async (actor: AuthenticatedActor) => {
    const server = createMcpServer(actor);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'project-tracker-test', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  };

  const firstText = (result: unknown) =>
    (result as { content: Array<{ text: string }> }).content[0].text;

  afterEach(async () => client?.close());

  it('keeps project creation unavailable to ordinary members', async () => {
    await connect({ userId: memberId, role: 'user' });
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).not.toContain('create_project');
    const result = await client.callTool({
      name: 'create_project',
      arguments: { name: project.name },
    });
    expect(result.isError).toBe(true);
    expect(ProjectService.createProject).not.toHaveBeenCalled();
  });

  it.each([
    { userId: memberId, role: 'admin' },
    { userId: memberId, role: 'user', canCreateProjectsViaMcp: true },
  ] as const)(
    'creates a project with the authorized actor as creator',
    async (actor) => {
      await connect(actor);
      const { tools } = await client.listTools();
      expect(
        tools.find((tool) => tool.name === 'create_project')?.annotations
      ).toMatchObject({ readOnlyHint: false, idempotentHint: false });
      const result = await client.callTool({
        name: 'create_project',
        arguments: { name: ' MCP project ', addAutomationMember: false },
      });
      expect(result.isError).toBeFalsy();
      expect(ProjectService.createProject).toHaveBeenCalledWith(
        project.name,
        '',
        memberId,
        false
      );
      expect(result.structuredContent).toMatchObject({
        project: { id: projectId, createdBy: { id: memberId } },
      });
    }
  );

  it('rejects whitespace-only project names', async () => {
    await connect({ userId: memberId, role: 'admin' });
    const result = await client.callTool({
      name: 'create_project',
      arguments: { name: '   ' },
    });
    expect(result.isError).toBe(true);
    expect(ProjectService.createProject).not.toHaveBeenCalled();
  });

  it('accepts completed tickets for a project created through MCP', async () => {
    const completedTask = { ...task, status: 'completed' };
    jest.mocked(TaskService.createTask).mockResolvedValue(completedTask);
    jest
      .mocked(TaskService.assertMemberForTask)
      .mockResolvedValue(completedTask);
    await connect({
      userId: memberId,
      role: 'user',
      canCreateProjectsViaMcp: true,
    });

    const created = await client.callTool({
      name: 'create_project',
      arguments: { name: project.name },
    });
    const { project: createdProject } = JSON.parse(firstText(created));
    const result = await client.callTool({
      name: 'create_task',
      arguments: {
        projectId: createdProject.id,
        title: task.title,
        status: 'completed',
      },
    });

    expect(result.structuredContent).toMatchObject({
      task: { id: taskId, projectId, status: 'completed' },
    });
    expect(TaskService.createTask).toHaveBeenCalledWith(
      task.title,
      undefined,
      projectId,
      null,
      'completed',
      memberId
    );
  });

  it('returns only authorized data and omits image bytes', async () => {
    await connect({ userId: memberId, role: 'user' });
    const projects = await client.callTool({
      name: 'list_my_projects',
      arguments: {},
    });
    const task = await client.callTool({
      name: 'get_task',
      arguments: { taskId },
    });
    expect(firstText(projects)).toContain(projectId);
    expect(firstText(task)).toContain('Safe task');
    expect(firstText(task)).not.toContain('private image bytes');
  });

  it('does not disclose data to a non-member', async () => {
    jest.mocked(ProjectService.getProjectById).mockRejectedValue(new Error());
    jest.mocked(TaskService.assertMemberForTask).mockRejectedValue(new Error());
    await connect({ userId: outsiderId, role: 'user' });
    const project = await client.callTool({
      name: 'get_project',
      arguments: { projectId },
    });
    const task = await client.callTool({
      name: 'get_task',
      arguments: { taskId },
    });
    expect(project.isError).toBe(true);
    expect(task.isError).toBe(true);
    expect(firstText(project)).toBe('Requested resource was not found.');
    expect(firstText(task)).toBe('Requested resource was not found.');
  });
});
