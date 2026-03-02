# CHECKION MCP Server

## Purpose

The CHECKION MCP Server is a **remote MCP (Model Context Protocol) server** that exposes CHECKION APIs as MCP tools. It is intended to run on **Coolify** (or any Node host) and to be used by MCP clients (e.g. Cursor, other agents) that connect via **Streamable HTTP**.

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

## Connecting an agent / Cursor

Point the MCP client to the server URL (e.g. `https://mcp.your-domain.com` or `http://localhost:3100`). No client-side token is required; the server uses `CHECKION_API_TOKEN` when calling CHECKION.

## Relevant code

- **API token auth (CHECKION)**: `lib/auth-api-token.ts` (`getRequestUser`), `lib/db/api-tokens.ts`, `app/api/auth/tokens/`
- **MCP server**: `mcp-server/src/index.ts` (HTTP + Streamable HTTP transport), `mcp-server/src/tools.ts` (tool definitions), `mcp-server/src/checkion-client.ts` (HTTP client to CHECKION)
