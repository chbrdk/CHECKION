import { describe, expect, it } from 'vitest';
import { buildPlexonAssistantPptxPlan } from '@/lib/integrations/plexon/build-plexon-assistant-pptx-plan';
import { plexonAssistantReportFixture } from '@/lib/integrations/plexon/fixtures/assistant-report-ui-layout.fixture';
import { mapUiBlockToSlides } from '@/lib/integrations/plexon/map-ui-block-to-slides';
import { getPlexonAssistantPptxLabels } from '@/lib/integrations/plexon/plexon-assistant-pptx-labels';
import {
    compactPlexonReportBlocks,
    pruneEmptyPptxSlides,
    slideHasVisibleContent,
} from '@/lib/integrations/plexon/prune-plexon-assistant-pptx-plan';

describe('compactPlexonReportBlocks', () => {
    it('merges report intro text and summary alert into one block', () => {
        const blocks = compactPlexonReportBlocks(
            [
                {
                    id: 'report-intro-x',
                    type: 'text',
                    props: { markdown: '# Rich Report\n\nSession context here.' },
                },
                {
                    id: 'report-summary-x',
                    type: 'alert',
                    props: { title: 'Zusammenfassung', message: 'Executive summary.', tone: 'info' },
                },
                { id: 'report-pin-1', type: 'text', props: { markdown: 'Pinned content' } },
            ],
            'Rich Report'
        );

        expect(blocks).toHaveLength(2);
        expect(blocks[0]?.id).toBe('report-executive-compact');
        expect(blocks[0]?.props.message).toContain('Session context here.');
        expect(blocks[0]?.props.message).toContain('Executive summary.');
    });

    it('skips duplicate cover title when intro has no body', () => {
        const blocks = compactPlexonReportBlocks(
            [{ id: 'x', type: 'text', props: { markdown: '# My Title' } }],
            'My Title'
        );
        expect(blocks).toHaveLength(0);
    });
});

describe('mapUiBlockToSlides alert', () => {
    it('puts alert message in body bullets, not lead', () => {
        const labels = getPlexonAssistantPptxLabels('de');
        const slides = mapUiBlockToSlides(
            {
                id: 'report-summary',
                type: 'alert',
                props: { title: 'Zusammenfassung', message: 'Wichtige Erkenntnis.', tone: 'info' },
            },
            'footer',
            labels
        );
        expect(slides).toHaveLength(1);
        expect(slides[0]?.kind).toBe('bullets');
        if (slides[0]?.kind !== 'bullets') return;
        expect(slides[0].lead).toBeUndefined();
        expect(slides[0].bullets).toContain('Wichtige Erkenntnis.');
    });
});

describe('pruneEmptyPptxSlides', () => {
    it('removes bullet slides with no body content', () => {
        const pruned = pruneEmptyPptxSlides([
            {
                kind: 'bullets',
                layout: 'CONTENT',
                title: ' ',
                bullets: [],
                footer: 'f',
            },
            {
                kind: 'bullets',
                layout: 'CONTENT',
                title: 'Real',
                bullets: ['Content'],
                footer: 'f',
            },
        ]);
        expect(pruned).toHaveLength(1);
        expect(pruned[0]?.kind).toBe('bullets');
    });

    it('keeps section and cover slides', () => {
        expect(
            slideHasVisibleContent({
                kind: 'section',
                layout: 'SECTION',
                title: 'Pinned',
                footer: 'f',
            })
        ).toBe(true);
    });
});

describe('buildPlexonAssistantPptxPlan phase A', () => {
    it('does not emit empty bullet slides after normalize', () => {
        const plan = buildPlexonAssistantPptxPlan(plexonAssistantReportFixture());
        const emptyBullets = plan.slides.filter(
            (slide) =>
                slide.kind === 'bullets' &&
                !slide.lead?.trim() &&
                slide.bullets.every((bullet) => !bullet.trim())
        );
        expect(emptyBullets).toHaveLength(0);
    });

    it('merges intro and summary into fewer narrative slides', () => {
        const plan = buildPlexonAssistantPptxPlan(plexonAssistantReportFixture());
        const summarySlides = plan.slides.filter(
            (slide) => slide.kind === 'bullets' && slide.title === 'Zusammenfassung'
        );
        expect(summarySlides.length).toBeLessThanOrEqual(2);
        if (summarySlides[0]?.kind === 'bullets') {
            expect(summarySlides[0].bullets.length).toBeGreaterThan(0);
        }
    });
});
