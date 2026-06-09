import { describe, it, expect } from 'vitest';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';

const INTRO_KEYS = [
    'executive',
    'siteQuality',
    'seo',
    'geo',
    'topics',
    'audience',
    'actions',
    'deepDive',
    'appendix',
] as const;

describe('pdf section intros', () => {
    it('provides non-empty reader guidance for de and en', () => {
        for (const locale of ['de', 'en'] as const) {
            const labels = getProjectReportPdfLabels(locale);
            for (const key of INTRO_KEYS) {
                const text = labels.chapterIntros[key];
                expect(text.length).toBeGreaterThan(80);
            }
        }
    });
});
