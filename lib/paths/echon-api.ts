/**
 * ECHON integration URLs (server-side).
 * Central source — do not read ECHON_API_BASE_URL from env.
 * @see knowledge/checkion-echon-integration.md
 */

/** Nginx prefix → FastAPI `/api/v2/...` */
export const ECHON_API_BASE_URL = 'https://echon.projects-a.plygrnd.tech/echon' as const;

export const ECHON_DASHBOARD_URL = 'https://echon.projects-a.plygrnd.tech/echon/dashboard' as const;

export const ECHON_REPORT_RESEARCH_DEPTH = 'fast' as const;

export const ECHON_REPORT_RESEARCH_TIMEOUT_MS = 300_000;

export function getEchonApiBaseUrl(): string {
    return ECHON_API_BASE_URL.replace(/\/$/, '');
}

export function getEchonServiceToken(): string | null {
    const token = (process.env.ECHON_SERVICE_TOKEN ?? '').trim();
    return token || null;
}

export function getEchonIntegrationEnvSnapshot() {
    const serviceTokenSet = Boolean((process.env.ECHON_SERVICE_TOKEN ?? '').trim());
    return {
        apiBaseUrl: ECHON_API_BASE_URL,
        apiBaseUrlSet: true,
        serviceTokenSet,
        configured: true,
        missing: serviceTokenSet ? ([] as const) : ([] as const),
        researchDepth: ECHON_REPORT_RESEARCH_DEPTH,
        researchTimeoutMs: ECHON_REPORT_RESEARCH_TIMEOUT_MS,
    };
}

export function isEchonIntegrationConfigured(): boolean {
    return true;
}

/** POST /api/v2/research/chat — sync research run for report pipeline */
export function echonResearchChatPath(): string {
    return '/api/v2/research/chat';
}

export type EchonReportResearchDepth = 'fast' | 'balanced' | 'deep';

export function getEchonReportResearchDepth(): EchonReportResearchDepth {
    return ECHON_REPORT_RESEARCH_DEPTH;
}

export function getEchonReportResearchTimeoutMs(): number {
    return ECHON_REPORT_RESEARCH_TIMEOUT_MS;
}

/** GET /api/v2/research/threads/{threadId} */
export function echonResearchThreadPath(threadId: string): string {
    return `/api/v2/research/threads/${encodeURIComponent(threadId)}`;
}

export function echonResearchThreadUrl(threadId: string): string {
    return `${getEchonApiBaseUrl()}${echonResearchThreadPath(threadId)}`;
}

export const ECHON_INTEGRATION_PATHS = {
    researchThreads: '/api/v2/research/threads',
    researchThread: (threadId: string) => echonResearchThreadPath(threadId),
    researchChat: echonResearchChatPath(),
} as const;

export function echonIntegrationUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${getEchonApiBaseUrl()}${normalized}`;
}
