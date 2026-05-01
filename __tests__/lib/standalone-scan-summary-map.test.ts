import { describe, it, expect } from 'vitest';
import { mapRowToStandaloneScanSummary } from '@/lib/db/scans';

describe('mapRowToStandaloneScanSummary', () => {
    it('builds stats and score from nullable columns', () => {
        const s = mapRowToStandaloneScanSummary({
            id: 'a',
            url: 'https://x.com',
            timestamp: '2026-01-01T00:00:00.000Z',
            score: 88.7,
            errorsCount: 2,
            warningsCount: 3,
            noticesCount: 1,
            projectId: 'p1',
            groupId: 'g1',
            scanSessionId: 'g1',
            device: 'desktop',
            targetRegion: 'DE',
            scanTagsJson: ['foo-bar'],
            projectTagsJson: ['baz'],
            industry: 'healthcare_medical',
        });
        expect(s.score).toBe(89);
        expect(s.stats).toEqual({ errors: 2, warnings: 3, notices: 1, total: 6 });
        expect(s.targetRegion).toBe('DE');
        expect(s.device).toBe('desktop');
        expect(s.tags).toEqual(['foo-bar']);
        expect(s.projectTags).toEqual(['baz']);
        expect(s.industry).toBe('healthcare_medical');
    });

    it('treats empty targetRegion as null', () => {
        const s = mapRowToStandaloneScanSummary({
            id: 'b',
            url: 'https://y.com',
            timestamp: 't',
            score: null,
            errorsCount: null,
            warningsCount: null,
            noticesCount: null,
            projectId: null,
            groupId: null,
            scanSessionId: null,
            device: 'tablet',
            targetRegion: '   ',
            scanTagsJson: [],
            projectTagsJson: [],
            industry: null,
        });
        expect(s.stats.total).toBe(0);
        expect(s.targetRegion).toBeNull();
        expect(s.score).toBe(0);
    });
});
