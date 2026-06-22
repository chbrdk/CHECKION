import { describe, expect, it } from 'vitest';
import {
    buildCompetitiveSystemPrompt,
    clipCompetitiveRawAnswer,
    parseCompetitiveResponse,
} from '@/lib/geo-eeat/competitive-response';

describe('competitive-response', () => {
    it('parses answer and citations from structured JSON', () => {
        const parsed = parseCompetitiveResponse(
            JSON.stringify({
                answer: 'Wera und Gedore sind führende Marken für Profi-Werkzeug.',
                citations: [
                    { domain: 'wera.de', position: 1 },
                    { domain: 'gedore.com', position: 2 },
                ],
            })
        );
        expect(parsed.answerText).toContain('Wera');
        expect(parsed.citations).toHaveLength(2);
        expect(parsed.citations[0]?.position).toBe(1);
    });

    it('builds system prompt with known domains', () => {
        const prompt = buildCompetitiveSystemPrompt(['wera.de', 'competitor.de']);
        expect(prompt).toContain('answer');
        expect(prompt).toContain('wera.de');
    });

    it('clips raw answer payload to configured max', () => {
        expect(clipCompetitiveRawAnswer('x'.repeat(9000)).length).toBeLessThanOrEqual(8000);
    });
});
