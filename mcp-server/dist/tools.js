/**
 * CHECKION MCP tools: proxy to CHECKION API with Bearer token.
 */
import { z } from 'zod';
import { checkionFetch, isCheckionError } from './checkion-client.js';
function toTextContent(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string')
        return value;
    return JSON.stringify(value, null, 2);
}
export function registerCheckionTools(server) {
    const base = (path, options) => checkionFetch(path, options);
    // --- scan ---
    server.registerTool('checkion/scan_single', {
        title: 'Start single-page scan',
        description: 'Start a single-page accessibility scan (desktop, tablet, mobile). Returns the desktop result ID; use checkion/scan_get to fetch full result.',
        inputSchema: z.object({
            url: z.string().describe('Page URL to scan'),
            projectId: z.string().optional().describe('Optional project ID to assign'),
        }),
    }, async (args) => {
        const { url, projectId } = args;
        const body = { url, standard: 'WCAG2AA', runners: ['axe', 'htmlcs'], projectId };
        const res = await base('/api/scan', { method: 'POST', body: JSON.stringify(body) });
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        const data = res;
        return { content: [{ type: 'text', text: toTextContent(data) }] };
    });
    server.registerTool('checkion/scan_get', {
        title: 'Get scan result',
        description: 'Fetch a single-page scan result by ID.',
        inputSchema: z.object({ id: z.string().describe('Scan result ID') }),
    }, async (args) => {
        const { id } = args;
        const res = await base(`/api/scan/${encodeURIComponent(id)}`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/scans_list', {
        title: 'List single-page scans',
        description: 'List single-page scans with optional project filter and pagination.',
        inputSchema: z.object({
            limit: z.number().min(1).max(100).optional().describe('Page size'),
            page: z.number().min(1).optional().describe('Page number'),
            projectId: z.string().optional().describe('Filter by project ID'),
        }),
    }, async (args) => {
        const { limit, page, projectId } = args;
        const params = new URLSearchParams();
        if (limit != null)
            params.set('limit', String(limit));
        if (page != null)
            params.set('page', String(page));
        if (projectId !== undefined)
            params.set('projectId', projectId ?? '');
        const q = params.toString();
        const res = await base(`/api/scan?${q}`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/scan_domain', {
        title: 'Start domain scan',
        description: 'Start an async domain (deep) scan. Returns scan ID; poll checkion/scan_domain_status or checkion/scan_domain_summary.',
        inputSchema: z.object({
            url: z.string().describe('Domain URL (e.g. https://example.com)'),
            useSitemap: z.boolean().optional().describe('Use sitemap if available'),
            maxPages: z.number().min(1).optional().describe('Max pages to scan'),
            projectId: z.string().optional(),
        }),
    }, async (args) => {
        const body = args;
        const res = await base('/api/scan/domain', { method: 'POST', body: JSON.stringify(body) });
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/scan_domain_status', {
        title: 'Domain scan status',
        description: 'Get status/progress of a domain scan.',
        inputSchema: z.object({ id: z.string().describe('Domain scan ID') }),
    }, async (args) => {
        const { id } = args;
        const res = await base(`/api/scan/domain/${encodeURIComponent(id)}/status`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/scan_domain_summary', {
        title: 'Domain scan summary',
        description: 'Get stored summary of a completed domain scan.',
        inputSchema: z.object({ id: z.string().describe('Domain scan ID') }),
    }, async (args) => {
        const { id } = args;
        const res = await base(`/api/scan/domain/${encodeURIComponent(id)}/summary`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/scans_domain_list', {
        title: 'List domain scans',
        description: 'List domain scans with optional project filter and pagination.',
        inputSchema: z.object({
            limit: z.number().min(1).max(100).optional(),
            page: z.number().min(1).optional(),
            projectId: z.string().optional(),
        }),
    }, async (args) => {
        const { limit, page, projectId } = args;
        const params = new URLSearchParams();
        if (limit != null)
            params.set('limit', String(limit));
        if (page != null)
            params.set('page', String(page));
        if (projectId !== undefined)
            params.set('projectId', projectId ?? '');
        const q = params.toString();
        const res = await base(`/api/scans/domain?${q}`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    // --- projects ---
    server.registerTool('checkion/projects_list', {
        title: 'List projects',
        description: 'List CHECKION projects for the authenticated user.',
        inputSchema: z.object({}),
    }, async () => {
        const res = await base('/api/projects');
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/project_get', {
        title: 'Get project',
        description: 'Get a single project by ID with counts.',
        inputSchema: z.object({ id: z.string().describe('Project ID') }),
    }, async (args) => {
        const { id } = args;
        const res = await base(`/api/projects/${encodeURIComponent(id)}`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/project_create', {
        title: 'Create project',
        description: 'Create a new CHECKION project.',
        inputSchema: z.object({
            name: z.string().describe('Project name'),
            domain: z.string().optional().describe('Optional domain'),
        }),
    }, async (args) => {
        const body = args;
        const res = await base('/api/projects', { method: 'POST', body: JSON.stringify(body) });
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    // --- micro-tools ---
    server.registerTool('checkion/tools_contrast', {
        title: 'Contrast check',
        description: 'Get WCAG contrast ratio between two hex colors.',
        inputSchema: z.object({
            f: z.string().describe('Foreground hex (e.g. 000000)'),
            b: z.string().describe('Background hex (e.g. ffffff)'),
        }),
    }, async (args) => {
        const { f, b } = args;
        const res = await base(`/api/tools/contrast?f=${encodeURIComponent(f)}&b=${encodeURIComponent(b)}`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    server.registerTool('checkion/tools_extract', {
        title: 'Extract content',
        description: 'Extract content from a URL by CSS selector.',
        inputSchema: z.object({
            url: z.string().describe('Page URL'),
            selector: z.string().describe('CSS selector (e.g. h1, .main)'),
        }),
    }, async (args) => {
        const { url, selector } = args;
        const res = await base(`/api/tools/extract?url=${encodeURIComponent(url)}&selector=${encodeURIComponent(selector)}`);
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
    // --- health ---
    server.registerTool('checkion/health', {
        title: 'Health check',
        description: 'Check CHECKION API health (optional; may require auth).',
        inputSchema: z.object({}),
    }, async () => {
        const res = await base('/api/health');
        if (isCheckionError(res))
            return { content: [{ type: 'text', text: JSON.stringify(res) }] };
        return { content: [{ type: 'text', text: toTextContent(res) }] };
    });
}
