/**
 * CHECKION MCP Server – supports Streamable HTTP (default) or stdio (for Claude Desktop).
 *
 * Env:
 * - MCP_TRANSPORT=stdio  → stdio (Claude Desktop: command + args in config)
 * - MCP_TRANSPORT=http   → Streamable HTTP on MCP_PORT (default 3100)
 *
 * Always set: CHECKION_API_URL, CHECKION_API_TOKEN
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCheckionTools } from './tools.js';

const USE_STDIO = process.env.MCP_TRANSPORT === 'stdio';
const PORT = Number(process.env.MCP_PORT) || 3100;
const STATELESS = process.env.MCP_STATELESS === 'true' || process.env.MCP_STATELESS === '1';

function log(msg: string): void {
  (USE_STDIO ? process.stderr : process.stdout).write(`[CHECKION MCP] ${msg}\n`);
}

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
  const mcpServer = new McpServer(
    { name: 'checkion-mcp', version: '1.0.0' },
    { capabilities: {} }
  );
  registerCheckionTools(mcpServer);

  if (USE_STDIO) {
    const transport = new StdioServerTransport(process.stdin, process.stdout);
    await mcpServer.connect(transport);
    if (!process.env.CHECKION_API_URL || !process.env.CHECKION_API_TOKEN) {
      log('CHECKION_API_URL or CHECKION_API_TOKEN not set – tools will return configuration errors.');
    }
    log('Running in stdio mode (Claude Desktop).');
    return;
  }

  process.on('unhandledRejection', (reason) => {
    log('Unhandled rejection: ' + String(reason));
  });

  /** Stateless: one transport per request (SDK forbids reuse). Serialize to avoid concurrent connect(). */
  let requestQueue: Promise<void> = Promise.resolve();
  const sharedTransport = STATELESS
    ? null
    : new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
      });

  if (sharedTransport) {
    sharedTransport.onerror = (err) => log('Transport error: ' + String(err));
    await mcpServer.connect(sharedTransport);
  }

  const handleWithTransport = async (
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody: unknown,
    transport: StreamableHTTPServerTransport
  ): Promise<void> => {
    const origWriteHead = res.writeHead.bind(res) as (a: number, b?: unknown, c?: unknown) => ServerResponse;
    (res as { writeHead: (a: number, b?: unknown, c?: unknown) => ServerResponse }).writeHead = function (statusOrCode: number, b?: unknown, c?: unknown) {
      log('writeHead status=' + statusOrCode);
      return origWriteHead(statusOrCode, b, c);
    };
    const origEnd = res.end.bind(res) as (...a: unknown[]) => ServerResponse;
    (res as { end: (...a: unknown[]) => ServerResponse }).end = function (...args: unknown[]) {
      const len = args[0] === undefined ? 0 : typeof args[0] === 'string' ? args[0].length : (args[0] as Buffer)?.length ?? 0;
      log('end chunkLen=' + len);
      return origEnd(...args);
    };
    await transport.handleRequest(req as Parameters<typeof transport.handleRequest>[0], res, parsedBody);
  };

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    log(`${req.method} ${req.url ?? '/'}`);
    try {
      const parsedBody = req.method === 'POST' ? await parseBody(req) : undefined;
      const method = parsedBody && typeof parsedBody === 'object' && 'method' in parsedBody ? String((parsedBody as { method?: unknown }).method) : '';
      if (method) log('Body method: ' + method);
      res.once('error', (e) => log('res error: ' + String(e)));
      res.once('close', () => { if (!res.writableEnded) log('res close before end'); });

      if (STATELESS) {
        requestQueue = requestQueue.then(async () => {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            // SSE mode: SDK writes response to stream so body is non-empty; client already parses SSE.
            enableJsonResponse: false,
          });
          transport.onerror = (err) => log('Transport error: ' + String(err));
          await mcpServer.connect(transport);
          await handleWithTransport(req, res, parsedBody, transport);
        });
        await requestQueue;
      } else {
        await handleWithTransport(req, res, parsedBody, sharedTransport!);
      }
    } catch (err) {
      log('Request error: ' + String(err));
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32603,
              message: err instanceof Error ? err.message : String(err),
            },
          })
        );
      }
    }
  });

  server.listen(PORT, () => {
    log(`Server listening on port ${PORT} (stateless=${STATELESS})`);
    if (!process.env.CHECKION_API_URL || !process.env.CHECKION_API_TOKEN) {
      log('CHECKION_API_URL or CHECKION_API_TOKEN not set – tools will return configuration errors.');
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
  process.stderr.write('[CHECKION MCP] Fatal: ' + String(err) + '\n');
  process.exit(1);
});
