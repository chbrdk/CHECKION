# CHECKION MCP Server

Remote MCP (Model Context Protocol) server that exposes CHECKION APIs as tools. Designed to run on Coolify (or any Node host) and to be used by MCP clients (e.g. Cursor) that connect via Streamable HTTP.

## Requirements

- Node 20+
- CHECKION instance with API token (Bearer) auth enabled

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CHECKION_API_URL` | Yes | Base URL of the CHECKION app (e.g. `https://checkion.example.com` or `http://checkion:3333`) |
| `CHECKION_API_TOKEN` | Yes | API token (Bearer) created in CHECKION Settings → API access |
| `MCP_PORT` | No | Port to listen on (default: `3100`) |
| `MCP_STATELESS` | No | Set to `true` or `1` for stateless mode (no session IDs) |

## Running locally

```bash
npm install
export CHECKION_API_URL=http://localhost:3333
export CHECKION_API_TOKEN=checkion_xxxx  # from CHECKION Settings → API tokens
npm run dev
# or: npm run build && npm start
```

Server listens on `http://localhost:3100` (or `MCP_PORT`). All MCP requests (GET/POST) go to the root path.

## Tools (first set)

| Tool | Description |
|------|-------------|
| `checkion/scan_single` | Start single-page scan (url, optional projectId) |
| `checkion/scan_get` | Get scan result by ID |
| `checkion/scans_list` | List single-page scans (limit, page, projectId) |
| `checkion/scan_domain` | Start domain scan (url, useSitemap, maxPages, projectId) |
| `checkion/scan_domain_status` | Domain scan status by ID |
| `checkion/scan_domain_summary` | Domain scan summary by ID |
| `checkion/scans_domain_list` | List domain scans |
| `checkion/projects_list` | List projects |
| `checkion/project_get` | Get project by ID |
| `checkion/project_create` | Create project (name, optional domain) |
| `checkion/tools_contrast` | WCAG contrast (f, b hex colors) |
| `checkion/tools_extract` | Extract content by URL and selector |
| `checkion/health` | CHECKION API health check |

## Client configuration (e.g. Cursor)

Point the MCP client to the server URL. No client-side token is needed; the server uses `CHECKION_API_TOKEN` to call CHECKION.

Example (Streamable HTTP URL):

- URL: `https://mcp.your-coolify-domain.com` or `http://localhost:3100` for local

## Docker

```bash
docker build -t checkion-mcp .
docker run -e CHECKION_API_URL=https://checkion.example.com -e CHECKION_API_TOKEN=checkion_xxx -p 3100:3100 checkion-mcp
```

## Coolify

1. New application, build from Dockerfile; context `mcp-server/` (or repo root with Dockerfile path `mcp-server/Dockerfile`).
2. Set env: `CHECKION_API_URL`, `CHECKION_API_TOKEN`; optional `MCP_PORT`, `MCP_STATELESS`.
3. Expose port 3100 (or your chosen port) for the MCP client.
