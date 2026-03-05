/**
 * CHECKION MCP Server – supports Streamable HTTP (default) or stdio (for Claude Desktop).
 *
 * Env:
 * - MCP_TRANSPORT=stdio  → stdio (Claude Desktop: command + args in config)
 * - MCP_TRANSPORT=http   → Streamable HTTP on MCP_PORT (default 3100)
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
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: STATELESS ? undefined : () => randomUUID(),
        enableJsonResponse: true,
    });
    transport.onerror = (err) => log('Transport error: ' + String(err));
    await mcpServer.connect(transport);
    process.on('unhandledRejection', (reason) => {
        log('Unhandled rejection: ' + String(reason));
    });
    const server = createServer(async (req, res) => {
        log(`${req.method} ${req.url ?? '/'}`);
        try {
            const parsedBody = req.method === 'POST' ? await parseBody(req) : undefined;
            const method = parsedBody && typeof parsedBody === 'object' && 'method' in parsedBody ? String(parsedBody.method) : '';
            if (method)
                log('Body method: ' + method);
            res.once('error', (e) => log('res error: ' + String(e)));
            res.once('close', () => { if (!res.writableEnded)
                log('res close before end'); });
            const origWriteHead = res.writeHead.bind(res);
            res.writeHead = function (statusOrCode, b, c) {
                log('writeHead status=' + statusOrCode);
                return origWriteHead(statusOrCode, b, c);
            };
            const origEnd = res.end.bind(res);
            res.end = function (...args) {
                const len = args[0] === undefined ? 0 : typeof args[0] === 'string' ? args[0].length : args[0]?.length ?? 0;
                log('end chunkLen=' + len);
                return origEnd(...args);
            };
            await transport.handleRequest(req, res, parsedBody);
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
