/**
 * CHECKION ↔ AUDION project linking (server-side, service token).
 */

import {
    AUDION_INTEGRATION_PATHS,
    audionIntegrationUrl,
    getAudionServiceToken,
} from '@/lib/paths/audion-api';

export interface AudionProjectLinkItem {
    id: string;
    name: string;
    checkionProjectId: string | null;
    platformProjectId: string | null;
}

async function audionServiceFetch(
    path: string,
    init?: RequestInit,
    timeoutMs = 25_000
): Promise<Response | null> {
    const url = audionIntegrationUrl(path);
    const token = getAudionServiceToken();
    if (!url || !token) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(init?.headers ?? {}),
            },
            signal: controller.signal,
            cache: 'no-store',
        });
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export async function listAudionProjectsForLink(): Promise<AudionProjectLinkItem[] | null> {
    const res = await audionServiceFetch(AUDION_INTEGRATION_PATHS.audionProjects);
    if (!res?.ok) return null;
    const data = (await res.json()) as { items?: AudionProjectLinkItem[] };
    return Array.isArray(data.items) ? data.items : [];
}

export async function linkCheckionProjectToAudion(
    checkionProjectId: string,
    audionProjectId: string
): Promise<{ ok: boolean; audionProjectName?: string; error?: string }> {
    const res = await audionServiceFetch(
        AUDION_INTEGRATION_PATHS.linkProject(checkionProjectId),
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audion_project_id: audionProjectId }),
        }
    );
    if (!res) return { ok: false, error: 'audion_unreachable' };
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        return { ok: false, error: body.detail ?? `audion_${res.status}` };
    }
    const data = (await res.json()) as { audionProjectName?: string };
    return { ok: true, audionProjectName: data.audionProjectName };
}
