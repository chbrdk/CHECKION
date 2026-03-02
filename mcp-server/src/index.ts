/**
 * CHECKION MCP Server – Streamable HTTP transport, runs as standalone Node server.
 * Set CHECKION_API_URL and CHECKION_API_TOKEN; optional MCP_PORT (default 3100), MCP_STATELESS (true/false).
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerCheckionTools } from './tools.js';

const PORT = Number(process.env.MCP_PORT) || 3100;
const STATELESS = process.env.MCP_STATELESS === 'true' || process.env.MCP_STATELESS === '1';

async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on('error', reject);
  });
}

async function main() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: STATELESS ? undefined : () => randomUUID(),
  });

  const mcpServer = new McpServer(
    { name: 'checkion-mcp', version: '1.0.0' },
    { capabilities: {} }
  );

  registerCheckionTools(mcpServer);
  await mcpServer.connect(transport);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const parsedBody = req.method === 'POST' ? await parseBody(req) : undefined;
    await transport.handleRequest(req as Parameters<typeof transport.handleRequest>[0], res, parsedBody);
  });

  server.listen(PORT, () => {
    console.log(`[CHECKION MCP] Server listening on port ${PORT} (stateless=${STATELESS})`);
    if (!process.env.CHECKION_API_URL || !process.env.CHECKION_API_TOKEN) {
      console.warn('[CHECKION MCP] CHECKION_API_URL or CHECKION_API_TOKEN not set – tools will return configuration errors.');
    }
  });

  const shutdown = async () => {
    server.close();
    await mcpServer.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[CHECKION MCP] Fatal:', err);
  process.exit(1);
});
