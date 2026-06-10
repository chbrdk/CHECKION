import { describe, it, expect } from 'vitest';
import {
    dedupeInterpretationTexts,
    isNearDuplicateText,
} from '@/lib/project-report/pdf-text-dedupe';

describe('pdf-text-dedupe', () => {
    it('detects near-duplicate paragraphs', () => {
        const a =
            'Der GEO-Overall-Score von 93 ist ein sehr gutes Zeichen für Auffindbarkeit in KI-Antworten.';
        const b =
            'Der GEO-Overall-Score von 93 ist ein sehr gutes Zeichen dafür, dass die Inhalte im KI-Kontext zuverlässig gefunden werden.';
        expect(isNearDuplicateText(a, b)).toBe(true);
    });

    it('keeps distinct paragraphs', () => {
        const texts = dedupeInterpretationTexts([
            'On-Page SEO liegt bei 47 und braucht strukturelle Verbesserungen.',
            'SERP-Leader comparethemarket.com dominiert Vergleichs-Keywords.',
        ]);
        expect(texts).toHaveLength(2);
    });

    it('drops repeated blocks in order', () => {
        const texts = dedupeInterpretationTexts([
            'Ranking-Score 33 — schwache organische Sichtbarkeit.',
            'Ranking-Score 33: schwache organische Sichtbarkeit bei getrackten Keywords.',
        ]);
        expect(texts).toHaveLength(1);
    });
});
