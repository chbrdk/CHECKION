import { describe, it, expect } from 'vitest';
import {
    emptyEchonMarketContext,
    parseEchonThreadToMarketContext,
    slimEchonMarketForAgent,
} from '@/lib/project-report/echon-market-context';
import { isValidEchonThreadId } from '@/lib/integrations/echon-research-client';

const THREAD_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

describe('echon market context', () => {
    it('validates UUID thread ids', () => {
        expect(isValidEchonThreadId(THREAD_ID)).toBe(true);
        expect(isValidEchonThreadId('not-a-uuid')).toBe(false);
    });

    it('parses latest assistant structured answer from thread', () => {
        const ctx = parseEchonThreadToMarketContext(
            {
                id: THREAD_ID,
                title: 'Versicherungsmarkt DE',
                updated_at: '2026-06-01T12:00:00Z',
                messages: [
                    { id: 'm1', role: 'user', content: 'q' },
                    {
                        id: 'm2',
                        role: 'assistant',
                        structured: {
                            executive_summary: 'Der Markt verschärft sich durch Digitalisierung.',
                            key_findings: ['Preisdruck', 'Regulatorik'],
                            recommended_watchlist: ['GDV Meldungen'],
                            confidence: 0.82,
                            evidence_gaps: ['Kleinanbieter-Daten fehlen'],
                        },
                        citations: [{}, {}],
                    },
                ],
            },
            THREAD_ID
        );
        expect(ctx.available).toBe(true);
        expect(ctx.keyFindings).toEqual(['Preisdruck', 'Regulatorik']);
        expect(ctx.citationCount).toBe(2);
        expect(slimEchonMarketForAgent(ctx)).toMatchObject({
            keyFindings: ['Preisdruck', 'Regulatorik'],
        });
    });

    it('returns unavailable when no structured answer', () => {
        const ctx = parseEchonThreadToMarketContext(
            { id: THREAD_ID, messages: [{ id: 'm1', role: 'assistant', structured: {} }] },
            THREAD_ID
        );
        expect(ctx.available).toBe(false);
        expect(ctx.reason).toBe('echon_no_structured_answer');
        expect(slimEchonMarketForAgent(ctx)).toBeNull();
    });

    it('empty context helper', () => {
        expect(emptyEchonMarketContext('echon_thread_not_linked').reason).toBe(
            'echon_thread_not_linked'
        );
    });
});
