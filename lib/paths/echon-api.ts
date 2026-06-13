/**
 * ECHON integration URLs (server-side).
 * Central source — do not read ECHON_API_BASE_URL from env.
 * @see knowledge/checkion-echon-integration.md
 */

/** Nginx prefix → FastAPI `/api/v2/...` */
export const ECHON_API_BASE_URL = 'https://echon.projects-a.plygrnd.tech/echon' as const;

export const ECHON_DASHBOARD_URL = 'https://echon.projects-a.plygrnd.tech/echon/dashboard' as const;

export const ECHON_REPORT_RESEARCH_DEPTH = 'fast' as const;

/** Max wait for one ECHON research run (poll + background stream). Retrieval can take 15–30 min. */
export const ECHON_REPORT_RESEARCH_TIMEOUT_MS = 1_800_000;

/** Interval between GET /threads/{id} polls while research runs. */
export const ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS = 10_000;

/** Per-poll request timeout (short — many retries within total budget). */
export const ECHON_REPORT_RESEARCH_POLL_REQUEST_TIMEOUT_MS = 45_000;

/** Timeout for POST /threads (create) and other kickoff calls. */
export const ECHON_REPORT_RESEARCH_START_REQUEST_TIMEOUT_MS = 60_000;

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
        researchPollIntervalMs: ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS,
        researchPollRequestTimeoutMs: ECHON_REPORT_RESEARCH_POLL_REQUEST_TIMEOUT_MS,
    };
}

export function isEchonIntegrationConfigured(): boolean {
    return true;
}

/** POST /api/v2/research/chat — legacy sync research (ECHON dashboard fallback) */
export function echonResearchChatPath(): string {
    return '/api/v2/research/chat';
}

/** POST /api/v2/research/stream — multi-stage research agent (NDJSON, dashboard UI) */
export function echonResearchStreamPath(): string {
    return '/api/v2/research/stream';
}

/** POST /api/v2/research/runs — async enqueue (returns 202, poll thread — CHECKION reports) */
export function echonResearchRunsPath(): string {
    return '/api/v2/research/runs';
}

export function echonResearchRunStatusPath(runId: string): string {
    return `/api/v2/research/runs/${encodeURIComponent(runId)}`;
}

export type EchonReportResearchDepth = 'fast' | 'balanced' | 'deep';

export function getEchonReportResearchDepth(): EchonReportResearchDepth {
    return ECHON_REPORT_RESEARCH_DEPTH;
}

export function getEchonReportResearchTimeoutMs(): number {
    return ECHON_REPORT_RESEARCH_TIMEOUT_MS;
}

export function getEchonReportResearchPollIntervalMs(): number {
    return ECHON_REPORT_RESEARCH_POLL_INTERVAL_MS;
}

export function getEchonReportResearchPollRequestTimeoutMs(): number {
    return ECHON_REPORT_RESEARCH_POLL_REQUEST_TIMEOUT_MS;
}

export function getEchonReportResearchStartRequestTimeoutMs(): number {
    return ECHON_REPORT_RESEARCH_START_REQUEST_TIMEOUT_MS;
}

/** POST /api/v2/research/threads — create empty thread (fast). */
export function echonResearchThreadsPath(): string {
    return '/api/v2/research/threads';
}

/** POST /api/v2/research/threads/{threadId}/messages — run research on thread. */
export function echonResearchThreadMessagesPath(threadId: string): string {
    return `/api/v2/research/threads/${encodeURIComponent(threadId)}/messages`;
}

/** GET /api/v2/research/threads/{threadId} */
export function echonResearchThreadPath(threadId: string): string {
    return `/api/v2/research/threads/${encodeURIComponent(threadId)}`;
}

export function echonResearchThreadUrl(threadId: string): string {
    return `${getEchonApiBaseUrl()}${echonResearchThreadPath(threadId)}`;
}

export const ECHON_INTEGRATION_PATHS = {
    researchThreads: echonResearchThreadsPath(),
    researchThread: (threadId: string) => echonResearchThreadPath(threadId),
    researchThreadMessages: (threadId: string) => echonResearchThreadMessagesPath(threadId),
    researchChat: echonResearchChatPath(),
    researchStream: echonResearchStreamPath(),
} as const;

export function echonIntegrationUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${getEchonApiBaseUrl()}${normalized}`;
}
