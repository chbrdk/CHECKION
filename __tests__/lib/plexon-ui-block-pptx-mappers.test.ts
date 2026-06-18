import { describe, expect, it } from 'vitest';
import { getPlexonAssistantPptxLabels } from '@/lib/integrations/plexon/plexon-assistant-pptx-labels';
import {
    mapDataTableToSlides,
    mapMetricGridToSlides,
    mapPersonaCardToSlides,
    mapPersonaCardToSlidesExtended,
    mapTargetGroupCardToSlides,
} from '@/lib/integrations/plexon/plexon-ui-block-pptx-mappers';

const labels = getPlexonAssistantPptxLabels('de');
const footer = 'test · footer';

describe('mapMetricGridToSlides', () => {
    it('splits overflow metrics into a table slide', () => {
        const slides = mapMetricGridToSlides(
            [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
                { label: 'C', value: 3 },
                { label: 'D', value: 4, hint: 'extra' },
            ],
            'KPIs',
            footer,
            labels
        );
        expect(slides).toHaveLength(2);
        expect(slides[0]?.kind).toBe('metrics');
        expect(slides[1]?.kind).toBe('table');
        if (slides[1]?.kind === 'table') {
            expect(slides[1].rows[0]?.[0]).toBe('D');
        }
    });
});

describe('mapPersonaCardToSlides', () => {
    it('creates confidence chart for multiple personas', () => {
        const slides = mapPersonaCardToSlides(
            [
                { name: 'Anna', segment: 'B2B', headline: 'Decision maker', confidence: 0.9 },
                { name: 'Ben', segment: 'B2C', headline: 'Budget owner', confidence: 0.75 },
            ],
            'Personas',
            footer,
            labels
        );
        expect(slides.some((slide) => slide.kind === 'chart')).toBe(true);
        expect(slides.some((slide) => slide.kind === 'two_column')).toBe(true);
    });

    it('adds radar slide when pillar scores are present', () => {
        const slides = mapPersonaCardToSlidesExtended(
            [
                {
                    name: 'Anna',
                    segment: 'B2B',
                    headline: 'Decision maker',
                    confidence: 0.9,
                    pillarScores: [
                        { pillar: 'Trust', score: 82 },
                        { pillar: 'Speed', score: 71 },
                        { pillar: 'Price', score: 64 },
                    ],
                },
            ],
            'Personas',
            footer,
            labels
        );
        expect(slides.some((slide) => slide.kind === 'chart' && slide.chartType === 'radar')).toBe(true);
    });
});

describe('mapDataTableToSlides', () => {
    it('chunks wide tables into two-column slides', () => {
        const slides = mapDataTableToSlides(
            ['A', 'B', 'C', 'D', 'E', 'F'],
            [['1', '2', '3', '4', '5', '6']],
            'Wide table',
            footer,
            labels
        );
        expect(slides[0]?.kind).toBe('two_column');
    });

    it('chunks long tables into multiple table slides', () => {
        const rows = Array.from({ length: 12 }, (_, i) => [`row-${i}`, i]);
        const slides = mapDataTableToSlides(['Name', 'Value'], rows, 'Long table', footer, labels);
        expect(slides.length).toBeGreaterThan(1);
        expect(slides.every((slide) => slide.kind === 'table')).toBe(true);
    });
});

describe('mapTargetGroupCardToSlides', () => {
    it('uses two_column for a single target group', () => {
        const slides = mapTargetGroupCardToSlides(
            [{
                name: 'Enterprise',
                segment: 'DE',
                description: 'Large accounts',
                personaCount: 2,
                knowledgeEntryCount: 5,
            }],
            'Zielgruppen',
            footer,
            labels
        );
        expect(slides).toHaveLength(1);
        expect(slides[0]?.kind).toBe('two_column');
    });
});
