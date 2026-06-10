/**
 * ECHON integration URLs (server-side only).
 * ECHON has no project model — CHECKION pins a research thread id per project.
 *
 * Deploy URL (knowledge): https://echon.projects-a.plygrnd.tech/echon/dashboard
 * API base example: https://echon.projects-a.plygrnd.tech/echon
 */

export function getEchonApiBaseUrl(): string | null {
    const base = (process.env.ECHON_API_BASE_URL ?? '').trim();
    return base ? base.replace(/\/$/, '') : null;
}

export function getEchonServiceToken(): string | null {
    const token = (process.env.ECHON_SERVICE_TOKEN ?? '').trim();
    return token || null;
}

export function getEchonIntegrationEnvSnapshot() {
    const apiBaseUrlSet = Boolean((process.env.ECHON_API_BASE_URL ?? '').trim());
    const serviceTokenSet = Boolean((process.env.ECHON_SERVICE_TOKEN ?? '').trim());
    const missing: Array<'ECHON_API_BASE_URL' | 'ECHON_SERVICE_TOKEN'> = [];
    if (!apiBaseUrlSet) missing.push('ECHON_API_BASE_URL');
    if (!serviceTokenSet) missing.push('ECHON_SERVICE_TOKEN');
    return {
        apiBaseUrlSet,
        serviceTokenSet,
        configured: apiBaseUrlSet,
        missing,
    };
}

export function isEchonIntegrationConfigured(): boolean {
    return getEchonIntegrationEnvSnapshot().configured;
}

/** POST /api/v2/research/chat — sync research run for report pipeline */
export function echonResearchChatPath(): string {
    return '/api/v2/research/chat';
}

export type EchonReportResearchDepth = 'fast' | 'balanced' | 'deep';

export function getEchonReportResearchDepth(): EchonReportResearchDepth {
    const raw = (process.env.ECHON_REPORT_RESEARCH_DEPTH ?? 'fast').trim().toLowerCase();
    if (raw === 'balanced' || raw === 'deep') return raw;
    return 'fast';
}

export function getEchonReportResearchTimeoutMs(): number {
    const raw = Number(process.env.ECHON_REPORT_RESEARCH_TIMEOUT_MS ?? 300_000);
    return Number.isFinite(raw) && raw >= 30_000 ? raw : 300_000;
}

/** GET /api/v2/research/threads/{threadId} */
export function echonResearchThreadPath(threadId: string): string {
    return `/api/v2/research/threads/${encodeURIComponent(threadId)}`;
}

export function echonResearchThreadUrl(threadId: string): string | null {
    const apiBase = getEchonApiBaseUrl();
    if (!apiBase) return null;
    return `${apiBase}${echonResearchThreadPath(threadId)}`;
}

export const ECHON_INTEGRATION_PATHS = {
    researchThreads: '/api/v2/research/threads',
    researchThread: (threadId: string) => echonResearchThreadPath(threadId),
} as const;

export function echonIntegrationUrl(path: string): string | null {
    const apiBase = getEchonApiBaseUrl();
    if (!apiBase) return null;
    return `${apiBase}${path}`;
}
