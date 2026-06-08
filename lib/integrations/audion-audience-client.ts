/**
 * Fetch audience context from AUDION (linked via checkion_project_id or platform_project_id).
 */

import { audionAudienceReportUrl, getAudionServiceToken } from '@/lib/paths/audion-api';

export interface AudionUxJourneyRunFact {
    id: string;
    jobId: string;
    task: string | null;
    siteUrl: string | null;
    success: boolean | null;
    stepsCount: number | null;
    createdAt: string | null;
}

export interface AudionPersonaFact {
    id: string;
    name: string;
    headline: string;
    segment: string;
    targetGroupId: string | null;
    targetGroupName: string | null;
    painPoints: string[];
    goals: string[];
    interests: string[];
    latestUxJourney: AudionUxJourneyRunFact | null;
}

export interface AudionTargetGroupFact {
    id: string;
    name: string;
    segment: string;
    description: string | null;
    personaCount: number;
}

export interface AudionAudienceReportResponse {
    available: boolean;
    reason?: string;
    resolvedVia?: 'checkion_project_id' | 'platform_project_id';
    audionProjectId?: string;
    audionProjectName?: string;
    checkionProjectId?: string;
    targetGroups?: AudionTargetGroupFact[];
    personas?: AudionPersonaFact[];
}

export async function fetchAudionAudienceReport(
    checkionProjectId: string,
    options?: { platformProjectId?: string | null; timeoutMs?: number }
): Promise<AudionAudienceReportResponse | null> {
    const url = audionAudienceReportUrl(checkionProjectId, options?.platformProjectId);
    const token = getAudionServiceToken();
    if (!url || !token) return null;

    const timeoutMs = options?.timeoutMs ?? 25_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
            cache: 'no-store',
        });
        if (!res.ok) return null;
        return (await res.json()) as AudionAudienceReportResponse;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}
