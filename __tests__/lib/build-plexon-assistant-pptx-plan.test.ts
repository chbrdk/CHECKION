import { describe, expect, it } from 'vitest';
import { buildPlexonAssistantPptxPlan, PLEXON_ASSISTANT_PPTX_MAX_SLIDES } from '@/lib/integrations/plexon/build-plexon-assistant-pptx-plan';
import {
    PLEXON_ASSISTANT_ALL_BLOCK_TYPES,
    plexonAssistantReportFixture,
} from '@/lib/integrations/plexon/fixtures/assistant-report-ui-layout.fixture';
import { isPinnedAssistantBlock } from '@/lib/integrations/plexon/map-ui-block-to-slides';

describe('buildPlexonAssistantPptxPlan', () => {
    it('starts with cover slide', () => {
        const plan = buildPlexonAssistantPptxPlan(plexonAssistantReportFixture());
        expect(plan.slides[0]?.kind).toBe('cover');
        expect(plan.variant).toBe('plexon-assistant');
    });

    it('inserts pinned section before report-pin blocks', () => {
        const plan = buildPlexonAssistantPptxPlan(plexonAssistantReportFixture());
        const sectionIdx = plan.slides.findIndex((s) => s.kind === 'section');
        const firstPinIdx = plan.slides.findIndex(
            (s) => s.kind !== 'cover' && s.kind !== 'section' && s.title === 'KPIs'
        );
        expect(sectionIdx).toBeGreaterThan(0);
        expect(firstPinIdx).toBeGreaterThan(sectionIdx);
    });

    it('maps all block types without empty plan', () => {
        const plan = buildPlexonAssistantPptxPlan(
            plexonAssistantReportFixture([
                { id: 'only-text', type: 'text', props: { markdown: 'Hello' } },
                ...PLEXON_ASSISTANT_ALL_BLOCK_TYPES,
            ])
        );
        expect(plan.slides.length).toBeGreaterThan(5);
        expect(plan.slides.length).toBeLessThanOrEqual(PLEXON_ASSISTANT_PPTX_MAX_SLIDES);
    });

    it('uses closing layout for fazit and recommendations', () => {
        const plan = buildPlexonAssistantPptxPlan(plexonAssistantReportFixture());
        const closing = plan.slides.filter((s) => s.kind === 'closing');
        expect(closing.length).toBeGreaterThanOrEqual(2);
    });

    it('includes chart slide for chart blocks', () => {
        const plan = buildPlexonAssistantPptxPlan(plexonAssistantReportFixture());
        expect(plan.slides.some((s) => s.kind === 'chart')).toBe(true);
    });
});

describe('isPinnedAssistantBlock', () => {
    it('detects report-pin prefix', () => {
        expect(isPinnedAssistantBlock({ id: 'report-pin-abc', type: 'text', props: {} })).toBe(true);
        expect(isPinnedAssistantBlock({ id: 'report-intro', type: 'text', props: {} })).toBe(false);
    });
});
