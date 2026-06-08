/**
 * Shared server-side fetch to AUDION integration endpoints (service token).
 */

import {
    audionIntegrationUrl,
    getAudionServiceToken,
} from '@/lib/paths/audion-api';

export type AudionServiceFetchResult<T> =
    | { ok: true; status: number; data: T }
    | { ok: false; status: number | null; reason: string; detail?: string };

export function mapAudionHttpFailure(status: number | null, detail?: string): string {
    if (status === 401) return 'audion_http_401';
    if (status === 403) return 'audion_http_403';
    if (status === 404) return 'audion_endpoint_not_found';
    if (status === 502) return 'audion_http_502';
    if (status === 503) {
        if (detail?.toLowerCase().includes('checkion inbound')) {
            return 'audion_inbound_not_configured';
        }
        return 'audion_http_503';
    }
    if (status === 405) return 'audion_http_405';
    if (status === 500) return 'audion_http_500';
    return 'audion_fetch_failed';
}

export async function audionServiceFetchJson<T>(
    path: string,
    init?: RequestInit,
    timeoutMs = 25_000
): Promise<AudionServiceFetchResult<T>> {
    const url = audionIntegrationUrl(path);
    const token = getAudionServiceToken();
    if (!url || !token) {
        return { ok: false, status: null, reason: 'audion_not_configured' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(init?.headers ?? {}),
            },
            signal: controller.signal,
            cache: 'no-store',
        });

        const contentType = res.headers.get('content-type') ?? '';
        const isJson = contentType.includes('application/json');
        const body = isJson ? ((await res.json()) as Record<string, unknown>) : null;
        const detail =
            typeof body?.detail === 'string'
                ? body.detail
                : typeof body?.message === 'string'
                  ? body.message
                  : undefined;

        if (!res.ok) {
            return {
                ok: false,
                status: res.status,
                reason: mapAudionHttpFailure(res.status, detail),
                detail,
            };
        }

        return { ok: true, status: res.status, data: body as T };
    } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError';
        return {
            ok: false,
            status: null,
            reason: aborted ? 'audion_timeout' : 'audion_fetch_failed',
            detail: err instanceof Error ? err.message : undefined,
        };
    } finally {
        clearTimeout(timer);
    }
}
