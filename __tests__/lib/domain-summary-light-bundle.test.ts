import { describe, expect, it } from 'vitest';
import { toLightDomainSummaryApiPayload } from '@/lib/domain-summary';
import type { DomainSummaryResponse } from '@/lib/domain-summary';

describe('toLightDomainSummaryApiPayload', () => {
    it('omits heavy graph and systemic issue URL lists from bundle-sized responses', () => {
        const summary = {
            id: 'x',
            domain: 'example.com',
            timestamp: 't',
            status: 'complete',
            progress: { scanned: 10, total: 10 },
            totalPages: 10,
            score: 80,
            pages: [],
            graph: {
                nodes: Array.from({ length: 200 }, (_, i) => ({
                    id: `n${i}`,
                    url: `https://example.com/p${i}`,
                    score: 80,
                    depth: 1,
                    status: 'ok' as const,
                })),
                links: Array.from({ length: 400 }, (_, i) => ({
                    source: `n${i % 200}`,
                    target: `n${(i + 1) % 200}`,
                })),
            },
            systemicIssues: [
                {
                    issueId: 'color-contrast',
                    title: 'Contrast',
                    count: 128,
                    pages: Array.from({ length: 128 }, (_, i) => `https://example.com/u${i}`),
                },
            ],
            aggregated: null,
        } as unknown as DomainSummaryResponse;

        const light = toLightDomainSummaryApiPayload(summary);
        expect(light.graph.nodes).toHaveLength(0);
        expect(light.graph.links).toHaveLength(0);
        expect(light.systemicIssues?.[0]?.pages).toEqual([]);
        expect(light.systemicIssues?.[0]?.count).toBe(128);
    });
});
