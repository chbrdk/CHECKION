/**
 * CHECKION ↔ AUDION project linking (server-side, service token).
 */

import { AUDION_INTEGRATION_PATHS } from '@/lib/paths/audion-api';
import { audionServiceFetchJson } from '@/lib/integrations/audion-service-fetch';

export interface AudionProjectLinkItem {
    id: string;
    name: string;
    checkionProjectId: string | null;
    platformProjectId: string | null;
}

export async function listAudionProjectsForLink(): Promise<AudionProjectLinkItem[] | null> {
    const res = await audionServiceFetchJson<{ items?: AudionProjectLinkItem[] }>(
        AUDION_INTEGRATION_PATHS.audionProjects
    );
    if (!res.ok) return null;
    return Array.isArray(res.data.items) ? res.data.items : [];
}

export async function linkCheckionProjectToAudion(
    checkionProjectId: string,
    audionProjectId: string
): Promise<{ ok: boolean; audionProjectName?: string; error?: string }> {
    const res = await audionServiceFetchJson<{ audionProjectName?: string }>(
        AUDION_INTEGRATION_PATHS.linkProject(checkionProjectId),
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audion_project_id: audionProjectId }),
        }
    );
    if (!res.ok) {
        return { ok: false, error: res.detail ?? res.reason };
    }
    return { ok: true, audionProjectName: res.data.audionProjectName };
}
