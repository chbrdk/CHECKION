import { describe, expect, it } from 'vitest';
import { projectCompetitorDomainScanBodySchema } from '@/lib/api-schemas';

describe('projectCompetitorDomainScanBodySchema', () => {
    it('accepts a hostname', () => {
        expect(projectCompetitorDomainScanBodySchema.parse({ domain: 'example.com' })).toEqual({
            domain: 'example.com',
        });
    });

    it('rejects empty domain', () => {
        expect(projectCompetitorDomainScanBodySchema.safeParse({ domain: '' }).success).toBe(false);
    });
});
