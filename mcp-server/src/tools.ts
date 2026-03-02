/**
 * CHECKION MCP tools: proxy to CHECKION API with Bearer token.
 */
import { z } from 'zod';
import { checkionFetch, isCheckionError } from './checkion-client.js';

function toTextContent(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function registerCheckionTools(server: { registerTool: (name: string, config: { title?: string; description?: string; inputSchema?: z.ZodTypeAny }, cb: (args: unknown) => Promise<{ content: Array<{ type: 'text'; text: string }> }>) => void }) {
  const base = (path: string, options?: RequestInit) => checkionFetch(path, options);

  // --- scan ---
  server.registerTool(
    'checkion/scan_single',
    {
      title: 'Start single-page scan',
      description: 'Start a single-page accessibility scan (desktop, tablet, mobile). Returns the desktop result ID; use checkion/scan_get to fetch full result.',
      inputSchema: z.object({
        url: z.string().describe('Page URL to scan'),
        projectId: z.string().optional().describe('Optional project ID to assign'),
      }),
    },
    async (args) => {
      const { url, projectId } = args as { url: string; projectId?: string };
      const body = { url, standard: 'WCAG2AA', runners: ['axe', 'htmlcs'], projectId };
      const res = await base('/api/scan', { method: 'POST', body: JSON.stringify(body) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      const data = res as { data?: { id?: string }; success?: boolean };
      return { content: [{ type: 'text', text: toTextContent(data) }] };
    }
  );

  server.registerTool(
    'checkion/scan_get',
    {
      title: 'Get scan result',
      description: 'Fetch a single-page scan result by ID.',
      inputSchema: z.object({ id: z.string().describe('Scan result ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/scan/${encodeURIComponent(id)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scans_list',
    {
      title: 'List single-page scans',
      description: 'List single-page scans with optional project filter and pagination.',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).optional().describe('Page size'),
        page: z.number().min(1).optional().describe('Page number'),
        projectId: z.string().optional().describe('Filter by project ID'),
      }),
    },
    async (args) => {
      const { limit, page, projectId } = args as { limit?: number; page?: number; projectId?: string };
      const params = new URLSearchParams();
      if (limit != null) params.set('limit', String(limit));
      if (page != null) params.set('page', String(page));
      if (projectId !== undefined) params.set('projectId', projectId ?? '');
      const q = params.toString();
      const res = await base(`/api/scan?${q}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_domain',
    {
      title: 'Start domain scan',
      description: 'Start an async domain (deep) scan. Returns scan ID; poll checkion/scan_domain_status or checkion/scan_domain_summary.',
      inputSchema: z.object({
        url: z.string().describe('Domain URL (e.g. https://example.com)'),
        useSitemap: z.boolean().optional().describe('Use sitemap if available'),
        maxPages: z.number().min(1).optional().describe('Max pages to scan'),
        projectId: z.string().optional(),
      }),
    },
    async (args) => {
      const body = args as Record<string, unknown>;
      const res = await base('/api/scan/domain', { method: 'POST', body: JSON.stringify(body) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_domain_status',
    {
      title: 'Domain scan status',
      description: 'Get status/progress of a domain scan.',
      inputSchema: z.object({ id: z.string().describe('Domain scan ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/scan/domain/${encodeURIComponent(id)}/status`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_domain_summary',
    {
      title: 'Domain scan summary',
      description: 'Get stored summary of a completed domain scan.',
      inputSchema: z.object({ id: z.string().describe('Domain scan ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/scan/domain/${encodeURIComponent(id)}/summary`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scans_domain_list',
    {
      title: 'List domain scans',
      description: 'List domain scans with optional project filter and pagination.',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).optional(),
        page: z.number().min(1).optional(),
        projectId: z.string().optional(),
      }),
    },
    async (args) => {
      const { limit, page, projectId } = args as { limit?: number; page?: number; projectId?: string };
      const params = new URLSearchParams();
      if (limit != null) params.set('limit', String(limit));
      if (page != null) params.set('page', String(page));
      if (projectId !== undefined) params.set('projectId', projectId ?? '');
      const q = params.toString();
      const res = await base(`/api/scans/domain?${q}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_delete',
    {
      title: 'Delete single-page scan',
      description: 'Delete a single-page scan by ID.',
      inputSchema: z.object({ id: z.string().describe('Scan result ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/scans/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_domain_delete',
    {
      title: 'Delete domain scan',
      description: 'Delete a domain scan by ID.',
      inputSchema: z.object({ id: z.string().describe('Domain scan ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/scans/domain/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- journey agent (runs) ---
  server.registerTool(
    'checkion/scan_journey_start',
    {
      title: 'Start journey-agent run',
      description: 'Start a UX journey-agent run (URL + natural language task). Returns jobId; poll with checkion/scan_journey_get.',
      inputSchema: z.object({
        url: z.string().describe('Page URL to start from'),
        task: z.string().min(1).describe('Natural language task (e.g. "Find the contact form")'),
        projectId: z.string().optional().describe('Optional project ID to assign'),
      }),
    },
    async (args) => {
      const { url, task, projectId } = args as { url: string; task: string; projectId?: string };
      const body: Record<string, unknown> = { url, task };
      if (projectId !== undefined) body.projectId = projectId;
      const res = await base('/api/scan/journey-agent', { method: 'POST', body: JSON.stringify(body) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_journey_get',
    {
      title: 'Get journey-agent run result',
      description: 'Get a journey-agent run result by job ID.',
      inputSchema: z.object({ jobId: z.string().describe('Journey job ID') }),
    },
    async (args) => {
      const { jobId } = args as { jobId: string };
      const res = await base(`/api/scan/journey-agent/${encodeURIComponent(jobId)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_journey_history',
    {
      title: 'List journey-agent runs',
      description: 'List journey-agent runs with optional project filter and limit.',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).optional(),
        projectId: z.string().optional(),
      }),
    },
    async (args) => {
      const { limit, projectId } = args as { limit?: number; projectId?: string };
      const params = new URLSearchParams();
      if (limit != null) params.set('limit', String(limit));
      if (projectId !== undefined) params.set('projectId', projectId ?? '');
      const q = params.toString();
      const res = await base(`/api/scan/journey-agent/history${q ? `?${q}` : ''}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- projects ---
  server.registerTool(
    'checkion/projects_list',
    {
      title: 'List projects',
      description: 'List CHECKION projects for the authenticated user.',
      inputSchema: z.object({}),
    },
    async () => {
      const res = await base('/api/projects');
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/project_get',
    {
      title: 'Get project',
      description: 'Get a single project by ID with counts.',
      inputSchema: z.object({ id: z.string().describe('Project ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/projects/${encodeURIComponent(id)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/project_create',
    {
      title: 'Create project',
      description: 'Create a new CHECKION project.',
      inputSchema: z.object({
        name: z.string().describe('Project name'),
        domain: z.string().optional().describe('Optional domain'),
      }),
    },
    async (args) => {
      const body = args as { name: string; domain?: string };
      const res = await base('/api/projects', { method: 'POST', body: JSON.stringify(body) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- micro-tools ---
  server.registerTool(
    'checkion/tools_contrast',
    {
      title: 'Contrast check',
      description: 'Get WCAG contrast ratio between two hex colors.',
      inputSchema: z.object({
        f: z.string().describe('Foreground hex (e.g. 000000)'),
        b: z.string().describe('Background hex (e.g. ffffff)'),
      }),
    },
    async (args) => {
      const { f, b } = args as { f: string; b: string };
      const res = await base(`/api/tools/contrast?f=${encodeURIComponent(f)}&b=${encodeURIComponent(b)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/tools_extract',
    {
      title: 'Extract content',
      description: 'Extract content from a URL by CSS selector.',
      inputSchema: z.object({
        url: z.string().describe('Page URL'),
        selector: z.string().describe('CSS selector (e.g. h1, .main)'),
      }),
    },
    async (args) => {
      const { url, selector } = args as { url: string; selector: string };
      const res = await base(`/api/tools/extract?url=${encodeURIComponent(url)}&selector=${encodeURIComponent(selector)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/tools_ssl',
    {
      title: 'SSL Labs check',
      description: 'Run SSL Labs check for a host (grade, endpoints).',
      inputSchema: z.object({ host: z.string().describe('Hostname (e.g. example.com)') }),
    },
    async (args) => {
      const { host } = args as { host: string };
      const res = await base(`/api/tools/ssl-labs?host=${encodeURIComponent(host)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/tools_pagespeed',
    {
      title: 'PageSpeed check',
      description: 'Run PageSpeed Insights for a URL (performance, accessibility, SEO).',
      inputSchema: z.object({ url: z.string().describe('Page URL') }),
    },
    async (args) => {
      const { url } = args as { url: string };
      const res = await base(`/api/tools/pagespeed?url=${encodeURIComponent(url)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/tools_wayback',
    {
      title: 'Wayback check',
      description: 'Check Wayback Machine availability for a URL.',
      inputSchema: z.object({ url: z.string().describe('Page URL') }),
    },
    async (args) => {
      const { url } = args as { url: string };
      const res = await base(`/api/tools/wayback?url=${encodeURIComponent(url)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/tools_readability',
    {
      title: 'Readability check',
      description: 'Get readability score for a text (Flesch-Kincaid grade).',
      inputSchema: z.object({ text: z.string().describe('Text to analyze') }),
    },
    async (args) => {
      const { text } = args as { text: string };
      const res = await base('/api/tools/readability', { method: 'POST', body: JSON.stringify({ text }) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- projects: update, delete ---
  server.registerTool(
    'checkion/project_update',
    {
      title: 'Update project',
      description: 'Update a project (name, domain).',
      inputSchema: z.object({
        id: z.string().describe('Project ID'),
        name: z.string().optional().describe('Project name'),
        domain: z.string().nullable().optional().describe('Domain'),
      }),
    },
    async (args) => {
      const { id, name, domain } = args as { id: string; name?: string; domain?: string | null };
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (domain !== undefined) body.domain = domain;
      const res = await base(`/api/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/project_delete',
    {
      title: 'Delete project',
      description: 'Delete a project by ID.',
      inputSchema: z.object({ id: z.string().describe('Project ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- assign to project ---
  server.registerTool(
    'checkion/scan_assign_project',
    {
      title: 'Assign single scan to project',
      description: 'Assign or unassign a single-page scan to a project.',
      inputSchema: z.object({
        scanId: z.string().describe('Scan result ID'),
        projectId: z.string().nullable().describe('Project ID or null to unassign'),
      }),
    },
    async (args) => {
      const { scanId, projectId } = args as { scanId: string; projectId: string | null };
      const res = await base(`/api/scan/${encodeURIComponent(scanId)}/project`, { method: 'PATCH', body: JSON.stringify({ projectId }) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_domain_assign_project',
    {
      title: 'Assign domain scan to project',
      description: 'Assign or unassign a domain scan to a project.',
      inputSchema: z.object({
        domainScanId: z.string().describe('Domain scan ID'),
        projectId: z.string().nullable().describe('Project ID or null to unassign'),
      }),
    },
    async (args) => {
      const { domainScanId, projectId } = args as { domainScanId: string; projectId: string | null };
      const res = await base(`/api/scans/domain/${encodeURIComponent(domainScanId)}/project`, { method: 'PATCH', body: JSON.stringify({ projectId }) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_journey_assign_project',
    {
      title: 'Assign journey run to project',
      description: 'Assign or unassign a journey-agent run to a project.',
      inputSchema: z.object({
        jobId: z.string().describe('Journey job ID'),
        projectId: z.string().nullable().describe('Project ID or null to unassign'),
      }),
    },
    async (args) => {
      const { jobId, projectId } = args as { jobId: string; projectId: string | null };
      const res = await base(`/api/scan/journey-agent/${encodeURIComponent(jobId)}/project`, { method: 'PATCH', body: JSON.stringify({ projectId }) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/scan_geo_eeat_assign_project',
    {
      title: 'Assign GEO/E-E-A-T run to project',
      description: 'Assign or unassign a GEO/E-E-A-T run to a project.',
      inputSchema: z.object({
        jobId: z.string().describe('GEO/E-E-A-T job ID'),
        projectId: z.string().nullable().describe('Project ID or null to unassign'),
      }),
    },
    async (args) => {
      const { jobId, projectId } = args as { jobId: string; projectId: string | null };
      const res = await base(`/api/scan/geo-eeat/${encodeURIComponent(jobId)}/project`, { method: 'PATCH', body: JSON.stringify({ projectId }) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- journeys (saved) ---
  server.registerTool(
    'checkion/journeys_list',
    {
      title: 'List saved journeys',
      description: 'List saved journey runs with optional pagination.',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).optional(),
        page: z.number().min(1).optional(),
      }),
    },
    async (args) => {
      const { limit, page } = args as { limit?: number; page?: number };
      const params = new URLSearchParams();
      if (limit != null) params.set('limit', String(limit));
      if (page != null) params.set('page', String(page));
      const q = params.toString();
      const res = await base(`/api/journeys${q ? `?${q}` : ''}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/journey_get',
    {
      title: 'Get saved journey',
      description: 'Get a saved journey by ID.',
      inputSchema: z.object({ id: z.string().describe('Journey ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/journeys/${encodeURIComponent(id)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/journey_delete',
    {
      title: 'Delete saved journey',
      description: 'Delete a saved journey by ID.',
      inputSchema: z.object({ id: z.string().describe('Journey ID') }),
    },
    async (args) => {
      const { id } = args as { id: string };
      const res = await base(`/api/journeys/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- GEO / E-E-A-T ---
  server.registerTool(
    'checkion/geo_eeat_start',
    {
      title: 'Start GEO/E-E-A-T scan',
      description: 'Start a GEO/E-E-A-T intensive scan (technical + LLM stages). Optionally run competitive benchmark with competitors and queries. Returns jobId.',
      inputSchema: z.object({
        url: z.string().describe('Page URL to analyze'),
        projectId: z.string().optional().describe('Optional project ID'),
        domainScanId: z.string().optional().describe('Optional domain scan ID'),
        runCompetitive: z.boolean().optional().describe('Run competitive benchmark (requires competitors and/or queries)'),
        competitors: z.array(z.string()).optional().describe('Competitor domains for benchmark'),
        queries: z.array(z.string()).optional().describe('LLM search queries for benchmark'),
      }),
    },
    async (args) => {
      const body = args as Record<string, unknown>;
      const res = await base('/api/scan/geo-eeat', { method: 'POST', body: JSON.stringify(body) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/geo_eeat_status',
    {
      title: 'GEO/E-E-A-T job status',
      description: 'Get status of a GEO/E-E-A-T run (e.g. for polling).',
      inputSchema: z.object({ jobId: z.string().describe('GEO/E-E-A-T job ID') }),
    },
    async (args) => {
      const { jobId } = args as { jobId: string };
      const res = await base(`/api/scan/geo-eeat/${encodeURIComponent(jobId)}/status`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/geo_eeat_suggest_queries',
    {
      title: 'Suggest competitors and queries',
      description: 'AI-suggest ~5 competitors and ~10 LLM search queries for a URL.',
      inputSchema: z.object({ url: z.string().describe('Company or site URL') }),
    },
    async (args) => {
      const { url } = args as { url: string };
      const res = await base('/api/scan/geo-eeat/suggest-competitors-queries', { method: 'POST', body: JSON.stringify({ url }) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/geo_eeat_history',
    {
      title: 'GEO/E-E-A-T history',
      description: 'List GEO/E-E-A-T runs with optional filters.',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).optional(),
        projectId: z.string().optional(),
      }),
    },
    async (args) => {
      const { limit, projectId } = args as { limit?: number; projectId?: string };
      const params = new URLSearchParams();
      if (limit != null) params.set('limit', String(limit));
      if (projectId !== undefined) params.set('projectId', projectId ?? '');
      const q = params.toString();
      const res = await base(`/api/scan/geo-eeat/history${q ? `?${q}` : ''}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/geo_eeat_get',
    {
      title: 'Get GEO/E-E-A-T run',
      description: 'Get a GEO/E-E-A-T run result by job ID.',
      inputSchema: z.object({ jobId: z.string().describe('Job ID') }),
    },
    async (args) => {
      const { jobId } = args as { jobId: string };
      const res = await base(`/api/scan/geo-eeat/${encodeURIComponent(jobId)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/geo_eeat_rerun_competitive',
    {
      title: 'Rerun competitive benchmark',
      description: 'Re-run only the competitive benchmark for an existing GEO/E-E-A-T job.',
      inputSchema: z.object({ jobId: z.string().describe('GEO/E-E-A-T job ID') }),
    },
    async (args) => {
      const { jobId } = args as { jobId: string };
      const res = await base(`/api/scan/geo-eeat/${encodeURIComponent(jobId)}/rerun-competitive`, { method: 'POST' });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/geo_eeat_competitive_history',
    {
      title: 'List competitive benchmark runs',
      description: 'List competitive benchmark runs for a GEO/E-E-A-T job.',
      inputSchema: z.object({
        jobId: z.string().describe('GEO/E-E-A-T job ID'),
        limit: z.number().min(1).max(100).optional().describe('Max number of runs to return'),
      }),
    },
    async (args) => {
      const { jobId, limit } = args as { jobId: string; limit?: number };
      const params = new URLSearchParams();
      if (limit != null) params.set('limit', String(limit));
      const q = params.toString();
      const res = await base(`/api/scan/geo-eeat/${encodeURIComponent(jobId)}/competitive-history${q ? `?${q}` : ''}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/geo_eeat_competitive_run_get',
    {
      title: 'Get competitive benchmark run',
      description: 'Get a specific competitive benchmark run by jobId and runId.',
      inputSchema: z.object({
        jobId: z.string().describe('GEO/E-E-A-T job ID'),
        runId: z.string().describe('Competitive run ID'),
      }),
    },
    async (args) => {
      const { jobId, runId } = args as { jobId: string; runId: string };
      const res = await base(`/api/scan/geo-eeat/${encodeURIComponent(jobId)}/competitive-history/${encodeURIComponent(runId)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- search ---
  server.registerTool(
    'checkion/search',
    {
      title: 'Search scans',
      description: 'Search across single and domain scans (dashboard search).',
      inputSchema: z.object({
        q: z.string().describe('Search query'),
        limit: z.number().min(1).max(100).optional(),
      }),
    },
    async (args) => {
      const { q, limit } = args as { q: string; limit?: number };
      const params = new URLSearchParams({ q });
      if (limit != null) params.set('limit', String(limit));
      const res = await base(`/api/search?${params.toString()}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- share ---
  server.registerTool(
    'checkion/share_by_resource',
    {
      title: 'Get share link by resource',
      description: 'Get existing share link for a resource (single scan, domain scan, journey, or GEO/E-E-A-T run). Returns token, url, hasPassword, createdAt or null.',
      inputSchema: z.object({
        type: z.enum(['single', 'domain', 'journey', 'geo_eeat']).describe('Resource type'),
        id: z.string().describe('Resource ID (scan id, domain scan id, journey id, or geo job id)'),
      }),
    },
    async (args) => {
      const { type, id } = args as { type: 'single' | 'domain' | 'journey' | 'geo_eeat'; id: string };
      const res = await base(`/api/share/by-resource?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/share_create',
    {
      title: 'Create share link',
      description: 'Create a share link for a single scan, domain scan, journey, or GEO/E-E-A-T run.',
      inputSchema: z.object({
        type: z.enum(['single', 'domain', 'journey', 'geo_eeat']).describe('Resource type'),
        id: z.string().describe('Resource ID'),
        password: z.string().optional().describe('Optional password protection'),
      }),
    },
    async (args) => {
      const body = args as { type: 'single' | 'domain' | 'journey' | 'geo_eeat'; id: string; password?: string };
      const res = await base('/api/share', { method: 'POST', body: JSON.stringify(body) });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/share_get',
    {
      title: 'Get share link',
      description: 'Get share link metadata by token.',
      inputSchema: z.object({ token: z.string().describe('Share token') }),
    },
    async (args) => {
      const { token } = args as { token: string };
      const res = await base(`/api/share/${encodeURIComponent(token)}`);
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  server.registerTool(
    'checkion/share_revoke',
    {
      title: 'Revoke share link',
      description: 'Revoke a share link by token (auth required, must own share).',
      inputSchema: z.object({ token: z.string().describe('Share token') }),
    },
    async (args) => {
      const { token } = args as { token: string };
      const res = await base(`/api/share/${encodeURIComponent(token)}`, { method: 'DELETE' });
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- user ---
  server.registerTool(
    'checkion/user_profile',
    {
      title: 'Get user profile',
      description: 'Get the authenticated user profile (read-only).',
      inputSchema: z.object({}),
    },
    async () => {
      const res = await base('/api/auth/profile');
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );

  // --- health ---
  server.registerTool(
    'checkion/health',
    {
      title: 'Health check',
      description: 'Check CHECKION API health (optional; may require auth).',
      inputSchema: z.object({}),
    },
    async () => {
      const res = await base('/api/health');
      if (isCheckionError(res)) return { content: [{ type: 'text' as const, text: JSON.stringify(res) }] };
      return { content: [{ type: 'text', text: toTextContent(res) }] };
    }
  );
}
