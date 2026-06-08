/**
 * Collect AUDION audience data and align with CHECKION report facts.
 */

import { fetchAudionAudienceReport } from '@/lib/integrations/audion-audience-client';
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

export async function collectAudienceReportOverlay(
    projectId: string,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    locale: ProjectReportLocale
): Promise<AudienceReportOverlay> {
    if (!getAudionApiBaseUrl() || !getAudionServiceToken()) {
        return unavailableAudienceOverlay('audion_not_configured');
    }

    const audion = await fetchAudionAudienceReport(projectId);
    if (!audion) {
        return unavailableAudienceOverlay('audion_fetch_failed');
    }
    if (!audion.available) {
        return unavailableAudienceOverlay(audion.reason ?? 'no_audion_link');
    }

    return buildAudienceReportOverlay(audion, facts, locale);
}
