import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getActorFromToken } from '../utils/authentication';
import { createMcpServer } from './server';

const token = process.env.MCP_ACCESS_TOKEN;

if (!token) {
  process.stderr.write('MCP_ACCESS_TOKEN is required.\n');
  process.exit(1);
}

try {
  const server = createMcpServer(getActorFromToken(token));
  const transport = new StdioServerTransport();
  void server.connect(transport);
} catch {
  process.stderr.write('MCP_ACCESS_TOKEN is invalid or expired.\n');
  process.exit(1);
}
