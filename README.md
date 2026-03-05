CHECKION – Next.js app for accessibility and content checks (scans, journeys, GEO/E-E-A-T, tools).

## Getting Started

Run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port in `package.json`) in your browser.

## MCP Server (optional) – CHECKION tools in Cursor / Coolify

CHECKION includes an **MCP (Model Context Protocol) server** that exposes CHECKION APIs as tools. If CHECKION runs on **Coolify**, you can deploy the MCP server on the **same Coolify instance** and then use the tools from Cursor (or other MCP clients).

### Option: Add CHECKION MCP in Cursor / Coolify

1. **Deploy the MCP server** (e.g. as a separate Coolify app):
   - Build from this repo: context `mcp-server/` (or Dockerfile path `mcp-server/Dockerfile`).
   - Set env: `CHECKION_API_URL` (your CHECKION app URL, e.g. `https://checkion.projects-a.plygrnd.tech`), `CHECKION_API_TOKEN` (API token from CHECKION → Settings → API access). Optional: `MCP_PORT` (default `3100`), `MCP_STATELESS`.
   - Expose port **3100** (or your `MCP_PORT`) so the MCP client can reach it.

2. **In Cursor** (or another HTTP MCP client): add the MCP server with transport **Streamable HTTP** and URL = your MCP server’s public URL (e.g. `https://checkion-mcp.your-coolify-domain.com` if you gave it that domain).

3. **In Coolify** (if your client is configured via Coolify): add the CHECKION MCP server as an MCP resource and use the same URL.

After that, the CHECKION tools (scans, projects, journeys, GEO/E-E-A-T, SSL/PageSpeed/Readability, search, shares, etc.) are available to the AI in that environment.

**Full details** (env vars, tools list, Claude Desktop, Docker): see **[mcp-server/README.md](mcp-server/README.md)**.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [mcp-server/README.md](mcp-server/README.md) – MCP server setup, tools reference, Coolify/Docker
