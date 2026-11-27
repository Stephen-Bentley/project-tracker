import { createHash } from 'node:crypto';
import request from 'supertest';
import app from '../app';
import { pool } from '../config/db';
import { env } from '../config/env';
import { newId } from '../services/postgres';
import { signToken } from '../utils/jwt';
import { createTestUser } from './fixtures';

test('the automation credential creates a real project and creator membership through MCP', async () => {
  const userId = await createTestUser(
    'MCP Automation',
    env.MCP_AUTOMATION_EMAIL
  );
  const automationToken = 'mcp_' + newId();
  await pool.query(
    'INSERT INTO api_tokens (id, user_id, label, token_hash, created_at) VALUES ($1, $2, $3, $4, NOW())',
    [
      newId(),
      userId,
      'Test MCP credential',
      createHash('sha256').update(automationToken).digest('hex'),
    ]
  );

  const response = await request(app)
    .post('/mcp')
    .set('Accept', 'application/json, text/event-stream')
    .set('Authorization', `Bearer ${automationToken}`)
    .send({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'create_project',
        arguments: { name: 'MCP-created project' },
      },
    });
  expect(response.status).toBe(200);
  const event = response.text
    ?.split('\n')
    .find((line) => line.startsWith('data: '));
  const rpc = event ? JSON.parse(event.slice('data: '.length)) : response.body;
  const project = rpc.result.structuredContent.project;
  expect(project).toMatchObject({
    name: 'MCP-created project',
    createdBy: { id: userId },
  });

  const board = await request(app)
    .get('/api/projects/' + project.id)
    .set('Authorization', `Bearer ${signToken({ userId, role: 'user' })}`);
  expect(board.status).toBe(200);
  expect(board.body.members).toEqual([
    expect.objectContaining({ _id: userId }),
  ]);
});
