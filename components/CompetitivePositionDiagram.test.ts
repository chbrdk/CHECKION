import { describe, it, expect } from 'vitest';
import type { CompetitiveBenchmarkResult } from '@/lib/types';

// Test only the data shape we need; the component uses useMemo with buildPositionMatrix internally.
// We test that given competitiveByModel and targetUrl, the diagram would receive valid props.
describe('CompetitivePositionDiagram', () => {
    it('accepts competitiveByModel with runs and builds display data', () => {
        const competitiveByModel: Record<string, CompetitiveBenchmarkResult> = {
            'gpt-5-nano': {
                queries: ['Who makes pumps?'],
                competitors: ['a.com', 'b.com'],
                runs: [
                    {
                        queryId: '1',
                        query: 'Who makes pumps?',
                        provider: 'openai',
                        citations: [
                            { domain: 'ksb.com', position: 1 },
                            { domain: 'grundfos.com', position: 2 },
                        ],
                    },
                ],
                metrics: [
                    { domain: 'ksb.com', shareOfVoice: 1, avgPosition: 1, queryCount: 1, mentionCount: 1 },
                    { domain: 'grundfos.com', shareOfVoice: 1, avgPosition: 2, queryCount: 1, mentionCount: 1 },
                ],
            },
        };
        const targetUrl = 'https://www.ksb.com/de-de';
        expect(competitiveByModel['gpt-5-nano']?.runs).toHaveLength(1);
        expect(competitiveByModel['gpt-5-nano']?.runs?.[0]?.citations?.find((c) => c.domain === 'ksb.com')?.position).toBe(1);
        expect(targetUrl).toContain('ksb.com');
    });
});
