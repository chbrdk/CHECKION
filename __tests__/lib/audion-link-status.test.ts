import { describe, expect, it } from 'vitest';

import { mapAudionHttpFailure } from '@/lib/integrations/audion-service-fetch';
import {
    isAudionConnectivityReason,
    resolveAudionLinkStatus,
} from '@/lib/integrations/audion-link-status';

describe('mapAudionHttpFailure', () => {
    it('maps common HTTP statuses to stable reason codes', () => {
        expect(mapAudionHttpFailure(403)).toBe('audion_http_403');
        expect(mapAudionHttpFailure(405)).toBe('audion_http_405');
        expect(mapAudionHttpFailure(502)).toBe('audion_http_502');
        expect(mapAudionHttpFailure(503, 'CHECKION inbound integration is not configured')).toBe(
            'audion_inbound_not_configured'
        );
        expect(mapAudionHttpFailure(null)).toBe('audion_fetch_failed');
    });
});

describe('resolveAudionLinkStatus', () => {
    const checkionId = '11111111-1111-1111-1111-111111111111';

    it('uses audience report when available', () => {
        const status = resolveAudionLinkStatus(
            checkionId,
            {
                available: true,
                audionProjectId: 'a1',
                audionProjectName: 'Demo',
                resolvedVia: 'checkion_project_id',
                personas: [{ id: 'p1' } as never],
            },
            []
        );
        expect(status.linked).toBe(true);
        expect(status.audionProjectName).toBe('Demo');
        expect(status.personaCount).toBe(1);
    });

    it('falls back to audion-projects list when audience fetch failed', () => {
        const status = resolveAudionLinkStatus(
            checkionId,
            { available: false, reason: 'audion_fetch_failed' },
            [
                {
                    id: 'a1',
                    name: 'Linked Project',
                    checkionProjectId: checkionId,
                    platformProjectId: null,
                },
            ]
        );
        expect(status.linked).toBe(true);
        expect(status.audionProjectName).toBe('Linked Project');
        expect(status.reason).toBeNull();
        expect(status.reportWarning).toBe('audion_fetch_failed');
        expect(status.audionReachable).toBe(true);
    });

    it('does not show unreachable when list loaded but no link yet', () => {
        const status = resolveAudionLinkStatus(
            checkionId,
            { available: false, reason: 'audion_fetch_failed' },
            [{ id: 'a1', name: 'Other', checkionProjectId: null, platformProjectId: null }]
        );
        expect(status.linked).toBe(false);
        expect(status.reason).toBe('no_audion_link');
        expect(isAudionConnectivityReason(status.reason)).toBe(false);
        expect(status.audionReachable).toBe(true);
    });

    it('reports connectivity failure only when list also failed', () => {
        const status = resolveAudionLinkStatus(
            checkionId,
            { available: false, reason: 'audion_fetch_failed' },
            null
        );
        expect(status.linked).toBe(false);
        expect(status.reason).toBe('audion_fetch_failed');
        expect(status.audionReachable).toBe(false);
    });
});
