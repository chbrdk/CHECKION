import type { AudionAudienceReportResponse } from '@/lib/integrations/audion-audience-client';
import type { AudionProjectLinkItem } from '@/lib/integrations/audion-link-client';

export interface AudionLinkStatusSnapshot {
    linked: boolean;
    /** Link status only — never a connectivity error when AUDION list loaded successfully. */
    reason: string | null;
    /** Set when audience-report failed but AUDION list endpoint responded. */
    reportWarning: string | null;
    audionReachable: boolean;
    resolvedVia: string | null;
    audionProjectId: string | null;
    audionProjectName: string | null;
    personaCount: number;
}

/** Reasons that indicate HTTP/network failure — not “no link yet”. */
export const AUDION_CONNECTIVITY_REASONS = new Set([
    'audion_not_configured',
    'audion_fetch_failed',
    'audion_timeout',
    'audion_http_401',
    'audion_http_403',
    'audion_http_405',
    'audion_http_500',
    'audion_http_502',
    'audion_http_503',
    'audion_inbound_not_configured',
    'audion_endpoint_not_found',
    'audion_list_failed',
]);

export function isAudionConnectivityReason(reason: string | null | undefined): boolean {
    return Boolean(reason && AUDION_CONNECTIVITY_REASONS.has(reason));
}

function pickNotLinkedReason(
    audience: AudionAudienceReportResponse,
    audionListReachable: boolean
): string {
    if (audionListReachable) {
        if (audience.reason === 'no_audion_project_for_checkion_id') {
            return audience.reason;
        }
        return 'no_audion_link';
    }
    if (audience.reason && !isAudionConnectivityReason(audience.reason)) {
        return audience.reason;
    }
    return audience.reason ?? 'audion_list_failed';
}

/**
 * Resolve link status for the CHECKION project page.
 * If the audion-projects list loaded, AUDION is reachable — do not blame connectivity.
 */
export function resolveAudionLinkStatus(
    checkionProjectId: string,
    audience: AudionAudienceReportResponse,
    audionProjects: AudionProjectLinkItem[] | null | undefined
): AudionLinkStatusSnapshot {
    const audionListReachable = audionProjects !== null && audionProjects !== undefined;
    const reportWarning =
        audionListReachable && !audience.available && isAudionConnectivityReason(audience.reason)
            ? (audience.reason ?? null)
            : null;

    if (audience.available) {
        return {
            linked: true,
            reason: null,
            reportWarning: null,
            audionReachable: audionListReachable || true,
            resolvedVia: audience.resolvedVia ?? null,
            audionProjectId: audience.audionProjectId ?? null,
            audionProjectName: audience.audionProjectName ?? null,
            personaCount: audience.personas?.length ?? 0,
        };
    }

    const linkedFromList = audionProjects?.find(
        (item) => (item.checkionProjectId ?? '').trim() === checkionProjectId
    );
    if (linkedFromList) {
        return {
            linked: true,
            reason: null,
            reportWarning,
            audionReachable: true,
            resolvedVia: 'checkion_project_id',
            audionProjectId: linkedFromList.id,
            audionProjectName: linkedFromList.name,
            personaCount: audience.personas?.length ?? 0,
        };
    }

    return {
        linked: false,
        reason: pickNotLinkedReason(audience, audionListReachable),
        reportWarning: null,
        audionReachable: audionListReachable,
        resolvedVia: audience.resolvedVia ?? null,
        audionProjectId: audience.audionProjectId ?? null,
        audionProjectName: audience.audionProjectName ?? null,
        personaCount: audience.personas?.length ?? 0,
    };
}
