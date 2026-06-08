/**
 * Collect AUDION audience data and align with CHECKION report facts.
 */

import { getProjectPlatformIds } from '@/lib/db/projects';
import { fetchAudionAudienceReport } from '@/lib/integrations/audion-audience-client';
import type { AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import {
    buildAudienceReportOverlay,
    unavailableAudienceOverlay,
} from '@/lib/project-report/audience-alignment';
import { getAudionApiBaseUrl, getAudionServiceToken } from '@/lib/paths/audion-api';
import type {
    AudienceReportOverlay,
    ProjectReportBundle,
    ProjectReportLocale,
} from '@/lib/project-report/types';

export interface AudienceCollectionResult {
    overlay: AudienceReportOverlay;
    sourcePersonas: AudionPersonaFact[];
}

export async function collectAudienceReportData(
    projectId: string,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    locale: ProjectReportLocale
): Promise<AudienceCollectionResult> {
    if (!getAudionApiBaseUrl() || !getAudionServiceToken()) {
        return {
            overlay: unavailableAudienceOverlay('audion_not_configured'),
            sourcePersonas: [],
        };
    }

    const platform = await getProjectPlatformIds(projectId);
    const audion = await fetchAudionAudienceReport(projectId, {
        platformProjectId: platform?.platformProjectId,
    });
    if (!audion.available) {
        return {
            overlay: unavailableAudienceOverlay(audion.reason ?? 'no_audion_link'),
            sourcePersonas: [],
        };
    }

    return {
        overlay: buildAudienceReportOverlay(audion, facts, locale),
        sourcePersonas: audion.personas ?? [],
    };
}

/** @deprecated Use collectAudienceReportData — returns overlay only. */
export async function collectAudienceReportOverlay(
    projectId: string,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    locale: ProjectReportLocale
): Promise<AudienceReportOverlay> {
    const { overlay } = await collectAudienceReportData(projectId, facts, locale);
    return overlay;
}
