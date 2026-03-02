# CHECKION MCP Server

MCP (Model Context Protocol) server that exposes CHECKION APIs as tools. Supports two transports:

- **Streamable HTTP** (default): for Cursor, Coolify, or any HTTP-based MCP client.
- **stdio**: for Claude Desktop; Claude starts the server as a subprocess and talks over stdin/stdout.

## Requirements

- Node 20+
- CHECKION instance with API token (Bearer) auth enabled

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CHECKION_API_URL` | Yes | Base URL of the CHECKION app (e.g. `https://checkion.example.com` or `http://checkion:3333`) |
| `CHECKION_API_TOKEN` | Yes | API token (Bearer) created in CHECKION Settings → API access |
| `MCP_TRANSPORT` | No | `stdio` for Claude Desktop; omit or `http` for Streamable HTTP |
| `MCP_PORT` | No | Port for HTTP mode (default: `3100`) |
| `MCP_STATELESS` | No | Set to `true` or `1` for stateless HTTP mode (no session IDs) |

## Running locally

**HTTP mode** (e.g. for Cursor or test client):

```bash
npm install
export CHECKION_API_URL=http://localhost:3333
export CHECKION_API_TOKEN=checkion_xxxx  # from CHECKION Settings → API tokens
npm run dev
# or: npm run build && npm start
```

Server listens on `http://localhost:3100` (or `MCP_PORT`). All MCP requests (GET/POST) go to the root path.

**stdio mode** (for Claude Desktop – run via Claude config, see below):

```bash
npm run build
MCP_TRANSPORT=stdio CHECKION_API_URL=https://checkion.example.com CHECKION_API_TOKEN=checkion_xxx node dist/index.js
# or: npm run start:stdio  (then set CHECKION_API_URL and CHECKION_API_TOKEN in Claude config env)
```

## Claude Desktop

Add the CHECKION MCP server so Claude can use CHECKION tools (scans, projects, contrast, etc.) directly.

1. **Build once** (in this repo): `cd mcp-server && npm install && npm run build`
2. **Open Claude config**: Claude Desktop → **Settings** → **Developer** → **Edit Config**  
   File: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows).
3. **Add the server** (replace the path and env values with yours):

```json
{
  "mcpServers": {
    "checkion": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/checkion-1/mcp-server/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "CHECKION_API_URL": "https://checkion.projects-a.plygrnd.tech",
        "CHECKION_API_TOKEN": "checkion_YOUR_TOKEN_FROM_SETTINGS"
      }
    }
  }
}
```

- Use the **absolute path** to `mcp-server/dist/index.js` (e.g. `/Users/you/Desktop/ANTIGRAVITY/CHECKION-1/mcp-server/dist/index.js` on macOS).
4. **Restart Claude Desktop** completely (quit from dock/tray, then reopen).
5. In Claude, open the **🔨 Tools** list; you should see the CHECKION tools (e.g. `checkion/health`, `checkion/projects_list`, `checkion/scan_single`).

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
