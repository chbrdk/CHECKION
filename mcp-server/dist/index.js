/**
 * CHECKION MCP Server – supports Streamable HTTP (default) or stdio (for Claude Desktop).
 *
 * Env:
 * - MCP_TRANSPORT=stdio  → stdio (Claude Desktop: command + args in config)
 * - MCP_TRANSPORT=http   → Streamable HTTP on MCP_PORT (default 3100)
 * - MCP_STATELESS=true   → stateless HTTP: one JSON-RPC request → one JSON response (no SDK Streamable transport)
 *
 * Always set: CHECKION_API_URL, CHECKION_API_TOKEN
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCheckionTools } from './tools.js';
const USE_STDIO = process.env.MCP_TRANSPORT === 'stdio';
const PORT = Number(process.env.MCP_PORT) || 3100;
const STATELESS = process.env.MCP_STATELESS === 'true' || process.env.MCP_STATELESS === '1';
function log(msg) {
    (USE_STDIO ? process.stderr : process.stdout).write(`[CHECKION MCP] ${msg}\n`);
}
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw.trim()) {
                resolve(undefined);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            }
            catch {
                resolve(undefined);
            }
        });
        req.on('error', reject);
    });
}
/** Stateless: minimal transport that captures the first response and we write it directly to res. No SDK Streamable HTTP. */
async function handleStatelessRequest(mcpServer, req, res, parsedBody) {
    const message = parsedBody && typeof parsedBody === 'object' && 'method' in parsedBody ? parsedBody : undefined;
    if (!message || typeof message.method !== 'string') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON-RPC' } }));
        return;
    }
    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve;
    });
    const transport = {
        onmessage: null,
        send(msg) {
            resolveResponse(msg);
            return Promise.resolve();
        },
        start() {
            return Promise.resolve();
        },
        close() {
            return Promise.resolve();
        },
    };
    await mcpServer.close().catch(() => { });
    await mcpServer.connect(transport);
    const baseUrl = `http://localhost:${PORT}`;
    const requestInfo = {
        headers: req.headers ?? {},
        url: new URL(req.url ?? '/', baseUrl),
    };
    transport.onmessage(message, { requestInfo });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('MCP response timeout')), 30000));
    const response = await Promise.race([responsePromise, timeout]);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
}
async function main() {
    const mcpServer = new McpServer({ name: 'checkion-mcp', version: '1.0.0' }, { capabilities: {} });
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
    let requestQueue = Promise.resolve();
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
    const handleWithTransport = async (req, res, parsedBody, transport) => {
        await transport.handleRequest(req, res, parsedBody);
    };
    const server = createServer(async (req, res) => {
        log(`${req.method} ${req.url ?? '/'}`);
        try {
            const parsedBody = req.method === 'POST' ? await parseBody(req) : undefined;
            const method = parsedBody && typeof parsedBody === 'object' && 'method' in parsedBody ? String(parsedBody.method) : '';
            if (method)
                log('Body method: ' + method);
            if (STATELESS) {
                requestQueue = requestQueue.then(async () => {
                    await handleStatelessRequest(mcpServer, req, res, parsedBody);
                });
                await requestQueue;
            }
            else {
                await handleWithTransport(req, res, parsedBody, sharedTransport);
            }
        }
        catch (err) {
            log('Request error: ' + String(err));
            if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32603,
                        message: err instanceof Error ? err.message : String(err),
                    },
                }));
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
