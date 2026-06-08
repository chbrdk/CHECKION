/**
 * AUDION integration URLs (server-side only).
 */

export function getAudionApiBaseUrl(): string | null {
    const base = (process.env.AUDION_API_BASE_URL ?? '').trim();
    return base ? base.replace(/\/$/, '') : null;
}

export function getAudionServiceToken(): string | null {
    const token = (process.env.AUDION_SERVICE_TOKEN ?? '').trim();
    return token || null;
}

/** Booleans only — safe for /api/health (no secrets). */
export function getAudionIntegrationEnvSnapshot() {
    const apiBaseUrlSet = Boolean((process.env.AUDION_API_BASE_URL ?? '').trim());
    const serviceTokenSet = Boolean((process.env.AUDION_SERVICE_TOKEN ?? '').trim());
    const missing: Array<'AUDION_API_BASE_URL' | 'AUDION_SERVICE_TOKEN'> = [];
    if (!apiBaseUrlSet) missing.push('AUDION_API_BASE_URL');
    if (!serviceTokenSet) missing.push('AUDION_SERVICE_TOKEN');
    return {
        apiBaseUrlSet,
        serviceTokenSet,
        configured: apiBaseUrlSet && serviceTokenSet,
        missing,
        /** Hint when AUDION-side token name was set on CHECKION by mistake. */
        checkionInboundTokenSet: Boolean((process.env.CHECKION_INBOUND_SERVICE_TOKEN ?? '').trim()),
    };
}

export function isAudionIntegrationConfigured(): boolean {
    return getAudionIntegrationEnvSnapshot().configured;
}

export function audionAudienceReportPath(checkionProjectId: string, platformProjectId?: string | null): string {
    const base = `/integrations/checkion/projects/${encodeURIComponent(checkionProjectId)}/audience-report`;
    const ppid = (platformProjectId ?? '').trim();
    if (!ppid) return base;
    return `${base}?platform_project_id=${encodeURIComponent(ppid)}`;
}

export function audionAudienceReportUrl(
    checkionProjectId: string,
    platformProjectId?: string | null
): string | null {
    const apiBase = getAudionApiBaseUrl();
    if (!apiBase) return null;
    return `${apiBase}${audionAudienceReportPath(checkionProjectId, platformProjectId)}`;
}

export const AUDION_INTEGRATION_PATHS = {
    audionProjects: '/integrations/checkion/audion-projects',
    linkProject: (checkionProjectId: string) =>
        `/integrations/checkion/projects/${encodeURIComponent(checkionProjectId)}/link`,
} as const;

export function audionIntegrationUrl(path: string): string | null {
    const apiBase = getAudionApiBaseUrl();
    if (!apiBase) return null;
    return `${apiBase}${path}`;
}
