# CHECKION MCP Server

## Purpose

The CHECKION MCP Server is an **MCP (Model Context Protocol) server** that exposes CHECKION APIs as MCP tools. It supports two transports:

- **Streamable HTTP** (default): for Cursor, Coolify, or any HTTP-based MCP client.
- **stdio**: for **Claude Desktop**; Claude starts the server as a subprocess (`MCP_TRANSPORT=stdio`). See `mcp-server/README.md` → "Claude Desktop" for config.

## Architecture

- **Client** (e.g. Cursor) → connects to MCP Server (HTTPS/HTTP, Streamable HTTP).
- **MCP Server** (`mcp-server/`) → runs as a standalone Node service; on each tool call it calls the **CHECKION API** with a **Bearer token**.
- **CHECKION** (Next.js app) → accepts `Authorization: Bearer <token>` on protected routes (see API token auth in settings).

So: the MCP server does not store user data; it only forwards requests to CHECKION with a single API token (created in CHECKION Settings → API access).

## Where tokens are created

- In the **CHECKION** app: **Settings → API access** (API-Tokens section).
- Create a token (optional name, e.g. "MCP Server"); the secret is shown **once**.
- Set that value as **`CHECKION_API_TOKEN`** in the environment of the MCP server (e.g. in Coolify).

## Running the server

- **Locally**: `cd mcp-server && npm install && CHECKION_API_URL=... CHECKION_API_TOKEN=... npm run dev`
- **Docker**: see `mcp-server/Dockerfile` and `mcp-server/README.md`
- **Coolify**: New app from Dockerfile (context `mcp-server/`), set `CHECKION_API_URL` and `CHECKION_API_TOKEN`, expose port 3100 (or `MCP_PORT`)

## Same-domain proxy (optional)

To expose the MCP under the CHECKION domain (e.g. `https://checkion.example.com/mcp`), set **`MCP_SERVER_URL`** in the **CHECKION** app’s environment to the internal MCP server URL (e.g. `http://checkion-mcp:3100` when the MCP service is named `checkion-mcp` in Coolify). Next.js rewrites `/mcp` and `/mcp/*` to that URL (see `next.config.mjs` and `lib/constants.ts` → `ENV_MCP_SERVER_URL`). Then the MCP URL for clients is `https://checkion.example.com/mcp`.

**Important:** `MCP_SERVER_URL` in CHECKION must be the **internal** URL where the MCP server is reachable (e.g. `http://checkion-mcp:3100`), **not** the public URL `https://checkion.example.com/mcp`.

## Troubleshooting: 500 on `/mcp`

If `https://checkion..../mcp` returns **500** (browser or `curl -X POST .../mcp`):

1. **MCP server as separate Coolify app**  
   The MCP server must run as its **own application** in Coolify. Build: Dockerfile `mcp-server/Dockerfile`, context `mcp-server/`. Env: `CHECKION_API_URL`, `CHECKION_API_TOKEN`, optional `MCP_PORT=3100`, `MCP_STATELESS=true`. Expose port 3100.

2. **CHECKION app env: `MCP_SERVER_URL`**  
   In the **CHECKION** (Next.js) app, set **`MCP_SERVER_URL`** to the **internal** URL of the MCP service (e.g. `http://checkion-mcp:3100` — use the Coolify internal hostname for the MCP app). If this is missing or points to the wrong host, `/mcp` rewrites fail → 500.

3. **Test MCP server directly**  
   If the MCP app has its own public URL, test:  
   `curl -X POST "https://<mcp-public-url>" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'`  
   If that returns 200 + JSON, the MCP server is OK; the 500 via CHECKION is due to rewrite/config (step 2). If that also returns 500, check MCP app logs and `CHECKION_API_URL` / `CHECKION_API_TOKEN`.

## Connecting an agent / Cursor

Point the MCP client to the server URL (e.g. `https://mcp.your-domain.com` or `http://localhost:3100`). No client-side token is required; the server uses `CHECKION_API_TOKEN` when calling CHECKION.

## Relevant code

- **API token auth (CHECKION)**: `lib/auth-api-token.ts` (`getRequestUser`), `lib/db/api-tokens.ts`, `app/api/auth/tokens/`
- **MCP server**: `mcp-server/src/index.ts` (HTTP or stdio transport via `MCP_TRANSPORT`), `mcp-server/src/tools.ts` (tool definitions), `mcp-server/src/checkion-client.ts` (HTTP client to CHECKION)
