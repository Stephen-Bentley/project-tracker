import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Request, Response } from 'express';
import { getActorFromAuthorizationHeader } from '../utils/authentication';
import { createMcpServer } from './server';

export const handleHttpMcpRequest = async (req: Request, res: Response) => {
  try {
    const actor = await getActorFromAuthorizationHeader(
      req.headers.authorization
    );
    const server = createMcpServer(actor);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    res.on('close', () => {
      void transport.close();
      void server.close();
    });
  } catch {
    if (!res.headersSent) res.status(401).json({ message: 'Unauthorized' });
  }
};
