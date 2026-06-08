/**
 * Fetch audience context from AUDION (linked via checkion_project_id or platform_project_id).
 */

import { audionAudienceReportPath } from '@/lib/paths/audion-api';
import { audionServiceFetchJson } from '@/lib/integrations/audion-service-fetch';

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
): Promise<AudionAudienceReportResponse> {
    const path = audionAudienceReportPath(checkionProjectId, options?.platformProjectId);
    const res = await audionServiceFetchJson<AudionAudienceReportResponse>(
        path,
        undefined,
        options?.timeoutMs ?? 25_000
    );

    if (!res.ok) {
        return { available: false, reason: res.reason };
    }

    return res.data;
}
