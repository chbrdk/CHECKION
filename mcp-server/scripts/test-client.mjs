#!/usr/bin/env node
/**
 * Minimal MCP client to test CHECKION MCP server.
 * Usage: node scripts/test-client.mjs [serverUrl]
 * Default serverUrl: http://localhost:3100
 */
import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ListToolsResultSchema, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

const SERVER_URL = process.argv[2] || 'http://localhost:3100';

async function main() {
  console.log('CHECKION MCP test client');
  console.log('Connecting to', SERVER_URL, '...\n');

  const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
  const client = new Client(
    { name: 'checkion-test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('Connected. Session ID:', transport.sessionId ?? '(stateless)\n');

  try {
    const listResult = await client.request(
      { method: 'tools/list', params: {} },
      ListToolsResultSchema
    );
    console.log('Tools (' + listResult.tools.length + '):');
    listResult.tools.forEach((t) => console.log('  -', t.name));
    console.log('');

    const healthResult = await client.request(
      {
        method: 'tools/call',
        params: { name: 'checkion/health', arguments: {} },
      },
      CallToolResultSchema
    );
    console.log('checkion/health result:');
    healthResult.content.forEach((c) => {
      if (c.type === 'text') console.log(c.text);
    });
  } finally {
    await transport.close();
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
