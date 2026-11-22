import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import Project from '../models/Project';
import Task from '../models/Task';
import User from '../models/User';
import { createMcpServer } from './server';

describe('Project Tracker MCP server', () => {
  let client: Client;
  let memberId: string;
  let outsiderId: string;
  let projectId: string;
  let taskId: string;

  beforeEach(async () => {
    const member = await User.create({ name: 'Member', email: 'member@mcp.test', password: 'password123', role: 'user' });
    const outsider = await User.create({ name: 'Outsider', email: 'outsider@mcp.test', password: 'password123', role: 'user' });
    const project = await Project.create({ name: 'MCP project', createdBy: member._id, members: [member._id] });
    const task = await Task.create({
      title: 'Safe task', project: project._id, status: 'todo', createdBy: member._id,
      images: [{ filename: 'private.png', contentType: 'image/png', data: Buffer.from('private image bytes') }],
    });
    memberId = member._id.toString();
    outsiderId = outsider._id.toString();
    projectId = project._id.toString();
    taskId = task._id.toString();
  });

  const connect = async (userId: string) => {
    const server = createMcpServer({ userId, role: 'user' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'project-tracker-test', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  };

  const firstText = (result: unknown) =>
    ((result as { content: Array<{ text: string }> }).content)[0].text;

  afterEach(async () => client?.close());

  it('advertises the four read-only tools', async () => {
    await connect(memberId);
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual(['list_my_projects', 'get_project', 'list_project_tasks', 'get_task']);
    expect(tools.every((tool) => tool.annotations?.readOnlyHint)).toBe(true);
  });

  it('returns only authorized data and omits image bytes', async () => {
    await connect(memberId);
    const projects = await client.callTool({ name: 'list_my_projects', arguments: {} });
    const task = await client.callTool({ name: 'get_task', arguments: { taskId } });
    expect(firstText(projects)).toContain(projectId);
    expect(firstText(task)).toContain('Safe task');
    expect(firstText(task)).not.toContain('private image bytes');
  });

  it('does not disclose data to a non-member', async () => {
    await connect(outsiderId);
    const project = await client.callTool({ name: 'get_project', arguments: { projectId } });
    const task = await client.callTool({ name: 'get_task', arguments: { taskId } });
    expect(project.isError).toBe(true);
    expect(task.isError).toBe(true);
    expect(firstText(project)).toBe('Requested resource was not found.');
    expect(firstText(task)).toBe('Requested resource was not found.');
  });
});
