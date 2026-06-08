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

export function audionAudienceReportPath(checkionProjectId: string): string {
    return `/integrations/checkion/projects/${encodeURIComponent(checkionProjectId)}/audience-report`;
}

export function audionAudienceReportUrl(checkionProjectId: string): string | null {
    const base = getAudionApiBaseUrl();
    if (!base) return null;
    return `${base}${audionAudienceReportPath(checkionProjectId)}`;
}
