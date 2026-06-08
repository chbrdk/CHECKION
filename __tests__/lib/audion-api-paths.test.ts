import { describe, it, expect } from 'vitest';
import { audionAudienceReportPath, audionAudienceReportUrl } from '@/lib/paths/audion-api';

describe('audion-api paths', () => {
    it('builds audience report URL', () => {
        expect(audionAudienceReportPath('proj-123')).toBe(
            '/integrations/checkion/projects/proj-123/audience-report'
        );
        const prev = process.env.AUDION_API_BASE_URL;
        process.env.AUDION_API_BASE_URL = 'https://audion.example.com/';
        expect(audionAudienceReportUrl('p1')).toBe(
            'https://audion.example.com/integrations/checkion/projects/p1/audience-report'
        );
        process.env.AUDION_API_BASE_URL = prev;
    });
});
