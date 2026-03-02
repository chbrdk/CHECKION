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

Claude Desktop kann nur lokale Prozesse starten (stdio). Du hast **zwei Wege**:

### Variante A: Nichts vom Projekt auf deinem Rechner (empfohlen)

MCP-Server läuft **remote** (z. B. auf Coolify). Auf dem Rechner mit Claude brauchst du **kein CHECKION-Repo, kein Node, keinen Build** – nur einen kleinen Proxy, den Claude startet und der zur Remote-URL verbindet.

1. **MCP-Server irgendwo deployen** (z. B. Coolify), mit `CHECKION_API_URL` und `CHECKION_API_TOKEN`. Öffentliche URL merken, z. B. `https://checkion-mcp.deine-domain.de`.
2. **Lokal:** [uv](https://docs.astral.sh/uv/) installieren (für `uvx`), falls noch nicht vorhanden.
3. **Claude-Config:** Einstellungen → Developer → Edit Config. Dort z. B.:

```json
{
  "mcpServers": {
    "checkion": {
      "command": "uvx",
      "args": [
        "mcp-proxy",
        "--transport",
        "streamablehttp",
        "https://DEINE-MCP-SERVER-URL"
      ]
    }
  }
}
```

4. Claude Desktop komplett neu starten. Fertig – **auf dem Rechner liegt nur der Proxy-Aufruf**, der eigentliche Server und der Token laufen remote.

### Variante B: Server lokal starten (mit Repo auf dem Rechner)

Wenn du das CHECKION-Repo ohnehin auf dem Rechner hast, kann Claude den MCP-Server **lokal** als Subprozess starten (stdio). Dann läuft der Server auf deiner Maschine und ruft nur die CHECKION-API (remote) auf.

1. **Einmalig** im Repo: `cd mcp-server && npm install`
2. **Claude-Config** (absoluter Pfad zu `mcp-server/src/index.ts` und Token anpassen):

```json
{
  "mcpServers": {
    "checkion": {
      "command": "npx",
      "args": ["tsx", "/ABSOLUTE/PFAD/ZU/checkion-1/mcp-server/src/index.ts"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "CHECKION_API_URL": "https://checkion.projects-a.plygrnd.tech",
        "CHECKION_API_TOKEN": "checkion_DEIN_TOKEN_AUS_EINSTELLUNGEN"
      }
    }
  }
}
```

3. Claude Desktop neu starten.

**Warum überhaupt etwas „lokal“?** Claude Desktop unterstützt nur **stdio** (einen Befehl starten). Er kann keine reine Remote-URL eintragen. Bei Variante A startet Claude nur den **Proxy** (`uvx mcp-proxy …`), der mit deinem remote laufenden MCP-Server spricht – dann muss auf deinem System nichts vom CHECKION-Projekt liegen.

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
