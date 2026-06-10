import { describe, it, expect } from 'vitest';
import { extractEchonAnswerFromStructured } from '@/lib/project-report/echon-structured-answer';

describe('extractEchonAnswerFromStructured', () => {
    it('reads flat legacy structured shape', () => {
        const answer = extractEchonAnswerFromStructured({
            executive_summary: 'Legacy summary',
            key_findings: ['A'],
        });
        expect(answer?.executive_summary).toBe('Legacy summary');
    });

    it('reads sync REST chat shape (structured.answer)', () => {
        const answer = extractEchonAnswerFromStructured({
            answer: {
                executive_summary: 'Sync chat summary',
                key_findings: ['B'],
            },
            timings_ms: { retrieve: 1 },
        });
        expect(answer?.executive_summary).toBe('Sync chat summary');
    });

    it('reads agent stream final payload shape', () => {
        const answer = extractEchonAnswerFromStructured({
            schema_version: 'research_agent_v1',
            stage: 'final',
            payload: {
                answer: {
                    executive_summary: 'Agent summary',
                    key_findings: ['Discovery', 'Plan'],
                    recommended_watchlist: ['Signal X'],
                    confidence: 0.9,
                },
            },
        });
        expect(answer?.executive_summary).toBe('Agent summary');
        expect(answer?.key_findings).toEqual(['Discovery', 'Plan']);
    });
});
