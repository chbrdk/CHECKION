import { describe, it, expect, afterEach } from 'vitest';
import {
    audionAudienceReportPath,
    audionAudienceReportUrl,
    getAudionIntegrationEnvSnapshot,
} from '@/lib/paths/audion-api';

describe('audion-api paths', () => {
    it('builds audience report URL', () => {
        expect(audionAudienceReportPath('proj-123')).toBe(
            '/integrations/checkion/projects/proj-123/audience-report'
        );
        expect(audionAudienceReportPath('proj-123', 'plat-1')).toBe(
            '/integrations/checkion/projects/proj-123/audience-report?platform_project_id=plat-1'
        );
        const prev = process.env.AUDION_API_BASE_URL;
        process.env.AUDION_API_BASE_URL = 'https://audion.example.com/';
        expect(audionAudienceReportUrl('p1')).toBe(
            'https://audion.example.com/integrations/checkion/projects/p1/audience-report'
        );
        process.env.AUDION_API_BASE_URL = prev;
    });

    it('reports missing AUDION env vars', () => {
        const prevBase = process.env.AUDION_API_BASE_URL;
        const prevToken = process.env.AUDION_SERVICE_TOKEN;
        const prevInbound = process.env.CHECKION_INBOUND_SERVICE_TOKEN;
        delete process.env.AUDION_API_BASE_URL;
        delete process.env.AUDION_SERVICE_TOKEN;
        process.env.CHECKION_INBOUND_SERVICE_TOKEN = 'wrong-place';
        expect(getAudionIntegrationEnvSnapshot()).toEqual({
            apiBaseUrlSet: false,
            serviceTokenSet: false,
            configured: false,
            missing: ['AUDION_API_BASE_URL', 'AUDION_SERVICE_TOKEN'],
            checkionInboundTokenSet: true,
        });
        process.env.AUDION_API_BASE_URL = prevBase;
        process.env.AUDION_SERVICE_TOKEN = prevToken;
        process.env.CHECKION_INBOUND_SERVICE_TOKEN = prevInbound;
    });
});
